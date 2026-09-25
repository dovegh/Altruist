/**
 * "Has this device worked out whose data it is holding yet?"
 *
 * A dependency-free latch, so the wellness sync can wait on the account check
 * without importing the account module (which imports the sync — a cycle).
 *
 * The race it closes: at launch, the wellness sync and the auth listener start
 * together. If the sync flushed its outbox before the account check had run,
 * a previous user's unsent workouts would upload under the new session before
 * `clearUserData()` had a chance to drop them.
 */
let settle: () => void = () => {};

const settled = new Promise<void>((resolve) => {
  settle = resolve;
});

/** Resolves once the first session check on this launch has finished. */
export function accountSettled(): Promise<void> {
  return settled;
}

/** Called by the account module after its first session check. Idempotent. */
export function markAccountSettled(): void {
  settle();
}
