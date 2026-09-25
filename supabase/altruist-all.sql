-- =============================================================================
-- Altruist — ALL migrations, in order, as one paste.
--
-- Supabase dashboard > SQL Editor > New query > paste this whole file > Run.
-- Every statement is idempotent; re-running is safe.
--
-- Concatenated from:
--   0001_altruist_schema.sql
--   0002_seed.sql
--   0003_product_image_url.sql
--   0004_vafy_otc.sql
--   0006_payments.sql
--   0007_wellness.sql
--   0008_harden_functions.sql
--   0009_profile.sql
-- =============================================================================


-- ##### 0001_altruist_schema.sql ##############################################

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


-- ##### 0002_seed.sql #########################################################

-- =============================================================================
-- Altruist — seed data
--
-- Mirrors src/lib/catalog.ts and src/lib/promotions.ts so the database and the
-- development fixtures start from the same catalogue. Run AFTER 0001.
-- Safe to re-run.
--
-- `promotions.image_url` is left null: the banners are bundled app assets
-- today. When they move to Storage, put them in a PUBLIC bucket — ad creative
-- is meant to be seen — and set the URL here.
-- =============================================================================

insert into public.pharmacies (id, name, licence_number, address, phone, distance_km) values
  ('11111111-1111-4111-8111-111111111111','Healthview Pharmacy','PC/PP/2026/0447','18 Ring Road East, Osu, Accra','+233 24 400 1188',2.1),
  ('22222222-2222-4222-8222-222222222222','Osu Care Chemist','PC/PP/2026/0512','7 Independence Avenue, Airport Residential, Accra','+233 24 400 2299',3.4)
on conflict (id) do nothing;

-- The twelve demo products that used to live here have been removed: the app
-- now ships the real VAFY catalogue (0004) and those rows would appear in it
-- as products that exist nowhere else. Prescription lines arrive via 0005 once
-- data/vafy-classification-draft.csv is pharmacist-reviewed.

insert into public.promotions
  (id, alt, aspect_ratio, advertiser, href, focus, eyebrow, title, body, cta, tone, sort_order)
values
  ('young-living-bloom',
   'Young Living Bloom. Brighter skin, a more radiant you, naturally. The first essential oil-infused skin care line, with brightening cleanser, essence and lotion.',
   2.84,'Young Living','/catalog','right','NEW IN','Brighter skin, naturally',
   'An essential oil-infused brightening cleanser, essence and lotion.','See the range','accentCream',0),

  ('anua-glass-skin',
   'Anua Glass Skin Beginner Set. Three steps to luminous skin, all in one set: heartleaf cleansing oil, pore deep cleansing foam and niacinamide serum.',
   2.44,'Anua','/catalog',NULL,'ANUA’S CHOICE','Glass Skin Beginner Set',
   'Three steps to luminous skin, all in one set.','View the set','accentPink',1),

  ('manyo-prime-day',
   'Manyo Prime Day Sale, 23rd to 26th June. Up to 60 percent off Air Light sunscreen SPF 50, Pure Soybean cleansing oil and Glutathione dark spot serum.',
   2.00,'Manyo Factory','/catalog',NULL,'PRIME DAY · 23–26 JUN','Up to 60% off Manyo',
   'Sunscreen, cleansing oil and the Glutathione dark spot serum.','Shop the sale','accentGold',2),

  ('purito-centella',
   'Purito Seoul, most loved Korean skincare in Europe. Wonder Releaf Centella range, unscented. Vegan, cruelty free, gentle ingredients, dermatologically tested.',
   2.00,'Purito Seoul','/catalog',NULL,'MOST LOVED','Korean skincare, unscented',
   'Wonder Releaf Centella — vegan, cruelty free, dermatologically tested.','Browse Purito','brand',3),

  ('caryophy-protection',
   'Caryophy, made in Korea. Complete protection for every skin type: smart sunscreen SPF 50 plus, skin repair cream, portulaca mist and ampoule.',
   2.63,'Caryophy','/catalog',NULL,'PARTNER OFFER','Complete daily protection',
   'Sunscreen, repair cream, mist and ampoule for troubled skin.','Shop Caryophy','accentBlue',4),

  ('sisi-mini',
   'SISI Tokyo, I’m Your HERO dual watery cleansing. The long-awaited mini size, now on sale.',
   1.78,'SISI Tokyo','/catalog',NULL,'NOW IN MINI','I’m Your HERO, travel size',
   'The dual watery cleanser, in a size that fits your bag.','See sizes','accentBlue',5),

  ('holos-supplements',
   'Hólos supplements. BioFlex Collagen, Imuno Defense, Omega 3 Pro, Gluta Pure and Ósseo Force, in blue and white tubs.',
   1.68,'Hólos','/catalog',NULL,'SUPPLEMENTS','Daily support, covered',
   'Collagen, omega 3, glutathione and bone health in one range.','Shop supplements','accentBlue',6),

  ('atyab-all-over-spray',
   'Atyab Al Marshoud All Over Spray collection. Long-lasting fragrance with skin-loving hydration, in lychee, tonka, magnolia, salt and honey.',
   1.67,'Atyab Al Marshoud','/catalog',NULL,'FRAGRANCE','All Over Spray collection',
   'Long-lasting scent with skin-loving hydration, in five notes.','Explore scents','accentGold',7)
on conflict (id) do nothing;


-- ##### 0003_product_image_url.sql ############################################

-- =============================================================================
-- products.image_url
--
-- The catalogue import (0004) writes a product photograph per row, and 0001
-- had no column for one. Run this BEFORE 0004 or the insert fails on an
-- unknown column.
--
-- A URL, not bytes and not a Storage path. The VAFY images are already served
-- from a CDN, and the 473 of them come to 56 MB — far too much to bundle into
-- the app, and pointless to re-host while the shop's own CDN is authoritative
-- and updates when they restock. If they later move to Supabase Storage, put
-- them in a PUBLIC bucket: product shots are meant to be seen, unlike
-- prescription images, which stay private and are addressed by path.
-- =============================================================================

alter table public.products
  add column if not exists image_url text;


-- ##### 0004_vafy_otc.sql #####################################################

-- GENERATED by tools/catalogue.mjs otc — do not hand-edit.
-- The OTC slice only. Prescription lines are held back until
-- data/vafy-classification-draft.csv has been pharmacist-reviewed.

insert into public.products
  (id, name, brand, pack, price, requires_prescription, in_stock, category, image_url)
