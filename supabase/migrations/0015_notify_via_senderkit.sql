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
