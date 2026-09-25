/**
 * Order History — ported 1:1 from Figma node 74:115.
 *
 * Scroll content: V gap16, pad 64/24/60/24. Filter chips, then one card per
 * order (bg/surface r24, V gap12, pad 16/18): a head row with the TrxID and a
 * Status Pill, the item summary, the pharmacy and date, a divider, then a foot
 * row with the total and the actions.
 *
 * "Track" only appears while an order is still moving. A delivered or rejected
 * order has nothing left to track, and offering the control anyway would send
 * the user to a timeline that cannot change.
 *
 * Re-order puts the order's own lines back in the cart and opens it — a re-order
 * that navigated to an unchanged cart, which is what the button did before, is
 * the single most confusing control on this screen.
 */
import React, { useMemo, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen } from '@/components/ui/FormScreen';
import { TitleAppBar } from '@/components/ui/AppBar';
import { FilterChip } from '@/components/ui/Product';
import { StatusPill } from '@/components/ui/PrescriptionCard';
import { StatusHalo } from '@/components/ui/StatusScreen';
import { Button } from '@/components/ui/Button';
import { Stagger } from '@/components/ui/Motion';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { cedis } from '@/lib/money';
import { useOrderStore, IN_MOTION, type Order } from '@/features/orders/store';
import { useCartStore } from '@/features/cart/store';

const FILTERS = ['All', 'Active', 'Delivered', 'Cancelled'] as const;

/** "Amoxicillin 500mg + 2 more" — the card's item summary. */
function summarise(order: Order): string {
  const [first, ...rest] = order.lines;
  if (!first) return 'No items';
  return rest.length ? `${first.name} + ${rest.length} more` : first.name;
}

export default function OrderHistory() {
  const t = useTokens();
  const { d } = useDesignScale();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');

  const orders = useOrderStore((s) => s.items);
  const addToCart = useCartStore((s) => s.add);

  const visible = useMemo(() => {
    if (filter === 'Active') return orders.filter((o) => IN_MOTION.includes(o.status));
    if (filter === 'Delivered') return orders.filter((o) => o.status === 'DELIVERED');
    if (filter === 'Cancelled')
      return orders.filter((o) => o.status === 'CANCELLED' || o.status === 'REJECTED');
    return orders;
  }, [filter, orders]);

  const reorder = (order: Order) => {
    for (const line of order.lines) addToCart(line.productId, line.qty);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.push('/cart');
  };

  const action = (label: string, onPress?: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={{ top: 6, bottom: 6 }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: d(4),
        height: d(32),
        paddingLeft: d(14),
        paddingRight: d(10),
        borderRadius: t.radius.full,
        backgroundColor: t.colors.bg.surfaceRaised,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Text variant="labelS" tone="secondary" style={{ fontSize: d(12), lineHeight: d(16) }}>
        {label}
      </Text>
      <Icon name="chevron-right" size={d(15)} tone="tertiary" />
    </Pressable>
  );

  return (
    <FormScreen gap={16} contentStyle={{ paddingBottom: d(60) }}>
      <TitleAppBar title="Your orders" actions={[{ icon: 'filter', label: 'Filter orders' }]} />

      {orders.length === 0 ? (
        <View style={{ gap: d(22), paddingTop: d(90) }}>
          <StatusHalo icon="cart" tone="neutral" outer={148} glyph={56} />
          <View style={{ gap: d(10) }}>
            <Text variant="headingXL" center style={{ fontSize: d(24), lineHeight: d(30) }}>
              No orders yet
            </Text>
            <Text variant="bodyM" tone="secondary" center style={{ fontSize: d(14), lineHeight: d(21) }}>
              Anything you order from a partner pharmacy shows up here, with its receipt and its
              delivery timeline.
            </Text>
          </View>
          <Button label="Browse catalogue" size="large" onPress={() => router.replace('/catalog')} />
        </View>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: d(10) }}
          >
            {FILTERS.map((f) => (
              <FilterChip key={f} label={f} selected={filter === f} onPress={() => setFilter(f)} />
            ))}
          </ScrollView>

          {visible.length === 0 ? (
            <Text
              variant="bodyM"
              tone="secondary"
              center
              style={{ paddingTop: d(40), fontSize: d(14), lineHeight: d(21) }}
            >
              Nothing here under “{filter}”.
            </Text>
          ) : null}

          <Stagger step={55}>
            {visible.map((o) => {
              const moving = IN_MOTION.includes(o.status);
              const placed = new Date(o.placedAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });
              return (
                <Pressable
                  key={o.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Order ${o.id}. ${summarise(o)}. ${o.pharmacy}, ${placed}. ${cedis(
                    o.total,
                  )}. ${o.status}.`}
                  onPress={() => router.push(`/order-tracking?id=${o.id}`)}
                  style={({ pressed }) => ({
                    gap: d(12),
                    paddingVertical: d(16),
                    paddingHorizontal: d(18),
                    borderRadius: d(24),
                    backgroundColor: t.colors.bg.surface,
                    opacity: pressed ? 0.9 : 1,
                  })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(10) }}>
                    <Text variant="labelM" style={{ flex: 1, fontSize: d(14), lineHeight: d(18) }}>
                      TrxID {o.id}
                    </Text>
                    <StatusPill status={o.status} />
                  </View>

                  <Text variant="bodyM" tone="secondary" style={{ fontSize: d(14), lineHeight: d(21) }}>
                    {summarise(o)}
                  </Text>
                  <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
                    {o.pharmacy} · {placed}
                  </Text>

                  <View style={{ height: 1, backgroundColor: t.colors.border.subtle }} />

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(10) }}>
                    <Text variant="numericM" style={{ flex: 1, fontSize: d(20), lineHeight: d(26) }}>
                      {cedis(o.total)}
                    </Text>
                    {moving ? action('Cancel', () => router.push(`/cancel-order?id=${o.id}`)) : null}
                    {o.status === 'DELIVERED'
                      ? action('Receipt', () => router.push(`/order-receipt?id=${o.id}`))
                      : null}
                    {o.status === 'DELIVERED'
                      ? action('Refund', () => router.push(`/request-refund?id=${o.id}`))
                      : null}
                    <Button
                      label="Re-order"
                      variant="tertiary"
                      size="small"
                      iconLeading="cart"
                      fullWidth={false}
                      onPress={() => reorder(o)}
                    />
                  </View>
                </Pressable>
              );
            })}
          </Stagger>
        </>
      )}
    </FormScreen>
  );
}
