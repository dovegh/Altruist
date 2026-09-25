/**
 * Whose data is this device holding?
 *
 * Every per-person store in the app is persisted, which is right for the
 * person using the phone and wrong for the next one. This module is the one
 * place that knows which account the local data belongs to (`ownerId`) and
 * keeps it honest:
 *
 *   - a session starts for the owner → refresh their profile and address book;
 *   - a session starts for someone else, or for anyone while the owner is
 *     unknown → empty every store first (`clearUserData`), then load theirs;
 *   - the session ends → empty every store.
 *
 * "Unknown owner" is treated as "someone else" on purpose. Data written before
 * this module existed has no owner, and showing it to whoever signs in is the
 * bug this fixes. Server-backed data (profile, addresses, wellness) comes
 * straight back; only device-only caches are lost, once.
 *
 * Under fixtures there is no auth server and nothing to reconcile.
 */
import { useEffect } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { signOut } from '@/lib/api';
import { clearSession } from '@/lib/session';
import { clearUserData } from '@/lib/resetAccount';
import { useProfileStore } from '@/features/profile/store';
import { loadAddresses } from '@/features/profile/addresses';
import { loadNotificationPrefs } from '@/features/notifications/preferences';
import { loadPrescriptions } from '@/features/prescriptions/store';
import { loadPaymentMethods } from '@/features/checkout/methods';
import { syncWellness } from '@/features/wellness/sync';
import { markAccountSettled } from './gate';

/**
 * Whether there is a session right now, as Supabase last reported it.
 * `unknown` until the first auth event, so nothing acts on a guess at launch.
 * Not persisted: Supabase re-reports it on every start.
 */
export type AuthStatus = 'unknown' | 'signedIn' | 'signedOut';

export const useAuthStatus = create<{ status: AuthStatus }>(() => ({ status: 'unknown' }));

type OwnerState = { ownerId: string | null };

const useOwnerStore = create<OwnerState>()(
  persist(() => ({ ownerId: null as string | null }), {
    name: 'altruist.account-owner',
    storage: createJSONStorage(() => AsyncStorage),
  }),
);

/** The persisted owner, once AsyncStorage has been read. */
async function persistedOwner(): Promise<string | null> {
  if (!useOwnerStore.persist.hasHydrated()) {
    await new Promise<void>((resolve) => {
      const done = useOwnerStore.persist.onFinishHydration(() => {
        done();
        resolve();
      });
    });
  }
  return useOwnerStore.getState().ownerId;
}

/** When the owner's data was last refreshed, to ignore repeated SIGNED_IN events. */
let lastRefresh = 0;
const REFRESH_COOLDOWN_MS = 60_000;

/** Fetches everything server-backed for the current session. Never throws. */
async function refreshAccount(): Promise<void> {
  lastRefresh = Date.now();
  await Promise.allSettled([
    useProfileStore.getState().reload(),
    loadAddresses(),
    loadNotificationPrefs(),
    loadPrescriptions(),
    loadPaymentMethods(),
  ]);
  void syncWellness();
}

async function adopt(userId: string): Promise<void> {
  const owner = await persistedOwner();
  if (owner !== userId) {
    clearUserData();
    useOwnerStore.setState({ ownerId: userId });
    await refreshAccount();
    return;
  }
  if (Date.now() - lastRefresh > REFRESH_COOLDOWN_MS) await refreshAccount();
}

function forget(): void {
  clearUserData();
  useOwnerStore.setState({ ownerId: null });
  useAuthStatus.setState({ status: 'signedOut' });
}

async function handle(event: AuthChangeEvent, userId: string | null): Promise<void> {
  try {
    switch (event) {
      case 'INITIAL_SESSION':
      case 'SIGNED_IN':
        // INITIAL_SESSION with no user is a signed-out launch. Nothing is
        // cleared yet: the owner check runs when someone signs in, which is
        // when showing the wrong data would actually happen.
        if (userId) await adopt(userId);
        break;
      case 'USER_UPDATED':
        // An email change, a password change, a verified phone.
        await useProfileStore.getState().reload();
        break;
      case 'SIGNED_OUT':
        forget();
        break;
      default:
        break;
    }
  } finally {
    markAccountSettled();
  }
}

/**
 * Mounts the auth listener. Call once, at the root.
 *
 * The callback defers its work with `setTimeout`: supabase-js holds a lock
 * while it runs listeners, and calling back into the client from inside one
 * (as `getUser()` in the profile load does) can deadlock.
 */
export function useAccountSync(): void {
  useEffect(() => {
    if (!supabase) {
      markAccountSettled();
      return;
    }
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const userId = session?.user?.id ?? null;
      // Synchronous on purpose: it touches no Supabase API, and the guard should
      // see a sign-out (including a refresh token the server rejected) at once.
      useAuthStatus.setState({ status: userId ? 'signedIn' : 'signedOut' });
      setTimeout(() => {
        void handle(event, userId);
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, []);
}

/**
 * Signs out and forgets the person.
 *
 * Unsent workouts get a few seconds to reach their owner's account first —
 * after this the outbox is emptied, and that is the last chance to keep them.
 * `everywhere` ends every session on every device; account deletion uses it,
 * an ordinary Log out does not.
 */
export async function endSession(options: { everywhere?: boolean } = {}): Promise<void> {
  await Promise.race([
    syncWellness().catch(() => {}),
    new Promise<void>((resolve) => setTimeout(resolve, 4_000)),
  ]);
  await signOut(options.everywhere ? 'global' : 'local').catch(() => {});
  await clearSession();
  forget();
}
