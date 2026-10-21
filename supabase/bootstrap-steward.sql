-- Run once in the SQL editor to make the first stewards (the Ekoa core team).
-- 1. Replace the names and emails below with real ones.
-- 2. Run this script.
-- 3. Each steward then signs in on the site with that email; the sign-in links to their person automatically.

with ekoa as (select id from public.organisations where org_type = 'ekoa' limit 1),
new_people as (
  insert into public.people (display_name, email, age_band, is_minor, consent_status)
  values
    ('Founder One', 'founder.one@example.org', '18+', false, 'not_needed'),
    ('Safeguarding Lead', 'safeguarding@example.org', '18+', false, 'not_needed')
  on conflict (email) do update set display_name = excluded.display_name
  returning id
)
insert into public.role_assignments (person_id, org_id, role, status)
select new_people.id, ekoa.id, 'steward', 'active' from new_people, ekoa;

-- Stewards must be adults. Student founders under 18 should hold a student role in their own
-- school instead, with an adult steward (for example a faculty advisor) holding this role.
