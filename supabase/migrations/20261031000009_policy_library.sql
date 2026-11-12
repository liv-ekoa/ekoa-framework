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

-- Every student in a school can start and edit a draft policy, not only the Project Lead and board.
drop policy if exists policies_insert on public.policies;
create policy policies_insert on public.policies for insert to authenticated
  with check (public.has_role(org_id, array['project_lead', 'board_member', 'implementation_team', 'ekoa_rep', 'faculty_liaison']));
drop policy if exists policies_update on public.policies;
create policy policies_update on public.policies for update to authenticated
  using (public.has_role(org_id, array['project_lead', 'board_member', 'implementation_team', 'ekoa_rep', 'faculty_liaison', 'approver']));

-- Adopted policies are public, so only an adult decides what is public: the faculty liaison, an
-- approver or an Ekoa admin. Students cannot create a policy as adopted, adopt one, or change the
-- text of a policy that is already public; they draft, and an adult adopts the amendment.
create or replace function public.guard_policy() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  adult boolean := public.has_role(new.org_id, array['faculty_liaison', 'approver']) or public.is_steward();
begin
  if public.is_admin_context() then new.updated_at := now(); return new; end if;
  if tg_op = 'INSERT' then
    if new.status <> 'draft' and not adult then
      raise exception 'Only the faculty liaison, an approver or an Ekoa admin can publish a policy. Save it as a draft.';
    end if;
  else
    if new.org_id is distinct from old.org_id and not public.is_steward() then
      raise exception 'A policy cannot move to another school.';
    end if;
    if new.status in ('approved', 'adopted', 'amended') and not adult
       and (new.status is distinct from old.status or (old.status in ('adopted', 'amended') and (new.sections is distinct from old.sections or new.title is distinct from old.title))) then
      raise exception 'Only the faculty liaison, an approver or an Ekoa admin can approve, adopt or change a published policy.';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists policy_guard_insert on public.policies;
create trigger policy_guard_insert before insert on public.policies for each row execute function public.guard_policy();
revoke execute on function public.guard_policy() from public, anon, authenticated;
