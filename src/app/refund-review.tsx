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

export default function RefundReview() {
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
    ['Returning', `${itemCount} item${itemCount === 1 ? '' : 's'}`],
    ['Reason', params.reason || 'Not given'],
    ['Evidence', '2 photos attached'],
    ['Order', order ? `TrxID ${order.id}` : '—'],
    ['Pharmacy', order?.pharmacy ?? '—'],
  ];

  const breakdown: [string, string, string][] = [
    ['Returned items', 'Refunded by the pharmacy', cedis(goods)],
    ['Delivery fee', 'Not refunded — order was delivered', cedis(0)],
    ['Altruist service fee', 'Refunded proportionally', cedis(feeShare)],
  ];

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      <FormScreen gap={16}>
        <TitleAppBar title="Review request" />

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
          <SectionLabel>IF APPROVED</SectionLabel>

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
              Estimated refund
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
              The pharmacy decides, not Altruist
            </Text>
            <Text variant="bodyS" tone="secondary" style={{ fontSize: d(13), lineHeight: d(19) }}>
              Altruist passes this request to {pharmacy.name} and handles the money movement.
              The pharmacist reviews it and may approve it in full, in part, or decline it with a
              reason. You usually hear back within 2 business days.
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: acknowledged }}
          accessibilityLabel="I confirm the items are unused and in their original sealed packaging, and I understand the pharmacy may decline this request."
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
            I confirm the items are unused and in their original sealed packaging, and I understand
            the pharmacy may decline this request.
          </Text>
        </Pressable>
      </FormScreen>

      <StickyFooter>
        <Button
          label="Submit request"
          size="large"
          disabled={!acknowledged}
          onPress={() =>
            router.replace(`/refund-status?id=${order?.id ?? ''}&amount=${refund}`)
          }
        />
        <Text variant="caption" tone="tertiary" center style={{ fontSize: d(12), lineHeight: d(16) }}>
          {acknowledged ? 'The pharmacy usually replies within 2 business days.' : 'Tick the box above to submit.'}
        </Text>
      </StickyFooter>
    </View>
  );
}
