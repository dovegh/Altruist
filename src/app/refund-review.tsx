/**
 * Refund Review — ported 1:1 from Figma node 103:171.
 *
 * Scroll content: V gap16, pad 64/24/150/24. A summary card, a mint estimated-
 * refund breakdown, the "pharmacy decides" note, and the acknowledgement.
 * Footer: Submit (disabled until acknowledged) with the reason underneath.
 *
 * "Estimated" and "if approved" are load-bearing words. Altruist moves the
 * money but does not make the decision — the pharmacy does — and a screen that
 * showed a firm figure would be promising an outcome the platform cannot grant.
 */
import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen, StickyFooter } from '@/components/ui/FormScreen';
import { TitleAppBar } from '@/components/ui/AppBar';
import { SectionLabel } from '@/components/ui/Checkout';
import { Checkbox } from '@/components/ui/Form';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { cedis } from '@/lib/money';
import { useOrderStore } from '@/features/orders/store';
import { usePartnerPharmacy } from '@/features/profile/store';
import { defineStrings, useT } from '@/i18n';
import { formLabel } from '@/lib/formLabels';

const S = defineStrings({
  en: {
    returning: 'Returning',
    itemsOne: '{count} item',
    itemsMany: '{count} items',
    reason: 'Reason',
    notGiven: 'Not given',
    evidence: 'Evidence',
    photosAttached: '2 photos attached',
    order: 'Order',
    pharmacy: 'Pharmacy',
    returnedItems: 'Returned items',
    refundedByPharmacy: 'Refunded by the pharmacy',
    deliveryFee: 'Delivery fee',
    notRefundedDelivered: 'Not refunded — order was delivered',
    serviceFee: 'Altruist service fee',
    refundedProp: 'Refunded proportionally',
    title: 'Review request',
    ifApproved: 'IF APPROVED',
    estimated: 'Estimated refund',
    decidesTitle: 'The pharmacy decides, not Altruist',
    decidesBody:
      'Altruist passes this request to {pharmacy} and handles the money movement. The pharmacist reviews it and may approve it in full, in part, or decline it with a reason. You usually hear back within 2 business days.',
    confirm:
      'I confirm the items are unused and in their original sealed packaging, and I understand the pharmacy may decline this request.',
    submit: 'Submit request',
    repliesIn: 'The pharmacy usually replies within 2 business days.',
    tick: 'Tick the box above to submit.',
  },
  fr: {
    returning: 'Retour',
    itemsOne: '{count} article',
    itemsMany: '{count} articles',
    reason: 'Motif',
    notGiven: 'Non précisé',
    evidence: 'Preuves',
    photosAttached: '2 photos jointes',
    order: 'Commande',
    pharmacy: 'Pharmacie',
    returnedItems: 'Articles retournés',
    refundedByPharmacy: 'Remboursés par la pharmacie',
    deliveryFee: 'Frais de livraison',
    notRefundedDelivered: 'Non remboursés — la commande a été livrée',
    serviceFee: 'Frais de service Altruist',
    refundedProp: 'Remboursés au prorata',
    title: 'Vérifier la demande',
    ifApproved: 'SI ELLE EST ACCEPTÉE',
    estimated: 'Remboursement estimé',
    decidesTitle: 'C’est la pharmacie qui décide, pas Altruist',
    decidesBody:
      'Altruist transmet cette demande à {pharmacy} et gère le mouvement d’argent. Le pharmacien l’examine et peut l’accepter en totalité, en partie, ou la refuser en donnant un motif. Vous recevez généralement une réponse sous 2 jours ouvrés.',
    confirm:
      'Je confirme que les articles sont inutilisés et dans leur emballage d’origine scellé, et je comprends que la pharmacie peut refuser cette demande.',
    submit: 'Envoyer la demande',
    repliesIn: 'La pharmacie répond généralement sous 2 jours ouvrés.',
    tick: 'Cochez la case ci-dessus pour envoyer.',
  },
  tw: {
    returning: 'Deɛ wode resan',
    itemsOne: 'Adeɛ {count}',
    itemsMany: 'Nneɛma {count}',
    reason: 'Nea ɛma',
    notGiven: 'Wɔnkaeɛ',
    evidence: 'Adanseɛ',
    photosAttached: 'Mfonini 2 ka ho',
    order: 'Adetɔ',
    pharmacy: 'Nnuro fie',
    returnedItems: 'Nneɛma a wode resan',
    refundedByPharmacy: 'Nnuro fie no na ɛsan de ma',
    deliveryFee: 'De brɛ wo ho ka',
    notRefundedDelivered: 'Wɔnsan mma — wɔde adetɔ no abrɛ wo dada',
    serviceFee: 'Altruist adwuma ho ka',
    refundedProp: 'Wɔsan de ne fa ma',
    title: 'Hwɛ w’abisadeɛ',
    ifApproved: 'SƐ WƆPENE SO A',
    estimated: 'Sika a ebia ɛbɛsan aba',
    decidesTitle: 'Nnuro fie no na ɛsi gyinaeɛ, ɛnyɛ Altruist',
    decidesBody:
      'Altruist de saa abisadeɛ yi kɔma {pharmacy} na ɔhwɛ sika no ho nsɛm. Nnuroyɛfoɔ no bɛhwɛ mu na ebia ɔbɛpene ne nyinaa so, ne fa so, anaa ɔbɛpo na waka deɛ ɛma. Mpɛn pii no, wobɛnya mmuaeɛ wɔ nnwumadi nna 2 mu.',
    confirm:
      'Mepene so sɛ wɔmfaa nneɛma no nnii dwuma na ɛda wɔn kotoku a wɔmmuee mu, na mete aseɛ sɛ nnuro fie no bɛtumi apo saa abisadeɛ yi.',
    submit: 'Fa abisadeɛ no kɔ',
    repliesIn: 'Mpɛn pii no, nnuro fie no mua wɔ nnwumadi nna 2 mu.',
    tick: 'Hyɛ adaka a ɛwɔ soro no nsɛnkyerɛnne na fa kɔ.',
  },
  gaa: {
    returning: 'Nɔ ni okuɔ',
    itemsOne: 'Nɔ {count}',
    itemsMany: 'Nibii {count}',
    reason: 'Nɔ hewɔ',
    notGiven: 'Akɛɛɛ',
    evidence: 'Odasefeemɔ',
    photosAttached: 'Mfonirii 2 fata he',
    order: 'Nɔ ni ohe',
    pharmacy: 'Tsofa shĩa',
    returnedItems: 'Nibii ni okuɔ',
    refundedByPharmacy: 'Tsofa shĩa lɛ kuɔ ehaa',
    deliveryFee: 'Kɛbamɔ he nyɔmɔ',
    notRefundedDelivered: 'Akuuu aha — akɛ nɔ lɛ eba momo',
    serviceFee: 'Altruist nitsumɔ he nyɔmɔ',
    refundedProp: 'Akuɔ ehe fã ahaa',
    title: 'Kwɛmɔ o nibimɔ',
    ifApproved: 'KƐJI AKPƐLƐ NƆ',
    estimated: 'Shika ni ekolɛ aaku',
    decidesTitle: 'Tsofa shĩa lɛ kpɛɔ yiŋ, jeee Altruist',
    decidesBody:
      'Altruist kɛ nibimɔ nɛɛ yaa {pharmacy} ni ekwɛɔ shika lɛ he saji anɔ. Tsofatsɛ lɛ baakwɛ ni ekolɛ ebaakpɛlɛ fɛɛ nɔ, efã nɔ, loo ebaakpoo ni ekɛɛ nɔ hewɔ. Be babaoo lɛ, obaana hetoo yɛ nitsumɔ gbii 2 mli.',
    confirm:
      'Mikpɛlɛɔ nɔ akɛ atsuuu nibii lɛ anɔ nii ni amɛyɔɔ amɛ adeka ni agbeleee lɛ mli, ni minuɔ shishi akɛ tsofa shĩa lɛ baanyɛ akpoo nibimɔ nɛɛ.',
    submit: 'Kɛ nibimɔ lɛ ya',
    repliesIn: 'Be babaoo lɛ, tsofa shĩa lɛ haa hetoo yɛ nitsumɔ gbii 2 mli.',
    tick: 'Ŋma okadi yɛ adeka ni yɔɔ ŋwɛi lɛ mli ni okɛya.',
  },
  ee: {
    returning: 'Nu siwo nèle trɔtrɔm',
    itemsOne: 'Nu {count}',
    itemsMany: 'Nu {count}',
    reason: 'Susu',
    notGiven: 'Megblɔe o',
    evidence: 'Kpeɖodzi',
    photosAttached: 'Foto 2 kpe ɖe eŋu',
    order: 'Nuƒeƒle',
    pharmacy: 'Atikeƒle',
    returnedItems: 'Nu siwo nètrɔ',
    refundedByPharmacy: 'Atikeƒle la ye agbugbɔe',
    deliveryFee: 'Nukɔkɔyi ƒe fe',
    notRefundedDelivered: 'Womagbugbɔe o — wokɔ nuƒeƒle la vɛ xoxo',
    serviceFee: 'Altruist ƒe dɔwɔwɔ fe',
    refundedProp: 'Woagbugbɔ eƒe akpa aɖe',
    title: 'Kpɔ wò biabia',
    ifApproved: 'NE WOLƆ̃ ƉE EDZI',
    estimated: 'Ga si ɖewohĩ agbɔ',
    decidesTitle: 'Atikeƒle la ye tsoa nya me, menye Altruist o',
    decidesBody:
      'Altruist tsɔa biabia sia naa {pharmacy} eye wòkpɔa ga ƒe ʋuʋu dzi. Atikewɔla la akpɔe eye ɖewohĩ alɔ̃ ɖe edzi blibo, akpa aɖe, alo agbee kple susu. Zi geɖe la, àxɔ ŋuɖoɖo le dɔwɔŋkeke 2 me.',
    confirm:
      'Meɖo kpe edzi be womezã nuawo o eye wole woƒe agba gbãtɔ si womeʋu o me, eye mese egɔme be atikeƒle la ate ŋu agbe biabia sia.',
    submit: 'Ɖo biabia la ɖa',
    repliesIn: 'Zi geɖe la, atikeƒle la ɖoa eŋu le dɔwɔŋkeke 2 me.',
    tick: 'De dzesi aɖaka si le etame la me nàɖoe ɖa.',
  },
  ha: {
    returning: 'Abin da ake mayarwa',
    itemsOne: 'Kaya {count}',
    itemsMany: 'Kaya {count}',
    reason: 'Dalili',
    notGiven: 'Ba a bayar ba',
    evidence: 'Shaida',
    photosAttached: 'An haɗa hotuna 2',
    order: 'Oda',
    pharmacy: 'Kantin magani',
    returnedItems: 'Kayan da aka mayar',
    refundedByPharmacy: 'Kantin magani ne zai mayar',
    deliveryFee: 'Kuɗin isarwa',
    notRefundedDelivered: 'Ba za a mayar ba — an riga an kawo oda',
    serviceFee: 'Kuɗin sabis na Altruist',
    refundedProp: 'Za a mayar daidai gwargwado',
    title: 'Duba buƙata',
    ifApproved: 'IDAN AN AMINCE',
    estimated: 'Kiyasin kuɗin da za a mayar',
    decidesTitle: 'Kantin magani ne ke yanke hukunci, ba Altruist ba',
    decidesBody:
      'Altruist yana miƙa wannan buƙata ga {pharmacy} kuma yana kula da motsin kuɗi. Mai harhaɗa magani zai duba ta kuma zai iya amincewa gaba ɗaya, wani ɓangare, ko ya ƙi tare da dalili. Yawanci za ka ji amsa cikin kwanakin aiki 2.',
    confirm:
      'Na tabbatar ba a yi amfani da kayan ba kuma suna cikin ainihin kunshinsu da ba a buɗe ba, kuma na fahimci kantin magani na iya ƙin wannan buƙata.',
    submit: 'Aika buƙata',
    repliesIn: 'Yawanci kantin magani yana amsawa cikin kwanakin aiki 2.',
    tick: 'Yi alama a akwatin da ke sama don aikawa.',
  },
});

