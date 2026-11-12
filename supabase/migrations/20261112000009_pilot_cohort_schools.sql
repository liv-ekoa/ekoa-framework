-- The Pilot Cohort: three schools alongside the two founding audit schools (Shiv Nadar School and
-- Green School, Bali). The cohort report (pilot-01) is compiled from this cohort. Because they are
-- active schools, the founding-cohort trigger also lists them in the Founding Cohort, which is all five.
-- They stay hidden from the public map and leaderboard until each school confirms it is happy to be named.

insert into public.cohorts (name, starts_on) select 'Pilot Cohort', current_date where not exists (select 1 from public.cohorts where name = 'Pilot Cohort');

insert into public.organisations (name, org_type, country, city, status, public_visible) select 'Dwight School Dubai', 'school', 'United Arab Emirates', 'Dubai', 'active', false where not exists (select 1 from public.organisations where name = 'Dwight School Dubai');
insert into public.organisations (name, org_type, country, city, status, public_visible) select 'Green School New Zealand', 'school', 'New Zealand', 'Taranaki', 'active', false where not exists (select 1 from public.organisations where name = 'Green School New Zealand');
insert into public.organisations (name, org_type, country, city, status, public_visible) select 'UWC Atlantic College', 'school', 'United Kingdom', 'St Donat’s, Wales', 'active', false where not exists (select 1 from public.organisations where name = 'UWC Atlantic College');

insert into public.cohort_members (cohort_id, org_id)
select c.id, o.id from public.cohorts c, public.organisations o
where c.name = 'Pilot Cohort' and o.name in ('Dwight School Dubai', 'Green School New Zealand', 'UWC Atlantic College')
on conflict (cohort_id, org_id) do nothing;

-- The founding trigger only fires on insert or a status change; make sure all five are in the Founding Cohort.
insert into public.cohort_members (cohort_id, org_id)
select c.id, o.id from public.cohorts c, public.organisations o
where c.name = 'Founding Cohort' and o.org_type = 'school' and o.status = 'active'
on conflict (cohort_id, org_id) do nothing;
