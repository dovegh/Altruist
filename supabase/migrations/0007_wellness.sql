-- =============================================================================
-- Wellness — the record of what the user actually did.
--
-- Run AFTER 0006. Safe to re-run.
--
-- WHAT IS HERE AND WHAT IS NOT
-- Programme content (which exercises, how many sets, what rest) is NOT in this
-- file. It is editorial, it ships with the release, and a workout that needs a
-- round trip to tell you "3 x 12" is a workout that fails in a basement gym
-- with no signal. What lives here is the part that is personal and must
-- outlive the handset: finished sessions, water logged, routines saved.
--
-- THE SESSION IN FLIGHT IS ALSO NOT HERE
-- "Set 3 of 6" stays on the device. It changes every ninety seconds, it is
-- worthless to anyone but the phone in your hand, and syncing it would mean a
-- write per set on the worst network in the building. A session becomes server
-- data at the moment it is finished, and not before.
--
-- WHY THE CLIENT PICKS THE SESSION ID
-- `wellness_sessions.id` is text, generated on the device, exactly like
-- `orders.id`. That is what makes the sync idempotent: a phone that pushes a
-- session, loses the network before it hears back, and retries on the walk
-- home writes the same row twice and ends up with one session, not two.
--
-- WHY `day` IS A DATE AND NOT A TIMESTAMP
-- Streaks are counted in days as the user lived them. Deriving the day from a
-- UTC timestamp puts a 9pm session in Accra on tomorrow's date for anyone east
-- of here and breaks the streak they just earned. The device sends the
-- calendar day it saw; `finished_at` keeps the instant for ordering.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- wellness_sessions — one row per FINISHED session
-- ---------------------------------------------------------------------------
create table if not exists public.wellness_sessions (
  id           text primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  -- Which plan this belonged to. Text, not a foreign key: programmes ship with
  -- the app, so a row must survive a release that renames or retires one.
  programme_id text not null,
  day_id       text not null,
  day          date not null,
  -- The plan's length, not wall-clock. A session left open overnight is not a
  -- nine-hour workout, and the device already refuses to record it as one.
  duration_min integer not null check (duration_min > 0 and duration_min <= 600),
  finished_at  timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create index if not exists wellness_sessions_user_idx
  on public.wellness_sessions (user_id, day desc, finished_at desc);

-- ---------------------------------------------------------------------------
-- wellness_hydration — glasses of water, per user per day
-- ---------------------------------------------------------------------------
create table if not exists public.wellness_hydration (
  user_id    uuid not null references auth.users(id) on delete cascade,
  day        date not null,
  glasses    integer not null default 0 check (glasses >= 0 and glasses <= 50),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- ---------------------------------------------------------------------------
-- wellness_saved_routines — plans the user starred
-- ---------------------------------------------------------------------------
create table if not exists public.wellness_saved_routines (
  user_id      uuid not null references auth.users(id) on delete cascade,
  programme_id text not null,
  saved_at     timestamptz not null default now(),
  primary key (user_id, programme_id)
);

-- ---------------------------------------------------------------------------
-- RLS — your own rows, nobody else's
-- ---------------------------------------------------------------------------
alter table public.wellness_sessions       enable row level security;
alter table public.wellness_hydration      enable row level security;
alter table public.wellness_saved_routines enable row level security;

drop policy if exists "own wellness sessions" on public.wellness_sessions;
create policy "own wellness sessions" on public.wellness_sessions
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own hydration" on public.wellness_hydration;
create policy "own hydration" on public.wellness_hydration
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own saved routines" on public.wellness_saved_routines;
create policy "own saved routines" on public.wellness_saved_routines
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- log_hydration — the one write that cannot be a plain upsert
--
-- Two devices logging water on the same day must not overwrite each other with
-- a smaller number. `greatest()` makes the merge monotonic, which matches the
-- only gesture the UI offers: a glass can be added, never taken away. Doing it
-- in one statement also makes it atomic — a read-modify-write from the client
-- would drop a glass whenever both phones flushed at once.
--
-- SECURITY INVOKER (the default): the RLS policy above still applies, so this
-- can only ever touch the caller's own row.
-- ---------------------------------------------------------------------------
create or replace function public.log_hydration(p_day date, p_glasses integer)
returns integer
language sql
set search_path = ''
as $$
  insert into public.wellness_hydration (user_id, day, glasses)
  values (auth.uid(), p_day, greatest(coalesce(p_glasses, 0), 0))
  on conflict (user_id, day) do update
     set glasses    = greatest(public.wellness_hydration.glasses, excluded.glasses),
         updated_at = now()
  returning glasses;
$$;
