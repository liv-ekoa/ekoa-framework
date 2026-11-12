-- One place for everything a project makes: documents, slides, spreadsheets, PDFs and links to
-- shared documents. Files live in a private bucket in a folder named after the school, and only
-- members of that school (and stewards) can read them. Photos stay in Evidence, where location data
-- is stripped and people are checked for consent.
create table public.project_files (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 160),
  file_name text,
  file_type text,
  size_bytes bigint check (size_bytes is null or size_bytes between 0 and 26214400),
  storage_path text,
  link_url text check (link_url is null or link_url ~* '^https://[^ ]+$'),
  added_by uuid references public.people (id) on delete set null,
  created_at timestamptz not null default now(),
  check ((storage_path is not null) <> (link_url is not null))
);
create index on public.project_files (project_id, created_at desc);
alter table public.project_files enable row level security;

create policy project_files_read on public.project_files for select to authenticated using (public.is_member(org_id) or public.is_steward());
create policy project_files_insert on public.project_files for insert to authenticated with check (public.can_write(org_id));
create policy project_files_delete on public.project_files for delete to authenticated using (
  public.is_steward() or public.has_role(org_id, array['faculty_liaison']) or (added_by = public.active_person_id() and public.can_write(org_id))
);

-- The file must belong to the school that owns the project, and is stamped with who added it.
create or replace function public.guard_project_file() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.org_id is distinct from (select org_id from projects where id = new.project_id) then
    raise exception 'A project file belongs to the school that owns the project.';
  end if;
  if new.storage_path is not null and (storage.foldername(new.storage_path))[1] is distinct from new.org_id::text then
    raise exception 'The file must be stored in your school''s folder.';
  end if;
  if not public.is_admin_context() then new.added_by := public.active_person_id(); end if;
  return new;
end $$;
create trigger project_file_guard before insert on public.project_files for each row execute function public.guard_project_file();

-- Private bucket: documents only, 25 MB each.
insert into storage.buckets (id, name, public) values ('project-files', 'project-files', false) on conflict (id) do nothing;
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'storage' and table_name = 'buckets' and column_name = 'file_size_limit') then
    update storage.buckets set file_size_limit = 26214400, allowed_mime_types = array[
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.oasis.opendocument.text', 'application/vnd.oasis.opendocument.presentation', 'application/vnd.oasis.opendocument.spreadsheet',
      'text/csv', 'text/plain'] where id = 'project-files';
  end if;
end $$;

create policy project_files_objects_read on storage.objects for select to authenticated
  using (bucket_id = 'project-files' and (public.is_member(((storage.foldername(name))[1])::uuid) or public.is_steward()));
create policy project_files_objects_write on storage.objects for insert to authenticated
  with check (bucket_id = 'project-files' and public.can_write(((storage.foldername(name))[1])::uuid));
create policy project_files_objects_delete on storage.objects for delete to authenticated
  using (bucket_id = 'project-files' and (public.can_write(((storage.foldername(name))[1])::uuid) or public.is_steward()));
