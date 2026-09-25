-- =============================================================================
-- Function hardening — taking a trigger off the public API.
--
-- Run AFTER 0007. Safe to re-run.
--
-- Both items here were raised by Supabase's own database linter after 0007 went
-- up, and both are about the same thing: a function in the `public` schema is
-- not private. PostgREST publishes every one of them at /rest/v1/rpc/<name>,
-- reachable by anyone holding the publishable key that ships in the app.
--
-- 1. `handle_new_user` is a TRIGGER on auth.users. It was never meant to be
--    callable, and it is SECURITY DEFINER — it runs with the definer's rights
--    and bypasses RLS. Calling it outside a trigger errors on `new`, so this is
--    a latent hazard rather than a live hole, but a definer-rights function on
--    the public API is exactly the thing that becomes a hole the day someone
--    edits it. Revoking EXECUTE does not disturb the trigger: a trigger fires
--    with the table owner's rights, not the caller's.
--
-- 2. `touch_updated_at` had no pinned `search_path`. It is SECURITY INVOKER so
--    the exposure is small, but an unpinned search_path is how a function ends
--    up resolving `now()` against a schema someone else controls.
--
-- `log_hydration` stays callable by signed-in users — it is the app's write
-- path for the water card. It is SECURITY INVOKER, so the RLS policy on
-- `wellness_hydration` still decides which row it may touch, and anonymous
-- callers are refused by that policy rather than by the grant.
-- =============================================================================

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

create or replace function public.touch_updated_at()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end; $$;

revoke execute on function public.log_hydration(date, integer) from public;
revoke execute on function public.log_hydration(date, integer) from anon;
grant  execute on function public.log_hydration(date, integer) to authenticated;
