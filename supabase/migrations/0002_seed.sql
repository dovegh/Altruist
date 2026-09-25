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
