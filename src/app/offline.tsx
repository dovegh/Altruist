/**
 * Error — No Connection — ported 1:1 from Figma node on page "System States".
 *
 * V gap22, pad 200/24/120/24. A 148pt gold circle, the head, a cached-state
 * card, then Try again.
 *
 * Gold rather than coral: being offline is not a failure the user caused and
 * not one they can fix by acting differently. The card's job is to say that
 * nothing they typed has been lost, which is the actual worry.
 */
import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { StatusScreen } from '@/components/ui/StatusScreen';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';

export default function Offline() {
  const t = useTokens();
  const { d } = useDesignScale();

  return (
    <StatusScreen
      icon="info"
      tone="warning"
      outer={148}
      inner={148}
      glyph={56}
      paddingTop={200}
      titleSize={24}
      title="You are offline"
      body="We could not reach Altruist. Your cart and any draft prescription are saved on this device."
      actions={
        <Button label="Try again" size="large" iconLeading="arrow-right" onPress={() => router.back()} />
      }
    >
      <View
        style={{
          paddingVertical: d(14),
          paddingHorizontal: d(16),
          borderRadius: d(20),
          backgroundColor: t.colors.bg.surface,
        }}
      >
        <Text variant="bodyS" tone="secondary" style={{ fontSize: d(13), lineHeight: d(19) }}>
          Last synced 12 minutes ago. Prescription uploads will send automatically when you
          reconnect.
        </Text>
      </View>
    </StatusScreen>
  );
}
