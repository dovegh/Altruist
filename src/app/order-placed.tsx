/**
 * Success — Order Placed — ported 1:1 from Figma node on page "System States".
 *
 * V gap22, pad 150/24/40/24. A 160/116 mint halo, the head, a receipt strip
 * carrying the TrxID and a RECEIVED pill, then Track / Back to home.
 *
 * The status pill says RECEIVED, not "confirmed": the pharmacy has the order but
 * a pharmacist has not verified the prescription yet. Overstating the state here
 * is what turns a later rejection into a broken promise.
 *
 * Reached as `/order-placed?id=<orderId>` from Processing, and falls back to the
 * most recent order — a user who kills the app on this screen and reopens it
 * should still be told which order they just paid for.
 */
import React from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { StatusScreen } from '@/components/ui/StatusScreen';
import { StatusPill } from '@/components/ui/PrescriptionCard';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { cedis } from '@/lib/money';
import { useOrderStore } from '@/features/orders/store';

export default function OrderPlaced() {
  const t = useTokens();
  const { d } = useDesignScale();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const order = useOrderStore((s) => s.items.find((o) => o.id === (id ?? s.lastOrderId)));

  const units = order?.lines.reduce((n, l) => n + l.qty, 0) ?? 0;

  return (
    <StatusScreen
      icon="check"
      tone="brand"
      title="Order placed"
      body={`${
        order?.pharmacy ?? 'The partner pharmacy'
      } has your order. You will get a push the moment the pharmacist verifies it.`}
      actions={
        <>
          <Button
            label="Track this order"
            size="large"
            onPress={() => router.replace(order ? `/order-tracking?id=${order.id}` : '/order-history')}
          />
          <Button
            label="Back to home"
            variant="tertiary"
            size="large"
            onPress={() => router.replace('/home')}
          />
        </>
      }
    >
      {order ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: d(12),
            paddingVertical: d(16),
            paddingHorizontal: d(18),
            borderRadius: d(20),
            backgroundColor: t.colors.bg.surface,
          }}
        >
          <View style={{ flex: 1, gap: d(3) }}>
            <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
              TrxID {order.id}
            </Text>
            <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
              {units} item{units === 1 ? '' : 's'} · {cedis(order.total)} paid
            </Text>
          </View>
          <StatusPill status={order.status} />
        </View>
      ) : null}
    </StatusScreen>
  );
}
