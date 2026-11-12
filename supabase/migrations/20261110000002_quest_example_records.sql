-- Adds draft example Implementation Records drawn from public Green School Bali Quest presentations
-- (Green School Bali YouTube channel, Quest 2023, 2024 and 2026), so the Library has worked examples
-- showing students what a good record contains, failures included.
-- All are DRAFT, school-only, and name no students. Publish each one only after the student and guardian agree.
-- Figures come from what each student said in their talk; where a figure was not given it is left at zero.
-- Safe to re-run: each insert skips a title that already exists for the school.

-- 1. Waste: textile scraps into stuffed toys (Quest 2026)
insert into public.records (org_id, title, summary, category, context, problem, intervention, timeline, budget_summary, budget_currency, obstacles, outcomes, outcome_class, tier, lessons, materials, contributors, visibility, anonymised, status)
select o.id,
  'Waste to Worth: stuffed toys made from discarded fabric',
  'A student turned scrap fabric and donated clothes into 15 stuffed toys, taught others to sew them at two school events, and gave them to a local orphanage. The stuffing and outer fabric were almost entirely waste.',
  'Waste',
  jsonb_build_object('country', 'Indonesia', 'city', 'Badung, Bali', 'descriptor', 'Student-led Quest project in a school with a makerspace', 'budget_band', 'zero'),
  'Indonesia produces about 2.3 million tonnes of textile waste a year, and Bali about 1.2 million tonnes of that. Shop-bought toys are usually stuffed with polyester, which does not biodegrade and sheds microplastics.',
  'Learned to sew from a teacher, then made toys from scrap fabric and used cut-up donated clothes as stuffing. Ran a donation box at a busy school walkway, taught sewing and stuffing at a youth conference stall and a school art day, then donated the finished toys to an orphanage.',
  'Sewing lessons first, a prototype after two lessons, donation box left out for about a month, finished toys shown at a youth conference and an art day, donated in the same term.',
  'No spending recorded: fabric came from the family and donations, and the sewing teacher gave lessons.',
  'IDR',
  jsonb_build_array(
    jsonb_build_object('category', 'Skills', 'note', 'The student could not sew. About two hours per toy at first, so efficiency had to improve.'),
    jsonb_build_object('category', 'Supply', 'note', 'Three local textile shops had no fabric to donate. Switched to scraps from family art projects.'),
    jsonb_build_object('category', 'Quality', 'note', 'Most of the first donation box was unusable because of stains and rough materials; a second round a few weeks later worked.')
  ),
  '[]'::jsonb, 'worked', 0,
  'Have a backup source for materials, because the first plan (textile shops) failed. Donation boxes need a "clean and soft only" label. Teaching others to sew at events multiplied the labour and spread the message. Hand-sewing the faces took far longer than machine-sewing the bodies.',
  jsonb_build_array(jsonb_build_object('name', 'Scrap fabric', 'kind', 'material'), jsonb_build_object('name', 'Donated clothes (stuffing)', 'kind', 'material'), jsonb_build_object('name', 'Sewing machine and teacher', 'kind', 'facility')),
  jsonb_build_array('Student lead (Quest 2026)', 'Sewing teacher'),
  'school', false, 'draft'
from public.organisations o
where o.name = 'Green School, Bali'
  and not exists (select 1 from public.records r where r.org_id = o.id and r.title = 'Waste to Worth: stuffed toys made from discarded fabric');

