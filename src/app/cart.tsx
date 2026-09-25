/**
 * Cart & Checkout — ported from Figma node 41:213.
 *
 * Scroll content: V gap18, pad 64/24/40/24. Line items, the prescription gate,
 * a totals card (r28, pad 20, gap 12), the checkout button and the Paystack
 * line.
 *
 * The gate is the important part: checkout is DISABLED while any line item
 * requires a prescription that has not been verified. That is a hard rule from
 * SRS §3, not a nudge — `canCheckout` is derived from the cart and the
 * prescription store in `useCart()`, so there is no flag to forget to clear and
 * a prescription item can never be silently checked out.
 *
 * The gate has three states, not two. "No script at all" and "script uploaded,
 * pharmacist hasn't looked at it yet" both block checkout, but only the first
 * one is the user's move. Telling someone to attach a prescription they
 * attached four minutes ago is how an app gets called broken.
 *
 * Figma draws each line as a List Row with a trailing value. The quantity
 * stepper is listed in the spec as not yet designed; it is built here in the
 * same language rather than left out, because a cart you cannot change is a
 * cart you have to empty and rebuild to fix a typo.
 *
 * The empty state is Figma's "Empty — Cart", rendered as a state rather than a
 * route: it is the same screen with nothing in it, and a separate route would
 * mean deciding which one to navigate to on every entry.
 */
