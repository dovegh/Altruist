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

export default function Cart() {
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
        <TitleAppBar title="Cart" />
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
        <TitleAppBar title="Cart" />

        <View style={{ height: d(100) }} />

        <StatusHalo icon="cart" tone="neutral" outer={148} glyph={56} />

        <View style={{ gap: d(10) }}>
          <Text variant="headingXL" center style={{ fontSize: d(24), lineHeight: d(30) }}>
            Your cart is empty
          </Text>
          <Text variant="bodyM" tone="secondary" center style={{ fontSize: d(14), lineHeight: d(21) }}>
            Browse the catalogue or re-order a past prescription.
          </Text>
        </View>

        <Button label="Browse catalogue" size="large" onPress={() => router.replace('/catalog')} />
        <Button
          label="View past orders"
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
      <TitleAppBar title="Cart" />

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
              {packLine(l.product)} · {cedis(l.product.price)} each
            </Text>
          </Pressable>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(10) }}>
            <QuantityStepper
              value={l.qty}
              onChange={(next) => setQty(l.product.id, next)}
              label={`quantity of ${l.product.name}`}
            />
            <View style={{ flex: 1 }} />
            <Text variant="numericM" style={{ fontSize: d(20), lineHeight: d(26) }}>
              {cedis(l.amount)}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${l.product.name} from cart`}
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
          accessibilityLabel={`${needsUpload.length} item${
            needsUpload.length === 1 ? '' : 's'
          } need a prescription. Attach one.`}
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
              {needsUpload.length} item{needsUpload.length === 1 ? '' : 's'} need
              {needsUpload.length === 1 ? 's' : ''} a prescription
            </Text>
            <Text variant="bodyS" tone="secondary" style={{ fontSize: d(13), lineHeight: d(19) }}>
              Attach a verified prescription for{' '}
              {needsUpload.map((l) => l.product.name).join(', ')} before you can check out.
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
              Waiting on the pharmacist
            </Text>
            <Text variant="bodyS" tone="secondary" style={{ fontSize: d(13), lineHeight: d(19) }}>
              Your prescription for {waiting.map((l) => l.product.name).join(', ')} is with{' '}
              {waiting[0].product.pharmacy}. You can check out once it is verified.
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
        {totalRow('Subtotal', cedis(subtotal))}
        {totalRow('Delivery', deliveryFree ? 'Free' : cedis(delivery))}
        {toFreeDelivery > 0 ? (
          <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
            Spend {cedis(toFreeDelivery)} more for free delivery.
          </Text>
        ) : null}
        {totalRow('Total', cedis(total), true)}
      </View>

      <Button
        label={
          canCheckout
            ? 'Continue to delivery'
            : waiting.length && !needsUpload.length
              ? 'Waiting on verification'
              : 'Attach prescription to continue'
        }
        size="large"
        onPress={() => router.push('/checkout-delivery')}
        disabled={!canCheckout}
      />

      <Text variant="caption" tone="tertiary" center style={{ fontSize: d(12), lineHeight: d(16) }}>
        Payments are processed by Paystack. Altruist never stores your card details.
      </Text>
    </FormScreen>
  );
}
