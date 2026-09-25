/**
 * The wallet, and the checkout draft.
 *
 * Two stores with deliberately different lifetimes.
 *
 * **`useWalletStore` — saved addresses and instruments. Persisted.** These
 * belong to the person, not to an order: adding an address in the Address Book
 * has to still be there at checkout an hour later, and deleting a card has to
 * stay deleted. Before this they were module-level `const` arrays, which is why
 * Add / Edit / Delete on those screens did nothing — there was nothing to write
 * to, so the forms collected input and dropped it on `router.back()`.
 *
 * **`useCheckoutStore` — the draft. NOT persisted.** A delivery address and a
 * payment method chosen for one order in one sitting; restoring them a week
 * later, silently, on the screen immediately before an authorisation is not a
 * convenience. It holds ids only and resolves them against the wallet.
 *
 * No credential is stored in either. A card contributes its brand, last four
 * and expiry — what Paystack returns after tokenising. The PAN and CVV entered
 * on the Add-card form are used to build that summary and are never written
 * anywhere; see `addCard`.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { IconName } from '@/components/ui/Icon';
import { FIXTURE_PROFILE, localPhone } from '@/lib/profile';
import { FIXTURE_PHARMACY } from '@/lib/pharmacies';
import { USING_FIXTURES, type LatLng } from '@/lib/api';
import { formatGhanaMobile, providerName, type MomoProvider } from '@/lib/momo';

export type Address = {
  id: string;
  icon: IconName;
  title: string;
  badge?: string;
  subtitle: string;
  meta: string;
  /** Where the rider should go, when the person dropped a pin. */
  pin?: LatLng;
};

export type DeliverySpeed = {
  id: string;
  icon: IconName;
  title: string;
  subtitle: string;
  meta: string;
  fee: number;
};

export type PaymentMethod = {
  id: string;
  icon: IconName;
  tint: 'brand' | 'raised';
  title: string;
  badge?: string;
  subtitle: string;
  /** A saved instrument the user manages (Payment methods), not a generic option. */
  saved?: boolean;
  /** Structured facts for the instruments — screens compose their own labels. */
  brand?: string;
  last4?: string;
  expires?: string;
  wallet?: string;
  /** Mobile money: the network. */
  provider?: MomoProvider;
};

/** "Visa ending 7281" / "MTN Mobile Money" — the short form for settings rows. */
export function methodLabel(m: PaymentMethod): string {
  return m.last4 ? `${m.brand ?? m.title} ending ${m.last4}` : (m.brand ?? m.title);
}

/** Delivery speeds are the operation's, not the user's — they are not editable. */
export const SPEEDS: DeliverySpeed[] = [
  { id: 'standard', icon: 'send', title: 'Standard', subtitle: 'Today, 6–8 PM', meta: '₵15', fee: 15 },
  { id: 'express', icon: 'clock', title: 'Express', subtitle: 'Within 90 minutes', meta: '₵30', fee: 30 },
  {
    id: 'collect',
    icon: 'shield-check',
    title: 'Collect in person',
    subtitle: `${FIXTURE_PHARMACY.name} · ${FIXTURE_PHARMACY.distanceKm} km`,
    meta: 'Free',
    fee: 0,
  },
];

/**
 * Options that are always offered rather than saved: a bank transfer is a way
 * to pay, not an instrument on file. It appears at checkout and never in the
 * Payment Methods list, which is why `saved` is the flag that separates them.
 * (Telecel Cash used to be one of these; it is now a wallet you save, like MTN.)
 */
const UNSAVED_METHODS: PaymentMethod[] = [
  {
    id: 'bank',
    icon: 'wallet',
    tint: 'raised',
    title: 'Bank transfer',
    subtitle: 'Pay from your bank app',
  },
];

const seedAddresses = (): Address[] =>
  USING_FIXTURES
    ? [
        {
          id: 'home',
          icon: 'location',
          title: 'Home',
          subtitle: '18 Ring Road East, Osu, Accra',
          meta: 'Gate code 4471 · call on arrival',
        },
        {
          id: 'office',
          icon: 'location',
          title: 'Office',
          subtitle: '7 Independence Avenue, Airport Residential, Accra',
          meta: 'Reception, 3rd floor',
        },
      ]
    : [];

