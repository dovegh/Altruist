-- 0021 — The rest of the partner portal: dashboard, inventory, payouts,
-- staff, settings, refunds.
--
-- Same rules as 0018: every portal_* function checks staff + two-factor in
-- the database and works only on the caller's own pharmacy. Who may do what:
--
--   any staff            read everything below; update stock counts
--   registered pharmacist  (can_approve) change prices; decide refunds
--   superintendent       invite and manage staff; edit pharmacy settings;
--                        submit a renewed licence
--
-- Money is recorded here, not moved: an approved refund is a decision the
-- payout deducts. Paying it back to the card is Paystack's job (pay-order).

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------
alter table public.products
  add column if not exists stock_qty integer check (stock_qty is null or stock_qty >= 0),
  add column if not exists updated_at timestamptz not null default now();

alter table public.pharmacies
  add column if not exists accepting_orders boolean not null default true,
  add column if not exists opening_hours text,
  add column if not exists delivery_radius_km numeric(4,1),
  add column if not exists settlement_account text;

-- The VAFY catalogue was imported before stock belonged to a pharmacy.
update public.products set pharmacy_id = '11111111-1111-4111-8111-111111111111'
where pharmacy_id is null;

update public.pharmacies set
  opening_hours = coalesce(opening_hours, 'Mon–Sat 08:00–21:00 · Sun 10:00–18:00'),
  delivery_radius_km = coalesce(delivery_radius_km, 8)
where id = '11111111-1111-4111-8111-111111111111';

-- A paused pharmacy receives nothing new.
create or replace function public.route_to_pharmacy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.pharmacy_id is null then
    select p.id into new.pharmacy_id
    from public.pharmacies p
    where p.is_active
      and p.accepting_orders
      and (p.licence_expires_on is null or p.licence_expires_on >= current_date)
    order by p.created_at, p.id
    limit 1;
  end if;
  return new;
end;
$$;
revoke execute on function public.route_to_pharmacy() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Refund requests
-- ---------------------------------------------------------------------------
create sequence if not exists public.refund_number_seq start 2001;

create table if not exists public.refund_requests (
  id               text primary key default ('RF-' || nextval('public.refund_number_seq')),
  order_id         text not null references public.orders(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  pharmacy_id      uuid references public.pharmacies(id) on delete set null,
  initiated_by     text not null default 'patient' check (initiated_by in ('patient', 'pharmacy')),
  reason           text not null,
  details          text,
  -- [{ name, qty, unit_price, requires_prescription }] — what the patient asked to return.
  items            jsonb not null default '[]'::jsonb,
  photo_paths      text[] not null default '{}',
  amount_requested numeric(10,2) not null check (amount_requested > 0),
  status           text not null default 'AWAITING'
                     check (status in ('AWAITING', 'APPROVED', 'PARTIAL', 'DECLINED')),
  amount_approved  numeric(10,2) check (amount_approved is null or amount_approved >= 0),
  decision_note    text,
  decided_by       text,
  decided_at       timestamptz,
  respond_by       timestamptz not null default now() + interval '2 days',
  created_at       timestamptz not null default now()
);
create index if not exists refund_requests_pharmacy_idx on public.refund_requests (pharmacy_id, created_at desc);
create index if not exists refund_requests_order_idx on public.refund_requests (order_id);

create or replace function public.refund_route()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select o.pharmacy_id into new.pharmacy_id from public.orders o where o.id = new.order_id;
  return new;
end;
$$;
revoke execute on function public.refund_route() from public, anon, authenticated;

drop trigger if exists refund_requests_route on public.refund_requests;
create trigger refund_requests_route
  before insert on public.refund_requests
  for each row execute function public.refund_route();

alter table public.refund_requests enable row level security;
revoke all on public.refund_requests from anon, authenticated;
grant select on public.refund_requests to authenticated;
grant insert (order_id, user_id, reason, details, items, photo_paths, amount_requested)
  on public.refund_requests to authenticated;

drop policy if exists "own refunds readable" on public.refund_requests;
create policy "own refunds readable" on public.refund_requests
  for select to authenticated using (user_id = (select auth.uid()));

-- A patient may ask for a refund on their own delivered order, for no more
-- than they paid for the goods.
drop policy if exists "request refund on own delivered order" on public.refund_requests;
create policy "request refund on own delivered order" on public.refund_requests
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = (select auth.uid())
        and o.status = 'DELIVERED' and amount_requested <= o.subtotal
    )
  );

