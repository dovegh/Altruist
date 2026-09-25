/**
 * Badge, StatusPill and RxBadge.
 *
 * Colour here is SEMANTIC, not decorative. Mint reads as good, gold as
 * attention, coral as problem. The hue-tinted IconTile is the decorative
 * counterpart and must never be used on anything that reports state.
 *
 * StatusPill covers both enums in the schema — prescription status
 * (PENDING / VERIFYING / VERIFIED / REJECTED) and order status
 * (RECEIVED / PACKING / DISPATCHED / DELIVERED) — because a patient reads them
 * as one continuous journey.
 */
import React from 'react';
import { View } from 'react-native';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { Text } from './Text';
import { Icon, type IconName } from './Icon';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

export function Badge({
  label,
  tone = 'neutral',
  solid = false,
  icon,
}: {
  label: string;
  tone?: BadgeTone;
  solid?: boolean;
  icon?: IconName;
}) {
  const t = useTokens();
  const { d } = useDesignScale();
  const map = {
    neutral: { subtle: t.colors.bg.surfaceRaised, solid: t.colors.bg.inverse, fg: t.colors.text.secondary, onSolid: t.colors.text.onInverse },
    brand: { subtle: t.colors.bg.brandSubtle, solid: t.colors.bg.brand, fg: t.colors.text.brand, onSolid: t.colors.text.onBrand },
    success: { subtle: t.colors.bg.successSubtle, solid: t.colors.bg.brand, fg: t.colors.text.success, onSolid: t.colors.text.onBrand },
    warning: { subtle: t.colors.bg.warningSubtle, solid: t.colors.bg.accentGold, fg: t.colors.text.warning, onSolid: t.colors.text.onBrand },
    danger: { subtle: t.colors.bg.dangerSubtle, solid: t.colors.bg.danger, fg: t.colors.text.danger, onSolid: t.colors.text.onBrand },
    info: { subtle: t.colors.bg.infoSubtle, solid: t.colors.bg.accentBlue, fg: t.colors.text.info, onSolid: t.colors.text.onSolid },
  }[tone];

  const bg = solid ? map.solid : map.subtle;
  const fg = solid ? map.onSolid : map.fg;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: d(6),
        paddingHorizontal: d(10),
        paddingVertical: d(5),
        borderRadius: t.radius.full,
        backgroundColor: bg,
        alignSelf: 'flex-start',
      }}
    >
      {icon ? <Icon name={icon} size={d(13)} color={fg} /> : null}
      <Text variant="labelXS" color={fg} style={{ fontSize: d(11), lineHeight: d(14) }}>
        {label}
      </Text>
    </View>
  );
}

/**
 * The lifecycle pill and the regulatory badge live with their own components —
 * Status Pill in PrescriptionCard.tsx (it is the card's own header element) and
 * Rx Badge in Product.tsx (a product cannot render without one). Re-exported
 * here so `@/components/ui/Badge` stays the one import path for badges, but
 * there is deliberately only ONE definition of each: two components claiming to
 * own regulatory wording is how "RX REQUIRED" and "PRESCRIPTION REQUIRED" end
 * up shipping on the same screen.
 */
export { StatusPill, type LifecycleStatus } from './PrescriptionCard';
export { RxBadge, type RxSize } from './Product';

export default Badge;
