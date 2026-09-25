/**
 * Status screen scaffold — Figma page "System States".
 *
 * Every terminal screen in the app shares one shape: a haloed feature icon
 * (an outer tinted ring with a solid inner disc), a centred head, an optional
 * detail card, and one or two actions.
 *
 * Tone maps to the semantic palette, and the mapping is the point:
 *   brand   — it worked
 *   danger  — it failed and the user must act
 *   warning — degraded but recoverable (offline)
 *   neutral — nothing is wrong, there is just nothing here (empty states)
 *
 * An empty cart is NOT an error. It gets the neutral surface treatment so the
 * app does not shout at someone who simply has not added anything yet.
 *
 * Motion follows the same split. A `brand` outcome is the only one that springs;
 * danger, warning and neutral fade in. The design system is explicit that a
 * refusal must not feel playful, and the halo is the largest thing on these
 * screens — bouncing it at someone whose payment was declined would be the
 * loudest possible way to get the tone wrong.
 */
import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen } from './FormScreen';
import { Appear, Celebrate } from './Motion';
import { Text } from './Text';
import { Icon, type IconName } from './Icon';

export type StatusTone = 'brand' | 'danger' | 'warning' | 'neutral';

export function StatusHalo({
  icon,
  tone,
  outer = 160,
  inner = 116,
  glyph = 51,
}: {
  icon: IconName;
  tone: StatusTone;
  outer?: number;
  inner?: number;
  glyph?: number;
}) {
  const t = useTokens();
  const { d } = useDesignScale();

  const ring = {
    brand: t.colors.bg.brandSubtle,
    danger: t.colors.bg.dangerSubtle,
    warning: t.colors.bg.warningSubtle,
    neutral: t.colors.bg.surface,
  }[tone];

  const disc = {
    brand: t.colors.bg.brand,
    danger: t.colors.bg.danger,
    warning: t.colors.bg.accentGold,
    neutral: t.colors.bg.surface,
  }[tone];

  const glyphColor =
    tone === 'neutral'
      ? t.colors.icon.primary
      : tone === 'danger'
        ? t.colors.text.onSolid
        : t.colors.icon.onBrand;

  // A flat halo — no inner disc — when the tone is neutral or the caller sizes
  // the inner circle to the outer one (Figma's "Feature" frames on Empty and
  // Offline are a single tinted circle).
  const flat = tone === 'neutral' || inner >= outer;

  if (flat) {
    const flatGlyph =
      tone === 'warning'
        ? t.colors.icon.warning
        : tone === 'danger'
          ? t.colors.icon.danger
          : tone === 'brand'
            ? t.colors.icon.brand
            : t.colors.icon.primary;
    return (
      <View
        style={{
          width: d(outer),
          height: d(outer),
          borderRadius: t.radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: ring,
          alignSelf: 'center',
        }}
      >
        <Icon name={icon} size={d(glyph)} color={flatGlyph} />
      </View>
    );
  }

  return (
    <View
      style={{
        width: d(outer),
        height: d(outer),
        borderRadius: t.radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: ring,
        alignSelf: 'center',
      }}
    >
      <View
        style={{
          width: d(inner),
          height: d(inner),
          borderRadius: t.radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: disc,
        }}
      >
        <Icon name={icon} size={d(glyph)} color={glyphColor} />
      </View>
    </View>
  );
}

/** 96pt ring with a rotating brand arc — the app's only indeterminate spinner. */
export function Spinner({ size = 96 }: { size?: number }) {
  const t = useTokens();
  const { d } = useDesignScale();
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Working"
      style={{ width: d(size), height: d(size), alignSelf: 'center' }}
    >
      <View
        style={{
          position: 'absolute',
          width: d(size),
          height: d(size),
          borderRadius: t.radius.full,
          borderWidth: d(8),
          borderColor: t.colors.border.subtle,
        }}
      />
      <Animated.View
        style={{
          width: d(size),
          height: d(size),
          borderRadius: t.radius.full,
          borderWidth: d(8),
          borderColor: 'transparent',
          borderTopColor: t.colors.border.brand,
          borderRightColor: t.colors.border.brand,
          transform: [{ rotate }],
        }}
      />
    </View>
  );
}

export function StatusScreen({
  icon,
  tone,
  hero,
  title,
  body,
  outer,
  inner,
  glyph,
  gap = 22,
  paddingTop = 150,
  titleSize = 28,
  children,
  actions,
}: {
  icon?: IconName;
  tone?: StatusTone;
  /** Replaces the halo — used by the loading screens to show a Spinner. */
  hero?: React.ReactNode;
  title: string;
  body: string;
  outer?: number;
  inner?: number;
  glyph?: number;
  gap?: number;
  paddingTop?: number;
  /** 28 for the Bold display head, 24 for the SemiBold heading head. */
  titleSize?: 24 | 28;
  /** Detail card between the head and the actions. */
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const { d } = useDesignScale();

  return (
    <FormScreen gap={gap} contentStyle={{ paddingTop: d(paddingTop), paddingBottom: d(40) }}>
      {hero ??
        (icon && tone ? (
          <Celebrate calm={tone !== 'brand'}>
            <StatusHalo icon={icon} tone={tone} outer={outer} inner={inner} glyph={glyph} />
          </Celebrate>
        ) : null)}

      <Appear delay={120}>
        <View style={{ gap: d(10) }}>
          <Text
            variant={titleSize === 28 ? 'displayS' : 'headingXL'}
            center
            style={{ fontSize: d(titleSize), lineHeight: d(titleSize === 28 ? 32 : 30) }}
          >
            {title}
          </Text>
          <Text
            variant={titleSize === 28 ? 'bodyL' : 'bodyM'}
            tone="secondary"
            center
            style={{
              fontSize: d(titleSize === 28 ? 16 : 14),
              lineHeight: d(titleSize === 28 ? 24 : 21),
            }}
          >
            {body}
          </Text>
        </View>
      </Appear>

      {children ? <Appear delay={200}>{children}</Appear> : null}
      {actions ? <Appear delay={280}>{actions}</Appear> : null}
    </FormScreen>
  );
}
