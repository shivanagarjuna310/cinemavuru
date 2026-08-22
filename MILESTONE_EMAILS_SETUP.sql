-- ════════════════════════════════════════════════════════════════════════
--  CinemaVuru — milestone email engine
--  Run once in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════════════

-- Per-film state so we never announce the same milestone twice.
create table if not exists public.film_notify_state (
  film_id             uuid primary key references public.films(id) on delete cascade,
  last_view_milestone int not null default 0,
  last_like_milestone int not null default 0,
  last_boost_target   int,
  last_rank           int,
  last_sent_at        timestamptz,
  updated_at          timestamptz not null default now()
);

-- Written only by the server (service role, which bypasses RLS). Enable RLS
-- with no public policies so clients can't read/write it.
alter table public.film_notify_state enable row level security;

-- Email opt-out for creators (defaults to opted-in).
alter table public.profiles
  add column if not exists email_opt_in boolean not null default true;
