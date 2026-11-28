-- ROW.GG email verification challenges
-- Run this in Supabase Dashboard > SQL Editor.
create table if not exists public.rowgg_verification_challenges (
  id uuid primary key,
  email text not null,
  user_id uuid not null,
  purpose text not null check (purpose in ('login','settings:username','settings:password')),
  code_hash text not null,
  access_token text,
  refresh_token text,
  attempts integer not null default 0 check (attempts between 0 and 5),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists rowgg_verification_challenges_email_created_idx
  on public.rowgg_verification_challenges (email, created_at desc);

alter table public.rowgg_verification_challenges enable row level security;
revoke all on public.rowgg_verification_challenges from anon, authenticated;
grant all on public.rowgg_verification_challenges to service_role;

-- Profile changes must go through the verification Edge Function.
-- Service-role operations (including trusted OAuth callbacks) remain permitted.
revoke update on public.profiles from authenticated;

-- Old/expired challenge cleanup (safe to run repeatedly).
delete from public.rowgg_verification_challenges
where expires_at < now() - interval '1 day';