-- 2. Waste: fishing nets into carabiners (Quest 2023)
insert into public.records (org_id, title, summary, category, context, problem, intervention, timeline, budget_summary, budget_currency, obstacles, outcomes, outcome_class, tier, lessons, materials, contributors, visibility, anonymised, status)
select o.id,
  'Giving Nets a New Life: recycling broken fishing nets into carabiners',
  'A student collected over 12 kg of broken fishing nets from local fishermen and, after a switch to bottle caps and back again, melted the nets into strong, hard carabiners. The fins she first wanted to make were blocked by mould costs.',
  'Waste',
  jsonb_build_object('country', 'Indonesia', 'city', 'Badung, Bali', 'descriptor', 'Student-led Quest project near fishing communities', 'budget_band', 'low'),
  'Abandoned fishing nets (ghost nets) do not decompose. They break into microplastics and harm marine life, and are estimated to make up a large share of the Great Pacific Garbage Patch.',
  'Asked fishermen, with a mentor translating, for nets they would otherwise throw into the sea. Collected over 12 kg in three days, cleaned them and removed metal pieces. After advice from a plastic-collection company that nets were too flexible for fins, tried bottle caps, then went back to nets with a plastic-recycling machine company. Found the right melting temperature on the third try.',
  'Collected nets over three days; machine trials on later days (too cold, too hot, then right); presented at Quest 2023.',
  'The cost that blocked the work was a fin mould at about 10 million rupiah. Partner companies offered machine time and help instead.',
  'IDR',
  jsonb_build_array(
    jsonb_build_object('category', 'Language', 'note', 'First visit to fishermen failed: no shared language. Went back with a mentor.'),
    jsonb_build_object('category', 'Technical', 'note', 'First idea (swimwear) dropped because fabric recycling is hard. Fins judged too hard for flexible net plastic.'),
    jsonb_build_object('category', 'Cost', 'note', 'Each fin mould cost about 10 million rupiah, which the student could not afford.'),
    jsonb_build_object('category', 'Technical', 'note', 'Machine temperature was too low (nets did not melt), then too high (turned to liquid), then right on the third attempt.')
  ),
  '[]'::jsonb, 'partly', 0,
  'Expect to change the product several times and keep the goal. A recycler told her not to give up on nets, so she went back to them. Partner companies can lend machines and know-how when moulds are too expensive. Ask permission before taking nets, bring someone who speaks the language, and test settings (such as temperature) in small steps.',
  jsonb_build_array(jsonb_build_object('name', 'Broken fishing nets (12 kg+)', 'kind', 'material'), jsonb_build_object('name', 'Plastic-recycling machine (partner company)', 'kind', 'equipment'), jsonb_build_object('name', 'Bottle caps (comparison carabiners)', 'kind', 'material')),
  jsonb_build_array('Student lead (Quest 2023)', 'Adult mentor', 'Two recycling and reuse partner organisations'),
  'school', false, 'draft'
from public.organisations o
where o.name = 'Green School, Bali'
  and not exists (select 1 from public.records r where r.org_id = o.id and r.title = 'Giving Nets a New Life: recycling broken fishing nets into carabiners');

-- 3. Waste: surfboard fins into furniture (Quest 2023)
insert into public.records (org_id, title, summary, category, context, problem, intervention, timeline, budget_summary, budget_currency, obstacles, outcomes, outcome_class, tier, lessons, materials, contributors, visibility, anonymised, status)
select o.id,
  'Surf Life: upcycling old surfboard fins into home decor',
  'A student collected 62 fins and two surfboards from surf coaches and friends and planned five upcycled pieces. Only one was finished, because each piece took about 22 hours.',
  'Waste',
  jsonb_build_object('country', 'Indonesia', 'city', 'Badung, Bali', 'descriptor', 'Student-led Quest project in a surf community', 'budget_band', 'low'),
  'Surfboards are made of fibreglass and epoxy and are rarely recycled. The student cited over 400,000 boards wasted each year, many ending in landfill.',
  'Asked surf coaches and friends for old boards and fins, cleaned and sanded the fins, carved a wood attachment and glued the fin into it with epoxy to make a hanger. One board had to be bought.',
  'Fins cleaned and sanded over one to two weeks, then the wood attachment; about 15 hours at school and 7 at home for the single finished piece.',
  'Donated materials; one surfboard bought. No amounts recorded.',
  'IDR',
  jsonb_build_array(
    jsonb_build_object('category', 'Time', 'note', 'Goal was five pieces; only one was made. A piece took about 22 hours in total.'),
    jsonb_build_object('category', 'Supply', 'note', 'Not enough donated boards, so one had to be bought.')
  ),
  '[]'::jsonb, 'partly', 0,
  'Time one piece before promising five. Fins and boards donated by a community are plentiful, but the labour is the limit. The student kept two boards and a bag of fins to carry on after Quest, which a good handover note would capture.',
  jsonb_build_array(jsonb_build_object('name', 'Used surfboard fins (62)', 'kind', 'material'), jsonb_build_object('name', 'Used surfboards (2, plus 1 bought)', 'kind', 'material'), jsonb_build_object('name', 'Wood, epoxy, sanding tools', 'kind', 'material')),
  jsonb_build_array('Student lead (Quest 2023)', 'Surf coaches and friends who donated boards'),
  'school', false, 'draft'
