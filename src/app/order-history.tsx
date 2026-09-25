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
import { defineStrings, translate, useLocale, useT } from '@/i18n';

const S = defineStrings({
  en: {
    title: 'Your orders',
    filterA11y: 'Filter orders',
    filterAll: 'All',
    filterActive: 'Active',
    filterDelivered: 'Delivered',
    filterCancelled: 'Cancelled',
    noItems: 'No items',
    andMore: '{name} + {count} more',
    emptyTitle: 'No orders yet',
    emptyBody:
      'Anything you order from a partner pharmacy shows up here, with its receipt and its delivery timeline.',
    browse: 'Browse catalogue',
    nothingUnder: 'Nothing here under “{filter}”.',
    cardA11y: 'Order {id}. {summary}. {pharmacy}, {placed}. {total}. {status}.',
    cancel: 'Cancel',
    receipt: 'Receipt',
    refund: 'Refund',
    reorder: 'Re-order',
  },
  fr: {
    title: 'Vos commandes',
    filterA11y: 'Filtrer les commandes',
    filterAll: 'Toutes',
    filterActive: 'En cours',
    filterDelivered: 'Livrées',
    filterCancelled: 'Annulées',
    noItems: 'Aucun article',
    andMore: '{name} + {count} autre(s)',
    emptyTitle: 'Aucune commande pour le moment',
    emptyBody:
      'Tout ce que vous commandez auprès d’une pharmacie partenaire apparaît ici, avec son reçu et le suivi de livraison.',
    browse: 'Parcourir le catalogue',
    nothingUnder: 'Rien ici sous « {filter} ».',
    cardA11y: 'Commande {id}. {summary}. {pharmacy}, {placed}. {total}. {status}.',
    cancel: 'Annuler',
    receipt: 'Reçu',
    refund: 'Remboursement',
    reorder: 'Recommander',
  },
  tw: {
    title: 'Nneɛma a woato',
    filterA11y: 'Paw nneɛma a woato',
    filterAll: 'Ne nyinaa',
    filterActive: 'Ɛrekɔ so',
    filterDelivered: 'Wɔde abrɛ',
    filterCancelled: 'Wɔatwa mu',
    noItems: 'Adeɛ biara nni hɔ',
    andMore: '{name} + {count} bio',
    emptyTitle: 'Wontɔɔ hwee ɛ',
    emptyBody:
      'Biribiara a wobɛtɔ afiri nnuro fie a yɛne wɔn yɛ adwuma no bɛba ha, ne ne receipt ne sɛnea wɔde reba.',
    browse: 'Hwɛ nneɛma',
    nothingUnder: 'Biribiara nni “{filter}” ase.',
    cardA11y: 'Adetɔ {id}. {summary}. {pharmacy}, {placed}. {total}. {status}.',
    cancel: 'Twa mu',
    receipt: 'Receipt',
    refund: 'Sika sane',
    reorder: 'San tɔ',
  },
  gaa: {
    title: 'Nɔ ni ohe',
    filterA11y: 'Hala nɔ ni ohe',
    filterAll: 'Fɛɛ',
    filterActive: 'Eyaa nɔ',
    filterDelivered: 'Akɛba',
    filterCancelled: 'Akpa',
    noItems: 'Nɔ ko bɛ',
    andMore: '{name} + {count} ekoŋŋ',
    emptyTitle: 'Nɔ ni ohe ko bɛ kɛhã',
    emptyBody:
      'Nɔ fɛɛ nɔ ni obaahe kɛjɛ tsofa shĩa ni wɔkɛ lɛ tsuɔ nii lɛ baaba biɛ, kɛ ehe receipt kɛ bɔ ni akɛbaa.',
    browse: 'Kwɛmɔ nibii',
    nothingUnder: 'Nɔ ko bɛ “{filter}” shishi.',
    cardA11y: 'Nɔ ni ohe {id}. {summary}. {pharmacy}, {placed}. {total}. {status}.',
    cancel: 'Kpa',
    receipt: 'Receipt',
    refund: 'Shika ni aaku',
    reorder: 'He ekoŋŋ',
  },
  ee: {
    title: 'Nu siwo nèƒle',
    filterA11y: 'Tia nu siwo nèƒle',
    filterAll: 'Katã',
    filterActive: 'Le edzi yim',
    filterDelivered: 'Wokɔe vɛ',
    filterCancelled: 'Wotutui',
    noItems: 'Naneke meli o',
    andMore: '{name} + {count} bubuwo',
    emptyTitle: 'Mèƒle naneke haɖe o',
    emptyBody:
      'Nu sia nu si nàƒle tso atikeƒle si míewɔa dɔ kplii gbɔ la ado ɖe afii, kple eƒe receipt kple ale si wole ekɔm vɛe.',
    browse: 'Kpɔ nuawo',
    nothingUnder: 'Naneke mele “{filter}” te o.',
    cardA11y: 'Nuƒeƒle {id}. {summary}. {pharmacy}, {placed}. {total}. {status}.',
    cancel: 'Tutu',
    receipt: 'Receipt',
    refund: 'Ga gbugbɔ',
    reorder: 'Gaƒle',
  },
  ha: {
    title: 'Odarka',
    filterA11y: 'Tace oda',
    filterAll: 'Duka',
    filterActive: 'Masu gudana',
    filterDelivered: 'An kawo',
    filterCancelled: 'An soke',
    noItems: 'Babu kaya',
    andMore: '{name} + ƙarin {count}',
    emptyTitle: 'Babu oda tukuna',
    emptyBody:
      'Duk abin da ka yi oda daga kantin magani abokin hulɗa zai bayyana a nan, tare da rasiti da yadda ake kawo shi.',
    browse: 'Duba kayayyaki',
    nothingUnder: 'Babu komai a “{filter}”.',
    cardA11y: 'Oda {id}. {summary}. {pharmacy}, {placed}. {total}. {status}.',
    cancel: 'Soke',
    receipt: 'Rasiti',
    refund: 'Mayar da kuɗi',
    reorder: 'Sake oda',
  },
});

