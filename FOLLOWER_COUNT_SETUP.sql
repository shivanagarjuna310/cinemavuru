-- FOLLOWER_COUNT_SETUP.sql
--
-- Run once in the Supabase SQL editor. Idempotent: safe to re-run.
--
-- profiles.follower_count exists but nothing ever wrote to it. Measured on
-- 2026-09-26: 53 rows in `follows` across 25 creators (best-followed had 8),
-- and follower_count read 0 for every single profile.
--
-- Nothing on the site is broken by this today, because /leaderboard and the
-- creator page both count `follows` directly rather than trust the column.
-- That is a deliberate workaround, not the end state — counting a growing
-- table on every render is the thing this column was added to avoid. Once the
-- trigger below is in place, those two call sites can switch back to reading
-- the column.

create or replace function public.sync_follower_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.profiles set follower_count = coalesce(follower_count, 0) + 1
      where id = new.creator_id;
  elsif (tg_op = 'DELETE') then
    update public.profiles set follower_count = greatest(coalesce(follower_count, 0) - 1, 0)
      where id = old.creator_id;
  end if;
  return null;
end;
$$;

drop trigger if exists follows_sync_count on public.follows;
create trigger follows_sync_count
  after insert or delete on public.follows
  for each row execute function public.sync_follower_count();

-- Backfill from the source of truth.
update public.profiles p
   set follower_count = coalesce(f.n, 0)
  from (select creator_id, count(*)::int as n from public.follows group by creator_id) f
 where p.id = f.creator_id
   and p.follower_count is distinct from f.n;

-- Anyone with no rows in `follows` must read 0, not null and not a stale count.
update public.profiles
   set follower_count = 0
 where follower_count is null
    or (follower_count > 0
        and id not in (select creator_id from public.follows));
