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

export default function CheckoutPayment() {
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
        <TitleAppBar title="Checkout" />
        <CheckoutSteps step={2} />

        <SectionLabel>PAY WITH</SectionLabel>
        {METHODS.map((m) => (
          <OptionCard key={m.id} {...m} selected={selectedMethodId === m.id} onPress={() => setMethod(m.id)} />
        ))}
        <OptionCard
          selected={selectedMethodId === 'cod'}
          disabled={hasPrescriptionItem}
          icon="clock"
          title="Pay on delivery"
          subtitle={
            hasPrescriptionItem ? 'Not available for prescription items' : 'Pay the rider in cash'
          }
          meta={
            hasPrescriptionItem
              ? 'Rx orders must be paid before the pharmacist dispenses'
              : undefined
          }
          metaTone="warning"
          onPress={hasPrescriptionItem ? undefined : () => setMethod('cod')}
        />

        <Button
          label="Add a new card"
          variant="tertiary"
          size="medium"
          iconLeading="add"
          onPress={() => router.push('/payment-methods')}
        />

        <SectionLabel>PROMO CODE</SectionLabel>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(10) }}>
          <View style={{ flex: 1 }}>
            <InputField
              value={promo}
              onChangeText={setPromo}
              placeholder="Enter a code"
              autoCapitalize="characters"
            />
          </View>
          <Button
            label="Apply"
            variant="secondary"
            size="large"
            fullWidth={false}
            disabled={!promo.trim()}
            onPress={() => setPromoState(promo.trim() ? 'rejected' : 'idle')}
          />
        </View>

        {promoState === 'rejected' ? (
          <Text variant="caption" tone="danger" style={{ fontSize: d(12), lineHeight: d(16) }}>
            That code is not valid or has expired.
          </Text>
        ) : null}

        <SectionLabel>ORDER SUMMARY</SectionLabel>
        <View
          style={{
            gap: d(12),
            paddingVertical: d(18),
            paddingHorizontal: d(20),
            borderRadius: d(24),
            backgroundColor: t.colors.bg.surface,
          }}
        >
          {summaryRow(`Subtotal · ${count} item${count === 1 ? '' : 's'}`, cedis(subtotal))}
          {summaryRow(`Delivery · ${speed.title}`, cedis(delivery))}
          {summaryRow('Service fee', cedis(serviceFee))}
          <View style={{ height: 1, backgroundColor: t.colors.border.subtle }} />
          {summaryRow('Total', cedis(total), true)}
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
              Processed by Paystack
            </Text>
            <Text variant="bodyS" tone="secondary" style={{ fontSize: d(13), lineHeight: d(19) }}>
              Mobile Money and cards are both handled by Paystack. Altruist never sees your wallet
              PIN or card number.
            </Text>
          </View>
        </View>
      </FormScreen>

      <StickyFooter>
        <Button
          label={`Pay ${cedis(total)}`}
          size="large"
          iconLeading="shield-check"
          disabled={!canCheckout}
          onPress={() => router.push('/checkout-processing')}
        />
      </StickyFooter>
    </View>
  );
}
