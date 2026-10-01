-- 0018 — The partner portal: where a prescription goes after the patient sends it.
--
-- Until now a prescription was filed with no pharmacy and nothing on the other
-- side could read it. This adds the pharmacy half:
--
--   * Routing. A new prescription or order with no pharmacy goes to the launch
--     partner (the one active pharmacy). When there are two, this is where the
--     choice gets made; nothing else changes.
--   * Staff. `pharmacy_staff` ties a portal login to one pharmacy and a role.
--     Only a pharmacist with a Pharmacy Council number can approve or reject —
--     a CHECK constraint, not a toggle, because it is a regulatory rule.
--   * Two-factor, enforced in the database. Every portal function and the
--     image policy require an `aal2` session (password + authenticator code).
--     A stolen password alone opens nothing.
--   * Access log. Opening a prescription writes `prescription_access` first;
--     the image itself is only readable for 15 minutes after that, by the
--     person who opened it. There is no way to look without being logged.
--   * Review. Approve / reject runs here, records who decided and their PC
--     number, and the existing notify trigger (0015) tells the patient.
--
-- The portal never holds a service-role key. Everything it does goes through
-- these functions with the staff member's own session.

-- ---------------------------------------------------------------------------
-- Pharmacies: active flag and licence expiry (Terms §3: a lapsed licence
-- stops routing).
-- ---------------------------------------------------------------------------
alter table public.pharmacies
  add column if not exists is_active boolean not null default true,
  add column if not exists licence_expires_on date;

-- ---------------------------------------------------------------------------
-- Staff
-- ---------------------------------------------------------------------------
do $$ begin
  create type staff_role as enum ('superintendent', 'pharmacist', 'locum', 'counter', 'dispatch');
exception when duplicate_object then null; end $$;

create table if not exists public.pharmacy_staff (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  pharmacy_id    uuid not null references public.pharmacies(id) on delete cascade,
  full_name      text not null,
  role           staff_role not null,
  -- Pharmacy Council registration. Required for anyone who may approve.
  pc_number      text,
  can_approve    boolean not null default false,
  active         boolean not null default true,
  last_active_at timestamptz,
  created_at     timestamptz not null default now(),
  constraint approver_is_registered_pharmacist check (
    not can_approve
    or (pc_number is not null and role in ('superintendent', 'pharmacist', 'locum'))
  )
);
create index if not exists pharmacy_staff_pharmacy_idx on public.pharmacy_staff (pharmacy_id);

alter table public.pharmacy_staff enable row level security;
revoke all on public.pharmacy_staff from anon, authenticated;
grant select on public.pharmacy_staff to authenticated;

-- Staff see their own row. Adding and changing staff is an admin job for now.
drop policy if exists "own staff row" on public.pharmacy_staff;
create policy "own staff row" on public.pharmacy_staff
  for select to authenticated using (user_id = (select auth.uid()));

-- The access log learns WHO, not just a display name.
alter table public.prescription_access
  add column if not exists actor_user uuid references auth.users(id) on delete set null;
create index if not exists prescription_access_actor_idx
  on public.prescription_access (actor_user, prescription_id, accessed_at desc);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

/** The caller's staff row, if they are active staff with a two-factor session. */
create or replace function public.portal_staff()
returns public.pharmacy_staff
language sql
stable
security definer
set search_path = ''
as $$
  select s.*
  from public.pharmacy_staff s
  where s.user_id = auth.uid()
    and s.active
    and coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;
revoke execute on function public.portal_staff() from public, anon;
grant execute on function public.portal_staff() to authenticated;

-- ---------------------------------------------------------------------------
-- Routing: no pharmacy given → the launch partner.
-- ---------------------------------------------------------------------------
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
      and (p.licence_expires_on is null or p.licence_expires_on >= current_date)
    order by p.created_at, p.id
    limit 1;
  end if;
  return new;
end;
$$;

drop trigger if exists prescriptions_route on public.prescriptions;
create trigger prescriptions_route
  before insert on public.prescriptions
  for each row execute function public.route_to_pharmacy();

drop trigger if exists orders_route on public.orders;
create trigger orders_route
  before insert on public.orders
  for each row execute function public.route_to_pharmacy();

