/**
 * Deletion Scheduled — ported 1:1 from Figma node 91:350.
 *
 * Scroll content: V gap20, pad 150/24/60/24. A 132pt gold clock circle, a
 * centred head naming the exact date, a grace-period card of three fact rows,
 * then the cancel/done pair.
 *
 * Gold, not coral: nothing has been destroyed yet. The screen's job is to make
 * the 30-day window feel like a window, and the primary action is the one that
 * reverses the decision — the destructive path is already behind the user.
 */
import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen, FeatureIcon } from '@/components/ui/FormScreen';
import { FactRow } from '@/components/ui/InfoList';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { endSession } from '@/features/account/session';
import { useProfile, usePartnerPharmacy } from '@/features/profile/store';

export default function DeletionScheduled() {
  const profile = useProfile();
  const pharmacy = usePartnerPharmacy();
  const t = useTokens();
  const { d } = useDesignScale();

  const done = async () => {
    // Everywhere, not just this phone: an account scheduled for deletion must
    // not stay signed in on another device for the grace period.
    await endSession({ everywhere: true });
    router.replace('/welcome');
  };

  return (
    <FormScreen gap={20} contentStyle={{ paddingTop: d(150), paddingBottom: d(60) }}>
      <View style={{ alignItems: 'center' }}>
        <FeatureIcon size={132} tone="warning">
          <Icon name="clock" size={d(54)} tone="warning" />
        </FeatureIcon>
      </View>

      <View style={{ gap: d(10) }}>
        <Text variant="displayS" center style={{ fontSize: d(28), lineHeight: d(32) }}>
          Scheduled for deletion
        </Text>
        <Text
          variant="bodyL"
          tone="secondary"
          center
          style={{ fontSize: d(16), lineHeight: d(24) }}
        >
          Your account will be permanently deleted on 22 September 2026.
        </Text>
      </View>

      <View
        style={{
          gap: d(12),
          paddingVertical: d(16),
          paddingHorizontal: d(18),
          borderRadius: d(24),
          backgroundColor: t.colors.bg.surface,
        }}
      >
        <FactRow
          icon="clock"
          title="You have 30 days"
          body="Sign in any time before 22 Sept to cancel and keep everything."
        />
        <FactRow
          icon="logout"
          title="You are signed out everywhere"
          body="All sessions on all devices have ended."
        />
        <FactRow
          icon="shield-check"
          title="Pharmacy records are unaffected"
          body={`${pharmacy.name} keeps its dispensing record under its own obligations.`}
        />
      </View>

      <Button
        label="Cancel deletion, keep my account"
        size="large"
        onPress={() => router.replace('/profile')}
      />
      <Button label="Done" variant="tertiary" size="large" onPress={done} />

      <Text variant="caption" tone="tertiary" center style={{ fontSize: d(12), lineHeight: d(16) }}>
        A confirmation has been sent to {profile.email}.
      </Text>
    </FormScreen>
  );
}
