/**
 * Order Receipt — ported 1:1 from Figma node 138:413.
 *
 * Scroll content: V gap16, pad 64/24/140/24. A cream receipt document (V gap18,
 * pad 24/22/30/22) with dashed rules made of 6×1.5 dashes at an 11pt pitch, a
 * punched "tear edge" strip of 22pt canvas-coloured circles, then the seller-of-
 * record card and the platform notice. Footer: Download PDF + Get help.
 *
 * The seller-of-record card is the legally operative part of this screen. SRS
 * §1: Altruist collects payment as agent; the pharmacy named here is the seller
 * and is responsible for the medicines. The licence number, the dispensing
 * pharmacist and the Paystack reference are all here so a refund or a Pharmacy
 * Council complaint can be made from this one document.
 *
 * All ink inside the document is text/on-brand — cream is a LIGHT surface in
 * both themes, so it does not follow the theme's primary text colour.
 */
import React from 'react';
import { View, Share } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen, StickyFooter } from '@/components/ui/FormScreen';
import { TitleAppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Icon, type IconName } from '@/components/ui/Icon';
import { StatusScreen } from '@/components/ui/StatusScreen';
import { cedis } from '@/lib/money';
import { useOrderStore } from '@/features/orders/store';
import { usePartnerPharmacy } from '@/features/profile/store';

/**
 * The seller of record, which is a property of the pharmacy that dispensed the
 * order rather than of Altruist. The licence number and the pharmacist are
 * fixtures until the partner directory exists; the pharmacy name, the payment
 * method and the Paystack reference come from the order itself, because those
 * three are what a refund or a Pharmacy Council complaint is actually made
 * against.
 */

