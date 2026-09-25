/**
 * Tilted partner chip — the cluster used inside the onboarding and welcome
 * hero cards.
 *
 * Geometry comes straight from Figma: `box` is the ROTATED bounding box the
 * design tool reports, and the chip itself is centred inside it and then
 * rotated. Reproducing it any other way shifts the cluster.
 *
 * Chip ink follows the chip's OWN surface, never the card behind it — cream,
 * gold, pink and mint are light surfaces and take dark ink; dark teal and blue
 * take light ink. Getting this backwards makes chips vanish.
 */
import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { Text } from './ui/Text';
import { Icon, type IconName } from './ui/Icon';
import type { Theme } from '@/theme/tokens';

type Surface = keyof Theme['colors']['bg'];

/** Surfaces that are visually light and therefore take dark ink. */
const LIGHT_SURFACES: Surface[] = ['accentCream', 'accentGold', 'accentPink', 'brand', 'inverse'];

export type PartnerChipSpec = {
  box: { left: number; top: number; width: number; height: number };
  rotate: number;
  surface: Surface;
  thumb: Surface;
  icon: IconName;
  title: string;
  sub: string;
};

/**
 * Figma reports the ROTATED bounding box. Yoga will clamp a child to its
 * parent's width, so laying the chip inside that box clips the labels. Recover
 * the chip's true unrotated size:
 *
 *   bw = w·cosθ + h·sinθ        w = (bw·cosθ − bh·sinθ) / (cos²θ − sin²θ)
 *   bh = w·sinθ + h·cosθ        h = (bh·cosθ − bw·sinθ) / (cos²θ − sin²θ)
 */
function unrotate(box: PartnerChipSpec['box'], deg: number) {
  const r = (Math.abs(deg) * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  const det = c * c - s * s;
  if (Math.abs(det) < 1e-6) return { width: box.width, height: box.height };
  return {
    width: (box.width * c - box.height * s) / det,
    height: (box.height * c - box.width * s) / det,
  };
}

export function PartnerChip({ spec }: { spec: PartnerChipSpec }) {
  const t = useTokens();
  const { d } = useDesignScale();
  const size = unrotate(spec.box, spec.rotate);

  const isLight = (s: Surface) => LIGHT_SURFACES.includes(s);

  const titleColor = isLight(spec.surface)
    ? t.colors.text.onBrand
    : spec.surface === 'accentBlue'
      ? t.colors.text.onSolid
      : t.colors.text.primary;

  const subColor = isLight(spec.surface)
    ? t.colors.text.onBrand
    : spec.surface === 'accentBlue'
      ? t.colors.text.onSolid
      : t.colors.text.tertiary;

  const thumbIcon = isLight(spec.thumb) ? t.colors.icon.onBrand : t.colors.icon.primary;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: d(spec.box.left),
        top: d(spec.box.top),
        width: d(spec.box.width),
        height: d(spec.box.height),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={
          {
            // Explicit unrotated size — the wrapper is only a positioning box.
            width: d(size.width),
            height: d(size.height),
            flexDirection: 'row',
            alignItems: 'center',
            gap: d(8),
            paddingLeft: d(7),
            paddingRight: d(14),
            paddingVertical: d(7),
            borderRadius: t.radius.full,
            backgroundColor: t.colors.bg[spec.surface],
            transform: [{ rotate: `${spec.rotate}deg` }],
            shadowColor: t.colors.shadow,
            shadowOpacity: 0.18,
            shadowRadius: d(12),
            shadowOffset: { width: 0, height: d(4) },
            elevation: 4,
          } as ViewStyle
        }
      >
        <View
          style={{
            width: d(30),
            height: d(30),
            borderRadius: t.radius.full,
            backgroundColor: t.colors.bg[spec.thumb],
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={spec.icon} size={d(16)} color={thumbIcon} />
        </View>
        {/* Figma sets whitespace-nowrap on both labels — mirror that exactly. */}
        <View>
          <Text
            variant="labelS"
            color={titleColor}
            numberOfLines={1}
            style={{ fontSize: d(12), lineHeight: d(16) }}
          >
            {spec.title}
          </Text>
          <Text
            variant="caption"
            color={subColor}
            numberOfLines={1}
            style={{ fontSize: d(12), lineHeight: d(16), opacity: 0.75 }}
          >
            {spec.sub}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default PartnerChip;
