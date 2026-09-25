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
import { defineStrings, useT } from '@/i18n';
import { formLabel } from '@/lib/formLabels';

const S = defineStrings({
  en: {
    notFoundTitle: 'Order not found',
    notFoundBody: 'We could not find that order on this device.',
    seeAll: 'See all orders',
    medicines: 'Medicines and items',
    refundedBy: 'Refunded by {pharmacy}',
    deliveryFee: 'Delivery fee',
    notRefunded: 'Not refunded — rider already dispatched',
    refundedNotYet: 'Refunded — not yet dispatched',
    serviceFee: 'Altruist service fee',
    refundedFull: 'Refunded in full',
    title: 'Cancel order',
    stripOne: '{pharmacy} · {count} item',
    stripMany: '{pharmacy} · {count} items',
    warnTitle: 'Your pharmacist has started preparing this order',
    warnBody: 'You can still cancel for free until it is dispatched.',
    getBack: 'WHAT YOU GET BACK',
    totalRefund: 'Total refund',
    refundsReturn:
      'Refunds return to {method} via Paystack. They cannot be redirected to another card or account.',
    why: 'WHY ARE YOU CANCELLING?',
    cancelThis: 'Cancel this order',
    keep: 'Keep my order',
  },
  fr: {
    notFoundTitle: 'Commande introuvable',
    notFoundBody: 'Nous n’avons pas trouvé cette commande sur cet appareil.',
    seeAll: 'Voir toutes les commandes',
    medicines: 'Médicaments et articles',
    refundedBy: 'Remboursé par {pharmacy}',
    deliveryFee: 'Frais de livraison',
    notRefunded: 'Non remboursés — le livreur est déjà parti',
    refundedNotYet: 'Remboursés — pas encore expédiée',
    serviceFee: 'Frais de service Altruist',
    refundedFull: 'Remboursés intégralement',
    title: 'Annuler la commande',
    stripOne: '{pharmacy} · {count} article',
    stripMany: '{pharmacy} · {count} articles',
    warnTitle: 'Votre pharmacien a commencé à préparer cette commande',
    warnBody: 'Vous pouvez encore annuler gratuitement jusqu’à son expédition.',
    getBack: 'CE QUI VOUS EST REMBOURSÉ',
    totalRefund: 'Remboursement total',
    refundsReturn:
      'Les remboursements reviennent sur {method} via Paystack. Ils ne peuvent pas être redirigés vers une autre carte ou un autre compte.',
    why: 'POURQUOI ANNULEZ-VOUS ?',
    cancelThis: 'Annuler cette commande',
    keep: 'Garder ma commande',
  },
  tw: {
    notFoundTitle: 'Yɛanhu adetɔ no',
    notFoundBody: 'Yɛanhu saa adetɔ no wɔ saa fon yi so.',
    seeAll: 'Hwɛ nneɛma a woato nyinaa',
    medicines: 'Nnuro ne nneɛma',
    refundedBy: '{pharmacy} na ɛsan de ma wo',
    deliveryFee: 'De brɛ wo ho ka',
    notRefunded: 'Wɔnsan mma — ɔkafoɔ no afiri hɔ dada',
    refundedNotYet: 'Wɔsan de ma — ɛmfirii hɔ ɛ',
    serviceFee: 'Altruist adwuma ho ka',
    refundedFull: 'Wɔsan de ne nyinaa ma',
    title: 'Twa adetɔ mu',
    stripOne: '{pharmacy} · adeɛ {count}',
    stripMany: '{pharmacy} · nneɛma {count}',
    warnTitle: 'Wo nnuroyɛfoɔ afi aseɛ resiesie saa adetɔ yi',
    warnBody: 'Wobɛtumi atwa mu kwa kɔsi sɛ wɔde bɛfiri hɔ.',
    getBack: 'DEƐ WOBƐNYA ASAN',
    totalRefund: 'Sika a ɛbɛsan aba nyinaa',
    refundsReturn:
      'Sika a ɛsan ba no bɛkɔ {method} so denam Paystack so. Wɔrentumi mfa nkɔ kaad anaa akontaa foforɔ so.',
    why: 'ADƐN NTI NA WORETWA MU?',
    cancelThis: 'Twa saa adetɔ yi mu',
    keep: 'Ma m’adetɔ ntena hɔ',
  },
  gaa: {
    notFoundTitle: 'Anaaa nɔ ni ohe lɛ',
    notFoundBody: 'Wɔnaaa nɔ nɛɛ yɛ fon nɛɛ nɔ.',
    seeAll: 'Kwɛmɔ nɔ ni ohe fɛɛ',
    medicines: 'Tsofai kɛ nibii',
    refundedBy: '{pharmacy} kuɔ ehaa bo',
    deliveryFee: 'Kɛbamɔ he nyɔmɔ',
    notRefunded: 'Akuuu aha — mɔ ni kɛbaa lɛ ejɛ jɛmɛ momo',
    refundedNotYet: 'Akuɔ ahaa — ejɛko jɛmɛ kɛhã',
    serviceFee: 'Altruist nitsumɔ he nyɔmɔ',
    refundedFull: 'Akuɔ fɛɛ ahaa',
    title: 'Kpa nɔ ni ohe',
    stripOne: '{pharmacy} · nɔ {count}',
    stripMany: '{pharmacy} · nibii {count}',
    warnTitle: 'O tsofatsɛ lɛ ebɔi nɔ nɛɛ saamɔ',
    warnBody: 'Obaanyɛ okpa yaka kɛyashi beni ajɛ jɛmɛ.',
    getBack: 'NƆ NI OBAANA EKOŊŊ',
    totalRefund: 'Shika ni aaku fɛɛ',
    refundsReturn:
      'Shika ni aaku lɛ baaya {method} nɔ kɛtsɔ Paystack nɔ. Anyɛŋ akɛya kaad loo akɔŋt kroko nɔ.',
    why: 'MƐNI HEWƆ OKPAA?',
    cancelThis: 'Kpa nɔ nɛɛ',
    keep: 'Ha mi nɔ lɛ ahi jɛmɛ',
  },
  ee: {
    notFoundTitle: 'Míekpɔ nuƒeƒle la o',
    notFoundBody: 'Míekpɔ nuƒeƒle ma le fon sia dzi o.',
    seeAll: 'Kpɔ nu siwo nèƒle katã',
    medicines: 'Atikewo kple nuwo',
    refundedBy: '{pharmacy} ye agbugbɔe ana wò',
    deliveryFee: 'Nukɔkɔyi ƒe fe',
    notRefunded: 'Womagbugbɔe o — nukɔla la dzo xoxo',
    refundedNotYet: 'Woagbugbɔe — nukɔla la medzo haɖe o',
    serviceFee: 'Altruist ƒe dɔwɔwɔ fe',
    refundedFull: 'Woagbugbɔ blibo',
    title: 'Tutu nuƒeƒle',
    stripOne: '{pharmacy} · nu {count}',
    stripMany: '{pharmacy} · nu {count}',
    warnTitle: 'Wò atikewɔla de asi nuƒeƒle sia dzadzraɖo me',
    warnBody: 'Àte ŋu atutui faa va se ɖe esime woaɖoe ɖa.',
    getBack: 'NU SI AGBÕ VA WÒ',
    totalRefund: 'Ga si agbɔ katã',
    refundsReturn:
      'Ga si agbɔ la ayi {method} dzi to Paystack dzi. Womate ŋu aɖoe ɖe kaad alo akɔnta bubu dzi o.',
    why: 'NUKA ŊUTI NÈLE ETUTUM ƉO?',
    cancelThis: 'Tutu nuƒeƒle sia',
    keep: 'Na nye nuƒeƒle nanɔ anyi',
  },
  ha: {
    notFoundTitle: 'Ba a sami oda ba',
    notFoundBody: 'Ba mu sami wannan oda a wannan na’ura ba.',
    seeAll: 'Duba duk oda',
    medicines: 'Magunguna da kaya',
    refundedBy: '{pharmacy} ne zai mayar',
    deliveryFee: 'Kuɗin isarwa',
    notRefunded: 'Ba za a mayar ba — mai kawowa ya riga ya tashi',
    refundedNotYet: 'Za a mayar — ba a tura ba tukuna',
    serviceFee: 'Kuɗin sabis na Altruist',
    refundedFull: 'Za a mayar duka',
    title: 'Soke oda',
    stripOne: '{pharmacy} · kaya {count}',
    stripMany: '{pharmacy} · kaya {count}',
    warnTitle: 'Mai harhaɗa maganinka ya fara shirya wannan oda',
    warnBody: 'Za ka iya soke kyauta har sai an tura ta.',
    getBack: 'ABIN DA ZA A MAYAR MAKA',
    totalRefund: 'Jimlar kuɗin da za a mayar',
    refundsReturn:
      'Ana mayar da kuɗi zuwa {method} ta Paystack. Ba za a iya tura su zuwa wani kati ko asusu ba.',
    why: 'ME YA SA KAKE SOKEWA?',
    cancelThis: 'Soke wannan oda',
    keep: 'Ci gaba da odata',
  },
});


