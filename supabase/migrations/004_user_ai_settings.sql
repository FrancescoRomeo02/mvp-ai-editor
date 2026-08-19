create table if not exists public.user_ai_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null default 'cloudflare' check (provider in ('cloudflare', 'groq', 'openai')),
  groq_key_ciphertext text,
  openai_key_ciphertext text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.user_ai_settings enable row level security;

drop policy if exists "users read own ai settings" on public.user_ai_settings;
create policy "users read own ai settings" on public.user_ai_settings for select to authenticated using (user_id = auth.uid());

create or replace function public.set_user_ai_settings_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = timezone('utc', now()); return new; end;
$$;

drop trigger if exists user_ai_settings_updated_at on public.user_ai_settings;
create trigger user_ai_settings_updated_at before update on public.user_ai_settings
for each row execute function public.set_user_ai_settings_updated_at();
