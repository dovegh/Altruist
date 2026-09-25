/**
 * Fixture outcomes — the switch that makes the unhappy paths reachable.
 *
 * `src/lib/api.ts` promises that screens "exercise their real loading and error
 * states rather than a happy path". Without this they cannot: the fixture
 * `payOrder` always resolves, so `/payment-failed` and the `DeclinedError`
 * branch have no runtime path at all, and the first time anyone sees them is in
 * production with a real declined card.
 *
 * Three failure modes, kept distinct on purpose, because the screens treat them
 * differently — collapsing "declined" into "error" is the mistake that produces
 * a payment screen telling someone their card failed when the server was down:
 *
 *   decline  → DeclinedError, with the gateway's own wording → /payment-failed
 *   network  → NetworkError                                  → /offline
 *   error    → ApiError(500)                                 → generic failure
 *
 * **This module is inert outside development.** Every read goes through
 * `scenario()`, which returns the happy path unless `__DEV__` is true AND the
 * app is running on fixtures. A build pointed at a real gateway cannot be made
 * to decline a real payment from this screen, whatever the state says.
 */
import { create } from 'zustand';
import { USING_FIXTURES } from './api';

export type PaymentScenario =
  | 'approve'
  | 'momo-pending'
  | 'decline-funds'
  | 'decline-bank'
  | 'network'
  | 'error';
export type ReviewScenario = 'approve' | 'reject';

/** The gateway's own wording for each decline. */
export const DECLINE_REASONS: Record<string, string> = {
  'decline-funds': 'insufficient funds',
  // Paraphrasing an issuer's "do not honour" into "insufficient funds" sends
  // people to check a balance that is fine. Quote the gateway.
  'decline-bank': 'declined by your bank',
};

type State = {
  payment: PaymentScenario;
  review: ReviewScenario;
  setPayment: (next: PaymentScenario) => void;
  setReview: (next: ReviewScenario) => void;
};

/**
 * Deliberately not persisted. A stuck "decline everything" surviving a restart
 * is a debugging session that starts with an hour of confusion.
 */
export const useScenarioStore = create<State>((set) => ({
  payment: 'approve',
  review: 'approve',
  setPayment: (payment) => set({ payment }),
  setReview: (review) => set({ review }),
}));

/** True only where forcing an outcome is safe. */
export const scenariosAvailable = () => __DEV__ && USING_FIXTURES;

/** The active scenario, or the happy path anywhere it would not be safe. */
export function scenario<K extends 'payment' | 'review'>(
  key: K,
): K extends 'payment' ? PaymentScenario : ReviewScenario {
  if (!scenariosAvailable()) return 'approve' as never;
  return useScenarioStore.getState()[key] as never;
}
