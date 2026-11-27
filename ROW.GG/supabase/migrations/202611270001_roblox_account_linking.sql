-- Roblox account linking for ROW.GG
alter table public.profiles
  add column if not exists roblox_user_id text,
  add column if not exists roblox_username text,
  add column if not exists roblox_avatar_url text;

create unique index if not exists profiles_roblox_user_id_unique
  on public.profiles (roblox_user_id)
  where roblox_user_id is not null;

create table if not exists public.roblox_oauth_states (
  id uuid primary key default gen_random_uuid(),
  state text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  code_verifier text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.roblox_oauth_states enable row level security;
revoke all on public.roblox_oauth_states from anon, authenticated;
