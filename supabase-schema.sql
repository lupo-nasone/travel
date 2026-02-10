-- =====================================================
-- ESEGUI QUESTO SQL nella Supabase Dashboard:
-- vai su SQL Editor > New Query > incolla e Run
-- =====================================================

-- 1. Crea la tabella saved_trips
create table if not exists public.saved_trips (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  destination_name text not null,
  destination_region text not null,
  destination_image text not null default '',
  destination_lat double precision not null,
  destination_lng double precision not null,
  mode text not null default 'tourist',
  distance double precision not null default 0,
  trip_days integer not null default 1,
  destination_data jsonb not null default '{}'::jsonb,
  itinerary_data jsonb not null default '{}'::jsonb,
  result_data jsonb not null default '{}'::jsonb
);

-- 2. Abilita Row Level Security (RLS)
alter table public.saved_trips enable row level security;

-- 3. Policy: gli utenti possono vedere SOLO i propri viaggi
create policy "Users can view own trips"
  on public.saved_trips
  for select
  using (auth.uid() = user_id);

-- 4. Policy: gli utenti possono inserire SOLO i propri viaggi
create policy "Users can insert own trips"
  on public.saved_trips
  for insert
  with check (auth.uid() = user_id);

-- 5. Policy: gli utenti possono eliminare SOLO i propri viaggi
create policy "Users can delete own trips"
  on public.saved_trips
  for delete
  using (auth.uid() = user_id);

-- 5b. Policy: gli utenti possono aggiornare SOLO i propri viaggi
create policy "Users can update own trips"
  on public.saved_trips
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 6. Indice per velocizzare le query per utente
create index if not exists idx_saved_trips_user_id
  on public.saved_trips(user_id);

-- 7. Indice per ordinamento per data
create index if not exists idx_saved_trips_created_at
  on public.saved_trips(created_at desc);
