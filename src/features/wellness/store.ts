/**
 * Wellness — what the user has done.
 *
 * Content (which exercises, how many sets) is in `lib/wellness.ts`. This store
 * only records progress against it: finished sessions, the session in flight,
 * today's water, saved routines. Keeping the two apart is what lets a session
 * survive an app restart mid-workout — the store persists an index into the
 * programme, not a copy of it.
 *
 * `active` is persisted on purpose. A phone locked between sets is the normal
 * case at a gym; losing "3 of 6" to that would make the strip meaningless.
 *
 * ---------------------------------------------------------------------------
 * OFFLINE FIRST, AND WHY THE OUTBOX IS HERE
 *
 * This store is the source of truth the screens read, online or not. A gym is
 * the worst network in the building, so no user action waits on a request:
 * every mutation writes local state immediately and appends an entry to
 * `pending`. `features/wellness/sync.ts` drains that queue whenever the app
 * can reach the server, and re-queues nothing — it simply leaves what it could
 * not send.
 *
 * Entries reference a row by key rather than carrying a payload, so a flush
 * always sends the CURRENT local truth. Three glasses logged offline collapse
 * into one entry and one request, and an entry can never resurrect a value the
 * user has since changed.
 *
 * The session in flight is deliberately NOT synced. It changes every ninety
 * seconds, it is worthless to anyone but the phone in your hand, and pushing
 * it would mean a write per set. A session becomes server data when it is
 * finished, and not before.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { USING_FIXTURES } from '@/lib/api';
import {
  DEFAULT_PROGRAMME_ID,
  dayKey,
  newSessionId,
  nextDay,
  programmeById,
  PROGRAMMES,
  resolveExercises,
  type WellnessSession,
  type WellnessSnapshot,
} from '@/lib/wellness';

/** A finished session. Same shape the server stores — see `lib/wellness.ts`. */
export type CompletedSession = WellnessSession;

export type ActiveSession = {
  programmeId: string;
  dayId: string;
  startedAt: number;
  /** Index into the day's exercise list. */
  index: number;
  /** Sets completed on the current exercise. */
  setsDone: number;
  /** Exercise ids finished this session (skips are NOT completions). */
  completed: string[];
  /** exerciseId → alternative id, applied through `resolveExercises`. */
  swaps: Record<string, string>;
};

/** What `completeSet` just did, so the screen can react without re-deriving. */
export type SetOutcome = 'set' | 'exercise' | 'session';

/**
 * One unsent change, addressed by key rather than value (see the file header).
 * `sync.ts` reads the current state to build the request.
 */
export type PendingOp =
  | { kind: 'session'; id: string }
  /**
   * Carries its count, unlike the others. The store keeps hydration for today
   * only, so a phone left offline overnight would have nothing to read back
   * for yesterday's entry by the time it flushed.
   */
  | { kind: 'hydration'; day: string; glasses: number }
  | { kind: 'saved'; programmeId: string }
  | { kind: 'reset'; programmeId: string };

type State = {
  history: CompletedSession[];
  active: ActiveSession | null;
  hydration: { day: string; glasses: number };
  saved: string[];

  /** Unsent changes, oldest first. Drained by `features/wellness/sync.ts`. */
  pending: PendingOp[];
  /** When the server last confirmed a full sync, or null if it never has. */
  syncedAt: number | null;

  /** Starts (or resumes) a session on one plan. */
  startSession: (programmeId?: string) => ActiveSession;
  completeSet: () => SetOutcome;
  skipExercise: () => SetOutcome;
  swapExercise: (exerciseId: string, alternativeId: string) => void;
  abandonSession: () => void;
  /** Clears finished sessions for one plan, leaving the others alone. */
  restartProgramme: (programmeId: string) => void;
  logGlass: (goal: number) => void;
  toggleSaved: (id: string) => void;

  // --- Used by sync.ts only -------------------------------------------------
  /** Folds a server snapshot into local state without losing unsent changes. */
  applySnapshot: (snapshot: WellnessSnapshot) => void;
  /** Drops entries that were accepted by the server. */
  clearPending: (done: PendingOp[]) => void;
  /** Adopts the count the server settled on after a hydration merge. */
  setHydrationCount: (day: string, glasses: number) => void;
  markSynced: (at: number) => void;
};

/**
 * Five sessions on the five days before today, so the streak card, the week
 * dots and the programme progress all show something on a fresh install. Only
 * under fixtures — a real account starts at zero, honestly.
 */
const seeded = (): CompletedSession[] => {
  if (!USING_FIXTURES) return [];
  const out: CompletedSession[] = [];
  for (let back = 5; back >= 1; back -= 1) {
    const at = new Date();
    at.setDate(at.getDate() - back);
    at.setHours(18, 30, 0, 0);
    const programme = programmeById(DEFAULT_PROGRAMME_ID);
    const dayId = programme.days[(5 - back) % programme.days.length].id;
    out.push({
      id: newSessionId(),
      day: dayKey(at),
      programmeId: programme.id,
      dayId,
      durationMin: programme.days[0].durationMin,
      finishedAt: at.getTime(),
    });
  }
  return out;
};