import React from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen } from '@/components/ui/FormScreen';
import { TitleAppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { QuantityStepper } from '@/components/ui/Form';
import { RxBadge } from '@/components/ui/Product';
import { StatusHalo } from '@/components/ui/StatusScreen';
import { Shimmer, SkeletonBlock } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { cedis } from '@/lib/money';
import { packLine } from '@/lib/catalog';
import { useCart } from '@/features/cart/useCart';
import { useCartStore } from '@/features/cart/store';
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    title: 'Cart',
    emptyTitle: 'Your cart is empty',
    emptyBody: 'Browse the catalogue or re-order a past prescription.',
    browse: 'Browse catalogue',
    pastOrders: 'View past orders',
    each: '{pack} · {price} each',
    qtyA11y: 'quantity of {name}',
    removeA11y: 'Remove {name} from cart',
    needsA11yOne: '{count} item need a prescription. Attach one.',
    needsA11yMany: '{count} items need a prescription. Attach one.',
    needsOne: '{count} item needs a prescription',
    needsMany: '{count} items need a prescription',
    attachBody: 'Attach a verified prescription for {names} before you can check out.',
    waitingTitle: 'Waiting on the pharmacist',
    waitingBody:
      'Your prescription for {names} is with {pharmacy}. You can check out once it is verified.',
    subtotal: 'Subtotal',
    delivery: 'Delivery',
    free: 'Free',
    spendMore: 'Spend {amount} more for free delivery.',
    total: 'Total',
    ctaContinue: 'Continue to delivery',
    ctaWaiting: 'Waiting on verification',
    ctaAttach: 'Attach prescription to continue',
    paystack: 'Payments are processed by Paystack. Altruist never stores your card details.',
  },
  fr: {
    title: 'Panier',
    emptyTitle: 'Votre panier est vide',
    emptyBody: 'Parcourez le catalogue ou recommandez une ancienne ordonnance.',
    browse: 'Parcourir le catalogue',
    pastOrders: 'Voir les commandes passées',
    each: '{pack} · {price} l’unité',
    qtyA11y: 'quantité de {name}',
    removeA11y: 'Retirer {name} du panier',
    needsA11yOne: '{count} article nécessite une ordonnance. Joignez-en une.',
    needsA11yMany: '{count} articles nécessitent une ordonnance. Joignez-en une.',
    needsOne: '{count} article nécessite une ordonnance',
    needsMany: '{count} articles nécessitent une ordonnance',
    attachBody:
      'Joignez une ordonnance vérifiée pour {names} avant de pouvoir passer commande.',
    waitingTitle: 'En attente du pharmacien',
    waitingBody:
      'Votre ordonnance pour {names} est chez {pharmacy}. Vous pourrez commander une fois qu’elle sera vérifiée.',
    subtotal: 'Sous-total',
    delivery: 'Livraison',
    free: 'Gratuite',
    spendMore: 'Encore {amount} d’achats pour la livraison gratuite.',
    total: 'Total',
    ctaContinue: 'Continuer vers la livraison',
    ctaWaiting: 'En attente de vérification',
    ctaAttach: 'Joignez l’ordonnance pour continuer',
    paystack:
      'Les paiements sont traités par Paystack. Altruist ne conserve jamais les données de votre carte.',
  },
  tw: {
    title: 'Kɛntɛn',
    emptyTitle: 'Wo kɛntɛn mu da mpan',
    emptyBody: 'Hwɛ nneɛma a ɛwɔ hɔ anaa san tɔ nnuro krataa dada bi so nnuro.',
    browse: 'Hwɛ nneɛma',
    pastOrders: 'Hwɛ nneɛma a woato dada',
    each: '{pack} · baako {price}',
    qtyA11y: '{name} dodoɔ',
    removeA11y: 'Yi {name} firi kɛntɛn mu',
    needsA11yOne: 'Adeɛ {count} hia nnuro krataa. Fa bi ka ho.',
    needsA11yMany: 'Nneɛma {count} hia nnuro krataa. Fa bi ka ho.',
    needsOne: 'Adeɛ {count} hia nnuro krataa',
    needsMany: 'Nneɛma {count} hia nnuro krataa',
    attachBody: 'Fa nnuro krataa a wɔahwɛ ama {names} ka ho ansa na woatumi atua ka.',
    waitingTitle: 'Yɛretwɛn nnuroyɛfoɔ no',
    waitingBody:
      'Wo nnuro krataa a ɛfa {names} ho wɔ {pharmacy} nkyɛn. Sɛ wɔhwɛ wie a, wobɛtumi atua ka.',
    subtotal: 'Nneɛma no bo',
    delivery: 'De brɛ wo',
    free: 'Kwa',
    spendMore: 'Tɔ {amount} bio na wɔde abrɛ wo kwa.',
    total: 'Ne nyinaa',
    ctaContinue: 'Toa so kɔ de brɛ wo',
    ctaWaiting: 'Yɛretwɛn nhwehwɛmu',
    ctaAttach: 'Fa nnuro krataa ka ho na toa so',
    paystack: 'Paystack na ɛhwɛ sika tua no so. Altruist nkora wo kaad ho nsɛm da.',
  },
  gaa: {
    title: 'Kɛntɛŋ',
    emptyTitle: 'Nɔ ko bɛ o kɛntɛŋ lɛ mli',
    emptyBody: 'Kwɛmɔ nibii ni yɔɔ loo ohe tsofa wolo momo ko nɔ tsofa ekoŋŋ.',
    browse: 'Kwɛmɔ nibii',
    pastOrders: 'Kwɛmɔ nɔ ni ohe momo',
    each: '{pack} · ekome {price}',
    qtyA11y: '{name} yibɔ',
    removeA11y: 'Jiemɔ {name} kɛjɛ kɛntɛŋ lɛ mli',
    needsA11yOne: 'Nɔ {count} miihia tsofa wolo. Kɛ ekome fata he.',
    needsA11yMany: 'Nibii {count} miihia tsofa wolo. Kɛ ekome fata he.',
    needsOne: 'Nɔ {count} miihia tsofa wolo',
    needsMany: 'Nibii {count} miihia tsofa wolo',
    attachBody: 'Kɛ tsofa wolo ni akwɛ yɛ {names} he fata he dani obaanyɛ owo nyɔmɔ.',
    waitingTitle: 'Wɔmiimɔ tsofatsɛ lɛ',
    waitingBody:
      'O tsofa wolo yɛ {names} he yɔɔ {pharmacy} ŋɔɔ. Kɛ akwɛ lɛ naa lɛ, obaanyɛ owo nyɔmɔ.',
    subtotal: 'Nibii lɛ ahe',
    delivery: 'Kɛbamɔ',
    free: 'Yaka',
    spendMore: 'He {amount} ekoŋŋ ni akɛbaa yaka.',
    total: 'Fɛɛ',
    ctaContinue: 'Ya nɔ kɛya kɛbamɔ',
    ctaWaiting: 'Wɔmiimɔ kwɛmɔ',
    ctaAttach: 'Kɛ tsofa wolo fata he ni oya nɔ',
    paystack: 'Paystack kwɛɔ nyɔmɔwoo lɛ nɔ. Altruist toooo o kaad he saji kɔkɔɔkɔ.',
  },
  ee: {
    title: 'Kusi',
    emptyTitle: 'Naneke mele wò kusi me o',
    emptyBody: 'Kpɔ nuawo alo gaƒle atike ŋɔŋlɔ xoxo aɖe ƒe atike.',
    browse: 'Kpɔ nuawo',
    pastOrders: 'Kpɔ nu siwo nèƒle xoxo',
    each: '{pack} · ɖeka {price}',
    qtyA11y: '{name} ƒe xexlẽ',
    removeA11y: 'Ɖe {name} ɖa le kusi me',
    needsA11yOne: 'Nu {count} hiã atike ŋɔŋlɔ. Tsɔ ɖeka kpe ɖe eŋu.',
    needsA11yMany: 'Nu {count} hiã atike ŋɔŋlɔ. Tsɔ ɖeka kpe ɖe eŋu.',
    needsOne: 'Nu {count} hiã atike ŋɔŋlɔ',
    needsMany: 'Nu {count} hiã atike ŋɔŋlɔ',
    attachBody: 'Tsɔ atike ŋɔŋlɔ si wokpɔ na {names} kpe ɖe eŋu hafi nàte ŋu axe fe.',
    waitingTitle: 'Míele atikewɔla lá lalam',
    waitingBody:
      'Wò atike ŋɔŋlɔ na {names} le {pharmacy} gbɔ. Ne wokpɔe vɔ la, àte ŋu axe fe.',
    subtotal: 'Nuawo ƒe home',
    delivery: 'Nukɔkɔyi',
    free: 'Faa',
    spendMore: 'Ƒle {amount} kpe ɖe eŋu be woakɔe vɛ na wò faa.',
    total: 'Katã',
    ctaContinue: 'Yi edzi na nukɔkɔyi',
    ctaWaiting: 'Míele nukpɔkpɔ lalam',
    ctaAttach: 'Tsɔ atike ŋɔŋlɔ kpe ɖe eŋu nàyi edzi',
    paystack: 'Paystack ye kpɔa fexexe dzi. Altruist medzraa wò kaad ƒe nyatakakawo ɖo gbeɖe o.',
  },
  ha: {
    title: 'Kwando',
    emptyTitle: 'Kwandonka babu komai',
    emptyBody: 'Duba kayayyaki ko sake yin odar takardar magani ta baya.',
    browse: 'Duba kayayyaki',
    pastOrders: 'Duba odar da ka yi a baya',
    each: '{pack} · {price} kowanne',
    qtyA11y: 'yawan {name}',
    removeA11y: 'Cire {name} daga kwando',
    needsA11yOne: 'Kaya {count} yana buƙatar takardar magani. Haɗa ɗaya.',
    needsA11yMany: 'Kaya {count} suna buƙatar takardar magani. Haɗa ɗaya.',
    needsOne: 'Kaya {count} yana buƙatar takardar magani',
    needsMany: 'Kaya {count} suna buƙatar takardar magani',
    attachBody: 'Haɗa takardar magani da aka tabbatar don {names} kafin ka iya biya.',
    waitingTitle: 'Ana jiran mai harhaɗa magani',
    waitingBody:
      'Takardar maganinka don {names} tana wurin {pharmacy}. Za ka iya biya da zarar an tabbatar da ita.',
    subtotal: 'Jimlar kaya',
    delivery: 'Isarwa',
    free: 'Kyauta',
    spendMore: 'Ƙara {amount} don samun isarwa kyauta.',
    total: 'Jimla',
    ctaContinue: 'Ci gaba zuwa isarwa',
    ctaWaiting: 'Ana jiran tabbatarwa',
    ctaAttach: 'Haɗa takardar magani don ci gaba',
    paystack: 'Paystack ne ke sarrafa biyan kuɗi. Altruist ba ya ajiye bayanan katinka.',
  },
});

