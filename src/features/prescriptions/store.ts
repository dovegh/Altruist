/**
 * Prescriptions.
 *
 * This store owns one load-bearing question: **is this cart item covered by a
 * verified prescription?** Everything else here exists to answer it honestly.
 *
 * `productIds` is what makes the answer specific. A prescription is not a
 * blanket permission slip — it covers the items the pharmacist reviewed it
 * against. Modelling it as a global "user has a verified script" boolean is the
 * bug that lets someone attach a script for antibiotics and check out with a
 * controlled drug.
 *
 * SRS §3 wants `orders.prescription_id`, so an order records which script it
 * was dispensed against. `coveringId()` is what supplies that value.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { USING_FIXTURES, listPrescriptions } from '@/lib/api';
import { SUPABASE_CONFIGURED } from '@/lib/supabase';

/** The subset of `LifecycleStatus` that a prescription can actually be in. */
export type PrescriptionStatus = 'PENDING' | 'VERIFYING' | 'VERIFIED' | 'REJECTED';

export type Prescription = {
  /** The TrxID. Shown to the user and quoted to the pharmacy. */
  id: string;
  status: PrescriptionStatus;
  pharmacy: string;
  /** Pharmacist's note. On a rejection this is the reason, and it is never hidden. */
  note: string;
  uploadedAt: number;
  reviewedAt?: number;
  /** Who reviewed it, as the pharmacy recorded it. */
  reviewedBy?: string;
  /** Where the photo is stored (private bucket). Absent under fixtures. */
  imagePath?: string;
  /** The products this script covers. Empty = uploaded without a cart context. */
  productIds: string[];
};

/**
 * How long the fixture pharmacist takes. Real reviews take up to an hour; three
 * seconds is the development stand-in, long enough that PENDING is a state you
 * can actually see and short enough to demo the whole flow.
 */
const FIXTURE_REVIEW_MS = 3_000;

const seeded = (): Prescription[] => {
  const now = Date.now();
  const hours = (n: number) => now - n * 3_600_000;
  return [
    {
      id: 'CJ4901TUZ0',
      status: 'VERIFIED',
      pharmacy: 'Healthview Pharmacy',
      note: 'Approved by Akosua B. · Healthview Pharmacy',
      uploadedAt: hours(28),
      reviewedAt: hours(27),
      // Covers nothing, because there is nothing to cover: the catalogue is
      // currently the VAFY OTC slice and every product in it is general-sale.
      // Pointing this at an OTC item to make the demo look busier would be a
      // lie about the model — a prescription covers the specific medicines a
      // pharmacist reviewed it against. Empty is the documented state for a
      // script uploaded without a cart context, and it is the true one here.
      // These repopulate when the reviewed Rx catalogue lands.
      productIds: [],
    },
    {
      id: 'BQ2277KPL9',
      status: 'PENDING',
      pharmacy: 'Healthview Pharmacy',
      note: 'Awaiting pharmacist review',
      uploadedAt: hours(9),
      productIds: [],
    },
    {
      id: 'MA1043WQX2',
      status: 'REJECTED',
      pharmacy: 'Osu Care Chemist',
      note: 'Illegible dosage — please re-upload',
      uploadedAt: hours(54),
      reviewedAt: hours(52),
      productIds: [],
    },
  ];
};

type PrescriptionsState = {
  items: Prescription[];
  hydrated: boolean;
  /** Records an upload that the gateway has already accepted. */
  record: (p: {
    id: string;
    pharmacy: string;
    productIds: string[];
  }) => void;
  review: (id: string, status: PrescriptionStatus, note: string) => void;
  /** Adopts the server's list wholesale — it is the record; this is a copy. */
  replaceAll: (items: Prescription[]) => void;
};

