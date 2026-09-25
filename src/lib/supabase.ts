/**
 * The Supabase client — the one module that knows the backend is Supabase.
 *
 * Everything above this file goes through the domain functions in
 * `src/lib/api.ts`, exactly as it did against fixtures. Screens still never see
 * a URL, a table name or a query builder.
 *
 * ---------------------------------------------------------------------------
 * ON THE KEY IN THE BUNDLE
 *
 * `EXPO_PUBLIC_*` variables are inlined into the JavaScript bundle at build
 * time, so anything named that way is readable by anyone with the app. That is
 * correct for the **publishable/anon key** — it is designed to be shipped, and
 * it grants nothing on its own. What actually protects the data is Row Level
 * Security in Postgres.
 *
 * It follows that the `service_role` key must NEVER appear here, in any `.env`
 * read by Expo, or anywhere else in this repo. It bypasses RLS entirely. If a
 * job needs it, that job belongs in an Edge Function, not in the app.
 *
 * This matters more than usual here: the rows behind these tables are
 * prescriptions and orders — health data. An RLS policy is the only thing
 * standing between one patient's scanned prescription and every other user.
 * ---------------------------------------------------------------------------
 */
import 'react-native-url-polyfill/auto';
// Before the client: without it PKCE silently falls back to a `plain` challenge.
import './webcrypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** True when both halves of the connection are configured. */
export const SUPABASE_CONFIGURED = url.length > 0 && anonKey.length > 0;

/**
 * Null until configured, so the app falls back to fixtures rather than crashing
 * on a missing key. `api.ts` branches on `SUPABASE_CONFIGURED`, never on this.
 */
export const supabase: SupabaseClient | null = SUPABASE_CONFIGURED
  ? createClient(url, anonKey, {
      auth: {
        // The session lives in AsyncStorage, not SecureStore: it is refreshed
        // constantly and SecureStore is a Keychain round-trip each time. The
        // long-lived secret that *does* belong in SecureStore is handled by
        // `src/lib/session.ts`.
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // No URL bar to read a session out of on native.
        detectSessionInUrl: false,
        // Provider sign-in returns a one-time `?code=` that only this device
        // can redeem (it holds the verifier). The default, implicit, puts the
        // tokens themselves in the redirect URL, where any app registered for
        // the scheme could read them, and `signInWithProvider` never handled
        // that shape anyway: Google sign-in could not have worked.
        flowType: 'pkce',
      },
    })
  : null;

/** Narrows the nullable client. Only call inside a `SUPABASE_CONFIGURED` branch. */
export function db(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and ' +
        'EXPO_PUBLIC_SUPABASE_ANON_KEY in .env, then restart the dev server — ' +
        'Expo inlines these at build time, so a running bundler will not pick ' +
        'them up.',
    );
  }
  return supabase;
}
