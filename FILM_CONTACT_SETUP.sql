-- FILM_CONTACT_SETUP.sql
-- Run once in Supabase → SQL Editor.
--
-- Adds a contact phone number for free film uploads.
--
-- WHY A SEPARATE TABLE, NOT A COLUMN ON films:
-- public.films is readable by anonymous visitors (every row, every column), so
-- a films.creator_phone column would publish every creator's phone number to
-- anyone holding the anon key — which ships in the client bundle by design.
-- Column-level GRANTs are not a workaround either: revoking SELECT on one
-- column makes `select=*` fail outright for anon, which several existing
-- queries rely on.
--
-- So the number lives here, readable only by admins, and joined in only where
-- an admin needs it.

create table if not exists public.film_contacts (
  film_id    uuid primary key references public.films(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  phone      text not null,
  created_at timestamptz not null default now()
);

create index if not exists film_contacts_user_idx on public.film_contacts (user_id);

alter table public.film_contacts enable row level security;

-- The uploader may record their own number, once, for their own film.
drop policy if exists "film_contacts insert own" on public.film_contacts;
create policy "film_contacts insert own"
  on public.film_contacts for insert to authenticated
  with check (auth.uid() = user_id);

-- The uploader may see and correct their own number.
drop policy if exists "film_contacts select own" on public.film_contacts;
create policy "film_contacts select own"
  on public.film_contacts for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "film_contacts update own" on public.film_contacts;
create policy "film_contacts update own"
  on public.film_contacts for update to authenticated
  using (auth.uid() = user_id);

-- Admins can read every number — that is the point of collecting it.
drop policy if exists "film_contacts select admin" on public.film_contacts;
create policy "film_contacts select admin"
  on public.film_contacts for select to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ));

-- Deliberately NO policy for anon: an unauthenticated visitor can read nothing.

-- Verify:
--   select count(*) from public.film_contacts;             -- as service role: works
--   -- with the anon key this must return zero rows, never a phone number.
