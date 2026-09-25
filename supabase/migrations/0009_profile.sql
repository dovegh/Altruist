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
