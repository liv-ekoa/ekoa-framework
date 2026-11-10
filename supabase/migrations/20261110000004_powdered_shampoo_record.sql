-- Adds one more draft example Implementation Record from a public Green School Bali Quest 2025 presentation.
-- DRAFT, school-only, names no student. Publish only after the student and guardian agree.
-- Safe to re-run: skips if a record with this title already exists for the school.
insert into public.records (org_id, title, summary, category, context, problem, intervention, timeline, budget_summary, budget_currency, obstacles, outcomes, outcome_class, tier, lessons, materials, contributors, visibility, anonymised, status)
select o.id,
  'Powdered shampoo: cutting plastic bottles and shipped water',
  'A student made a natural powdered shampoo that is mixed with water at home, which removes the plastic bottle and the weight of water that is normally shipped. After failed preservative and texture tests she sold it at school and festival events, raising her 15 million rupiah goal for a river-cleaning charity, and met a possible hotel distributor.',
  'Waste',
  jsonb_build_object('country', 'Indonesia', 'city', 'Badung, Bali', 'descriptor', 'Student-led Quest project selling at school markets and festivals', 'budget_band', 'low'),
  'Shampoo bottles were a large part of the plastic the student''s family found on a beach clean-up. Most shampoos are 75 to 85 percent water, which adds weight and shipping emissions, and many contain ingredients the student could not recognise.',
  'Developed a natural powder shampoo that is shaken with water in a bottle before use. Tested it with friends, looked for a natural preservative, sourced ingredients and made stickers, shirts and posters. Sold it at school Friday markets, a festival and other events, and gave the proceeds to a river-protection charity.',
  'Started later than planned; preservative and texture redone before sales at school events; presented at Quest 2025.',
  'Raised 15 million rupiah in sales for the charity. Costs of ingredients and printing were not stated.',
  'IDR',
  jsonb_build_array(
    jsonb_build_object('category', 'Technical', 'note', 'The first natural preservative was not good enough, and the first powder consistency was not good enough either. Both had to be reworked.'),
    jsonb_build_object('category', 'Supply', 'note', 'Sourcing natural ingredients and printing stickers, shirts, logos and posters took time.'),
    jsonb_build_object('category', 'Planning', 'note', 'The student started later than planned, against her parents'' advice, and had to rewrite her whole presentation from scratch.')
  ),
  '[]'::jsonb, 'partly', 0,
  'Test shelf life and texture before you sell: both failed on the first try. Friends are useful testers, so ask them for honest feedback. Selling at events gave real customers and a fundraising total. A hotel owner offered to distribute it, so keep contact details at your stand. The savings from dropping the bottle and shipped water were described but not measured, so weigh a bottle and a powder pack next time and compare.',
  jsonb_build_array(jsonb_build_object('name', 'Natural powder shampoo ingredients', 'kind', 'material'), jsonb_build_object('name', 'Reusable bottles, stickers and posters', 'kind', 'material')),
  jsonb_build_array('Student lead (Quest 2025)', 'Hairdresser mentor', 'Student testers', 'Quest advisers'),
  'school', false, 'draft'
from public.organisations o
where o.name = 'Green School, Bali'
  and not exists (select 1 from public.records r where r.org_id = o.id and r.title = 'Powdered shampoo: cutting plastic bottles and shipped water');
