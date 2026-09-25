/**
 * Checkout — Delivery — ported 1:1 from Figma node 77:279.
 *
 * Scroll content: V gap16, pad 64/24/140/24. Steps → DELIVER TO (two address
 * options + a tertiary "different address") → DELIVERY OPTION (three speeds) →
 * PRESCRIPTION (verification state). Footer pins Total + Continue.
 *
 * The prescription panel stays on the screen rather than disappearing once it
 * is satisfied: the user is about to pay, and "which prescription is this order
 * dispensing against" is exactly the question they should be able to answer at
 * that moment. It is mint when a verified script covers the order, and it names
 * the actual TrxID — an order that is dispensed against a specific script has
 * to say which one.
 *
 * The selections live in the checkout store rather than in `useState`, because
 * the two screens after this one have to charge and describe what was chosen
 * here. The total is the live cart's, at the chosen delivery speed.
 */
import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen, StickyFooter } from '@/components/ui/FormScreen';
import { TitleAppBar } from '@/components/ui/AppBar';
import { CheckoutSteps, OptionCard, SectionLabel } from '@/components/ui/Checkout';
import { StatusPill } from '@/components/ui/PrescriptionCard';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { cedis } from '@/lib/money';
import { useCart } from '@/features/cart/useCart';
import { SPEEDS, useAddresses, useCheckoutStore, useCheckoutSelection } from '@/features/checkout/store';
import { usePartnerPharmacy } from '@/features/profile/store';
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    title: 'Checkout',
    deliverTo: 'DELIVER TO',
    otherAddress: 'Use a different address',
    deliveryOption: 'DELIVERY OPTION',
    prescription: 'PRESCRIPTION',
    verified: 'Prescription verified',
    verifiedMeta: 'TrxID {ids} · approved by {name}',
    total: 'Total',
    continue: 'Continue',
  },
  fr: {
    title: 'Paiement',
    deliverTo: 'LIVRER À',
    otherAddress: 'Utiliser une autre adresse',
    deliveryOption: 'MODE DE LIVRAISON',
    prescription: 'ORDONNANCE',
    verified: 'Ordonnance vérifiée',
    verifiedMeta: 'TrxID {ids} · approuvée par {name}',
    total: 'Total',
    continue: 'Continuer',
  },
  tw: {
    title: 'Tua ka',
    deliverTo: 'DE KƆ',
    otherAddress: 'Fa address foforɔ',
    deliveryOption: 'SƐNEA WƆDE BƐBA',
    prescription: 'NNURO KRATAA',
    verified: 'Wɔahwɛ nnuro krataa no',
    verifiedMeta: 'TrxID {ids} · {name} na wapene so',
    total: 'Ne nyinaa',
    continue: 'Toa so',
  },
  gaa: {
    title: 'Wo nyɔmɔ',
    deliverTo: 'KƐYA',
    otherAddress: 'Kɛ address kroko tsu nii',
    deliveryOption: 'BƆ NI AKƐBAA',
    prescription: 'TSOFA WOLO',
    verified: 'Akwɛ tsofa wolo lɛ',
    verifiedMeta: 'TrxID {ids} · {name} kpɛlɛ nɔ',
    total: 'Fɛɛ',
    continue: 'Ya nɔ',
  },
  ee: {
    title: 'Xe fe',
    deliverTo: 'KƆE YI',
    otherAddress: 'Zã adrɛs bubu',
    deliveryOption: 'ALESI WOAKƆE VƐ',
    prescription: 'ATIKE ŊƆŊLƆ',
    verified: 'Wokpɔ atike ŋɔŋlɔ la',
    verifiedMeta: 'TrxID {ids} · {name} ye lɔ̃ ɖe edzi',
    total: 'Katã',
    continue: 'Yi edzi',
  },
  ha: {
    title: 'Biya',
    deliverTo: 'KAI ZUWA',
    otherAddress: 'Yi amfani da wani adireshi',
    deliveryOption: 'HANYAR ISARWA',
    prescription: 'TAKARDAR MAGANI',
    verified: 'An tabbatar da takardar magani',
    verifiedMeta: 'TrxID {ids} · {name} ya amince',
    total: 'Jimla',
    continue: 'Ci gaba',
  },
});

export default function CheckoutDelivery() {
  const tr = useT(S);
  const pharmacy = usePartnerPharmacy();
  const t = useTokens();
  const { d } = useDesignScale();

  const ADDRESSES = useAddresses();
  const addressId = useCheckoutStore((s) => s.addressId);
  const speedId = useCheckoutStore((s) => s.speedId);
  const setAddress = useCheckoutStore((s) => s.setAddress);
  const setSpeed = useCheckoutStore((s) => s.setSpeed);
  const { address, speed } = useCheckoutSelection();

  /**
   * What is actually ticked.
   *
   * The draft starts empty and means "use the wallet default", so comparing
   * the raw draft id left every radio blank on first entry — the order had an
   * address but the screen showed none chosen.
   */
  const selectedAddressId = addressId || address?.id;

  const { total, hasPrescriptionItem, prescriptionIds, canCheckout } = useCart(speed.fee);

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      <FormScreen gap={16}>
        <TitleAppBar title={tr('title')} />
        <CheckoutSteps step={1} />

        <SectionLabel>{tr('deliverTo')}</SectionLabel>
        {ADDRESSES.map((a) => (
          <OptionCard
            key={a.id}
            {...a}
            selected={selectedAddressId === a.id}
            tint={selectedAddressId === a.id ? 'brand' : 'raised'}
            onPress={() => setAddress(a.id)}
          />
        ))}
        <Button
          label={tr('otherAddress')}
          variant="tertiary"
          size="medium"
          iconLeading="add"
          onPress={() => router.push('/addresses')}
        />

        <SectionLabel>{tr('deliveryOption')}</SectionLabel>
        {SPEEDS.map((s) => (
          <OptionCard
            key={s.id}
            {...s}
            selected={speedId === s.id}
            tint={speedId === s.id ? 'brand' : 'raised'}
            onPress={() => setSpeed(s.id)}
          />
        ))}

        {hasPrescriptionItem ? (
          <>
            <SectionLabel>{tr('prescription')}</SectionLabel>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: d(12),
                paddingVertical: d(14),
                paddingHorizontal: d(16),
                borderRadius: d(20),
                backgroundColor: t.colors.bg.successSubtle,
              }}
            >
              <Icon name="shield-check" size={d(20)} tone="brand" />
              <View style={{ flex: 1, gap: d(3) }}>
                <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
                  {tr('verified')}
                </Text>
                <Text variant="caption" tone="secondary" style={{ fontSize: d(12), lineHeight: d(16) }}>
                  {tr('verifiedMeta', {
                    ids: prescriptionIds.join(', '),
                    name: pharmacy.superintendent.short,
                  })}
                </Text>
              </View>
              <StatusPill status="VERIFIED" />
            </View>
          </>
        ) : null}
      </FormScreen>

      <StickyFooter>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(14) }}>
          <View style={{ gap: d(1) }}>
            <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
              {tr('total')}
            </Text>
            <Text variant="numericL" style={{ fontSize: d(28), lineHeight: d(32) }}>
              {cedis(total)}
            </Text>
          </View>
          <Button
            label={tr('continue')}
            size="large"
            iconTrailing="arrow-right"
            style={{ flex: 1 }}
            // The gate is re-checked here, not just on the Cart. Reaching this
            // screen with a blocked line means something changed underneath —
            // a script rejected while the user was choosing an address.
            disabled={!canCheckout}
            onPress={() => router.push('/checkout-payment')}
          />
        </View>
      </StickyFooter>
    </View>
  );
}
