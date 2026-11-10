-- Policies that members add to the Library. A submission stays hidden until a steward approves it;
-- only approved ones reach the public view. The submitter's identity is never exposed publicly.
create table public.library_policies (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 120),
  school_name text not null check (char_length(school_name) between 2 and 120),
  topic text not null check (char_length(topic) between 2 and 40),
  category text not null check (category in ('Waste', 'Energy', 'Water', 'Food', 'Biodiversity', 'Policy & governance')),
  summary text not null check (char_length(summary) between 20 and 600),
  url text not null check (char_length(url) <= 500 and url ~* '^https://[^[:space:]]+$'),
  submitted_by uuid not null references public.people (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.people (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index library_policies_status_idx on public.library_policies (status, created_at desc);
alter table public.library_policies enable row level security;

-- Submissions always start pending and are always attributed to the signed-in person. Reviews are
-- stamped with the reviewing steward. A person can have at most 10 submissions waiting.
create or replace function public.guard_library_policy() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin_context() then return new; end if;
  if tg_op = 'INSERT' then
    new.submitted_by := public.active_person_id();
    new.status := 'pending';
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.created_at := now();
    if (select count(*) from library_policies where submitted_by = new.submitted_by and status = 'pending') >= 10 then
      raise exception 'You already have 10 policies waiting for review.';
    end if;
  else
    new.submitted_by := old.submitted_by;
    new.created_at := old.created_at;
    if new.status is distinct from old.status then
      new.reviewed_by := public.active_person_id();
      new.reviewed_at := now();
    end if;
  end if;
  return new;
end $$;
create trigger library_policy_guard before insert or update on public.library_policies for each row execute function public.guard_library_policy();
revoke execute on function public.guard_library_policy() from public, anon, authenticated;

create policy lp_insert on public.library_policies for insert to authenticated with check (public.in_network() and submitted_by = public.active_person_id());
create policy lp_read on public.library_policies for select to authenticated using (submitted_by = public.active_person_id() or public.is_steward());
create policy lp_update on public.library_policies for update to authenticated using (public.is_steward()) with check (public.is_steward());
create policy lp_delete on public.library_policies for delete to authenticated using (public.is_steward() or (submitted_by = public.active_person_id() and status = 'pending'));

revoke all on public.library_policies from public, anon, authenticated;
grant select, insert, update, delete on public.library_policies to authenticated;

-- Visitors read approved policies through this view, which leaves out who submitted them.
create or replace view public.public_policy_links as
select id, title, school_name, topic, category, summary, url, created_at
from public.library_policies
where status = 'approved';
revoke all on public.public_policy_links from public, anon, authenticated;
grant select on public.public_policy_links to anon, authenticated;