-- One launch partner: Healthview. Osu Care stays listed but receives nothing.
update public.pharmacies set is_active = false
where id = '22222222-2222-4222-8222-222222222222';

-- Everything filed before routing existed goes to the launch partner too.
update public.prescriptions set pharmacy_id = '11111111-1111-4111-8111-111111111111'
where pharmacy_id is null;
update public.orders set pharmacy_id = '11111111-1111-4111-8111-111111111111'
where pharmacy_id is null;

-- ---------------------------------------------------------------------------
-- Portal functions
-- ---------------------------------------------------------------------------

/** Who am I, and for which pharmacy. Null when not staff or not two-factor. */
create or replace function public.portal_me()
returns table (
  user_id uuid, full_name text, role public.staff_role, pc_number text, can_approve boolean,
  pharmacy_id uuid, pharmacy_name text, licence_number text, licence_expires_on date
)
language plpgsql
security definer
set search_path = ''
as $$
declare me public.pharmacy_staff;
begin
  me := public.portal_staff();
  if me.user_id is null then return; end if;
  update public.pharmacy_staff set last_active_at = now() where pharmacy_staff.user_id = me.user_id;
  return query
    select me.user_id, me.full_name, me.role, me.pc_number, me.can_approve,
           p.id, p.name, p.licence_number, p.licence_expires_on
    from public.pharmacies p where p.id = me.pharmacy_id;
end;
$$;

/** Is this signed-in person staff at all (before two-factor)? Used to route the login. */
create or replace function public.portal_is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.pharmacy_staff s where s.user_id = auth.uid() and s.active
  );
$$;

