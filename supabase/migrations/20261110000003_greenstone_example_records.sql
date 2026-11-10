-- Adds four draft example Implementation Records drawn from public Green School Bali Greenstone
-- (high school capstone) presentations from 2024 to 2026, to sit beside the Quest examples.
-- All are DRAFT, school-only, and name no students. Publish each one only after the student and guardian agree.
-- Figures come from what each student said in their talk; where a figure was not given it is left at zero.
-- Safe to re-run: each insert skips a title that already exists for the school.

-- 1. Biodiversity: restoring a path with native planting (Greenstone 2025)
insert into public.records (org_id, title, summary, category, context, problem, intervention, timeline, budget_summary, budget_currency, obstacles, outcomes, outcome_class, tier, lessons, materials, contributors, visibility, anonymised, status)
select o.id,
  'Regenerating the Orchid Path: two failed projects, then a community planting',
  'A student whose first two ideas failed was rated "urgent change" at a progress check, then switched to restoring a neglected path where native orchids once grew. With more than 10 neighbours, a local gardeners'' group and a school planting event, the path was drained, stepped, planted and blessed.',
  'Biodiversity',
  jsonb_build_object('country', 'Indonesia', 'city', 'Badung, Bali', 'descriptor', 'High school capstone project beside a river and farmland, with village partners', 'budget_band', 'low'),
  'Rice fields around the school are being sold or leased for tourism buildings. A once-planted path that had been home to native wild orchids had no orchids left and was in poor condition.',
  'First tried a fertiliser to raise crop yields (see obstacles), then took on the path. Replaced a drainage pipe with the help of passing neighbours, built steps from used tyres, planted orchids and other flowers with a local gardeners'' group, and held a planting day with a local middle school that also picked up riverside trash. Closed with a blessing ceremony and an opening for village leaders.',
  'Two failed attempts until about February of the project year, a progress check, then the path work and an opening ceremony before the end of the project.',
  'Orchids, flowers, trees and money were donated. The student bought a shared meal for helpers. No amounts recorded.',
  'IDR',
  jsonb_build_array(
    jsonb_build_object('category', 'Approval', 'note', 'First idea, a fertiliser project with a Japanese organisation, stalled in import rules and government requirements that could have taken more than a year.'),
    jsonb_build_object('category', 'Time', 'note', 'Second idea, testing home-made fertiliser, needed about a month in the lab for each sample, too slow for the project year.'),
    jsonb_build_object('category', 'Oversight', 'note', 'Rated "urgent change" at the project confirmation meeting because progress was too low.'),
    jsonb_build_object('category', 'Technical', 'note', 'First attempt to adjust the drainage pipe did not work. Neighbours helped the next morning.')
  ),
  '[]'::jsonb, 'worked', 0,
  'If you are on the wrong train, get off at the nearest station: change plan early when approvals or lab times will not fit your timeline. A small, local project can have more impact than a big, distant one. Work with the people who live there, since neighbours turned up and helped, and a project they back is more likely to last. Ask first and listen first, because the land belongs to the community. Leave space for the next cohort to add to it, such as seating at the riverside.',
  jsonb_build_array(jsonb_build_object('name', 'Drainage pipe', 'kind', 'material'), jsonb_build_object('name', 'Used tyres (steps)', 'kind', 'material'), jsonb_build_object('name', 'Orchids, flowers and trees (donated)', 'kind', 'material')),
  jsonb_build_array('Student lead (Greenstone 2025)', 'Local neighbours', 'Local gardeners'' group', 'Teachers and school maintenance and security teams'),
  'school', false, 'draft'
from public.organisations o
where o.name = 'Green School, Bali'
  and not exists (select 1 from public.records r where r.org_id = o.id and r.title = 'Regenerating the Orchid Path: two failed projects, then a community planting');

