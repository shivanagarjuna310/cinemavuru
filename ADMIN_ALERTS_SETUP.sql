-- ════════════════════════════════════════════════════════════════════════
--  CinemaVuru — admin alert emails
--  Run once in the Supabase SQL editor.
--
--  Part 1 is required (dedupe).
--  Part 2 is optional but recommended: it makes the "new film awaiting
--  review" email fire from Postgres itself, so it can't be lost if the
--  uploader's tab closes mid-request.
-- ════════════════════════════════════════════════════════════════════════

-- ── Part 1: dedupe claims ───────────────────────────────────────────────
-- One row per alert already sent. The uploader's browser AND the INSERT
-- webhook both try to announce a new film; the primary key decides which one
-- wins, so admins get exactly one email. Tiny table: ~40 bytes per upload.

create table if not exists public.admin_notify_claims (
  key        text primary key,
  created_at timestamptz not null default now()
);

-- Written only by the server (service role bypasses RLS). Enable RLS with no
-- public policies so clients can neither read it nor block an alert.
alter table public.admin_notify_claims enable row level security;

-- Keeps the table from growing forever on the free tier — claims older than
-- 90 days are useless (the film has long since been reviewed).
-- Re-run this line any time, or wire it into a maintenance job.
delete from public.admin_notify_claims where created_at < now() - interval '90 days';

-- Same idea for email_logs, which now gets one row per admin per alert. On the
-- Supabase free tier (500 MB) this is negligible, but it grows forever — run
-- this occasionally to keep it tidy. 90 days is plenty of audit history.
delete from public.email_logs where created_at < now() - interval '90 days';


-- ── Part 2: fire the alert from the database ────────────────────────────
-- EASIEST PATH — use the dashboard instead of this SQL:
--   Database → Webhooks → "Create a new hook"
--     Name:       films_pending_admin_alert
--     Table:      public.films
--     Events:     Insert
--     Type:       HTTP Request
--     Method:     POST
--     URL:        https://www.cinemavuru.com/api/webhooks/film-created
--     HTTP Headers:
--       Content-Type:     application/json
--       x-webhook-secret: <the same value as SUPABASE_WEBHOOK_SECRET in Vercel>
--
-- The route ignores anything that isn't an INSERT of a film with
-- status = 'pending', so the extra calls cost nothing.
--
-- SQL equivalent (needs the pg_net / supabase_functions extension that
-- Database Webhooks install — use the dashboard once first if this errors).
-- Replace BOTH placeholders before running.

-- drop trigger if exists films_pending_admin_alert on public.films;
--
-- create trigger films_pending_admin_alert
--   after insert on public.films
--   for each row
--   execute function supabase_functions.http_request(
--     'https://www.cinemavuru.com/api/webhooks/film-created',
--     'POST',
--     '{"Content-Type":"application/json","x-webhook-secret":"REPLACE_WITH_SUPABASE_WEBHOOK_SECRET"}',
--     '{}',
--     '5000'
--   );


-- ── Verify ──────────────────────────────────────────────────────────────
-- After an upload, both of these should show the alert:
--   select * from public.admin_notify_claims order by created_at desc limit 5;
--   select kind, to_email, status, created_at from public.email_logs
--     where kind = 'admin:film_pending' order by created_at desc limit 10;