export default function RefundReview() {
  const tr = useT(S);
  const pharmacy = usePartnerPharmacy();
  const t = useTokens();
  const { d } = useDesignScale();
  const [acknowledged, setAcknowledged] = useState(false);
  const params = useLocalSearchParams<{
    id?: string;
    amount?: string;
    items?: string;
    reason?: string;
  }>();

  const order = useOrderStore((s) => s.items.find((o) => o.id === (params.id ?? s.lastOrderId)));
  const goods = Number(params.amount ?? 0);
  const itemCount = Number(params.items ?? 0);

  /**
   * The service fee is refunded in proportion to the goods being returned — a
   * partial return does not earn a full fee refund, and refunding the whole fee
   * on a one-item return is a real cost leak, not a rounding detail.
   */
  const feeShare =
    order && order.subtotal > 0
      ? Math.round((goods / order.subtotal) * order.serviceFee)
      : 0;
  const refund = goods + feeShare;

  const summary: [string, string][] = [
    [tr('returning'), tr(itemCount === 1 ? 'itemsOne' : 'itemsMany', { count: itemCount })],
    [tr('reason'), params.reason ? formLabel(params.reason) : tr('notGiven')],
    [tr('evidence'), tr('photosAttached')],
    [tr('order'), order ? `TrxID ${order.id}` : '—'],
    [tr('pharmacy'), order?.pharmacy ?? '—'],
  ];

  const breakdown: [string, string, string][] = [
    [tr('returnedItems'), tr('refundedByPharmacy'), cedis(goods)],
    [tr('deliveryFee'), tr('notRefundedDelivered'), cedis(0)],
    [tr('serviceFee'), tr('refundedProp'), cedis(feeShare)],
  ];

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      <FormScreen gap={16}>
        <TitleAppBar title={tr('title')} />

        {/* Summary */}
        <View
          style={{
            gap: d(14),
            paddingVertical: d(16),
            paddingHorizontal: d(18),
            borderRadius: d(24),
            backgroundColor: t.colors.bg.surface,
          }}
        >
          {summary.map(([label, value]) => (
            <View key={label} style={{ flexDirection: 'row', gap: d(12) }}>
              <Text
                variant="bodyM"
                tone="tertiary"
                style={{ flex: 1, fontSize: d(14), lineHeight: d(21) }}
              >
                {label}
              </Text>
              <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
                {value}
              </Text>
            </View>
          ))}
        </View>

        {/* Estimated refund — mint tint */}
        <View
          style={{
            gap: d(12),
            paddingVertical: d(16),
            paddingHorizontal: d(18),
            borderRadius: d(24),
            backgroundColor: t.colors.bg.brandSubtle,
          }}
        >
          <SectionLabel>{tr('ifApproved')}</SectionLabel>

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
              {tr('estimated')}
            </Text>
            <Text variant="numericM" tone="brand" style={{ fontSize: d(20), lineHeight: d(26) }}>
              {cedis(refund)}
            </Text>
          </View>
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
              {tr('decidesTitle')}
            </Text>
            <Text variant="bodyS" tone="secondary" style={{ fontSize: d(13), lineHeight: d(19) }}>
              {tr('decidesBody', { pharmacy: pharmacy.name })}
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: acknowledged }}
          accessibilityLabel={tr('confirm')}
          onPress={() => setAcknowledged((v) => !v)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            gap: d(12),
            paddingVertical: d(14),
            paddingHorizontal: d(16),
            borderRadius: d(20),
            backgroundColor: t.colors.bg.surface,
            borderWidth: 1,
            borderColor: t.colors.border.default,
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <Checkbox checked={acknowledged} />
          <Text variant="bodyS" style={{ flex: 1, fontSize: d(13), lineHeight: d(19) }}>
            {tr('confirm')}
          </Text>
        </Pressable>
      </FormScreen>

      <StickyFooter>
        <Button
          label={tr('submit')}
          size="large"
          disabled={!acknowledged}
          onPress={() =>
            router.replace(`/refund-status?id=${order?.id ?? ''}&amount=${refund}`)
          }
        />
        <Text variant="caption" tone="tertiary" center style={{ fontSize: d(12), lineHeight: d(16) }}>
          {acknowledged ? tr('repliesIn') : tr('tick')}
        </Text>
      </StickyFooter>
    </View>
  );
}