-- ---------------------------------------------------------------------------
-- Payouts actually made (Altruist records these when it pays)
-- ---------------------------------------------------------------------------
create table if not exists public.pharmacy_payouts (
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  week_start  date not null,
  amount      numeric(12,2) not null,
  reference   text,
  paid_at     timestamptz not null default now(),
  primary key (pharmacy_id, week_start)
);
alter table public.pharmacy_payouts enable row level security;
revoke all on public.pharmacy_payouts from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Staff invites
-- ---------------------------------------------------------------------------
create table if not exists public.staff_invites (
  id          uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  email       text not null,
  full_name   text not null,
  role        public.staff_role not null,
  pc_number   text,
  can_approve boolean not null default false,
  invited_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  accepted_at timestamptz,
  constraint invite_approver_is_registered check (
    not can_approve
    or (pc_number is not null and role in ('superintendent', 'pharmacist', 'locum'))
  )
);
create unique index if not exists staff_invites_pending_email
  on public.staff_invites (lower(email)) where accepted_at is null;
alter table public.staff_invites enable row level security;
revoke all on public.staff_invites from anon, authenticated;

/** Turns a pending invite into a staff row, once the email is confirmed. */
create or replace function public.link_staff_invite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare inv public.staff_invites;
begin
  if new.email_confirmed_at is null or new.email is null then return new; end if;
  select * into inv from public.staff_invites i
  where lower(i.email) = lower(new.email) and i.accepted_at is null
  order by i.created_at desc limit 1;
  if inv.id is null then return new; end if;
  insert into public.pharmacy_staff (user_id, pharmacy_id, full_name, role, pc_number, can_approve)
  values (new.id, inv.pharmacy_id, inv.full_name, inv.role, inv.pc_number, inv.can_approve)
  on conflict (user_id) do nothing;
  update public.staff_invites set accepted_at = now() where id = inv.id;
  return new;
end;
$$;
revoke execute on function public.link_staff_invite() from public, anon, authenticated;

drop trigger if exists on_auth_user_link_invite on auth.users;
create trigger on_auth_user_link_invite
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.link_staff_invite();

-- ---------------------------------------------------------------------------
-- Licence renewals
-- ---------------------------------------------------------------------------
create table if not exists public.licence_submissions (
  id           uuid primary key default gen_random_uuid(),
  pharmacy_id  uuid not null references public.pharmacies(id) on delete cascade,
  path         text not null,
  expires_on   date not null,
  submitted_by uuid references auth.users(id) on delete set null,
  submitted_at timestamptz not null default now(),
  status       text not null default 'SUBMITTED' check (status in ('SUBMITTED', 'ACCEPTED', 'REJECTED'))
);
alter table public.licence_submissions enable row level security;
revoke all on public.licence_submissions from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('licences', 'licences', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = false;

drop policy if exists "superintendent uploads licence" on storage.objects;
create policy "superintendent uploads licence" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'licences'
    and coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
    and exists (
      select 1 from public.pharmacy_staff s
      where s.user_id = (select auth.uid()) and s.active and s.role = 'superintendent'
        and (storage.foldername(name))[1] = s.pharmacy_id::text
    )
  );

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.portal_require(p_what text)
returns public.pharmacy_staff
language plpgsql
stable
security definer
set search_path = ''
as $$
declare me public.pharmacy_staff;
begin
  me := public.portal_staff();
  if me.user_id is null then raise exception 'not_staff' using errcode = '42501'; end if;
  if p_what = 'approver' and not me.can_approve then
    raise exception 'not_approver' using errcode = '42501';
  end if;
  if p_what = 'superintendent' and me.role <> 'superintendent' then
    raise exception 'not_superintendent' using errcode = '42501';
  end if;
  return me;