from public.organisations o
where o.name = 'Green School, Bali'
  and not exists (select 1 from public.records r where r.org_id = o.id and r.title = 'Surf Life: upcycling old surfboard fins into home decor');

-- 4. Waste: gym weights from beach plastic (Quest 2023)
insert into public.records (org_id, title, summary, category, context, problem, intervention, timeline, budget_summary, budget_currency, obstacles, outcomes, outcome_class, tier, lessons, materials, contributors, visibility, anonymised, status)
select o.id,
  'Eco Gym Equipment: dumbbells from beach plastic, sand and bio-epoxy',
  'A student collected plastic from beaches and roads and cast dumbbells from it with sand and bio-epoxy. The first weight was only 0.7 kg; the final pair weighed 1.7 kg and 1.9 kg and were donated to a village exercise class.',
  'Waste',
  jsonb_build_object('country', 'Indonesia', 'city', 'Badung, Bali', 'descriptor', 'Student-led Quest project with school science lab access', 'budget_band', 'low'),
  'Beaches in Bali are covered in plastic, and gym equipment is made from new materials. The student wanted to turn collected plastic into something people use.',
  'Learned about composites in a school green-composites class. Mixed collected plastic, sand and bio-epoxy in a yogurt-cup mould with a bamboo handle. Made a lighter first weight, then increased sand and plastic and reduced epoxy for weight and durability. Donated the weights to a local banjar exercise class that had no equipment.',
  'Class on composites, then trial weights, then final pair, then donation, within the Quest term (2023).',
  'Bio-epoxy was the main bought material. No amounts recorded.',
  'IDR',
  jsonb_build_array(
    jsonb_build_object('category', 'Quality', 'note', 'First dumbbell weighed 0.7 kg, too light for a real workout, and was not durable enough.'),
    jsonb_build_object('category', 'Safety', 'note', 'First attempt nearly caused a fire in the science lab. The student learned where the fire extinguishers were. Next time: adult supervision and a risk assessment before heating or curing.'),
    jsonb_build_object('category', 'Quality', 'note', 'The two final weights are 1.9 kg and 1.7 kg, so not an exactly matched pair.')
  ),
  '[]'::jsonb, 'worked', 0,
  'Less epoxy and more sand and plastic gave heavier, more durable weights. Test early and adjust the recipe. Decide who receives the product before you finish, as the banjar class gave the weights a real user. Do a risk assessment before any lab work with resins.',
  jsonb_build_array(jsonb_build_object('name', 'Beach and roadside plastic', 'kind', 'material'), jsonb_build_object('name', 'Sand', 'kind', 'material'), jsonb_build_object('name', 'Bio-epoxy', 'kind', 'material'), jsonb_build_object('name', 'Bamboo handles', 'kind', 'material')),
  jsonb_build_array('Student lead (Quest 2023)', 'Composites class teacher', 'Local banjar exercise class'),
  'school', false, 'draft'
from public.organisations o
where o.name = 'Green School, Bali'
  and not exists (select 1 from public.records r where r.org_id = o.id and r.title = 'Eco Gym Equipment: dumbbells from beach plastic, sand and bio-epoxy');

