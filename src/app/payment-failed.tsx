/**
 * Failed — Payment — ported 1:1 from Figma node on page "System States".
 *
 * V gap22, pad 150/24/40/24. A 160/116 coral halo, the head, a coral detail
 * card carrying the gateway reason and reference, then Try again / different
 * method.
 *
 * "Nothing was taken and your cart is untouched" is the first thing after the
 * headline for a reason: the user's immediate fear is a silent charge. The
 * Paystack reference is on screen so a support conversation can start with a
 * fact rather than a search.
 */
import React from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { StatusScreen } from '@/components/ui/StatusScreen';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';

export default function PaymentFailed() {
  const t = useTokens();
  const { d } = useDesignScale();
  const { reason, reference } = useLocalSearchParams<{ reason?: string; reference?: string }>();

  return (
    <StatusScreen
      icon="danger"
      tone="danger"
      title="Payment failed"
      body="Your bank declined the charge. Nothing was taken and your cart is untouched."
      actions={
        <>
          <Button
            label="Try again"
            size="large"
            onPress={() => router.replace('/checkout-payment')}
          />
          <Button
            label="Use a different method"
            variant="secondary"
            size="large"
            onPress={() => router.replace('/checkout-payment')}
          />
        </>
      }
    >
      <View
        style={{
          gap: d(4),
          paddingVertical: d(14),
          paddingHorizontal: d(18),
          borderRadius: d(20),
          backgroundColor: t.colors.bg.dangerSubtle,
        }}
      >
        <Text variant="labelS" tone="danger" style={{ fontSize: d(12), lineHeight: d(16) }}>
          {/* The gateway's own wording. Paraphrasing "do not honour" into
              "insufficient funds" sends people to check a balance that is fine. */}
          Paystack · {reason ?? 'declined by your bank'}
        </Text>
        {reference ? (
          <Text variant="caption" tone="secondary" style={{ fontSize: d(12), lineHeight: d(16) }}>
            Reference {reference} — quote this if you contact support.
          </Text>
        ) : (
          <Text variant="caption" tone="secondary" style={{ fontSize: d(12), lineHeight: d(16) }}>
            Your cart is untouched. Try again, or pay with another method.
          </Text>
        )}
      </View>
    </StatusScreen>
  );
}
