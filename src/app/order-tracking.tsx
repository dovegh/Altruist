/**
 * Order Tracking — ported 1:1 from Figma node 41:120.
 *
 * Scroll content: V gap18, pad 64/24/40/24. Summary card (r28, pad 20, gap 14)
 * with a divider and the order total, a Section Header, the five-step timeline,
 * then the contact row.
 *
 * The rating row is what opens Feedback, and it belongs on an order rather than
 * anywhere global: the question is "how was your pharmacy experience", which is
 * only answerable about a specific dispensing. Figma's Feedback flow returns
 * here for the same reason.
 *
 * The timeline comes from the order's own `events` — SRS §3's missing
 * `order_status_events`. A status enum alone cannot say *when* each step
 * happened, and every step on this screen is drawn with a timestamp.
 */
import React from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen } from '@/components/ui/FormScreen';
import { TitleAppBar, SectionHeader } from '@/components/ui/AppBar';
import { StatusPill } from '@/components/ui/PrescriptionCard';
import { OrderTimeline, type TimelineStep } from '@/components/ui/Timeline';
import { ListRow } from '@/components/ui/ListRow';
import { StatusScreen } from '@/components/ui/StatusScreen';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { cedis } from '@/lib/money';
import { useOrderStore, IN_MOTION, type Order } from '@/features/orders/store';
import { usePartnerPharmacy } from '@/features/profile/store';

/** "23 Aug · 05:12 PM". A step that has not happened has no timestamp to show. */
function stamp(at: number, fallback: string): string {
  if (!at) return fallback;
  const date = new Date(at);
  return `${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · ${date
    .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })
    .toUpperCase()}`;
}

function toSteps(order: Order): TimelineStep[] {
  return order.events.map((e, i) => ({
    title: e.title,
    subtitle: e.subtitle,
    timestamp: stamp(
      e.at,
      // The last step is the only one that can honestly carry a forecast; the
      // ones in between are simply not scheduled.
      i === order.events.length - 1 ? `Expected ${order.speedEta.toLowerCase()}` : 'Not yet',
    ),
    state: e.state,
  }));
}

export default function OrderTracking() {
  const pharmacy = usePartnerPharmacy();
  const t = useTokens();
  const { d } = useDesignScale();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const order = useOrderStore((s) => s.items.find((o) => o.id === (id ?? s.lastOrderId)));
  const hydrated = useOrderStore((s) => s.hydrated);

  if (!order) {
    // Silence while storage is still being read, rather than a "not found" that
    // corrects itself a frame later.
    if (!hydrated) return <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} />;
    return (
      <StatusScreen
        icon="danger"
        tone="danger"
        title="Order not found"
        body="We could not find that order on this device. It may have been placed with a different account."
        actions={
          <Button label="See all orders" size="large" onPress={() => router.replace('/order-history')} />
        }
      />
    );
  }

  const units = order.lines.reduce((n, l) => n + l.qty, 0);
  const moving = IN_MOTION.includes(order.status);

  return (
    <FormScreen gap={18}>
      <TitleAppBar title={`Order ${order.id.slice(0, 6)}`} />

      {/* Order summary — r28, pad 20, gap 14 */}
      <View
        style={{
          gap: d(14),
          padding: d(20),
          borderRadius: d(28),
          backgroundColor: t.colors.bg.surface,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(12) }}>
          <View style={{ flex: 1, gap: d(3) }}>
            <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
              {order.pharmacy}
            </Text>
            <Text variant="bodyS" tone="secondary" style={{ fontSize: d(13), lineHeight: d(19) }}>
              {units} item{units === 1 ? '' : 's'} ·{' '}
              {moving ? order.speedEta.toLowerCase() : order.status.toLowerCase()}
            </Text>
          </View>
          <StatusPill status={order.status} />
        </View>

        <View style={{ height: 1, backgroundColor: t.colors.border.subtle }} />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(12) }}>
          <Text variant="bodyM" tone="secondary" style={{ flex: 1, fontSize: d(14), lineHeight: d(21) }}>
            Order total
          </Text>
          <Text variant="numericL" style={{ fontSize: d(28), lineHeight: d(32) }}>
            {cedis(order.total)}
          </Text>
        </View>
      </View>

      <SectionHeader title="Progress" />

      <OrderTimeline steps={toSteps(order)} />

      <ListRow
        title="Contact the pharmacy"
        subtitle={`${order.pharmacy} · ${pharmacy.phone}`}
        icon="call"
        hue="teal"
        chevron
        onPress={() => router.push('/support')}
      />

      <ListRow
        title="View receipt"
        subtitle={`${order.methodLabel} · ${order.reference}`}
        icon="card"
        hue="blue"
        chevron
        onPress={() => router.push(`/order-receipt?id=${order.id}`)}
      />

      <ListRow
        title="Rate your experience"
        subtitle={`Tell ${order.pharmacy} how this order went`}
        icon="star"
        hue="gold"
        chevron
        onPress={() => router.push('/feedback')}
      />
    </FormScreen>
  );
}