// Mobile Money leads because it leads the market in Ghana — cards are the
// fallback here, not the default.
const seedMethods = (): PaymentMethod[] =>
  USING_FIXTURES
    ? [
        {
          id: 'momo',
          icon: 'wallet',
          tint: 'brand',
          title: 'MTN Mobile Money',
          // The wallet is the account holder's own number.
          subtitle: localPhone(FIXTURE_PROFILE.phone),
          saved: true,
          brand: 'MTN Mobile Money',
          wallet: localPhone(FIXTURE_PROFILE.phone),
        },
        {
          id: 'visa',
          icon: 'card',
          tint: 'brand',
          title: 'Visa •••• 7281',
          subtitle: 'Expires 07/26',
          saved: true,
          brand: 'Visa',
          last4: '7281',
          expires: '07/26',
        },
        {
          id: 'mastercard',
          icon: 'card',
          tint: 'raised',
          title: 'Mastercard •••• 4419',
          subtitle: 'Expires 11/27',
          saved: true,
          brand: 'Mastercard',
          last4: '4419',
          expires: '11/27',
        },
      ]
    : [];

/** What the Add-address form collects. */
export type AddressDraft = {
  title: string;
  subtitle: string;
  meta: string;
  pin?: LatLng;
};

/** What the Add mobile money form collects: a ten-digit local number and its network. */
export type MomoDraft = {
  phone: string;
  provider: MomoProvider;
};

/** A saved mobile money wallet as the screens draw it. */
export function momoMethod(id: string, phone: string, provider: MomoProvider): PaymentMethod {
  return {
    id,
    icon: 'wallet',
    tint: 'brand',
    title: providerName(provider),
    subtitle: formatGhanaMobile(phone),
    saved: true,
    brand: providerName(provider),
    wallet: formatGhanaMobile(phone),
    provider,
  };
}

/** What the Add-card form collects. The PAN and CVV never leave the screen. */
export type CardDraft = {
  number: string;
  holder: string;
  expiry: string;
};

/** Card brand from the leading digits — the same rule Paystack applies. */
export function cardBrand(number: string): string {
  const n = number.replace(/\D/g, '');
  if (/^4/.test(n)) return 'Visa';
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'Mastercard';
  if (/^3[47]/.test(n)) return 'American Express';
  if (/^6/.test(n)) return 'Verve';
  return 'Card';
}

