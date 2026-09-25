/**
 * Saved payment methods, backed by the server.
 *
 * Same shape as the address book (features/profile/addresses): the wallet
 * store is what screens read, and with a backend it is a cache of the
 * `payment_methods` table. Writes go to the server first, then the list is
 * re-read, so the default shown is the one the database holds.
 *
 * Mobile money wallets are saved here. Cards typed on this phone stay local
 * until Paystack tokenises them — the database will not take a card from the
 * app (0013) — and `replaceServerMethods` keeps them alongside.
 *
 * Under fixtures the wallet's local actions are used unchanged.
 */
import {
  USING_FIXTURES,
  addMomoWallet,
  listPaymentMethods,
  removePaymentMethod,
  setDefaultPaymentMethod,
  type SavedPaymentMethod,
} from '@/lib/api';
import { SUPABASE_CONFIGURED } from '@/lib/supabase';
import { momoMethod, useWalletStore, type MomoDraft, type PaymentMethod } from './store';

const isServerMethod = (id: string) => !id.startsWith('card-') && !id.startsWith('momo-');

function toMethod(m: SavedPaymentMethod): PaymentMethod | null {
  if (m.kind === 'momo' && m.momoPhone && m.momoProvider) {
    return momoMethod(m.id, m.momoPhone, m.momoProvider);
  }
  if (m.kind === 'card') {
    return {
      id: m.id,
      icon: 'card',
      tint: 'raised',
      title: m.label,
      subtitle: m.subtitle,
      saved: true,
      brand: m.label,
    };
  }
  return null;
}

const serverBacked = () => SUPABASE_CONFIGURED && !USING_FIXTURES;

/** Replaces the cached methods with the server's. Throws on failure. */
export async function loadPaymentMethods(): Promise<void> {
  if (!serverBacked()) return;
  const list = await listPaymentMethods();
  const methods = list.map(toMethod).filter(Boolean) as PaymentMethod[];
  const defaultId = list.find((m) => m.isDefault)?.id ?? '';
  useWalletStore.getState().replaceServerMethods(methods, defaultId);
}

export async function saveMomoWallet(draft: MomoDraft, makeDefault: boolean): Promise<void> {
  const wallet = useWalletStore.getState();
  if (!serverBacked()) {
    wallet.addMomo(draft, makeDefault);
    return;
  }
  // The first method saved is the default whatever the box says.
  const first = !wallet.methods.some((m) => isServerMethod(m.id));
  await addMomoWallet(draft, makeDefault || first);
  await loadPaymentMethods();
}

export async function deleteMethod(id: string): Promise<void> {
  const wallet = useWalletStore.getState();
  if (!serverBacked() || !isServerMethod(id)) {
    wallet.removeMethod(id);
    return;
  }
  await removePaymentMethod(id);
  if (id === wallet.defaultMethodId) {
    const next = wallet.methods.find((m) => m.id !== id && isServerMethod(m.id));
    if (next) await setDefaultPaymentMethod(next.id).catch(() => {});
  }
  await loadPaymentMethods();
}

export async function makeDefaultMethod(id: string): Promise<void> {
  const wallet = useWalletStore.getState();
  if (!serverBacked() || !isServerMethod(id)) {
    wallet.setDefaultMethod(id);
    return;
  }
  await setDefaultPaymentMethod(id);
  await loadPaymentMethods();
}
