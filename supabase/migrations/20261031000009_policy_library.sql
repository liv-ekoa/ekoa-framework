-- Public Policy library. A policy is published the moment its school adopts it (an adult, the
-- faculty liaison or an approver, moves it to Adopted) and every later amendment shows at once.
-- Drafts and policies under review stay private to the school. Independent student workspaces
-- never appear. Schools that chose not to be named appear under their anonymised label.

create or replace view public.public_policies as
select
  p.id, p.title, p.version, p.status, p.sections, p.adopted_at, p.updated_at,
  o.org_type = 'ekoa' as is_model,
  case when o.org_type = 'ekoa' then 'Ekoa model policy'
       when o.public_visible then o.name
       else coalesce(nullif(o.anonymised_label, ''), 'A school in the Ekoa network') end as school,
  case when o.org_type = 'school' and o.public_visible then o.id end as org_id,
  case when o.public_visible then o.city else '' end as city,
  o.country
from public.policies p
join public.organisations o on o.id = p.org_id
where p.status in ('adopted', 'amended')
  and o.org_type in ('school', 'ekoa')
  and o.status in ('active', 'onboarding');

revoke all on public.public_policies from public, anon, authenticated;
grant select on public.public_policies to anon, authenticated;

-- The Ekoa model policies and the clauses they are built from (scripts/generate-model-policies-sql.ts).
insert into public.policy_clauses (section, title, body)
select v.section, v.title, v.body from (values
  ('waste_hierarchy', 'Reduce first', 'The school follows the waste hierarchy: avoid waste first, then reuse, then recycle or compost. Disposal to landfill is the last option.'),
  ('waste_audit', 'Annual waste audit', 'Students weigh every waste stream for one normal school week each year. The result is the baseline for the year’s targets and is published to the school community.'),
  ('waste_segregation', 'Sorting at source', 'Every classroom, staffroom and canteen has clearly labelled bins for the streams the school’s collector accepts. Signs use pictures as well as words.'),
  ('waste_organics', 'Food and garden waste', 'Food scraps and garden waste are composted on site or sent to a composting partner. Compost is used in the school grounds.'),
  ('waste_single_use', 'Single-use items', 'The school phases out single-use plastic cutlery, cups, bottles and wrappers in its canteen, events and offices, starting with the items it uses most.'),
  ('waste_collector', 'Agreement with the collector', 'The school agrees in writing with its waste collector how each sorted stream is collected and where it goes, so that sorted waste is not mixed again.'),
  ('waste_ewaste', 'Electronic and hazardous waste', 'Batteries, electronics, bulbs and chemicals are stored safely and handed only to authorised recyclers. The school keeps the receipts.'),
  ('energy_meter', 'Know the meter', 'The school reads its electricity and fuel meters every month and shares the figures, per student, with students and staff.'),
  ('energy_off', 'Switch-off routine', 'Lights, fans, air conditioners, projectors and computers are switched off when rooms are empty. Student monitors check at the end of each day.'),
  ('energy_settings', 'Sensible settings', 'Air conditioning is set no lower than 24°C, and heating no higher than 20°C, unless a health need requires otherwise.'),
  ('energy_efficient', 'Efficient equipment', 'When lights, fans, pumps or appliances are replaced, the school buys the most efficient model it can afford and records the expected saving.'),
  ('energy_renewable', 'Renewable energy', 'The school assesses its roof and grounds for solar power and, where it is viable, plans for it in the capital budget.'),
  ('energy_dashboard', 'Visible results', 'Energy use is shown on a board or screen students pass every day, compared with the same month last year.'),
  ('water_meter', 'Measure water', 'The school reads its water meter every week. Unexplained rises are investigated within a week, because they usually mean a leak.'),
  ('water_leaks', 'Leak reporting', 'Anyone can report a dripping tap, running toilet or leaking pipe. Reported leaks are fixed within five school days.'),
  ('water_fixtures', 'Water-saving fixtures', 'New and replaced taps, toilets and urinals are water-saving models. Push taps or sensors are fitted where taps are often left running.'),
  ('water_harvesting', 'Rainwater harvesting', 'Where the site allows, rainwater from roofs is collected for gardens, cleaning or groundwater recharge.'),
  ('water_drinking', 'Drinking water for all', 'Safe drinking water and refill points are available across the campus so that nobody needs to buy bottled water.'),
  ('water_garden', 'Watering wisely', 'Gardens are watered early in the morning or in the evening, and planting favours species that need little water.'),
  ('food_plate_waste', 'Measure plate waste', 'The canteen weighs food left on plates at least once a week and shares the result with students and the kitchen.'),
  ('food_portions', 'Right-sized portions', 'Students can ask for smaller portions and return for more, so that less food is thrown away.'),
  ('food_local', 'Local and seasonal food', 'The canteen buys local and seasonal produce where it can and tells students where the food comes from.'),
  ('food_plant_based', 'More plant-based meals', 'The menu includes a filling plant-based option every day and builds meals around vegetables, pulses and grains.'),
  ('food_garden', 'School garden', 'The school keeps a food garden that classes use for lessons, and its produce is used in the canteen or taken home.'),
  ('food_surplus', 'Surplus food', 'Safe surplus food is shared with staff, families or a local food partner, following food-safety rules, before anything is composted.'),
  ('procurement_need', 'Buy only what is needed', 'Before buying, staff check whether an item can be borrowed, shared, repaired or found elsewhere in the school.'),
  ('procurement_criteria', 'Sustainability in every purchase', 'Quotes for goods and services over an agreed amount are judged on durability, repairability, packaging, energy use and the supplier’s practices as well as price.'),
  ('procurement_paper', 'Paper', 'The school prints double-sided by default, uses recycled paper and moves forms and notices online where families can access them.'),
  ('procurement_events', 'Events and vendors', 'Packaging and waste terms are written into agreements with event vendors at least six weeks before the event.'),
  ('procurement_uniform', 'Second-hand uniforms and books', 'The school runs a swap or resale scheme for uniforms, textbooks and equipment every year.'),
  ('procurement_cleaning', 'Cleaning products', 'Cleaning products are bought in bulk or refills and chosen for low toxicity where they work as well.'),
  ('biodiversity_survey', 'Know the grounds', 'Students survey the plants, birds and insects on the campus once a year and keep the records so changes can be seen over time.'),
  ('biodiversity_native', 'Native planting', 'New planting uses native species that support local wildlife. Invasive plants are removed with care.'),
  ('biodiversity_wild_area', 'A wild corner', 'Part of the grounds is left less managed, with long grass, leaf litter or a pond, as habitat and as an outdoor classroom.'),
  ('biodiversity_chemicals', 'No harmful sprays', 'The school avoids chemical pesticides and herbicides and uses manual or natural methods first.'),
  ('biodiversity_trees', 'Trees and shade', 'The school protects mature trees and plants new ones to give shade, especially around play areas and walkways.'),
  ('transport_survey', 'How we travel', 'Once a year the school asks students and staff how they travel to school and sets targets to increase walking, cycling, shared transport and buses.'),
  ('transport_safe_routes', 'Safe routes', 'The school works with families and the local authority to make walking and cycling routes safer, and provides secure cycle parking.'),
  ('transport_idling', 'No idling', 'Vehicles waiting at the gate switch off their engines. Signs and student volunteers remind drivers.'),
  ('transport_buses', 'School buses', 'School bus routes are reviewed each year to keep buses full and journeys short, and maintenance records include fuel use.'),
  ('transport_trips', 'Trips', 'Trips favour destinations reachable by public transport or shared coaches, and the travel is counted in the school’s footprint.'),
  ('learning_curriculum', 'In every subject', 'Each department identifies where sustainability fits in what it already teaches and plans at least one lesson or project a year that uses the school’s own data.'),
  ('learning_projects', 'Real projects', 'Students can count work on school sustainability projects towards coursework, service or extended projects where the curriculum allows.'),
  ('learning_data', 'Learning from our numbers', 'The school’s own measurements of waste, energy and water are available to classes for mathematics, science and geography work.'),
  ('learning_staff', 'Staff development', 'Staff receive at least one session a year on the school’s sustainability work and how to include it in their teaching.'),
  ('learning_families', 'Families', 'The school shares results and simple actions with families at least once a term, in the languages families use.'),
  ('governance_approval', 'One approval route', 'Every sustainability proposal follows the same route: student board, faculty liaison, the committee that holds the budget, then the head of school. Each step answers within an agreed time.'),
  ('governance_budget', 'A budget line', 'The school keeps a yearly budget line for sustainability projects, and savings from energy and water are partly returned to it.'),
  ('governance_targets', 'Yearly targets', 'Each year the school sets no more than three targets with a baseline and a deadline, and reports on them at the end of the year, whether they were met or not.'),
  ('governance_records', 'Records of what happened', 'At the end of each project the team writes an implementation record, including what did not work, so the next students start where this team stopped.'),
  ('governance_safeguarding', 'Students first', 'Student-led work follows the school’s safeguarding rules: adults supervise contact with outside organisations, and no student is named or photographed publicly without guardian consent.')
) as v (section, title, body)
where not exists (select 1 from public.policy_clauses c where c.section = v.section);

