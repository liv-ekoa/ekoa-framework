-- Ekoa admins can remove a student who is not at a school, and restore them later.
--
-- Removing is a suspension, not a deletion: the account and its work are kept, but the person loses all
-- access (they can sign in, and see a message that the account is removed). An admin can restore them.
--  * people.removed_at marks the removal. active_person_id() and working_person_id() ignore a removed
--    person, so every policy that relies on them treats the person as having no access at all.
--  * Only the two functions below change removed_at (they set a transaction-local flag the guard checks).
--    A direct update by anyone else is refused.
--  * Students at a school are removed by that school's teacher in My school, not here. A person holding a
--    staff or admin role can never be removed with this function.

alter table public.people add column removed_at timestamptz;
comment on column public.people.removed_at is 'Set when an Ekoa admin removes the account. The person keeps their data but has no access until restored.';

create or replace function public.active_person_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from people where auth_user_id = auth.uid() and consent_status in ('granted', 'not_needed') and removed_at is null
$$;

create or replace function public.working_person_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from people
  where auth_user_id = auth.uid()
    and removed_at is null
    and (
      consent_status in ('granted', 'not_needed')
      or (consent_status = 'pending' and now() < coalesce(draft_until, created_at + interval '30 days'))
    )
$$;

create or replace function public.guard_people() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin_context() then return new; end if;
  if new.removed_at is distinct from old.removed_at and current_setting('ekoa.removal', true) is distinct from 'on' then
    raise exception 'Use Remove student or Restore in the admin console.';
  end if;
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
revoke execute on function public.guard_people() from public, anon, authenticated;

create or replace function public.remove_student(p_person uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_steward() then raise exception 'Only Ekoa admins can remove a student.'; end if;
  if exists (
    select 1 from role_assignments r join organisations o on o.id = r.org_id
    where r.person_id = p_person and r.status <> 'alumni' and o.org_type <> 'independent'
  ) then
    raise exception 'This person is at a school or holds a staff role. A teacher at the school removes students from My school.';
  end if;
  perform set_config('ekoa.removal', 'on', true);
  update people set removed_at = now() where id = p_person and removed_at is null;
  if not found then raise exception 'That student does not exist or is already removed.'; end if;
  update join_requests set status = 'declined', decided_by = public.active_person_id(), decided_at = now()
  where person_id = p_person and status = 'requested';
  insert into audit_log (actor_person_id, action, entity, entity_id) values (public.active_person_id(), 'removed student', 'people', p_person::text);
end $$;

create or replace function public.restore_student(p_person uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_steward() then raise exception 'Only Ekoa admins can restore a student.'; end if;
  perform set_config('ekoa.removal', 'on', true);
  update people set removed_at = null where id = p_person and removed_at is not null;
  if not found then raise exception 'That student is not removed.'; end if;
  insert into audit_log (actor_person_id, action, entity, entity_id) values (public.active_person_id(), 'restored student', 'people', p_person::text);
end $$;

revoke execute on function public.remove_student(uuid), public.restore_student(uuid) from public, anon;
grant execute on function public.remove_student(uuid), public.restore_student(uuid) to authenticated;
