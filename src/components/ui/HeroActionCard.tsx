/**
 * Hero Action Card — Figma node 32:41.
 *
 * Component doc: "THE loud card. One per screen, never two — that restraint is
 * what makes the accent read as an accent. All ink is text/on-brand (teal/900)
 * because every tone is a light, high-chroma surface. Never put white text on
 * these."
 */
import React from 'react';
import { View, Pressable } from 'react-native';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { Text } from './Text';
import { Icon, type IconName } from './Icon';

export type HeroTone = 'brand' | 'accentCream' | 'accentGold' | 'accentBlue' | 'accentPink';

export function HeroActionCard({
  eyebrow,
  title,
  body,
  cta,
  ctaIcon,
  icon,
  tone = 'brand',
  onPress,
}: {
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  ctaIcon?: IconName;
  icon: IconName;
  tone?: HeroTone;
  onPress?: () => void;
}) {
  const t = useTokens();
  const { d } = useDesignScale();
  // Every hero tone is a light surface, so ink is always text/on-brand.
  const ink = t.colors.text.onBrand;

  return (
    <View
      style={{
        backgroundColor: t.colors.bg[tone],
        borderRadius: d(36),
        padding: d(24),
        gap: d(16),
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(12) }}>
        <Text
          variant="labelXS"
          color={ink}
          style={{ flex: 1, opacity: 0.7, fontSize: d(11), lineHeight: d(14) }}
        >
          {eyebrow}
        </Text>
        <View
          style={{
            width: d(44),
            height: d(44),
            borderRadius: t.radius.full,
            backgroundColor: t.colors.bg.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={icon} size={d(22)} tone="primary" />
        </View>
      </View>

      <Text variant="headingXL" color={ink} style={{ fontSize: d(24), lineHeight: d(30) }}>
        {title}
      </Text>
      <Text variant="bodyM" color={ink} style={{ opacity: 0.78, fontSize: d(14), lineHeight: d(21) }}>
        {body}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={cta}
        onPress={onPress}
        style={({ pressed }) => ({
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: d(8),
          paddingHorizontal: d(22),
          paddingVertical: d(13),
          borderRadius: t.radius.full,
          backgroundColor: t.colors.bg.surface,
          opacity: pressed ? 0.9 : 1,
        })}
      >
        <Text variant="labelM" tone="primary" style={{ fontSize: d(14), lineHeight: d(18) }}>
          {cta}
        </Text>
        {ctaIcon ? <Icon name={ctaIcon} size={d(18)} tone="primary" /> : null}
      </Pressable>
    </View>
  );
}

export default HeroActionCard;