const todayHydration = (h: { day: string; glasses: number }) =>
  h.day === dayKey() ? h : { day: dayKey(), glasses: 0 };

/** True when two entries address the same thing and only the newer should run. */
function sameTarget(a: PendingOp, b: PendingOp): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case 'session':
      return a.id === (b as { id: string }).id;
    case 'hydration':
      return a.day === (b as { day: string }).day;
    default:
      return a.programmeId === (b as { programmeId: string }).programmeId;
  }
}

/**
 * Appends an entry, collapsing any earlier one for the same target.
 *
 * A reset also discards queued pushes for that plan: those sessions are being
 * deleted, and uploading them first only to delete them is a round trip that
 * can leave rows behind if the second half fails.
 */
function enqueue(pending: PendingOp[], op: PendingOp): PendingOp[] {
  let next = pending.filter((p) => !sameTarget(p, op));
  if (op.kind === 'reset') {
    next = next.filter((p) => p.kind !== 'session');
  }
  return [...next, op];
}

export const useWellnessStore = create<State>()(
  persist(
    (set, get) => ({
      history: seeded(),
      active: null,
      hydration: { day: dayKey(), glasses: USING_FIXTURES ? 6 : 0 },
      saved: [],
      pending: [],
      syncedAt: null,

      startSession: (programmeId = DEFAULT_PROGRAMME_ID) => {
        const existing = get().active;
        // A session already in flight wins, whichever plan it belongs to —
        // silently switching plans mid-workout would lose the sets done.
        if (existing) return existing;
        const programme = programmeById(programmeId);
        const done = get().history.filter((h) => h.programmeId === programme.id).length;
        const day = nextDay(programme, done);
        const active: ActiveSession = {
          programmeId: programme.id,
          dayId: day.id,
          startedAt: Date.now(),
          index: 0,
          setsDone: 0,
          completed: [],
          swaps: {},
        };
        set({ active });
        return active;
      },

      completeSet: () => {
        const a = get().active;
        if (!a) return 'set';
        const programme = programmeById(a.programmeId);
        const day = programme.days.find((x) => x.id === a.dayId) ?? programme.days[0];
        const exercises = resolveExercises(day, a.swaps);
        const current = exercises[a.index];
        const setsDone = a.setsDone + 1;
        if (setsDone < current.sets) {
          set({ active: { ...a, setsDone } });
          return 'set';
        }
        const completed = [...a.completed, current.id];
        if (a.index + 1 < exercises.length) {
          set({ active: { ...a, setsDone: 0, index: a.index + 1, completed } });
          return 'exercise';
        }
        finish(a.programmeId, day.id, day.durationMin);
        return 'session';
      },

      skipExercise: () => {
        const a = get().active;
        if (!a) return 'set';
        const programme = programmeById(a.programmeId);
        const day = programme.days.find((x) => x.id === a.dayId) ?? programme.days[0];
        const exercises = resolveExercises(day, a.swaps);
        if (a.index + 1 < exercises.length) {
          set({ active: { ...a, setsDone: 0, index: a.index + 1 } });
          return 'exercise';
        }
        finish(a.programmeId, day.id, day.durationMin);
        return 'session';
      },

      swapExercise: (exerciseId, alternativeId) => {
        const a = get().active;
        if (!a) return;
        // Swapping resets the set count: the sets done were on the other move.
        set({ active: { ...a, setsDone: 0, swaps: { ...a.swaps, [exerciseId]: alternativeId } } });
      },

      abandonSession: () => set({ active: null }),

      restartProgramme: (programmeId) =>
        set((s) => ({
          history: s.history.filter((h) => h.programmeId !== programmeId),
          active: s.active?.programmeId === programmeId ? null : s.active,
          pending: enqueue(s.pending, { kind: 'reset', programmeId }),
        })),

      logGlass: (goal) => {
        const h = todayHydration(get().hydration);
        if (h.glasses >= goal) return;
        const glasses = h.glasses + 1;
        set((s) => ({
          hydration: { day: h.day, glasses },
          pending: enqueue(s.pending, { kind: 'hydration', day: h.day, glasses }),
        }));
      },

      toggleSaved: (id) =>
        set((s) => ({
          saved: s.saved.includes(id) ? s.saved.filter((x) => x !== id) : [...s.saved, id],
          pending: enqueue(s.pending, { kind: 'saved', programmeId: id }),
        })),

      // --- sync.ts --------------------------------------------------------

      applySnapshot: (snapshot) =>
        set((s) => {
          // A plan with a queued reset is about to be emptied on the server;
          // adopting its rows now would make deleted sessions reappear.
          const resetting = new Set(
            s.pending.filter((p) => p.kind === 'reset').map((p) => p.programmeId),
          );
          const unsent = new Set(
            s.pending.filter((p) => p.kind === 'session').map((p) => p.id),
          );

          const byId = new Map<string, CompletedSession>();
          for (const row of snapshot.sessions) {
            if (!resetting.has(row.programmeId)) byId.set(row.id, row);
          }
          // Sessions still in the outbox are local truth the server has not
          // seen yet, so they survive the merge.
          for (const row of s.history) {
            if (unsent.has(row.id)) byId.set(row.id, row);
          }

          const today = dayKey();
          const remoteToday = snapshot.hydration.find((h) => h.day === today);
          const localToday = todayHydration(s.hydration);
          // Water only ever goes up, so the larger count is the true one.
          const glasses = Math.max(localToday.glasses, remoteToday?.glasses ?? 0);

          // The server's stars, then this device's un-sent changes on top.
          const saved = new Set(snapshot.saved);
          for (const op of s.pending) {
            if (op.kind !== 'saved') continue;
            if (s.saved.includes(op.programmeId)) saved.add(op.programmeId);
            else saved.delete(op.programmeId);
          }

          return {
            history: [...byId.values()].sort((a, b) => a.finishedAt - b.finishedAt),
            hydration: { day: today, glasses },
            saved: [...saved],
          };
        }),

      clearPending: (done) =>
        set((s) => ({ pending: s.pending.filter((p) => !done.some((d) => sameTarget(p, d))) })),

      setHydrationCount: (day, glasses) =>
        set((s) =>
          s.hydration.day === day && glasses > s.hydration.glasses
            ? { hydration: { day, glasses } }
            : s,
        ),

      markSynced: (at) => set({ syncedAt: at }),
    }),
    {
      name: 'altruist.wellness',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        history: s.history,
        active: s.active,
        hydration: s.hydration,
        saved: s.saved,
        pending: s.pending,
        syncedAt: s.syncedAt,
      }),
      // v1 added session ids. Anything written before that has sessions
      // without one, which would make every push non-idempotent, so they get
      // an id here rather than at the point of use.
      version: 1,
      migrate: (persisted, from) => {
        const state = (persisted ?? {}) as Partial<State>;
        if (from >= 1) return state;
        return {
          ...state,
          history: (state.history ?? []).map((h) => (h.id ? h : { ...h, id: newSessionId() })),
          pending: [],
          syncedAt: null,
        };
      },
    },
  ),
);

