/**
 * Name-addressed icon wrapper.
 *
 * Icons.tsx is generated and exports one component per glyph plus an `Icons`
 * map. Components want `<Icon name="cart" />`, so the lookup lives here rather
 * than in the generated file.
 *
 * Note: the generated icons default to `currentColor`, which React Native SVG
 * does not resolve. This wrapper always passes a concrete colour — defaulting
 * to the active `icon/primary` token — so a glyph can never render invisible.
 */
import React from 'react';
import { Icons, type IconName } from '../Icons';
import { useTokens } from '@/theme/ThemeProvider';
import type { Theme } from '@/theme/tokens';

export type { IconName };

type IconTone = keyof Theme['colors']['icon'];

export type IconProps = {
  name: IconName;
  size?: number;
  /** Semantic token. Ignored when an explicit `color` is given. */
  tone?: IconTone;
  color?: string;
};

export function Icon({ name, size = 20, tone = 'primary', color }: IconProps) {
  const t = useTokens();
  const Cmp = Icons[name];
  if (!Cmp) {
    if (__DEV__) console.warn(`[Icon] unknown icon "${name}"`);
    return null;
  }
  return <Cmp size={size} color={color ?? t.colors.icon[tone]} />;
}

export default Icon;