insert into public.policies (org_id, title, version, status, sections, adopted_at)
select o.id, 'Waste and Recycling Policy', 1, 'adopted',
  jsonb_build_array(jsonb_build_object('key', 'waste_purpose', 'title', 'Purpose', 'body', 'How the school reduces the waste it creates, sorts what remains, and makes sure sorted waste is actually recycled or composted.', 'clause_id', null))
  || coalesce((select jsonb_agg(jsonb_build_object('key', c.section, 'title', c.title, 'body', c.body, 'clause_id', c.id) order by k.ord)
     from unnest(array['waste_hierarchy', 'waste_audit', 'waste_segregation', 'waste_organics', 'waste_single_use', 'waste_collector', 'waste_ewaste', 'measurement', 'reflection', 'continuity', 'review']) with ordinality as k (sec, ord)
     cross join lateral (select * from public.policy_clauses pc where pc.section = k.sec order by pc.created_at limit 1) c), '[]'::jsonb),
  now()
from public.organisations o
where o.org_type = 'ekoa' and not exists (select 1 from public.policies p where p.org_id = o.id and p.title = 'Waste and Recycling Policy')
order by o.created_at limit 1;

insert into public.policies (org_id, title, version, status, sections, adopted_at)
select o.id, 'Energy Policy', 1, 'adopted',
  jsonb_build_array(jsonb_build_object('key', 'energy_purpose', 'title', 'Purpose', 'body', 'How the school measures and cuts its energy use, and plans for renewable energy.', 'clause_id', null))
  || coalesce((select jsonb_agg(jsonb_build_object('key', c.section, 'title', c.title, 'body', c.body, 'clause_id', c.id) order by k.ord)
     from unnest(array['energy_meter', 'energy_off', 'energy_settings', 'energy_efficient', 'energy_renewable', 'energy_dashboard', 'measurement', 'reflection', 'continuity', 'review']) with ordinality as k (sec, ord)
     cross join lateral (select * from public.policy_clauses pc where pc.section = k.sec order by pc.created_at limit 1) c), '[]'::jsonb),
  now()
