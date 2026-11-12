-- A school-only team chat for each project. Reuses the existing thread and post rules: only members of
-- the project's school (and stewards) can read it, teachers can read everything, and the same filter that
-- holds phone numbers and social handles screens every post. Nothing here is visible across schools.
alter table public.threads add column if not exists project_id uuid references public.projects (id) on delete cascade;
alter table public.threads drop constraint if exists threads_kind_check;
alter table public.threads add constraint threads_kind_check check (kind in ('circle', 'partner_request', 'twin', 'project'));
alter table public.threads drop constraint if exists threads_project_needs_school;
alter table public.threads add constraint threads_project_needs_school check (kind <> 'project' or (project_id is not null and org_id is not null));
create index if not exists threads_project_idx on public.threads (project_id);

-- A project thread must belong to the school that owns the project.
create or replace function public.guard_project_thread() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'project' and new.org_id is distinct from (select org_id from projects where id = new.project_id) then
    raise exception 'A project chat belongs to the school that owns the project.';
  end if;
  return new;
end $$;
drop trigger if exists project_thread_guard on public.threads;
create trigger project_thread_guard before insert on public.threads for each row execute function public.guard_project_thread();
