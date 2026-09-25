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