export default function Cart() {
  const tr = useT(S);
  const t = useTokens();
  const { d } = useDesignScale();

  const {
    lines,
    blocked,
    subtotal,
    delivery,
    deliveryFree,
    toFreeDelivery,
    total,
    canCheckout,
    isEmpty,
    ready,
  } = useCart();
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);

  // Storage and the catalogue both have to land before "empty" is a true
  // statement rather than a not-loaded-yet one.
  if (!ready) {
    return (
      <FormScreen gap={18}>
        <TitleAppBar title={tr('title')} />
        <Shimmer style={{ gap: d(14) }}>
          {[0, 1].map((i) => (
            <SkeletonBlock key={i} width="100%" height={116} radius={20} />
          ))}
          <SkeletonBlock width="100%" height={148} radius={28} />
        </Shimmer>
      </FormScreen>
    );
  }

  if (isEmpty) {
    return (
      <FormScreen gap={22} contentStyle={{ paddingBottom: d(120) }}>
        <TitleAppBar title={tr('title')} />

        <View style={{ height: d(100) }} />

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
        <Button
          label={tr('pastOrders')}
          variant="tertiary"
          size="large"
          onPress={() => router.push('/order-history')}
        />
      </FormScreen>
    );
  }

  // Only the lines with nothing covering them yet are the user's move. A line
  // whose script is uploaded and waiting is the pharmacist's.
  const needsUpload = blocked.filter((l) => !l.awaitingReview);
  const waiting = blocked.filter((l) => l.awaitingReview);

  const totalRow = (label: string, value: string, strong = false) => (
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
    <FormScreen gap={18}>
      <TitleAppBar title={tr('title')} />

      {lines.map((l) => (
        <View
          key={l.product.id}
          style={{
            gap: d(12),
            paddingVertical: d(14),
            paddingHorizontal: d(16),
            borderRadius: d(20),
            backgroundColor: t.colors.bg.surface,
            // A blocked line is outlined, so the gate below names something the
            // eye can already find in the list.
            borderWidth: 1,
            borderColor: l.blocked ? t.colors.border.warning : t.colors.border.subtle,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${l.product.name}, ${packLine(l.product)}`}
            onPress={() => router.push(`/product?id=${l.product.id}`)}
            style={({ pressed }) => ({ gap: d(6), opacity: pressed ? 0.9 : 1 })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: d(10) }}>
              <Text variant="labelL" style={{ flex: 1, fontSize: d(16), lineHeight: d(20) }}>
                {l.product.name}
              </Text>
              <RxBadge requiresPrescription={l.product.requiresPrescription} size="compact" />
            </View>
            <Text variant="bodyS" tone="secondary" style={{ fontSize: d(13), lineHeight: d(19) }}>
              {tr('each', { pack: packLine(l.product), price: cedis(l.product.price) })}
            </Text>
          </Pressable>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(10) }}>
            <QuantityStepper
              value={l.qty}
              onChange={(next) => setQty(l.product.id, next)}
              label={tr('qtyA11y', { name: l.product.name })}
            />
            <View style={{ flex: 1 }} />
            <Text variant="numericM" style={{ fontSize: d(20), lineHeight: d(26) }}>
              {cedis(l.amount)}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tr('removeA11y', { name: l.product.name })}
              hitSlop={10}
              onPress={() => remove(l.product.id)}
              style={({ pressed }) => ({
                width: d(34),
                height: d(34),
                borderRadius: t.radius.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: t.colors.bg.surfaceRaised,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Icon name="trash" size={d(16)} tone="tertiary" />
            </Pressable>
          </View>
        </View>
      ))}

      {/* The gate. Gold for "your move", blue for "the pharmacist's move". */}
      {needsUpload.length ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr(needsUpload.length === 1 ? 'needsA11yOne' : 'needsA11yMany', {
            count: needsUpload.length,
          })}
          onPress={() =>
            router.push(
              `/prescription-upload?for=${needsUpload.map((l) => l.product.id).join(',')}`,
            )
          }
          style={({ pressed }) => ({
            flexDirection: 'row',
            gap: d(12),
            padding: d(16),
            borderRadius: d(20),
            backgroundColor: t.colors.bg.warningSubtle,
            borderWidth: 1,
            borderColor: t.colors.border.warning,
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <Icon name="danger" size={d(20)} tone="warning" />
          <View style={{ flex: 1, gap: d(4) }}>
            <Text variant="labelM" tone="warning" style={{ fontSize: d(14), lineHeight: d(18) }}>
              {tr(needsUpload.length === 1 ? 'needsOne' : 'needsMany', {
                count: needsUpload.length,
              })}
            </Text>
            <Text variant="bodyS" tone="secondary" style={{ fontSize: d(13), lineHeight: d(19) }}>
              {tr('attachBody', { names: needsUpload.map((l) => l.product.name).join(', ') })}
            </Text>
          </View>
          <Icon name="chevron-right" size={d(20)} tone="warning" />
        </Pressable>
      ) : null}

      {waiting.length ? (
        <View
          style={{
            flexDirection: 'row',
            gap: d(12),
            padding: d(16),
            borderRadius: d(20),
            backgroundColor: t.colors.bg.infoSubtle,
          }}
        >
          <Icon name="clock" size={d(20)} tone="primary" />
          <View style={{ flex: 1, gap: d(4) }}>
            <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
              {tr('waitingTitle')}
            </Text>
            <Text variant="bodyS" tone="secondary" style={{ fontSize: d(13), lineHeight: d(19) }}>
              {tr('waitingBody', {
                names: waiting.map((l) => l.product.name).join(', '),
                pharmacy: waiting[0].product.pharmacy,
              })}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Totals — r28, pad 20, gap 12 */}
      <View
        style={{
          gap: d(12),
          padding: d(20),
          borderRadius: d(28),
          backgroundColor: t.colors.bg.surface,
        }}
      >
        {totalRow(tr('subtotal'), cedis(subtotal))}
        {totalRow(tr('delivery'), deliveryFree ? tr('free') : cedis(delivery))}
        {toFreeDelivery > 0 ? (
          <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
            {tr('spendMore', { amount: cedis(toFreeDelivery) })}
          </Text>
        ) : null}
        {totalRow(tr('total'), cedis(total), true)}
      </View>

      <Button
        label={
          canCheckout
            ? tr('ctaContinue')
            : waiting.length && !needsUpload.length
              ? tr('ctaWaiting')
              : tr('ctaAttach')
        }
        size="large"
        onPress={() => router.push('/checkout-delivery')}
        disabled={!canCheckout}
      />

      <Text variant="caption" tone="tertiary" center style={{ fontSize: d(12), lineHeight: d(16) }}>
        {tr('paystack')}
      </Text>
    </FormScreen>
  );
}
