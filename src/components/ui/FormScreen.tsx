/**
 * The auth/form screen scaffold, matching the "Content" frame every Figma auth
 * screen shares: a vertical stack in the 24pt gutter, starting 18pt below the
 * status bar and ending 40pt above the bottom.
 *
 * Two things it does that a bare ScrollView does not:
 *
 * - `behavior="padding"` keyboard avoidance, because every screen using this is
 *   a text-entry screen and a covered submit button is a dead end.
 * - `StickyFooter` for the screens whose primary action is pinned rather than
 *   scrolled (Verify Phone, Checkout). The footer sits on `bg/surface` so it
 *   reads as a separate plane from the canvas when content scrolls under it.
 */
import React from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { Celebrate } from './Motion';

export function FormScreen({
  children,
  gap = 20,
  /** Extra bottom room so a StickyFooter never covers the last element. */
  footerHeight = 0,
  center = false,
  contentStyle,
}: {
  children: React.ReactNode;
  gap?: number;
  footerHeight?: number;
  center?: boolean;
  contentStyle?: ViewStyle;
}) {
  const t = useTokens();
  const { d } = useDesignScale();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          {
            flexGrow: center ? 1 : undefined,
            justifyContent: center ? 'center' : undefined,
            paddingTop: insets.top + d(18),
            paddingHorizontal: d(24),
            paddingBottom: d(40) + footerHeight + insets.bottom,
            gap: d(gap),
          },
          contentStyle,
        ]}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Pinned action bar — Figma "Footer": bg/surface, 16/24/44/24, gap 8. */
export function StickyFooter({ children }: { children: React.ReactNode }) {
  const t = useTokens();
  const { d } = useDesignScale();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        backgroundColor: t.colors.bg.surface,
        paddingTop: d(16),
        paddingHorizontal: d(24),
        paddingBottom: Math.max(insets.bottom, d(20)) + d(24),
        gap: d(8),
      }}
    >
      {children}
    </View>
  );
}

/**
 * The large circular glyph on confirmation screens (Check Your Email, Password
 * Changed, Success). `tone="brand"` is the completed state; `tone="subtle"` is
 * in-progress.
 *
 * Entrance defaults to a calm fade. Pass `celebrate` only where the outcome is
 * genuinely good news — the design system forbids a bounce on anything that
 * reports a refusal, a deletion or a failure.
 */
export function FeatureIcon({
  children,
  size = 120,
  tone = 'brand',
  ring = false,
  celebrate = false,
}: {
  children: React.ReactNode;
  size?: number;
  tone?: 'brand' | 'subtle' | 'danger' | 'warning';
  ring?: boolean;
  celebrate?: boolean;
}) {
  const t = useTokens();
  const { d } = useDesignScale();
  const bg =
    tone === 'brand'
      ? t.colors.bg.brand
      : tone === 'danger'
        ? t.colors.bg.dangerSubtle
        : tone === 'warning'
          ? t.colors.bg.warningSubtle
          : t.colors.bg.brandSubtle;
  return (
    <Celebrate calm={!celebrate}>
      <View
        style={{
          width: d(size),
          height: d(size),
          borderRadius: t.radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bg,
          borderWidth: ring ? 2 : 0,
          borderColor: t.colors.border.brand,
        }}
      >
        {children}
      </View>
    </Celebrate>
  );
}
