/**
 * The cart, priced and gated.
 *
 * `useCartStore` holds ids and quantities; this joins them to the live
 * catalogue and to the prescription store, and returns the one shape every
 * checkout surface needs. Cart, Checkout — Delivery, Checkout — Payment and
 * Checkout — Processing all read this, so the four screens cannot disagree
 * about what is in the order or what it costs.
 *
 * **The gate.** SRS §3: an item with `requires_prescription` cannot be
 * dispensed without a VERIFIED script covering it. `blocked` is derived here
 * rather than tracked as a flag, so there is no state to forget to update — an
 * item is blocked exactly while nothing covers it.
 */
import { useEffect, useMemo } from 'react';
import { useCartStore, type CartItem } from './store';
import { usePrescriptionStore, coveringId, isAwaitingReview } from '../prescriptions/store';
import { useProducts } from '../catalog/queries';
import type { Product } from '@/lib/catalog';

export type CartLine = {
  product: Product;
  qty: number;
  /** `price × qty` — what this line adds to the subtotal. */
  amount: number;
  /** Rx item with no VERIFIED script covering it. Blocks checkout. */
  blocked: boolean;
  /** Rx item whose script is uploaded but not reviewed yet. Also blocks. */
  awaitingReview: boolean;
  /** `orders.prescription_id` for this line, once one exists. */
  prescriptionId?: string;
};

/** Standard delivery. The Delivery step can raise it; the Cart shows this one. */
export const STANDARD_DELIVERY = 15;

/**
 * Free delivery over this subtotal.
 *
 * Onboarding promises this to every new user on the second slide, and it is
 * repeated on the welcome screen. It was copy with nothing behind it: delivery
 * was charged at every subtotal, so the app advertised something it did not
 * honour. One constant, applied here and quoted by the screens that promise it.
 */
export const FREE_DELIVERY_OVER = 170;

export function useCart(deliveryFee: number = STANDARD_DELIVERY) {
  const items = useCartStore((s) => s.items);
  const cartHydrated = useCartStore((s) => s.hydrated);
  const scripts = usePrescriptionStore((s) => s.items);
  const scriptsHydrated = usePrescriptionStore((s) => s.hydrated);
  const { data: products, isPending: productsPending } = useProducts();

  return useMemo(() => {
    const byId = new Map((products ?? []).map((p) => [p.id, p]));

    const lines: CartLine[] = items.flatMap((i: CartItem) => {
      const product = byId.get(i.productId);
      // A product that has left the catalogue drops out of the cart rather than
      // rendering as a blank row with a price of NaN.
      if (!product) return [];
      const prescriptionId = product.requiresPrescription
        ? coveringId(scripts, product.id)
        : undefined;
      return [
        {
          product,
          qty: i.qty,
          amount: product.price * i.qty,
          blocked: product.requiresPrescription && !prescriptionId,
          awaitingReview:
            product.requiresPrescription &&
            !prescriptionId &&
            isAwaitingReview(scripts, product.id),
          prescriptionId,
        },
      ];
    });

    const blocked = lines.filter((l) => l.blocked);
    const subtotal = lines.reduce((sum, l) => sum + l.amount, 0);
    // Free over the threshold the app advertises at onboarding. Applied to the
    // chosen speed too: someone who paid for Express and crossed the threshold
    // was promised free delivery, not free standard delivery.
    const qualifiesFree = subtotal >= FREE_DELIVERY_OVER;
    const delivery = lines.length && !qualifiesFree ? deliveryFee : 0;

    return {
      lines,
      blocked,
      /** Every distinct script this order dispenses against. */
      prescriptionIds: Array.from(
        new Set(lines.map((l) => l.prescriptionId).filter(Boolean) as string[]),
      ),
      /**
       * Units the cart will actually show and charge for.
       *
       * Counted from the joined lines, not the raw stored ids. Those diverge:
       * an id whose product has left the catalogue is dropped from `lines` but
       * still sits in storage, which is how the badge came to read "3" over an
       * empty cart after the demo catalogue was replaced by the VAFY import.
       */
      count: lines.reduce((n, l) => n + l.qty, 0),
      /** Stored ids the catalogue no longer knows about. Pruned below. */
      staleIds: products
        ? items.filter((i) => !byId.has(i.productId)).map((i) => i.productId)
        : [],
      subtotal,
      delivery,
      /** True when the threshold waived the fee — the Cart labels the row. */
      deliveryFree: lines.length > 0 && qualifiesFree,
      /** What is still to spend to qualify, or 0. Drives the nudge line. */
      toFreeDelivery: Math.max(0, FREE_DELIVERY_OVER - subtotal),
      /** No service fee is charged today; the row is drawn so the total adds up. */
      serviceFee: 0,
      total: subtotal + delivery,
      hasPrescriptionItem: lines.some((l) => l.product.requiresPrescription),
      canCheckout: lines.length > 0 && blocked.length === 0,
      isEmpty: lines.length === 0,
      /** Storage and the catalogue query both have to land before any of the above is true. */
      ready: cartHydrated && scriptsHydrated && !productsPending,
    };
  }, [items, scripts, products, productsPending, cartHydrated, scriptsHydrated, deliveryFee]);
}

/**
 * The badge number.
 *
 * Uses the same join as the Cart so the two can never disagree, and prunes any
 * id the catalogue has dropped. The join is shared React Query cache, so this
 * costs nothing extra beyond the map.
 */
export function useCartCount(): number {
  const { count, staleIds, ready } = useCart();
  const remove = useCartStore((s) => s.remove);

  // Cleaning up in an effect, not during render: the header renders this on
  // every screen, and a store write mid-render is the "cannot update a
  // component while rendering a different component" warning.
  useEffect(() => {
    if (!ready || !staleIds.length) return;
    staleIds.forEach(remove);
  }, [ready, staleIds, remove]);

  return count;
}
