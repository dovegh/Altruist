/**
 * Recent searches.
 *
 * The search screen autofocuses its field, so the first thing a returning user
 * sees is an empty box. Their own last few terms are a better starting point
 * than any suggestion the app can generate — and re-finding a medicine you
 * bought last month is one of the two things this catalogue is for.
 *
 * Newest first, de-duplicated case-insensitively, capped. Persisted because a
 * "recent" list that empties on every cold start is not recent, it is current.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MAX = 6;

type State = {
  terms: string[];
  /** Called when a search actually returns, not on every keystroke. */
  record: (term: string) => void;
  forget: (term: string) => void;
  clear: () => void;
};

export const useRecentSearchStore = create<State>()(
  persist(
    (set) => ({
      terms: [],
      record: (raw) =>
        set((s) => {
          const term = raw.trim();
          // Two characters is a typo in progress, not a search worth keeping.
          if (term.length < 2) return s;
          const rest = s.terms.filter((t) => t.toLowerCase() !== term.toLowerCase());
          return { terms: [term, ...rest].slice(0, MAX) };
        }),
      forget: (term) => set((s) => ({ terms: s.terms.filter((t) => t !== term) })),
      clear: () => set({ terms: [] }),
    }),
    {
      name: 'altruist.recent-searches',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
