-- Students (and other non-teacher members) can no longer read each other's full records.
-- Until now, anyone who belonged to a school could read every member's email, age band and
-- guardian-consent status. Now the full record is visible only to the person themselves, the
-- teacher (faculty liaison) of a school they belong to, and Ekoa stewards. Everyone else in a
-- school sees a directory with just a name and whether the person is a student or an adult.

drop policy if exists people_read on public.people;
create policy people_read on public.people for select to authenticated using (
  id = public.current_person_id() or public.is_steward()
  or exists (select 1 from role_assignments r where r.person_id = people.id and public.has_role(r.org_id, array['faculty_liaison']))
);

-- The same people the old policy allowed, but only the columns teammates need: a name, and
-- whether the person is a student (is_minor) or an adult. Runs with the view owner's rights.
create or replace view public.school_directory as
select p.id, p.display_name, p.is_minor
from public.people p
where p.id = public.current_person_id() or public.is_steward()
  or exists (select 1 from public.role_assignments r where r.person_id = p.id and public.is_member(r.org_id));
grant select on public.school_directory to authenticated;
revoke all on public.school_directory from anon;