-- 5. Energy: card game for clean-energy awareness (Quest 2023)
insert into public.records (org_id, title, summary, category, context, problem, intervention, timeline, budget_summary, budget_currency, obstacles, outcomes, outcome_class, tier, lessons, materials, contributors, visibility, anonymised, status)
select o.id,
  'Clean Energy Cards: a card game that teaches children about renewable energy',
  'A student designed and printed a card deck about clean energy, sold packs at school shop and market events, and gave the profits to an environmental charity. Learning effects were not measured.',
  'Energy',
  jsonb_build_object('country', 'Indonesia', 'city', 'Badung, Bali', 'descriptor', 'Student-led Quest project, awareness and education', 'budget_band', 'low'),
  'Demand for energy keeps rising and much of it still comes from fossil fuels. The student wanted younger children to learn about renewable sources such as hydro, solar and wind in a fun way instead of through lectures.',
  'Researched renewable energy, designed the cards in design software, and chose a local print shop after the school makerspace could not give the result wanted. Sold packs through the school shop, at a Friday market (10 packs sold) and at a festival, and donated the profits.',
  'About two weeks before the deadline the first print shop said it could not finish in time; a second shop printed the cards one day before the deadline.',
  'Printing was the main cost, covered by sales. Profits were donated. No figures recorded.',
  'IDR',
  jsonb_build_array(
    jsonb_build_object('category', 'Supplier', 'note', 'The first print shop could not deliver before the deadline. The student emailed every print shop in Bali until one agreed.'),
    jsonb_build_object('category', 'Planning', 'note', 'A lot of time went on the concept and design, and not enough on how to produce the cards, leaving a two-week rush.')
  ),
  '[]'::jsonb, 'partly', 0,
  'Plan production and printing at the start, not after the design. Ask several suppliers early. Selling through the school shop and events gave an audience and raised money. Awareness projects need a way to check what players learned, such as a quick quiz before and after.',
  jsonb_build_array(jsonb_build_object('name', 'Card deck design files', 'kind', 'design'), jsonb_build_object('name', 'Printed card decks', 'kind', 'product')),
  jsonb_build_array('Student lead (Quest 2023)', 'Quest teachers', 'Local print shop'),
  'school', false, 'draft'
from public.organisations o
where o.name = 'Green School, Bali'
  and not exists (select 1 from public.records r where r.org_id = o.id and r.title = 'Clean Energy Cards: a card game that teaches children about renewable energy');

-- 6. Food: restoring an aquaponics system (Quest 2024)
insert into public.records (org_id, title, summary, category, context, problem, intervention, timeline, budget_summary, budget_currency, obstacles, outcomes, outcome_class, tier, lessons, materials, contributors, visibility, anonymised, status)
select o.id,
  'Restoring Aquaponics: bringing a neglected fish-and-plant system back to life',
  'A student worked with the school maintenance team to clear, repair and restock an overgrown aquaponics system. It is a water-saving way to grow food, and the work was recorded with before and after photos. Harvest and water-use figures were not measured.',
  'Food',
  jsonb_build_object('country', 'Indonesia', 'city', 'Badung, Bali', 'descriptor', 'Student-led Quest project on school grounds with a maintenance team', 'budget_band', 'low'),
  'The school had an aquaponics area that had become overgrown and was not working. Aquaponics grows food using fish waste as fertiliser and can use far less water than soil farming (the student cited up to 90% less).',
  'Cleared the overgrown area and removed debris, repaired and adjusted the water system so it flowed continuously, then restocked it with new fish and plants. Worked with the head of the maintenance team and photographed the before and after.',
  'Over one school term (term four).',
  'No costs recorded; the maintenance team supported repairs and materials.',
  'IDR',
  jsonb_build_array(
    jsonb_build_object('category', 'Technical', 'note', 'Fish and plants need a balance of water quality, temperature and pH, and the system must be monitored to keep it.'),
    jsonb_build_object('category', 'Skills', 'note', 'Needs knowledge of both fish keeping and hydroponics, which the student learned on the job.'),
    jsonb_build_object('category', 'Measurement', 'note', 'No harvest or water-use numbers were recorded, so the benefits are quoted from research, not measured here.')
  ),
  '[]'::jsonb, 'too_early', 0,
  'Fixing something that already exists can be a strong project: it needs less money and gives a clear before and after. Ask the staff who look after the space to be partners. Add a monitoring plan (water quality, harvest weight, fish health) at the start so the next cohort can show results, not just a restored system.',
  jsonb_build_array(jsonb_build_object('name', 'Aquaponics tanks, bamboo plant beds and pipes', 'kind', 'facility'), jsonb_build_object('name', 'Replacement fish and plants', 'kind', 'material')),
  jsonb_build_array('Student lead (Quest 2024)', 'School maintenance team', 'Quest teachers'),
  'school', false, 'draft'
from public.organisations o
where o.name = 'Green School, Bali'
  and not exists (select 1 from public.records r where r.org_id = o.id and r.title = 'Restoring Aquaponics: bringing a neglected fish-and-plant system back to life');
