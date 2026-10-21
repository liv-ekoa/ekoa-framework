-- Ekoa: keep each school's adults inside their own school, and keep consent with guardians.

-- Organisations: only a steward changes what kind of organisation it is, whether it is an Ekoa
-- audit school, or its onboarding status. A liaison can still edit their school's profile.
create or replace function public.guard_org() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin_context() or public.is_steward() then return new; end if;
  if new.org_type is distinct from old.org_type or new.audit_school is distinct from old.audit_school or new.status is distinct from old.status then
    raise exception 'Only an Ekoa steward can change a school''s type, audit status or onboarding status.';
  end if;
  return new;
end $$;
create trigger org_guard before update on public.organisations for each row execute function public.guard_org();

-- Roles: a liaison can add roles for people they invited or who are already in their school, never
-- pull in someone who belongs to another school.
create or replace function public.guard_role_school() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin_context() or public.is_steward() then return new; end if;
  if exists (select 1 from role_assignments r where r.person_id = new.person_id and r.org_id <> new.org_id)
     and not exists (select 1 from role_assignments r where r.person_id = new.person_id and r.org_id = new.org_id and r.id is distinct from new.id) then
    raise exception 'This person belongs to another school. Ask an Ekoa steward to add them.';
  end if;
  return new;
end $$;
create trigger role_school_guard before insert on public.role_assignments for each row execute function public.guard_role_school();

-- Consent records start empty: only the guardian's link (grant_consent) fills them in. The token
-- is always made by the database.
create or replace function public.prepare_consent() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin_context() then return new; end if;
  new.granted_at := null;
  new.withdrawn_at := null;
  new.scope := '{"account": false, "cross_school": false, "photos": false, "name_on_records": false}'::jsonb;
  new.token := encode(extensions.gen_random_bytes(18), 'hex');
  return new;
end $$;
create trigger consent_prepare before insert on public.consent_records for each row execute function public.prepare_consent();

-- Consent through the link: a guardian is not signed in. If someone signed in uses the link, the
-- audit log names them.
create or replace function public.grant_consent(p_token text, p_guardian_name text, p_scope jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare c consent_records;
begin
  select * into c from consent_records where token = p_token;
  if c.id is null then raise exception 'invalid consent link'; end if;
  if length(trim(p_guardian_name)) < 3 then raise exception 'Type your full name to confirm.'; end if;
  perform set_config('ekoa.consent', 'on', true);
  update consent_records set guardian_name = trim(p_guardian_name), scope = p_scope, granted_at = now(), withdrawn_at = null where id = c.id;
  update people set consent_status = case when coalesce((p_scope ->> 'account')::boolean, false) then 'granted' else 'pending' end where id = c.person_id;
  insert into audit_log (actor_person_id, action, entity, entity_id)
  values (public.current_person_id(), case when public.current_person_id() is null then 'guardian consent recorded' else 'consent recorded while signed in' end, 'consent_records', c.id::text);
end $$;

-- Records: un-anonymising a published record names the school, so it is the liaison's call.
create or replace function public.guard_record() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin_context() then new.updated_at := now(); return new; end if;
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published' or old.visibility <> new.visibility)
     and not (public.has_role(new.org_id, array['faculty_liaison']) or public.is_steward()) then
    raise exception 'Only the faculty liaison can publish a record.';
  end if;
  if tg_op = 'UPDATE' and old.status = 'published' and new.anonymised is distinct from old.anonymised
     and not (public.has_role(new.org_id, array['faculty_liaison']) or public.is_steward()) then
    raise exception 'Only the faculty liaison can change whether a published record names the school.';
  end if;
  if new.visibility = 'public' and new.status = 'published' and new.tier < 2 then
    raise exception 'Public records need tier T2 or higher.';
  end if;
  if new.tier > 2 and (tg_op = 'INSERT' or new.tier > old.tier) and current_setting('ekoa.verifying', true) is distinct from 'on' and not public.is_steward() then
    raise exception 'Tiers T3 and T4 come only from peer or partner verification.';
  end if;
  new.updated_at := now();
  return new;
end $$;

-- Moderation: moderators hide, release or remove a post's text. They cannot rewrite it or change
-- who wrote it.
create or replace function public.guard_post_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin_context() then return new; end if;
  if new.body is distinct from old.body and new.body <> '[Removed by a moderator]' then
    raise exception 'Moderators can remove a post''s text but not rewrite it.';
  end if;
  new.thread_id := old.thread_id;
  new.person_id := old.person_id;
  new.author_name := old.author_name;
  new.author_role := old.author_role;
  new.author_org := old.author_org;
  new.author_is_minor := old.author_is_minor;
  new.created_at := old.created_at;
  return new;
end $$;
create trigger post_update_guard before update on public.posts for each row execute function public.guard_post_update();

-- The audit log always names the signed-in person who acted.
alter policy audit_insert on public.audit_log with check (actor_person_id = public.current_person_id());

revoke execute on function public.guard_org(), public.guard_role_school(), public.prepare_consent(), public.guard_record(), public.guard_post_update() from public, anon, authenticated;
revoke execute on function public.grant_consent(text, text, jsonb) from public;
grant execute on function public.grant_consent(text, text, jsonb) to anon, authenticated;
