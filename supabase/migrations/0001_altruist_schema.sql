-- =============================================================================
-- Altruist — initial schema
--
-- Run in: Supabase dashboard > SQL Editor > New query > Run.
-- Safe to re-run: every statement is idempotent.
--
-- This closes the five schema gaps the design system flagged as build blockers
-- (README "Backend blockers", SRS §3.1, Handoff §6):
--   1. order_items          — an order could not record which products it held
--   2. order_status_events  — Order Tracking draws a timestamp per step
--   3. orders.prescription_id — the checkout gate needs this link
--   4. products.pharmacy_id — the aggregator model implies per-pharmacy stock
--   5. prescription_access  — who viewed which image, when (Act 843)
--
-- ON ROW LEVEL SECURITY
-- The rows here are prescriptions and orders: health data. The anon key ships
-- inside the app and grants nothing on its own — RLS is the entire access
-- control model. Every table below has RLS enabled, and the user-owned ones are
-- scoped to `auth.uid()`. A table added later without RLS is readable by every
-- user of the app.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
do $$ begin
  create type prescription_status as enum ('PENDING','VERIFYING','VERIFIED','REJECTED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum
    ('RECEIVED','VERIFYING','PACKING','DISPATCHED','DELIVERED','CANCELLED','REJECTED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type product_category as enum ('Prescription','OTC','Vitamins');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- PROFILES — one row per auth user
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,
  created_at  timestamptz not null default now()
);

-- Created automatically so the app never has to check whether a profile exists.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'phone')
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- PHARMACIES — the partner side of the aggregator
-- ---------------------------------------------------------------------------
create table if not exists public.pharmacies (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  licence_number text not null,
  address        text not null,
  phone          text,
  distance_km    numeric(4,1),
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- PRODUCTS — gap 4: stock and price belong to a pharmacy, not the platform
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id                      text primary key,
  pharmacy_id             uuid references public.pharmacies(id) on delete set null,
  name                    text not null,
  brand                   text not null,
  pack                    text not null,
  price                   numeric(10,2) not null check (price >= 0),
  -- SRS §3: a product without a classification is a compliance defect. NOT NULL
  -- with no default, so a row cannot be inserted without deciding.
  requires_prescription   boolean not null,
  in_stock                boolean not null default true,
  category                product_category not null,
  form                    text,
  dosage                  text,
  ships                   text,
  unit_note               text,
  description             text,
  rating                  numeric(2,1),
  reviews                 integer default 0,
  keywords                text[] default '{}',
  created_at              timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category);
create index if not exists products_search_idx
  on public.products using gin (to_tsvector('english', name || ' ' || brand));

-- ---------------------------------------------------------------------------
-- PROMOTIONS — the Home banner carousel
-- ---------------------------------------------------------------------------
create table if not exists public.promotions (
  id           text primary key,
  image_url    text,
  alt          text not null,
  aspect_ratio numeric(4,2) not null,
  advertiser   text not null,
  href         text not null,
  product_id   text references public.products(id) on delete set null,
  focus        text check (focus in ('center','left','right','top','bottom')),
  eyebrow      text not null,
  title        text not null,
  body         text not null,
  cta          text not null,
  tone         text not null,
  active       boolean not null default true,
  sort_order   integer not null default 0
);

-- ---------------------------------------------------------------------------
-- ADDRESSES / PAYMENT METHODS
-- ---------------------------------------------------------------------------
create table if not exists public.addresses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  label       text not null,
  line        text not null,
  note        text,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists addresses_user_idx on public.addresses (user_id);

-- Card and wallet details live with Paystack. This table holds only what is
-- needed to render a choice — never a PAN, never a wallet PIN.
create table if not exists public.payment_methods (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('momo','card','bank')),
  label       text not null,
  subtitle    text,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists payment_methods_user_idx on public.payment_methods (user_id);

