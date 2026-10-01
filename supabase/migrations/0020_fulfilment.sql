-- 0020 — Fulfilment: moving an order from the pharmacy shelf to the patient.
--
-- The board (Figma 75:41) has four columns — Verifying, Packing, Dispatched,
-- Delivered today — and one button per card that moves it one step right.
--
--   * One-way. RECEIVED/VERIFYING → PACKING → DISPATCHED → DELIVERED. There
--     is no "move back": a mistake is corrected by a pharmacist, not silently
--     reverted (the board's footer says so).
--   * The prescription gate holds here too. An order with a prescription-only
--     item cannot be packed unless the prescription it was placed against is
--     VERIFIED. The checkout gate on the phone is not the only line.
--   * Every step writes `order_status_events` with the same titles the app's
--     tracking timeline draws ("Packing", "Dispatched", "Delivered"), so the
--     patient sees each step with its real time.
--   * Any active staff member may move orders (counter and dispatch included);
--     only the prescription decision is restricted.

alter table public.pharmacies
  add column if not exists commission_rate numeric(4,3) not null default 0.080
    check (commission_rate >= 0 and commission_rate < 1);

create index if not exists orders_pharmacy_idx on public.orders (pharmacy_id, placed_at desc);

/** Cards for the board: everything in flight, plus what was delivered today. */
create or replace function public.portal_fulfilment()
returns table (
  id text, status public.order_status, patient_name text, placed_at timestamptz,
  stage_since timestamptz, item_count integer, rx_count integer,
  prescription_id text, prescription_status public.prescription_status
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare me public.pharmacy_staff;
begin
  me := public.portal_staff();
  if me.user_id is null then raise exception 'not_staff' using errcode = '42501'; end if;
  return query
    select o.id, o.status, coalesce(nullif(pr.full_name, ''), 'Patient'), o.placed_at,
           coalesce((select max(e.created_at) from public.order_status_events e where e.order_id = o.id), o.placed_at),
           coalesce((select sum(i.qty)::int from public.order_items i where i.order_id = o.id), 0),
           coalesce((select count(*)::int from public.order_items i
                     where i.order_id = o.id and i.requires_prescription), 0),
           o.prescription_id,
           rx.status
    from public.orders o
    left join public.profiles pr on pr.id = o.user_id
    left join public.prescriptions rx on rx.id = o.prescription_id
    where o.pharmacy_id = me.pharmacy_id
      and (
        o.status in ('RECEIVED', 'VERIFYING', 'PACKING', 'DISPATCHED')
        or (o.status = 'DELIVERED' and exists (
              select 1 from public.order_status_events e
              where e.order_id = o.id and e.status = 'DELIVERED'
                and (e.created_at at time zone 'Africa/Accra')::date = (now() at time zone 'Africa/Accra')::date))
      )
    order by o.placed_at;
end;
$$;

/**
 * Moves an order one step on. `p_to` must be the next step from where it is;
 * anything else is refused, so two people pressing at once cannot skip a step.
 */
create or replace function public.portal_advance_order(p_id text, p_to public.order_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.pharmacy_staff;
  o public.orders;
  rx_items integer;
  rx_status public.prescription_status;
  expected public.order_status;
begin
  me := public.portal_staff();
  if me.user_id is null then raise exception 'not_staff' using errcode = '42501'; end if;

  select * into o from public.orders where orders.id = p_id for update;
  if o.id is null or o.pharmacy_id is distinct from me.pharmacy_id then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  expected := case o.status
    when 'RECEIVED' then 'PACKING'::public.order_status
    when 'VERIFYING' then 'PACKING'::public.order_status
    when 'PACKING' then 'DISPATCHED'::public.order_status
    when 'DISPATCHED' then 'DELIVERED'::public.order_status
    else null
  end;
  if expected is null or p_to is distinct from expected then
    raise exception 'wrong_step' using errcode = 'P0001';
  end if;

  if p_to = 'PACKING' then
    select count(*) into rx_items from public.order_items i
    where i.order_id = o.id and i.requires_prescription;
    if rx_items > 0 then
      select r.status into rx_status from public.prescriptions r where r.id = o.prescription_id;
      if rx_status is distinct from 'VERIFIED' then
        raise exception 'prescription_not_verified' using errcode = 'P0001';
      end if;
    end if;
    -- The step the patient's timeline shows between "received" and "packing".
    insert into public.order_status_events (order_id, status, title, subtitle)
    values (
      o.id, 'VERIFYING',
      case when rx_items > 0 then 'Prescription verified' else 'Order confirmed' end,
      'Checked by ' || me.full_name
    );
  end if;

  update public.orders set status = p_to where orders.id = o.id;

  insert into public.order_status_events (order_id, status, title, subtitle)
  values (
    o.id, p_to,
    case p_to when 'PACKING' then 'Packing' when 'DISPATCHED' then 'Dispatched' else 'Delivered' end,
    case p_to
      when 'PACKING' then 'Pharmacist preparing your items'
      when 'DISPATCHED' then 'Rider on the way'
      else coalesce(o.address_line, 'Delivered to your address')
    end
  );
end;
$$;

/** Everything the order detail screen (Figma 87:60) shows, in one call. */
create or replace function public.portal_order(p_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me public.pharmacy_staff;
  o public.orders;
  rate numeric;
  result jsonb;
begin
  me := public.portal_staff();
  if me.user_id is null then raise exception 'not_staff' using errcode = '42501'; end if;
  select * into o from public.orders where orders.id = p_id;
  if o.id is null or o.pharmacy_id is distinct from me.pharmacy_id then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  select p.commission_rate into rate from public.pharmacies p where p.id = o.pharmacy_id;

  select jsonb_build_object(
    'id', o.id,
    'status', o.status,
    'placed_at', o.placed_at,
    'reference', o.reference,
    'method_label', o.method_label,
    'address_label', o.address_label,
    'address_line', o.address_line,
    'speed_label', o.speed_label,
    'speed_eta', o.speed_eta,
    'subtotal', o.subtotal,
    'delivery_fee', o.delivery_fee,
    'service_fee', o.service_fee,
    'total', o.total,
    'commission_rate', rate,
    'commission', round(o.subtotal * rate, 2),
    'payout', o.subtotal - round(o.subtotal * rate, 2),
    'patient', jsonb_build_object(
      'name', coalesce(nullif(pr.full_name, ''), 'Patient'),
      'phone', pr.phone,
      'email', u.email
    ),
    'prescription', case when rx.id is null then null else jsonb_build_object(
      'id', rx.id, 'status', rx.status, 'reviewed_at', rx.reviewed_at,
      'reviewed_by', rx.reviewed_by, 'has_image', rx.image_path is not null
    ) end,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', i.name, 'pack', i.pack, 'unit_price', i.unit_price, 'qty', i.qty,
        'requires_prescription', i.requires_prescription) order by i.requires_prescription desc, i.name)
      from public.order_items i where i.order_id = o.id), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'status', e.status, 'title', e.title, 'subtitle', e.subtitle, 'at', e.created_at) order by e.created_at)
      from public.order_status_events e where e.order_id = o.id), '[]'::jsonb)
  ) into result
  from (select 1) one
  left join public.profiles pr on pr.id = o.user_id
  left join auth.users u on u.id = o.user_id
  left join public.prescriptions rx on rx.id = o.prescription_id;

  return result;
end;
$$;

revoke execute on function
  public.portal_fulfilment(), public.portal_advance_order(text, public.order_status), public.portal_order(text)
from public, anon;
grant execute on function
  public.portal_fulfilment(), public.portal_advance_order(text, public.order_status), public.portal_order(text)
to authenticated;