end;
$$;
revoke execute on function public.portal_require(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Dashboard
-- ---------------------------------------------------------------------------
create or replace function public.portal_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me public.pharmacy_staff;
  ph public.pharmacies;
  today date := (now() at time zone 'Africa/Accra')::date;
  result jsonb;
begin
  me := public.portal_require('staff');
  select * into ph from public.pharmacies where id = me.pharmacy_id;

  select jsonb_build_object(
    'awaiting', (select count(*) from public.prescriptions r
                 where r.pharmacy_id = ph.id and r.status in ('PENDING', 'VERIFYING')),
    'oldest_wait_minutes', (select floor(extract(epoch from now() - min(r.uploaded_at)) / 60)::int
                 from public.prescriptions r
                 where r.pharmacy_id = ph.id and r.status in ('PENDING', 'VERIFYING')),
    'orders_today', (select count(*) from public.orders o
                 where o.pharmacy_id = ph.id and (o.placed_at at time zone 'Africa/Accra')::date = today
                   and o.status not in ('CANCELLED', 'REJECTED')),
    'orders_last_week_same_day', (select count(*) from public.orders o
                 where o.pharmacy_id = ph.id and (o.placed_at at time zone 'Africa/Accra')::date = today - 7
                   and o.status not in ('CANCELLED', 'REJECTED')),
    'dispatched_today', (select count(distinct e.order_id) from public.order_status_events e
                 join public.orders o on o.id = e.order_id
                 where o.pharmacy_id = ph.id and e.status = 'DISPATCHED'
                   and (e.created_at at time zone 'Africa/Accra')::date = today),
    'out_for_delivery', (select count(*) from public.orders o
                 where o.pharmacy_id = ph.id and o.status = 'DISPATCHED'),
    'revenue_today_net', (select coalesce(sum(o.subtotal - round(o.subtotal * ph.commission_rate, 2)), 0)
                 from public.orders o
                 where o.pharmacy_id = ph.id and (o.placed_at at time zone 'Africa/Accra')::date = today
                   and o.status not in ('CANCELLED', 'REJECTED')),
    'commission_rate', ph.commission_rate,
    'licence', jsonb_build_object(
      'number', ph.licence_number,
      'expires_on', ph.licence_expires_on,
      'days_left', case when ph.licence_expires_on is null then null else ph.licence_expires_on - today end
    ),
    'attention_prescriptions', coalesce((
      select jsonb_agg(x order by x->>'uploaded_at') from (
        select jsonb_build_object(
          'id', r.id, 'status', r.status, 'uploaded_at', r.uploaded_at,
          'patient_name', coalesce(nullif(pr.full_name, ''), 'Patient')) as x
        from public.prescriptions r left join public.profiles pr on pr.id = r.user_id
        where r.pharmacy_id = ph.id and r.status in ('PENDING', 'VERIFYING')
        order by r.uploaded_at limit 5) q), '[]'::jsonb),
    'attention_stock', coalesce((
      select jsonb_agg(x) from (
        select jsonb_build_object(
          'id', p.id, 'name', p.name, 'pack', p.pack, 'stock_qty', p.stock_qty, 'in_stock', p.in_stock,
          'open_orders', (select count(distinct i.order_id) from public.order_items i
                          join public.orders o on o.id = i.order_id
                          where i.product_id = p.id and o.status in ('RECEIVED', 'VERIFYING', 'PACKING'))) as x
        from public.products p
        where p.pharmacy_id = ph.id
          and ((p.stock_qty is not null and p.stock_qty <= 5) or not p.in_stock)
        order by (p.stock_qty = 0 and p.in_stock) desc, p.stock_qty nulls last
        limit 5) q), '[]'::jsonb),
    'activity', coalesce((
      select jsonb_agg(jsonb_build_object('at', q.at_ts, 'kind', q.kind, 'text', q.txt) order by q.at_ts desc)
      from (
        select e.created_at as at_ts, lower(e.status::text) as kind, e.order_id || ' · ' || e.title as txt
        from public.order_status_events e join public.orders o on o.id = e.order_id
        where o.pharmacy_id = ph.id and (e.created_at at time zone 'Africa/Accra')::date = today
        union all
        select a.accessed_at, lower(a.reason), 'Prescription ' || a.prescription_id || ' ' || lower(a.reason)
        from public.prescription_access a join public.prescriptions r on r.id = a.prescription_id
        where r.pharmacy_id = ph.id and a.reason in ('Approved', 'Rejected')
          and (a.accessed_at at time zone 'Africa/Accra')::date = today
        order by 1 desc
        limit 8) q), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Inventory
-- ---------------------------------------------------------------------------
create or replace function public.portal_inventory()
returns table (
  id text, name text, brand text, pack text, category public.product_category, form text,
  requires_prescription boolean, price numeric, in_stock boolean, stock_qty integer, updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare me public.pharmacy_staff;
begin
  me := public.portal_require('staff');
  return query
    select p.id, p.name, p.brand, p.pack, p.category, p.form, p.requires_prescription,
           p.price, p.in_stock, p.stock_qty, p.updated_at
    from public.products p
    where p.pharmacy_id = me.pharmacy_id
    order by p.name;
end;
$$;

/** Stock count and availability. Any staff member: the counter keeps the shelf. */
create or replace function public.portal_update_stock(p_id text, p_stock_qty integer, p_in_stock boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare me public.pharmacy_staff;
begin
  me := public.portal_require('staff');
  if p_stock_qty is not null and p_stock_qty < 0 then
    raise exception 'bad_stock' using errcode = '22023';
  end if;
  update public.products set
    stock_qty = p_stock_qty,
    -- Zero on the shelf means not for sale, whatever the toggle says.
    in_stock = case when p_stock_qty = 0 then false else p_in_stock end,
    updated_at = now()
  where id = p_id and pharmacy_id = me.pharmacy_id;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
end;
$$;

/** Price. Registered pharmacists only. Classification (Rx / OTC) is never editable here. */
create or replace function public.portal_update_price(p_id text, p_price numeric)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare me public.pharmacy_staff;
begin
  me := public.portal_require('approver');
  if p_price is null or p_price <= 0 or p_price > 100000 then
    raise exception 'bad_price' using errcode = '22023';
  end if;
  update public.products set price = round(p_price, 2), updated_at = now()
  where id = p_id and pharmacy_id = me.pharmacy_id;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Payouts — weeks run Monday to Sunday, settled the Tuesday after.
-- ---------------------------------------------------------------------------
create or replace function public.portal_payouts()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me public.pharmacy_staff;
  ph public.pharmacies;
  this_week date := date_trunc('week', now() at time zone 'Africa/Accra')::date;
  result jsonb;
begin
  me := public.portal_require('staff');
  select * into ph from public.pharmacies where id = me.pharmacy_id;

  with delivered as (
    select o.id, o.subtotal,
           date_trunc('week', (select max(e.created_at) from public.order_status_events e
                               where e.order_id = o.id and e.status = 'DELIVERED') at time zone 'Africa/Accra')::date as week_start
    from public.orders o
    where o.pharmacy_id = ph.id and o.status = 'DELIVERED'
  ),
  refunds as (
    select date_trunc('week', r.decided_at at time zone 'Africa/Accra')::date as week_start,
           sum(r.amount_approved) as amount
    from public.refund_requests r
    where r.pharmacy_id = ph.id and r.status in ('APPROVED', 'PARTIAL')
    group by 1
  ),
  weeks as (
    select d.week_start, count(*)::int as orders, sum(d.subtotal) as gross,
           round(sum(d.subtotal) * ph.commission_rate, 2) as commission
    from delivered d where d.week_start is not null
    group by d.week_start
  )
  select jsonb_build_object(
    'commission_rate', ph.commission_rate,
    'settlement_account', ph.settlement_account,
    'this_week', jsonb_build_object(
      'week_start', this_week,
      'orders', coalesce((select w.orders from weeks w where w.week_start = this_week), 0),
      'gross', coalesce((select w.gross from weeks w where w.week_start = this_week), 0),
      'commission', coalesce((select w.commission from weeks w where w.week_start = this_week), 0)
    ),
    'paid_this_year', coalesce((select sum(p.amount) from public.pharmacy_payouts p
                                where p.pharmacy_id = ph.id
                                  and extract(year from p.paid_at) = extract(year from now())), 0),
    'weeks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'week_start', w.week_start,
        'week_end', w.week_start + 6,
        'due_on', w.week_start + 8,
        'orders', w.orders,
        'gross', w.gross,
        'commission', w.commission,
        'refunds', coalesce(rf.amount, 0),
        'net', w.gross - w.commission - coalesce(rf.amount, 0),
        'paid_at', pp.paid_at,
        'reference', pp.reference
      ) order by w.week_start desc)
      from weeks w
      left join refunds rf on rf.week_start = w.week_start
      left join public.pharmacy_payouts pp on pp.pharmacy_id = ph.id and pp.week_start = w.week_start
    ), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

/** The orders behind one week's payout, for the statement download. */
create or replace function public.portal_payout_orders(p_week_start date)
returns table (id text, delivered_at timestamptz, patient_name text, subtotal numeric, commission numeric, net numeric)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me public.pharmacy_staff;
  rate numeric;
begin
  me := public.portal_require('staff');
  select p.commission_rate into rate from public.pharmacies p where p.id = me.pharmacy_id;
  return query
    select o.id, d.ts, coalesce(nullif(pr.full_name, ''), 'Patient'), o.subtotal,
           round(o.subtotal * rate, 2), o.subtotal - round(o.subtotal * rate, 2)
    from public.orders o
    join lateral (select max(e.created_at) as ts from public.order_status_events e
                  where e.order_id = o.id and e.status = 'DELIVERED') d on true
    left join public.profiles pr on pr.id = o.user_id
    where o.pharmacy_id = me.pharmacy_id and o.status = 'DELIVERED'
      and date_trunc('week', d.ts at time zone 'Africa/Accra')::date = p_week_start
    order by d.ts;
end;
$$;

-- ---------------------------------------------------------------------------
-- Staff
-- ---------------------------------------------------------------------------
create or replace function public.portal_staff_list()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare me public.pharmacy_staff;
begin
  me := public.portal_require('staff');
  return jsonb_build_object(
    'staff', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', s.user_id, 'full_name', s.full_name, 'email', u.email, 'role', s.role,
        'pc_number', s.pc_number, 'can_approve', s.can_approve, 'active', s.active,
        'last_active_at', s.last_active_at, 'is_me', s.user_id = me.user_id)
        order by s.active desc, s.role, s.full_name)
      from public.pharmacy_staff s join auth.users u on u.id = s.user_id
      where s.pharmacy_id = me.pharmacy_id), '[]'::jsonb),
    'invites', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'email', i.email, 'full_name', i.full_name, 'role', i.role,
        'pc_number', i.pc_number, 'can_approve', i.can_approve, 'created_at', i.created_at)
        order by i.created_at desc)
      from public.staff_invites i
      where i.pharmacy_id = me.pharmacy_id and i.accepted_at is null), '[]'::jsonb),
    'can_manage', me.role = 'superintendent'
  );
