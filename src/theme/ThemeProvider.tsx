/**
 * Theme plumbing.
 *
 * The app is dark-first (see Design System docs/03). Light mode is fully
 * supported — it is NOT an inversion: three text tokens deliberately step
 * darker on their ramp so they clear WCAG AA on white. That logic lives in
 * tokens.ts; this file only decides *which* palette is active.
 *
 * Preference is one of: 'system' | 'light' | 'dark' (App Settings screen).
 */
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme as palettes, type Theme, type ThemeName } from './tokens';

export type ThemePreference = 'system' | 'light' | 'dark';

const PREF_KEY = 'altruist.theme-preference';

type ThemeContextValue = {
  t: Theme;
  name: ThemeName;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  /** true once the stored preference has been read — gate rendering on this */
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(PREF_KEY)
      .then((stored) => {
        if (cancelled) return;
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setPreferenceState(stored);
        }
      })
      .catch(() => {
        /* a missing preference is not an error — fall back to system */
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(PREF_KEY, p).catch(() => {});
  }, []);

  const name: ThemeName = preference === 'system' ? (system === 'light' ? 'light' : 'dark') : preference;

  const value = useMemo<ThemeContextValue>(
    () => ({ t: palettes[name], name, preference, setPreference, ready }),
    [name, preference, setPreference, ready],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}

/** Shorthand for the common case — just the active token set. */
export function useTokens(): Theme {
  return useTheme().t;
}
