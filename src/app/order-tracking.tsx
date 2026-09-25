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
import { defineStrings, translate, useLocale, useT } from '@/i18n';

const S = defineStrings({
  en: {
    expected: 'Expected {eta}',
    notYet: 'Not yet',
    notFoundTitle: 'Order not found',
    notFoundBody:
      'We could not find that order on this device. It may have been placed with a different account.',
    seeAll: 'See all orders',
    title: 'Order {id}',
    itemsOne: '{count} item · {detail}',
    itemsMany: '{count} items · {detail}',
    stPending: 'pending',
    stVerified: 'verified',
    stRejected: 'rejected',
    stDelivered: 'delivered',
    stCancelled: 'cancelled',
    orderTotal: 'Order total',
    progress: 'Progress',
    contact: 'Contact the pharmacy',
    receipt: 'View receipt',
    rate: 'Rate your experience',
    rateSub: 'Tell {pharmacy} how this order went',
  },
  fr: {
    expected: 'Prévu {eta}',
    notYet: 'Pas encore',
    notFoundTitle: 'Commande introuvable',
    notFoundBody:
      'Nous n’avons pas trouvé cette commande sur cet appareil. Elle a peut-être été passée avec un autre compte.',
    seeAll: 'Voir toutes les commandes',
    title: 'Commande {id}',
    itemsOne: '{count} article · {detail}',
    itemsMany: '{count} articles · {detail}',
    stPending: 'en attente',
    stVerified: 'vérifiée',
    stRejected: 'refusée',
    stDelivered: 'livrée',
    stCancelled: 'annulée',
    orderTotal: 'Total de la commande',
    progress: 'Suivi',
    contact: 'Contacter la pharmacie',
    receipt: 'Voir le reçu',
    rate: 'Donnez votre avis',
    rateSub: 'Dites à {pharmacy} comment s’est passée cette commande',
  },
  tw: {
    expected: 'Yɛhwɛ kwan {eta}',
    notYet: 'Ɛnnya',
    notFoundTitle: 'Yɛanhu adetɔ no',
    notFoundBody:
      'Yɛanhu saa adetɔ no wɔ saa fon yi so. Ebia wɔde akontaa foforɔ na ɛtɔeɛ.',
    seeAll: 'Hwɛ nneɛma a woato nyinaa',
    title: 'Adetɔ {id}',
    itemsOne: 'Adeɛ {count} · {detail}',
    itemsMany: 'Nneɛma {count} · {detail}',
    stPending: 'ɛretwɛn',
    stVerified: 'wɔahwɛ',
    stRejected: 'wɔapo',
    stDelivered: 'wɔde abrɛ',
    stCancelled: 'wɔatwa mu',
    orderTotal: 'Adetɔ no nyinaa bo',
    progress: 'Sɛnea ɛrekɔ',
    contact: 'Frɛ nnuro fie no',
    receipt: 'Hwɛ receipt',
    rate: 'Ka sɛnea ɛkɔeɛ',
    rateSub: 'Ka kyerɛ {pharmacy} sɛnea saa adetɔ yi kɔeɛ',
  },
  gaa: {
    expected: 'Akpaa gbɛ {eta}',
    notYet: 'Kɛhã',
    notFoundTitle: 'Anaaa nɔ ni ohe lɛ',
    notFoundBody:
      'Wɔnaaa nɔ nɛɛ yɛ fon nɛɛ nɔ. Ekolɛ akɛ akɔŋt kroko ehe.',
    seeAll: 'Kwɛmɔ nɔ ni ohe fɛɛ',
    title: 'Nɔ ni ohe {id}',
    itemsOne: 'Nɔ {count} · {detail}',
    itemsMany: 'Nibii {count} · {detail}',
    stPending: 'eemɔ',
    stVerified: 'akwɛ',
    stRejected: 'akpoo',
    stDelivered: 'akɛba',
    stCancelled: 'akpa',
    orderTotal: 'Nɔ ni ohe lɛ fɛɛ ahe',
    progress: 'Bɔ ni eyaa',
    contact: 'Tsɛ tsofa shĩa lɛ',
    receipt: 'Kwɛmɔ receipt',
    rate: 'Kɛɛ bɔ ni eyaa',
    rateSub: 'Kɛɛ {pharmacy} bɔ ni nɔ nɛɛ yaa',
  },
  ee: {
    expected: 'Míele mɔ kpɔm {eta}',
    notYet: 'Haɖe o',
    notFoundTitle: 'Míekpɔ nuƒeƒle la o',
    notFoundBody:
      'Míekpɔ nuƒeƒle ma le fon sia dzi o. Ɖewohĩ wozã akɔnta bubu ƒlee.',
    seeAll: 'Kpɔ nu siwo nèƒle katã',
    title: 'Nuƒeƒle {id}',
    itemsOne: 'Nu {count} · {detail}',
    itemsMany: 'Nu {count} · {detail}',
    stPending: 'le lalam',
    stVerified: 'wokpɔe',
    stRejected: 'wogbee',
    stDelivered: 'wokɔe vɛ',
    stCancelled: 'wotutui',
    orderTotal: 'Nuƒeƒle la katã',
    progress: 'Ale si wòle yiyim',
    contact: 'Yɔ atikeƒle la',
    receipt: 'Kpɔ receipt',
    rate: 'Gblɔ ale si wònɔ',
    rateSub: 'Gblɔ na {pharmacy} ale si nuƒeƒle sia yi',
  },
  ha: {
    expected: 'Ana sa ran {eta}',
    notYet: 'Tukuna',
    notFoundTitle: 'Ba a sami oda ba',
    notFoundBody:
      'Ba mu sami wannan oda a wannan na’ura ba. Wataƙila an yi ta da wani asusu daban.',
    seeAll: 'Duba duk oda',
    title: 'Oda {id}',
    itemsOne: 'Kaya {count} · {detail}',
    itemsMany: 'Kaya {count} · {detail}',
    stPending: 'ana jira',
    stVerified: 'an tabbatar',
    stRejected: 'an ƙi',
    stDelivered: 'an kawo',
    stCancelled: 'an soke',
    orderTotal: 'Jimlar oda',
    progress: 'Ci gaba',
    contact: 'Tuntuɓi kantin magani',
    receipt: 'Duba rasiti',
    rate: 'Faɗi ra’ayinka',
    rateSub: 'Faɗa wa {pharmacy} yadda wannan oda ta kasance',
  },
});

