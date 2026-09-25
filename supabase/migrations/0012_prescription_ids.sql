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
