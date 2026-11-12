-- Ekoa: anyone can sign up directly, as a student or as a school, and start working.
--
-- A student gets a private personal workspace straight away and can ask to join a school. A
-- teacher at that school confirms them with one click, and their projects move into the school.
-- A school registers itself (unverified until a steward checks it) and gets a join code to share.
-- Joining a school always needs a teacher's confirmation, so a stranger can never read a school's
-- drafts just by typing its name.
--
-- Everything here goes through narrow functions. There are still no direct insert rights on
-- people, organisations or roles for ordinary users.

-- A personal workspace is its own kind of organisation, so it never shows up in school lists.
alter table public.organisations drop constraint organisations_org_type_check;
alter table public.organisations add constraint organisations_org_type_check check (org_type in ('school', 'partner', 'ekoa', 'workspace'));

-- A short code a school shares so its students can find it even before the school is verified.
alter table public.organisations add column join_code text unique default upper(encode(extensions.gen_random_bytes(5), 'hex'));
update public.organisations set join_code = upper(encode(extensions.gen_random_bytes(5), 'hex')) where join_code is null;

-- Someone who only has a personal workspace is not yet "in another school".
create or replace function public.guard_role_school() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin_context() or public.is_steward() then return new; end if;
  if exists (select 1 from role_assignments r join organisations o on o.id = r.org_id where r.person_id = new.person_id and r.org_id <> new.org_id and o.org_type <> 'workspace')
     and not exists (select 1 from role_assignments r where r.person_id = new.person_id and r.org_id = new.org_id and r.id is distinct from new.id) then
    raise exception 'This person belongs to another school. Ask an Ekoa steward to add them.';
  end if;
  return new;
end $$;
revoke execute on function public.guard_role_school() from public, anon, authenticated;

create table public.join_requests (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  org_id uuid not null references public.organisations (id) on delete cascade,
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'declined')),
  requested_at timestamptz not null default now(),
  decided_by uuid references public.people (id) on delete set null,
  decided_at timestamptz,
  unique (person_id, org_id)
);
create index on public.join_requests (org_id, status);
alter table public.join_requests enable row level security;
-- Readable by the student and by the school's teachers. Changed only through the functions below.
create policy join_requests_read on public.join_requests for select to authenticated using (
  person_id = public.current_person_id() or public.is_steward() or public.has_role(org_id, array['faculty_liaison'])
);

