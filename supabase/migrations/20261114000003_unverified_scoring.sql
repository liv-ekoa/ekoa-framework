-- Ekoa: schools Ekoa has not verified earn fewer points, and cannot make themselves public.
--
-- Anyone can now register a school, so two things need closing:
--  1. Only a steward decides whether a school appears publicly. A school's own teacher could
--     previously flip public_visible on their own profile.
--  2. Points: a record from a school a steward has not yet verified (status other than 'active')
--     scores half. A school that has not been verified also cannot award adaptation points to
--     others, so fake schools cannot inflate a real school's score.
-- Records still need a teacher's verification (tier T2 or higher) to be public at all.

create or replace function public.guard_org() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin_context() or public.is_steward() then return new; end if;
  if new.org_type is distinct from old.org_type or new.audit_school is distinct from old.audit_school or new.status is distinct from old.status then
    raise exception 'Only an Ekoa steward can change a school''s type, audit status or onboarding status.';
  end if;
  if new.public_visible is distinct from old.public_visible or new.join_code is distinct from old.join_code then
    raise exception 'Only an Ekoa steward can make a school public or change its join code.';
  end if;
  return new;
end $$;
revoke execute on function public.guard_org() from public, anon, authenticated;

create or replace view public.public_school_ranking as
with recs as (
  select r.org_id, r.id, r.tier,
         case r.outcome_class when 'worked' then 10 when 'partly' then 6 when 'did_not_work' then 4 else 0 end
         * case when r.tier >= 3 then 1.5 else 1 end
         * case when o.status = 'active' then 1 else 0.5 end as points
  from records r join organisations o on o.id = r.org_id
  where r.status = 'published' and r.visibility = 'public' and not r.anonymised and o.public_visible and r.tier >= 2
), adopt as (
  select r.org_id, count(distinct a.org_id) as adopters, count(*) filter (where a.result = 'worked') as adopted_worked
  from adaptations a join records r on r.id = a.source_record_id join organisations ao on ao.id = a.org_id
  where r.status = 'published' and r.visibility = 'public' and not r.anonymised and a.org_id <> r.org_id and ao.status = 'active'
  group by r.org_id
), per_school as (
  select o.id as org_id, o.name, o.country, o.city,
         count(recs.id)::int as verified_records,
         (count(recs.id) filter (where recs.tier >= 3))::int as audited_records,
         coalesce(max(adopt.adopters), 0)::int as adopting_schools,
         coalesce(max(adopt.adopted_worked), 0)::int as adoptions_that_worked,
         (coalesce(sum(recs.points), 0) + 8 * coalesce(max(adopt.adopters), 0) + 4 * coalesce(max(adopt.adopted_worked), 0))::numeric as score
  from organisations o
  left join recs on recs.org_id = o.id
  left join adopt on adopt.org_id = o.id
  where o.org_type = 'school' and o.public_visible
  group by o.id
)
select *, rank() over (order by score desc) as position from per_school where score > 0;
