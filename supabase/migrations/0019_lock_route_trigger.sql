-- 0019 — The routing trigger function is for the trigger only.
--
-- Postgres grants EXECUTE to PUBLIC on new functions, so 0018's
-- route_to_pharmacy() was listed as callable over the API. A trigger function
-- does nothing useful when called directly, but nothing outside the database
-- should be able to reach it at all.
revoke execute on function public.route_to_pharmacy() from public, anon, authenticated;