-- 2. Biodiversity: coral restoration NGO (Greenstone 2024)
insert into public.records (org_id, title, summary, category, context, problem, intervention, timeline, budget_summary, budget_currency, obstacles, outcomes, outcome_class, tier, lessons, materials, contributors, visibility, anonymised, status)
select o.id,
  'Passion for Good: coral planting days and sturdier reef structures',
  'A student founded a small NGO that aims to replant 10,000 square metres of coral in two years. A first structure material broke in transport, so the design moved to resin, rebar and sand. One planting day with 26 people replanted 400 corals.',
  'Biodiversity',
  jsonb_build_object('country', 'Indonesia', 'city', 'Badung, Bali', 'descriptor', 'High school capstone project run as an NGO with local dive and reef partners', 'budget_band', 'low'),
  'Coral reefs are the base of marine ecosystems and over 500 million people depend on them for food, income and coastal protection, but reefs are dying.',
  'Founded an NGO with three strands: coral planting days for divers, partnerships with businesses that fund coral structures, and helping dive centres set up their own coral gardens. Tested terracotta structures, then switched to structures built from resin, rebar and sand, some built underwater. Partnered with a reef-restoration organisation that had a large restoration site nearby.',
  'Met the reef partner in grade 11; planting day in November; new dive-centre coral garden being set up in North Sulawesi at the time of the talk.',
  'Fundraising through business partners and donations was planned; no amounts were stated.',
  'IDR',
  jsonb_build_array(
    jsonb_build_object('category', 'Technical', 'note', 'Terracotta structures grew coral quickly but were limited to 30 cm and sometimes broke in transport before reaching the water.'),
    jsonb_build_object('category', 'Scale', 'note', 'The goal of 10,000 square metres in two years is far above what one student and one planting day can plant. The 400 corals are the first step, not the goal.')
  ),
  '[]'::jsonb, 'partly', 0,
  'The right material is one that is strong, easy to carry and liked by coral. Talk to divers and marine biologists before choosing one. Partnering with an established reef project gave a site, expertise and volunteers. Record the area planted, not only the number of corals, so progress can be compared with the target.',
  jsonb_build_array(jsonb_build_object('name', 'Terracotta structures (first design)', 'kind', 'material'), jsonb_build_object('name', 'Resin, rebar and sand structures', 'kind', 'material')),
  jsonb_build_array('Student lead (Greenstone 2024)', 'Reef-restoration partner organisation', 'Dive centres', '26 volunteers on the planting day'),
  'school', false, 'draft'
from public.organisations o
where o.name = 'Green School, Bali'
  and not exists (select 1 from public.records r where r.org_id = o.id and r.title = 'Passion for Good: coral planting days and sturdier reef structures');

-- 3. Waste: a machine that sorts rubbish with image recognition (Greenstone 2026)
insert into public.records (org_id, title, summary, category, context, problem, intervention, timeline, budget_summary, budget_currency, obstacles, outcomes, outcome_class, tier, lessons, materials, contributors, visibility, anonymised, status)
select o.id,
  'A rubbish-sorting machine that uses image recognition',
  'A student built a machine that sorts waste automatically, going from a taped-together prototype to a conveyor belt with a Raspberry Pi and a YOLOv8 model. It worked, but the student says the larger problem is sorting at the source.',
  'Waste',
  jsonb_build_object('country', 'Indonesia', 'city', 'Badung, Bali', 'descriptor', 'High school capstone project with makerspace, parent mentors and a school project fund', 'budget_band', 'medium'),
  'More than half of Bali''s waste is organic, and it mixes with recyclables and contaminates them, so recycling facilities cannot process it and it goes to landfill. The student cited a landfill of over 32 hectares.',
  'Visited sorting sites and landfills and asked experts if a sorting machine would help. Pitched the school project fund for money, then built prototypes: sensors first, then an image-recognition model made with Teachable Machine, a first laptop-driven rotating platform, a seven-compartment bin, and finally a conveyor belt with a Raspberry Pi running YOLOv8 so several items can be seen at once.',
  'Ideas through the first two terms of grade 11; working version for a talk in September; later version for the June deadline of the project year.',
  'Funded in part by the school project fund. Several sensors were bought and not used. No amounts recorded.',
  'IDR',
  jsonb_build_array(
    jsonb_build_object('category', 'Planning', 'note', 'Many sensors were bought without research: some arrived broken, some needed more voltage than available, some could not tell what type of trash was in front of them.'),
    jsonb_build_object('category', 'Technical', 'note', 'The first image model was thrown off by changes in lighting, background and angle, so accuracy was low.'),
    jsonb_build_object('category', 'Design', 'note', 'The first versions took one item at a time, needed a large expensive laptop, and judged a whole picture as one trash type.'),
    jsonb_build_object('category', 'Demo', 'note', 'The machine did not run on stage at first; a video was shown and it then worked.')
  ),
  '[]'::jsonb, 'partly', 0,
  'Research before you buy: test a cheap part first. Start with a rough proof of concept held together with tape. Plan for lighting and angles from the start if you use image recognition. Experts and parents mentors made the project work. A machine does not fix a habit: the student ended by urging people to sort at home. Record the machine''s accuracy as a number next time.',
  jsonb_build_array(jsonb_build_object('name', 'Arduino, sensors, servo motors', 'kind', 'equipment'), jsonb_build_object('name', 'Raspberry Pi with YOLOv8 model', 'kind', 'equipment'), jsonb_build_object('name', 'Conveyor belt and wooden bin', 'kind', 'equipment')),
  jsonb_build_array('Student lead (Greenstone 2026)', 'Parent mentors', 'Makerspace team', 'Teachers'),
  'school', false, 'draft'