values
  ('12pcs-plastic-cutlery','12pcs Plastic Cutlery','VAFY','Each',35,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/61Shc51EQnL._CR5_0_1911_1080_SR414_234.jpg?v=1714506674'),
  ('15pcs-makeup-tool-set','15pcs Makeup Tool Set','VAFY','Each',80,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/3FD9DDB0-422E-4BDA-A363-AE5002A78679.jpg?v=1714692122'),
  ('40-oz-tumbler-with-straw','40 Oz Tumbler With Straw','VAFY','Each',133,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/40-Oz-Tumbler-with-Handle-and-Straw-Vacuum-Insulated-Tumbler-with-Handle-and-Straw.webp?v=1717609214'),
  ('abro-can','Abro Can','VAFY','Each',46,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/HIIII.jpg?v=1712315664'),
  ('absolut-lip-gloss','Absolut Lip Gloss','VAFY','Each',13,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/s-l1200.jpg?v=1712316217'),
  ('accu-news-ovulation-test-5s','Accu News Ovulation Test 5s','VAFY','Each',120,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/image_e3e8f5c8-ceb7-494d-b103-b483527ef3ff.webp?v=1721079434'),
  ('actilife-multivitamin-tabs','Actilife Multivitamin Tabs','VAFY','Each',30,false,true,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download-2024-04-11T180158.132.jpg?v=1712858520'),
  ('actilife-vit-c-zinc','Actilife Vit C & Zinc','VAFY','Each',50,false,true,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download_31.jpg?v=1712344929'),
  ('adidas-roll-on-men','Adidas Roll On Men','VAFY','Each',28,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/s-l225.jpg?v=1712317760'),
  ('adidas-roll-on-women','Adidas Roll On Women','VAFY','Each',25,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/adidas-pro-invisible-antiperspirant-roll-on-for-women.webp?v=1712320859'),
  ('adidas-roll-on-women-50ml','Adidas Roll On Women 50ml','VAFY','Each',22,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/adidas-women-adipure-deodorant-roll-on-50-ml-53-g-17-fl-oz.png?v=1713190242'),
  ('advanced-clinical-collagen','Advanced Clinical Collagen','VAFY','Each',288,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/618V9I8nivL.jpg?v=1737563742'),
  ('advanced-clinical-vit-c-serum','Advanced Clinical Vit C Serum','VAFY','Each',288,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/81hs_wImCoL.jpg?v=1737563870'),
  ('advanced-clinical-vit-bright','Advanced Clinical Vit.Bright','VAFY','Each',288,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/71FH-sBgETL._SL1500.jpg?v=1737563574'),
  ('alive-calcium-d3-gummies','Alive Calcium +D3 Gummies','VAFY','Each',210,false,true,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/krg4rjeueeo254ikkfap.webp?v=1721076511'),
  ('almond-vanilla-scrub','Almond Vanilla Scrub','VAFY','Each',65,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/1694082842_11_6728.jpg?v=1714591865'),
  ('always-maxi-thick','Always Maxi Thick','VAFY','Each',25,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/AlwaysMaxiThickX-Long8Pcs.webp?v=1737564870'),
  ('always-pad-ultra-thin','Always Pad Ultra Thin','VAFY','Each',25,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/960280572-C1N1.webp?v=1737565136'),
  ('amalfi-hand-soap','Amalfi Hand Soap','VAFY','Each',31,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/fsa.png?v=1713377433'),
  ('ambrosia-baby-food','Ambrosia Baby Food','VAFY','Each',80,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/ambrosia-devon-custard-718425_18915e4a-06c9-4a43-8e6d-5431d6010c52.jpg?v=1713617629'),
  ('amlactin-body-lotion-567g','Amlactin Body Lotion 567g','VAFY','Each',500,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/716snxJ5AKL._AC_UF1000_1000_QL80.jpg?v=1737565922'),
  ('anti-fungal-foot-power','Anti Fungal Foot Power','VAFY','Each',80,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/Value-Health-Anti-Fungal-Foot-Powder-75g.jpg?v=1721078717'),
  ('antibacterial-wipes-nuvomed','Antibacterial Wipes Nuvomed','VAFY','Each',25,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/H5863-L343626500_1.jpg?v=1737567149'),
  ('apple-cider-tumeric-ginger-and-pepper-supplement-60s','Apple Cider+Tumeric,Ginger And Pepper Supplement 60s','VAFY','Each',90,false,true,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download_5_3921bbe4-b347-45f9-85a6-a859b7b49640.jpg?v=1717435629'),
  ('aptamil-1','Aptamil 1','VAFY','Each',345,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/6437761ef8b7504857779472_05051594006812_C1N1_s01_10475394.png?v=1712323367'),
  ('aptamil-2','Aptamil 2','VAFY','Each',270,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/61xXAbZYHVL.jpg?v=1712324311'),
  ('aptamil-2-uk','Aptamil 2 (Uk)','VAFY','Each',345,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/122513016455198.jpg?v=1713810870'),
  ('aptamil-3','Aptamil 3','VAFY','Each',345,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/71s0PheU1eL._SL1500.jpg?v=1737568387'),
  ('aptamil-ready-to-feed','Aptamil Ready To Feed','VAFY','Each',35,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/aptamil2_first_infant_milk_200ml.png?v=1737568182'),
  ('argan-oil-conditioner','Argan Oil Conditioner','VAFY','Each',36,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/XHCAC01-1.webp?v=1712324593'),
  ('argan-oil-hair-mask','Argan Oil Hair Mask','VAFY','Each',25,false,false,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/1_af4bdec8-fad0-42bf-92a9-835c773d80aa.jpg?v=1712324997'),
  ('argan-oil-shampoo','Argan Oil Shampoo','VAFY','Each',38,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/1_2_73a31eee-7b89-40f2-967d-d31a98170b5a.jpg?v=1737568863'),
  ('astonish-oven-and-cookware-paste','Astonish Oven And Cookware Paste','VAFY','Each',45,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/719QyP6e9iL.jpg?v=1714507371'),
  ('axe-deo-spray-men-150ml','Axe Deo Spray Men 150ml','VAFY','Each',34,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/ALL.jpg?v=1736366308'),
  ('b-co-strong-30s-krka','B-Co Strong 30s (Krka)','VAFY','Each',75,false,false,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/image_1024x1024_29cf2334-7c98-4fe7-bbb3-12264822528b.webp?v=1713299689'),
  ('badruf-cream','Badruf Cream','VAFY','Each',17,false,true,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download-2024-04-11T174024.629.jpg?v=1712857227'),
  ('baggage-tags','Baggage Tags','VAFY','Each',80,false,true,'OTC'::product_category,''),
  ('balance-niancinamide-serum-15','Balance Niancinamide Serum 15%','VAFY','Each',130,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/71DuJv-1tEL.jpg?v=1721079986'),
  ('balance-vit-c-serum-3','Balance Vit C Serum 3%','VAFY','Each',130,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/2674-14.jpg?v=1721078915'),
  ('basic-nutritio-vitamin-d-400iu-tabs-80s','Basic Nutritio Vitamin D 400iu Tabs 80s','VAFY','Each',45,false,false,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download-2024-04-18T164635.530.jpg?v=1713458810'),
  ('basic-nutrition-omega-3-fish-oil-1000mg-30s','Basic Nutrition Omega 3 Fish Oil 1000mg 30s','VAFY','Each',69,false,true,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/12P021.jpg?v=1713292430'),
  ('bbl-thermal-guard','Bbl Thermal Guard','VAFY','Each',56,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/315063197_170130995636972_6497205814609601439_n.jpg?v=1713806088'),
  ('beauty-and-co-collagen-powder-7s','Beauty And Co Collagen Powder 7s','VAFY','Each',110,false,true,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/s-l400_1.jpg?v=1717435845'),
  ('beauty-formula-glowing-serum-2-vit-c','Beauty Formula Glowing Serum 2% Vit C','VAFY','Each',70,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/31vMO-09PVL._SR600_315_PIWhiteStrip_BottomLeft_0_35_SCLZZZZZZZ_FMpng_BG255_255_255.png?v=1717435995'),
  ('beauty-formula-gold-peel-off-facial-mask','Beauty Formula Gold Peel Off Facial Mask','VAFY','Each',27,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/81b6MAuT4QL.jpg?v=1718214734'),
  ('beauty-formula-moisturiser','Beauty Formula Moisturiser','VAFY','Each',36,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/33.webp?v=1712859577'),
  ('beauty-formula-serum','Beauty Formula Serum','VAFY','Each',42,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/beauty-formula-facial-serum-500x500.jpg?v=1712850818'),
  ('beauty-formula-tonic-150ml','Beauty Formula Tonic 150ml','VAFY','Each',42,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/3E5817A4-F51D-45C4-9F35-C28D1DF434BF.jpg?v=1713117326'),
  ('beauty-formulas-facial-scrubs','Beauty Formulas Facial Scrubs','VAFY','Each',38,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/1212.webp?v=1712162152'),
  ('beauty-secrets-black-soap-142g-honey','Beauty Secrets Black Soap 142g Honey','VAFY','Each',26,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/41xoOwF07XL._SR600_315_PIWhiteStrip_BottomLeft_0_35_SCLZZZZZZZ_FMpng_BG255_255_255_1.png?v=1713263670'),
  ('beauty-secrets-black-soap-142g-lemongrass','Beauty Secrets Black Soap 142g Lemongrass','VAFY','Each',22,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/beauty-secrets-african-black-soap-142g-lemongrass.webp?v=1713263852'),
  ('beauty-secrets-black-soap-142g-turmeric','Beauty Secrets Black Soap 142g Turmeric','VAFY','Each',25,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/beauty-secrets-african-black-soap-142g-turmeric.webp?v=1713263996'),
  ('bella-cocoa-lotion','Bella Cocoa Lotion','VAFY','Each',42,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/koko.jpg?v=1713201461'),
  ('bella-cocoa-lotion-300ml-s-s','Bella Cocoa Lotion 300ml S/S','VAFY','Each',19,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/jumbo-midlands-uk-birmingham-african-food-bella-cosmetics-balms-and-household-BCB001.png?v=1713042883'),
  ('bells-castor-oil-70ml','Bells Castor Oil 70ml','VAFY','Each',56,false,false,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download-2024-04-15T180739.149.jpg?v=1713204472'),
  ('bells-olive-oil','Bells Olive Oil','VAFY','Each',12,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download-2024-04-15T195218.980.jpg?v=1713210781'),
  ('bells-vitamin-c-syrup','Bells Vitamin C Syrup','VAFY','Each',65,false,true,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download-2024-04-19T175352.726.jpg?v=1713549604'),
  ('berries-weekend-pink-perfume','Berries Weekend Pink Perfume','VAFY','Each',138,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/pink.jpg?v=1713377742'),
  ('berries-weekend-violet-perfume','Berries Weekend Violet Perfume','VAFY','Each',108,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/voil.webp?v=1713377824'),
  ('bic-shaving-stick','Bic Shaving Stick','VAFY','Each',15,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/Shaving-Stick-BIC-3_new-Design.png?v=1713105816'),
  ('big-3-in-1-water-bottle','Big 3 In 1 Water Bottle','VAFY','Each',75,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/1_2.jpg?v=1713113950'),
  ('bio-oil-125ml','Bio Oil 125ml','VAFY','Each',85,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/81pFAUAvLlL._AC_UF1000_1000_QL80.jpg?v=1713191791'),
  ('bio-oil','Bio Oil 200ml','VAFY','Each',110,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/BioOilSpecialistSkincareOil200mlP2.webp?v=1713463558'),
  ('bio-oil-25ml','Bio Oil 25ml','VAFY','Each',26,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/Bio-OilTissueOil25ml_700x700_d3c98020-ac22-469b-a55e-d9ee638072e3.webp?v=1737709154'),
  ('bio-oil-60ml','Bio Oil 60ml','VAFY','Each',59,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/L_p0111918696_377x_3x.progressive_afc1f7cd-0971-432d-8e45-caeb7931753f.webp?v=1737709218'),
  ('biovene-spf-50-serum','Biovene SPF 50 Serum','VAFY','Each',105,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/195464-2.jpg?v=1721080151'),
  ('bird-camphor','Bird Camphor','VAFY','Each',9,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/815Gowk6AOL._AC_UF1000_1000_QL80.jpg?v=1713045319'),
  ('blue-diamond-air-freshener','Blue Diamond Air Freshener','VAFY','Each',15,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/Best-50-micro-fibre-2022-10-19T102803.595.png?v=1712860310'),
  ('blue-magic-pomade','Blue Magic Pomade','VAFY','Each',84,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/BLUE-MAGIC-CONDITIONER-CREAM.jpg?v=1712859763'),
  ('bod-man-spray','Bod Man Spray','VAFY','Each',70,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/Bod-Man-Black-Fragrance-Body-Spray-236ML.jpg?v=1713206554'),
  ('body-philosophy-sanitizer','Body Philosophy Sanitizer','VAFY','Each',7,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/4173988926_w640_h640_bi-body-philosophy.webp?v=1713550955'),
  ('bondi-sands-s-s','Bondi Sands Sunscreen Lotion','VAFY','Each',199,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/EFAE6D99-F1F6-44A6-8E32-92024A81EF3E.jpg?v=1713862621'),
  ('borges-extra-virgin-olive-oil-500ml','Borges Extra Virgin Olive Oil 500ml','VAFY','Each',200,false,false,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download_30_da17dee9-8966-48c3-8e3b-15330c6506e8.jpg?v=1713463642'),
  ('borges-olive-oil-125ml','Borges Olive Oil 125ml','VAFY','Each',59,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download-2024-04-17T181546.904.jpg?v=1713377750'),
  ('bragg-vinegar-b-s','Bragg Vinegar B/S','VAFY','Each',195,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/vvvv.jpg?v=1713376837'),
  ('bragg-vinegar-s-s','Bragg Vinegar S/S','VAFY','Each',130,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/1023.jpg?v=1712858461'),
  ('breast-pad-36s','Breast Pad 36s','VAFY','Each',55,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download_32_a71d39fe-87fd-4641-9068-d4b8b6d78912.jpg?v=1713465186'),
  ('bref-rim-deluxe-block-50g','Bref Rim Deluxe Block 50g','VAFY','Each',48,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/ShotType1_540x540_aed4d630-a43c-43df-b642-be7838ecb6da.jpg?v=1713188722'),
  ('brown-gold','Brown Gold','VAFY','Each',42,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/hhhj.webp?v=1713201277'),
  ('brown-sugar-b-s','Brown Sugar B/S','VAFY','Each',22,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/IMG_20230317_091304-removebg-preview-1.png?v=1713111963'),
  ('brut-deo-spray','Brut Deo Spray','VAFY','Each',40,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/GGGGG.webp?v=1712259723'),
  ('bubble-hydrogel-under-eye-patches','Bubble Hydrogel Under Eye Patches','VAFY','Each',30,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/hydrogel-under-eye-patches-aloe-vera-green-tea-packet.webp?v=1721079913'),
  ('cafhelp-tongue-cleaner','Cafhelp Tongue Cleaner','VAFY','Each',90,false,false,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/31EBEB8F-2F3F-4D58-8449-E6976781C3FA.jpg?v=1712600145'),
  ('calamine-lotion-200ml-care','Calamine Lotion 200ml (Care)','VAFY','Each',63,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download-2024-04-15T175503.747.jpg?v=1713203709'),
  ('calcium-d3-effervescent-tabs','Calcium + D3 Effervescent Tabs','VAFY','Each',104,false,false,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/images_7fa7d41c-cd1c-4baf-a97e-cf6121330989.jpg?v=1713295097'),
  ('camel-125ml','Camel 125ml','VAFY','Each',20,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download_11_880ad8b7-45d0-4619-8031-a7e9ac170a45.jpg?v=1713388344'),
  ('camel-500ml','Camel 500ml','VAFY','Each',78,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/media_1681392869911813081.webp?v=1713112480'),
  ('camel-bar-soap','Camel Bar Soap','VAFY','Each',15,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/04-Camel-Antibacterial-Aloe-Vera.png?v=1713803952'),
  ('cantu-conditioner','Cantu Conditioner','VAFY','Each',78,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/61xrDXS2yJL.jpg?v=1713804832'),
  ('cantu-shampoo','Cantu Shampoo','VAFY','Each',88,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/61w7NFmFT3L._AC_UF1000_1000_QL80.jpg?v=1713384593'),
  ('catheter-silicone-2-way-18','Catheter Silicone 2-Way 18','VAFY','Each',30,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/RUSCH171305-14-171305-16-171305-18.jpg?v=1714162215'),
  ('ceptic-adapter-kits','Ceptic Adapter Kits','VAFY','Each',500,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/9553050A-B2A2-4AD7-B206-1D8F41C440B8.jpg?v=1712603051'),
  ('cerave-blemish-control-cleanser','Cerave Blemish Control Cleanser','VAFY','Each',192,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/Untitled-design-14.png?v=1713378166'),
  ('cerave-foaming-cleansers-236ml','Cerave Foaming Cleansers 236ml','VAFY','Each',258,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download_28_643bd76c-2ddd-407e-a7e7-c5756151b498.jpg?v=1713462772'),
  ('cerave-hydrating-mineral-sunscreen','Cerave Hydrating Mineral Sunscreen','VAFY','Each',200,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/cere.jpg?v=1713615402'),
  ('cerave-moisturizing-body-cream-340g','Cerave Moisturizing Body Cream 340g','VAFY','Each',300,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/61XKuLLrp_L._AC_UF894_1000_QL80.jpg?v=1713465603'),
  ('cerave-moisturizing-body-lotion','Cerave Moisturizing Body Lotion','VAFY','Each',175,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/31A-U9qfZfL._AC_UF894_1000_QL80.jpg?v=1713806387'),
  ('cerave-retinol-serum','Cerave Retinol Serum','VAFY','Each',204,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download_3_753e1d63-fa8a-43db-a84e-f0da9c1c8900.jpg?v=1713615519'),
  ('cervical-collar-soft-collar','Cervical Collar (Soft Collar)','VAFY','Each',120,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/flamingo-soft-collar-500x500.webp?v=1716286663'),
  ('cetaphil-body-cleansers-473ml','Cetaphil Body Cleansers 473ml','VAFY','Each',250,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/CetaphilGentleSkinCleanser_1024x_e861f692-f2aa-4eb3-9352-616615f9d8e0.webp?v=1713269793'),
  ('cetaphil-make-up-remover-177ml','Cetaphil Make-Up Remover 177ml','VAFY','Each',90,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/577f32b2-cbf2-41ea-a72b-fd50021eeaf7_1.c26cab221eb3a3af5e22efe0bfb8083e.webp?v=1713269556'),
  ('challenge-insect-repellent-camphor','Challenge Insect Repellent (Camphor)','VAFY','Each',8,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/cfd.jpg?v=1712782761'),
  ('chambers-pomade','Chambers Pomade','VAFY','Each',30,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/wp-image-12822723919961.jpg?v=1712864641'),
  ('chapter-2000','Chapter 2000','VAFY','Each',29,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/71bDXt39UfL._AC_UF1000_1000_QL80.jpg?v=1713207145'),
  ('charm-starch-spray-easy-iron','Charm Starch Spray & Easy Iron','VAFY','Each',26,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/71m7SGP5xhL.jpg?v=1713378294'),
  ('cherry-blossom-salt-scrub','Cherry Blossom Salt Scrub','VAFY','Each',65,false,false,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/images_b28ec65b-a8a4-4307-a7cc-7265056bc17a.jpg?v=1714591449'),
  ('chewable-vitamin-c-500mg-60s','Chewable Vitamin C 500mg 60s','VAFY','Each',65,false,false,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/s-l1600_3_6bd92b28-56a8-4449-832d-76633ee60fb8.jpg?v=1717435109'),
  ('chocho-cream','Chocho Cream','VAFY','Each',12,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download_77.jpg?v=1712783046'),
  ('chupa-chop-lip-balm','Chupa Chop Lip Balm','VAFY','Each',20,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/Chupa-Chups-Lip-Balm-Strawberry-Swirl2.webp?v=1714511047'),
  ('cien-floral-bouqet','Cien Floral Bouqet','VAFY','Each',48,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/CIENGG.jpg?v=1714582783'),
  ('cien-invisible-fresh','Cien Invisible Fresh','VAFY','Each',50,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/1_b945f2ac-5b45-4a1d-b418-d661aec6c2f2.jpg?v=1714589683'),
  ('cien-men','Cien Men','VAFY','Each',50,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/A64C4585BF987A4353D3A674E092558B0594CD4CA19958099DEA9463DE8BFF97.webp?v=1714581369'),
  ('cien-original','Cien Original','VAFY','Each',48,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/s-l1600_2.jpg?v=1714581973'),
  ('classic-intimate-wipes','Classic Intimate Wipes','VAFY','Each',10,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/WIPES.png?v=1712773582'),
  ('clean-and-clear-blackhead-scrub-150ml','Clean And Clear Blackhead Scrub 150ml','VAFY','Each',26.4,false,false,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/images_8.jpg?v=1713464469'),
  ('clean-sponge','Clean Sponge Facial Cleansing Pads','VAFY','Each',79,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/CBBDDF03-E889-4A5B-8C7F-70386FB16844.jpg?v=1714691786'),
  ('clear-essence-lotion','Clear Essence Lotion','VAFY','Each',111,false,false,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/clear.jpg?v=1713611505'),
  ('clear-essence-medicated-fade-cream-113-5','Clear Essence Medicated Fade Cream 113.5','VAFY','Each',111,false,false,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/Clear-essence.jpg?v=1713114671'),
  ('clere-cocoa-lotion','Clere Cocoa Lotion','VAFY','Each',42,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/frd.jpg?v=1713207853'),
  ('clere-cream','Clere Cream','VAFY','Each',48,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/000203398-3-1000x1000.jpg?v=1713208043'),
  ('coconut-salt-scrab','Coconut Salt Scrab','VAFY','Each',65,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/s-l1200_b9352093-2ed6-4055-934c-356acaa52d82.webp?v=1714591612'),
  ('coconut-salt-scrub-dead-sea','Coconut Salt Scrub Dead Sea','VAFY','Each',65,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/Dead-sea-salt.jpg?v=1714592375'),
  ('colgate-charcoal-toothbrush','Colgate Charcoal Toothbrush','VAFY','Each',15,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/SM102145564-8.jpg?v=1713385216'),
  ('colgate-first-smiles-0-5','Colgate First Smiles','VAFY','Each',32,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download_3_57551696-8070-4421-b360-d06548d252e7.jpg?v=1714672333'),
  ('colgate-first-smiles-0-2','Colgate First Smiles 0-2','VAFY','Each',32,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/colgate-first-smiles-0-2-packshot.jpg?v=1714671626'),
  ('colgate-mouthwash-500ml','Colgate Mouthwash 500ml','VAFY','Each',57,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/colg.jpg?v=1712851642'),
  ('collagen-peptides-gg','Collagen Peptides Gummies 60s','VAFY','Each',360,false,true,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/71lU-WGVNuL.jpg?v=1721075094'),
  ('colour-me-perfume-1','Colour Me Perfume','VAFY','Each',115,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/ccc.jpg?v=1712782058'),
  ('colour-me-perfume','Colour Me Perfume','VAFY','Each',96,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/ColourMeBlue100ml_Group_260x380_78d878dc-f434-42cd-ab21-b591dc011096.jpg?v=1712781744'),
  ('comfort-fab-cond','Comfort Fab Cond','VAFY','Each',65,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download_13_18f15f2f-e4e3-4085-90c6-c01361980f59.jpg?v=1713813984'),
  ('comfort-fab-cond-1-9l','Comfort Fab Cond 1.9l','VAFY','Each',69,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/2-fabric-conditioner-sense-of-pleasure-with-jasmine-fresh-7-original-imag9t4k7xvv9gmh.webp?v=1713814974'),
  ('comfort-fabric-cond','Comfort Fabric Cond','VAFY','Each',155,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/OM.jpg?v=1713464076'),
  ('cotton-100g','Cotton 100g','VAFY','Each',20,false,true,'OTC'::product_category,''),
  ('cotton-50g','Cotton 50g','VAFY','Each',12,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/FLMED100_PURECOTTONWOOLROLL50G.png?v=1713806115'),
  ('cotton-bud-s-s','Cotton Bud S/S','VAFY','Each',6,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/635253ab53bb346654635d5c-ear-cotton-swab-baby-infant-use-small.jpg?v=1712508204'),
  ('creightons-hand-cream','Creightons Hand Cream','VAFY','Each',35,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/prod13.png?v=1714593005'),
  ('crepe-bandage-2-inch','Crepe Bandage 2 Inch','VAFY','Each',7,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/523817ZD.jpg?v=1716288931'),
  ('crepe-bandage-3','Crepe Bandage 3""','VAFY','Each',8,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/white_cotton_crepe_bandage_-_3.webp?v=1713543675'),
  ('crepe-bandage-6','Crepe Bandage 6""','VAFY','Each',13,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/1_1_dca5e884-4cb5-4dce-8f68-d8b1abf67de2.jpg?v=1713549548'),
  ('crepe-bandage-elastic-4','Crepe Bandage Elastic 4''''','VAFY','Each',12,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/41SsWc1azFL.jpg?v=1713952941'),
  ('crepe-bandage-elastic-6','Crepe Bandage Elastic 6""','VAFY','Each',16,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/33823960_NjIwLTYyMC03YTJmZmI0MDRk.webp?v=1713552907'),
  ('cussons-powder','Cussons Powder','VAFY','Each',20,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/cusion.webp?v=1713206437'),
  ('dax-hair-pomade','Dax Hair Pomade','VAFY','Each',90,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/dax.jpg?v=1713204579'),
  ('dead-sea-salt-scrub-coconut','Dead Sea Salt Scrub Coconut','VAFY','Each',95,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/coconut-scrub_Artboard-1.jpg?v=1714509244'),
  ('dear-body-body-splash-2','Dear Body Body Splash','VAFY','Each',50,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/splash.jpg?v=1713297042'),
  ('dear-body-body-splash-1','Dear Body Body Splash','VAFY','Each',50,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/Dear-Body-Majestic-Fragrance-Mist-Fantastic-270ML.webp?v=1712855947'),
  ('dear-body-body-splash','Dear Body Body Splash','VAFY','Each',50,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/71O3YFG5sSL._AC_UF1000_1000_QL80.jpg?v=1712772177'),
  ('dear-body-gift-set-3-in-1','Dear Body Gift Set 3 In 1','VAFY','Each',137,false,false,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/dearbody-3-in-1-la-vanilla.webp?v=1713622105'),
  ('deep-fregrance','Deep Fregrance','VAFY','Each',145,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/61H4Wu3cuqL.jpg?v=1714593390'),
  ('defence-tea','Defence Tea','VAFY','Each',49,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/s-l1200_1.jpg?v=1714668999'),
  ('degree-deo-stick','Degree Deo Stick','VAFY','Each',72,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/degree.webp?v=1712787248'),
  ('degree-men-deodorant-ultra-clear','Degree Men Deodorant (Ultra Clear)','VAFY','Each',146,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/569CCD07-3DA5-4493-92E1-34A7FD932E46.jpg?v=1712526753'),
  ('derma-lip-balm','Derma Lip Balm','VAFY','Each',30,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/lip-balm-3-flavours.jpg?v=1714511407'),
  ('detangle-hair-brush','Detangle Hair Brush','VAFY','Each',20,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/des.webp?v=1713199412'),
  ('dettol','Dettol','VAFY','Each',70,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/DETTOL-500ML.jpg?v=1712850617'),
  ('devamin-multivitamin-syrup','Devamin Multivitamin Syrup','VAFY','Each',39,false,true,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/devamin.webp?v=1713216292'),
  ('dove-deo-spray-men-250ml','Dove Deo Spray Men','VAFY','Clean Comfort',46,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/oooo.jpg?v=1712164096'),
  ('dove-hand-cream','Dove Hand Cream','VAFY','Each',55,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/dove-body-love-restoring-care-hand-cream-75ml.webp?v=1714592597'),
  ('dove-roll-on-women','Dove Roll On Women','VAFY','Cucumber & green tea',21,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/DOVEROLLONWOMEN50M.jpg?v=1712004329'),
  ('dr-teals-wash','Dr. Teals Wash','VAFY','Each',150,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/Dr-Teals-Epsom-Salt-Body-Wash-Glow-Radiance-with-Vitamin-C-and-Citrus-Essential-Oils-24-Oz-Pack-of-3_3296cb47-f668-4cb5-a411-3ded034b5e5f.b9920f2f6233b80e77775c3a10e4b59c.webp?v=1713615954'),
  ('durex-feel-condom','Durex Feel Condom','VAFY','Each',14,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/869567186a736316a3606123cea4ee37.jpg?v=1713542118'),
  ('durex-play-lube-200ml','Durex Play Lube 200ml','VAFY','Each',220,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/product-image-1370912049.webp?v=1716469836'),
  ('e45-cream-50g','E45 Cream 50g','VAFY','Each',52,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/51DLC1GWn_L._AC_UF1000_1000_QL80.jpg?v=1716470173'),
  ('e45-lotion-500ml','E45 Lotion 500ml','VAFY','Each',143,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/IMG_5394.png?v=1738176217'),
  ('easy-check-pregnancy-test-in-a-box-pack','Easy Check Pregnancy Test (In A Box Pack)','VAFY','Each',11,false,true,'OTC'::product_category,''),
  ('easylife-vit-c','Easylife Vit C','VAFY','Each',59,false,true,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/EasyLife-Vitamin-C.jpg?v=1712008646'),
  ('ebin-lace-adhesive-spray','Ebin Lace Adhesive Spray','VAFY','Each',84,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/C_Wonder-Lace-Bond-Spray_PKG_80ml_Original_Front-min_1400x_c790e1ed-a4a3-45fe-b7a5-f20c3a4089d8.jpg?v=1713622252'),
  ('elizabeth-taylor-white-diamonds','Elizabeth Taylor White Diamonds','VAFY','Each',780,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/93075588-7903-4553-BB85-994C7728663E.jpg?v=1712522567'),
  ('energizer-aa-2','Energizer Aa*2','VAFY','Each',28,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/71Yd9y25okL._AC_UF894_1000_QL80.jpg?v=1713191079'),
  ('energizer-aaa-2','Energizer Aaa*2','VAFY','Each',40,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/R1450440_30.webp?v=1713037131'),
  ('ensure-original-nutritional-shake','Ensure Original Nutritional Shake','VAFY','Each',42,false,true,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/61IYlb5HYAL._AC_UF1000_1000_QL80.jpg?v=1712772434'),
  ('essential-embrocation-27ml','Essential Embrocation 27ml','VAFY','Each',17,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/s-l400.jpg?v=1713044245'),
  ('euthymol-t-paste','Euthymol T/Paste','VAFY','Each',48,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/67.jpg?v=1712501047'),
  ('eversheen-cream-b-s','Eversheen Cream B/S','VAFY','Each',32,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/sheen.jpg?v=1712783067'),
  ('ezy-dose-push-button-pill-case-am-pm','Ezy Dose Push Button Pill Case Am&Pm','VAFY','Each',145,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/F28B0B13-2E53-40EA-97AE-DFA2EE889E89.jpg?v=1712528451'),
  ('f-w-anti-blemish-pureskin-cream','F&W Anti Blemish Pureskin Cream','VAFY','Each',90,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/fair-white-fair-white-pureskin-anti-blemish-cream.webp?v=1713613159'),
  ('face-mask-black','Face Mask - Black','VAFY','Each',2,false,false,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/1_3162bce4-fe50-4ff8-9676-6d2a1f39fbbb.jpg?v=1713211678'),
  ('fair-white-exclusive-lotion','Fair & White Exclusive Lotion','VAFY','Each',250,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/51EIiv_2BBLsL._SL1096_1096x_d5427772-d623-423f-84e2-522ac9b74036.webp?v=1713115262'),
  ('faytex','Faytex','VAFY','Each',19,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/Photo_1680992400606.webp?v=1713036852'),
  ('feeder-in-bag','Feeder In Bag','VAFY','Each',52,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/Hac127679cc3e4b7aaa2dc4169ee7585cN.jpg_300x300_3edd2dc2-ed54-48f2-bf5a-b2e3c584c235.webp?v=1713469204'),
  ('feeder-in-box','Feeder In Box','VAFY','Each',40,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/FEED.jpg?v=1713467890'),
  ('femfresh-intimate-wash-250ml','Femfresh Intimate Wash 250ml','VAFY','Each',56,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/51QVP9ITEbL._SL1000.jpg?v=1713794156'),
  ('fiesta-condom-all-types','Fiesta Condom All Types','VAFY','Each',9,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/9c4ef7d58ce4e51a5489b743718c1afc.jpg_720x720q80.jpg?v=1713540311'),
  ('first-aid-bag-red','First Aid Bag Red','VAFY','Each',50,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/FullSizeRender.jpg?v=1714692882'),
  ('first-aid-bag-navy-2-in-1','First Aid Kit','VAFY','Each',280,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/rn-image_picker_lib_temp_2b553537-0007-48fc-924b-1ce7698792ea.jpg?v=1756154970'),
  ('fish-pacifier','Fish Pacifier','VAFY','Each',20,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/20.jpg?v=1713471095'),
  ('fishmonger-mackerel-fillets-in-tomato','Fishmonger Mackerel Fillets In Tomato','VAFY','Each',22,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/GSH728.jpg?v=1714671001'),
  ('fishmonger-sardine-in-sunflower','Fishmonger Sardine In Sunflower','VAFY','Each',22,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/31502061_NjIwLTYyMC02MzFiNzZjYWE0.webp?v=1714670878'),
  ('flushable-toilet-seat-covers','Flushable Toilet Seat Covers','VAFY','Each',60,false,true,'OTC'::product_category,''),
  ('fresh-breath','Fresh Breath','VAFY','Each',24,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download_c8b5de1b-89c9-400d-8072-a57f681b6bdd.jpg?v=1713384878'),
  ('fridge-odor-absorber','Fridge Odor Absorber','VAFY','Each',40,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/5060214390170.webp?v=1717442461'),
  ('fruiser-bath-gel-1l','Fruiser Bath Gel 1l','VAFY','Each',72,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/rrt.jpg?v=1712855532'),
  ('funtime-lubes-75mls','Funtime Lubes 75mls','VAFY','Each',51,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/D148F300-039A-429C-94C0-9AB0A068B8C4.jpg?v=1714512902'),
  ('galaxy-plus-xpose-deo-spray','Galaxy Plus Xpose Deo Spray','VAFY','Each',30,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/fd_3279acef-f9a6-41bf-a37d-998f9a35c2cf.jpg?v=1713379194'),
  ('gilette-sensor-3-shaving-stick-single-stick-6s','Gilette Sensor 3 Shaving Stick Single Stick 6s','VAFY','Each',130,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/81xXC-ao1TL.jpg?v=1718054749'),
  ('gilette-shave-gel','Gilette Shave Gel','VAFY','Each',55,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/images_f0642899-ccee-40d5-bc89-c4281ee11382.jpg?v=1718054884'),
  ('gillette-gel-stick','Gillette Gel Stick','VAFY','Each',52,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/gillet.jpg?v=1712774132'),
  ('gillette-guard','Gillette Guard','VAFY','Each',17,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/gillette_guard_razor_3pack_shave_gel.jpg?v=1713210359'),
  ('glo-power-multivitamin-caps','Glo Power Multivitamin Caps','VAFY','Each',23,false,true,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download-2024-04-19T185934.857.jpg?v=1713553226'),
  ('glow-body-butter','Glow Body Butter','VAFY','Each',165,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/rs_w_1200_h_1200.webp?v=1721077600'),
  ('glow-collagen-salicylic-acid','Glow Collagen & Salicylic Acid','VAFY','Each',110,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/s-l1600_5_d9aa86de-632c-4d6f-89d9-bd0ef3819ad8.jpg?v=1717439161'),
  ('glow-face-scrab','Glow Face Scrab','VAFY','Each',90,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/cc138ac9f0959b77fc7aac0b2c9362ff023e593f.jpg?v=1721078385'),
  ('glow-recipe-niacinamide-dew-drops-15mls','Glow Recipe Niacinamide Dew Drops 15mls','VAFY','Each',399,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/CB811BFF-3B4A-43CC-8CB8-9E8146280E3D.jpg?v=1712521930'),
  ('gold-standard-100-whey-protien-907g-1','Gold Standard 100% Whey Protien 907g','VAFY','Each',788,false,false,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/71iqezVcxZL._AC_UF894_1000_QL80.jpg?v=1721075796'),
  ('green-tea','Green Tea','VAFY','Each',45,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/GGGGDES.jpg?v=1714668099'),
  ('hair-brush-long','Hair Brush Long','VAFY','Each',20,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/brush.webp?v=1713200276'),
  ('haliborange-calcium-vitamin-d-60s-3-12years','Haliborange Calcium &Vitamin D 60s (3-12years)','VAFY','Each',120,false,true,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/HALI.jpg?v=1717244343'),
  ('hand-cleansing-gel-sachets-50pk','Hand Cleansing Gel Sachets 50pk','VAFY','Each',54,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/63568.jpg?v=1714580319'),
  ('harpic-tiolet-cleaner','Harpic Tiolet Cleaner','VAFY','Each',33,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/LE3047528.jpg?v=1713385797'),
  ('head-to-toe-eyelash-curler','Head To Toe Eyelash Curler','VAFY','Each',45,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/71rE_YPPFfL._AC_UF350_350_QL80.jpg?v=1738354124'),
  ('health-point-cold-sore-patches-15packs','Health Point Cold Sore Patches (15packs)','VAFY','Each',30,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/Untitled-1-1.jpg?v=1717437720'),
  ('heaven-camphor','Heaven Camphor','VAFY','Each',12,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/0009635_heaven-repellent-100g_510.jpg?v=1713102751'),
  ('heaven-mosquito-spray','Heaven Mosquito Spray','VAFY','Each',41,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download_8_c1669bb1-6ab6-4f60-91ec-211fb9232441.jpg?v=1713387942'),
  ('heaven-scent-bath','Heaven Scent Bath','VAFY','Each',50,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/scent.jpg?v=1713206922'),
  ('heaven-scent-body-lotion','Heaven Scent Body Lotion','VAFY','Each',30,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/1fbb7c5a-f27a-4063-8ff7-f9ceaa017cf3.webp?v=1712777824'),
  ('heaven-scent-cream','Heaven Scent Cream','VAFY','Each',24,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/ddd.webp?v=1712854517'),
  ('heinz-egg-custard','Heinz Egg Custard','VAFY','Each',15,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/0002797_heinz-egg-custard-120g_510.jpg?v=1713474792'),
  ('honey-pot-feminine-wash-sensitive','Honey Pot Feminine Wash (Sensitive)','VAFY','Each',260,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/69E59B5F-2838-45E8-A1E0-A4D3D8830ACB.jpg?v=1712522383'),
  ('hot-water-bottle','Hot Water Bottle','VAFY','Each',55,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/527255006_max.jpg?v=1712512568'),
  ('huggies-baby-wipes','Huggies Baby Wipes','VAFY','Each',22,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/hugies.jpg?v=1712849441'),
  ('hyaluronic-acid-serum-ampoles-7s','Hyaluronic Acid Serum Ampoles 7s','VAFY','Each',90,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download_8_d8aa9a88-4904-459f-a16c-fcd0719dafe1.jpg?v=1721079821'),
  ('imperial-leather-bar-soap','Imperial Leather Bar Soap','VAFY','Each',18,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/classic-bar.jpg?v=1713043772'),
  ('impluse-tease-150ml','Impluse Tease 150ml','VAFY','Each',45,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/4993_A.webp?v=1714501609'),
  ('infusion-giving-set','Infusion Giving Set','VAFY','Each',5,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/Medical-Consumable-Disposable-Titration-Infusion-Set-Infusion-Giving-Set-IV-Infusion-Set.webp?v=1713541445'),
  ('iv-cannula-green','Iv Cannula Green','VAFY','Each',2,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/iLife-IV-Cannula-Green-Home.png?v=1713545328'),
  ('iv-cannula-pink','Iv Cannula Pink','VAFY','Each',2,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/Canulapink_350x_cecbec81-4c12-4a2f-8e83-e07ce01be4bb.webp?v=1713543011'),
  ('izideen-kids-toothbrush','Izideen Kids Toothbrush','VAFY','Each',2,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/14216907_MzAwLTU2MC1lYTc4MzgxMGEx.webp?v=1713377252'),
  ('jeba-anti-dandruff-spray','Jeba Anti Dandruff Spray','VAFY','Each',23,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/jeba_hair_deodorizer_1290011177.jpg?v=1712782608'),
  ('jeba-pomade-m-s','Jeba Pomade M/S','VAFY','Each',34,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/61YKGxlBMfL._AC_UF894_1000_QL80.jpg?v=1713385121'),
  ('jennifers-baby-wipes-120s','Jennifer''s Baby Wipes 120s','VAFY','Each',28,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/81NEnQFW83L._AC_UF1000_1000_QL80.jpg?v=1713264848'),
  ('jergens-body-lotion-496ml','Jergens Body Lotion 496ml','VAFY','Each',175,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/400x800_JER_Oil-Infused-Moisturiser_Shea-Butter.jpg?v=1713111106'),
  ('jergens-body-lotion-621ml','Jergens Body Lotion 621ml','VAFY','Each',150,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/image_dd66cf7d-2732-4603-9d4e-a0b3b92ae0cc.webp?v=1713270028'),
  ('johnsons-aqueos-cream','Johnson''s Aqueos Cream','VAFY','Each',60,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/32332.webp?v=1713259238'),
  ('johnsons-baby-bath-500ml','Johnson''s Baby Bath 500ml','VAFY','Each',48,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/JOHNSONS-BABY-BATH-500ml.png?v=1712939114'),
  ('johnsons-baby-oil-500ml','Johnson''s Baby Oil 500ml','VAFY','Each',78,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/3574669909105.jpg?v=1713103520'),
  ('johnsons-baby-shampoo-300ml','Johnson''s Baby Shampoo 300ml','VAFY','Each',27,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/jns-baby-shampoo-gold-300ml-front-06-04-2022.png?v=1713260531'),
  ('johnsons-baby-shampoo-500ml','Johnson''s Baby Shampoo 500ml','VAFY','Each',55,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/JOHNSON-BABY-SHAMPOO-500ml.png?v=1713188979'),
  ('johnsons-baby-wipes-72s','Johnson''s Baby Wipes 72s','VAFY','Each',35,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/f115e138639f73d68159e90b09ee0616.jpg?v=1713265238'),
  ('johnsons-jelly','Johnson''s Jelly','VAFY','Each',42,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/c1123765-15c2-4f39-bee7-b710d034bf5c.__CR0_0_970_600_PT0_SX970_V1.jpg?v=1713615267'),
  ('johnsons-lotion-b-s','Johnson''s Lotion B/S','VAFY','Each',58,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/jns_381371175604_500ml_00000_1000wx1000h.jpg?v=1712774779'),
  ('johnsons-powder','Johnson''s Powder','VAFY','Each',48,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/johnsons-baby-regular-powder-500g.png?v=1712864025'),
  ('johnsons-powder-1','Johnson''s Powder','VAFY','Each',42,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/johnsons-baby-regular-powder-500g_1.png?v=1713385478'),
  ('johnsons-shiny-drops-shampoo-500ml','Johnson''s Shiny Drops Shampoo 500ml','VAFY','Each',33,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/shiny-drops-kids-shampoo-front.jpg?v=1713189913'),
  ('johnsons-v-rich-lot-papaya-400ml','Johnson''s V/Rich Lot.Papaya 400ml','VAFY','Each',30,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/61SGar5r9NL._AC_UF1000_1000_QL80.jpg?v=1713370078'),
  ('johnsons-v-rich-lotion-rose-water','Johnson''s V/Rich Lotion+ Rose Water','VAFY','Each',30,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/vita-rich-smoothies-rose-400ml-1024x1024.jpg?v=1713266854'),
  ('johnsons-yoghurt-lot-peach','Johnson''s Yoghurt Lot. Peach','VAFY','Each',30,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/QhMAYN6BF0zWxWRCeS1iXB0eTNDPDSCr95AGNevI.webp?v=1713370470'),
  ('kamill-hand-nail-cream','Kamill Hand & Nail Cream','VAFY','Each',35,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/s-l1200_1_e7e43431-0613-455b-8aae-47cefffc75c4.webp?v=1714596651'),
  ('kel-kids-toothpaste','Kel Kids Toothpaste','VAFY','Each',14,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/kel-kids-300x300.jpg?v=1713384302'),
  ('ketazol-shampoo-100ml','Ketazol Shampoo 100ml','VAFY','Each',64,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/kY3CwwPV5mDGLh5lkDlcRZgqCBxxG6-metaQVBDXzE2ODQucG5n--medium.webp?v=1712508991'),
  ('kids-spoon','Kids Spoon','VAFY','Each',50,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/THEEE.webp?v=1714598767'),
  ('kids-toothbrush-multipack','Kids Toothbrush Multipack','VAFY','Each',35,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/jrpxxnehecs1.jpg?v=1714508193'),
  ('killit-mosquito-spray','Killit Mosquito Spray','VAFY','Each',39,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download_9_1e2c1c5d-4edf-4313-9308-e6b01a4950d5.jpg?v=1713388064'),
  ('kiss-condom-all-types','Kiss Condom All Types','VAFY','Each',6,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/1VGFIHFzjzgqnRIaoB3UNORE35bkGm-metaS2lzcyBDb25kb20gKDMgcGllY2VzKSB4MS5wbmc_--large.png?v=1713533540'),
  ('kleen-shave-razor-blades','Kleen Shave Razor Blades','VAFY','Each',3,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/1690871505701-orig.jpg?v=1713379498'),
  ('kuza-hair-pommade-226g-m-s','Kuza Hair Pommade 226g M/S','VAFY','Each',48,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/615CPTKZJ3L.jpg?v=1712861769'),
  ('lavet-feminine-wash','Lavet Feminine Wash','VAFY','Each',45,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download_78.jpg?v=1712783310'),
  ('lemon-ginger-tea','Lemon & Ginger Tea','VAFY','Each',45,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/lemon-n-ginger.png?v=1714668809'),
  ('lenor-fab-cond-1-75l','Lenor Fab Cond 1.75l','VAFY','Each',72,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/s-l1200_2_87d0271c-fd91-4304-af0b-c5d5f899a6b1.webp?v=1713815506'),
  ('loral-men-expert-250mls','Loral Men Expert 250mls','VAFY','Each',65,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/0011937_loreal-men-expert-anti-perspirantthermic-resist-250ml_510.jpg?v=1714590385'),
  ('lux-shower-gel','Lux Shower Gel','VAFY','Each',48,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/lux.jpg?v=1712783428'),
  ('lynx-shower-gel-500ml','Lynx Shower Gel 500ml','VAFY','Each',45,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/71nbR1NblUL._AC_UF894_1000_QL80.jpg?v=1713110736'),
  ('magic-shaving-cream','Magic Shaving Cream','VAFY','Each',130,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/aqaq.jpg?v=1713205119'),
  ('magsafe-car-mount','Magsafe Car Mount','VAFY','Each',195,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/CB9584E5-48B7-4419-BACA-D94912F8F57B.jpg?v=1712602517'),
  ('malazia-deo-spray-l-s','Malazia Deo Spray L/S','VAFY','Each',30,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/Malizia-Uomo-Vetyver-Spray.jpg?v=1712856984'),
  ('mamia-baby-food-pouch','Mamia Baby Food Pouch','VAFY','Each',33,false,false,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/ALDIs-Mamia-100-Organic-Baby-Food-Pouches-Review-A-Mum-Reviews.jpg?v=1721080419'),
  ('mates-comfort-condoms','Mates Comfort Condoms','VAFY','Each',95,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download_2_d95eb120-9b73-439b-a0fd-b800c226b035.jpg?v=1717432573'),
  ('mates-orgazmax-extreme-dotted-condoms','Mates Orgazmax Extreme Dotted Condoms','VAFY','Each',120,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download_3_bc137b83-a5fb-48e6-93ca-a68de4015708.jpg?v=1717432893'),
  ('mates-protect','Mates Protect','VAFY','Each',95,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download_4_1ce0d74d-0334-48c7-a0e6-c2432618c740.jpg?v=1717433366'),
  ('mates-ultra-thin-condoms','Mates Ultra Thin Condoms','VAFY','Each',95,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/mates-ultra-thin-condoms-6x9-pack_720x_f1c246d4-d26e-40a1-aeea-8a113e3f4c57.webp?v=1717433573'),
  ('menopace-uk','Menopace Uk','VAFY','Each',108,false,true,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/71WZRkvCzhL._AC_UF894_1000_QL80.jpg?v=1713208426'),
  ('methylated-spirit-60ml','Methylated Spirit 60ml','VAFY','Each',5,false,true,'OTC'::product_category,''),
  ('mgl-hair-food','Mgl Hair Food','VAFY','Each',54,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/71kCkoc99QL._AC_UL210_SR210_210.jpg?v=1713382033'),
  ('minlu-multi-charging-cable','Minlu Multi Charging Cable','VAFY','Each',195,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/DB705560-6EAD-47B3-82AD-4236C63FBCFE.jpg?v=1712601403'),
  ('miracase-car-phone-holder','Miracase Car Phone Holder','VAFY','Each',380,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/49E0D636-CFCC-4D75-B220-A83A45F4960F.jpg?v=1712602156'),
  ('moln-xl-weekly-pill-organiser-pink','Moln Xl Weekly Pill Organiser (Pink)','VAFY','Each',140,false,false,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/06A67332-C1A0-4411-8B1D-1E370845CBE5.jpg?v=1712526932'),
  ('moln-xl-weekly-pill-organizer-pink','Moln Xl Weekly Pill Organizer (Pink)','VAFY','Each',140,false,false,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/61QToA5ABnL.jpg?v=1716466393'),
  ('morning-fresh','Morning Fresh','VAFY','Each',22,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/sparxyz993.jpg?v=1713386103'),
  ('mr-muscle-window-cleaner-750ml','Mr Muscle Window Cleaner 750ml','VAFY','Each',33,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/5000204718140_00.default_460x_2x_d941cd8a-5822-4bf1-b340-ade6aef5f3cd.webp?v=1713806838'),
  ('muscle-tech-nitro-tech-whey-protien-998g','Muscle Tech Nitro Tech Whey Protien 998g','VAFY','Each',830,false,false,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/6137g2GLdWL._AC_UF350_350_QL80.jpg?v=1721075594'),
  ('mycota-athletes-foot-cream','Mycota Athlete''s Foot Cream','VAFY','Each',75,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/1_5008cb75-cc65-4cd1-bba3-b1182ed009d7.png?v=1721078776'),
  ('nair-hair-remover','Nair Hair Remover','VAFY','GREEN',71,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/s-l640.jpg?v=1717438816'),
  ('nan-1','Nan 1','VAFY','Each',114,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download_2_d86538dc-e070-43a5-8b7e-77a1a9a243c7.jpg?v=1713386539'),
  ('nan-2','Nan 2','VAFY','Each',114,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/3-4.jpg?v=1713386699'),
  ('nature-made-b-complex-c-140s','Nature Made B Complex + C 140s','VAFY','Each',204,false,true,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/71R8n4VCi8L.jpg?v=1720813750'),
  ('nature-made-c-d3-zinc-60s','Nature Made C + D3 + Zinc 60s','VAFY','Each',200,false,true,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/Nature-Made-Super-C-with-Vitamin-D3-and-Zinc-Dietary-Supplement-for-Immune-Support-60-Tablets-60-Day-Supply_d362c5fa-3cb5-4e44-9251-dab4858d8507.4a1531250eb9f53eb1edf5461f0b96ec.webp?v=1720813315'),
  ('nature-made-calcium-600mg-d3-220s','Nature Made Calcium 600mg+D3 (220s)','VAFY','Each',515,false,true,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/NM2508PK001256CALCIUM_5A009400ccfront_1500x_ecef17b0-ed67-4a0e-9c07-e33bb91bf96d.webp?v=1720816718'),
  ('nature-made-collagen-gummies-60-counts','Nature Made Collagen Gummies 60 Counts','VAFY','Each',380,false,true,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/71XrgUw049L.jpg?v=1720817196'),
  ('nature-made-collagen-peptides-power-317-8g','Nature Made Collagen Peptides Power (317.8g)','VAFY','Each',580,false,true,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/71mfMPnPIuL.jpg?v=1720817683'),
  ('nature-made-hair-skin-nails-150s','Nature Made Hair Skin &Nails 150s','VAFY','Each',330,false,true,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/71yiz5qJmGL.jpg?v=1721074249'),
  ('nature-made-iron-65mg-180s','Nature Made Iron 65mg 180s','VAFY','Each',202,false,true,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/images_1_58b6d246-087c-4bbb-a3bf-cc0d524307ee.jpg?v=1720818485'),
  ('nature-made-stress-relief-40s','Nature Made Stress Relief 40s','VAFY','Each',410,false,false,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/71nnNvVNxJL._AC_UF1000_1000_QL80.jpg?v=1721074621'),
  ('nature-made-vitamin-c-gummies-500mg-60s','Nature Made Vitamin C Gummies 500mg 60s','VAFY','Each',168,false,true,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/Nature-Made-Extra-Strength-Dosage-Vitamin-C-500-mg-Per-Serving-Gummies-60-Count_fe8bc314-0035-4636-a7cc-632e1f8b45db.5394a011f4b308781859ca36dee2d041.webp?v=1720818831'),
  ('nature-made-vitamin-e-400-iu-180mg-100s','Nature Made Vitamin E 400iu 180mg 100s','VAFY','Each',298,false,true,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/716V914Q5DL.jpg?v=1721074833'),
  ('natures-bounty-gummies','Nature''s Bounty Gummies','VAFY','Each',240,false,true,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/DjNfyx4VsAAoHpU.jpg?v=1713262991'),
  ('nature-s-bounty-gummies','Nature’S Bounty Gummies','VAFY','200',320,false,true,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/AC895A36-2047-4623-A305-6FAD792AC50D.jpg?v=1712359674'),
  ('nescafe-gold','Nescafe Gold','VAFY','Each',100,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/nes.jpg?v=1713376992'),
  ('nestle-cerelac','Nestle Cerelac','My Store','Wheat with Milk',42,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/cerelac.jpg?v=1711835345'),
  ('neutrogena-acne-wash','Neutrogena Acne Wash','VAFY','Each',174,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/njjl.jpg?v=1713611708'),
  ('neutrogena-blackhead-facial-scrub','Neutrogena Blackhead Facial Scrub','VAFY','Each',48,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/000.jpg?v=1712163429'),
  ('neutrogena-oil-balancing-facial-scrub','Neutrogena Oil Balancing Facial Scrub','VAFY','Each',48,false,false,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/ntg_3574661498492_emea_oil_balancing_daily_exfoliator_150ml_994533623_000.jpg?v=1713109178'),
  ('neutrogena-pink-grapefruit-facial-scrub','Neutrogena Pink Grapefruit Facial Scrub','VAFY','Each',40,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/neutrogena-1590673105.jpg?v=1713265501'),
  ('neutrogena-visibly-clear-scrub-spot','Neutrogena Visibly Clear Scrub Spot','VAFY','Each',57,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/221017_s06_clear_defend_wash_mask_lr.jpg?v=1712849901'),
  ('nido-1','Nido +1','VAFY','Each',73,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/lait-de-croissance-nestle_-nido-1_---1-3-ans---900g.jpg?v=1713125785'),
  ('nido-tin','Nido Tin','VAFY','Each',78,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/NIDO-FORTIFIED-MILK-POWDER-900G.jpg?v=1713380120'),
  ('nivea-b-w-roll-on','Nivea B&W Roll On','VAFY','Each',25,false,false,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download_31_c1e4ca5c-813d-4bf9-9254-93d7e7e5e6e3.jpg?v=1713465023'),
  ('nivea-body-lotion-400ml-rich-nourishing','Nivea Body Lotion 400ml Rich Nourishing','VAFY','Each',63,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/NIVEA-RICH-NOURISHING-BODY-LOTION.png?v=1713037536'),
  ('nivea-body-lotion-radiant-beauty','Nivea Body Lotion Radiant & Beauty','VAFY','Each',103,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/2_980593cd-8325-45ef-b1f8-e09aff6f39cf.jpg?v=1713380417'),
  ('nivea-day-cream','Nivea Day Cream','VAFY','Each',68,false,true,'OTC'::product_category,''),
  ('nivea-deo-spray','Nivea Deo Spray','VAFY','Each',54,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/mm.jpg?v=1712160501'),
  ('nivea-deo-spray-men','Nivea Deo Spray Men','VAFY','Each',44,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/b3d1ba7b87c446738b0a663c21470446-web_1010x1180_transparent_png.webp?v=1713813455'),
  ('nivea-deo-spray-women-150ml','Nivea Deo Spray Women 150ml','VAFY','Each',43,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/Nivea-Ladies-Deo-150ml-Ass-1.jpg?v=1712943540'),
  ('nivea-deo-stick-women-50ml','Nivea Deo Stick Women 50ml','VAFY','Each',30,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/NiveaDeoStickDryComfort50ml.webp?v=1713104113'),
  ('nivea-q10-sheet-facial-mask','Nivea Q10 Sheet Facial Mask','VAFY','Each',53,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/81_91w5sCtL._AC_UF1000_1000_QL80.jpg?v=1718126253'),
  ('nivea-roll-on-men','Nivea Roll On Men','VAFY','Each',25,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/fgfg.webp?v=1712075238'),
  ('nivea-roll-on-women','Nivea Roll On Women','VAFY','Each',24,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/Default-Product-Default-WF-null.jpg?v=1712073526'),
  ('nivea-soft-hand-cream','Nivea Soft Hand Cream','VAFY','Each',49,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/719siAPsHFL._AC_UF1000_1000_QL80.jpg?v=1714592787'),
  ('nix-sardines-in-sunflower','Nix Sardines In Sunflower','VAFY','Each',22,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/s-l1200_2_52766b96-bdcc-4d0e-8de6-7ae8f9878223.webp?v=1714669774'),
  ('nix-sardines-in-tomato-sauce','Nix Sardines In Tomato Sauce','VAFY','Each',22,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/s-l1200_3.webp?v=1714670571'),
  ('now-super-enzymes-90s','Now Super Enzymes 90s','VAFY','Each',395,false,true,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/00514210438587-00514210438587-90s_01_1.webp?v=1720819982'),
  ('nuage-cooling-gel-eye-mask','Nuage Cooling Gel Eye Mask','VAFY','Each',45,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/71NcCV1SogL._AC_UF894_1000_QL80.jpg?v=1714512364'),
  ('nutra-blast-boric-acid-vaginal-suppositories','Nutra Blast Boric Acid Vaginal Suppositories','VAFY','Each',357,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/43209A03-3E17-4690-929F-3DDAAFE0309A.jpg?v=1712522882'),
  ('nutrablast-disposable-vaginal-suppository-applicators','Nutrablast Disposable Vaginal Suppository Applicators','VAFY','Each',20,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/6DD9D4D7-92D2-460C-A1D6-88D33C7FA3C1.jpg?v=1712523470'),
  ('nutrilac','Nutrilac','VAFY','Each',37,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download_11_673d3d57-96b6-4e41-b98e-93d81177560c.jpg?v=1713811249'),
  ('odor-eaters-foot-and-shoe-spray','Odor Eaters Foot And Shoe Spray','VAFY','Each',120,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/EPE108.jpg?v=1721078834'),
  ('olay-body-lotion-502ml','Olay Body Lotion 502ml','VAFY','Each',263,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/36D77E93-02A2-4435-A15E-3328714E103E.jpg?v=1713863130'),
  ('olay-body-wash','Olay Body Wash','VAFY','Each',262,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/Olay-Body-Wash-591ml-sugarcocoa-exfoliating.webp?v=1713211238'),
  ('olay-total-effect','Olay Total Effect','VAFY','Each',275,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/OLY.webp?v=1713465106'),
  ('old-spice-stick','Old Spice Stick','VAFY','Each',75,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/61gAvVJFUwL._SL1500.jpg?v=1713464314'),
  ('olive-oil-mouse','Olive Oil Mouse','VAFY','Each',27,false,false,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/Ors-olive-oil-mousse-1.jpg?v=1713382235'),
  ('one-a-day-womens-gummies-170s','One A Day Women''s Gummies 170s','VAFY','Each',440,false,false,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/One-A-Day-Women-s-Gummy-Multivitamin-Multivitamins-for-Women-170-Ct_af7737c6-6080-467e-96e0-c06532d5c54d.734d4f77997d50d93fa29a9bcf677120.webp?v=1721076363'),
  ('onetouch-select-plus-glucometer','Onetouch Select Plus Glucometer','VAFY','Each',600,false,false,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/CombinedUnit.png?v=1713303193'),
  ('only-pacifier','Only Pacifier','VAFY','Each',25,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/25.png?v=1713471855'),
  ('ophylia-perfume-80ml','Ophylia Perfume 80ml','VAFY','Each',110,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/1_1.jpg?v=1713112778'),
  ('oral-b-kids-toothbrush-1','Oral B Kids Toothbrush','VAFY','Each',21,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/file.jpg?v=1713809742'),
  ('otrivin-nasal-drops-0-05-child','Otrivin Nasal Drops 0.05% (Child)','VAFY','Each',70,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download-2024-04-19T193141.865.jpg?v=1713555107'),
  ('palmers-cream','Palmers Cream','VAFY','Each',120,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/Heals-Soften.jpg?v=1713113659'),
  ('palmers-lotion','Palmers Lotion','VAFY','Each',108,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/6136H2MfOcS._SL1500.jpg?v=1713385284'),
  ('palmers-skin-therapy-oil-150ml','Palmers Skin Therapy Oil 150ml','VAFY','Each',132,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download_jpeg.jpg?v=1713267892'),
  ('palmers-stretch-marks-massage-cream','Palmers Stretch Marks Massage Cream','VAFY','Each',133,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/palmer-s-cocoa-butter-massage-cream-for-stretch-marks-125g.webp?v=1718136370'),
  ('palmolive-bath','Palmolive Bath','VAFY','Each',70,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/pal.jpg?v=1712770362'),
  ('pampers-wipes','Pampers Wipes','VAFY','Each',22,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/pimp.jpg?v=1712849593'),
  ('paradise-powder','Paradise Powder','VAFY','Each',25,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/504770156d3aaa2a6a74feb894e604afb63f00b2.webp?v=1712862340'),
  ('paradise-powder-s-s','Paradise Powder S/S','VAFY','Each',15,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/il_1140xN.4755918838_hqvb.webp?v=1712862731'),
  ('parfum-de-pallazzo-roma','Parfum De Pallazzo Roma','VAFY','Each',156,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/s-l1200_4716fa7a-dd4c-40a7-b9e1-4e7e3a3987b0.webp?v=1713465412'),
  ('pascual-500g','Pascual 500g','VAFY','Each',44,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download_db47a436-c225-4f33-8fab-4251fad8a64c.jpg?v=1712346695'),
  ('passion-powder-m-s','Passion Powder M/S','VAFY','Each',12,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/gg.webp?v=1713614692'),
  ('passport-cover-double','Passport Cover (Double)','VAFY','Each',110,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/E347F0A8-3889-4B7E-BA33-2BBE38EB1BA1.jpg?v=1714691364'),
  ('passport-cover-single','Passport Cover (Single)','VAFY','Each',55,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/76421FF5-DEC4-4523-87B6-4C6FBB50FDEA.jpg?v=1714691310'),
  ('peach-perfect-booty-builder-272g','Peach Perfect Booty Builder 272g','VAFY','Each',788,false,true,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/3_grande_1992cd8c-4372-4768-9afa-73a0f8e633f4.webp?v=1721075447'),
  ('pears-soap-125g','Pears Soap 125g','VAFY','Each',28,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/pearssoap2.jpg?v=1712854083'),
  ('pepsi-lip-balm','Pepsi Lip Balm','VAFY','Each',90,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/090ae36afe1c9dc5240912a5da5cfee1.jpg?v=1717439253'),
  ('perfumers-choice-gift-set-50ml-victor-mojo','Perfumer''s Choice Gift Set 50ml Victor/Mojo','VAFY','Each',150,false,false,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/1_2_5980b6af-4405-4ce4-812f-a27f4fe07836.jpg?v=1713813198'),
  ('pink-nail-clip','Pink Nail Clip','VAFY','Each',17,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/C6A98801-D57F-42D2-86F7-60E859AF56B6.jpg?v=1712600611'),
  ('plastic-cup-with-lid-straw','Plastic Cup With Lid/Straw','VAFY','Each',25,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/HI.webp?v=1713463234'),
  ('pour-innocence-women-perfume-100ml','Pour Innocence Women Perfume 100ml','VAFY','Each',85,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/61z73LbssZL._AC_UF1000_1000_QL80.jpg?v=1713816994'),
  ('power-bank','Power Bank','VAFY','Each',185,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/70550D9B-F87C-4667-BAED-4D431F51D7AE.jpg?v=1712603297'),
  ('power-zone-b-s','Power Zone B/S','VAFY','Each',17,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/power-zone.jpg?v=1712506205'),
  ('pregnancy-test-kit-levon-2','Pregnancy Test Kit (Levon 2)','VAFY','Each',4,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/PregnancyTestCassette_Levon2_25_s.png?v=1713542522'),
  ('pregnancy-test-strip-p-trust-1s','Pregnancy Test Strip (P-Trust) 1s','VAFY','Each',4,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/PregnancyTestCassette1_s.jpg?v=1713542566'),
  ('pretty-lip-balm','Pretty Lip Balm','VAFY','Each',15,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/vera.jpg?v=1713197878'),
  ('pretty-panty-liners-30s','Pretty Panty Liners','VAFY','Each',15,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/0010864_pretty-intimate-panty-liners_1920.jpg?v=1712169381'),
  ('propa-pad','Propa Pad','VAFY','Each',21,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/PC-13_3312.jpg?v=1713111522'),
  ('protocol-perfume-100ml','Protocol Perfume 100ml','VAFY','Each',160,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/41Zg2OxsaCL._SR600_315_PIWhiteStrip_BottomLeft_0_35_PIStarRatingTHREEANDHALF_BottomLeft_360_-6_SR600_315_SCLZZZZZZZ_FMpng_BG255_255_255.png?v=1713816375'),
  ('pumice-sponge','Pumice Sponge','VAFY','CREAM',25,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/c26af6ec-a4fe-4019-9385-7082519c5224.668a8a21a400ae0c87adcc108e6d4383.webp?v=1714579966'),
  ('purity-200mls-m-s','Purity 200mls M/S','VAFY','Each',20,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/10139496EA-checkers515Wx515H.png?v=1713555632'),
  ('purity-80mls-s-s','Purity 80mls S/S','VAFY','Each',15,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/01_100415625_SI_00.webp?v=1713471430'),
  ('queen-elizabeth-cream','Queen Elizabeth Cream','VAFY','Each',17,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/000_c12072f0-83e3-4cb5-9c36-007abc76080b.jpg?v=1712858624'),
  ('queen-elizabeth-cream-500ml-b-s','Queen Elizabeth Cream 500ml B/S','VAFY','Each',33,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/20210725_175343_2_1200x1200_298ddfb2-b39c-44b4-baa2-a7b884647376.webp?v=1713043190'),
  ('queen-elizabeth-lotion-400ml-m-s','Queen Elizabeth Lotion 400ml M/S','VAFY','Each',18,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/61FQvsCKhkL._AC_UF1000_1000_QL80.jpg?v=1712858782'),
  ('qustere-pimple-patches','Qustere Pimple Patches','VAFY','Green',60,false,false,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/EEB7C75F-5792-4E7C-9532-A1FC968D7095.jpg?v=1712525226'),
  ('radient-rose-scrub','Radient Rose Scrub','VAFY','Each',65,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/399400-skin-techniques-radiant-rose-body-salt-scrub.jpg?v=1714592505'),
  ('rare-pearls-perfume-50ml','Rare Pearls Perfume 50ml','VAFY','Each',135,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/s-l1200_1_3b4d6746-35a3-4848-a204-e245102aafef.webp?v=1713815872'),
  ('revitalize-healthcare-cod-liver-oil','Revitalize Healthcare Cod Liver Oil','VAFY','Each',120,false,true,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/AA.jpg?v=1717242988'),
  ('revitalize-healthcare-omega3-fishoil-100mg-90s','Revitalize Healthcare Omega3 Fishoil 100mg 90s','VAFY','Each',140,false,true,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/FISD.jpg?v=1717242193'),
  ('rexona-deo-spray-men-72h','Rexona Deo Spray Men 72h','VAFY','Each',28,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/rex.jpg?v=1712165299'),
  ('diya-dried-mango-chips','Rexona Deo Spray Women','VAFY','Each',29,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/71Nkh0NwSZL.jpg?v=1712008822'),
  ('rexona-roll-on-45ml-men','Rexona Roll On 45ml Men','VAFY','Each',16,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/gg.jpg?v=1712160963'),
  ('right-gaurd-deo-women','Right Gaurd Deo Women','VAFY','Each',28,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/785.webp?v=1712857628'),
  ('right-guard-deo-spray','Right Guard Deo Spray','VAFY','Each',35,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/rightguard-women-250ml-soft.webp?v=1714590705'),
  ('right-guard-deo-women-250ml','Right Guard Deo Women 250ml','VAFY','Each',28,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/51p3ydDHTGL._AC.jpg?v=1714501217'),
  ('rough-rider-condom-3s','Rough Rider Condom 3s','VAFY','Each',24,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/18575068_NjIwLTgyNy1lZmZjMzc4MzVj.webp?v=1713547844'),
  ('roushun-vitamin-c-serum','Roushun Vitamin C Serum','VAFY','Each',36,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/77.jpg?v=1712860073'),
  ('royal-giorgio-blue-perfume-100ml','Royal Giorgio Blue Perfume 100ml','VAFY','Each',120,false,false,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/images_1.jpg?v=1713267313'),
  ('sabalon-mousse','Sabalon Mousse','VAFY','Each',28,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/504df44079183759a9561f42fcccc6a9.jpg?v=1713042646'),
  ('sairo-baby-shampoo','Sairo Baby Shampoo','VAFY','Each',21,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/img_9534.jpg?v=1712862016'),
  ('sairo-bath-gel','Sairo Bath Gel','VAFY','Each',30,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/siro.jpg?v=1712777415'),
  ('sairo-hand-wash-500ml','Sairo Hand Wash 500ml','VAFY','Each',17,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/71pnYMMGcFL.jpg?v=1713806625'),
  ('sanex-bath-650ml','Sanex Bath 650ml','VAFY','Each',60,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/8718951293946___M.jpg?v=1713457279'),
  ('sasylvia-watches','Sasylvia Watches','VAFY','BLACK',30,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/88.jpg?v=1712072376'),
  ('scholl-athlete-foot-spray','Scholl Athlete Foot Spray','VAFY','Each',180,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/61m6WXfl4_L.jpg?v=1721078633'),
  ('sensodyne-original-t-paste','Sensodyne Original T/Paste','VAFY','Each',43,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/new.jpg?v=1712513482'),
  ('shea-butter-mouse','Shea Butter Mouse','VAFY','Each',79,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/american-silky-straight-shea-butter-foam-wrap-mousse-8oz-19.jpg?v=1713384466'),
  ('shesangel-electric-heating-pad','Shesangel Electric Heating Pad','VAFY','Each',300,false,false,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/61iFNJ-aeoL.jpg?v=1720811836'),
  ('silver-line-powder','Silver Line Powder','VAFY','Each',16,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/67a3b0_d6de6ae7b61e4832b4840151734e2083_mv2.webp?v=1713614551'),
  ('simple-pure-bar-soap-twin-pack','Simple Pure Bar Soap','VAFY','Each',14,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/1_1_03ab3b8c-3c3e-4975-9bd6-e6738d37a8cb.jpg?v=1717440699'),
  ('sister-powder','Sister Powder','VAFY','Each',20,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/sis.webp?v=1713614433'),
  ('six-flower-powder','Six Flower Powder','VAFY','Each',20,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/il_300x300.5010237296_srmu.webp?v=1713614884'),
  ('skin-aqua-sunscreen','Skin Aqua Sunscreen','VAFY','Each',228,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/3F6EEE3E-3FF9-49C3-A2D4-2B93DB39A645.jpg?v=1713615624'),
  ('skin-treats-vit-e-hydrogel-facial-mask','Skin Treats Vit E Hydrogel Facial Mask','VAFY','Each',27,false,false,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/VITAMIN-E-HYDROGEL-FCE-MASK-5-060563-215230_500x500_1791d8a5-2020-4af6-964f-46f039f3b923.webp?v=1721079000'),
  ('slub-glass-leather-bottle','Slub Glass Leather Bottle','VAFY','Each',35,false,false,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/glass.jpg?v=1713207579'),
  ('sma-1','Sma 1','VAFY','Each',175,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/sma1.webp?v=1713812279'),
  ('smart-black-perfume-100ml','Smart Black Perfume 100ml','VAFY','Each',124,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/1_fffbc9f5-0936-4d67-826f-9d97b77d8215.jpg?v=1713620882'),
  ('smart-perfume-boss-orange','Smart Perfume - Boss Orange','VAFY','Each',80,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/RRR.jpg?v=1713465652'),
  ('so-carrot-brightening-oil','So Carrot Brightening Oil','VAFY','Each',238,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/31f6dDBIdsL._SR600_315_PIWhiteStrip_BottomLeft_0_35_PIStarRatingFOUR_BottomLeft_360_-6_SR600_315_ZA45_445_290_400_400_AmazonEmberBold_12_4_0_0_5_SCLZZZZZZZ_FMpng_BG255_255_255.png?v=1713613796'),
  ('so-white-fade-cream','So White Fade Cream','VAFY','Each',247,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/FW-SoWhite-CremeSkinPerfector-250ml-b.jpg?v=1713612221'),
  ('softcare-pad','Softcare Pad','VAFY','Each',14,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/ssss.jpg?v=1713376545'),
  ('st-ives-facial-scrub','St Ives Facial Scrub','VAFY','Each',48,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/54322EB0-5943-473C-AD9B-23BFA6068594.jpg?v=1712089862'),
  ('st-ives-lotion','St Ives Lotion','VAFY','Each',100,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download_9_1ee98afd-1852-46d8-a54b-cebc8172afff.jpg?v=1713804395'),
  ('stanley-flip-straw-tumbler','Stanley Flip Straw Tumbler','VAFY','Each',530,false,false,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/C7AA1D4C-8937-487C-B36D-034B817C2C2A.jpg?v=1712600907'),
  ('stretch-mark-oil','Stretch Mark Oil','VAFY','Each',65,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/STYREE.webp?v=1714593293'),
  ('style-up-pomade','Style Up Pomade','VAFY','Each',21,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/Style-Up-Wave-Gel-Pomade-in-Accra-Metropolitan-Hair.jpg?v=1712859030'),
  ('sugar-test','Sugar Test','VAFY','Each',10,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download_37_b455c80e-0a3d-4a9c-b733-67267a37bf31.jpg?v=1713540735'),
  ('summers-eve-lavender-refreshing-wash','Summer''s Eve Lavender Refreshing Wash','VAFY','Each',105,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/LVENDER.webp?v=1721073473'),
  ('summers-eve-odor-protection-intimate-wash','Summer''s Eve Odor Protection Intimate Wash','VAFY','Each',150,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/8bc30d65-ee4a-4525-ba1d-79db50212976.__CR0_0_600_450_PT0_SX600_V1.jpg?v=1721073577'),
  ('summers-eve-refresher-intimate-mist-55-89mls','Summer''s Eve Refresher Intimate Mist 55.89mls','VAFY','Each',105,false,true,'OTC'::product_category,''),
  ('summers-eve-spa-calming-luxious-wash','Summer''s Eve Spa Calming Luxious Wash','VAFY','Each',215,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/spa-wash-summers-eve.png?v=1721073541'),
  ('supa-santi-large-diaper','Supa Santi Large Diaper','VAFY','Each',225,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/IMG_20240328_083002-scaled.jpg?v=1713808882'),
  ('supa-santi-medium-diaper-90s','Supa Santi Medium Diaper 90s','VAFY','Each',290,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/medi.jpg?v=1713808944'),
  ('supa-santi-small-diaper-100s','Supa Santi Small Diaper 100s','VAFY','Each',290,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/small.jpg?v=1713808997'),
  ('supa-santi-wipe-2','Supa Santi Wipe 2','VAFY','Each',24,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/images_2_efd14723-77a2-45f5-bb7a-6a1354a7fac2.jpg?v=1713808530'),
  ('super-max-yellow','Super Max (Yellow)','VAFY','Each',12,false,false,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/super-max-single-blade.jpg?v=1713809236'),
  ('oral-b-kids-toothbrush','Super Max Swift','VAFY','Each',12,false,false,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/super-max-swift-3-rasierer-mit-3-ersatzklingen.jpg?v=1713809313'),
  ('sure-deo-spray-men','Sure Deo Spray Men','VAFY','Original',40,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/SUREDEOSPRAYMEN250ML.jpg?v=1712007668'),
  ('sure-deo-spray-women','Sure Deo Spray Women','VAFY','Each',40,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/th.jpg?v=1712074710'),
  ('suspenso-perfume-with-deo','Suspenso Perfume With Deo','VAFY','Each',110,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download_4_d5536f90-2aba-4f8f-8be5-84cfbf5f50c8.jpg?v=1713621061'),
  ('syringe-5ml','Syringe 5ml','VAFY','Each',1,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/syrenges-5ml-life-longbrand-500x500-1.jpg?v=1712501216'),
  ('tea-tree-facial-toner','Tea Tree Facial Toner','VAFY','Each',26,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/0012033_xbc-tea-tree-toner-200ml_510.jpg?v=1712871429'),
  ('tea-tree-wipes','Tea Tree Wipes','VAFY','Each',13,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/71qZ_GrZF7L._AC_UF1000_1000_QL80.jpg?v=1712772783'),
  ('theye-moquito-repellent-band','Theye Moquito Repellent Band','VAFY','Each',55,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/81H9yuq3cAL.jpg?v=1714593923'),
  ('tinkle-eyebrow-razor','Tinkle Eyebrow Razor','VAFY','Each',10,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/kkl.webp?v=1713201017'),
  ('toilet-wipes','Toilet Wipes','VAFY','Each',20,false,false,'OTC'::product_category,''),
  ('tom-milk','Tom Milk','VAFY','Each',44,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download_3_f807cfcf-caf0-47c5-b082-fe83f8f37b2a.jpg?v=1713386879'),
  ('travel-bottles-set-7pcs','Travel Bottles Set 7pcs','VAFY','SKY BLUE',49,false,false,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/61B03H27k2L._AC_UF350_350_QL80.jpg?v=1714510362'),
  ('tresemme-2-in-1','Tresemme 2 In 1','VAFY','Each',90,false,false,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/TRES.jpg?v=1713462845'),
  ('tresemme-shampoo','Tresemme Shampoo','VAFY','Each',105,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/TEE.jpg?v=1713462068'),
  ('trident','Trident','VAFY','Each',20,false,false,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/Trident.jpg?v=1712393898'),
  ('tumeric-tea','Tumeric Tea','VAFY','Each',60,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/s-l1600.png?v=1714668921'),
  ('unidus-condoms','Unidus Condoms','VAFY','Each',26,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/4222722277.jpg?v=1713547518'),
  ('unique-perfume','Unique Perfume','VAFY','Each',110,false,false,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/extremely-unique-edp-100ml-269208.webp?v=1713621428'),
  ('urine-bag','Urine Bag','VAFY','Each',10,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download_38_cc1b8e99-4e04-40ca-8810-c8eebaaf3879.jpg?v=1714041756'),
  ('urine-container','Urine Container','VAFY','Each',5,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/urine-container-500x500.webp?v=1713536116'),
  ('vagisil-anti-itch-wipes','Vagisil Anti Itch Wipes','VAFY','Each',10,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/itchWipesBox_ingredients_mobile_jpg.webp?v=1721073811'),
  ('vagisil-odor-block-intimate-wash-354ml','Vagisil Odor Block Intimate Wash 354ml','VAFY','Each',390,false,false,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/354-odor-block-daily-intimate-vaginal-wash-vagisil-original-imagkjezthzdyxqx.webp?v=1721073986'),
  ('valupak-vitamin-e-caps','Valupak Vitamin E Caps','VAFY','Each',87,false,true,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download-2024-04-15T200210.731.jpg?v=1713211359'),
  ('vasatisi-multi-collagen-gummies-60s','Vasatisi Multi Collagen Gummies 60s','VAFY','Each',378,false,false,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/71B4TIUtxsL.jpg?v=1721075326'),
  ('vaseline-brightening-lotion','Vaseline Brightening Lotion','VAFY','Each',130,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/37562419_NjIwLTgyNy05ZmMwMDE1ODRh.webp?v=1713807620'),
  ('vaseline-lip-therapy','Vaseline Lip Therapy','VAFY','Each',17,false,false,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/386b61_32630dba224546cfb839590313c2ae68_mv2.webp?v=1713461984'),
  ('vaseline-lotion','Vaseline Lotion','VAFY','Each',45,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/vaz.jpg?v=1712170423'),
  ('vaseline-lotion-mature-skin','Vaseline Lotion Mature Skin','VAFY','Each',45,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/uuu.webp?v=1713380691'),
  ('vaseline-petro-jelly-450ml','Vaseline Petro. Jelly 450ml','VAFY','Each',126,false,false,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/Vaseline_1.jpg?v=1713042343'),
  ('vaseline-pommade-aloe','Vaseline Pommade Aloe','VAFY','Each',23,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download_2_8476847d-e7fc-4a3a-8b12-526353c3377e.jpg?v=1712501555'),
  ('vaseline-pommade-original','Vaseline Pommade Original','VAFY','Each',23,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/617oKlOpZyL.jpg?v=1712502469'),
  ('veet-hair-remover','Veet Hair Remover','VAFY','Each',60,false,false,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/41hnKx8xwpL.jpg?v=1713043947'),
  ('vibe-bath-gel','Vibe Bath Gel','VAFY','Each',60,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/IMG_1332.webp?v=1712778674'),
  ('vibe-body-lotion-500ml','Vibe Body Lotion 500ml','VAFY','Each',42,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/37972395_NjIwLTYxNy03MWE3Y2Q3YTJl.webp?v=1713269922'),
  ('virasorb-cold-sore-cream-2g','Virasorb Cold Sore Cream 2g','VAFY','Each',65,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/3005499733.jpg?v=1717437619'),
  ('vitafol-caplets','Vitafol Caplets','VAFY','Each',36,false,true,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download_96.jpg?v=1712855813'),
  ('vitafusion-womens-multi-150s','Vitafusion Women''s Multi 150s','VAFY','Each',263,false,false,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/vitafusion-Womens-Multivitamin-Gummies-Daily-Vitamins-for-Women-Berry-Flavored-150-Count_df22469a-bdff-4d6b-a5dc-5d6d5d2ec83e.a181e6885ba348ad2d9c0844a60691f2_1.webp?v=1721079178'),
  ('vitamin-b-co-strong-accord','Vitamin B Co Strong (Accord)','VAFY','Each',40,false,true,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download_39_e8e9febd-5e27-419d-9716-ee3727b82414.jpg?v=1714162343'),
  ('vitamin-c-hand-cream','Vitamin C Hand Cream','VAFY','Each',30,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/foot-2_1024x1024_c4925b9e-19c2-4c48-8a89-4867eb11a97d.webp?v=1713621946'),
  ('vitamin-store-vitamin-c-zinc-effervescent-tabs','Vitamin Store Vitamin C + Zinc Effervescent Tabs','VAFY','Each',43,false,false,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/8ebacc39-4e56-40e0-846e-6da8fcaab941.webp?v=1712936393'),
  ('vitane-drop-30ml','Vitane Drop 30ml','VAFY','Each',69,false,false,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/F1AqsT666PakzEPPcUbdlSmc8XYtH4-metaQVBDXzA0OTAtMi5wbmc_--medium.png?v=1713125622'),
  ('vitawell-adult-multivitamin-gummies-120s','Vitawell Adult Multivitamin Gummies 120s','VAFY','Each',150,false,false,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/7139GaqKurL.jpg?v=1717245231'),
  ('vitawell-total-beauty-collagen-powder-200g','Vitawell Total Beauty Collagen Powder 200g','VAFY','Each',190,false,false,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/8e0d5c30aff732dfb94e9a70d36aab53cd822253.jpg?v=1717435304'),
  ('vitlife-vit-c-zinc','Vitlife Vit C+ Zinc','VAFY','Each',59,false,true,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/download-2024-04-17T162425.556.jpg?v=1713371122'),
  ('voligo-warm-menstral-heating-pad','Voligo Warm Menstral Heating Pad','VAFY','Each',460,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/615I_4w08KL.jpg?v=1720811228'),
  ('wallet-pocket-tissue','Wallet Pocket Tissue','VAFY','Each',7,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/s-l1200_f35306fb-5553-40c0-9916-8cd04ad6efc6.jpg?v=1714511640'),
  ('washing-machine-cleaner','Washing Machine Cleaner','VAFY','Each',30,false,false,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/c8f69c3436d2d04069baff9641155ee117c321ac.jpg?v=1717439768'),
  ('wearable-heating-pad','Wearable Heating Pad','VAFY','Each',460,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/61ugO4Ct5-L._AC_UF1000_1000_QL80.jpg?v=1720811694'),
  ('weekly-pill-organiser-black-white-double','Weekly Pill Organiser Black/White (Double)','VAFY','Each',198,false,false,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/172742D9-7DFC-4227-8BFD-759328546C2C.jpg?v=1712529757'),
  ('wilkenson-sword-shaving-stick-4-2-box','Wilkenson Sword Shaving Stick (4+2 Box)','VAFY','Each',80,false,false,'OTC'::product_category,''),
  ('windolene-glass-cleaner','Windolene Glass Cleaner','VAFY','Each',36,false,false,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/windoww.jpg?v=1713199186'),
  ('wisdom-step-by-step-t-b','Wisdom Step By Step T/B','VAFY','Each',25,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/Wisdom-Step-by-Step-Toothbrush-0-2-Years1_sku23306-small.webp?v=1714507576'),
  ('wisdom-t-b-junior-pack-4pk','Wisdom T/B Junior Pack 4pk','VAFY','Each',35,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/284-A.jpg?v=1714508816'),
  ('xblock-hair-wax-150ml','Xblock Hair Wax 150ml','VAFY','Each',34,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/PHOTO-2023-05-22-11-45-31.webp?v=1713036301'),
  ('xcel-insect-repellent-2-bands','Xcel Insect Repellent 2 Bands','VAFY','Each',45,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/51fcrBUmxCL.jpg?v=1714594063'),
  ('xpel-adult-insect-repellent-spray','Xpel Adult Insect Repellent Spray','VAFY','Each',45,false,false,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/713vxkNkupL._AC_UF1000_1000_QL80.jpg?v=1714595917'),
  ('xpel-kid-insect-repellent-spray','Xpel Kid Insect Repellent Spray','VAFY','Each',40,false,false,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/61XYbwFrF-L.jpg?v=1714593515'),
  ('yazz-pad','Yazz Pad','VAFY','Each',20,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/images_6.jpg?v=1713389235'),
  ('yeamon-electric-heat-pad','Yeamon Electric Heat Pad','VAFY','Each',450,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/51y1rqUuYeS._AC_UF1000_1000_QL80.jpg?v=1720811405'),
  ('zenwise-digestive-enzymes-60s','Zenwise Digestive Enzymes 60s','VAFY','Each',420,false,false,'Vitamins'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/XD_01-Slider-Highlight-ClinicalTrial_DE_product_4557e5d1-1269-4832-a6e9-d5ff7074b1a8.webp?v=1721076241'),
  ('zoflora-antiseptic','Zoflora Antiseptic','VAFY','Each',45,false,true,'OTC'::product_category,'https://cdn.shopify.com/s/files/1/0864/1019/9324/files/522792011_0_640x640_af3c768e-36af-4edb-94ad-06ed776a307f.jpg?v=1713374610')
on conflict (id) do update set
  price = excluded.price,
  in_stock = excluded.in_stock,
  image_url = excluded.image_url;


-- ##### 0006_payments.sql #####################################################

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


-- ##### 0007_wellness.sql #####################################################

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


-- ##### 0008_harden_functions.sql #############################################

-- =============================================================================
-- Function hardening — taking a trigger off the public API.
--
-- Run AFTER 0007. Safe to re-run.
--
-- Both items here were raised by Supabase's own database linter after 0007 went
-- up, and both are about the same thing: a function in the `public` schema is
-- not private. PostgREST publishes every one of them at /rest/v1/rpc/<name>,
-- reachable by anyone holding the publishable key that ships in the app.
--
-- 1. `handle_new_user` is a TRIGGER on auth.users. It was never meant to be
--    callable, and it is SECURITY DEFINER — it runs with the definer's rights
--    and bypasses RLS. Calling it outside a trigger errors on `new`, so this is
--    a latent hazard rather than a live hole, but a definer-rights function on
--    the public API is exactly the thing that becomes a hole the day someone
--    edits it. Revoking EXECUTE does not disturb the trigger: a trigger fires
--    with the table owner's rights, not the caller's.
--
-- 2. `touch_updated_at` had no pinned `search_path`. It is SECURITY INVOKER so
--    the exposure is small, but an unpinned search_path is how a function ends
--    up resolving `now()` against a schema someone else controls.
--
-- `log_hydration` stays callable by signed-in users — it is the app's write
-- path for the water card. It is SECURITY INVOKER, so the RLS policy on
-- `wellness_hydration` still decides which row it may touch, and anonymous
-- callers are refused by that policy rather than by the grant.
-- =============================================================================

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

create or replace function public.touch_updated_at()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end; $$;

revoke execute on function public.log_hydration(date, integer) from public;
revoke execute on function public.log_hydration(date, integer) from anon;
grant  execute on function public.log_hydration(date, integer) to authenticated;


-- ##### 0009_profile.sql #####################################################

-- =============================================================================
-- Profile — the editable half of the account, and the address book.
--
-- Run AFTER 0008. Safe to re-run.
--
-- WHAT THE APP MAY CHANGE ABOUT A PERSON
-- 0001 granted "update own profile" on the whole row. That let the app rewrite
-- `phone` directly, which contradicts the rule Edit Profile states on screen:
-- the phone number is the account's recovery channel and the line a pharmacist
-- calls before dispensing, so changing it has to go back through verification.
-- A rule the UI states and the database does not enforce is a suggestion.
-- Column privileges make it real: the app may update name, date of birth and
-- avatar, and nothing else. RLS still decides WHICH row; the grant decides
-- WHICH columns.
--
-- DATE OF BIRTH
-- Some medicines are age-restricted, and the pharmacist sees this at review.
-- A `date`, not text: a free-text "14 March 1994" cannot be compared against an
-- age limit, and it was hardcoded in the app until now.
--
-- AVATARS ARE PRIVATE
-- A face is personal data on a health app. The bucket is private and files are
-- addressed `<user_id>/avatar.jpg`, the same folder rule as prescriptions; the
-- app shows them through short-lived signed URLs. `avatar_path` stores the
-- path, never a URL — a stored URL either expires or never does, and both are
-- wrong.
--
-- ONE DEFAULT ADDRESS
-- Checkout needs exactly one default. A partial unique index makes two
-- impossible, and `set_default_address` moves the flag in one transaction so
-- there is never a moment with two (index violation) or with none.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists date_of_birth date
    check (date_of_birth is null or date_of_birth >= date '1900-01-01'),
  add column if not exists avatar_path text,
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Table-level UPDATE out, column-level UPDATE in. The trigger that fills a new
-- profile is SECURITY DEFINER and unaffected; so is touch_updated_at, which
-- writes NEW rather than issuing an UPDATE.
revoke update on public.profiles from anon, authenticated;
grant update (full_name, date_of_birth, avatar_path) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- avatars bucket — private
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Upsert (replacing your photo) needs insert, select and update together.
drop policy if exists "upload own avatar" on storage.objects;
create policy "upload own avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "read own avatar" on storage.objects;
create policy "read own avatar" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "replace own avatar" on storage.objects;
create policy "replace own avatar" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "remove own avatar" on storage.objects;
create policy "remove own avatar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- addresses — exactly one default per person
-- ---------------------------------------------------------------------------
create unique index if not exists addresses_one_default
  on public.addresses (user_id) where is_default;

-- Two statements, clear then set, so the partial unique index never sees two
-- defaults mid-flight. SECURITY INVOKER (the default): the "own addresses"
-- policy still scopes both updates to the caller's rows.
create or replace function public.set_default_address(p_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.addresses where id = p_id and user_id = auth.uid()
  ) then
    raise exception 'address not found' using errcode = 'P0002';
  end if;

  update public.addresses
     set is_default = false
   where user_id = auth.uid() and is_default and id <> p_id;

  update public.addresses
     set is_default = true
   where id = p_id and user_id = auth.uid();
end; $$;

revoke execute on function public.set_default_address(uuid) from public;
revoke execute on function public.set_default_address(uuid) from anon;
grant  execute on function public.set_default_address(uuid) to authenticated;

-- 0010 — Illustrated avatars.
--
-- Every account has an illustrated avatar from the first launch instead of a
-- blank circle of initials. `avatar_preset` names one of the illustrations
-- drawn in the app (src/components/avatars.tsx); a photo (`avatar_path`, 0009)
-- still takes precedence when there is one.
--
-- The default is random per row, so a new account gets one of the eight and
-- the existing rows are each given one as the column is added. The ids are
-- checked by shape, not by list: adding an illustration is an app release, not
-- a migration, and an id the app does not know falls back to initials there.

alter table public.profiles
  add column if not exists avatar_preset text not null
    default (array['wrap','afro','fade','braids','hijab','bun','locs','elder'])[floor(random() * 8)::int + 1]
    check (avatar_preset ~ '^[a-z][a-z0-9-]{1,23}$');

-- The app may choose among them. Still no UPDATE on phone or id (0009).
grant update (avatar_preset) on public.profiles to authenticated;

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

-- 0012 — Prescriptions: server-minted TrxIDs, and the app writes only what it owns.
--
-- The app generated the TrxID itself (two letters, four digits, four
-- alphanumerics) and could insert any column it liked, including `reviewed_by`
-- and `reviewed_at` — a patient could file a script that already claimed to be
-- reviewed, and the viewer would show it as such. RLS already kept the status
-- at PENDING; this narrows the rest.
--
--   * `id` now defaults to a TrxID minted here. The primary key still catches
--     the (roughly one in 7·10^12) collision; the app retries once.
--   * The app may insert `user_id` and `image_path` and nothing else. Status,
--     note, pharmacy and the review fields belong to the pharmacy side.
--   * No UPDATE or DELETE for the app at all, on the script or its product
--     links — a health record is not edited from the patient's phone.

create or replace function public.new_trx_id()
returns text
language sql
volatile
set search_path = ''
as $$
  select
    string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ', 1 + floor(random() * 24)::int, 1), '')
      filter (where i <= 2)
    || lpad(floor(random() * 10000)::int::text, 4, '0')
    || string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ0123456789', 1 + floor(random() * 34)::int, 1), '')
      filter (where i > 2)
  from generate_series(1, 6) as i;
$$;

revoke execute on function public.new_trx_id() from public, anon;
grant execute on function public.new_trx_id() to authenticated;

alter table public.prescriptions
  alter column id set default public.new_trx_id();

alter table public.prescriptions
  add constraint prescriptions_id_shape check (id ~ '^[A-Z]{2}[0-9]{4}[A-Z0-9]{4}$');

revoke all on public.prescriptions from anon, authenticated;
grant select on public.prescriptions to authenticated;
grant insert (user_id, image_path) on public.prescriptions to authenticated;

revoke all on public.prescription_products from anon, authenticated;
grant select, insert on public.prescription_products to authenticated;

-- 0013 — Saved mobile money wallets, and map pins on addresses.
--
-- payment_methods
-- ---------------
-- The app could write every column, including `paystack_authorization_code` —
-- the token Paystack issues after a real card charge, which lets later charges
-- run without the card. Only the pay-order function (service role) should ever
-- write one. The app may now add a mobile money wallet and delete its own
-- methods, nothing more:
--
--   * INSERT: `kind = 'momo'` only, with a valid Ghana number and a provider.
--     Cards are added by the payment flow once Paystack has tokenised one.
--   * No UPDATE. The default flag moves through `set_default_payment_method`,
--     which clears the others in the same transaction.
--   * One default per person (partial unique index), one entry per wallet.
--
-- addresses
-- ---------
-- `lat` / `lng`: where the rider should actually go. Optional, so every
-- address saved before this, and any typed without a pin, still works.

-- payment_methods ---------------------------------------------------------------

alter table public.payment_methods
  add constraint payment_methods_momo_complete check (
    kind <> 'momo'
    or (momo_phone ~ '^0[0-9]{9}$' and momo_provider is not null)
  );

create unique index if not exists payment_methods_one_default
  on public.payment_methods (user_id) where is_default;

create unique index if not exists payment_methods_one_per_wallet
  on public.payment_methods (user_id, momo_phone) where kind = 'momo';

drop policy if exists "own payment methods" on public.payment_methods;

create policy "own payment methods: read"
  on public.payment_methods for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "own payment methods: add wallet"
  on public.payment_methods for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and kind = 'momo'
    and paystack_authorization_code is null
  );

create policy "own payment methods: remove"
  on public.payment_methods for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.payment_methods from anon, authenticated;
grant select, delete on public.payment_methods to authenticated;
grant insert (user_id, kind, label, subtitle, momo_phone, momo_provider)
  on public.payment_methods to authenticated;

-- SECURITY DEFINER because the app has no UPDATE on the table; the ownership
-- check is the first thing it does, against auth.uid(), not an argument.
create or replace function public.set_default_payment_method(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null or not exists (
    select 1 from public.payment_methods where id = p_id and user_id = me
  ) then
    raise exception 'payment method not found' using errcode = 'P0002';
  end if;
  update public.payment_methods set is_default = false where user_id = me and is_default and id <> p_id;
  update public.payment_methods set is_default = true where id = p_id and user_id = me;
end;
$$;

revoke execute on function public.set_default_payment_method(uuid) from public, anon;
grant execute on function public.set_default_payment_method(uuid) to authenticated;

-- addresses -------------------------------------------------------------------

alter table public.addresses
  add column if not exists lat double precision check (lat is null or lat between -90 and 90),
  add column if not exists lng double precision check (lng is null or lng between -180 and 180);

alter table public.addresses
  add constraint addresses_pin_whole check ((lat is null) = (lng is null));

-- 0014 — New accounts can start as a fruit too.
--
-- The default avatar was drawn from the eight people (0010). It now draws
-- from all twenty: the people and the twelve fruity characters
-- (src/components/avatarsFruit.tsx). Existing accounts keep what they have;
-- a column default only applies to rows inserted from here on.

alter table public.profiles
  alter column avatar_preset set default
    (array[
      'wrap','afro','fade','braids','hijab','bun','locs','elder',
      'mango','pineapple','orange','watermelon','avocado','coconut',
      'strawberry','lemon','grapes','cocoa','apple','capsule'
    ])[floor(random() * 20)::int + 1];

-- 0015 — Email people when their prescription or order changes (SenderKit).
--
-- A pharmacist verifying a prescription, or an order leaving the pharmacy,
-- now calls the `notify` Edge Function, which sends the matching SenderKit
-- template (supabase/functions/notify). The database only says *what*
-- changed; the function decides whether to send, using the person's
-- notification_preferences (0011) — except prescription outcomes, which
-- always send.
--
-- The call is authenticated with a shared secret generated here and kept in
-- the Vault. The trigger reads it to sign the request; the function reads it
-- through `notify_webhook_secret()`, which only the service role may call. No
-- secret is typed, pasted or stored in code.

create extension if not exists pg_net with schema extensions;

-- The shared secret: 32 random bytes, created once.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'notify_webhook_secret') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'notify_webhook_secret',
      'Signs database → notify Edge Function calls'
    );
  end if;
end $$;

create or replace function public.notify_webhook_secret()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'notify_webhook_secret';
$$;

revoke execute on function public.notify_webhook_secret() from public, anon, authenticated;
grant execute on function public.notify_webhook_secret() to service_role;

-- One trigger function for both tables: post {table, id, status} to notify.
create or replace function public.post_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if (tg_table_name = 'prescriptions' and new.status::text in ('VERIFIED', 'REJECTED'))
     or (tg_table_name = 'orders' and new.status::text in ('PACKING', 'DISPATCHED', 'DELIVERED', 'CANCELLED'))
  then
    perform net.http_post(
      url := 'https://dvfigvailbkngmsciabz.supabase.co/functions/v1/notify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', public.notify_webhook_secret()
      ),
      body := jsonb_build_object('table', tg_table_name, 'id', new.id, 'status', new.status::text)
    );
  end if;
  return new;
end;
$$;

revoke execute on function public.post_notification() from public, anon, authenticated;

drop trigger if exists prescriptions_notify on public.prescriptions;
create trigger prescriptions_notify
  after update of status on public.prescriptions
  for each row execute function public.post_notification();

drop trigger if exists orders_notify on public.orders;
create trigger orders_notify
  after update of status on public.orders
  for each row execute function public.post_notification();

-- 0016 — Notifications by SMS through Twilio, instead of email through SenderKit.
--
-- The trigger from 0015 is unchanged: it still posts {table, id, status} to
-- the `notify` Edge Function. The function now texts the person through
-- Twilio. Two things it needs from the database:
--
--   notification_log — one row per message sent, keyed `<table>:<id>:<status>`.
--     Twilio has no idempotency key; claiming the row first is what stops a
--     retried webhook texting the same news twice. Service role only.
--
--   profiles.phone follows the CONFIRMED number. A text goes only to a number
--   the person proved is theirs (auth.users.phone, set when the code is
--   verified) — never to one typed at sign-up, where a typo would send someone
--   else news about a prescription. This trigger copies the confirmed number
--   onto the profile so the app shows the number that texts actually go to.

create table if not exists public.notification_log (
  key      text primary key,
  channel  text not null default 'sms',
  sent_at  timestamptz not null default now()
);

alter table public.notification_log enable row level security;
-- No policies: only the service role (the Edge Function) reads or writes it.
revoke all on public.notification_log from anon, authenticated;

create or replace function public.sync_confirmed_phone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.phone is not null
     and new.phone_confirmed_at is not null
     and (old.phone is distinct from new.phone or old.phone_confirmed_at is distinct from new.phone_confirmed_at)
  then
    update public.profiles set phone = '+' || new.phone where id = new.id;
  end if;
  return new;
end;
$$;

revoke execute on function public.sync_confirmed_phone() from public, anon, authenticated;

drop trigger if exists on_auth_phone_confirmed on auth.users;
create trigger on_auth_phone_confirmed
  after update of phone, phone_confirmed_at on auth.users
  for each row execute function public.sync_confirmed_phone();
