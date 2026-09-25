/**
 * Wellness sync — draining the outbox, and folding the server back in.
 *
 * The store (`./store.ts`) is what the screens read and it never waits on the
 * network. This module is the other half: it takes whatever the store could
 * not send and sends it, then pulls the account's state back down so a second
 * device, or a reinstall, sees the same history.
 *
 * ORDER OF OPERATIONS
 * Push before pull, always. Pulling first would fold the server's older view
 * over local changes that have not left the phone yet, and the merge in
 * `applySnapshot` would have to guess which side is newer. Sending first means
 * the snapshot that comes back already contains this device's work.
 *
 * FAILURE IS NORMAL, NOT EXCEPTIONAL
 * The target user is in a basement gym on one bar of signal. A failed flush is
 * not an error to report — it leaves the queue exactly as it was and tries
 * again at the next trigger. Nothing is dropped and nothing is shown. Only a
 * refusal the server actually issued (a row rejected by a policy, say) is
 * worth surfacing, and even then the queue keeps the item rather than losing
 * the user's session.
 *
 * WHY NOT REACT QUERY
 * The reads here are not view state — they are folded into a persisted store
 * that must work with the network off. React Query's cache would be a second,
 * competing copy of the same data with its own lifetime.
 */
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import {
  NetworkError,
  USING_FIXTURES,
  clearWellnessProgramme,
  fetchWellnessState,
  logHydration,
  pushWellnessSessions,
  setSavedRoutine,
} from '@/lib/api';
import { useWellnessStore, type PendingOp } from './store';
import { accountSettled } from '@/features/account/gate';

/**
 * Only one sync may be in flight. Two overlapping runs would both read the
 * same queue and send everything twice — harmless for the idempotent writes,
 * wasteful on a phone network, and genuinely wrong for the delete.
 */
let inFlight: Promise<void> | null = null;

/** Set after a flush leaves work behind, so a later trigger knows to retry. */
let backlog = false;

/**
 * Nothing to talk to.
 *
 * The seam's own predicate, not a Supabase check: a build pointed at the REST
 * backend has a server to sync with too, and only the fixture build has none.
 */
function offlineByDesign(): boolean {
  return USING_FIXTURES;
}

/**
 * Sends one queued change.
 *
 * Reads the current state rather than a captured payload, so what goes up is
 * what the user last did — see the outbox note in `store.ts`.
 */
async function send(op: PendingOp): Promise<void> {
  const state = useWellnessStore.getState();

  switch (op.kind) {
    case 'reset':
      return clearWellnessProgramme(op.programmeId);

    case 'hydration': {
      const settled = await logHydration(op.day, op.glasses);
      // The server merges with `greatest()`, so another device may have logged
      // more. Adopt its answer rather than arguing with it.
      useWellnessStore.getState().setHydrationCount(op.day, settled);
      return;
    }

    case 'saved':
      return setSavedRoutine(op.programmeId, state.saved.includes(op.programmeId));

    case 'session': {
      const session = state.history.find((h) => h.id === op.id);
      // Gone from history means a restart removed it while the entry waited.
      // The reset that removed it is queued too, so there is nothing to send.
      if (!session) return;
      return pushWellnessSessions([session]);
    }
  }
}

/**
 * Drains the queue, returning the entries the server accepted.
 *
 * Non-session entries run first, in order, then every session as a single
 * upsert. That reordering is safe because a queued reset clears any session
 * entries that preceded it, so the sessions still in the queue are always the
 * ones that come *after* the last reset — exactly the ones that must survive
 * it. Batching them turns a week offline into one request instead of seven.
 */
async function flush(): Promise<PendingOp[]> {
  const { pending, history } = useWellnessStore.getState();
  if (!pending.length) return [];

  const done: PendingOp[] = [];
  const sessionOps = pending.filter((p): p is Extract<PendingOp, { kind: 'session' }> =>
    p.kind === 'session',
  );

  for (const op of pending) {
    if (op.kind === 'session') continue;
    await send(op);
    done.push(op);
  }

  if (sessionOps.length) {
    const ids = new Set(sessionOps.map((o) => o.id));
    const sessions = history.filter((h) => ids.has(h.id));
    await pushWellnessSessions(sessions);
    done.push(...sessionOps);
  }

  return done;
}

/**
 * Flush, then pull, then record the time.
 *
 * Safe to call from anywhere and as often as you like: it collapses onto the
 * run already in progress and no-ops when there is no server to talk to.
 */
export function syncWellness(): Promise<void> {
  if (offlineByDesign()) return Promise.resolve();
  if (inFlight) return inFlight;

  inFlight = (async () => {
    // Never flush before the account check has run: until then the outbox may
    // still hold a previous user's entries, about to be dropped.
    await accountSettled();
    backlog = false;
    let accepted: PendingOp[] = [];
    try {
      accepted = await flush();
    } catch (error) {
      // Whatever was accepted before the failure still clears; the rest waits.
      backlog = true;
      if (__DEV__ && !(error instanceof NetworkError)) {
        console.warn('[wellness] flush stopped:', error);
      }
    }
    if (accepted.length) useWellnessStore.getState().clearPending(accepted);

    try {
      const snapshot = await fetchWellnessState();
      useWellnessStore.getState().applySnapshot(snapshot);
      if (!backlog) useWellnessStore.getState().markSynced(Date.now());
    } catch (error) {
      if (__DEV__ && !(error instanceof NetworkError)) {
        console.warn('[wellness] pull failed:', error);
      }
    }
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

/**
 * Mounts the sync triggers. Call once, at the root.
 *
 * Three moments are enough to keep the account current without polling:
 *  - launch, so a reinstall or a second device fills in immediately;
 *  - returning to the foreground, which is when a phone that was in a pocket
 *    at the gym gets its signal back;
 *  - a change to the queue, debounced, so finishing a session uploads it
 *    while the completion screen is still on screen.
 */
export function useWellnessSync(): void {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (offlineByDesign()) return;

    void syncWellness();

    const app = AppState.addEventListener('change', (next) => {
      const wasActive = appState.current === 'active';
      appState.current = next;
      if (next === 'active' && !wasActive) void syncWellness();
    });

    // Debounced: completing the last set queues a session and finishes the
    // programme in the same tick, and that should be one flush, not two.
    const unsubscribe = useWellnessStore.subscribe((state, previous) => {
      if (state.pending === previous.pending || !state.pending.length) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void syncWellness(), 1_200);
    });

    return () => {
      app.remove();
      unsubscribe();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
}

/** How many changes are still waiting to reach the server. */
export const selectUnsyncedCount = (s: { pending: PendingOp[] }) => s.pending.length;
