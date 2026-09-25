/**
 * Checkout — Processing — ported 1:1 from Figma node 78:446.
 *
 * A scrim over the canvas with a 342×437 sheet (r36, V gap20, pad 36/28/28/28):
 * an 88pt spinner, the head, a gold "do not close" strip, the payment reference,
 * and a tertiary cancel.
 *
 * Two behaviours the comp implies and code has to actually deliver:
 * - hardware Back is blocked while the request is in flight, because leaving
 *   mid-authorisation is exactly what the gold strip warns against;
 * - the reference is on screen the whole time, so a user whose bank app steals
 *   focus still has the string they need to check the charge.
 *
 * **Order of operations.** The order is created first, then authorised. A
 * payment that succeeds against an order that was never created is money taken
 * for nothing, and it is unrecoverable without the user's receipt — whereas an
 * order created and then declined is a normal, visible, retryable state.
 *
 * The cart is cleared only after the authorisation returns. Clearing it on the
 * way in would leave a declined user with an empty cart and nothing to retry.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, BackHandler } from 'react-native';
import { router } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { Spinner } from '@/components/ui/StatusScreen';
import { createOrder, payOrder, verifyPayment, NetworkError, DeclinedError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { cedis } from '@/lib/money';
import { useCart } from '@/features/cart/useCart';
import { useCartStore } from '@/features/cart/store';
import { useCheckoutStore, useCheckoutSelection } from '@/features/checkout/store';
import { useOrderStore, snapshotLines, initialEvents } from '@/features/orders/store';
import { usePartnerPharmacy } from '@/features/profile/store';
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    approvePrompt: 'Approve the payment prompt on your phone.',
    noResponse: 'no response from your phone — the prompt may have expired',
    title: 'Authorising with your bank',
    body: 'Approve the request in your banking app or enter the OTP your bank sends you.',
    doNotClose: 'Do not close this screen or press back',
    reference: 'Reference {reference}',
    cancel: 'Cancel payment',
    redirected:
      'If you were redirected to your bank and closed the page, your payment may still complete. Check Orders before trying again.',
  },
  fr: {
    approvePrompt: 'Validez la demande de paiement sur votre téléphone.',
    noResponse: 'aucune réponse de votre téléphone — la demande a peut-être expiré',
    title: 'Autorisation auprès de votre banque',
    body: "Validez la demande dans votre application bancaire ou saisissez l'OTP envoyé par votre banque.",
    doNotClose: "Ne fermez pas cet écran et n'appuyez pas sur retour",
    reference: 'Référence {reference}',
    cancel: 'Annuler le paiement',
    redirected:
      'Si vous avez été redirigé vers votre banque et avez fermé la page, votre paiement peut encore aboutir. Vérifiez vos commandes avant de réessayer.',
  },
  tw: {
    approvePrompt: 'Pene sika tua asɛm a aba wo fon so no so.',
    noResponse: 'wo fon no mmuaa — ebia asɛm no berɛ atwam',
    title: 'Yɛne wo sikakorabea rekasa',
    body: 'Pene so wɔ wo sikakorabea app mu anaa hyɛ OTP a wo sikakorabea de bɛmena wo no.',
    doNotClose: 'Nto saa screen yi mu na mmfa nsan w’akyi',
    reference: 'Reference {reference}',
    cancel: 'Twa sika tua no mu',
    redirected:
      'Sɛ wɔde wo kɔɔ wo sikakorabea na wotoo krataafa no mu a, ebia wo sika tua no bɛkɔ so. Hwɛ nneɛma a woato ansa na woasan abɔ mmɔden.',
  },
  gaa: {
    approvePrompt: 'Kpɛlɛ nyɔmɔwoo sane ni ba o fon lɛ nɔ lɛ nɔ.',
    noResponse: 'o fon lɛ haaa hetoo — ekolɛ sane lɛ be eho',
    title: 'Wɔkɛ o shika tohe miiwie',
    body: 'Kpɛlɛ nɔ yɛ o shika tohe app lɛ mli loo ŋma OTP ni o shika tohe lɛ kɛmaje bo lɛ.',
    doNotClose: 'Kaawo screen nɛɛ naa ni okaaku osɛɛ',
    reference: 'Reference {reference}',
    cancel: 'Kpa nyɔmɔwoo lɛ',
    redirected:
      'Kɛji akɛ bo tee o shika tohe lɛ ni owo nɔ lɛ naa lɛ, ekolɛ o nyɔmɔwoo lɛ baaya nɔ. Kwɛmɔ nɔ ni ohe lɛ dani oka ekoŋŋ.',
  },
  ee: {
    approvePrompt: 'Lɔ̃ ɖe fexexe ƒe biabia si va wò fon dzi la dzi.',
    noResponse: 'wò fon meɖo eŋu o — ɖewohĩ biabia la ƒe ɣeyiɣi va yi',
    title: 'Míele nu ƒom kple wò gadzraɖoƒe',
    body: 'Lɔ̃ ɖe biabia la dzi le wò gadzraɖoƒe ƒe app me alo ŋlɔ OTP si wò gadzraɖoƒe ɖo ɖe wò.',
    doNotClose: 'Mègatu screen sia alo azi megbe o',
    reference: 'Reference {reference}',
    cancel: 'Tutu fexexe la',
    redirected:
      'Ne wokplɔ wò yi wò gadzraɖoƒe eye nètu axa la, ɖewohĩ wò fexexe awu enu. Kpɔ nu siwo nèƒle hafi nàgate kpɔ.',
  },
  ha: {
    approvePrompt: 'Amince da buƙatar biyan kuɗi a wayarka.',
    noResponse: 'babu amsa daga wayarka — wataƙila buƙatar ta ƙare',
    title: 'Ana tabbatarwa da bankinka',
    body: 'Amince da buƙatar a manhajar bankinka ko shigar da OTP da bankinka zai aiko maka.',
    doNotClose: 'Kada ka rufe wannan allon ko ka koma baya',
    reference: 'Lambar shaida {reference}',
    cancel: 'Soke biyan kuɗi',
    redirected:
      'Idan an kai ka bankinka kuma ka rufe shafin, biyan kuɗinka zai iya kammala. Duba odarka kafin ka sake gwadawa.',
  },
});

export default function CheckoutProcessing() {
  const tr = useT(S);
  const pharmacy = usePartnerPharmacy();
  const t = useTokens();
  const { d } = useDesignScale();
  const [reference, setReference] = useState('—');
  /**
   * Set while a mobile-money prompt is out on the user's phone. Nothing has
   * been charged yet; the screen keeps re-checking until it resolves. The copy
   * changes with it — "approve the prompt on your phone" is a different
   * instruction from "enter the OTP your bank sends".
   */
  const [waitingOn, setWaitingOn] = useState<string | null>(null);

  const { address, speed, method } = useCheckoutSelection();
  const cart = useCart(speed.fee);
  const clearCart = useCartStore((s) => s.clear);
  const place = useOrderStore((s) => s.place);
  const resetCheckout = useCheckoutStore((s) => s.reset);

  // Back is disabled while authorising — see the warning strip below.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  /**
   * The cart is captured once, the first time it is fully loaded, and every
   * later read on this screen uses that copy.
   *
   * Two reasons it cannot just read `cart` live. Clearing the cart on success
   * would re-run the effect against an empty one mid-flight; and on a cold
   * entry (a deep link, a process restart on this route) the first render has
   * an unhydrated store and an unresolved catalogue query, so a snapshot taken
   * at mount would be an empty order for zero cedis.
   */
  const [snapshot, setSnapshot] = useState<typeof cart | null>(null);
  useEffect(() => {
    // `useCart` memoises its result, so this settles after one pass rather than
    // looping on a fresh object identity every render.
    if (!snapshot && cart.ready) setSnapshot(cart);
  }, [cart, snapshot]);

  const cancelled = useRef(false);

  useEffect(() => {
    if (!snapshot) return; // still loading — the effect re-runs once it lands
    cancelled.current = false;

    // Nothing to pay for. Only reachable by deep link or by a back-navigation
    // into a completed checkout.
    if (snapshot.isEmpty) {
      router.replace('/cart');
      return;
    }

    // No saved address or instrument — reachable now that both can be deleted
    // from the Address Book and Payment Methods. Send the user back to the step
    // that can fix it rather than authorising against a record that is gone.
    if (!address || !method) {
      router.replace('/checkout-delivery');
      return;
    }

    (async () => {
      try {
        const { orderId, reference: psk } = await createOrder({
          lines: snapshot.lines.map((l) => ({ productId: l.product.id, qty: l.qty })),
          addressId: address.id,
          speedId: speed.id,
          prescriptionId: snapshot.prescriptionIds[0],
        });
        if (cancelled.current) return;
        setReference(psk);

        // The authorisation itself. A decline is an ordinary outcome of this
        // call and gets its own screen; an unreachable gateway is a different
        // thing entirely and must never be reported as a declined card.
        let payment = await payOrder(orderId, method.id);
        if (cancelled.current) return;

        // Mobile money: Paystack has pushed a prompt to the phone and answered
        // "pending". Re-check every few seconds until the user acts on it, and
        // give up after two minutes rather than spin forever — an unanswered
        // prompt expires on the network side anyway.
        if (payment.status === 'pending') {
          setWaitingOn(payment.next ?? tr('approvePrompt'));
          const deadline = Date.now() + 120_000;
          while (payment.status === 'pending') {
            if (Date.now() > deadline) {
              throw new DeclinedError(
                tr('noResponse'),
                payment.reference,
              );
            }
            await new Promise((r) => setTimeout(r, 3_000));
            if (cancelled.current) return;
            payment = await verifyPayment(orderId, payment.reference);
            if (cancelled.current) return;
          }
          setWaitingOn(null);
        }

        const placedAt = Date.now();
        place({
          id: orderId,
          reference: payment.reference || psk,
          status: 'RECEIVED',
          placedAt,
          lines: snapshotLines(snapshot.lines),
          subtotal: snapshot.subtotal,
          deliveryFee: snapshot.delivery,
          serviceFee: snapshot.serviceFee,
          total: snapshot.total,
          pharmacy: snapshot.lines[0]?.product.pharmacy ?? pharmacy.name,
          addressLabel: address.title,
          addressLine: address.subtitle,
          speedLabel: speed.title,
          speedEta: speed.subtitle,
          methodLabel: method.title,
          prescriptionId: snapshot.prescriptionIds[0],
          events: initialEvents({
            placedAt,
            pharmacy: snapshot.lines[0]?.product.pharmacy ?? pharmacy.name,
            addressLine: address.subtitle,
            speedEta: speed.subtitle,
            hasPrescription: snapshot.hasPrescriptionItem,
          }),
        });

        clearCart();
        resetCheckout();
        router.replace(`/order-placed?id=${orderId}`);
      } catch (error) {
        if (cancelled.current) return;
        if (error instanceof NetworkError) router.replace('/offline');
        else if (error instanceof DeclinedError)
          // The reference goes with it. A support conversation that starts with
          // the Paystack reference is a lookup; one that starts with "my card
          // was declined earlier" is an investigation.
          router.replace(
            `/payment-failed?reason=${encodeURIComponent(error.reason)}&reference=${encodeURIComponent(
              error.reference ?? '',
            )}`,
          );
        else router.replace('/payment-failed');
      }
    })();

    return () => {
      cancelled.current = true;
    };
    // Runs once the snapshot exists, and never again: `snapshot` is a ref value
    // that is only ever assigned one time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: t.colors.bg.overlay,
        justifyContent: 'center',
        paddingHorizontal: d(24),
      }}
    >
      <View
        accessibilityLiveRegion="polite"
        style={{
          gap: d(20),
          paddingTop: d(36),
          paddingHorizontal: d(28),
          paddingBottom: d(28),
          borderRadius: d(36),
          backgroundColor: t.colors.bg.surface,
        }}
      >
        <Spinner size={88} />

        <View style={{ gap: d(10) }}>
          <Text variant="headingL" center style={{ fontSize: d(20), lineHeight: d(26) }}>
            {tr('title')}
          </Text>
          <Text variant="bodyM" tone="secondary" center style={{ fontSize: d(14), lineHeight: d(21) }}>
            {waitingOn ?? tr('body')}
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: d(10),
            paddingVertical: d(12),
            paddingHorizontal: d(14),
            borderRadius: d(16),
            backgroundColor: t.colors.bg.warningSubtle,
          }}
        >
          <Icon name="danger" size={d(18)} tone="warning" />
          <Text variant="labelS" tone="warning" style={{ flex: 1, fontSize: d(12), lineHeight: d(16) }}>
            {tr('doNotClose')}
          </Text>
        </View>

        <View style={{ gap: d(3) }}>
          <Text variant="labelM" center style={{ fontSize: d(14), lineHeight: d(18) }}>
            {[snapshot ? cedis(snapshot.total) : null, method?.title].filter(Boolean).join(' · ')}
          </Text>
          <Text variant="caption" tone="tertiary" center style={{ fontSize: d(12), lineHeight: d(16) }}>
            {tr('reference', { reference })}
          </Text>
        </View>

        <Button
          label={tr('cancel')}
          variant="tertiary"
          size="medium"
          onPress={() => {
            cancelled.current = true;
            router.back();
          }}
        />
      </View>

      <Text
        variant="caption"
        tone="tertiary"
        center
        style={{ marginTop: d(20), fontSize: d(12), lineHeight: d(16) }}
      >
        {tr('redirected')}
      </Text>
    </View>
  );
}
