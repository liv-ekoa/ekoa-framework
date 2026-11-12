-- A teacher can offer a clause from their school's policy to the shared Ekoa clause library. The offer
-- is private to the school until an Ekoa steward reads it and accepts it; only stewards write the library.
create table public.clause_offers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  policy_id uuid references public.policies (id) on delete set null,
  section text not null check (length(trim(section)) between 1 and 80),
  title text not null check (length(trim(title)) between 1 and 160),
  body text not null check (length(trim(body)) between 20 and 4000),
  note text not null default '',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  offered_by uuid references public.people (id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index on public.clause_offers (org_id, created_at desc);
alter table public.clause_offers enable row level security;

create policy clause_offers_read on public.clause_offers for select to authenticated using (public.has_role(org_id, array['faculty_liaison']) or public.is_steward());
create policy clause_offers_insert on public.clause_offers for insert to authenticated with check (public.has_role(org_id, array['faculty_liaison']));
create policy clause_offers_review on public.clause_offers for update to authenticated using (public.is_steward()) with check (public.is_steward());

-- Offers always start pending and record who made them.
create or replace function public.stamp_clause_offer() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin_context() then
    new.status := 'pending';
    new.reviewed_at := null;
    new.offered_by := public.active_person_id();
  end if;
  return new;
end $$;
create trigger clause_offer_stamp before insert on public.clause_offers for each row execute function public.stamp_clause_offer();

-- A steward accepts an offer: it becomes a clause in the shared library, credited to the school.
create or replace function public.accept_clause_offer(p_offer uuid) returns void
language plpgsql security definer set search_path = public as $$
declare o clause_offers;
begin
  if not public.is_steward() then raise exception 'Only an Ekoa steward can accept a clause offer.'; end if;
  select * into o from clause_offers where id = p_offer and status = 'pending';
  if not found then raise exception 'That offer is not waiting for review.'; end if;
  insert into policy_clauses (section, title, body, source_org_id) values (o.section, o.title, o.body, o.org_id);
  update clause_offers set status = 'accepted', reviewed_at = now() where id = p_offer;
end $$;
revoke execute on function public.accept_clause_offer(uuid) from public, anon;
grant execute on function public.accept_clause_offer(uuid) to authenticated;
