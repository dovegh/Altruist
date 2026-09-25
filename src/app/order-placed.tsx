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
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    title: 'Order placed',
    body: '{pharmacy} has your order. You will get a push the moment the pharmacist verifies it.',
    bodyFallback:
      'The partner pharmacy has your order. You will get a push the moment the pharmacist verifies it.',
    track: 'Track this order',
    home: 'Back to home',
    paidOne: '{count} item · {total} paid',
    paidMany: '{count} items · {total} paid',
  },
  fr: {
    title: 'Commande passée',
    body: '{pharmacy} a reçu votre commande. Vous recevrez une notification dès que le pharmacien l’aura vérifiée.',
    bodyFallback:
      'La pharmacie partenaire a reçu votre commande. Vous recevrez une notification dès que le pharmacien l’aura vérifiée.',
    track: 'Suivre cette commande',
    home: 'Retour à l’accueil',
    paidOne: '{count} article · {total} payé',
    paidMany: '{count} articles · {total} payé',
  },
  tw: {
    title: 'Wɔagye w’adetɔ',
    body: '{pharmacy} anya w’adetɔ no. Sɛ nnuroyɛfoɔ no hwɛ wie pɛ a, wobɛnya nkaeɛ.',
    bodyFallback:
      'Nnuro fie a yɛne wɔn yɛ adwuma no anya w’adetɔ no. Sɛ nnuroyɛfoɔ no hwɛ wie pɛ a, wobɛnya nkaeɛ.',
    track: 'Di saa adetɔ yi akyi',
    home: 'San kɔ fie',
    paidOne: 'Adeɛ {count} · wotuaa {total}',
    paidMany: 'Nneɛma {count} · wotuaa {total}',
  },
  gaa: {
    title: 'Ahe nɔ ni ohe lɛ',
    body: '{pharmacy} ena nɔ ni ohe lɛ. Beni tsofatsɛ lɛ baakwɛ lɛ, obaana kaimɔ.',
    bodyFallback:
      'Tsofa shĩa ni wɔkɛ lɛ tsuɔ nii lɛ ena nɔ ni ohe lɛ. Beni tsofatsɛ lɛ baakwɛ lɛ, obaana kaimɔ.',
    track: 'Nyiɛ nɔ nɛɛ sɛɛ',
    home: 'Kua shĩa',
    paidOne: 'Nɔ {count} · owo {total}',
    paidMany: 'Nibii {count} · owo {total}',
  },
  ee: {
    title: 'Woxɔ wò nuƒeƒle',
    body: '{pharmacy} xɔ wò nuƒeƒle. Ne atikewɔla la kpɔe ko la, àxɔ gbedasi.',
    bodyFallback:
      'Atikeƒle si míewɔa dɔ kplii la xɔ wò nuƒeƒle. Ne atikewɔla la kpɔe ko la, àxɔ gbedasi.',
    track: 'Kpɔ nuƒeƒle sia ƒe mɔzɔzɔ',
    home: 'Trɔ yi aƒeme',
    paidOne: 'Nu {count} · èxe {total}',
    paidMany: 'Nu {count} · èxe {total}',
  },
  ha: {
    title: 'An yi oda',
    body: '{pharmacy} ya karɓi odarka. Za ka sami sanarwa da zarar mai harhaɗa magani ya tabbatar da ita.',
    bodyFallback:
      'Kantin magani abokin hulɗa ya karɓi odarka. Za ka sami sanarwa da zarar mai harhaɗa magani ya tabbatar da ita.',
    track: 'Bi sawun wannan oda',
    home: 'Koma gida',
    paidOne: 'Kaya {count} · an biya {total}',
    paidMany: 'Kaya {count} · an biya {total}',
  },
});

export default function OrderPlaced() {
  const tr = useT(S);
  const t = useTokens();
  const { d } = useDesignScale();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const order = useOrderStore((s) => s.items.find((o) => o.id === (id ?? s.lastOrderId)));

  const units = order?.lines.reduce((n, l) => n + l.qty, 0) ?? 0;

  return (
    <StatusScreen
      icon="check"
      tone="brand"
      title={tr('title')}
      body={order?.pharmacy ? tr('body', { pharmacy: order.pharmacy }) : tr('bodyFallback')}
      actions={
        <>
          <Button
            label={tr('track')}
            size="large"
            onPress={() => router.replace(order ? `/order-tracking?id=${order.id}` : '/order-history')}
          />
          <Button
            label={tr('home')}
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
              {tr(units === 1 ? 'paidOne' : 'paidMany', { count: units, total: cedis(order.total) })}
            </Text>
          </View>
          <StatusPill status={order.status} />
        </View>
      ) : null}
    </StatusScreen>
  );
}
