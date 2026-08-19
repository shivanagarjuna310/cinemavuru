-- ════════════════════════════════════════════════════════════════════════
--  CinemaVuru — OTT features migration
--  Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
--  Safe to re-run: everything is guarded with IF NOT EXISTS / OR REPLACE.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. Continue Watching ────────────────────────────────────────────────
-- One row per (user, film): where they left off, so we can resume + show a
-- "Continue Watching" rail.
create table if not exists public.watch_progress (
  user_id      uuid        not null references auth.users(id) on delete cascade,
  film_id      uuid        not null references public.films(id) on delete cascade,
  position_sec int         not null default 0,
  duration_sec int,
  completed    boolean     not null default false,
  updated_at   timestamptz not null default now(),
  primary key (user_id, film_id)
);

alter table public.watch_progress enable row level security;

drop policy if exists "watch_progress own read"   on public.watch_progress;
drop policy if exists "watch_progress own insert" on public.watch_progress;
drop policy if exists "watch_progress own update" on public.watch_progress;
drop policy if exists "watch_progress own delete" on public.watch_progress;

create policy "watch_progress own read"   on public.watch_progress for select using (auth.uid() = user_id);
create policy "watch_progress own insert" on public.watch_progress for insert with check (auth.uid() = user_id);
create policy "watch_progress own update" on public.watch_progress for update using (auth.uid() = user_id);
create policy "watch_progress own delete" on public.watch_progress for delete using (auth.uid() = user_id);

create index if not exists watch_progress_user_updated_idx
  on public.watch_progress (user_id, updated_at desc);


-- ── 2. Personalization: preferred genres ────────────────────────────────
-- Chosen during onboarding; powers the "For You" rail.
alter table public.profiles
  add column if not exists preferred_genres text[] not null default '{}';


-- ── 3. Follow creators ──────────────────────────────────────────────────
create table if not exists public.follows (
  follower_id uuid        not null references auth.users(id)     on delete cascade,
  creator_id  uuid        not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, creator_id),
  check (follower_id <> creator_id)
);

alter table public.follows enable row level security;

drop policy if exists "follows public read"  on public.follows;
drop policy if exists "follows insert own"   on public.follows;
drop policy if exists "follows delete own"   on public.follows;

-- Follower/following counts are public.
create policy "follows public read" on public.follows for select using (true);
create policy "follows insert own"  on public.follows for insert with check (auth.uid() = follower_id);
create policy "follows delete own"  on public.follows for delete using (auth.uid() = follower_id);

create index if not exists follows_creator_idx on public.follows (creator_id);
create index if not exists follows_follower_idx on public.follows (follower_id);
