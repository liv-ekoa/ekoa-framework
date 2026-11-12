-- Ekoa: a student can start private draft work before a guardian consents.
--
-- Until now a minor whose guardian had not consented had no access to anything. Consent stays
-- required for everything that leaves the student's school or counts toward the network:
-- publishing records, photos and evidence, posts and circles, verification, and ranking points.
--
-- Design: active_person_id() is unchanged and still means "consented or adult". Every existing
-- rule keeps using it, so everything stays locked by default. A second, narrower identity,
-- working_person_id(), also covers a minor whose consent is still pending. Only the explicit
-- allowlist of policies below uses it, and policies are additive (OR), so nothing is loosened.
--
-- A pending account works for 30 days from sign-up (suspended, not deleted, after that). A guardian
-- approving, or a teacher extending, brings it back. Withdrawn consent is never a working identity.

alter table public.people add column draft_until timestamptz;
comment on column public.people.draft_until is 'Extends a pending minor''s draft access past the default 30 days from creation. Set only by a teacher or steward.';

create or replace function public.working_person_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from people
  where auth_user_id = auth.uid()
    and (
      consent_status in ('granted', 'not_needed')
      or (consent_status = 'pending' and now() < coalesce(draft_until, created_at + interval '30 days'))
    )
$$;

-- A member of the school who may work on drafts. 'incoming' roles stay read-only for the
-- consented and get nothing here.
create or replace function public.is_working_member(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from role_assignments where person_id = working_person_id() and org_id = p_org and status in ('active', 'outgoing'))
$$;

create or replace function public.can_draft(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from role_assignments
    where person_id = working_person_id() and org_id = p_org and status in ('active', 'outgoing')
      and role in ('project_lead', 'board_member', 'implementation_team', 'ekoa_rep', 'faculty_liaison')
  )
$$;

revoke execute on function public.working_person_id(), public.is_working_member(uuid), public.can_draft(uuid) from public, anon;
grant execute on function public.working_person_id(), public.is_working_member(uuid), public.can_draft(uuid) to authenticated;

-- ---------------------------------------------------------------- Allowlist: drafting only
-- Not listed here, so still locked for a pending minor: records, evidence, measurements, stage
-- gates, proposals and approvals, project files, posts, circles, threads, verification, handover.

create policy org_read_working on public.organisations for select to authenticated using (public.is_working_member(id));

create policy projects_read_working on public.projects for select to authenticated using (public.is_working_member(org_id));
create policy projects_insert_working on public.projects for insert to authenticated with check (public.can_draft(org_id));
create policy projects_update_working on public.projects for update to authenticated using (public.can_draft(org_id));

do $$
declare t text;
begin
  foreach t in array array['tasks', 'budget_pathways', 'budget_lines', 'project_metrics', 'obstacles'] loop
    execute format('create policy %1$s_working_read on public.%1$I for select to authenticated using (public.is_working_member(public.project_org(project_id)))', t);
    execute format('create policy %1$s_working_insert on public.%1$I for insert to authenticated with check (public.can_draft(public.project_org(project_id)))', t);
    execute format('create policy %1$s_working_update on public.%1$I for update to authenticated using (public.can_draft(public.project_org(project_id)))', t);
  end loop;
end $$;
create policy tasks_working_delete on public.tasks for delete to authenticated using (public.can_draft(public.project_org(project_id)));
create policy project_metrics_working_delete on public.project_metrics for delete to authenticated using (public.can_draft(public.project_org(project_id)));
create policy budget_lines_working_delete on public.budget_lines for delete to authenticated using (public.can_draft(public.project_org(project_id)));

