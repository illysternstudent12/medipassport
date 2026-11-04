-- MediPassport backend schema (Supabase / Postgres).
-- Run once in the Supabase SQL editor (or `supabase db push`).
-- Every table is private to its owner via Row Level Security. Doctors never
-- query tables directly: they open shares through the share-open Edge
-- Function, which checks the token, code, expiry and revocation.

-- ------------------------------------------------------------------ profiles
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  traveler_key text not null,              -- which fictional demo traveler
  data jsonb not null,                     -- fictional profile (allergies, meds, …)
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------ insurance policies (simulated connections)
create table if not exists public.policies (
  user_id uuid primary key references auth.users (id) on delete cascade,
  provider text not null,
  plan text,
  policy_number text,
  valid_until text,
  status text,
  simulated boolean not null default true, -- no real insurer API is connected
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------ medical documents (files live in Storage)
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  kind text not null default 'upload',
  orig_lang text,                          -- detected or corrected by the patient
  storage_path text not null,              -- <user_id>/<uuid>-<name> in the private bucket
  mime text,
  size bigint,
  facts jsonb not null default '[]',       -- reviewed by the patient before saving
  text_excerpt text,
  extraction text,                         -- 'glossary' | 'ai' | 'manual'
  created_at timestamptz not null default now()
);
create index if not exists documents_user_idx on public.documents (user_id, created_at desc);

-- ------------------------------------------------------------------ temporary, revocable shares
create table if not exists public.shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token_hash text not null unique,         -- sha256(token); the token itself is only in the link
  code_hash text not null,                 -- sha256(token:code)
  scope jsonb not null,                    -- { traveler, docs[], sections[], lang, patientLang }
  label text,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists shares_user_idx on public.shares (user_id, created_at desc);

create table if not exists public.share_events (
  id bigint generated always as identity primary key,
  share_id uuid not null references public.shares (id) on delete cascade,
  type text not null,                      -- opened | denied | viewed
  detail text,
  at timestamptz not null default now()
);
create index if not exists share_events_share_idx on public.share_events (share_id, at desc);

-- ------------------------------------------------------------------ Row Level Security
alter table public.profiles enable row level security;
alter table public.policies enable row level security;
alter table public.documents enable row level security;
alter table public.shares enable row level security;
alter table public.share_events enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own policy" on public.policies;
create policy "own policy" on public.policies for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own documents" on public.documents;
create policy "own documents" on public.documents for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own shares" on public.shares;
create policy "own shares" on public.shares for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Patients can read the activity on their own shares; only the Edge Function
-- (service role, bypasses RLS) writes events.
drop policy if exists "read own share events" on public.share_events;
create policy "read own share events" on public.share_events for select to authenticated
  using (exists (select 1 from public.shares s where s.id = share_id and s.user_id = auth.uid()));

-- ------------------------------------------------------------------ private Storage bucket
insert into storage.buckets (id, name, public)
values ('medical-documents', 'medical-documents', false)
on conflict (id) do update set public = false;

drop policy if exists "own files read" on storage.objects;
create policy "own files read" on storage.objects for select to authenticated
  using (bucket_id = 'medical-documents' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "own files write" on storage.objects;
create policy "own files write" on storage.objects for insert to authenticated
  with check (bucket_id = 'medical-documents' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "own files update" on storage.objects;
create policy "own files update" on storage.objects for update to authenticated
  using (bucket_id = 'medical-documents' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "own files delete" on storage.objects;
create policy "own files delete" on storage.objects for delete to authenticated
  using (bucket_id = 'medical-documents' and (storage.foldername(name))[1] = auth.uid()::text);
