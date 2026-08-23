-- ════════════════════════════════════════════════════════════════════════
--  CinemaVuru — Disk IO remediation
--
--  This file is deliberately almost empty. An earlier draft added 14 indexes
--  and tightened autovacuum; measuring the database proved BOTH would have
--  made the Disk IO problem WORSE. What the data showed:
--
--    • Cache hit ratio 1.0000, with SIX total disk reads ever.
--      => There is no read IO to optimise. Indexes cannot help.
--    • All IO is writes (dirtied blocks), so every extra index is pure cost:
--      it must be maintained on each INSERT/UPDATE to the hot tables.
--    • 13 of the 14 proposed indexes ALREADY EXIST under different names
--      (idx_likes_film, idx_comments_film, films_pkey, film_views_pkey, ...).
--      `create index if not exists` matches on NAME, not definition, so it
--      would have happily created 13 redundant duplicates.
--    • Tightening autovacuum makes vacuum run MORE often = more write IO.
--      films currently sits at 41 dead / 83 live with 13 autovacuums — fine.
--    • Retention deletes were pointless: logs has 436 rows, error_logs 14.
--      DELETE is itself a write.
--
--  Measured top IO consumers (pg_stat_statements, by blocks dirtied):
--    9,580  increment_view() RPC          6,032 calls   364s   <-- #1
--    8,445  Realtime publication queries  5,399 calls   335s   <-- #2
--    6,606  auth refresh_tokens UPDATE      983 calls          (Supabase Auth)
--
--  #2 is fixed in application code, not here: FilmActions.tsx subscribed to
--  `likes`, which is not in the supabase_realtime publication, so it could
--  never receive an event yet still churned realtime.subscription on every
--  film page view. That subscription is now removed.
--
--  #1 is addressed below.
-- ════════════════════════════════════════════════════════════════════════


-- ── The one genuinely missing index ─────────────────────────────────────
-- films is filtered by creator_id in MyFilms, the creator page, and
-- CreatorBell, and no existing index covers it. films takes only 219 inserts
-- total, so the write cost is negligible.
-- (view_count is deliberately NOT indexed: it is UPDATEd on every view, and
--  indexing it would break HOT updates on the hottest path in the app.)
create index if not exists films_creator_idx on public.films (creator_id);


-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ THE ACTUAL FIX — halves the #1 IO consumer. YOUR CALL.               ║
-- ╚══════════════════════════════════════════════════════════════════════╝
--
-- increment_view() currently does:
--     INSERT INTO film_views ...                    -- unique per viewer/day
--     IF inserted THEN UPDATE films SET view_count = view_count + 1
--
-- That UPDATE ran 4,506 times against a table of 83 live rows. Every one
-- leaves a dead row version in a table that is read on every page load, plus
-- WAL, plus the autovacuum work to clean up after it. Dropping it removes
-- roughly half the write IO of the single most expensive statement you have.
--
-- TRADE-OFF: view counts become hourly instead of instant. film_views stays
-- the source of truth, so no data is lost and nothing is irreversible.
--
-- To apply, run everything below this line.

-- 1. Recompute counts from the source table, touching only rows that changed.
-- create or replace function public.sync_view_counts()
-- returns void language sql security definer as $$
--   update public.films f
--      set view_count = v.n
--     from (select film_id, count(*) as n from public.film_views group by film_id) v
--    where v.film_id = f.id
--      and f.view_count is distinct from v.n;
-- $$;

-- 2. Make the view path a single INSERT — no counter UPDATE.
--    (Same signature and behaviour as the current function, minus the UPDATE.)
-- create or replace function public.increment_view(p_film_id uuid, p_viewer_key text)
-- returns void language plpgsql security definer as $$
-- begin
--   insert into film_views (film_id, viewer_key, viewed_date)
--   values (p_film_id, p_viewer_key, current_date);
-- exception when unique_violation then
--   return;   -- already counted for this viewer today
-- end;
-- $$;

-- 3. Keep the displayed counts fresh, hourly.
-- select cron.schedule('sync-view-counts', '0 * * * *',
--                      $$select public.sync_view_counts()$$);

-- 4. Backfill once now so counts are correct immediately.
-- select public.sync_view_counts();
