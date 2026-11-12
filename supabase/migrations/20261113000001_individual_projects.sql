-- Ekoa: individual student projects alongside whole-school projects.
-- Every project still belongs to one school (org_id), so the school leaderboard, consent rules,
-- peer audit and the cross-school library work unchanged. An individual project adds a named
-- student lead, one teacher (mentor) and, optionally, a future student who will continue it.

alter table public.projects
  add column scope text not null default 'school' check (scope in ('school', 'individual')),
  add column lead_person_id uuid references public.people (id) on delete set null,
  add column mentor_person_id uuid references public.people (id) on delete set null,
  add column successor_person_id uuid references public.people (id) on delete set null;

comment on column public.projects.scope is 'school = run by the school team; individual = started by one student, with a teacher mentor.';
comment on column public.projects.successor_person_id is 'A future student who will continue the project; they get shadow access once their role exists, and take over at handover.';

alter table public.projects add constraint projects_individual_has_lead
  check (scope = 'school' or lead_person_id is not null or status in ('completed', 'ended'));
alter table public.projects add constraint projects_school_has_no_individuals
  check (scope = 'individual' or (lead_person_id is null and successor_person_id is null));

create index on public.projects (lead_person_id);
create index on public.projects (mentor_person_id);
create index on public.projects (successor_person_id);

-- People on an individual project must belong to the same school. The mentor must be a teacher
-- (faculty liaison) and an adult. A student may only start an individual project as themselves.
create or replace function public.guard_individual_project() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.scope = 'school' then return new; end if;

  if new.lead_person_id is not null and not exists (
    select 1 from role_assignments where person_id = new.lead_person_id and org_id = new.org_id and status in ('active', 'outgoing', 'incoming')
  ) then raise exception 'The project lead must belong to this school.'; end if;

  if new.mentor_person_id is null then
    if tg_op = 'INSERT' or new.status not in ('completed', 'ended') then
      raise exception 'An individual project needs one teacher to mentor it.';
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
    if new.lead_person_id is distinct from public.active_person_id() and tg_op = 'INSERT' then
      raise exception 'You can only start an individual project as yourself. A teacher can start one for a student.';
    end if;
    if tg_op = 'UPDATE' then
      raise exception 'Only a teacher can change who leads or mentors an individual project.';
    end if;
  end if;
  return new;
end $$;
create trigger project_individual_guard before insert or update on public.projects for each row execute function public.guard_individual_project();
revoke execute on function public.guard_individual_project() from public, anon, authenticated;