type Key = keyof typeof S.en;

/** Settled states have a word of their own; the moving ones show the ETA instead. */
const STATUS_WORD: Partial<Record<Order['status'], Key>> = {
  PENDING: 'stPending',
  VERIFIED: 'stVerified',
  REJECTED: 'stRejected',
  DELIVERED: 'stDelivered',
  CANCELLED: 'stCancelled',
};

/** "23 Aug · 05:12 PM". A step that has not happened has no timestamp to show. */
function stamp(at: number, fallback: string, locale: string): string {
  if (!at) return fallback;
  const date = new Date(at);
  return `${date.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} · ${date
    .toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: true })
    .toUpperCase()}`;
}

function toSteps(order: Order, locale: string): TimelineStep[] {
  return order.events.map((e, i) => ({
    title: e.title,
    subtitle: e.subtitle,
    timestamp: stamp(
      e.at,
      // The last step is the only one that can honestly carry a forecast; the
      // ones in between are simply not scheduled.
      i === order.events.length - 1
        ? translate(S, 'expected', { eta: order.speedEta.toLowerCase() })
        : translate(S, 'notYet'),
      locale,
    ),
    state: e.state,
  }));
}

export default function OrderTracking() {
  const tr = useT(S);
  const locale = useLocale();
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
        title={tr('notFoundTitle')}
        body={tr('notFoundBody')}
        actions={
          <Button label={tr('seeAll')} size="large" onPress={() => router.replace('/order-history')} />
        }
      />
    );
  }

  const units = order.lines.reduce((n, l) => n + l.qty, 0);
  const moving = IN_MOTION.includes(order.status);

  return (
    <FormScreen gap={18}>
      <TitleAppBar title={tr('title', { id: order.id.slice(0, 6) })} />

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
              {tr(units === 1 ? 'itemsOne' : 'itemsMany', {
                count: units,
                detail: moving
                  ? order.speedEta.toLowerCase()
                  : STATUS_WORD[order.status]
                    ? tr(STATUS_WORD[order.status] as Key)
                    : order.status.toLowerCase(),
              })}
            </Text>
          </View>
          <StatusPill status={order.status} />
        </View>

        <View style={{ height: 1, backgroundColor: t.colors.border.subtle }} />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(12) }}>
          <Text variant="bodyM" tone="secondary" style={{ flex: 1, fontSize: d(14), lineHeight: d(21) }}>
            {tr('orderTotal')}
          </Text>
          <Text variant="numericL" style={{ fontSize: d(28), lineHeight: d(32) }}>
            {cedis(order.total)}
          </Text>
        </View>
      </View>

      <SectionHeader title={tr('progress')} />

      <OrderTimeline steps={toSteps(order, locale)} />

      <ListRow
        title={tr('contact')}
        subtitle={`${order.pharmacy} · ${pharmacy.phone}`}
        icon="call"
        hue="teal"
        chevron
        onPress={() => router.push('/support')}
      />

      <ListRow
        title={tr('receipt')}
        subtitle={`${order.methodLabel} · ${order.reference}`}
        icon="card"
        hue="blue"
        chevron
        onPress={() => router.push(`/order-receipt?id=${order.id}`)}
      />

      <ListRow
        title={tr('rate')}
        subtitle={tr('rateSub', { pharmacy: order.pharmacy })}
        icon="star"
        hue="gold"
        chevron
        onPress={() => router.push('/feedback')}
      />
    </FormScreen>
  );
}
