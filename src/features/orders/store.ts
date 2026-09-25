/**
 * Orders.
 *
 * Unlike the cart, an order **snapshots** everything: the item names, the price
 * each was bought at, the address it went to, the method it was paid with. An
 * order is a record of something that happened, so it must not change when the
 * catalogue does. A receipt that re-reads today's price is not a receipt.
 *
 * `events` is SRS §3's missing `order_status_events` table, which Order
 * Tracking's timeline needs — a status enum alone cannot say when each step
 * happened, and the timeline is drawn with a timestamp per step.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LifecycleStatus } from '@/components/ui/PrescriptionCard';
import type { CartLine } from '../cart/useCart';

export type OrderLine = {
  productId: string;
  name: string;
  pack: string;
  /** The price at the moment of purchase. Never re-read from the catalogue. */
  unitPrice: number;
  qty: number;
  requiresPrescription: boolean;
};

export type OrderEvent = {
  title: string;
  subtitle: string;
  at: number;
  state: 'complete' | 'current' | 'upcoming';
};

export type Order = {
  /** The TrxID. */
  id: string;
  /** Paystack's reference for the authorisation. */
  reference: string;
  status: LifecycleStatus;
  placedAt: number;
  lines: OrderLine[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  total: number;
  pharmacy: string;
  addressLabel: string;
  addressLine: string;
  speedLabel: string;
  speedEta: string;
  methodLabel: string;
  /** SRS §3 `orders.prescription_id`. */
  prescriptionId?: string;
  events: OrderEvent[];
};

/** Statuses where the order is still moving, so Track and Cancel apply. */
export const IN_MOTION: LifecycleStatus[] = ['RECEIVED', 'VERIFYING', 'PACKING', 'DISPATCHED'];

/** Which timeline index each status corresponds to. See `initialEvents`. */
const STEP_OF: Partial<Record<LifecycleStatus, number>> = {
  RECEIVED: 0,
  VERIFYING: 1,
  VERIFIED: 1,
  PACKING: 2,
  DISPATCHED: 3,
  DELIVERED: 4,
};

type OrdersState = {
  items: Order[];
  hydrated: boolean;
  /** The order just placed — what Order Placed and Tracking open onto. */
  lastOrderId?: string;
  place: (order: Order) => void;
  setStatus: (id: string, status: LifecycleStatus) => void;
};

export const useOrderStore = create<OrdersState>()(
  persist(
    (set) => ({
      items: [],
      hydrated: false,

      place: (order) =>
        set((s) => ({ items: [order, ...s.items], lastOrderId: order.id })),

      /**
       * Moves the order to a later step and stamps the timeline with it.
       *
       * Everything before the new step becomes `complete`, the step itself
       * `current`, everything after it `upcoming`. Setting the status without
       * moving the timeline is how Tracking ends up showing DISPATCHED in the
       * pill and "Packing" as the live step.
       */
      setStatus: (id, status) =>
        set((s) => ({
          items: s.items.map((o) => {
            if (o.id !== id) return o;
            const step = STEP_OF[status];
            if (step === undefined) return { ...o, status };
            return {
              ...o,
              status,
              events: o.events.map((e, i) => ({
                ...e,
                at: i <= step && !e.at ? Date.now() : e.at,
                state: i < step ? 'complete' : i === step ? 'current' : 'upcoming',
              })),
            };
          }),
        })),
    }),
    {
      name: 'altruist.orders',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ items: s.items, lastOrderId: s.lastOrderId }),
      onRehydrateStorage: () => (state) => {
        useOrderStore.setState({
          hydrated: true,
          items: state?.items ?? [],
          lastOrderId: state?.lastOrderId,
        });
      },
    },
  ),
);

/** Builds the order's line snapshot from the live cart. */
export const snapshotLines = (lines: CartLine[]): OrderLine[] =>
  lines.map((l) => ({
    productId: l.product.id,
    name: l.product.name,
    pack: `${l.product.pack} · ${l.product.brand}`,
    unitPrice: l.product.price,
    qty: l.qty,
    requiresPrescription: l.product.requiresPrescription,
  }));

/**
 * The five lifecycle steps, timestamped from the moment the order was placed.
 *
 * A newly placed order is RECEIVED: the pharmacy has it, a pharmacist has not
 * picked it up yet. Everything after that is `upcoming` — the timeline must not
 * promise steps that have not happened, which is exactly what a pre-filled
 * "Delivered · today 6–8 PM" marked complete would do.
 */
export function initialEvents(order: {
  placedAt: number;
  pharmacy: string;
  addressLine: string;
  speedEta: string;
  hasPrescription: boolean;
}): OrderEvent[] {
  return [
    {
      title: 'Order received',
      subtitle: `Sent to ${order.pharmacy}`,
      at: order.placedAt,
      state: 'current',
    },
    {
      title: order.hasPrescription ? 'Prescription verified' : 'Order confirmed',
      subtitle: order.hasPrescription
        ? 'A pharmacist checks your script against the order'
        : 'Pharmacist confirms the items',
      at: 0,
      state: 'upcoming',
    },
    {
      title: 'Packing',
      subtitle: 'Pharmacist preparing your items',
      at: 0,
      state: 'upcoming',
    },
    {
      title: 'Dispatched',
      subtitle: 'Rider on the way',
      at: 0,
      state: 'upcoming',
    },
    {
      title: 'Delivered',
      subtitle: order.addressLine,
      at: 0,
      state: 'upcoming',
    },
  ];
}
