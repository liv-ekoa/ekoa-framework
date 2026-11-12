-- Three more example Implementation Records from public Green School Bali pages:
--   KemBali recycling centre rebuild, the Living Bridge, and TerraGym.
-- Written only from what those pages state. Anything they do not say is left empty or says so.
-- Contributors are listed by role, never by name. Published to the network, school name hidden, tier 0.
-- Run once. Does nothing if the school is not in the database or the record already exists.

insert into public.records (org_id, title, summary, category, context, problem, intervention, timeline, budget_summary, budget_currency, obstacles, outcomes, outcome_class, tier, lessons, materials, contributors, visibility, anonymised, status, key_result, example_source, published_at)
select o.id,
  'KemBali: a student-led rebuild of the school recycling centre',
  'A Grade 12 student leads the rebuild of the school''s recycling centre, with High School and Primary students and parents helping. The new building is meant to be easier to use, a place for education, and a recycled artwork in its own right. It adds liquid composting for kitchen scraps.',
  'Waste',
  jsonb_build_object('country', 'Indonesia', 'city', 'Badung, Bali', 'climate_zone', 'Tropical', 'descriptor', 'Student-led rebuild of a recycling centre that has run on campus since 2013', 'budget_band', 'unknown'),
  'The existing recycling centre needed to be more user-friendly and a place for education. Reusable materials and compostable waste, including kitchen scraps, needed an easier way in.',
  'A Grade 12 student leads the rebuild, with students from High School and Primary and many parents involved. The centre keeps discarded items such as cardboard and bottle caps for students to use in art and projects. The expansion adds a Black Soldier Fly liquid composting system so kitchen scraps can be collected. The finished building is designed to be a work of recycled art. A recycling partner and school facilities staff support the work.',
  'The centre has run since 2013. The rebuild was described as on track to finish in 2024.',
  'Not stated in the public source.',
  'IDR',
  '[]'::jsonb, '[]'::jsonb, 'too_early', 0,
  'The public page does not record obstacles or lessons. What it does show: a student can lead a campus facility that serves the whole school, and a recycling centre can double as an art and education space.',
  jsonb_build_array(jsonb_build_object('name', 'Discarded materials kept for student art', 'kind', 'material'), jsonb_build_object('name', 'Black Soldier Fly liquid composting system', 'kind', 'equipment'), jsonb_build_object('name', 'Recycling partner and facilities staff', 'kind', 'facility')),
  jsonb_build_array('Student lead (Grade 12)', 'High School and Primary students', 'Parent volunteers', 'School solutions team', 'Recycling partner organisation'),
  'network', true, 'published',
  'About 800 kg of trash a month (about 9.5 tonnes a year) handled through the centre. Rebuild results not yet reported.',
  'the Green School Bali Environmental Hub waste page (public)',
  now()
from public.organisations o
where o.name = 'Green School, Bali'
  and not exists (select 1 from public.records r where r.org_id = o.id and r.title = 'KemBali: a student-led rebuild of the school recycling centre');

