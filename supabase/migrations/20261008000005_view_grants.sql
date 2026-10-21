-- Ekoa: the two public views are read-only.
-- They run with the owner's rights so visitors can see published records, which means a write
-- through them would skip row-level security. Supabase grants every new table and view full
-- rights to anon and authenticated by default, so take the write rights back explicitly.
revoke insert, update, delete, truncate, references, trigger on public.public_records, public.public_school_ranking from public, anon, authenticated;
grant select on public.public_records, public.public_school_ranking to anon, authenticated;
