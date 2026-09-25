/**
 * Cancel Order — ported 1:1 from Figma node 101:3.
 *
 * Scroll content: V gap16, pad 64/24/150/24. Order strip, a gold timing
 * warning, the refund breakdown (r24, pad 16/18), then the reason radios.
 * Footer: Danger "Cancel this order" over Tertiary "Keep my order".
 *
 * The breakdown says who refunds what — the pharmacy for the medicines,
 * Altruist for its own fee — because they are separate parties. It also states
 * that the refund can only return to the original card: a refund routed
 * anywhere else is how payment fraud works, and the constraint is Paystack's,
 * not a preference.
 */
import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen, StickyFooter } from '@/components/ui/FormScreen';
import { TitleAppBar } from '@/components/ui/AppBar';
import { SectionLabel } from '@/components/ui/Checkout';
import { Radio } from '@/components/ui/Form';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { StatusScreen } from '@/components/ui/StatusScreen';
import { cedis } from '@/lib/money';
import { useOrderStore } from '@/features/orders/store';
import { CANCEL_REASONS as REASONS } from '@/lib/forms';


export default function CancelOrder() {
  const t = useTokens();
  const { d } = useDesignScale();
  const [reason, setReason] = useState<string | null>(null);
  const { id } = useLocalSearchParams<{ id?: string }>();

  const order = useOrderStore((s) => s.items.find((o) => o.id === (id ?? s.lastOrderId)));
  const hydrated = useOrderStore((s) => s.hydrated);
  const setStatus = useOrderStore((s) => s.setStatus);

  if (!order) {
    if (!hydrated) return <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} />;
    return (
      <StatusScreen
        icon="danger"
        tone="danger"
        title="Order not found"
        body="We could not find that order on this device."
        actions={
          <Button label="See all orders" size="large" onPress={() => router.replace('/order-history')} />
        }
      />
    );
  }

  const units = order.lines.reduce((n, l) => n + l.qty, 0);
  // Who refunds what, because they are separate parties: the pharmacy sold the
  // medicines, Altruist charged its own fee. The delivery line only refunds
  // while nothing has left the counter.
  const dispatched = order.status === 'DISPATCHED' || order.status === 'DELIVERED';
  const breakdown: [string, string, string][] = [
    ['Medicines and items', `Refunded by ${order.pharmacy}`, cedis(order.subtotal)],
    [
      'Delivery fee',
      dispatched ? 'Not refunded — rider already dispatched' : 'Refunded — not yet dispatched',
      cedis(dispatched ? 0 : order.deliveryFee),
    ],
    ['Altruist service fee', 'Refunded in full', cedis(order.serviceFee)],
  ];
  const refund = order.subtotal + (dispatched ? 0 : order.deliveryFee) + order.serviceFee;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      <FormScreen gap={16}>
        <TitleAppBar title="Cancel order" />

        {/* Order strip */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: d(12),
            paddingVertical: d(14),
            paddingHorizontal: d(16),
            borderRadius: d(20),
            backgroundColor: t.colors.bg.surface,
          }}
        >
          <View
            style={{
              width: d(40),
              height: d(40),
              borderRadius: t.radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: t.colors.bg.surfaceRaised,
            }}
          >
            <Icon name="prescription" size={d(18)} tone="primary" />
          </View>
          <View style={{ flex: 1, gap: d(3) }}>
            <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
              TrxID {order.id}
            </Text>
            <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
              {order.pharmacy} · {units} item{units === 1 ? '' : 's'}
            </Text>
          </View>
          <Text variant="numericM" style={{ fontSize: d(20), lineHeight: d(26) }}>
            {cedis(order.total)}
          </Text>
        </View>

        {/* Timing warning */}
        <View
          style={{
            flexDirection: 'row',
            gap: d(12),
            paddingVertical: d(14),
            paddingHorizontal: d(16),
            borderRadius: d(20),
            backgroundColor: t.colors.bg.warningSubtle,
          }}
        >
          <Icon name="clock" size={d(20)} tone="warning" />
          <View style={{ flex: 1, gap: d(4) }}>
            <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
              Your pharmacist has started preparing this order
            </Text>
            <Text variant="bodyS" tone="secondary" style={{ fontSize: d(13), lineHeight: d(19) }}>
              You can still cancel for free until it is dispatched.
            </Text>
          </View>
        </View>

        {/* What you get back */}
        <View
          style={{
            gap: d(12),
            paddingVertical: d(16),
            paddingHorizontal: d(18),
            borderRadius: d(24),
            backgroundColor: t.colors.bg.surface,
          }}
        >
          <SectionLabel>WHAT YOU GET BACK</SectionLabel>

          {breakdown.map(([label, note, value]) => (
            <View key={label} style={{ flexDirection: 'row', gap: d(12) }}>
              <View style={{ flex: 1, gap: d(2) }}>
                <Text variant="bodyM" style={{ fontSize: d(14), lineHeight: d(21) }}>
                  {label}
                </Text>
                <Text
                  variant="caption"
                  tone="tertiary"
                  style={{ fontSize: d(12), lineHeight: d(16) }}
                >
                  {note}
                </Text>
              </View>
              <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
                {value}
              </Text>
            </View>
          ))}

          <View style={{ height: 1, backgroundColor: t.colors.border.subtle }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(12) }}>
            <Text variant="labelL" style={{ flex: 1, fontSize: d(16), lineHeight: d(20) }}>
              Total refund
            </Text>
            <Text variant="numericM" tone="brand" style={{ fontSize: d(20), lineHeight: d(26) }}>
              {cedis(refund)}
            </Text>
          </View>

          <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
            Refunds return to {order.methodLabel} via Paystack. They cannot be redirected to
            another card or account.
          </Text>
        </View>

        <SectionLabel>WHY ARE YOU CANCELLING?</SectionLabel>

        {REASONS.map((r) => {
          const selected = reason === r;
          return (
            <Pressable
              key={r}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={r}
              onPress={() => setReason(r)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: d(12),
                paddingVertical: d(14),
                paddingHorizontal: d(16),
                borderRadius: d(18),
                backgroundColor: t.colors.bg.surface,
                borderWidth: 1.5,
                borderColor: selected ? t.colors.border.brand : 'transparent',
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Radio selected={selected} />
              <Text variant="labelM" style={{ flex: 1, fontSize: d(14), lineHeight: d(18) }}>
                {r}
              </Text>
            </Pressable>
          );
        })}
      </FormScreen>

      <StickyFooter>
        <Button
          label="Cancel this order"
          variant="danger"
          size="large"
          onPress={() => {
            setStatus(order.id, 'CANCELLED');
            router.replace(`/cancellation-confirmed?id=${order.id}`);
          }}
        />
        <Button
          label="Keep my order"
          variant="tertiary"
          size="large"
          onPress={() => router.back()}
        />
      </StickyFooter>
    </View>
  );
}