from public.organisations o
where o.org_type = 'ekoa' and not exists (select 1 from public.policies p where p.org_id = o.id and p.title = 'Energy Policy')
order by o.created_at limit 1;

insert into public.policies (org_id, title, version, status, sections, adopted_at)
select o.id, 'Water Policy', 1, 'adopted',
  jsonb_build_array(jsonb_build_object('key', 'water_purpose', 'title', 'Purpose', 'body', 'How the school measures water, fixes leaks quickly and uses rain before mains water.', 'clause_id', null))
  || coalesce((select jsonb_agg(jsonb_build_object('key', c.section, 'title', c.title, 'body', c.body, 'clause_id', c.id) order by k.ord)
     from unnest(array['water_meter', 'water_leaks', 'water_fixtures', 'water_harvesting', 'water_drinking', 'water_garden', 'measurement', 'reflection', 'continuity', 'review']) with ordinality as k (sec, ord)
     cross join lateral (select * from public.policy_clauses pc where pc.section = k.sec order by pc.created_at limit 1) c), '[]'::jsonb),
  now()
from public.organisations o
where o.org_type = 'ekoa' and not exists (select 1 from public.policies p where p.org_id = o.id and p.title = 'Water Policy')
order by o.created_at limit 1;

insert into public.policies (org_id, title, version, status, sections, adopted_at)
select o.id, 'Food and Canteen Policy', 1, 'adopted',
  jsonb_build_array(jsonb_build_object('key', 'food_purpose', 'title', 'Purpose', 'body', 'How the canteen cuts food waste, serves more local and plant-based food, and connects students with where food comes from.', 'clause_id', null))
  || coalesce((select jsonb_agg(jsonb_build_object('key', c.section, 'title', c.title, 'body', c.body, 'clause_id', c.id) order by k.ord)
     from unnest(array['food_plate_waste', 'food_portions', 'food_local', 'food_plant_based', 'food_garden', 'food_surplus', 'waste_organics', 'measurement', 'reflection', 'continuity', 'review']) with ordinality as k (sec, ord)
     cross join lateral (select * from public.policy_clauses pc where pc.section = k.sec order by pc.created_at limit 1) c), '[]'::jsonb),
  now()
