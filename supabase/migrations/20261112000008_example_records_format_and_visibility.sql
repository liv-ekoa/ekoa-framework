-- Brings the 12 example records written from public Green School Bali talks into the Ekoa record format,
-- and shares them with every signed-in member so the Library is never empty.
--   * adds key_result (one line shown on the record tag) and example_source (marks a record as an example)
--   * maps obstacle categories to the fixed Ekoa obstacle keys
--   * removes the one student first name that had been listed in contributors (contributors are listed by role)
--   * fills the climate so the "similar context" ranking and climate filter work
--   * publishes the examples to the network, school name hidden, with no student named
-- The examples stay at tier 0 (self-reported) and do not enter the leaderboard.
-- Safe to re-run. Does nothing if the school is not in the database.

alter table public.records add column if not exists key_result text not null default '';
alter table public.records add column if not exists example_source text;

drop table if exists example_results;
create temporary table example_results (title text primary key, key_result text not null);
insert into example_results (title, key_result) values
  ('Fungi Filters: mushroom mycelium to catch microplastics in a Bali river', '25 to 5 to 0 microplastic pieces per 20 ml (start, 1 hour, 24 hours). One trial.'),
  ('Waste to Worth: stuffed toys made from discarded fabric', '15 toys sewn from scrap and donated to an orphanage'),
  ('Giving Nets a New Life: recycling broken fishing nets into carabiners', '12+ kg of ghost nets collected and melted into carabiners'),
  ('Surf Life: upcycling old surfboard fins into home decor', '1 of 5 planned pieces finished, about 22 hours each'),
  ('Eco Gym Equipment: dumbbells from beach plastic, sand and bio-epoxy', 'Final pair of 1.9 kg and 1.7 kg, donated to a village exercise class'),
  ('Clean Energy Cards: a card game that teaches children about renewable energy', '10 packs sold at one market; profits donated. Learning not measured.'),
  ('Restoring Aquaponics: bringing a neglected fish-and-plant system back to life', 'System cleared, repaired and restocked. Harvest not measured.'),
  ('Regenerating the Orchid Path: two failed projects, then a community planting', 'Path drained, stepped, planted and blessed with 10+ neighbours'),
  ('Passion for Good: coral planting days and sturdier reef structures', '400 corals replanted by 26 people in one day'),
  ('A rubbish-sorting machine that uses image recognition', 'Working conveyor-belt sorter with an image-recognition model'),
  ('H2O On The Go: building a hydrogen-oxygen cell to help a motorbike engine', '200 ml of gas a minute from version 5. No fuel saving shown.'),
  ('Powdered shampoo: cutting plastic bottles and shipped water', '15 million rupiah raised for a river-cleaning charity');

-- 1. Contributors by role only, never a student's name.
update public.records r
set contributors = jsonb_set(r.contributors, '{0}', '"Student lead (Quest 2023)"')
from public.organisations o
where o.id = r.org_id and o.name = 'Green School, Bali'
  and r.title = 'Fungi Filters: mushroom mycelium to catch microplastics in a Bali river'
  and r.contributors->>0 not like 'Student lead%';

-- 2. Obstacle categories to the fixed Ekoa keys (anything already a key is left alone).
update public.records r
set obstacles = (
  select coalesce(jsonb_agg(
    jsonb_build_object('category',
      case x.o->>'category'
        when 'Approval' then 'approval' when 'Oversight' then 'approval'
        when 'Cost' then 'budget'
        when 'Measurement' then 'monitoring'
        when 'Safety' then 'safety'
        when 'Supply' then 'vendor' when 'Supplier' then 'vendor'
        when 'Time' then 'time' when 'Planning' then 'time' when 'Scale' then 'time'
        when 'Technical' then 'technical' when 'Quality' then 'technical' when 'Design' then 'technical'
        when 'Demo' then 'technical' when 'Equipment' then 'technical'
        when 'Skills' then 'skills' when 'Language' then 'skills'
        else x.o->>'category'
      end,
      'note', x.o->>'note') order by x.ord), '[]'::jsonb)
  from jsonb_array_elements(r.obstacles) with ordinality as x(o, ord)
)
from public.organisations o
where o.id = r.org_id and o.name = 'Green School, Bali'
  and r.title in (select title from example_results);

-- 3. Key result, climate, source and sharing with the network.
update public.records r
set key_result = e.key_result,
    context = r.context || jsonb_build_object('climate_zone', 'Tropical'),
    example_source = 'a public Green School Bali student talk (' || regexp_replace(coalesce(r.contributors->>0, ''), '^Student lead \((.*)\)$', '\1') || ')',
    anonymised = true,
    visibility = 'network',
    status = 'published',
    published_at = coalesce(r.published_at, now())
from example_results e, public.organisations o
where r.title = e.title and o.id = r.org_id and o.name = 'Green School, Bali';

drop table example_results;
