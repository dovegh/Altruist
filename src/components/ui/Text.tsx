/**
 * Typed text primitive. `variant` maps 1:1 onto the 19 Figma text styles and
 * `tone` onto the semantic text tokens — so a screen never names a font,
 * a size, or a hex value.
 */
import React from 'react';
import {
  Text as RNText,
  StyleSheet,
  type TextProps as RNTextProps,
  type TextStyle,
} from 'react-native';
import { useTokens } from '@/theme/ThemeProvider';
import { TYPE_SCALE } from '@/theme/useDesignScale';
import type { Theme } from '@/theme/tokens';

type Variant = keyof Theme['typography'];
type Tone = keyof Theme['colors']['text'];

export type TextProps = RNTextProps & {
  variant?: Variant;
  tone?: Tone;
  /** Escape hatch for a literal colour — brand marks and illustrations only. */
  color?: string;
  center?: boolean;
};

export function Text({
  variant = 'bodyM',
  tone = 'primary',
  color,
  center,
  style,
  ...rest
}: TextProps) {
  const t = useTokens();
  const base = t.typography[variant] as TextStyle;

  // Flatten first: screens pass the variant's own sizes back in through
  // `style` (`fontSize: d(14)`), and those win over `base`. Scaling has to
  // happen after that merge or it only ever touches the variant defaults,
  // which nothing on screen actually renders with.
  const merged = StyleSheet.flatten([
    base,
    { color: color ?? t.colors.text[tone] },
    center && { textAlign: 'center' as const },
    style,
  ]) as TextStyle;

  const scaled: TextStyle = {
    ...merged,
    ...(typeof merged.fontSize === 'number' && { fontSize: merged.fontSize * TYPE_SCALE }),
    ...(typeof merged.lineHeight === 'number' && { lineHeight: merged.lineHeight * TYPE_SCALE }),
    ...(typeof merged.letterSpacing === 'number' && {
      letterSpacing: merged.letterSpacing * TYPE_SCALE,
    }),
  };

  return <RNText {...rest} style={scaled} />;
}

export default Text;