from public.organisations o
where o.name = 'Green School, Bali'
  and not exists (select 1 from public.records r where r.org_id = o.id and r.title = 'A rubbish-sorting machine that uses image recognition');

-- 4. Energy: a hydrogen-oxygen generator for a motorbike (Greenstone 2026)
insert into public.records (org_id, title, summary, category, context, problem, intervention, timeline, budget_summary, budget_currency, obstacles, outcomes, outcome_class, tier, lessons, materials, contributors, visibility, anonymised, status)
select o.id,
  'H2O On The Go: building a hydrogen-oxygen cell to help a motorbike engine',
  'A student built and rebuilt a water-splitting (HHO) cell over many versions. Version 5 made 200 ml of gas a minute on its first test, but the final working prototype was not finished by presentation day. No fuel savings were claimed.',
  'Energy',
  jsonb_build_object('country', 'Indonesia', 'city', 'Badung, Bali', 'descriptor', 'High school capstone project in a school makerspace', 'budget_band', 'medium'),
  'Transport produces about a third of greenhouse gas emissions. Electric vehicles are often offered as the one solution, yet they depend on mined minerals and on the electricity grid, which in the student''s area is largely coal-powered.',
  'Researched HHO (a mixture of hydrogen and oxygen made by splitting water with electricity) and designed cells in several versions. Early versions that used graphite foil produced nothing. Version 5, in 316L stainless steel, rubber and acrylic with a changed flow geometry, made 200 ml/min on its first test, then went through many rebuilds, adding an integrated reservoir.',
  'Over about two years, with many test-and-rebuild cycles in the school makerspace.',
  'Materials and makerspace time. Fundraising was part of the work; no amounts recorded.',
  'IDR',
  jsonb_build_array(
    jsonb_build_object('category', 'Technical', 'note', 'A graphite-foil design that the student read was the best material produced no gas at all when first plugged in.'),
    jsonb_build_object('category', 'Technical', 'note', 'Cells short-circuited, leaked and overheated, and gas got stuck in the pipes.'),
    jsonb_build_object('category', 'Safety', 'note', 'HHO is explosive. Work needs supervision and a risk assessment. (The student is an experienced makerspace user working with staff.)'),
    jsonb_build_object('category', 'Equipment', 'note', 'The glass tank cracked and leaked repeatedly, and broke when dropped while it was being disconnected.')
  ),
  '[]'::jsonb, 'partly', 0,
  'Read the research papers and not just videos: the best-looking material was not the best in practice. Test each change one at a time, and keep a numbered version log. Check a claim like "runs a bike on water" with measured fuel or emissions before sharing it, since only gas output was reported here. The student estimated the work as postgraduate level and did most of it alone, so a team or mentor would help. Take safety rules seriously with explosive gas.',
  jsonb_build_array(jsonb_build_object('name', '316L stainless steel plates', 'kind', 'material'), jsonb_build_object('name', 'Rubber seals and acrylic', 'kind', 'material'), jsonb_build_object('name', 'Glass reservoir (replaced several times)', 'kind', 'equipment')),
  jsonb_build_array('Student lead (Greenstone 2026)', 'Makerspace team', 'Teachers'),
  'school', false, 'draft'
from public.organisations o
where o.name = 'Green School, Bali'
  and not exists (select 1 from public.records r where r.org_id = o.id and r.title = 'H2O On The Go: building a hydrogen-oxygen cell to help a motorbike engine');
