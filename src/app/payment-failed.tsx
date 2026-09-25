/**
 * Failed — Payment — ported 1:1 from Figma node on page "System States".
 *
 * V gap22, pad 150/24/40/24. A 160/116 coral halo, the head, a coral detail
 * card carrying the gateway reason and reference, then Try again / different
 * method.
 *
 * "Nothing was taken and your cart is untouched" is the first thing after the
 * headline for a reason: the user's immediate fear is a silent charge. The
 * Paystack reference is on screen so a support conversation can start with a
 * fact rather than a search.
 */
import React from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { StatusScreen } from '@/components/ui/StatusScreen';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    title: 'Payment failed',
    body: 'Your bank declined the charge. Nothing was taken and your cart is untouched.',
    tryAgain: 'Try again',
    otherMethod: 'Use a different method',
    declined: 'declined by your bank',
    reference: 'Reference {reference} — quote this if you contact support.',
    untouched: 'Your cart is untouched. Try again, or pay with another method.',
  },
  fr: {
    title: 'Échec du paiement',
    body: "Votre banque a refusé le paiement. Aucun montant n'a été prélevé et votre panier est intact.",
    tryAgain: 'Réessayer',
    otherMethod: 'Utiliser un autre moyen',
    declined: 'refusé par votre banque',
    reference: 'Référence {reference} — indiquez-la si vous contactez le support.',
    untouched: 'Votre panier est intact. Réessayez ou payez avec un autre moyen.',
  },
  tw: {
    title: 'Sika tua no anyɛ yie',
    body: 'Wo sikakorabea ampene so. Wɔannye hwee na wo kɛntɛn no da hɔ sɛdeɛ ɛteɛ.',
    tryAgain: 'San bɔ mmɔden',
    otherMethod: 'Fa ɛkwan foforɔ',
    declined: 'wo sikakorabea ampene so',
    reference: 'Reference {reference} — ka yei kyerɛ support sɛ wofrɛ wɔn a.',
    untouched: 'Wo kɛntɛn no da hɔ sɛdeɛ ɛteɛ. San bɔ mmɔden, anaa fa ɛkwan foforɔ tua.',
  },
  gaa: {
    title: 'Nyɔmɔwoo lɛ enyɛɛɛ',
    body: 'O shika tohe lɛ kpɛlɛɛɛ. Ahaaa nɔ ko ni o kɛntɛŋ lɛ yɛ bɔ ni eyɔɔ.',
    tryAgain: 'Ka ekoŋŋ',
    otherMethod: 'Kɛ gbɛ kroko tsu nii',
    declined: 'o shika tohe lɛ kpɛlɛɛɛ',
    reference: 'Reference {reference} — kɛji otsɛ support lɛ, kɛɛ amɛ enɛ.',
    untouched: 'O kɛntɛŋ lɛ yɛ bɔ ni eyɔɔ. Ka ekoŋŋ, loo kɛ gbɛ kroko wo.',
  },
  ee: {
    title: 'Fexexe la gbe',
    body: 'Wò gadzraɖoƒe gbe fexexe la. Womexɔ naneke o eye wò kusi li abe ale si wònɔ ene.',
    tryAgain: 'Gate kpɔ',
    otherMethod: 'Zã mɔ bubu',
    declined: 'wò gadzraɖoƒe gbee',
    reference: 'Reference {reference} — gblɔe ne èyɔ support.',
    untouched: 'Wò kusi li abe ale si wònɔ ene. Gate kpɔ, alo zã mɔ bubu nàxe fe.',
  },
  ha: {
    title: 'Biyan kuɗi ya gaza',
    body: 'Bankinka ya ƙi biyan. Ba a cire komai ba kuma kwandonka yana nan yadda yake.',
    tryAgain: 'Sake gwadawa',
    otherMethod: 'Yi amfani da wata hanya',
    declined: 'bankinka ya ƙi',
    reference: 'Lambar shaida {reference} — faɗi wannan idan ka tuntuɓi tallafi.',
    untouched: 'Kwandonka yana nan yadda yake. Sake gwadawa, ko ka biya da wata hanya.',
  },
});

export default function PaymentFailed() {
  const tr = useT(S);
  const t = useTokens();
  const { d } = useDesignScale();
  const { reason, reference } = useLocalSearchParams<{ reason?: string; reference?: string }>();

  return (
    <StatusScreen
      icon="danger"
      tone="danger"
      title={tr('title')}
      body={tr('body')}
      actions={
        <>
          <Button
            label={tr('tryAgain')}
            size="large"
            onPress={() => router.replace('/checkout-payment')}
          />
          <Button
            label={tr('otherMethod')}
            variant="secondary"
            size="large"
            onPress={() => router.replace('/checkout-payment')}
          />
        </>
      }
    >
      <View
        style={{
          gap: d(4),
          paddingVertical: d(14),
          paddingHorizontal: d(18),
          borderRadius: d(20),
          backgroundColor: t.colors.bg.dangerSubtle,
        }}
      >
        <Text variant="labelS" tone="danger" style={{ fontSize: d(12), lineHeight: d(16) }}>
          {/* The gateway's own wording. Paraphrasing "do not honour" into
              "insufficient funds" sends people to check a balance that is fine. */}
          Paystack · {reason ?? tr('declined')}
        </Text>
        {reference ? (
          <Text variant="caption" tone="secondary" style={{ fontSize: d(12), lineHeight: d(16) }}>
            {tr('reference', { reference })}
          </Text>
        ) : (
          <Text variant="caption" tone="secondary" style={{ fontSize: d(12), lineHeight: d(16) }}>
            {tr('untouched')}
          </Text>
        )}
      </View>
    </StatusScreen>
  );
}
