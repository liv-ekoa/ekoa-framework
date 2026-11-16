-- Rollback for the four 20261115 migrations (draft before consent, direct signup, unverified
-- scoring, unverified public records). NOT a migration: it lives outside supabase/migrations so it
-- never runs by accident.
--
-- APPLY ORDER (forward), after reading each file:
--   1. 20261115000001_draft_before_consent.sql
--   2. 20261115000002_direct_signup.sql
--   3. 20261115000003_unverified_scoring.sql
--   4. 20261115000004_unverified_public_records.sql
--   Also add https://ekoa-framework.org/welcome** (and your local address) to Supabase Auth, URL
--   configuration, redirect URLs, or the sign-up email link will fail.
--
-- TO ROLL BACK: take a backup first, then run this whole file in the Supabase SQL editor. It undoes
-- 4, 3, 2, 1 in that order and restores the previous version of every function and the ranking view.
--
-- WHAT YOU LOSE: comments on drafts, join requests, and draft-extension dates. Pending minors go
-- back to having no access until a guardian approves. Independent student workspaces created by
-- direct signup are left in place (that organisation type already existed).

begin;

-- ---------------------------------------------------------------- Undo 4 and 3: guards and ranking
create or replace function public.guard_record() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin_context() then new.updated_at := now(); return new; end if;
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published' or old.visibility <> new.visibility)
     and not (public.has_role(new.org_id, array['faculty_liaison']) or public.is_steward()) then
    raise exception 'Only the faculty liaison can publish a record.';
  end if;
  if tg_op = 'UPDATE' and old.status = 'published' and new.anonymised is distinct from old.anonymised
     and not (public.has_role(new.org_id, array['faculty_liaison']) or public.is_steward()) then
    raise exception 'Only the faculty liaison can change whether a published record names the school.';
  end if;
  if new.visibility = 'public' and new.status = 'published' and new.tier < 2 then
    raise exception 'Public records need tier T2 or higher.';
  end if;
  if new.tier > 2 and (tg_op = 'INSERT' or new.tier > old.tier) and current_setting('ekoa.verifying', true) is distinct from 'on' and not public.is_steward() then
    raise exception 'Tiers T3 and T4 come only from peer or partner verification.';
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.guard_record() from public, anon, authenticated;

create or replace function public.guard_org() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin_context() or public.is_steward() then return new; end if;
  if new.org_type is distinct from old.org_type or new.audit_school is distinct from old.audit_school or new.status is distinct from old.status then
    raise exception 'Only an Ekoa steward can change a school''s type, audit status or onboarding status.';
  end if;
  return new;
end $$;
revoke execute on function public.guard_org() from public, anon, authenticated;

create or replace view public.public_school_ranking as
with recs as (
  select r.org_id, r.id, r.tier,
         case r.outcome_class when 'worked' then 10 when 'partly' then 6 when 'did_not_work' then 4 else 0 end
         * case when r.tier >= 3 then 1.5 else 1 end as points
  from records r join organisations o on o.id = r.org_id
  where r.status = 'published' and r.visibility = 'public' and not r.anonymised and o.public_visible and r.tier >= 2
), adopt as (
  select r.org_id, count(distinct a.org_id) as adopters, count(*) filter (where a.result = 'worked') as adopted_worked
  from adaptations a join records r on r.id = a.source_record_id
  where r.status = 'published' and r.visibility = 'public' and not r.anonymised and a.org_id <> r.org_id
  group by r.org_id
), per_school as (
  select o.id as org_id, o.name, o.country, o.city,
         count(recs.id)::int as verified_records,
         (count(recs.id) filter (where recs.tier >= 3))::int as audited_records,
         coalesce(max(adopt.adopters), 0)::int as adopting_schools,
         coalesce(max(adopt.adopted_worked), 0)::int as adoptions_that_worked,
         (coalesce(sum(recs.points), 0) + 8 * coalesce(max(adopt.adopters), 0) + 4 * coalesce(max(adopt.adopted_worked), 0))::numeric as score
  from organisations o
  left join recs on recs.org_id = o.id
  left join adopt on adopt.org_id = o.id
  where o.org_type = 'school' and o.public_visible
  group by o.id
)
select *, rank() over (order by score desc) as position from per_school where score > 0;

-- ---------------------------------------------------------------- Undo 2: direct signup
drop function if exists public.signup_student(text, text), public.signup_school(text, text, text, text), public.find_schools(text), public.school_by_code(text),
  public.request_to_join_school(uuid, text), public.pending_join_requests(uuid), public.decide_join_request(uuid, boolean);
drop table if exists public.join_requests;
create or replace function public.guard_role_school() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin_context() or public.is_steward() then return new; end if;
  if exists (select 1 from role_assignments r where r.person_id = new.person_id and r.org_id <> new.org_id)
     and not exists (select 1 from role_assignments r where r.person_id = new.person_id and r.org_id = new.org_id and r.id is distinct from new.id) then
    raise exception 'This person belongs to another school. Ask an Ekoa steward to add them.';
  end if;
  return new;
end $$;
revoke execute on function public.guard_role_school() from public, anon, authenticated;
alter table public.organisations drop column if exists join_code;

-- ---------------------------------------------------------------- Undo 1: drafts before consent
drop function if exists public.extend_draft_access(uuid, int);
drop table if exists public.project_comments;
drop function if exists public.guard_project_comment();

drop policy if exists org_read_working on public.organisations;
drop policy if exists projects_read_working on public.projects;
drop policy if exists projects_insert_working on public.projects;
drop policy if exists projects_update_working on public.projects;
do $$
declare t text;
begin
  foreach t in array array['tasks', 'budget_pathways', 'budget_lines', 'project_metrics', 'obstacles'] loop
    execute format('drop policy if exists %1$s_working_read on public.%1$I', t);
    execute format('drop policy if exists %1$s_working_insert on public.%1$I', t);
    execute format('drop policy if exists %1$s_working_update on public.%1$I', t);
  end loop;
end $$;
drop policy if exists tasks_working_delete on public.tasks;
drop policy if exists project_metrics_working_delete on public.project_metrics;
drop policy if exists budget_lines_working_delete on public.budget_lines;

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
      if new.lead_person_id is distinct from public.active_person_id() then
        raise exception 'You can only start an individual project as yourself. A teacher can start one for a student.';
      end if;
    elsif new.lead_person_id is distinct from old.lead_person_id
       or old.mentor_person_id is not null
       or old.lead_person_id is distinct from public.active_person_id() then
      raise exception 'Only a teacher can change who leads or mentors an individual project. The student lead can choose a mentor once, if none is set.';
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.guard_individual_project() from public, anon, authenticated;

drop function if exists public.can_draft(uuid), public.is_working_member(uuid), public.working_person_id();
alter table public.people drop column if exists draft_until;

commit;
