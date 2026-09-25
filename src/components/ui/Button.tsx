/**
 * Button — mirrors the Figma component set (Variant x Size x State).
 *
 * Two rules carried over from the design system, both load-bearing:
 *
 * 1. Mint is a LIGHT surface. Primary buttons take dark ink (text/on-brand).
 *    White on mint measures 1.8:1 and fails AA outright.
 * 2. Every size clears the 44pt minimum touch target, including Size=Small —
 *    the small variant is visually 36pt but padded out to 44pt of hit area.
 */
import React from 'react';
import {
  Pressable,
  ActivityIndicator,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { Text } from './Text';
import { Icon, type IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger';
export type ButtonSize = 'small' | 'medium' | 'large';

export type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconLeading?: IconName;
  iconTrailing?: IconName;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
};

/** Verbatim from the Figma Button set — height, horizontal padding, gap, label style. */
const SIZES = {
  small: { height: 36, padH: 16, gap: 8, variant: 'labelM', icon: 16, fs: 14, lh: 18 },
  medium: { height: 48, padH: 24, gap: 8, variant: 'labelL', icon: 18, fs: 16, lh: 20 },
  large: { height: 56, padH: 24, gap: 8, variant: 'labelL', icon: 20, fs: 16, lh: 20 },
} as const;

export function Button({
  label,
  variant = 'primary',
  size = 'medium',
  iconLeading,
  iconTrailing,
  loading = false,
  fullWidth = true,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const t = useTokens();
  const { d } = useDesignScale();
  const s = SIZES[size];
  const isDisabled = disabled || loading;

  const palette = (pressed: boolean) => {
    if (isDisabled) {
      // Tertiary stays transparent when disabled — it has no box to grey out.
      return {
        bg: variant === 'tertiary' ? 'transparent' : t.colors.bg.disabled,
        fg: t.colors.text.disabled,
        border: variant === 'secondary' ? t.colors.border.subtle : 'transparent',
      };
    }
    switch (variant) {
      case 'primary':
        return {
          bg: pressed ? t.colors.bg.brandPressed : t.colors.bg.brand,
          fg: t.colors.text.onBrand,
          border: 'transparent',
        };
      case 'secondary':
        return {
          bg: pressed ? t.colors.bg.surfaceSunken : t.colors.bg.surfaceRaised,
          fg: t.colors.text.primary,
          border: t.colors.border.default,
        };
      case 'tertiary':
        return {
          bg: pressed ? t.colors.bg.surface : 'transparent',
          fg: t.colors.text.brand,
          border: 'transparent',
        };
      case 'danger':
        return {
          bg: pressed ? t.colors.bg.dangerSubtle : t.colors.bg.danger,
          // Coral is a DARK surface — light ink, unlike mint.
          fg: t.colors.text.onSolid,
          border: 'transparent',
        };
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      accessibilityLabel={label}
      disabled={isDisabled}
      // keeps the 44pt target even when the visual box is 36pt
      hitSlop={size === 'small' ? 4 : 0}
      style={({ pressed }) => {
        const c = palette(pressed);
        return [
          {
            height: d(s.height),
            paddingHorizontal: d(s.padH),
            borderRadius: t.radius.full,
            backgroundColor: c.bg,
            borderWidth: variant === 'secondary' ? 1 : 0,
            borderColor: c.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: d(s.gap),
            alignSelf: fullWidth ? 'stretch' : 'flex-start',
            opacity: pressed && variant === 'tertiary' ? 0.9 : 1,
          } as ViewStyle,
          style,
        ];
      }}
      {...rest}
    >
      {({ pressed }: { pressed: boolean }) => {
        const c = palette(pressed);
        return (
          <>
            {loading ? (
              <ActivityIndicator size="small" color={c.fg} />
            ) : (
              <>
                {iconLeading ? <Icon name={iconLeading} size={d(s.icon)} color={c.fg} /> : null}
                <Text
                  variant={s.variant}
                  color={c.fg}
                  numberOfLines={1}
                  style={{ fontSize: d(s.fs), lineHeight: d(s.lh) }}
                >
                  {label}
                </Text>
                {iconTrailing ? <Icon name={iconTrailing} size={d(s.icon)} color={c.fg} /> : null}
              </>
            )}
          </>
        );
      }}
    </Pressable>
  );
}

/** Circular icon-only button — the round controls used across hero bars. */
export function IconButton({
  name,
  onPress,
  size = 44,
  tone = 'surface',
  accessibilityLabel,
}: {
  name: IconName;
  onPress?: () => void;
  size?: number;
  tone?: 'surface' | 'brand' | 'raised';
  accessibilityLabel: string;
}) {
  const t = useTokens();
  const { d } = useDesignScale();
  const bg =
    tone === 'brand'
      ? t.colors.bg.brand
      : tone === 'raised'
        ? t.colors.bg.surfaceRaised
        : t.colors.bg.surface;
  const fg = tone === 'brand' ? t.colors.icon.onBrand : t.colors.icon.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => ({
        width: d(size),
        height: d(size),
        borderRadius: t.radius.full,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Icon name={name} size={d(Math.round(size * 0.45))} color={fg} />
    </Pressable>
  );
}

/** Neutral spacer used by sticky footers so content never sits under the button. */
export function ButtonRow({ children }: { children: React.ReactNode }) {
  const t = useTokens();
  return <View style={{ flexDirection: 'row', gap: t.spacing.sm }}>{children}</View>;
}

export default Button;
