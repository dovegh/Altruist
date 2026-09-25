/**
 * Layout + surface primitives.
 *
 * Screen carries the global rules from the design system: 24pt gutter, 120pt
 * scroll bottom padding so content clears the floating tab bar, and safe-area
 * insets taken from the device rather than hardcoded.
 */
import React from 'react';
import { View, ScrollView, type ViewStyle, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '@/theme/ThemeProvider';
import type { Theme } from '@/theme/tokens';

type SurfaceTone = keyof Theme['colors']['bg'];

export function Card({
  children,
  tone = 'surface',
  radius = 'lg',
  padded = true,
  style,
}: {
  children?: React.ReactNode;
  tone?: SurfaceTone;
  radius?: keyof Theme['radius'];
  padded?: boolean;
  style?: ViewStyle;
}) {
  const t = useTokens();
  return (
    <View
      style={[
        {
          backgroundColor: t.colors.bg[tone],
          borderRadius: t.radius[radius],
          padding: padded ? t.spacing.lg : 0,
          gap: t.spacing.sm,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Row({
  children,
  gap = 'sm',
  align = 'center',
  style,
}: {
  children?: React.ReactNode;
  gap?: keyof Theme['spacing'];
  align?: ViewStyle['alignItems'];
  style?: ViewStyle;
}) {
  const t = useTokens();
  return (
    <View
      style={[{ flexDirection: 'row', alignItems: align, gap: t.spacing[gap] }, style]}
    >
      {children}
    </View>
  );
}

export function Stack({
  children,
  gap = 'sm',
  style,
}: {
  children?: React.ReactNode;
  gap?: keyof Theme['spacing'];
  style?: ViewStyle;
}) {
  const t = useTokens();
  return <View style={[{ gap: t.spacing[gap] }, style]}>{children}</View>;
}

/** Pushes siblings apart in a Row. */
export function Spacer() {
  return <View style={{ flex: 1 }} />;
}

export type ScreenProps = ScrollViewProps & {
  children?: React.ReactNode;
  /** Adds 120pt bottom padding so content clears the floating tab bar. */
  hasTabBar?: boolean;
  /** Extra bottom padding for a sticky footer, in points. */
  footerHeight?: number;
  gutter?: boolean;
  tone?: SurfaceTone;
};

export function Screen({
  children,
  hasTabBar = false,
  footerHeight = 0,
  gutter = true,
  tone = 'canvas',
  contentContainerStyle,
  ...rest
}: ScreenProps) {
  const t = useTokens();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.colors.bg[tone] }}
      contentContainerStyle={[
        {
          paddingTop: insets.top + t.spacing.md,
          paddingHorizontal: gutter ? t.spacing.xl : 0,
          paddingBottom:
            (hasTabBar ? 120 : t.spacing.xl) + footerHeight + insets.bottom,
          gap: t.spacing.lg,
        },
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      {...rest}
    >
      {children}
    </ScrollView>
  );
}

/** Non-scrolling screen shell for splash, lock and full-bleed states. */
export function FixedScreen({
  children,
  tone = 'canvas',
  gutter = true,
  style,
}: {
  children?: React.ReactNode;
  tone?: SurfaceTone;
  gutter?: boolean;
  style?: ViewStyle;
}) {
  const t = useTokens();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: t.colors.bg[tone],
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingHorizontal: gutter ? t.spacing.xl : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
