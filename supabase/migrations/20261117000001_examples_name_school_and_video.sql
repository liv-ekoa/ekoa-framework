-- Example records name the school they came from, and can link to the talk they were written from.
--   * adds source_url (a public video link, optional)
--   * example records show Green School Bali and the area, instead of "school name hidden"
--     (the school never asked to be hidden, and naming it gives the talks proper credit)
-- Students are still listed by role only. Run once as an admin (SQL editor or migration).

alter table public.records add column if not exists source_url text;

update public.records r
set anonymised = false,
    context = r.context || jsonb_build_object('city', 'Badung')
from public.organisations o
where o.id = r.org_id
  and o.name = 'Green School, Bali'
  and r.example_source is not null;