export default function CancelOrder() {
  const tr = useT(S);
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
        title={tr('notFoundTitle')}
        body={tr('notFoundBody')}
        actions={
          <Button label={tr('seeAll')} size="large" onPress={() => router.replace('/order-history')} />
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
    [tr('medicines'), tr('refundedBy', { pharmacy: order.pharmacy }), cedis(order.subtotal)],
    [
      tr('deliveryFee'),
      dispatched ? tr('notRefunded') : tr('refundedNotYet'),
      cedis(dispatched ? 0 : order.deliveryFee),
    ],
    [tr('serviceFee'), tr('refundedFull'), cedis(order.serviceFee)],
  ];
  const refund = order.subtotal + (dispatched ? 0 : order.deliveryFee) + order.serviceFee;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      <FormScreen gap={16}>
        <TitleAppBar title={tr('title')} />

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
              {tr(units === 1 ? 'stripOne' : 'stripMany', { pharmacy: order.pharmacy, count: units })}
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
              {tr('warnTitle')}
            </Text>
            <Text variant="bodyS" tone="secondary" style={{ fontSize: d(13), lineHeight: d(19) }}>
              {tr('warnBody')}
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
          <SectionLabel>{tr('getBack')}</SectionLabel>

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
              {tr('totalRefund')}
            </Text>
            <Text variant="numericM" tone="brand" style={{ fontSize: d(20), lineHeight: d(26) }}>
              {cedis(refund)}
            </Text>
          </View>

          <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
            {tr('refundsReturn', { method: order.methodLabel })}
          </Text>
        </View>

        <SectionLabel>{tr('why')}</SectionLabel>

        {REASONS.map((r) => {
          const selected = reason === r;
          return (
            <Pressable
              key={r}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={formLabel(r)}
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
                {formLabel(r)}
              </Text>
            </Pressable>
          );
        })}
      </FormScreen>

      <StickyFooter>
        <Button
          label={tr('cancelThis')}
          variant="danger"
          size="large"
          onPress={() => {
            setStatus(order.id, 'CANCELLED');
            router.replace(`/cancellation-confirmed?id=${order.id}`);
          }}
        />
        <Button
          label={tr('keep')}
          variant="tertiary"
          size="large"
          onPress={() => router.back()}
        />
      </StickyFooter>
    </View>
  );
}
