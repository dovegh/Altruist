-- 0011 — Notification preferences.
--
-- The switches on Notification Settings were component state: they reset on
-- every visit and nothing ever read them. One row per person now holds them,
-- and whatever sends notifications reads this table before sending.
--
-- The defaults live here, not in the app: a row is created with just the
-- user id and the database fills in the rest. Marketing (`offers`,
-- `health_digest`) defaults OFF — consent has to be given, not assumed (Data
-- Protection Act 2012, Act 843).
--
-- Prescription verified/rejected has no column on purpose. It always sends:
-- a rejection may mean someone is waiting on medicine they need.

create table if not exists public.notification_preferences (
  user_id          uuid primary key references auth.users (id) on delete cascade,
  -- Orders
  order_status     boolean not null default true,
  rider_approaching boolean not null default true,
  -- Reminders
  refill_reminders boolean not null default true,
  wellness_nudges  boolean not null default false,
  -- Marketing: opt-in only
  offers           boolean not null default false,
  health_digest    boolean not null default false,
  -- Channels
  channel_push     boolean not null default true,
  channel_sms      boolean not null default true,
  channel_email    boolean not null default false,
  updated_at       timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

create policy "own preferences: read"
  on public.notification_preferences for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "own preferences: create"
  on public.notification_preferences for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "own preferences: change"
  on public.notification_preferences for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- No delete policy: the row goes when the account does (on delete cascade).

revoke all on public.notification_preferences from anon;
revoke all on public.notification_preferences from authenticated;
grant select, insert on public.notification_preferences to authenticated;
grant update (
  order_status, rider_approaching, refill_reminders, wellness_nudges,
  offers, health_digest, channel_push, channel_sms, channel_email
) on public.notification_preferences to authenticated;

create or replace function public.notification_preferences_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger notification_preferences_touch
  before update on public.notification_preferences
  for each row execute function public.notification_preferences_touch();
