-- ════════════════════════════════════════════════════════════════════════
--  CinemaVuru — email logs (admin visibility into what was sent)
--  Run once in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.email_logs (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null,               -- milestone | test | film_uploaded | ...
  to_email    text not null,
  subject     text,
  film_id     uuid references public.films(id) on delete set null,
  creator_id  uuid,
  status      text not null default 'sent', -- sent | failed
  error       text,
  created_at  timestamptz not null default now()
);

alter table public.email_logs enable row level security;

drop policy if exists "email_logs admin read" on public.email_logs;

-- Written only by the server (service role bypasses RLS). Only admins can read.
create policy "email_logs admin read" on public.email_logs for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create index if not exists email_logs_created_idx on public.email_logs (created_at desc);
