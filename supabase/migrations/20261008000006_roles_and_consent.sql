-- Ekoa: who can hold which role, and how consent status can change.

-- Roles: adult roles go to adults, network roles only come from a steward, and each role belongs
-- to the right kind of organisation. A liaison can build their school's team but can never make
-- anyone (themselves included) a steward or partner.
create or replace function public.guard_role() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  minor boolean := (select is_minor from people where id = new.person_id);
  org organisations;
begin
  select * into org from organisations where id = new.org_id;
  if minor and new.role in ('faculty_liaison', 'approver', 'steward', 'partner') then
    raise exception 'The % role is for adults only.', replace(new.role, '_', ' ');
  end if;
  if new.role = 'steward' and org.org_type <> 'ekoa' then raise exception 'Stewards belong to the Ekoa Stewards organisation.'; end if;
  if new.role = 'partner' and org.org_type <> 'partner' then raise exception 'Partners belong to a partner organisation.'; end if;
  if new.role = 'auditor' and not org.audit_school then raise exception 'Peer auditors belong to an Ekoa audit school.'; end if;
  if public.is_admin_context() or public.is_steward() then return new; end if;
  if new.role in ('steward', 'partner') and (tg_op = 'INSERT' or new.role is distinct from old.role) then
    raise exception 'Only an Ekoa steward can give the % role.', new.role;
  end if;
  return new;
end $$;
create trigger role_guard before insert or update on public.role_assignments for each row execute function public.guard_role();

-- People: consent changes only through the guardian's link. Anyone can pause an account
-- (withdraw), and only a steward can mark an adult as not needing consent. Recording someone as a
-- minor always puts them back to waiting for a guardian.
create or replace function public.guard_people() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin_context() then return new; end if;
  if new.age_band <> old.age_band and not (public.is_steward() or public.is_liaison_anywhere()) then
    raise exception 'Only the faculty liaison can change an age band.';
  end if;
  if new.auth_user_id is distinct from old.auth_user_id and current_setting('ekoa.linking', true) is distinct from 'on' and not public.is_steward() then
    raise exception 'Sign-in links are managed by the platform.';
  end if;
  if new.is_minor and not old.is_minor and current_setting('ekoa.consent', true) is distinct from 'on' then
    new.consent_status := 'pending';
  end if;
  if new.consent_status is distinct from old.consent_status and current_setting('ekoa.consent', true) is distinct from 'on' then
    if new.consent_status = 'withdrawn' then
      null;
    elsif new.consent_status = 'pending' and new.is_minor and not old.is_minor then
      null;
    elsif new.consent_status = 'not_needed' and not new.is_minor and public.is_steward() then
      null;
    else
      raise exception 'Consent can only be given by a guardian through their consent link.';
    end if;
  end if;
  return new;
end $$;

revoke execute on function public.guard_role(), public.guard_people() from public, anon, authenticated;
