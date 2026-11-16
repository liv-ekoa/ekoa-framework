-- Ekoa: a record without a teacher's verification can be published publicly, for fewer points.
--
-- Until now a public record needed tier T2 (faculty-verified). Now a school's teacher can publish a
-- T0 or T1 record publicly too. It is always labelled Unverified in the app, and it scores half of
-- what a verified record would (on top of the half for a school Ekoa has not verified), with at
-- most five such records counting per school so volume cannot buy a ranking. Adaptations of an
-- unverified record award no points. Publishing is still only by the school's teacher or a steward.

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
  if new.tier > 2 and (tg_op = 'INSERT' or new.tier > old.tier) and current_setting('ekoa.verifying', true) is distinct from 'on' and not public.is_steward() then
    raise exception 'Tiers T3 and T4 come only from peer or partner verification.';
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.guard_record() from public, anon, authenticated;

create or replace view public.public_school_ranking as
with recs as (
  select x.org_id, x.id, x.tier, x.points
  from (
    select r.org_id, r.id, r.tier,
           case r.outcome_class when 'worked' then 10 when 'partly' then 6 when 'did_not_work' then 4 else 0 end
           * case when r.tier >= 3 then 1.5 else 1 end
           * case when r.tier < 2 then 0.5 else 1 end
           * case when o.status = 'active' then 1 else 0.5 end as points,
           row_number() over (partition by r.org_id, (r.tier >= 2) order by r.published_at nulls last, r.id) as rn
    from records r join organisations o on o.id = r.org_id
    where r.status = 'published' and r.visibility = 'public' and not r.anonymised and o.public_visible
  ) x
  where x.tier >= 2 or x.rn <= 5
), adopt as (
  select r.org_id, count(distinct a.org_id) as adopters, count(*) filter (where a.result = 'worked') as adopted_worked
  from adaptations a join records r on r.id = a.source_record_id join organisations ao on ao.id = a.org_id
  where r.status = 'published' and r.visibility = 'public' and not r.anonymised and a.org_id <> r.org_id and ao.status = 'active' and r.tier >= 2
  group by r.org_id
), per_school as (
  select o.id as org_id, o.name, o.country, o.city,
         (count(recs.id) filter (where recs.tier >= 2))::int as verified_records,
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