export const usePrescriptionStore = create<PrescriptionsState>()(
  persist(
    (set) => ({
      items: [],
      hydrated: false,

      record: ({ id, pharmacy, productIds }) =>
        set((s) => ({
          items: [
            {
              id,
              status: 'PENDING',
              pharmacy,
              note: 'Awaiting pharmacist review',
              uploadedAt: Date.now(),
              productIds,
            },
            // Newest first — the list is drawn reverse-chronologically (spec §10).
            ...s.items,
          ],
        })),

      replaceAll: (items) => set({ items, hydrated: true }),

      review: (id, status, note) =>
        set((s) => ({
          items: s.items.map((p) =>
            p.id === id ? { ...p, status, note, reviewedAt: Date.now() } : p,
          ),
        })),
    }),
    {
      name: 'altruist.prescriptions',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ items: s.items }),
      onRehydrateStorage: () => (state) => {
        // First launch has nothing stored: under fixtures, seed the three
        // scripts the design shows, which are also the three values of
        // `prescriptions.status`.
        //
        // Guarded, and not merely "seed when empty": against a real gateway
        // this would put three fabricated prescriptions into a real patient's
        // health record the first time they opened the app.
        const stored = state?.items ?? [];
        const items = stored.length ? stored : USING_FIXTURES ? seeded() : [];
        usePrescriptionStore.setState({ hydrated: true, items });
        if (USING_FIXTURES) sweepFixtureReviews();
      },
    },
  ),
);

/**
 * Refreshes the list from the server: statuses a pharmacist changed, and the
 * whole history on a phone that has never seen it (after signing in again).
 * Keeps the local copy when offline. Never throws.
 */
let syncing: Promise<void> | null = null;

export function loadPrescriptions(): Promise<void> {
  if (!SUPABASE_CONFIGURED) return Promise.resolve();
  if (!syncing) {
    syncing = listPrescriptions()
      .then((items) => usePrescriptionStore.getState().replaceAll(items))
      .catch(() => {})
      .finally(() => {
        syncing = null;
      });
  }
  return syncing;
}

// ---------------------------------------------------------------------------
// SELECTORS — the questions the rest of the app asks
// ---------------------------------------------------------------------------

/**
 * The id of a VERIFIED prescription covering this product, if there is one.
 * Returns the id rather than a boolean so the order can record which script it
 * dispensed against.
 */
export function coveringId(items: Prescription[], productId: string): string | undefined {
  return items.find((p) => p.status === 'VERIFIED' && p.productIds.includes(productId))?.id;
}

/** A script for this product exists but has not been reviewed yet. */
export function isAwaitingReview(items: Prescription[], productId: string): boolean {
  return items.some(
    (p) =>
      (p.status === 'PENDING' || p.status === 'VERIFYING') && p.productIds.includes(productId),
  );
}

// ---------------------------------------------------------------------------
// FIXTURE PHARMACIST
// ---------------------------------------------------------------------------

/**
 * Stands in for the partner pharmacist while there is no backend.
 *
 * Without it a PENDING script stays pending forever and the verified path
 * through checkout is unreachable — the app would demo only its blocked state.
 * With a real gateway this is deleted and React Query polls the status instead;
 * nothing outside this file changes, because every screen already reads the
 * store rather than calling this.
 */
export function simulateReview(id: string): void {
  if (!USING_FIXTURES) return;
  setTimeout(() => {
    const p = usePrescriptionStore.getState().items.find((x) => x.id === id);
    if (!p || p.status !== 'PENDING') return;
    // Settings ▸ Developer decides. A rejection is the state the Prescriptions
    // list, the Cart's gate and /prescription-rejected all have to handle, and
    // a pharmacist who always approves leaves all three untested.
    const { scenario } = require('@/lib/devScenarios');
    if (scenario('review') === 'reject') {
      usePrescriptionStore
        .getState()
        .review(
          id,
          'REJECTED',
          'The dosage line is cut off in the photo. Please re-upload with the full page visible.',
        );
      return;
    }
    usePrescriptionStore
      .getState()
      .review(id, 'VERIFIED', `Approved by Akosua B. · ${p.pharmacy}`);
  }, FIXTURE_REVIEW_MS);
}

/**
 * Timers do not survive a cold start, so anything left PENDING from a previous
 * launch is reviewed on rehydration by the same clock. Without this, force-
 * quitting the app during those three seconds strands the script permanently.
 */
function sweepFixtureReviews(): void {
  const { items, review } = usePrescriptionStore.getState();
  for (const p of items) {
    if (p.status !== 'PENDING') continue;
    const waited = Date.now() - p.uploadedAt;
    if (waited >= FIXTURE_REVIEW_MS) {
      // The seeded PENDING card is meant to stay pending — it is the design's
      // example of the awaiting-review state, not a real upload of this user's.
      if (p.id === 'BQ2277KPL9') continue;
      review(p.id, 'VERIFIED', `Approved by Akosua B. · ${p.pharmacy}`);
    } else {
      simulateReview(p.id);
    }
  }
}
