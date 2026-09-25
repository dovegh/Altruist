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