/**
 * Records a finished session and clears the active one. Duration is the day's
 * planned length, not wall-clock: a session left open overnight is not a
 * nine-hour workout.
 */
function finish(programmeId: string, dayId: string, durationMin: number) {
  const session: CompletedSession = {
    id: newSessionId(),
    day: dayKey(),
    programmeId,
    dayId,
    durationMin,
    finishedAt: Date.now(),
  };
  useWellnessStore.setState((s) => ({
    active: null,
    history: [...s.history, session],
    pending: enqueue(s.pending, { kind: 'session', id: session.id }),
  }));
}

// --- Selectors ---------------------------------------------------------------
//
// Small and pure so screens stay declarative. Each reads the slice it needs;
// `useWellnessStore((s) => s.history)` style keeps re-renders scoped.

/** Today's glasses, ignoring a stale record from a previous day. */
export const selectGlasses = (s: State) => todayHydration(s.hydration).glasses;

/**
 * Days with a completed session — the input to streak and week dots.
 *
 * NOT a store selector: it allocates, and a selector that returns a fresh
 * array on every call never compares equal, so the subscribing component
 * re-renders until React gives up ("maximum update depth exceeded"). Select
 * `s.history` (a stable reference) and derive this in a `useMemo`.
 */
export const sessionDaysOf = (history: CompletedSession[]) => history.map((h) => h.day);

/** Finished sessions on one plan, capped at its length. */
export function sessionsDoneFor(history: CompletedSession[], programmeId: string): number {
  const programme = programmeById(programmeId);
  return Math.min(
    history.filter((h) => h.programmeId === programmeId).length,
    programme.sessionsTotal,
  );
}

/** Total finished sessions across every plan — what the streak counts. */
export const selectSessionsDone = (s: State) => s.history.length;

/** Newest first, for the activity screen. */
export function historyNewestFirst(history: CompletedSession[]): CompletedSession[] {
  return [...history].sort((a, b) => b.finishedAt - a.finishedAt);
}

/** Minutes trained across every plan. */
export function totalMinutes(history: CompletedSession[]): number {
  return history.reduce((n, h) => n + h.durationMin, 0);
}

/** Per-plan totals for the activity summary, plans with nothing done omitted. */
export function planTotals(history: CompletedSession[]) {
  return PROGRAMMES.map((p) => ({
    programme: p,
    done: history.filter((h) => h.programmeId === p.id).length,
  })).filter((row) => row.done > 0);
}
