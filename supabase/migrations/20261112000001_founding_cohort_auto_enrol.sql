-- The Founding Cohort is the five founding schools. Any school that becomes active (officially
-- enrolled) joins it automatically, so nobody has to add members by hand.

create or replace function public.enrol_in_founding_cohort() returns trigger
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if new.org_type = 'school' and new.status = 'active' then
    select id into cid from public.cohorts where name = 'Founding Cohort' limit 1;
    if cid is not null then
      insert into public.cohort_members (cohort_id, org_id) values (cid, new.id) on conflict (cohort_id, org_id) do nothing;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists organisations_enrol_founding on public.organisations;
create trigger organisations_enrol_founding after insert or update of status on public.organisations
  for each row execute function public.enrol_in_founding_cohort();
revoke execute on function public.enrol_in_founding_cohort() from public, anon, authenticated;

-- Everyone already active joins now.
insert into public.cohort_members (cohort_id, org_id)
select c.id, o.id from public.cohorts c, public.organisations o
where c.name = 'Founding Cohort' and o.org_type = 'school' and o.status = 'active'
on conflict (cohort_id, org_id) do nothing;