end;
$$;

create or replace function public.portal_invite_staff(
  p_email text, p_full_name text, p_role public.staff_role, p_pc_number text, p_can_approve boolean
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.pharmacy_staff;
  clean_email text := lower(btrim(coalesce(p_email, '')));
  clean_pc text := nullif(btrim(coalesce(p_pc_number, '')), '');
  existing uuid;
begin
  me := public.portal_require('superintendent');
  if clean_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'bad_email' using errcode = '22023'; end if;
  if nullif(btrim(coalesce(p_full_name, '')), '') is null then raise exception 'name_required' using errcode = '22023'; end if;
  if p_can_approve and (clean_pc is null or p_role not in ('superintendent', 'pharmacist', 'locum')) then
    raise exception 'approver_needs_pc' using errcode = '22023';
  end if;
  if exists (select 1 from public.pharmacy_staff s join auth.users u on u.id = s.user_id
             where lower(u.email) = clean_email) then
    raise exception 'already_staff' using errcode = '23505';
  end if;

  delete from public.staff_invites where lower(email) = clean_email and accepted_at is null;
  insert into public.staff_invites (pharmacy_id, email, full_name, role, pc_number, can_approve, invited_by)
  values (me.pharmacy_id, clean_email, btrim(p_full_name), p_role, clean_pc, coalesce(p_can_approve, false), me.user_id);

  -- Already has a confirmed Altruist account: they are staff straight away.
  select u.id into existing from auth.users u
  where lower(u.email) = clean_email and u.email_confirmed_at is not null;
  if existing is not null then
    insert into public.pharmacy_staff (user_id, pharmacy_id, full_name, role, pc_number, can_approve)
    values (existing, me.pharmacy_id, btrim(p_full_name), p_role, clean_pc, coalesce(p_can_approve, false))
    on conflict (user_id) do nothing;
    update public.staff_invites set accepted_at = now()
    where lower(email) = clean_email and accepted_at is null;
    return 'linked';
  end if;
  return 'invited';
end;
$$;

create or replace function public.portal_cancel_invite(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare me public.pharmacy_staff;
begin
  me := public.portal_require('superintendent');
  delete from public.staff_invites where id = p_id and pharmacy_id = me.pharmacy_id and accepted_at is null;
end;
$$;

create or replace function public.portal_update_staff(
  p_user_id uuid, p_role public.staff_role, p_pc_number text, p_can_approve boolean, p_active boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.pharmacy_staff;
  clean_pc text := nullif(btrim(coalesce(p_pc_number, '')), '');
begin
  me := public.portal_require('superintendent');
  if p_user_id = me.user_id and (p_role <> 'superintendent' or not p_active) then
    raise exception 'cannot_demote_self' using errcode = 'P0001';
  end if;
  if p_can_approve and (clean_pc is null or p_role not in ('superintendent', 'pharmacist', 'locum')) then
    raise exception 'approver_needs_pc' using errcode = '22023';
  end if;
  update public.pharmacy_staff set
    role = p_role, pc_number = clean_pc, can_approve = coalesce(p_can_approve, false), active = p_active
  where user_id = p_user_id and pharmacy_id = me.pharmacy_id;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Settings
-- ---------------------------------------------------------------------------
create or replace function public.portal_settings()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me public.pharmacy_staff;
  ph public.pharmacies;
begin
  me := public.portal_require('staff');
  select * into ph from public.pharmacies where id = me.pharmacy_id;
  return jsonb_build_object(
    'name', ph.name,
    'licence_number', ph.licence_number,
    'licence_expires_on', ph.licence_expires_on,
    'days_left', case when ph.licence_expires_on is null then null
                      else ph.licence_expires_on - (now() at time zone 'Africa/Accra')::date end,
    'address', ph.address,
    'phone', ph.phone,
    'accepting_orders', ph.accepting_orders,
    'opening_hours', ph.opening_hours,
    'delivery_radius_km', ph.delivery_radius_km,
    'superintendent', (select jsonb_build_object('name', s.full_name, 'pc_number', s.pc_number)
                       from public.pharmacy_staff s
                       where s.pharmacy_id = ph.id and s.role = 'superintendent' and s.active
                       order by s.created_at limit 1),
    'latest_licence', (select jsonb_build_object('status', l.status, 'submitted_at', l.submitted_at,
                                                 'expires_on', l.expires_on)
                       from public.licence_submissions l where l.pharmacy_id = ph.id
                       order by l.submitted_at desc limit 1),
    'can_manage', me.role = 'superintendent'
  );
end;
$$;

create or replace function public.portal_update_pharmacy(
  p_address text, p_phone text, p_opening_hours text, p_delivery_radius_km numeric, p_accepting_orders boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.pharmacy_staff;
  was_accepting boolean;
begin
  me := public.portal_require('superintendent');
  if nullif(btrim(coalesce(p_address, '')), '') is null then raise exception 'address_required' using errcode = '22023'; end if;
  if p_delivery_radius_km is not null and (p_delivery_radius_km <= 0 or p_delivery_radius_km > 100) then
    raise exception 'bad_radius' using errcode = '22023';
  end if;
  select accepting_orders into was_accepting from public.pharmacies where id = me.pharmacy_id;
  update public.pharmacies set
    address = btrim(p_address),
    phone = nullif(btrim(coalesce(p_phone, '')), ''),
    opening_hours = nullif(btrim(coalesce(p_opening_hours, '')), ''),
    delivery_radius_km = p_delivery_radius_km,
    accepting_orders = coalesce(p_accepting_orders, true)
  where id = me.pharmacy_id;
  -- Back from a pause: whatever arrived meanwhile with nowhere to go is routed now.
  if not was_accepting and coalesce(p_accepting_orders, true) then
    update public.prescriptions set pharmacy_id = me.pharmacy_id where pharmacy_id is null;
    update public.orders set pharmacy_id = me.pharmacy_id where pharmacy_id is null;
  end if;
end;
$$;

create or replace function public.portal_submit_licence(p_path text, p_expires_on date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare me public.pharmacy_staff;
begin
  me := public.portal_require('superintendent');
  if p_path is null or split_part(p_path, '/', 1) <> me.pharmacy_id::text then
    raise exception 'bad_path' using errcode = '22023';
  end if;
  if p_expires_on is null or p_expires_on <= current_date then
    raise exception 'bad_expiry' using errcode = '22023';
  end if;
  insert into public.licence_submissions (pharmacy_id, path, expires_on, submitted_by)
  values (me.pharmacy_id, p_path, p_expires_on, me.user_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Refunds (pharmacy side)
-- ---------------------------------------------------------------------------
create or replace function public.portal_refunds()
returns table (
  id text, order_id text, patient_name text, reason text, amount_requested numeric,
  amount_approved numeric, status text, initiated_by text, created_at timestamptz, respond_by timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare me public.pharmacy_staff;
begin
  me := public.portal_require('staff');
  return query
    select r.id, r.order_id, coalesce(nullif(pr.full_name, ''), 'Patient'), r.reason,
           r.amount_requested, r.amount_approved, r.status, r.initiated_by, r.created_at, r.respond_by
    from public.refund_requests r left join public.profiles pr on pr.id = r.user_id
    where r.pharmacy_id = me.pharmacy_id
    order by (r.status = 'AWAITING') desc, r.created_at desc;
end;
$$;

create or replace function public.portal_refund(p_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me public.pharmacy_staff;
  r public.refund_requests;
  o public.orders;
begin
  me := public.portal_require('staff');
  select * into r from public.refund_requests where id = p_id;
  if r.id is null or r.pharmacy_id is distinct from me.pharmacy_id then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  select * into o from public.orders where id = r.order_id;
  return jsonb_build_object(
    'id', r.id, 'status', r.status, 'initiated_by', r.initiated_by,
    'reason', r.reason, 'details', r.details, 'items', r.items,
    'photo_count', coalesce(array_length(r.photo_paths, 1), 0),
    'amount_requested', r.amount_requested, 'amount_approved', r.amount_approved,
    'decision_note', r.decision_note, 'decided_by', r.decided_by, 'decided_at', r.decided_at,
    'respond_by', r.respond_by, 'created_at', r.created_at,
    'order', jsonb_build_object(
      'id', o.id, 'status', o.status, 'subtotal', o.subtotal, 'total', o.total, 'placed_at', o.placed_at,
      'delivered_at', (select max(e.created_at) from public.order_status_events e
                       where e.order_id = o.id and e.status = 'DELIVERED'),
      'items', coalesce((select jsonb_agg(jsonb_build_object('name', i.name, 'pack', i.pack, 'qty', i.qty,
                          'unit_price', i.unit_price, 'requires_prescription', i.requires_prescription))
                         from public.order_items i where i.order_id = o.id), '[]'::jsonb)
    ),
    'patient', jsonb_build_object(
      'name', (select coalesce(nullif(pr.full_name, ''), 'Patient') from public.profiles pr where pr.id = r.user_id),
      'previous_orders', (select count(*) from public.orders x where x.user_id = r.user_id and x.id <> o.id),
      'previous_refunds', (select count(*) from public.refund_requests x where x.user_id = r.user_id and x.id <> r.id)
    )
  );
end;
$$;

/** 'full' | 'partial' | 'decline'. Recorded against the pharmacist's licence. */
create or replace function public.portal_decide_refund(p_id text, p_decision text, p_amount numeric, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.pharmacy_staff;
  r public.refund_requests;
  clean_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  me := public.portal_require('approver');
  select * into r from public.refund_requests where id = p_id for update;
  if r.id is null or r.pharmacy_id is distinct from me.pharmacy_id then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if r.status <> 'AWAITING' then raise exception 'already_decided' using errcode = 'P0001'; end if;
  if p_decision not in ('full', 'partial', 'decline') then raise exception 'bad_decision' using errcode = '22023'; end if;
  if p_decision in ('partial', 'decline') and clean_note is null then
    raise exception 'reason_required' using errcode = '22023';
  end if;
  if p_decision = 'partial' and (p_amount is null or p_amount <= 0 or p_amount >= r.amount_requested) then
    raise exception 'bad_amount' using errcode = '22023';
  end if;

  update public.refund_requests set
    status = case p_decision when 'full' then 'APPROVED' when 'partial' then 'PARTIAL' else 'DECLINED' end,
    amount_approved = case p_decision when 'full' then r.amount_requested when 'partial' then round(p_amount, 2) else 0 end,
    decision_note = clean_note,
    decided_by = me.full_name || coalesce(' · PC ' || me.pc_number, ''),
    decided_at = now()
  where id = r.id;
end;
$$;

/** A refund the pharmacy starts itself (from the order). Decided on creation. */
create or replace function public.portal_start_refund(p_order_id text, p_amount numeric, p_reason text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.pharmacy_staff;
  o public.orders;
  already numeric;
  new_id text;
begin
  me := public.portal_require('approver');
  select * into o from public.orders where id = p_order_id;
  if o.id is null or o.pharmacy_id is distinct from me.pharmacy_id then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if nullif(btrim(coalesce(p_reason, '')), '') is null then raise exception 'reason_required' using errcode = '22023'; end if;
  select coalesce(sum(amount_approved), 0) into already from public.refund_requests
  where order_id = o.id and status in ('APPROVED', 'PARTIAL');
  if p_amount is null or p_amount <= 0 or p_amount > o.subtotal - already then
    raise exception 'bad_amount' using errcode = '22023';
  end if;
  insert into public.refund_requests (order_id, user_id, initiated_by, reason, amount_requested,
    status, amount_approved, decision_note, decided_by, decided_at)
  values (o.id, o.user_id, 'pharmacy', btrim(p_reason), round(p_amount, 2),
    'APPROVED', round(p_amount, 2), btrim(p_reason),
    me.full_name || coalesce(' · PC ' || me.pc_number, ''), now())
  returning id into new_id;
  return new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke execute on function
  public.portal_dashboard(), public.portal_inventory(),
  public.portal_update_stock(text, integer, boolean), public.portal_update_price(text, numeric),
  public.portal_payouts(), public.portal_payout_orders(date),
  public.portal_staff_list(),
  public.portal_invite_staff(text, text, public.staff_role, text, boolean),
  public.portal_cancel_invite(uuid),
  public.portal_update_staff(uuid, public.staff_role, text, boolean, boolean),
  public.portal_settings(),
  public.portal_update_pharmacy(text, text, text, numeric, boolean),
  public.portal_submit_licence(text, date),
  public.portal_refunds(), public.portal_refund(text),
  public.portal_decide_refund(text, text, numeric, text),
  public.portal_start_refund(text, numeric, text)
from public, anon;
grant execute on function
  public.portal_dashboard(), public.portal_inventory(),
  public.portal_update_stock(text, integer, boolean), public.portal_update_price(text, numeric),
  public.portal_payouts(), public.portal_payout_orders(date),
  public.portal_staff_list(),
  public.portal_invite_staff(text, text, public.staff_role, text, boolean),
  public.portal_cancel_invite(uuid),
  public.portal_update_staff(uuid, public.staff_role, text, boolean, boolean),
  public.portal_settings(),
  public.portal_update_pharmacy(text, text, text, numeric, boolean),
  public.portal_submit_licence(text, date),
  public.portal_refunds(), public.portal_refund(text),
  public.portal_decide_refund(text, text, numeric, text),
  public.portal_start_refund(text, numeric, text)
to authenticated;