/** The prescription queue for the caller's pharmacy, newest first. */
create or replace function public.portal_prescriptions()
returns table (
  id text, status public.prescription_status, patient_name text, uploaded_at timestamptz,
  reviewed_at timestamptz, reviewed_by text, item_count integer, has_image boolean
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
    select r.id, r.status, coalesce(nullif(pr.full_name, ''), 'Patient'),
           r.uploaded_at, r.reviewed_at, r.reviewed_by,
           (select count(*)::int from public.prescription_products l where l.prescription_id = r.id),
           r.image_path is not null
    from public.prescriptions r
    left join public.profiles pr on pr.id = r.user_id
    where r.pharmacy_id = me.pharmacy_id
    order by r.uploaded_at desc
    limit 500;
end;
$$;

/**
 * Opens a prescription for review. Writes the access log FIRST, moves a
 * PENDING script to VERIFYING (the patient sees "being reviewed"), and returns
 * what the review screen needs. The image becomes readable to this person for
 * the next 15 minutes (see the storage policy below).
 */
create or replace function public.portal_open_prescription(p_id text)
returns table (
  id text, status public.prescription_status, note text, patient_name text, patient_phone text,
  uploaded_at timestamptz, reviewed_at timestamptz, reviewed_by text, image_path text,
  items jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.pharmacy_staff;
  r public.prescriptions;
begin
  me := public.portal_staff();
  if me.user_id is null then raise exception 'not_staff' using errcode = '42501'; end if;

  select * into r from public.prescriptions where prescriptions.id = p_id;
  if r.id is null or r.pharmacy_id is distinct from me.pharmacy_id then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  insert into public.prescription_access (prescription_id, actor, actor_user, reason)
  values (
    r.id,
    me.full_name || coalesce(' · PC ' || me.pc_number, '') || ' · ' ||
      (select p.name from public.pharmacies p where p.id = me.pharmacy_id),
    me.user_id,
    'Opened for review'
  );

  if r.status = 'PENDING' then
    update public.prescriptions set status = 'VERIFYING', note = 'Being reviewed by the pharmacist'
    where prescriptions.id = r.id;
    r.status := 'VERIFYING';
    r.note := 'Being reviewed by the pharmacist';
  end if;

  return query
    select r.id, r.status, r.note,
           coalesce(nullif(pr.full_name, ''), 'Patient'), pr.phone,
           r.uploaded_at, r.reviewed_at, r.reviewed_by, r.image_path,
           coalesce((
             select jsonb_agg(jsonb_build_object(
               'id', p.id, 'name', p.name, 'pack', p.pack, 'brand', p.brand))
             from public.prescription_products l
             join public.products p on p.id = l.product_id
             where l.prescription_id = r.id
           ), '[]'::jsonb)
    from (select 1) one
    left join public.profiles pr on pr.id = r.user_id;
end;
$$;

/**
 * Approve or reject. Only a registered pharmacist (can_approve) at the
 * prescription's pharmacy, with a two-factor session. A rejection must say
 * why — the note is shown to the patient, and "rejected" with no reason
 * leaves them nothing to act on.
 */
create or replace function public.portal_review_prescription(
  p_id text, p_approve boolean, p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.pharmacy_staff;
  r public.prescriptions;
  pharmacy_name text;
  clean_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  me := public.portal_staff();
  if me.user_id is null then raise exception 'not_staff' using errcode = '42501'; end if;
  if not me.can_approve then raise exception 'not_approver' using errcode = '42501'; end if;

  select * into r from public.prescriptions where prescriptions.id = p_id for update;
  if r.id is null or r.pharmacy_id is distinct from me.pharmacy_id then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if r.status not in ('PENDING', 'VERIFYING') then
    raise exception 'already_reviewed' using errcode = 'P0001';
  end if;
  if not p_approve and clean_note is null then
    raise exception 'reason_required' using errcode = '22023';
  end if;
  if clean_note is not null and length(clean_note) > 500 then
    raise exception 'note_too_long' using errcode = '22001';
  end if;

  select p.name into pharmacy_name from public.pharmacies p where p.id = me.pharmacy_id;

  update public.prescriptions set
    status = case when p_approve then 'VERIFIED'::public.prescription_status else 'REJECTED'::public.prescription_status end,
    note = case
      when p_approve then coalesce(clean_note, 'Approved by ' || me.full_name || ' · ' || pharmacy_name)
      else clean_note
    end,
    reviewed_at = now(),
    reviewed_by = me.full_name || ' · PC ' || me.pc_number
  where prescriptions.id = r.id;

  insert into public.prescription_access (prescription_id, actor, actor_user, reason)
  values (
    r.id,
    me.full_name || ' · PC ' || me.pc_number || ' · ' || pharmacy_name,
    me.user_id,
    case when p_approve then 'Approved' else 'Rejected' end
  );
end;
$$;

/** Orders routed to the caller's pharmacy, newest first. */
create or replace function public.portal_orders()
returns table (
  id text, status public.order_status, patient_name text, placed_at timestamptz, total numeric,
  item_count integer, rx_count integer, prescription_id text
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
    select o.id, o.status, coalesce(nullif(pr.full_name, ''), 'Patient'), o.placed_at, o.total,
           coalesce((select sum(i.qty)::int from public.order_items i where i.order_id = o.id), 0),
           coalesce((select count(*)::int from public.order_items i
                     where i.order_id = o.id and i.requires_prescription), 0),
           o.prescription_id
    from public.orders o
    left join public.profiles pr on pr.id = o.user_id
    where o.pharmacy_id = me.pharmacy_id
    order by o.placed_at desc
    limit 500;
end;
$$;

revoke execute on function
  public.portal_me(), public.portal_is_staff(), public.portal_prescriptions(),
  public.portal_open_prescription(text), public.portal_review_prescription(text, boolean, text),
  public.portal_orders()
from public, anon;
grant execute on function
  public.portal_me(), public.portal_is_staff(), public.portal_prescriptions(),
  public.portal_open_prescription(text), public.portal_review_prescription(text, boolean, text),
  public.portal_orders()
to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: staff read a prescription image only right after opening it.
-- ---------------------------------------------------------------------------
drop policy if exists "staff read opened prescription image" on storage.objects;
create policy "staff read opened prescription image" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'prescriptions'
    and coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
    and exists (
      select 1
      from public.prescriptions r
      join public.pharmacy_staff s
        on s.pharmacy_id = r.pharmacy_id and s.user_id = (select auth.uid()) and s.active
      join public.prescription_access a
        on a.prescription_id = r.id and a.actor_user = s.user_id
       and a.accessed_at > now() - interval '15 minutes'
      where r.image_path = storage.objects.name
    )
  );
