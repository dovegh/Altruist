-- =============================================================================
-- Payments — what the pay-order Edge Function reads and writes.
--
-- Run AFTER 0004. Safe to re-run.
--
-- THE MODEL
-- A payment is an ATTEMPT against an order, not a field on it. A declined card
-- followed by a successful mobile-money charge is two rows here and one order;
-- overwriting `orders.reference` on each try would erase the audit trail a
-- dispute needs. The order carries only the outcome that matters to fulfilment:
-- `paid_at`, set once, by the function, with the service role.
--
-- WHO WRITES WHAT
-- Nothing in this file grants the app INSERT or UPDATE on payments. The Paystack
-- secret lives in the Edge Function; so does every write below. A user who can
-- set `paid_at` from the app has paid for nothing.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- payment_methods — what Paystack needs to charge a saved instrument
-- ---------------------------------------------------------------------------
alter table public.payment_methods
  -- Returned by Paystack after a first successful card charge; lets later
  -- charges run without the card number ever touching this system. Never a PAN.
  add column if not exists paystack_authorization_code text,
  -- Mobile money: the wallet number and Paystack's provider code — mtn, vod
  -- (Telecel), atl (AirtelTigo).
  add column if not exists momo_phone text,
  add column if not exists momo_provider text
    check (momo_provider is null or momo_provider in ('mtn','vod','atl'));

-- ---------------------------------------------------------------------------
-- orders — the outcome
-- ---------------------------------------------------------------------------
alter table public.orders
  add column if not exists paid_at timestamptz;

-- ---------------------------------------------------------------------------
-- payment_attempts — the ledger
-- ---------------------------------------------------------------------------
do $$ begin
  create type payment_status as enum ('initiated','pending','success','failed');
exception when duplicate_object then null; end $$;

create table if not exists public.payment_attempts (
  id               uuid primary key default gen_random_uuid(),
  order_id         text not null references public.orders(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  -- Paystack reference. Unique: Paystack rejects a reused one, and so do we.
  reference        text not null unique,
  method_kind      text not null check (method_kind in ('momo','card','bank')),
  -- Pesewas, as sent to Paystack. Recomputed server-side from order_items —
  -- never the number the client posted.
  amount_pesewas   integer not null check (amount_pesewas > 0),
  status           payment_status not null default 'initiated',
  -- Paystack's human-readable outcome: "Approved", "Insufficient Funds", etc.
  -- Shown to the user verbatim on the decline screen.
  gateway_response text,
  -- The full Paystack payload, for disputes. Never rendered.
  raw              jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists payment_attempts_order_idx on public.payment_attempts (order_id, created_at desc);

alter table public.payment_attempts enable row level security;

-- Read your own attempts — the Order Receipt shows the reference and method.
-- No insert, update or delete policy: the function writes with the service
-- role, and a ledger the payer can edit is not a ledger.
drop policy if exists "own payment attempts readable" on public.payment_attempts;
create policy "own payment attempts readable" on public.payment_attempts
  for select to authenticated using (auth.uid() = user_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists payment_attempts_touch on public.payment_attempts;
create trigger payment_attempts_touch
  before update on public.payment_attempts
  for each row execute function public.touch_updated_at();
