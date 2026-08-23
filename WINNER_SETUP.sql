-- ════════════════════════════════════════════════════════════════════════
--  CinemaVuru — Monthly Winner spotlight
--  Run once in the Supabase SQL editor.
-- ════════════════════════════════════════════════════════════════════════

-- 1. Winner records (only one is_active at a time is featured on the homepage).
create table if not exists public.monthly_winners (
  id           uuid primary key default gen_random_uuid(),
  month        text,                    -- display label, e.g. "August 2026"
  winner_name  text not null,
  film_title   text,
  film_id      uuid references public.films(id) on delete set null,  -- optional link
  image_url    text not null,           -- uploaded photo (Storage public URL)
  blurb        text,                    -- short quote / description
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

alter table public.monthly_winners enable row level security;

drop policy if exists "winners public read"  on public.monthly_winners;
drop policy if exists "winners admin write"   on public.monthly_winners;

-- Anyone can read (homepage). Only admins can write.
create policy "winners public read" on public.monthly_winners for select using (true);
create policy "winners admin write" on public.monthly_winners for all
  using      (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- 2. Public storage bucket for the winner photos.
insert into storage.buckets (id, name, public)
values ('winners', 'winners', true)
on conflict (id) do nothing;

drop policy if exists "winners img public read"  on storage.objects;
drop policy if exists "winners img admin insert" on storage.objects;
drop policy if exists "winners img admin update" on storage.objects;
drop policy if exists "winners img admin delete" on storage.objects;

create policy "winners img public read" on storage.objects for select
  using (bucket_id = 'winners');
create policy "winners img admin insert" on storage.objects for insert
  with check (bucket_id = 'winners' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "winners img admin update" on storage.objects for update
  using (bucket_id = 'winners' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "winners img admin delete" on storage.objects for delete
  using (bucket_id = 'winners' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
