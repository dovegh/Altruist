/**
 * App Lock — ported 1:1 from Figma node 218:262.
 *
 * Scroll content: V gap 22, pad 210/24/60/24. A 132pt brand-subtle circle with a
 * 2pt brand ring and a 56pt profile glyph, centred head, two buttons, closing
 * reassurance line.
 *
 * Everything here is centred, unlike the rest of the auth flow — the screen is a
 * gate, not a form, and there is nothing to read left-to-right.
 *
 * The gate is real: the root layout pushes this screen when the app returns
 * from the background after the grace period, and the primary action runs the
 * OS biometric prompt. A failed or cancelled prompt leaves the screen up —
 * dismissing on failure would make the lock decorative.
 *
 * Nothing else gets past it: Android's Back button and the iOS swipe are both
 * off here (Back used to pop the lock and show the app underneath), and "Use
 * password instead" signs out before going to Sign in — replacing the lock
 * with Sign in while still signed in left the app one Back away.
 */
import React, { useEffect, useState } from 'react';
import { View, BackHandler } from 'react-native';
import { router, Stack } from 'expo-router';
import { endSession } from '@/features/account/session';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen, FeatureIcon } from '@/components/ui/FormScreen';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { authenticate } from '@/lib/appLock';

export default function AppLock() {
  const { d } = useDesignScale();
  const [busy, setBusy] = useState(false);

  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  const signInWithPassword = async () => {
    setLeaving(true);
    await endSession();
    router.replace('/login');
  };

  const unlock = async () => {
    setBusy(true);
    const ok = await authenticate();
    setBusy(false);
    // Only a successful check dismisses the gate.
    if (ok) router.back();
  };

  // Prompt immediately — making the user tap first adds a step without adding
  // security, since the OS sheet is the actual control.
  useEffect(() => {
    unlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <FormScreen gap={22} contentStyle={{ paddingTop: d(210), alignItems: 'stretch' }}>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <View style={{ alignItems: 'center' }}>
        <FeatureIcon size={132} tone="subtle" ring>
          <Icon name="profile" size={d(56)} tone="brand" />
        </FeatureIcon>
      </View>

      <View style={{ gap: d(10) }}>
        <Text variant="displayS" center style={{ fontSize: d(28), lineHeight: d(32) }}>
          Altruist is locked
        </Text>
        <Text
          variant="bodyL"
          tone="secondary"
          center
          style={{ fontSize: d(16), lineHeight: d(24) }}
        >
          Unlock to see your prescriptions and orders.
        </Text>
      </View>

      <Button label="Unlock" size="large" loading={busy} disabled={leaving} onPress={unlock} />
      <Button
        label="Use password instead"
        variant="tertiary"
        size="large"
        loading={leaving}
        disabled={busy || leaving}
        onPress={signInWithPassword}
      />
    </FormScreen>
  );
}
