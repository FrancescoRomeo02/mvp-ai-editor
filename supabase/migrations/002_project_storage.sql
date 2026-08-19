-- Project-scoped private Storage buckets and file-tree metadata.
-- Bucket ids intentionally equal project ids so a bucket can be provisioned
-- server-side without exposing the service-role key to the browser.

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  parent_id uuid references public.project_files(id) on delete cascade,
  kind text not null check (kind in ('file', 'folder')),
  label text not null check (length(btrim(label)) > 0),
  storage_path text,
  mime_type text,
  byte_size bigint not null default 0 check (byte_size >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint project_files_storage_path_for_files check (
    (kind = 'file' and storage_path is not null) or (kind = 'folder' and storage_path is null)
  )
);

create index if not exists project_files_project_id_idx on public.project_files(project_id);
create index if not exists project_files_parent_id_idx on public.project_files(parent_id);
create unique index if not exists project_files_sibling_label_idx on public.project_files(project_id, parent_id, label);

alter table public.project_files enable row level security;

drop policy if exists "users read own project files" on public.project_files;
create policy "users read own project files" on public.project_files
for select to authenticated
using (exists (select 1 from public.projects p where p.id = project_files.project_id and p.owner_user_id = auth.uid()));

drop policy if exists "users create own project files" on public.project_files;
create policy "users create own project files" on public.project_files
for insert to authenticated
with check (exists (select 1 from public.projects p where p.id = project_files.project_id and p.owner_user_id = auth.uid()));

drop policy if exists "users update own project files" on public.project_files;
create policy "users update own project files" on public.project_files
for update to authenticated
using (exists (select 1 from public.projects p where p.id = project_files.project_id and p.owner_user_id = auth.uid()))
with check (exists (select 1 from public.projects p where p.id = project_files.project_id and p.owner_user_id = auth.uid()));

drop policy if exists "users delete own project files" on public.project_files;
create policy "users delete own project files" on public.project_files
for delete to authenticated
using (exists (select 1 from public.projects p where p.id = project_files.project_id and p.owner_user_id = auth.uid()));

create or replace function public.set_project_file_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = timezone('utc', now()); return new; end;
$$;
drop trigger if exists project_files_updated_at on public.project_files;
create trigger project_files_updated_at before update on public.project_files for each row execute function public.set_project_file_updated_at();

-- Storage remains private. The Worker creates buckets with id = project UUID.
drop policy if exists "project owners read storage buckets" on storage.buckets;
create policy "project owners read storage buckets" on storage.buckets
for select to authenticated
using (exists (select 1 from public.projects p where p.id::text = storage.buckets.id and p.owner_user_id = auth.uid()));

drop policy if exists "project owners read storage objects" on storage.objects;
create policy "project owners read storage objects" on storage.objects
for select to authenticated
using (exists (select 1 from public.projects p where p.id::text = storage.objects.bucket_id and p.owner_user_id = auth.uid()));

drop policy if exists "project owners upload storage objects" on storage.objects;
create policy "project owners upload storage objects" on storage.objects
for insert to authenticated
with check (exists (select 1 from public.projects p where p.id::text = storage.objects.bucket_id and p.owner_user_id = auth.uid()));

drop policy if exists "project owners update storage objects" on storage.objects;
create policy "project owners update storage objects" on storage.objects
for update to authenticated
using (exists (select 1 from public.projects p where p.id::text = storage.objects.bucket_id and p.owner_user_id = auth.uid()))
with check (exists (select 1 from public.projects p where p.id::text = storage.objects.bucket_id and p.owner_user_id = auth.uid()));

drop policy if exists "project owners delete storage objects" on storage.objects;
create policy "project owners delete storage objects" on storage.objects
for delete to authenticated
using (exists (select 1 from public.projects p where p.id::text = storage.objects.bucket_id and p.owner_user_id = auth.uid()));