from public.organisations o
where o.org_type = 'ekoa' and not exists (select 1 from public.policies p where p.org_id = o.id and p.title = 'Food and Canteen Policy')
order by o.created_at limit 1;

insert into public.policies (org_id, title, version, status, sections, adopted_at)
select o.id, 'Sustainable Buying Policy', 1, 'adopted',
  jsonb_build_array(jsonb_build_object('key', 'procurement_purpose', 'title', 'Purpose', 'body', 'How the school decides what to buy and from whom, so that purchases last longer and create less waste.', 'clause_id', null))
  || coalesce((select jsonb_agg(jsonb_build_object('key', c.section, 'title', c.title, 'body', c.body, 'clause_id', c.id) order by k.ord)
     from unnest(array['procurement_need', 'procurement_criteria', 'procurement_paper', 'procurement_events', 'procurement_uniform', 'procurement_cleaning', 'measurement', 'reflection', 'continuity', 'review']) with ordinality as k (sec, ord)
     cross join lateral (select * from public.policy_clauses pc where pc.section = k.sec order by pc.created_at limit 1) c), '[]'::jsonb),
  now()
from public.organisations o
where o.org_type = 'ekoa' and not exists (select 1 from public.policies p where p.org_id = o.id and p.title = 'Sustainable Buying Policy')
order by o.created_at limit 1;

insert into public.policies (org_id, title, version, status, sections, adopted_at)
select o.id, 'Grounds and Biodiversity Policy', 1, 'adopted',
  jsonb_build_array(jsonb_build_object('key', 'biodiversity_purpose', 'title', 'Purpose', 'body', 'How the school manages its grounds for wildlife, shade and learning.', 'clause_id', null))
  || coalesce((select jsonb_agg(jsonb_build_object('key', c.section, 'title', c.title, 'body', c.body, 'clause_id', c.id) order by k.ord)
     from unnest(array['biodiversity_survey', 'biodiversity_native', 'biodiversity_wild_area', 'biodiversity_chemicals', 'biodiversity_trees', 'water_garden', 'measurement', 'reflection', 'continuity', 'review']) with ordinality as k (sec, ord)
     cross join lateral (select * from public.policy_clauses pc where pc.section = k.sec order by pc.created_at limit 1) c), '[]'::jsonb),
  now()