-- An individual project's lead is checked against the working identity, so a student whose consent
-- is pending can start their own. Otherwise identical to the previous version (mentor chosen later).
create or replace function public.guard_individual_project() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.scope = 'school' then return new; end if;

  if new.lead_person_id is not null and not exists (
    select 1 from role_assignments where person_id = new.lead_person_id and org_id = new.org_id and status in ('active', 'outgoing', 'incoming')
  ) then raise exception 'The project lead must belong to this school.'; end if;

  if new.mentor_person_id is null then
    if tg_op = 'UPDATE' and new.stage is distinct from old.stage and new.stage <> 'identify' and new.status not in ('completed', 'ended') then
      raise exception 'Choose the teacher who verifies this project before moving on from Identify.';
    end if;
  elsif not exists (
    select 1 from role_assignments r join people p on p.id = r.person_id
    where r.person_id = new.mentor_person_id and r.org_id = new.org_id and r.role = 'faculty_liaison' and r.status in ('active', 'outgoing') and not p.is_minor
  ) then raise exception 'The mentor must be a teacher (faculty liaison) at this school.'; end if;

  if new.successor_person_id is not null then
    if new.successor_person_id = new.lead_person_id then raise exception 'The successor must be a different student.'; end if;
    if not exists (
      select 1 from role_assignments where person_id = new.successor_person_id and org_id = new.org_id and status in ('active', 'incoming')
    ) then raise exception 'The successor must belong to this school.'; end if;
  end if;

  if not public.is_admin_context() and not public.is_steward()
     and not public.has_role(new.org_id, array['faculty_liaison'])
     and (tg_op = 'INSERT' or new.lead_person_id is distinct from old.lead_person_id or new.mentor_person_id is distinct from old.mentor_person_id) then
    if tg_op = 'INSERT' then
      if new.lead_person_id is distinct from public.working_person_id() then
        raise exception 'You can only start an individual project as yourself. A teacher can start one for a student.';
      end if;
    elsif new.lead_person_id is distinct from old.lead_person_id
       or old.mentor_person_id is not null
       or old.lead_person_id is distinct from public.working_person_id() then
      raise exception 'Only a teacher can change who leads or mentors an individual project. The student lead can choose a mentor once, if none is set.';
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.guard_individual_project() from public, anon, authenticated;

-- ---------------------------------------------------------------- Comments on drafts
-- Teachers (and the student's own team) leave feedback on a project. Everyone who can see the
-- project can read it: it is a shared thread, never a private one-to-one message.
create table public.project_comments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  person_id uuid references public.people (id) on delete set null,
  author_name text not null default '',
  author_role text not null default '',
  body text not null check (length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index on public.project_comments (project_id, created_at);
alter table public.project_comments enable row level security;

create policy project_comments_read on public.project_comments for select to authenticated using (public.is_working_member(org_id) or public.is_steward());
create policy project_comments_insert on public.project_comments for insert to authenticated with check (public.is_working_member(org_id));
create policy project_comments_delete on public.project_comments for delete to authenticated using (
  public.is_steward() or public.has_role(org_id, array['faculty_liaison']) or person_id = public.working_person_id()
);

-- The author and school come from the database, the project must belong to the school, and
-- contact details are refused (the same rule posts follow).
create or replace function public.guard_project_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  p people;
  r role_assignments;
begin
  if new.org_id is distinct from (select org_id from projects where id = new.project_id) then
    raise exception 'A comment belongs to the school that owns the project.';
  end if;
  if public.is_admin_context() then return new; end if;
  if new.body ~ '(\+?\d[\d\s-]{7,}\d)' or new.body ~ '[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z.]+'
     or new.body ~* '\m(whatsapp|insta|instagram|snap|snapchat|telegram|discord|dm me|message me privately)\M'
     or new.body ~* '(^|\s)@[a-z0-9_.]{3,}' then
    raise exception 'Please keep phone numbers, emails and social handles out of comments.';
  end if;
  select * into p from people where id = public.working_person_id();
  select * into r from role_assignments where person_id = p.id and org_id = new.org_id and status in ('active', 'outgoing') order by created_at limit 1;
  new.person_id := p.id;
  new.author_name := p.display_name;
  new.author_role := coalesce(nullif(trim(r.local_title), ''), initcap(replace(r.role, '_', ' ')), '');
  new.created_at := now();
  return new;
end $$;
create trigger project_comment_guard before insert on public.project_comments for each row execute function public.guard_project_comment();
revoke execute on function public.guard_project_comment() from public, anon, authenticated;

-- ---------------------------------------------------------------- Teachers can extend draft time
-- Suspended accounts (30 days without guardian approval) come back when a guardian approves, or
-- when a teacher at the student's school, or a steward, extends their draft time.
create or replace function public.extend_draft_access(p_person uuid, p_days int default 30) returns void
language plpgsql security definer set search_path = public as $$
declare cur timestamptz;
begin
  if p_days is null or p_days < 1 or p_days > 90 then raise exception 'Choose between 1 and 90 days.'; end if;
  if not (public.is_steward() or exists (
    select 1 from role_assignments r where r.person_id = p_person and public.has_role(r.org_id, array['faculty_liaison'])
  )) then raise exception 'Only a teacher at their school or an Ekoa steward can extend draft time.'; end if;
  select coalesce(draft_until, created_at + interval '30 days') into cur from people where id = p_person and consent_status = 'pending';
  if cur is null then raise exception 'This person is not waiting for guardian consent.'; end if;
  update people set draft_until = greatest(now(), cur) + make_interval(days => p_days) where id = p_person;
end $$;
revoke execute on function public.extend_draft_access(uuid, int) from public, anon;
grant execute on function public.extend_draft_access(uuid, int) to authenticated;
