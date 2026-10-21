-- Ekoa: rules that were only checked in the browser, now enforced by the database.

-- New people: minors always start with consent pending (only a guardian's consent link changes
-- that), and someone who already signed in before being invited is linked straight away.
create or replace function public.prepare_person() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin_context() then
    new.consent_status := case when new.is_minor then 'pending' else 'not_needed' end;
  end if;
  new.email := lower(trim(new.email));
  if new.auth_user_id is null then
    new.auth_user_id := (select u.id from auth.users u where lower(u.email) = new.email limit 1);
  end if;
  return new;
end $$;
create trigger people_prepare before insert on public.people for each row execute function public.prepare_person();

-- Projects start at Identify and move one stage at a time, only after that stage's gate is signed.
create or replace function public.guard_project_stage() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  stages text[] := array['identify', 'design', 'implement', 'collaborate', 'measure', 'scale'];
begin
  if public.is_admin_context() or public.is_steward() then return new; end if;
  if tg_op = 'INSERT' then
    new.stage := 'identify';
    return new;
  end if;
  if new.stage is distinct from old.stage then
    if array_position(stages, new.stage) is distinct from array_position(stages, old.stage) + 1 then
      raise exception 'Projects move one stage at a time.';
    end if;
    if not exists (select 1 from stage_gates g where g.project_id = new.id and g.stage = old.stage) then
      raise exception 'Sign the % gate before moving on.', old.stage;
    end if;
  end if;
  return new;
end $$;
create trigger project_stage_guard before insert or update on public.projects for each row execute function public.guard_project_stage();

revoke execute on function public.prepare_person(), public.guard_project_stage() from public, anon, authenticated;
