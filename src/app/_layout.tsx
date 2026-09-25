import 'react-native-gesture-handler';
import React, { useEffect, useRef, useState } from 'react';
import { View, AppState, type AppStateStatus } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
} from '@expo-google-fonts/outfit';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';

import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { useWellnessSync } from '@/features/wellness/sync';
import { useAccountSync } from '@/features/account/session';
import { useAuthGuard } from '@/features/account/guard';
import { useWellnessReminders } from '@/features/wellness/reminders';
import { DialogHost } from '@/components/ui/Dialog';
import { Wordmark } from '@/components/Wordmark';
import { motion } from '@/theme/tokens';
import { markBackgrounded, shouldLock, isLockShowing, isBiometricEnabled } from '@/lib/appLock';
import { getToken } from '@/lib/session';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Prescription and order state changes on the pharmacist's side, not ours.
      // Short stale time so a status pill is never confidently wrong.
      staleTime: 30_000,
      retry: 2,
      refetchOnWindowFocus: true,
    },
  },
});

/**
 * Shows the App Lock screen whenever the app returns from the background, for
 * a signed-in user who turned biometric unlock on (see lib/appLock).
 * Lives at the root so it covers every screen, including the ones a deep link
 * opens directly.
 */
function useAppLockGate() {
  const previous = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (next) => {
      const wasActive = previous.current === 'active';
      previous.current = next;

      // Only a real trip to the background. `inactive` is Control Centre, a
      // notification, the Face ID sheet itself — none of those should lock.
      if (next === 'background') {
        markBackgrounded();
        return;
      }

      if (next === 'active' && !wasActive) {
        // Nothing to lock if there is no session behind it.
        if (!(await getToken())) return;
        if ((await shouldLock()) && !isLockShowing()) router.push('/app-lock');
      }
    });
    return () => sub.remove();
  }, []);
}

/**
 * Covers the screen whenever the app is not in front, for people who turned
 * biometric unlock on. The app switcher shows a snapshot of the last frame;
 * without this, that snapshot is someone's prescription.
 */
function PrivacyShield() {
  const { t } = useTheme();
  const [state, setState] = useState<AppStateStatus>(AppState.currentState);
  const [protect, setProtect] = useState(false);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      setState(next);
      if (next !== 'active') void isBiometricEnabled().then(setProtect);
    });
    return () => sub.remove();
  }, []);

  if (state === 'active' || !protect) return null;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: t.colors.bg.brandCanvas,
      }}
    >
      <Wordmark width={190} />
    </View>
  );
}

function RootNavigator() {
  const { t, name, ready } = useTheme();
  useAppLockGate();
  // Whose data this device holds — must run alongside, and gates, the sync below.
  useAccountSync();
  // Signed out → nowhere but onboarding, auth and the few public pages.
  useAuthGuard();
  // Wellness is offline-first; this is what eventually gets it uploaded.
  useWellnessSync();
  // Daily plan and hydration reminders, when the person turned them on.
  useWellnessReminders();

  // Hide the native splash only once this navigator has drawn its first frame.
  // Hiding when fonts loaded (before the theme was ready) left a blank frame
  // between the native splash and the identical JS one — the iOS "jump".
  useEffect(() => {
    if (!ready) return;
    const frame = requestAnimationFrame(() => SplashScreen.hide());
    return () => cancelAnimationFrame(frame);
  }, [ready]);

  if (!ready) return null;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      {/* The OS draws the real status bar — never mock one in the app. */}
      <StatusBar style={name === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.colors.bg.canvas },
          // Cross-fade, not a horizontal slide. The app is a set of surfaces you
          // look at rather than a left-to-right hierarchy you walk along, and a
          // slide implies a "back" direction that most of these routes do not
          // have — Cart, Checkout and the status screens are all replacements.
          // `contentStyle` above matters here: a fade over a transparent screen
          // shows whatever is behind it, so both screens paint the canvas.
          animation: 'fade',
          animationDuration: motion.duration.base,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <DialogHost />
      <PrivacyShield />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  // RN has no reliable synthetic bolding — every weight is a concrete family,
  // so the app must not render type until the files are in memory.
  if (!fontsLoaded && !fontError) return null;

  return (
    // Gesture root: pinch and pan (the prescription viewer) need it above them.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <ThemeProvider>
            <RootNavigator />
          </ThemeProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
