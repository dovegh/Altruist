/**
 * Password Changed — ported 1:1 from Figma node 55:111.
 *
 * Content: V gap 20, pad 64/24/40/24. 120pt spacer → 120pt brand feature circle
 * with a 50pt check → Head → Primary.
 *
 * No Top App Bar and no Back: the old password is gone, so there is nothing to
 * return to. `router.replace` on entry is what makes that true at runtime.
 */
import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen, FeatureIcon } from '@/components/ui/FormScreen';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';

export default function PasswordChanged() {
  const t = useTokens();
  const { d } = useDesignScale();

  return (
    <FormScreen gap={20}>
      <View style={{ height: d(120) }} />

      <FeatureIcon size={120} tone="brand" celebrate>
        <Icon name="check" size={d(50)} color={t.colors.icon.onBrand} />
      </FeatureIcon>

      <View style={{ gap: d(10) }}>
        <Text variant="displayS" style={{ fontSize: d(28), lineHeight: d(32) }}>
          Password updated
        </Text>
        <Text variant="bodyL" tone="secondary" style={{ fontSize: d(16), lineHeight: d(24) }}>
          You are signed out on all other devices. Sign in again with your new password.
        </Text>
      </View>

      <Button label="Back to sign in" size="large" onPress={() => router.replace('/login')} />
    </FormScreen>
  );
}
