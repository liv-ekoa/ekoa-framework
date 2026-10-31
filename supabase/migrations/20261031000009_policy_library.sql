-- Public Policy library. A policy is published the moment its school adopts it (an adult, the
-- faculty liaison or an approver, moves it to Adopted) and every later amendment shows at once.
-- Drafts and policies under review stay private to the school. Independent student workspaces
-- never appear. Schools that chose not to be named appear under their anonymised label.
-- Ekoa admins can also add a school's adopted policy directly (below).

create or replace view public.public_policies as
select
  p.id, p.title, p.version, p.status, p.sections, p.adopted_at, p.updated_at,
  o.org_type = 'ekoa' as is_model,
  case when o.org_type = 'ekoa' then 'Ekoa model policy'
       when o.public_visible then o.name
       else coalesce(nullif(o.anonymised_label, ''), 'A school in the Ekoa network') end as school,
  case when o.org_type = 'school' and o.public_visible then o.id end as org_id,
  case when o.public_visible then o.city else '' end as city,
  o.country
from public.policies p
join public.organisations o on o.id = p.org_id
where p.status in ('adopted', 'amended')
  and o.org_type in ('school', 'ekoa')
  and o.status in ('active', 'onboarding');

revoke all on public.public_policies from public, anon, authenticated;
grant select on public.public_policies to anon, authenticated;

-- Ekoa admins (stewards) add the real policies a school has already adopted, for any school, so the
-- library holds real policies from day one. They can also correct or remove them.
create policy policies_admin_insert on public.policies for insert to authenticated with check (public.is_steward());
create policy policies_admin_update on public.policies for update to authenticated using (public.is_steward());
create policy policies_admin_delete on public.policies for delete to authenticated using (public.is_steward());
