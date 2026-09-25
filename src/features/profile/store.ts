/**
 * Who is signed in, and who fulfils their orders.
 *
 * Two tiny stores with the same shape: hydrate once from the api seam, keep
 * the last good value across restarts, expose a hook. Screens call
 * `useProfile()` / `usePartnerPharmacy()` and get a value on the first render
 * (the persisted one, or the fixture under fixtures) — no loading state to
 * draw for a name in a header.
 *
 * Persisted values are display data only (name, email, phone, pharmacy
 * details). Nothing here is a credential.
 *
 * `load()` runs once per launch; `reload()` ignores that and fetches again.
 * The account module calls `reload()` whenever a session starts or the user
 * record changes, which is what stops a header greeting the previous person
 * after a sign-in on the same launch.
 */
import { useEffect } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPartnerPharmacy, getProfile, USING_FIXTURES } from '@/lib/api';
import { EMPTY_PROFILE, FIXTURE_PROFILE, type Profile } from '@/lib/profile';
import { FIXTURE_PHARMACY, type Pharmacy } from '@/lib/pharmacies';

type Slice<T> = {
  value: T;
  loaded: boolean;
  load: () => Promise<void>;
  /** Fetch again even if this launch already loaded once. */
  reload: () => Promise<void>;
  /** Local edit (Edit profile) — optimistic; the server write lives in the screen. */
  set: (patch: Partial<T>) => void;
};

function slice<T extends object>(
  name: string,
  fallback: T,
  fetch: () => Promise<T>,
) {
  return create<Slice<T>>()(
    persist(
      (set, get) => ({
        value: fallback,
        loaded: false,
        load: async () => {
          if (get().loaded) return;
          await get().reload();
        },
        reload: async () => {
          try {
            const value = await fetch();
            set({ value, loaded: true });
          } catch {
            // Keep whatever we have: the last good copy beats a blank header
            // while the network is out. It is still this person's copy — the
            // account module empties it when a different person signs in.
            set({ loaded: true });
          }
        },
        set: (patch) => set({ value: { ...get().value, ...patch } }),
      }),
      {
        name,
        storage: createJSONStorage(() => AsyncStorage),
        partialize: (s) => ({ value: s.value }),
      },
    ),
  );
}

export const useProfileStore = slice<Profile>(
  'altruist.profile',
  USING_FIXTURES ? FIXTURE_PROFILE : EMPTY_PROFILE,
  getProfile,
);

export const usePharmacyStore = slice<Pharmacy>(
  'altruist.partner-pharmacy',
  FIXTURE_PHARMACY,
  getPartnerPharmacy,
);

/** The signed-in person. Triggers the one-time load on first use. */
export function useProfile(): Profile {
  const value = useProfileStore((s) => s.value);
  const load = useProfileStore((s) => s.load);
  useEffect(() => {
    void load();
  }, [load]);
  return value;
}

/** The partner pharmacy for the user's area. */
export function usePartnerPharmacy(): Pharmacy {
  const value = usePharmacyStore((s) => s.value);
  const load = usePharmacyStore((s) => s.load);
  useEffect(() => {
    void load();
  }, [load]);
  return value;
}
