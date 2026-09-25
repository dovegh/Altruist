/**
 * Skeleton blocks — Figma "Loading — Catalog Skeleton".
 *
 * Design note carried over verbatim: "Skeletons shimmer at motion/slow on a
 * 1.6s loop. Never show a spinner where a skeleton can show layout."
 *
 * A skeleton is bg/surface-raised on bg/surface, and it mirrors the real card's
 * geometry — same radius, same padding, same block sizes — so nothing shifts
 * when the data lands.
 */
import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, type ViewStyle } from 'react-native';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';

/** Shared 1.6s opacity loop; wrap a whole skeleton tree in one of these. */
export function Shimmer({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) }, style]}
    >
      {children}
    </Animated.View>
  );
}

export function SkeletonBlock({
  width,
  height,
  radius = 6,
  opacity = 1,
  style,
}: {
  width?: number | `${number}%`;
  height: number;
  radius?: number;
  opacity?: number;
  style?: ViewStyle;
}) {
  const t = useTokens();
  const { d } = useDesignScale();
  return (
    <View
      style={[
        {
          width: typeof width === 'number' ? d(width) : width,
          height: d(height),
          borderRadius: radius >= 999 ? 999 : d(radius),
          backgroundColor: t.colors.bg.surfaceRaised,
          opacity,
        },
        style,
      ]}
    />
  );
}

/** One product card placeholder — mirrors ProductCard's box exactly. */
export function ProductCardSkeleton() {
  const t = useTokens();
  const { d } = useDesignScale();
  return (
    <View
      style={{
        flex: 1,
        gap: d(10),
        paddingTop: d(12),
        paddingHorizontal: d(12),
        paddingBottom: d(16),
        borderRadius: d(28),
        backgroundColor: t.colors.bg.surface,
      }}
    >
      <SkeletonBlock width="100%" height={118} radius={20} />
      <SkeletonBlock width={84} height={16} />
      <SkeletonBlock width={130} height={12} opacity={0.7} />
      <SkeletonBlock width={62} height={20} />
    </View>
  );
}
