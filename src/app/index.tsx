/**
 * Splash — Figma "Splash · Dark" (233:5283) and "Splash · Light" (233:5287).
 *
 * The comp is one thing on a brand backdrop: the wordmark, 190pt wide, centred
 * on both axes. No tile, no tagline, no progress bar — the earlier build drew
 * all three out of Views because the real asset was not wired up yet.
 *
 * The backdrop is a brand teal in both themes (950 dark, 800 light), which is
 * why it binds `brandCanvas` rather than `canvas`, and why the status bar is
 * forced light here: the app-wide bar goes dark in light mode, and dark glyphs
 * on teal/800 are unreadable.
 *
 * Nothing else is on it. An earlier build carried the platform liability line
 * at the foot; it was removed at the owner's request so the launch frame is the
 * comp exactly. That disclosure now first appears in Settings → Legal, so if it
 * is needed before sign-up it has to be added to Welcome, not here.
 *
 * Logic (SRS §4.A) is unchanged: ask who is signed in, hold a minimum beat so
 * the brand registers, and never hold longer than the cap.
 */
import React, { useEffect } from 'react';
import { View, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Wordmark } from '@/components/Wordmark';
import { getToken, hasOnboarded } from '@/lib/session';
import { shouldLockOnLaunch } from '@/lib/appLock';
import { currentSession } from '@/lib/api';
import { SUPABASE_CONFIGURED } from '@/lib/supabase';

const MIN_MS = 800;
const MAX_MS = 2000;

/**
 * Must match the native splash exactly (app.json → expo-splash-screen), or the
 * handoff shows as a jump — which it did on iOS: 190pt, not scaled to the
 * screen; the phone's light/dark setting, not the app theme; centred on the
 * full screen, not inside safe-area padding; and no entrance animation.
 */
const WORDMARK_W = 190;
const NATIVE_SPLASH_BG = { light: '#093F3F', dark: '#041A1A' } as const;

export default function Splash() {
  const scheme = useColorScheme();


  useEffect(() => {
    let cancelled = false;
    const started = Date.now();

    const decide = async () => {
      /**
       * With a gateway configured, the gateway decides. A token in secure
       * storage only means one was written once — it cannot expire, cannot be
       * revoked, and is exactly what let a development build stay "signed in"
       * for ever. `currentSession` asks Supabase, which refreshes or rejects.
       *
       * Without a gateway the stored value is all there is, and the app is on
       * fixtures anyway.
       */
      const [signedIn, onboarded] = await Promise.all([
        SUPABASE_CONFIGURED
          ? currentSession().then((s) => !!s).catch(() => false)
          : getToken().then((tok) => !!tok),
        hasOnboarded(),
      ]);
      const elapsed = Date.now() - started;
      const wait = Math.max(0, MIN_MS - elapsed);
      // A cold start is a return too: biometric unlock guards it the same way.
      const lockFirst = signedIn && (await shouldLockOnLaunch());
      setTimeout(() => {
        if (cancelled) return;
        if (signedIn) {
          router.replace('/home');
          if (lockFirst) router.push('/app-lock');
        } else if (onboarded) router.replace('/welcome');
        else router.replace('/onboarding');
      }, wait);
    };

    decide();
    // Hard cap: a slow keychain must never strand the user on the splash.
    const bail = setTimeout(() => {
      if (!cancelled) router.replace('/onboarding');
    }, MAX_MS);

    return () => {
      cancelled = true;
      clearTimeout(bail);
    };
  }, []);

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: NATIVE_SPLASH_BG[scheme === 'dark' ? 'dark' : 'light'],
      }}
    >
      <StatusBar style="light" />
      <Wordmark width={WORDMARK_W} />
    </View>
  );
}
