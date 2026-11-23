-- Moving a student into a school no longer fails when they already hold a role there.
-- Before, an admin got "They already hold this role at that school" and the student stayed in the
-- unassigned list with their own projects still in the private workspace. Now the existing role is kept
-- and the move of their projects and the retiring of the private workspace still happen.

create or replace function public.assign_student(p_email text, p_name text, p_age_band text, p_org uuid, p_role text, p_local_title text, p_guardian_name text, p_guardian_email text, p_move_projects boolean)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_person uuid;
  v_minor boolean;
  v_independent uuid[];
begin
  if not public.is_steward() then raise exception 'Only Ekoa admins can assign roles here.'; end if;
  if (select org_type from organisations where id = p_org) is distinct from 'school' then raise exception 'Choose a school.'; end if;
  if p_role not in ('project_lead', 'board_member', 'implementation_team', 'ekoa_rep', 'auditor', 'alumni') then raise exception 'Choose a student role.'; end if;
  select id into v_person from people where lower(email) = lower(trim(p_email));
  if v_person is null then
    if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Add the student''s name.'; end if;
    if coalesce(p_age_band, '') not in ('13-15', '16-17', '18+') then raise exception 'Choose the student''s age group.'; end if;
    v_minor := p_age_band <> '18+';
    if v_minor and coalesce(p_guardian_email, '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      raise exception 'Students under 18 need a parent''s or guardian''s email.';
    end if;
    insert into people (display_name, email, age_band, is_minor) values (trim(p_name), lower(trim(p_email)), p_age_band, v_minor) returning id into v_person;
    if v_minor then
      insert into consent_records (person_id, guardian_name, guardian_email, terms_version)
      values (v_person, coalesce(trim(p_guardian_name), ''), lower(trim(p_guardian_email)), '2026-10');
    end if;
  end if;
  -- A student who already holds a role at the school (for example a teacher confirmed them first) is
  -- not an error: skip adding a second role and carry on, so their own projects can still be moved.
  if not exists (select 1 from role_assignments where person_id = v_person and org_id = p_org and status <> 'alumni') then
    insert into role_assignments (person_id, org_id, role, status, local_title)
    values (v_person, p_org, p_role, 'active', nullif(trim(coalesce(p_local_title, '')), ''));
  end if;
  if coalesce(p_move_projects, false) then
    select array_agg(r.org_id) into v_independent
    from role_assignments r join organisations o on o.id = r.org_id
    where r.person_id = v_person and o.org_type = 'independent' and r.status <> 'alumni';
    if v_independent is not null then
      update projects set org_id = p_org where org_id = any (v_independent);
      update records set org_id = p_org where org_id = any (v_independent);
      update evidence set org_id = p_org where org_id = any (v_independent);
      update role_assignments set status = 'alumni' where person_id = v_person and org_id = any (v_independent);
    end if;
  end if;
  insert into audit_log (actor_person_id, action, entity, entity_id) values (public.active_person_id(), format('assigned %s', p_role), 'role_assignments', v_person::text);
  return v_person;
end $$;

revoke execute on function public.assign_student(text, text, text, uuid, text, text, text, text, boolean) from public, anon;
grant execute on function public.assign_student(text, text, text, uuid, text, text, text, text, boolean) to authenticated;