const FILTERS = ['filterAll', 'filterActive', 'filterDelivered', 'filterCancelled'] as const;

/** "Amoxicillin 500mg + 2 more" — the card's item summary. */
function summarise(order: Order): string {
  const [first, ...rest] = order.lines;
  if (!first) return translate(S, 'noItems');
  return rest.length ? translate(S, 'andMore', { name: first.name, count: rest.length }) : first.name;
}

export default function OrderHistory() {
  const tr = useT(S);
  const locale = useLocale();
  const t = useTokens();
  const { d } = useDesignScale();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('filterAll');

  const orders = useOrderStore((s) => s.items);
  const addToCart = useCartStore((s) => s.add);

  const visible = useMemo(() => {
    if (filter === 'filterActive') return orders.filter((o) => IN_MOTION.includes(o.status));
    if (filter === 'filterDelivered') return orders.filter((o) => o.status === 'DELIVERED');
    if (filter === 'filterCancelled')
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
      <TitleAppBar title={tr('title')} actions={[{ icon: 'filter', label: tr('filterA11y') }]} />

      {orders.length === 0 ? (
        <View style={{ gap: d(22), paddingTop: d(90) }}>
          <StatusHalo icon="cart" tone="neutral" outer={148} glyph={56} />
          <View style={{ gap: d(10) }}>
            <Text variant="headingXL" center style={{ fontSize: d(24), lineHeight: d(30) }}>
              {tr('emptyTitle')}
            </Text>
            <Text variant="bodyM" tone="secondary" center style={{ fontSize: d(14), lineHeight: d(21) }}>
              {tr('emptyBody')}
            </Text>
          </View>
          <Button label={tr('browse')} size="large" onPress={() => router.replace('/catalog')} />
        </View>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: d(10) }}
          >
            {FILTERS.map((f) => (
              <FilterChip key={f} label={tr(f)} selected={filter === f} onPress={() => setFilter(f)} />
            ))}
          </ScrollView>

          {visible.length === 0 ? (
            <Text
              variant="bodyM"
              tone="secondary"
              center
              style={{ paddingTop: d(40), fontSize: d(14), lineHeight: d(21) }}
            >
              {tr('nothingUnder', { filter: tr(filter) })}
            </Text>
          ) : null}

          <Stagger step={55}>
            {visible.map((o) => {
              const moving = IN_MOTION.includes(o.status);
              const placed = new Date(o.placedAt).toLocaleDateString(locale, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });
              return (
                <Pressable
                  key={o.id}
                  accessibilityRole="button"
                  accessibilityLabel={tr('cardA11y', {
                    id: o.id,
                    summary: summarise(o),
                    pharmacy: o.pharmacy,
                    placed,
                    total: cedis(o.total),
                    status: o.status,
                  })}
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
                    {moving ? action(tr('cancel'), () => router.push(`/cancel-order?id=${o.id}`)) : null}
                    {o.status === 'DELIVERED'
                      ? action(tr('receipt'), () => router.push(`/order-receipt?id=${o.id}`))
                      : null}
                    {o.status === 'DELIVERED'
                      ? action(tr('refund'), () => router.push(`/request-refund?id=${o.id}`))
                      : null}
                    <Button
                      label={tr('reorder')}
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
