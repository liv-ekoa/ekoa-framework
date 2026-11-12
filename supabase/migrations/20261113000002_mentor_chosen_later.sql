-- A student can start an individual project without choosing their verifying teacher straight away.
-- The student lead may choose the teacher once, later. Until a teacher is chosen the project cannot
-- move past the Identify stage, so nothing is ever signed off without a teacher in place.
-- Only a teacher can change a mentor once one is set.
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
