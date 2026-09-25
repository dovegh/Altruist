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
