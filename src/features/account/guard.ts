/**
 * Keeps signed-out people out of account screens.
 *
 * The splash chose where to land, but nothing stopped a deep link, a stale
 * back stack or an expired session from opening Profile, Addresses or Checkout
 * with nobody signed in. The screens rendered empty (their data is cleared on
 * sign-out) and every save failed against RLS. Now any route outside the open
 * list goes to Welcome the moment Supabase reports there is no session —
 * including mid-use, when a refresh token is revoked from another device.
 *
 * Allow-list, not block-list: a new screen is protected by default, and has to
 * be added here on purpose to be reachable signed out.
 *
 * Only a definite `signedOut` redirects. `unknown` (launch, before Supabase has
 * answered) leaves the splash in charge, and an offline launch with a stored
 * session still reports it, so no connection does not mean signed out.
 *
 * Under fixtures there is no auth server to ask; the guard stands down.
 */
import { useEffect } from 'react';
import { router, useRootNavigationState, useSegments } from 'expo-router';
import { SUPABASE_CONFIGURED } from '@/lib/supabase';
import { useAuthStatus } from './session';

/** First route segments a signed-out person may be on. The splash is `undefined`. */
const OPEN = new Set<string>([
  '(onboarding)', // onboarding, welcome
  '(auth)', // login, register, forgot, verify, set-password, check-email
  'auth-callback', // provider sign-in returning to the app
  'terms', // linked from Register
  'offline',
]);

export function useAuthGuard(): void {
  const status = useAuthStatus((s) => s.status);
  const segments = useSegments();
  const navigatorReady = Boolean(useRootNavigationState()?.key);
  const first = segments[0] as string | undefined;

  useEffect(() => {
    if (!SUPABASE_CONFIGURED || !navigatorReady || status !== 'signedOut') return;
    if (first === undefined || OPEN.has(first)) return;
    router.replace('/welcome');
  }, [navigatorReady, status, first]);
}
