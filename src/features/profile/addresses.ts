/**
 * The address book, backed by the server.
 *
 * The wallet store (`features/checkout/store.ts`) stays what the screens read —
 * it is persisted, so the book still shows on a train with no signal — but with
 * a backend configured it becomes a cache of the `addresses` table rather than
 * the only copy. Every write here goes to the server first and then re-reads
 * the list, so the default flag on screen is always the one the database holds
 * (it can move: saving the first address makes it the default, and deleting
 * the default promotes the next).
 *
 * Write-through rather than the wellness outbox, on purpose. An address is
 * edited a few times a year, and it is the thing a rider drives to. A queued
 * edit that silently failed to sync would put the old address on the next
 * order; failing loudly at the form, while the person is looking at it, is the
 * right trade here.
 *
 * Under fixtures the wallet's own local actions are used unchanged.
 */
import {
  USING_FIXTURES,
  deleteAddress as apiDeleteAddress,
  listAddresses,
  saveAddress as apiSaveAddress,
  setDefaultAddress as apiSetDefaultAddress,
  type SavedAddress,
} from '@/lib/api';
import { useWalletStore, type Address, type AddressDraft } from '@/features/checkout/store';

const toAddress = (a: SavedAddress): Address => ({
  id: a.id,
  icon: 'location',
  title: a.label,
  subtitle: a.line,
  meta: a.note,
  pin: a.pin,
});

/** Replaces the cached book with the server's. Throws on failure. */
export async function loadAddresses(): Promise<void> {
  if (USING_FIXTURES) return;
  const list = await listAddresses();
  const defaultId = list.find((a) => a.isDefault)?.id ?? list[0]?.id ?? '';
  useWalletStore.getState().replaceAddresses(list.map(toAddress), defaultId);
}

/** Creates (no `id`) or updates an address. Throws with the api's error types. */
export async function saveAddress(
  draft: AddressDraft,
  makeDefault: boolean,
  id?: string,
): Promise<void> {
  const wallet = useWalletStore.getState();
  if (USING_FIXTURES) {
    if (id) wallet.updateAddress(id, draft, makeDefault);
    else wallet.addAddress(draft, makeDefault);
    return;
  }
  await apiSaveAddress(
    { label: draft.title, line: draft.subtitle, note: draft.meta, pin: draft.pin },
    // The first address saved is the default whatever the toggle says — an
    // address book with no default cannot be checked out from.
    { id, makeDefault: makeDefault || wallet.addresses.length === 0 },
  );
  await loadAddresses();
}

export async function removeAddress(id: string): Promise<void> {
  const wallet = useWalletStore.getState();
  if (USING_FIXTURES) {
    wallet.removeAddress(id);
    return;
  }
  await apiDeleteAddress(id);
  // Deleting the default promotes the next rather than leaving checkout with
  // nothing marked. Best effort: checkout already falls back to the first
  // address if no default is set, so a failure here is not worth an error.
  if (id === wallet.defaultAddressId) {
    const next = wallet.addresses.find((a) => a.id !== id);
    if (next) await apiSetDefaultAddress(next.id).catch(() => {});
  }
  await loadAddresses();
}

export async function makeDefaultAddress(id: string): Promise<void> {
  if (USING_FIXTURES) {
    useWalletStore.getState().setDefaultAddress(id);
    return;
  }
  await apiSetDefaultAddress(id);
  await loadAddresses();
}
