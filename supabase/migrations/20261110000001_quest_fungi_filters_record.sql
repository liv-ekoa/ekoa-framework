-- Adds a draft Implementation Record for the "Fungi Filters" Quest 2023 project at Green School, Bali.
-- Source: the student's Quest presentation (Green School Bali, YouTube, 20 Sep 2023).
-- Stays a DRAFT with school-only visibility until the student and guardian confirm it can be published.
-- Safe to re-run: skips if a record with this title already exists for the school.
insert into public.records (
  org_id, title, summary, category, context, problem, intervention, timeline,
  budget_summary, budget_currency, obstacles, outcomes, outcome_class, tier,
  lessons, materials, contributors, visibility, anonymised, status
)
select
  o.id,
  'Fungi Filters: mushroom mycelium to catch microplastics in a Bali river',
  'A student tested whether burlap bags of coffee grounds, wood chips and mushroom mycelium could filter microplastics from a river. In one small trial, a sample held about 25 pieces of microplastic per 20 ml; the filter cut this to 5 pieces at one hour and 0 at 24 hours. One trial, so too early to call it proven.',
  'Water',
  jsonb_build_object('country', 'Indonesia', 'city', 'Badung, Bali', 'descriptor', 'Student-led Quest project at a school beside a river, with tourism-driven plastic pollution', 'budget_band', 'low'),
  'Rivers in Bali carry plastic from tourism and local waste into the sea, and microplastics are too small to catch with nets or clean-ups. Tourists produce roughly 1.7 kg of plastic a day against 0.5 kg for residents, and about 33,000 tonnes of plastic enter the sea each year.',
  'Built low-cost filters from reused coffee burlap bags filled with cafe coffee grounds, wood chips from a local wood carver and mycelium spawn (mushroom seed). The bags were left about two months for the mycelium to grow. After the local banjar (village council) gave permission, river water was sampled and tested for microplastics in the school science lab. A second design placed two filters a metre or two apart in a shallow part of the river, so their results could be compared.',
  'About two months to grow the mycelium; first river test two weeks before Quest day; redesigned test a few days later; 24-hour result presented at Quest, September 2023.',
  'Materials were reused or donated (coffee grounds, wood chips, burlap bags). Mycelium spawn was the only bought item. No costs were recorded, so no figure is given.',
  'USD',
  jsonb_build_array(
    jsonb_build_object('category', 'Technical', 'note', 'First test failed: the filter was submerged, the wood chips floated and washed out of the bags. Redesigned as two filters in a shallower stretch of river.'),
    jsonb_build_object('category', 'Time', 'note', 'Mycelium took about two months to grow, which limited how many trials fit before Quest day.'),
    jsonb_build_object('category', 'Approval', 'note', 'Needed the local banjar to agree before sampling in the river. Permission was given by email, and nearby residents were supportive.')
  ),
  '[]'::jsonb,
  'too_early',
  0,
  'Good solutions are not always fast ones: growing mycelium takes weeks, so plan the timeline around it. Wood floats, so test the filter in the water early and have a backup design. Ask the community first, since the banjar and neighbours backed the work. Treat the result as a promising start: one river, one sample and no repeat trial. Next steps are repeat trials, a control, and checking whether the filter itself sheds plastic or fungi into the water.',
  jsonb_build_array(
    jsonb_build_object('name', 'Reused coffee burlap bags', 'kind', 'material'),
    jsonb_build_object('name', 'Coffee grounds from a local cafe', 'kind', 'material'),
    jsonb_build_object('name', 'Wood chips from a local wood carver', 'kind', 'material'),
    jsonb_build_object('name', 'Mycelium spawn', 'kind', 'material'),
    jsonb_build_object('name', 'School science lab (microplastic counts)', 'kind', 'facility')
  ),
  jsonb_build_array('Olivia (student lead)', 'Green School Bali teachers and speech mentor', 'Local banjar'),
  'school',
  false,
  'draft'
from public.organisations o
where o.name = 'Green School, Bali'
  and not exists (
    select 1 from public.records r
    where r.org_id = o.id and r.title = 'Fungi Filters: mushroom mycelium to catch microplastics in a Bali river'
  );
