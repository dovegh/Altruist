/**
 * Avatar — Figma component set on page "Avatar" (Size x Type).
 *
 * A photo if there is one, else an illustration (`preset`, see
 * `components/avatars`), else initials on bg/brand-subtle. Sizes follow
 * `size.avatar`: xs 28 · sm 32 · md 44 · lg 56 · xl 72.
 */
import React from 'react';
import { View, Image } from 'react-native';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { AvatarArt, isAvatarPreset } from '@/components/avatars';
import { Text } from './Text';

export function Avatar({
  initials,
  uri,
  preset,
  size = 44,
  label,
}: {
  initials: string;
  uri?: string;
  /** An illustration id. Unknown ids (from a newer app) fall back to initials. */
  preset?: string;
  size?: number;
  label?: string;
}) {
  const t = useTokens();
  const { d } = useDesignScale();
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={label ?? initials}
      style={{
        width: d(size),
        height: d(size),
        borderRadius: t.radius.full,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: t.colors.bg.brandSubtle,
      }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
      ) : isAvatarPreset(preset) ? (
        <AvatarArt preset={preset} />
      ) : (
        <Text
          variant="labelL"
          tone="brand"
          style={{ fontSize: d(size * 0.34), lineHeight: d(size * 0.42) }}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}

export default Avatar;