-- ---------------------------------------------------------------------------
-- PRESCRIPTIONS
-- ---------------------------------------------------------------------------
create table if not exists public.prescriptions (
  id            text primary key,                    -- the TrxID the user quotes
  user_id       uuid not null references auth.users(id) on delete cascade,
  pharmacy_id   uuid references public.pharmacies(id) on delete set null,
  status        prescription_status not null default 'PENDING',
  note          text not null default 'Awaiting pharmacist review',
  -- Path inside the private `prescriptions` storage bucket. Never a public URL.
  image_path    text,
  uploaded_at   timestamptz not null default now(),
  reviewed_at   timestamptz,
  reviewed_by   text
);
create index if not exists prescriptions_user_idx on public.prescriptions (user_id, uploaded_at desc);

-- A prescription covers SPECIFIC products, not the whole account. Modelling it
-- as a blanket "user has a verified script" flag is the bug that lets someone
-- attach a script for antibiotics and check out with a controlled drug.
create table if not exists public.prescription_products (
  prescription_id text not null references public.prescriptions(id) on delete cascade,
  product_id      text not null references public.products(id) on delete cascade,
  primary key (prescription_id, product_id)
);

-- Gap 5. Act 843: a data subject is entitled to know who accessed their health
-- data. Append-only — no update or delete policy exists for it below.
create table if not exists public.prescription_access (
  id              uuid primary key default gen_random_uuid(),
  prescription_id text not null references public.prescriptions(id) on delete cascade,
  actor           text not null,
  reason          text not null,
  accessed_at     timestamptz not null default now()
);
create index if not exists prescription_access_idx on public.prescription_access (prescription_id, accessed_at desc);

-- ---------------------------------------------------------------------------
-- ORDERS
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id              text primary key,                  -- the TrxID
  user_id         uuid not null references auth.users(id) on delete cascade,
  pharmacy_id     uuid references public.pharmacies(id) on delete set null,
  -- Gap 3: which script this order was dispensed against.
  prescription_id text references public.prescriptions(id) on delete set null,
  status          order_status not null default 'RECEIVED',
  reference       text,                              -- Paystack reference
  subtotal        numeric(10,2) not null,
  delivery_fee    numeric(10,2) not null default 0,
  service_fee     numeric(10,2) not null default 0,
  total           numeric(10,2) not null,
  address_label   text,
  address_line    text,
  speed_label     text,
  speed_eta       text,
  method_label    text,
  placed_at       timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders (user_id, placed_at desc);

-- Gap 1. Price and name are SNAPSHOT here, not joined from products: an order
-- is a record of something that happened and must not change when the
-- catalogue is repriced. A receipt that re-reads today's price is not a receipt.
create table if not exists public.order_items (
  id                    uuid primary key default gen_random_uuid(),
  order_id              text not null references public.orders(id) on delete cascade,
  product_id            text references public.products(id) on delete set null,
  name                  text not null,
  pack                  text not null,
  unit_price            numeric(10,2) not null,
  qty                   integer not null check (qty > 0),
  requires_prescription boolean not null
);
create index if not exists order_items_order_idx on public.order_items (order_id);

-- Gap 2. A status enum cannot say WHEN each step happened, and the tracking
-- timeline draws a timestamp per step.
create table if not exists public.order_status_events (
  id         uuid primary key default gen_random_uuid(),
  order_id   text not null references public.orders(id) on delete cascade,
  status     order_status not null,
  title      text not null,
  subtitle   text,
  created_at timestamptz not null default now()
);
create index if not exists order_status_events_idx on public.order_status_events (order_id, created_at);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
alter table public.profiles              enable row level security;
alter table public.pharmacies            enable row level security;
alter table public.products              enable row level security;
alter table public.promotions            enable row level security;
alter table public.addresses             enable row level security;
alter table public.payment_methods       enable row level security;
alter table public.prescriptions         enable row level security;
alter table public.prescription_products enable row level security;
alter table public.prescription_access   enable row level security;
alter table public.orders                enable row level security;
alter table public.order_items           enable row level security;
alter table public.order_status_events   enable row level security;

