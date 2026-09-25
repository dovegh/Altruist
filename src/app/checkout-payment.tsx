/**
 * Checkout — Payment — ported 1:1 from Figma node 78:312.
 *
 * Scroll content: V gap16, pad 64/24/140/24. Steps (1 complete) → PAY WITH →
 * "Add a new card" → PROMO CODE → ORDER SUMMARY (r24, pad 18/20) → Paystack
 * security note. Footer pins a single "Pay ₵186".
 *
 * Mobile Money leads the list because it leads the market in Ghana — cards are
 * the fallback here, not the default. "Pay on delivery" is disabled whenever the
 * order contains a prescription item: the pharmacist cannot dispense against an
 * unpaid Rx order, so offering it and failing later would be worse than not
 * offering it. That is now derived from the actual cart rather than pinned to a
 * constant, so an all-OTC basket gets the option it is entitled to.
 *
 * Every figure on this screen is the live cart's. The summary line counts real
 * items and the delivery row names the speed chosen on the previous screen.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen, StickyFooter } from '@/components/ui/FormScreen';
import { TitleAppBar } from '@/components/ui/AppBar';
import { CheckoutSteps, OptionCard, SectionLabel } from '@/components/ui/Checkout';
import { InputField } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { cedis } from '@/lib/money';
import { useCart } from '@/features/cart/useCart';
import { useCheckoutMethods, useCheckoutStore, useCheckoutSelection } from '@/features/checkout/store';
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    title: 'Checkout',
    payWith: 'PAY WITH',
    cod: 'Pay on delivery',
    codRx: 'Not available for prescription items',
    codCash: 'Pay the rider in cash',
    codMeta: 'Rx orders must be paid before the pharmacist dispenses',
    addCard: 'Add a new card',
    promo: 'PROMO CODE',
    promoPlaceholder: 'Enter a code',
    apply: 'Apply',
    promoRejected: 'That code is not valid or has expired.',
    summary: 'ORDER SUMMARY',
    subtotalOne: 'Subtotal · {count} item',
    subtotalMany: 'Subtotal · {count} items',
    deliveryRow: 'Delivery · {speed}',
    serviceFee: 'Service fee',
    total: 'Total',
    paystackTitle: 'Processed by Paystack',
    paystackBody:
      'Mobile Money and cards are both handled by Paystack. Altruist never sees your wallet PIN or card number.',
    pay: 'Pay {amount}',
  },
  fr: {
    title: 'Paiement',
    payWith: 'PAYER AVEC',
    cod: 'Paiement à la livraison',
    codRx: 'Non disponible pour les articles sur ordonnance',
    codCash: 'Payez le livreur en espèces',
    codMeta: 'Les commandes sur ordonnance doivent être payées avant que le pharmacien ne les délivre',
    addCard: 'Ajouter une carte',
    promo: 'CODE PROMO',
    promoPlaceholder: 'Saisissez un code',
    apply: 'Appliquer',
    promoRejected: "Ce code n'est pas valide ou a expiré.",
    summary: 'RÉCAPITULATIF',
    subtotalOne: 'Sous-total · {count} article',
    subtotalMany: 'Sous-total · {count} articles',
    deliveryRow: 'Livraison · {speed}',
    serviceFee: 'Frais de service',
    total: 'Total',
    paystackTitle: 'Traité par Paystack',
    paystackBody:
      'Le Mobile Money et les cartes sont gérés par Paystack. Altruist ne voit jamais le PIN de votre portefeuille ni votre numéro de carte.',
    pay: 'Payer {amount}',
  },
  tw: {
    title: 'Tua ka',
    payWith: 'FA TUA',
    cod: 'Tua bere a wɔde aba',
    codRx: 'Ɛnyɛ nnuro a ɛhia krataa',
    codCash: 'Tua sika kɔ ma ɔkafoɔ no',
    codMeta: 'Ɛsɛ sɛ wotua Rx nneɛma ka ansa na nnuroyɛfoɔ no de ama',
    addCard: 'Fa kaad foforɔ ka ho',
    promo: 'PROMO KOODU',
    promoPlaceholder: 'Hyɛ koodu bi',
    apply: 'Fa di dwuma',
    promoRejected: 'Saa koodu no nyɛ papa anaa ne berɛ atwam.',
    summary: 'NNEƐMA A WOATO',
    subtotalOne: 'Nneɛma no bo · adeɛ {count}',
    subtotalMany: 'Nneɛma no bo · nneɛma {count}',
    deliveryRow: 'De brɛ wo · {speed}',
    serviceFee: 'Adwuma ho ka',
    total: 'Ne nyinaa',
    paystackTitle: 'Paystack na ɛyɛ',
    paystackBody:
      'Paystack na ɛhwɛ Mobile Money ne kaad nyinaa so. Altruist nhunu wo PIN anaa wo kaad nɔma da.',
    pay: 'Tua {amount}',
  },
  gaa: {
    title: 'Wo nyɔmɔ',
    payWith: 'KƐ WO',
    cod: 'Wo beni akɛba',
    codRx: 'Ebɛ tsofa ni hiaa wolo he',
    codCash: 'Wo shika lɛ ohã mɔ ni kɛbaa lɛ',
    codMeta: 'Esa akɛ owo Rx nibii ahe dani tsofatsɛ lɛ kɛhã',
    addCard: 'Kɛ kaad hee fata he',
    promo: 'PROMO KOODU',
    promoPlaceholder: 'Ŋma koodu ko',
    apply: 'Kɛtsu nii',
    promoRejected: 'Koodu nɛɛ ejaaa loo be lɛ eho.',
    summary: 'NƆ NI OHE',
    subtotalOne: 'Nibii lɛ ahe · nɔ {count}',
    subtotalMany: 'Nibii lɛ ahe · nibii {count}',
    deliveryRow: 'Kɛbamɔ · {speed}',
    serviceFee: 'Nitsumɔ he nyɔmɔ',
    total: 'Fɛɛ',
    paystackTitle: 'Paystack tsuɔ',
    paystackBody:
      'Paystack kwɛɔ Mobile Money kɛ kaadi fɛɛ anɔ. Altruist naaa o PIN loo o kaad namba kɔkɔɔkɔ.',
    pay: 'Wo {amount}',
  },
  ee: {
    title: 'Xe fe',
    payWith: 'XE FE KPLE',
    cod: 'Xe fe ne wokɔe vɛ',
    codRx: 'Mele na atike siwo hiã ŋɔŋlɔ o',
    codCash: 'Xe ga na nukɔla la',
    codMeta: 'Ele be woaxe Rx nuwo ƒe fe hafi atikewɔla naa wo',
    addCard: 'Tsɔ kaad yeye kpe ɖe eŋu',
    promo: 'PROMO KOƉE',
    promoPlaceholder: 'Ŋlɔ koɖe aɖe',
    apply: 'Zãe',
    promoRejected: 'Koɖe sia mesɔ o alo eƒe ɣeyiɣi va yi.',
    summary: 'NU SIWO NÈƑLE',
    subtotalOne: 'Nuawo ƒe home · nu {count}',
    subtotalMany: 'Nuawo ƒe home · nu {count}',
    deliveryRow: 'Nukɔkɔyi · {speed}',
    serviceFee: 'Dɔwɔwɔ ƒe fe',
    total: 'Katã',
    paystackTitle: 'Paystack ye wɔe',
    paystackBody:
      'Paystack ye kpɔa Mobile Money kple kaadwo siaa dzi. Altruist mekpɔa wò PIN alo wò kaad ƒe nɔmba gbeɖe o.',
    pay: 'Xe {amount}',
  },
  ha: {
    title: 'Biya',
    payWith: 'BIYA DA',
    cod: 'Biya lokacin isarwa',
    codRx: 'Babu shi ga kayan da ke buƙatar takardar magani',
    codCash: 'Biya mai kawowa kuɗi a hannu',
    codMeta: 'Dole a biya odar Rx kafin mai harhaɗa magani ya bayar',
    addCard: 'Ƙara sabon kati',
    promo: 'LAMBAR RANGWAME',
    promoPlaceholder: 'Shigar da lamba',
    apply: 'Yi amfani',
    promoRejected: 'Wannan lambar ba ta aiki ko ta ƙare.',
    summary: 'TAƘAITACCEN ODA',
    subtotalOne: 'Jimlar kaya · kaya {count}',
    subtotalMany: 'Jimlar kaya · kaya {count}',
    deliveryRow: 'Isarwa · {speed}',
    serviceFee: 'Kuɗin sabis',
    total: 'Jimla',
    paystackTitle: 'Paystack ne ke sarrafawa',
    paystackBody:
      'Paystack ne ke sarrafa Mobile Money da katuna. Altruist ba ya ganin PIN ɗinka ko lambar katinka.',
    pay: 'Biya {amount}',
  },
});

export default function CheckoutPayment() {
  const tr = useT(S);
  const t = useTokens();
  const { d } = useDesignScale();

  const METHODS = useCheckoutMethods();
  const methodId = useCheckoutStore((s) => s.methodId);
  const setMethod = useCheckoutStore((s) => s.setMethod);
  const promo = useCheckoutStore((s) => s.promo);
  const setPromo = useCheckoutStore((s) => s.setPromo);
  /**
   * No campaign engine exists yet, so every code is rejected — deliberately,
   * and with a visible answer. A button that silently does nothing reads as a
   * broken app; "not a valid code" reads as a wrong code.
   */
  const [promoState, setPromoState] = useState<'idle' | 'rejected'>('idle');
  const { method, speed } = useCheckoutSelection();

  /** See checkout-delivery: an empty draft means the wallet default. */
  const selectedMethodId = methodId || method?.id;

  const { count, subtotal, delivery, serviceFee, total, hasPrescriptionItem, canCheckout } =
    useCart(speed.fee);

  const summaryRow = (label: string, value: string, strong = false) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(12) }}>
      <Text
        variant={strong ? 'labelL' : 'bodyM'}
        tone={strong ? 'primary' : 'secondary'}
        style={{ flex: 1, fontSize: d(strong ? 16 : 14), lineHeight: d(strong ? 20 : 21) }}
      >
        {label}
      </Text>
      <Text
        variant={strong ? 'numericL' : 'numericM'}
        tone={strong ? 'primary' : 'secondary'}
        style={{ fontSize: d(strong ? 28 : 20), lineHeight: d(strong ? 32 : 26) }}
      >
        {value}
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      <FormScreen gap={16}>
        <TitleAppBar title={tr('title')} />
        <CheckoutSteps step={2} />

        <SectionLabel>{tr('payWith')}</SectionLabel>
        {METHODS.map((m) => (
          <OptionCard key={m.id} {...m} selected={selectedMethodId === m.id} onPress={() => setMethod(m.id)} />
        ))}
        <OptionCard
          selected={selectedMethodId === 'cod'}
          disabled={hasPrescriptionItem}
          icon="clock"
          title={tr('cod')}
          subtitle={hasPrescriptionItem ? tr('codRx') : tr('codCash')}
          meta={hasPrescriptionItem ? tr('codMeta') : undefined}
          metaTone="warning"
          onPress={hasPrescriptionItem ? undefined : () => setMethod('cod')}
        />

        <Button
          label={tr('addCard')}
          variant="tertiary"
          size="medium"
          iconLeading="add"
          onPress={() => router.push('/payment-methods')}
        />

        <SectionLabel>{tr('promo')}</SectionLabel>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(10) }}>
          <View style={{ flex: 1 }}>
            <InputField
              value={promo}
              onChangeText={setPromo}
              placeholder={tr('promoPlaceholder')}
              autoCapitalize="characters"
            />
          </View>
          <Button
            label={tr('apply')}
            variant="secondary"
            size="large"
            fullWidth={false}
            disabled={!promo.trim()}
            onPress={() => setPromoState(promo.trim() ? 'rejected' : 'idle')}
          />
        </View>

        {promoState === 'rejected' ? (
          <Text variant="caption" tone="danger" style={{ fontSize: d(12), lineHeight: d(16) }}>
            {tr('promoRejected')}
          </Text>
        ) : null}

        <SectionLabel>{tr('summary')}</SectionLabel>
        <View
          style={{
            gap: d(12),
            paddingVertical: d(18),
            paddingHorizontal: d(20),
            borderRadius: d(24),
            backgroundColor: t.colors.bg.surface,
          }}
        >
          {summaryRow(tr(count === 1 ? 'subtotalOne' : 'subtotalMany', { count }), cedis(subtotal))}
          {summaryRow(tr('deliveryRow', { speed: speed.title }), cedis(delivery))}
          {summaryRow(tr('serviceFee'), cedis(serviceFee))}
          <View style={{ height: 1, backgroundColor: t.colors.border.subtle }} />
          {summaryRow(tr('total'), cedis(total), true)}
        </View>

        <View
          style={{
            flexDirection: 'row',
            gap: d(12),
            paddingVertical: d(14),
            paddingHorizontal: d(16),
            borderRadius: d(20),
            backgroundColor: t.colors.bg.infoSubtle,
          }}
        >
          <Icon name="shield-check" size={d(20)} tone="primary" />
          <View style={{ flex: 1, gap: d(4) }}>
            <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
              {tr('paystackTitle')}
            </Text>
            <Text variant="bodyS" tone="secondary" style={{ fontSize: d(13), lineHeight: d(19) }}>
              {tr('paystackBody')}
            </Text>
          </View>
        </View>
      </FormScreen>

      <StickyFooter>
        <Button
          label={tr('pay', { amount: cedis(total) })}
          size="large"
          iconLeading="shield-check"
          disabled={!canCheckout}
          onPress={() => router.push('/checkout-processing')}
        />
      </StickyFooter>
    </View>
  );
}
