-- Ekoa works for high schools and universities. Each school now says which it is.
--
-- organisations.school_kind is 'high_school' (the default, so every existing school keeps working as
-- before) or 'university'. It is a label only: points, verification and consent work the same way.
-- A new school chooses its kind when it signs up. The four-argument signup_school is dropped so the
-- call is never ambiguous. Set an existing school's kind with:
--   update organisations set school_kind = 'university' where name = '...';

alter table public.organisations add column school_kind text not null default 'high_school' check (school_kind in ('high_school', 'university'));

drop function if exists public.signup_school(text, text, text, text);

create or replace function public.signup_school(p_name text, p_school text, p_country text, p_city text, p_kind text default 'high_school') returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  em text;
  pid uuid := gen_random_uuid();
  oid uuid := gen_random_uuid();
begin
  if uid is null then raise exception 'Sign in first.'; end if;
  if exists (select 1 from people where auth_user_id = uid) then raise exception 'You already have an account.'; end if;
  if length(trim(coalesce(p_name, ''))) < 2 or length(trim(p_name)) > 80 then raise exception 'Add your name.'; end if;
  if p_kind is null or p_kind not in ('high_school', 'university') then raise exception 'Choose high school or university.'; end if;
  if length(trim(coalesce(p_school, ''))) < 2 or length(trim(p_school)) > 120 then raise exception 'Add your school''s name.'; end if;
  select lower(email) into em from auth.users where id = uid;
  if em is null then raise exception 'Sign in first.'; end if;

  insert into people (id, auth_user_id, display_name, email, age_band, is_minor, locale, consent_status)
  values (pid, uid, trim(p_name), em, '18+', false, 'en', 'not_needed');
  insert into organisations (id, name, org_type, school_kind, country, city, status, public_visible)
  values (oid, trim(p_school), 'school', p_kind, left(trim(coalesce(p_country, '')), 80), left(trim(coalesce(p_city, '')), 80), 'onboarding', false);
  insert into role_assignments (person_id, org_id, role) values (pid, oid, 'faculty_liaison');
  insert into audit_log (actor_person_id, action, entity, entity_id) values (pid, 'school registered (unverified)', 'organisations', oid::text);
  return oid;
end $$;

revoke execute on function public.signup_school(text, text, text, text, text) from public, anon;
grant execute on function public.signup_school(text, text, text, text, text) to authenticated;
