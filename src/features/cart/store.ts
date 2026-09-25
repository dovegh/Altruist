/**
 * The cart.
 *
 * Stores product ids and quantities — never names, never prices. A persisted
 * price is a price that can be wrong: the phone comes back a week later, the
 * pharmacy has repriced the pack, and the cart cheerfully charges the old
 * number. Everything displayable is joined from the catalogue at render time by
 * `useCart()`, so the cart is always priced at today's price.
 *
 * Persisted to AsyncStorage rather than SecureStore. A cart is not a secret; it
 * is also the thing most likely to be lost to a crash mid-checkout, and losing
 * it is the difference between "try again" and "start again".
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type CartItem = {
  productId: string;
  qty: number;
};

export const MAX_QTY = 99;

type CartState = {
  items: CartItem[];
  /**
   * False until AsyncStorage has been read. The cart renders its empty state
   * from `items.length === 0`, which is also true for the half-second before
   * rehydration — without this flag a user with three items in their cart sees
   * "Your cart is empty" flash on every cold start.
   */
  hydrated: boolean;
  /** Adds, or raises the quantity if the product is already in the cart. */
  add: (productId: string, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      hydrated: false,

      add: (productId, qty = 1) =>
        set((s) => {
          const existing = s.items.find((i) => i.productId === productId);
          if (!existing) return { items: [...s.items, { productId, qty }] };
          // Adding something already in the cart raises its quantity rather than
          // appending a second line — two lines for one product is how a cart
          // ends up showing "Qty 1" twice and charging for two.
          return {
            items: s.items.map((i) =>
              i.productId === productId ? { ...i, qty: Math.min(MAX_QTY, i.qty + qty) } : i,
            ),
          };
        }),

      setQty: (productId, qty) =>
        set((s) => ({
          // Stepping to zero removes the line. The stepper's own `min` holds it
          // at 1, so this path only runs from a caller that means it.
          items:
            qty <= 0
              ? s.items.filter((i) => i.productId !== productId)
              : s.items.map((i) =>
                  i.productId === productId ? { ...i, qty: Math.min(MAX_QTY, qty) } : i,
                ),
        })),

      remove: (productId) =>
        set((s) => ({ items: s.items.filter((i) => i.productId !== productId) })),

      clear: () => set({ items: [] }),
    }),
    {
      name: 'altruist.cart',
      storage: createJSONStorage(() => AsyncStorage),
      // Only the items are written. `hydrated` is a fact about this launch.
      partialize: (s) => ({ items: s.items }),
      onRehydrateStorage: () => (state) => {
        // Runs on success and on failure — a corrupt or missing key must still
        // let the UI leave its loading state.
        useCartStore.setState({ hydrated: true, items: state?.items ?? [] });
      },
    },
  ),
);

/** Total number of units in the cart — what the cart badge counts. */
export const cartCount = (items: CartItem[]) => items.reduce((n, i) => n + i.qty, 0);