-- ---------------------------------------------------------------- Sign up
create or replace function public.signup_student(p_name text, p_age_band text) returns uuid
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
  select lower(email) into em from auth.users where id = uid;
  if em is null then raise exception 'Sign in first.'; end if;

  insert into people (id, auth_user_id, display_name, email, age_band, is_minor, locale, consent_status)
  values (pid, uid, trim(p_name), em, p_age_band, minor, 'en', case when minor then 'pending' else 'not_needed' end);
  insert into organisations (id, name, org_type, status, public_visible)
  values (wid, left(split_part(trim(p_name), ' ', 1), 40) || '''s workspace', 'workspace', 'onboarding', false);
  insert into role_assignments (person_id, org_id, role) values (pid, wid, 'project_lead');
  if minor then
    insert into consent_records (person_id, terms_version) values (pid, '2026-10');
  end if;
  insert into audit_log (actor_person_id, action, entity, entity_id) values (pid, 'student signed up', 'people', pid::text);
  return pid;
end $$;

create or replace function public.signup_school(p_name text, p_school text, p_country text, p_city text) returns uuid
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
  if length(trim(coalesce(p_school, ''))) < 2 or length(trim(p_school)) > 120 then raise exception 'Add your school''s name.'; end if;
  select lower(email) into em from auth.users where id = uid;
  if em is null then raise exception 'Sign in first.'; end if;

  insert into people (id, auth_user_id, display_name, email, age_band, is_minor, locale, consent_status)
  values (pid, uid, trim(p_name), em, '18+', false, 'en', 'not_needed');
  insert into organisations (id, name, org_type, country, city, status, public_visible)
  values (oid, trim(p_school), 'school', left(trim(coalesce(p_country, '')), 80), left(trim(coalesce(p_city, '')), 80), 'onboarding', false);
  insert into role_assignments (person_id, org_id, role) values (pid, oid, 'faculty_liaison');
  insert into audit_log (actor_person_id, action, entity, entity_id) values (pid, 'school registered (unverified)', 'organisations', oid::text);
  return oid;
end $$;

-- ---------------------------------------------------------------- Find a school, ask to join
-- Only verified, public schools can be searched by name. Any school can be found by its code.
create or replace function public.find_schools(p_query text) returns table (id uuid, name text, city text, country text)
language sql stable security definer set search_path = public as $$
  select o.id, o.name, o.city, o.country from organisations o
  where auth.uid() is not null and length(trim(coalesce(p_query, ''))) >= 2
    and o.org_type = 'school' and o.status = 'active' and o.public_visible
    and o.name ilike '%' || replace(replace(trim(p_query), '%', ''), '_', '') || '%'
  order by o.name limit 20
$$;

create or replace function public.school_by_code(p_code text) returns table (id uuid, name text, city text, country text)
language sql stable security definer set search_path = public as $$
  select o.id, o.name, o.city, o.country from organisations o
  where auth.uid() is not null and o.org_type = 'school' and o.join_code = upper(trim(coalesce(p_code, '')))
$$;

create or replace function public.request_to_join_school(p_org uuid, p_code text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := public.working_person_id();
  o organisations;
  rid uuid;
begin
  if me is null then raise exception 'Your account is not active.'; end if;
  select * into o from organisations where id = p_org and org_type = 'school';
  if o.id is null then raise exception 'School not found.'; end if;
  if not ((o.status = 'active' and o.public_visible) or (p_code is not null and o.join_code = upper(trim(p_code)))) then
    raise exception 'Ask your teacher for this school''s join code.';
  end if;
  if exists (select 1 from role_assignments r join organisations x on x.id = r.org_id where r.person_id = me and x.org_type = 'school' and r.status in ('active', 'outgoing', 'incoming')) then
    raise exception 'You already belong to a school.';
  end if;
  if exists (select 1 from join_requests where person_id = me and status = 'requested') then
    raise exception 'You already have a request waiting for a teacher.';
  end if;
  insert into join_requests (person_id, org_id) values (me, p_org)
    on conflict (person_id, org_id) do update set status = 'requested', requested_at = now(), decided_by = null, decided_at = null
    where join_requests.status = 'declined'
  returning id into rid;
  if rid is null then raise exception 'You already asked to join this school.'; end if;
  return rid;
end $$;

create or replace function public.pending_join_requests(p_org uuid) returns table (request_id uuid, display_name text, age_band text, requested_at timestamptz)
language sql stable security definer set search_path = public as $$
  select j.id, p.display_name, p.age_band, j.requested_at
  from join_requests j join people p on p.id = j.person_id
  where j.org_id = p_org and j.status = 'requested' and (public.is_steward() or public.has_role(p_org, array['faculty_liaison']))
  order by j.requested_at
$$;

-- A teacher confirms or declines. Confirming gives the student a team seat and moves their draft
-- projects into the school. A project that already has files, evidence, records, chats or
-- proposals stays in the student's workspace, so nothing is cut off from its own attachments.
create or replace function public.decide_join_request(p_request uuid, p_accept boolean) returns int
language plpgsql security definer set search_path = public as $$
declare
  j join_requests;
  w uuid;
  moved int := 0;
begin
  select * into j from join_requests where id = p_request for update;
  if j.id is null or j.status <> 'requested' then raise exception 'This request is no longer waiting.'; end if;
  if not (public.is_steward() or public.has_role(j.org_id, array['faculty_liaison'])) then
    raise exception 'Only a teacher at this school can decide.';
  end if;
  if j.person_id = public.working_person_id() then raise exception 'You cannot confirm your own request.'; end if;

  if p_accept then
    if not exists (select 1 from role_assignments where person_id = j.person_id and org_id = j.org_id) then
      insert into role_assignments (person_id, org_id, role) values (j.person_id, j.org_id, 'implementation_team');
    end if;
    for w in select r.org_id from role_assignments r join organisations o on o.id = r.org_id where r.person_id = j.person_id and o.org_type = 'workspace' loop
      with moving as (
        select pr.id from projects pr
        where pr.org_id = w
          and not exists (select 1 from evidence e where e.project_id = pr.id)
          and not exists (select 1 from project_files f where f.project_id = pr.id)
          and not exists (select 1 from records rc where rc.project_id = pr.id)
          and not exists (select 1 from threads t where t.project_id = pr.id)
          and not exists (select 1 from proposals pp where pp.project_id = pr.id)
      ), upd as (
        update projects set org_id = j.org_id where id in (select id from moving) returning id
      ), cmt as (
        update project_comments set org_id = j.org_id where project_id in (select id from upd) returning 1
      )
      select count(*) into moved from upd;
      delete from organisations where id = w and not exists (select 1 from projects where org_id = w);
    end loop;
  end if;

  update join_requests set status = case when p_accept then 'confirmed' else 'declined' end, decided_by = public.working_person_id(), decided_at = now() where id = j.id;
  insert into audit_log (actor_person_id, action, entity, entity_id)
  values (public.working_person_id(), case when p_accept then 'join request confirmed' else 'join request declined' end, 'people', j.person_id::text);
  return moved;
end $$;

revoke execute on function public.signup_student(text, text), public.signup_school(text, text, text, text), public.find_schools(text), public.school_by_code(text),
  public.request_to_join_school(uuid, text), public.pending_join_requests(uuid), public.decide_join_request(uuid, boolean) from public, anon;
grant execute on function public.signup_student(text, text), public.signup_school(text, text, text, text), public.find_schools(text), public.school_by_code(text),
  public.request_to_join_school(uuid, text), public.pending_join_requests(uuid), public.decide_join_request(uuid, boolean) to authenticated;