-- --- Catalogue: readable by anyone signed in, writable by nobody from the app.
drop policy if exists "catalogue readable" on public.products;
create policy "catalogue readable" on public.products
  for select to authenticated using (true);

drop policy if exists "pharmacies readable" on public.pharmacies;
create policy "pharmacies readable" on public.pharmacies
  for select to authenticated using (true);

drop policy if exists "active promotions readable" on public.promotions;
create policy "active promotions readable" on public.promotions
  for select to authenticated using (active = true);

-- --- Profile: your own row only.
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- --- Addresses and payment methods: yours, full CRUD.
drop policy if exists "own addresses" on public.addresses;
create policy "own addresses" on public.addresses
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own payment methods" on public.payment_methods;
create policy "own payment methods" on public.payment_methods
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- --- Prescriptions: read and create your own. You may NOT update one —
--     verification is the pharmacist's decision, made from the partner portal
--     with a service role. A patient who can set status to VERIFIED has just
--     bypassed the entire prescription gate.
drop policy if exists "own prescriptions readable" on public.prescriptions;
create policy "own prescriptions readable" on public.prescriptions
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "create own prescriptions" on public.prescriptions;
create policy "create own prescriptions" on public.prescriptions
  for insert to authenticated with check (auth.uid() = user_id and status = 'PENDING');

drop policy if exists "own prescription products" on public.prescription_products;
create policy "own prescription products" on public.prescription_products
  for select to authenticated using (exists (
    select 1 from public.prescriptions p
    where p.id = prescription_id and p.user_id = auth.uid()));
drop policy if exists "link own prescription products" on public.prescription_products;
create policy "link own prescription products" on public.prescription_products
  for insert to authenticated with check (exists (
    select 1 from public.prescriptions p
    where p.id = prescription_id and p.user_id = auth.uid()));

-- Read your own access log. Deliberately no insert/update/delete policy: the
-- log is written by the partner side, and a subject who can edit it has an
-- audit trail worth nothing.
drop policy if exists "own access log readable" on public.prescription_access;
create policy "own access log readable" on public.prescription_access
  for select to authenticated using (exists (
    select 1 from public.prescriptions p
    where p.id = prescription_id and p.user_id = auth.uid()));

-- --- Orders: read and create your own. No update — cancellation and
--     fulfilment transitions are server-side.
drop policy if exists "own orders readable" on public.orders;
create policy "own orders readable" on public.orders
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "create own orders" on public.orders;
create policy "create own orders" on public.orders
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "own order items" on public.order_items;
create policy "own order items" on public.order_items
  for select to authenticated using (exists (
    select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
drop policy if exists "create own order items" on public.order_items;
create policy "create own order items" on public.order_items
  for insert to authenticated with check (exists (
    select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

drop policy if exists "own order events" on public.order_status_events;
create policy "own order events" on public.order_status_events
  for select to authenticated using (exists (
    select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
drop policy if exists "create own order events" on public.order_status_events;
create policy "create own order events" on public.order_status_events
  for insert to authenticated with check (exists (
    select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

-- =============================================================================
-- STORAGE — prescription images
--
-- PRIVATE bucket. A public bucket here would mean anyone holding a URL can read
-- a stranger's prescription, and those URLs leak through logs and screenshots.
-- Files are addressed `<user_id>/<trx_id>.jpg`, and the policies below check
-- that the first path segment is the caller's own id.
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('prescriptions', 'prescriptions', false, 10485760,
        array['image/jpeg','image/png','image/heic','image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "upload own prescription image" on storage.objects;
create policy "upload own prescription image" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'prescriptions' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "read own prescription image" on storage.objects;
create policy "read own prescription image" on storage.objects
  for select to authenticated
  using (bucket_id = 'prescriptions' and (storage.foldername(name))[1] = auth.uid()::text);