insert into public.records (org_id, title, summary, category, context, problem, intervention, timeline, budget_summary, budget_currency, obstacles, outcomes, outcome_class, tier, lessons, materials, contributors, visibility, anonymised, status, key_result, example_source, published_at)
select o.id,
  'The Living Bridge: a student-designed bamboo learning space',
  'Students aged 15 to 18 took a community learning centre from first sketch to finished building, as part of their curriculum. It stands on the site of an old recycling centre and is made of locally harvested bamboo, with recycled and low-carbon materials throughout.',
  'Waste',
  jsonb_build_object('country', 'Indonesia', 'city', 'Badung, Bali', 'climate_zone', 'Tropical', 'descriptor', 'Student design-build project with a professional architect as mentor, built while the school stayed open', 'budget_band', 'unknown'),
  'The school needed a gateway space that fits its indoor-outdoor way of learning and brings together students, parents, teachers and alumni. The site was a former recycling centre.',
  'Students aged 15 to 18 worked on the whole arc: concept sketches, design, construction and fundraising. A professional architect mentored them, with weekly remote check-ins between the mentor, parents, the on-site team and students. Students crafted furniture from recycled site materials and designed interactive digital pillars that connect current students with alumni and parent mentors. The building uses over 300 pieces of locally harvested bamboo, heat-bent into eight pillars, pelupuh bamboo shingles, glass terrazzo, bricks made from industrial waste ash, carbon-storing lime plaster and mycelium-based acoustic panels.',
  'Part of the school''s Jalan Jalan programme. Reported complete in 2025. The school stayed open during construction.',
  'Budget not stated. Fundraising was part of the student work, with no amount given.',
  'IDR',
  '[]'::jsonb, '[]'::jsonb, 'worked', 0,
  'The public article does not list obstacles or lessons. What it shows: students can take real design and building decisions on a full-size structure when a professional mentor is available each week, and waste streams (ash, glass, site offcuts) can become finished building materials.',
  jsonb_build_array(jsonb_build_object('name', 'Locally harvested bamboo (300+ pieces)', 'kind', 'material'), jsonb_build_object('name', 'Crushed-glass terrazzo', 'kind', 'material'), jsonb_build_object('name', 'Bricks from industrial waste ash', 'kind', 'material'), jsonb_build_object('name', 'Mycelium acoustic panels', 'kind', 'material'), jsonb_build_object('name', 'Professional architect as mentor', 'kind', 'facility')),
  jsonb_build_array('Student designers (ages 15 to 18)', 'Architect mentor', 'Parents', 'On-site building team'),
  'network', true, 'published',
  'Built and complete: 300+ bamboo pieces, eight heat-bent pillars, furniture from recycled site materials.',
  'a public architecture article on the Living Bridge (June 2025)',
  now()
from public.organisations o
where o.name = 'Green School, Bali'
  and not exists (select 1 from public.records r where r.org_id = o.id and r.title = 'The Living Bridge: a student-designed bamboo learning space');

insert into public.records (org_id, title, summary, category, context, problem, intervention, timeline, budget_summary, budget_currency, obstacles, outcomes, outcome_class, tier, lessons, materials, contributors, visibility, anonymised, status, key_result, example_source, published_at)
select o.id,
  'TerraGym: a free outdoor gym built from reclaimed materials',
  'A student''s Quest project to create a free outdoor space where anyone can work out, welcoming to all ages and fitness levels, built only from reclaimed materials.',
  'Waste',
  jsonb_build_object('country', 'Indonesia', 'city', 'Badung, Bali', 'climate_zone', 'Tropical', 'descriptor', 'Student Quest project, reclaimed materials only', 'budget_band', 'unknown'),
  'Not everyone has equal access to exercise. Gyms cost money and equipment is often new and imported.',
  'Designed an outdoor gym that is free to use and open to all ages and fitness levels, using only reclaimed materials. The student published a short project site setting out the vision.',
  'Completed as a Quest project. Dates not stated.',
  'Not stated in the public source.',
  'IDR',
  '[]'::jsonb, '[]'::jsonb, 'too_early', 0,
  'The public page does not record results, obstacles or lessons. It shows a clear aim (free, all ages, reclaimed materials) that another school could copy and then measure, for example weekly users and kilograms of material kept out of the waste stream.',
  jsonb_build_array(jsonb_build_object('name', 'Reclaimed materials', 'kind', 'material')),
  jsonb_build_array('Student lead (Quest)'),
  'network', true, 'published',
  'Free outdoor gym for all ages built from reclaimed materials. Usage not yet reported.',
  'a student''s public project site',
  now()
from public.organisations o
where o.name = 'Green School, Bali'
  and not exists (select 1 from public.records r where r.org_id = o.id and r.title = 'TerraGym: a free outdoor gym built from reclaimed materials');
