create table if not exists public.promo_codes (
  code text primary key check (code = upper(btrim(code))),
  bonus_credits integer not null check (bonus_credits > 0 and bonus_credits <= 1000),
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  redemption_count integer not null default 0 check (redemption_count >= 0),
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_ai_credits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  bonus_credits integer not null default 0 check (bonus_credits >= 0),
  promo_code text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.promo_codes enable row level security;
alter table public.user_ai_credits enable row level security;

drop policy if exists "users read own ai credits" on public.user_ai_credits;
create policy "users read own ai credits" on public.user_ai_credits for select to authenticated using (user_id = auth.uid());

create or replace function public.grant_signup_promo_credits()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  requested_code text := upper(btrim(coalesce(new.raw_user_meta_data ->> 'promo_code', '')));
  granted_credits integer := 0;
begin
  if requested_code <> '' then
    update public.promo_codes
    set redemption_count = redemption_count + 1
    where code = requested_code and active = true
      and (max_redemptions is null or redemption_count < max_redemptions)
    returning bonus_credits into granted_credits;
  end if;

  insert into public.user_ai_credits(user_id, bonus_credits, promo_code)
  values (new.id, coalesce(granted_credits, 0), nullif(requested_code, ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_grant_promo on auth.users;
create trigger on_auth_user_created_grant_promo after insert on auth.users
for each row execute function public.grant_signup_promo_credits();

-- Example campaign setup:
-- insert into public.promo_codes(code, bonus_credits, max_redemptions)
-- values ('WELCOME10', 10, 100);
