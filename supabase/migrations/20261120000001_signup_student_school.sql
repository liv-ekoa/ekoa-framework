-- A student who signs up on their own now says which school they go to.
--
-- Without it an admin cannot tell where to place an independent student, and has no way to know them.
-- The school name (and optionally city and country) is kept on the student's private workspace, where
-- only they and Ekoa admins can see it. Students who pick a school already on Ekoa pass its name.
-- The two-argument version is dropped so the call is never ambiguous.

drop function if exists public.signup_student(text, text);

create or replace function public.signup_student(p_name text, p_age_band text, p_school_name text, p_country text default '', p_city text default '') returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  em text;
  pid uuid := gen_random_uuid();
  wid uuid := gen_random_uuid();
  minor boolean := p_age_band <> '18+';
begin
  if uid is null then raise exception 'Sign in first.'; end if;
  if exists (select 1 from people where auth_user_id = uid) then raise exception 'You already have an account.'; end if;
  if p_age_band is null or p_age_band not in ('13-15', '16-17', '18+') then raise exception 'Choose your age group.'; end if;
  if length(trim(coalesce(p_name, ''))) < 2 or length(trim(p_name)) > 80 then raise exception 'Add your name.'; end if;
  if length(trim(coalesce(p_school_name, ''))) < 2 or length(trim(p_school_name)) > 120 then raise exception 'Say which school you go to.'; end if;
  select lower(email) into em from auth.users where id = uid;
  if em is null then raise exception 'Sign in first.'; end if;

  insert into people (id, auth_user_id, display_name, email, age_band, is_minor, locale, consent_status)
  values (pid, uid, trim(p_name), em, p_age_band, minor, 'en', case when minor then 'pending' else 'not_needed' end);
  insert into organisations (id, name, org_type, status, public_visible, school_name, country, city)
  values (wid, left(trim(p_name), 70) || ' (independent)', 'independent', 'active', false,
          left(trim(p_school_name), 120), left(trim(coalesce(p_country, '')), 80), left(trim(coalesce(p_city, '')), 80));
  insert into role_assignments (person_id, org_id, role, local_title) values (pid, wid, 'project_lead', 'Independent student');
  if minor then
    insert into consent_records (person_id, terms_version) values (pid, '2026-10');
  end if;
  insert into audit_log (actor_person_id, action, entity, entity_id) values (pid, 'student signed up', 'people', pid::text);
  return pid;
end $$;

revoke execute on function public.signup_student(text, text, text, text, text) from public, anon;
grant execute on function public.signup_student(text, text, text, text, text) to authenticated;
