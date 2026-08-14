// Supabase-backed "My List" watchlist — per-user, persisted in the database
// (the `watchlist` table). No local storage. Requires the one-time migration:
//
//   create table if not exists public.watchlist (
//     user_id uuid not null references auth.users(id) on delete cascade,
//     film_id uuid not null references public.films(id) on delete cascade,
//     created_at timestamptz not null default now(),
//     primary key (user_id, film_id)
//   );
//   alter table public.watchlist enable row level security;
//   create policy "watchlist select own" on public.watchlist for select to authenticated using (auth.uid() = user_id);
//   create policy "watchlist insert own" on public.watchlist for insert to authenticated with check (auth.uid() = user_id);
//   create policy "watchlist delete own" on public.watchlist for delete to authenticated using (auth.uid() = user_id);

export const WATCHLIST_EVENT = 'cv-watchlist'

export function notifyWatchlistChange() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(WATCHLIST_EVENT))
}
