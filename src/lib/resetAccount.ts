/**
 * Forgetting a person.
 *
 * Two entry points, one list of stores:
 *
 *   `clearUserData()` — everything this device holds about the signed-in
 *   person: cart, prescriptions, orders, wallet, wellness history and outbox,
 *   saved products, recent searches, notification read state and preferences,
 *   and the cached profile. Runs on sign-out and whenever a different account signs in on
 *   this device (see `features/account/session.ts`). Without it, the next
 *   person to sign in on a shared phone would see the last person's name,
 *   addresses and prescriptions — and the wellness outbox would upload the
 *   last person's workouts into the new person's account.
 *
 *   `resetToNewAccount()` — the developer reset in Settings: the same, plus the
 *   session and the first-run flag, so onboarding plays again.
 *
 * **Why it writes empty values rather than deleting the keys.** Each store seeds
 * itself from fixtures when its persisted key is ABSENT — that is what makes a
 * fresh install useful in development. Deleting the keys would therefore restore
 * the seeded addresses, cards, prescriptions and five wellness sessions on the
 * next launch, which is the opposite of what "nobody is signed in" means.
 * Writing an explicit empty state persists as "this person has nothing yet".
 *
 * Left alone on purpose: the theme preference and the partner pharmacy. Both
 * describe the device and the area, not the person.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetFirstRun } from './session';
import { setBiometricEnabled } from './appLock';
import { EMPTY_PROFILE } from './profile';
import { useCartStore } from '@/features/cart/store';
import { useOrderStore } from '@/features/orders/store';
import { usePrescriptionStore } from '@/features/prescriptions/store';
import { useWalletStore, useCheckoutStore } from '@/features/checkout/store';
import { useWellnessStore } from '@/features/wellness/store';
import { useSavedStore } from '@/features/catalog/saved';
import { useRecentSearchStore } from '@/features/catalog/recent';
import { useNotificationStore } from '@/features/notifications/store';
import { useNotificationPrefsStore } from '@/features/notifications/preferences';
import { useProfileStore } from '@/features/profile/store';

/** Cached reads that are not account data and can simply be dropped. */
const DROPPABLE_KEYS = ['altruist.profile', 'altruist.partner-pharmacy'];

/** Empties every per-person store, in memory and in storage. Synchronous. */
export function clearUserData(): void {
  useCartStore.setState({ items: [], hydrated: true });
  useOrderStore.setState({ items: [], hydrated: true, lastOrderId: undefined });
  usePrescriptionStore.setState({ items: [], hydrated: true });
  useWalletStore.setState({
    addresses: [],
    methods: [],
    defaultAddressId: '',
    defaultMethodId: '',
  });
  useCheckoutStore.getState().reset();
  useWellnessStore.setState({
    history: [],
    active: null,
    hydration: { day: '', glasses: 0 },
    saved: [],
    // The outbox goes too. Leaving it would upload these entries under
    // whichever account signs in next.
    pending: [],
    syncedAt: null,
  });
  useSavedStore.setState({ ids: [] });
  useRecentSearchStore.setState({ terms: [] });
  useNotificationStore.setState({ read: [] });
  useNotificationPrefsStore.setState({ prefs: null });
  // Biometric unlock was this person's choice; the next one sets their own.
  void setBiometricEnabled(false);
  useProfileStore.setState({ value: EMPTY_PROFILE, loaded: false });
}

export async function resetToNewAccount(): Promise<void> {
  // In-memory first, so the UI is empty before anything navigates. Every
  // `setState` has already been written by the persist middleware, so the next
  // launch rehydrates to empty rather than re-seeding.
  clearUserData();
  await Promise.allSettled([AsyncStorage.multiRemove(DROPPABLE_KEYS), resetFirstRun()]);
}