from public.organisations o
where o.org_type = 'ekoa' and not exists (select 1 from public.policies p where p.org_id = o.id and p.title = 'Grounds and Biodiversity Policy')
order by o.created_at limit 1;

insert into public.policies (org_id, title, version, status, sections, adopted_at)
select o.id, 'School Travel Policy', 1, 'adopted',
  jsonb_build_array(jsonb_build_object('key', 'transport_purpose', 'title', 'Purpose', 'body', 'How the school helps students and staff travel to school in cleaner, safer ways.', 'clause_id', null))
  || coalesce((select jsonb_agg(jsonb_build_object('key', c.section, 'title', c.title, 'body', c.body, 'clause_id', c.id) order by k.ord)
     from unnest(array['transport_survey', 'transport_safe_routes', 'transport_idling', 'transport_buses', 'transport_trips', 'measurement', 'reflection', 'continuity', 'review']) with ordinality as k (sec, ord)
     cross join lateral (select * from public.policy_clauses pc where pc.section = k.sec order by pc.created_at limit 1) c), '[]'::jsonb),
  now()
from public.organisations o
where o.org_type = 'ekoa' and not exists (select 1 from public.policies p where p.org_id = o.id and p.title = 'School Travel Policy')
order by o.created_at limit 1;

insert into public.policies (org_id, title, version, status, sections, adopted_at)
select o.id, 'Sustainability in Teaching and Learning Policy', 1, 'adopted',
  jsonb_build_array(jsonb_build_object('key', 'learning_purpose', 'title', 'Purpose', 'body', 'How sustainability becomes part of everyday teaching, using the school itself as the case study.', 'clause_id', null))
  || coalesce((select jsonb_agg(jsonb_build_object('key', c.section, 'title', c.title, 'body', c.body, 'clause_id', c.id) order by k.ord)
     from unnest(array['learning_curriculum', 'learning_projects', 'learning_data', 'learning_staff', 'learning_families', 'workshops', 'climate_cafes', 'review']) with ordinality as k (sec, ord)
     cross join lateral (select * from public.policy_clauses pc where pc.section = k.sec order by pc.created_at limit 1) c), '[]'::jsonb),
  now()
from public.organisations o
where o.org_type = 'ekoa' and not exists (select 1 from public.policies p where p.org_id = o.id and p.title = 'Sustainability in Teaching and Learning Policy')
order by o.created_at limit 1;

insert into public.policies (org_id, title, version, status, sections, adopted_at)
select o.id, 'Sustainability Governance and Continuity Policy', 1, 'adopted',
  jsonb_build_array(jsonb_build_object('key', 'governance_purpose', 'title', 'Purpose', 'body', 'Who leads sustainability work, how decisions are made and funded, and how projects survive when students graduate.', 'clause_id', null))
  || coalesce((select jsonb_agg(jsonb_build_object('key', c.section, 'title', c.title, 'body', c.body, 'clause_id', c.id) order by k.ord)
     from unnest(array['summary', 'student_leadership', 'roles', 'governance_approval', 'governance_budget', 'governance_targets', 'documentation', 'governance_records', 'continuity', 'partnerships', 'governance_safeguarding', 'review']) with ordinality as k (sec, ord)
     cross join lateral (select * from public.policy_clauses pc where pc.section = k.sec order by pc.created_at limit 1) c), '[]'::jsonb),
  now()
from public.organisations o
where o.org_type = 'ekoa' and not exists (select 1 from public.policies p where p.org_id = o.id and p.title = 'Sustainability Governance and Continuity Policy')
order by o.created_at limit 1;