export default function OrderReceipt() {
  const pharmacy = usePartnerPharmacy();
  const licence = `Pharmacy Council licence ${pharmacy.licence} · ${pharmacy.address}`;
  const t = useTokens();
  const { d } = useDesignScale();
  const ink = t.colors.text.onBrand;
  const { id } = useLocalSearchParams<{ id?: string }>();

  const order = useOrderStore((s) => s.items.find((o) => o.id === (id ?? s.lastOrderId)));
  const hydrated = useOrderStore((s) => s.hydrated);

  const paidAt = order
    ? `${new Date(order.placedAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })} · ${new Date(order.placedAt)
        .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })
        .toUpperCase()}`
    : '';

  const seller: { icon: IconName; title: string; meta: string }[] = order
    ? [
        { icon: 'shield-check', title: order.pharmacy, meta: licence },
        {
          icon: 'prescription',
          title: `Dispensed by ${pharmacy.superintendent.name}`,
          meta: `Lead Pharmacist · ${pharmacy.superintendent.registration}`,
        },
        {
          icon: 'card',
          title: order.methodLabel,
          meta: `Paystack ref ${order.reference}`,
        },
      ]
    : [];

  /** 6×1.5 dashes at an 11pt pitch, drawn wide and clipped by the parent. */
  const dashedRule = (
    <View style={{ flexDirection: 'row', gap: d(5), height: d(2), overflow: 'hidden' }}>
      {Array.from({ length: 40 }, (_, i) => (
        <View
          key={i}
          style={{
            width: d(6),
            height: d(1.5),
            borderRadius: d(2),
            backgroundColor: ink,
          }}
        />
      ))}
    </View>
  );

  if (!order) {
    if (!hydrated) return <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} />;
    return (
      <StatusScreen
        icon="danger"
        tone="danger"
        title="Receipt not found"
        body="We could not find that order on this device. A receipt is only held where the order was placed."
        actions={
          <Button label="See all orders" size="large" onPress={() => router.replace('/order-history')} />
        }
      />
    );
  }

  const money = (label: string, value: string, strong = false) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(12) }}>
      <Text
        variant={strong ? 'labelL' : 'bodyM'}
        color={ink}
        style={{
          flex: 1,
          opacity: strong ? 1 : 0.7,
          fontSize: d(strong ? 16 : 14),
          lineHeight: d(strong ? 20 : 21),
        }}
      >
        {label}
      </Text>
      <Text
        variant={strong ? 'numericM' : 'labelM'}
        color={ink}
        style={{ fontSize: d(strong ? 20 : 14), lineHeight: d(strong ? 26 : 18) }}
      >
        {value}
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      <FormScreen gap={16}>
        <TitleAppBar title="Receipt" />

        {/* Receipt document */}
        <View
          style={{
            gap: d(18),
            paddingTop: d(24),
            paddingHorizontal: d(22),
            paddingBottom: d(30),
            backgroundColor: t.colors.bg.accentCream,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(12) }}>
            <Text
              variant="displayS"
              color={ink}
              style={{ flex: 1, fontSize: d(20), lineHeight: d(26) }}
            >
              Altruist
            </Text>
            <View style={{ gap: d(2) }}>
              <Text
                variant="labelXS"
                color={ink}
                style={{ textAlign: 'right', fontSize: d(11), lineHeight: d(14) }}
              >
                PAID
              </Text>
              <Text
                variant="caption"
                color={ink}
                style={{ textAlign: 'right', opacity: 0.6, fontSize: d(12), lineHeight: d(16) }}
              >
                {paidAt}
              </Text>
            </View>
          </View>

          <View style={{ gap: d(2) }}>
            <Text
              variant="caption"
              color={ink}
              style={{ opacity: 0.6, fontSize: d(12), lineHeight: d(16) }}
            >
              Total paid
            </Text>
            <Text variant="numericL" color={ink} style={{ fontSize: d(28), lineHeight: d(32) }}>
              {cedis(order.total)}
            </Text>
          </View>

          {dashedRule}

          {order.lines.map((l) => (
            <View
              key={l.productId}
              style={{ flexDirection: 'row', alignItems: 'flex-start', gap: d(12) }}
            >
              <View style={{ flex: 1, gap: d(3) }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(6) }}>
                  <Text variant="labelM" color={ink} style={{ fontSize: d(14), lineHeight: d(18) }}>
                    {l.name}
                  </Text>
                  {l.requiresPrescription ? (
                    <View
                      style={{
                        paddingVertical: d(3),
                        paddingHorizontal: d(8),
                        borderRadius: t.radius.full,
                        backgroundColor: ink,
                      }}
                    >
                      <Text
                        variant="labelXS"
                        color={t.colors.bg.accentCream}
                        style={{ fontSize: d(11), lineHeight: d(14) }}
                      >
                        RX
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  variant="caption"
                  color={ink}
                  style={{ opacity: 0.6, fontSize: d(12), lineHeight: d(16) }}
                >
                  {l.qty} × {cedis(l.unitPrice)}
                </Text>
              </View>
              <Text variant="labelM" color={ink} style={{ fontSize: d(14), lineHeight: d(18) }}>
                {cedis(l.unitPrice * l.qty)}
              </Text>
            </View>
          ))}

          {dashedRule}

          {money('Subtotal', cedis(order.subtotal))}
          {money(`Delivery — ${order.speedLabel}`, cedis(order.deliveryFee))}
          {money('Altruist service fee', cedis(order.serviceFee))}
          {money('Total paid', cedis(order.total), true)}
        </View>

        {/* Tear edge — 22pt canvas circles punched along the bottom */}
        <View
          style={{
            height: d(16),
            marginTop: d(-16),
            overflow: 'hidden',
            backgroundColor: t.colors.bg.accentCream,
          }}
        >
          <View style={{ flexDirection: 'row', marginLeft: d(-6), marginTop: d(6) }}>
            {Array.from({ length: 18 }, (_, i) => (
              <View
                key={i}
                style={{
                  width: d(22),
                  height: d(22),
                  borderRadius: t.radius.full,
                  marginRight: d(-2),
                  backgroundColor: t.colors.bg.canvas,
                }}
              />
            ))}
          </View>
        </View>

        {/* Seller of record */}
        <View
          style={{
            gap: d(12),
            paddingVertical: d(16),
            paddingHorizontal: d(18),
            borderRadius: d(24),
            backgroundColor: t.colors.bg.surface,
          }}
        >
          <Text variant="labelXS" tone="tertiary" style={{ fontSize: d(11), lineHeight: d(14) }}>
            SOLD AND DISPENSED BY
          </Text>
          {seller.map((s) => (
            <View key={s.title} style={{ flexDirection: 'row', gap: d(12) }}>
              <Icon name={s.icon} size={d(20)} tone="primary" />
              <View style={{ flex: 1, gap: d(3) }}>
                <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
                  {s.title}
                </Text>
                <Text
                  variant="caption"
                  tone="tertiary"
                  style={{ fontSize: d(12), lineHeight: d(16) }}
                >
                  {s.meta}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Platform notice */}
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
          <Icon name="info" size={d(18)} tone="tertiary" />
          <Text
            variant="caption"
            tone="tertiary"
            style={{ flex: 1, fontSize: d(12), lineHeight: d(16) }}
          >
            Altruist Technologies operated the platform and collected payment as agent. The pharmacy
            named above is the seller of record and is responsible for the medicines supplied. Keep
            this receipt for any refund or return request.
          </Text>
        </View>
      </FormScreen>

      <StickyFooter>
        <View style={{ flexDirection: 'row', gap: d(12) }}>
          <Button
            label="Share receipt"
            variant="secondary"
            size="large"
            iconLeading="upload"
            style={{ flex: 1 }}
            /**
             * The system share sheet, not a PDF. Nothing in the app renders
             * PDFs, and a button labelled "Download PDF" that produced nothing
             * was the worst of both. Sharing the receipt's identifying lines is
             * what a refund or a Pharmacy Council query actually needs, and the
             * sheet already offers Save to Files on both platforms.
             */
            onPress={() =>
              Share.share({
                title: `Altruist receipt ${order.id}`,
                message: [
                  `Altruist receipt · TrxID ${order.id}`,
                  `${order.pharmacy} · ${licence}`,
                  `Total paid ${cedis(order.total)}`,
                  `Paystack ref ${order.reference}`,
                ].join('\n'),
              })
            }
          />
          <Button
            label="Get help"
            size="large"
            iconLeading="info"
            style={{ flex: 1 }}
            onPress={() => router.push('/support')}
          />
        </View>
      </StickyFooter>
    </View>
  );
}
