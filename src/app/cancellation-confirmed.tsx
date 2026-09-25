/**
 * Cancellation Confirmed — ported 1:1 from Figma node 101:99.
 *
 * Scroll content: V gap18, pad 120/24/60/24. A 120pt mint circle, the head, a
 * three-step refund timeline (26pt rail, r24 card), a bank-timing note, then
 * the two actions.
 *
 * The timeline uses smaller 26pt dots than the order timeline's 40pt: this is a
 * status readout inside a card, not the screen's primary structure.
 *
 * "Your bank sets the final timing" exists because the most common support
 * ticket after a refund is "where is my money" three days later. Saying it here
 * is cheaper than answering it there.
 */
import React from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen, FeatureIcon } from '@/components/ui/FormScreen';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { cedis } from '@/lib/money';
import { useOrderStore } from '@/features/orders/store';
import { CANCELLATION_REFUND_STEPS as STEPS } from '@/lib/forms';

type StepState = 'done' | 'current' | 'upcoming';


export default function CancellationConfirmed() {
  const t = useTokens();
  const { d } = useDesignScale();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const order = useOrderStore((s) => s.items.find((o) => o.id === (id ?? s.lastOrderId)));
  // Delivery is only refunded while nothing has left the counter — the same
  // rule the cancel screen showed the user before they confirmed.
  const dispatched = order?.events.some((e) => e.title === 'Dispatched' && e.state !== 'upcoming');
  const refund = order
    ? order.subtotal + (dispatched ? 0 : order.deliveryFee) + order.serviceFee
    : 0;

  return (
    <FormScreen gap={18} contentStyle={{ paddingTop: d(120), paddingBottom: d(60) }}>
      <FeatureIcon size={120} tone="subtle">
        <Icon name="check" size={d(52)} tone="brand" />
      </FeatureIcon>

      <View style={{ gap: d(10) }}>
        <Text variant="displayS" center style={{ fontSize: d(28), lineHeight: d(32) }}>
          Order cancelled
        </Text>
        <Text
          variant="bodyL"
          tone="secondary"
          center
          style={{ fontSize: d(16), lineHeight: d(24) }}
        >
          {order ? `${cedis(refund)} is on its way back to ${order.methodLabel}.` : ''}
        </Text>
      </View>

      {/* Refund timeline */}
      <View
        style={{
          padding: d(18),
          borderRadius: d(24),
          backgroundColor: t.colors.bg.surface,
        }}
      >
        {STEPS.map((s, i) => {
          const last = i === STEPS.length - 1;
          return (
            <View
              key={s.title}
              accessibilityRole="text"
              accessibilityLabel={`${s.title}. ${s.meta}. ${s.state}`}
              style={{ flexDirection: 'row', gap: d(14), paddingBottom: last ? 0 : d(4) }}
            >
              <View style={{ width: d(26), alignItems: 'center' }}>
                <View
                  style={{
                    width: d(26),
                    height: d(26),
                    borderRadius: t.radius.full,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor:
                      s.state === 'upcoming' ? t.colors.bg.surfaceRaised : t.colors.bg.brand,
                  }}
                >
                  {s.state === 'done' ? (
                    <Icon name="check" size={d(14)} color={t.colors.icon.onBrand} />
                  ) : s.state === 'current' ? (
                    <View
                      style={{
                        width: d(9),
                        height: d(9),
                        borderRadius: t.radius.full,
                        backgroundColor: t.colors.text.onBrand,
                      }}
                    />
                  ) : null}
                </View>
                {!last ? (
                  <View
                    style={{
                      flex: 1,
                      width: d(2),
                      minHeight: d(26),
                      borderRadius: d(2),
                      backgroundColor:
                        s.state === 'done' ? t.colors.border.brand : t.colors.border.subtle,
                    }}
                  />
                ) : null}
              </View>

              <View style={{ flex: 1, gap: d(3), paddingBottom: last ? 0 : d(12) }}>
                <Text
                  variant="labelM"
                  tone={s.state === 'upcoming' ? 'tertiary' : 'primary'}
                  style={{ fontSize: d(14), lineHeight: d(18) }}
                >
                  {s.title}
                </Text>
                <Text
                  variant="caption"
                  tone="tertiary"
                  style={{ fontSize: d(12), lineHeight: d(16) }}
                >
                  {s.meta}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <View
        style={{
          flexDirection: 'row',
          gap: d(12),
          paddingVertical: d(14),
          paddingHorizontal: d(16),
          borderRadius: d(20),
          backgroundColor: t.colors.bg.surfaceRaised,
        }}
      >
        <Icon name="info" size={d(20)} tone="primary" />
        <View style={{ flex: 1, gap: d(4) }}>
          <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
            Your bank sets the final timing
          </Text>
          <Text variant="bodyS" tone="secondary" style={{ fontSize: d(13), lineHeight: d(19) }}>
            Altruist releases the refund immediately. How quickly it appears depends on your bank —
            most take 3–5 business days.
          </Text>
        </View>
      </View>

      <Button label="Back to orders" size="large" onPress={() => router.replace('/order-history')} />
      <Button
        label="Contact the pharmacy"
        variant="tertiary"
        size="large"
        iconLeading="call"
        onPress={() => router.push('/support')}
      />
    </FormScreen>
  );
}