type WalletState = {
  addresses: Address[];
  methods: PaymentMethod[];
  defaultAddressId: string;
  defaultMethodId: string;

  addAddress: (draft: AddressDraft, makeDefault: boolean) => string;
  updateAddress: (id: string, draft: AddressDraft, makeDefault: boolean) => void;
  removeAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
  /** Adopts the server's address book wholesale — see features/profile/addresses. */
  replaceAddresses: (addresses: Address[], defaultAddressId: string) => void;

  addCard: (draft: CardDraft, makeDefault: boolean) => string;
  /** Under fixtures only; with a backend, wallets are saved through features/checkout/methods. */
  addMomo: (draft: MomoDraft, makeDefault: boolean) => string;
  /**
   * Adopts the server's saved methods. Cards added on this phone (local only,
   * until Paystack tokenises them) are kept alongside.
   */
  replaceServerMethods: (methods: PaymentMethod[], defaultMethodId: string) => void;
  removeMethod: (id: string) => void;
  setDefaultMethod: (id: string) => void;
};

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}`;

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      addresses: seedAddresses(),
      methods: seedMethods(),
      defaultAddressId: seedAddresses()[0]?.id ?? '',
      defaultMethodId: seedMethods()[0]?.id ?? '',

      addAddress: (draft, makeDefault) => {
        const id = uid('addr');
        const address: Address = { id, icon: 'location', ...draft };
        set((s) => ({
          addresses: [...s.addresses, address],
          // The first address saved is the default whatever the toggle says —
          // an address book with no default cannot be checked out from.
          defaultAddressId: makeDefault || !s.addresses.length ? id : s.defaultAddressId,
        }));
        return id;
      },

      updateAddress: (id, draft, makeDefault) =>
        set((s) => ({
          addresses: s.addresses.map((a) => (a.id === id ? { ...a, ...draft } : a)),
          defaultAddressId: makeDefault ? id : s.defaultAddressId,
        })),

      removeAddress: (id) =>
        set((s) => {
          const addresses = s.addresses.filter((a) => a.id !== id);
          return {
            addresses,
            // Deleting the default promotes the next one rather than leaving
            // the selection pointing at something that no longer exists.
            defaultAddressId:
              s.defaultAddressId === id ? (addresses[0]?.id ?? '') : s.defaultAddressId,
          };
        }),

      setDefaultAddress: (defaultAddressId) => set({ defaultAddressId }),

      replaceAddresses: (addresses, defaultAddressId) => set({ addresses, defaultAddressId }),

      addCard: ({ number, holder, expiry }, makeDefault) => {
        const id = uid('card');
        const digits = number.replace(/\D/g, '');
        const brand = cardBrand(digits);
        const last4 = digits.slice(-4);
        // Only the summary is kept. The number and CVV stay in the form's own
        // state and are gone the moment the screen unmounts.
        const method: PaymentMethod = {
          id,
          icon: 'card',
          tint: 'raised',
          title: `${brand} •••• ${last4}`,
          subtitle: `Expires ${expiry}`,
          saved: true,
          brand,
          last4,
          expires: expiry,
          wallet: holder || undefined,
        };
        set((s) => ({
          methods: [...s.methods, method],
          defaultMethodId: makeDefault || !s.methods.length ? id : s.defaultMethodId,
        }));
        return id;
      },

      addMomo: ({ phone, provider }, makeDefault) => {
        const id = uid('momo');
        set((s) => ({
          methods: [...s.methods, momoMethod(id, phone, provider)],
          defaultMethodId: makeDefault || !s.methods.length ? id : s.defaultMethodId,
        }));
        return id;
      },

      replaceServerMethods: (methods, defaultMethodId) =>
        set((s) => {
          const localCards = s.methods.filter((m) => m.id.startsWith('card-'));
          const all = [...methods, ...localCards];
          return {
            methods: all,
            defaultMethodId:
              defaultMethodId ||
              (all.some((m) => m.id === s.defaultMethodId) ? s.defaultMethodId : (all[0]?.id ?? '')),
          };
        }),

      removeMethod: (id) =>
        set((s) => {
          const methods = s.methods.filter((m) => m.id !== id);
          return {
            methods,
            defaultMethodId:
              s.defaultMethodId === id ? (methods[0]?.id ?? '') : s.defaultMethodId,
          };
        }),

      setDefaultMethod: (defaultMethodId) => set({ defaultMethodId }),
    }),
    {
      name: 'altruist.wallet',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/** Saved addresses, default first — the order every list on every screen uses. */
export function useAddresses(): Address[] {
  const addresses = useWalletStore((s) => s.addresses);
  const defaultId = useWalletStore((s) => s.defaultAddressId);
  return [...addresses].sort((a, b) =>
    a.id === defaultId ? -1 : b.id === defaultId ? 1 : 0,
  );
}

/** Instruments the user manages: saved ones only. */
export function useSavedMethods(): PaymentMethod[] {
  const methods = useWalletStore((s) => s.methods);
  const defaultId = useWalletStore((s) => s.defaultMethodId);
  return [...methods].sort((a, b) => (a.id === defaultId ? -1 : b.id === defaultId ? 1 : 0));
}

/** Everything offerable at checkout: saved instruments plus the always-on options. */
export function useCheckoutMethods(): PaymentMethod[] {
  const saved = useSavedMethods();
  return [...saved, ...UNSAVED_METHODS];
}

type CheckoutState = {
  /** Empty means "use the wallet default" — resolved in `useCheckoutSelection`. */
  addressId: string;
  speedId: string;
  methodId: string;
  promo: string;
  setAddress: (id: string) => void;
  setSpeed: (id: string) => void;
  setMethod: (id: string) => void;
  setPromo: (code: string) => void;
  /** Called after an order is placed, so the next one starts from the defaults. */
  reset: () => void;
};

const DEFAULTS = { addressId: '', speedId: 'standard', methodId: '', promo: '' };

export const useCheckoutStore = create<CheckoutState>((set) => ({
  ...DEFAULTS,
  setAddress: (addressId) => set({ addressId }),
  setSpeed: (speedId) => set({ speedId }),
  setMethod: (methodId) => set({ methodId }),
  setPromo: (promo) => set({ promo }),
  reset: () => set(DEFAULTS),
}));

/**
 * The three selections resolved to the objects the screens render.
 *
 * An unset draft selection falls back to the wallet default, so a new order
 * starts on the address and instrument the user marked, and a deleted one
 * cannot leave checkout pointing at a record that is gone.
 */
export function useCheckoutSelection() {
  const addressId = useCheckoutStore((s) => s.addressId);
  const speedId = useCheckoutStore((s) => s.speedId);
  const methodId = useCheckoutStore((s) => s.methodId);
  const addresses = useAddresses();
  const methods = useCheckoutMethods();
  const defaultAddressId = useWalletStore((s) => s.defaultAddressId);
  const defaultMethodId = useWalletStore((s) => s.defaultMethodId);

  const address =
    addresses.find((a) => a.id === addressId) ??
    addresses.find((a) => a.id === defaultAddressId) ??
    addresses[0];
  const method =
    methods.find((m) => m.id === methodId) ??
    methods.find((m) => m.id === defaultMethodId) ??
    methods[0];

  return {
    address: address as Address | undefined,
    speed: SPEEDS.find((s) => s.id === speedId) ?? SPEEDS[0],
    method: method as PaymentMethod | undefined,
  };
}
