-- 0010 — Illustrated avatars.
--
-- Every account has an illustrated avatar from the first launch instead of a
-- blank circle of initials. `avatar_preset` names one of the illustrations
-- drawn in the app (src/components/avatars.tsx); a photo (`avatar_path`, 0009)
-- still takes precedence when there is one.
--
-- The default is random per row, so a new account gets one of the eight and
-- the existing rows are each given one as the column is added. The ids are
-- checked by shape, not by list: adding an illustration is an app release, not
-- a migration, and an id the app does not know falls back to initials there.

alter table public.profiles
  add column if not exists avatar_preset text not null
    default (array['wrap','afro','fade','braids','hijab','bun','locs','elder'])[floor(random() * 8)::int + 1]
    check (avatar_preset ~ '^[a-z][a-z0-9-]{1,23}$');

-- The app may choose among them. Still no UPDATE on phone or id (0009).
grant update (avatar_preset) on public.profiles to authenticated;
