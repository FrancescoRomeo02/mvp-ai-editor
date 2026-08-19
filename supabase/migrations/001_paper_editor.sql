create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists projects_owner_user_id_idx on public.projects(owner_user_id);
alter table public.projects enable row level security;

drop policy if exists "users read own projects" on public.projects;
create policy "users read own projects" on public.projects for select to authenticated using (owner_user_id = auth.uid());
drop policy if exists "users create own projects" on public.projects;
create policy "users create own projects" on public.projects for insert to authenticated with check (owner_user_id = auth.uid());
drop policy if exists "users update own projects" on public.projects;
create policy "users update own projects" on public.projects for update to authenticated using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
drop policy if exists "users delete own projects" on public.projects;
create policy "users delete own projects" on public.projects for delete to authenticated using (owner_user_id = auth.uid());

create or replace function public.set_project_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = timezone('utc', now()); return new; end;
$$;
drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at before update on public.projects for each row execute function public.set_project_updated_at();
