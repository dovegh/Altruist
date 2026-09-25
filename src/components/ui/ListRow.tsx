/**
 * List Row, Icon Tile and Toggle — Figma nodes 37:35, 29:51.
 *
 * List Row doc: "Settings, payment methods, addresses, transactions. Height is
 * content-driven but never below 72pt, keeping the whole row a comfortable tap
 * target."
 *
 * Toggle doc: "52x32 visual, but give it a 44px minimum tap area in code."
 * The knob slides and the track cross-fades over `motion.fast`. A switch that
 * teleports between states reads as a re-render rather than as something the
 * user just did.
 *
 * IconTile carries the hue-as-identity rule: a tinted rounded square that makes
 * a long menu scannable. Never use it on anything that reports state — that is
 * the semantic palette's job, and the distinction only survives if decoration
 * does not borrow the same colours.
 */
import React, { useEffect } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { motion } from '@/theme/tokens';
import { Text } from './Text';
import { Icon, type IconName } from './Icon';

/**
 * Hues are named after the token pair they bind to — `mint` reads
 * `tile.mintBg` / `tile.mintIcon` — so the palette lives in exactly one place.
 *
 * This used to be a local table of twelve hex pairs that happened to be
 * byte-identical to `colors.tile`. It was not a shortcut, it was a second
 * source of truth: every one of those literals would have kept its old value
 * through a palette change, and the divergence would have shown up as a tile
 * that no longer matched the rest of the app.
 */
export type TileHue = 'mint' | 'blue' | 'gold' | 'coral' | 'pink' | 'teal';

export function IconTile({
  name,
  hue = 'teal',
  size = 44,
}: {
  name: IconName;
  hue?: TileHue;
  size?: number;
}) {
  const t = useTokens();
  const { d } = useDesignScale();
  const bg = t.colors.tile[`${hue}Bg`];
  const fg = t.colors.tile[`${hue}Icon`];
  return (
    <View
      style={{
        width: d(size),
        height: d(size),
        borderRadius: d(14),
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={name} size={d(size * 0.4545)} color={fg} />
    </View>
  );
}

export function Toggle({
  value,
  onValueChange,
  disabled,
  label,
}: {
  value: boolean;
  onValueChange?: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  const t = useTokens();
  const { d } = useDesignScale();
  const on = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    on.value = withTiming(value ? 1 : 0, {
      duration: motion.duration.fast,
      easing: Easing.bezier(...motion.easing.standard),
      reduceMotion: ReduceMotion.System,
    });
  }, [value, on]);

  const offTrack = disabled ? t.colors.bg.disabled : t.colors.bg.surfaceSunken;
  const onTrack = disabled ? t.colors.bg.disabled : t.colors.bg.brand;
  const travel = d(52) - d(3) * 2 - d(26);

  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.value, [0, 1], [offTrack, onTrack]),
  }));
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: on.value * travel }] }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => onValueChange?.(!value)}
      // 52x32 visual, 44pt minimum tap area.
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      <Animated.View
        style={[
          {
            width: d(52),
            height: d(32),
            borderRadius: t.radius.full,
            justifyContent: 'center',
            paddingHorizontal: d(3),
          },
          track,
        ]}
      >
        <Animated.View
          style={[
            {
              width: d(26),
              height: d(26),
              borderRadius: t.radius.full,
              backgroundColor: value ? t.colors.bg.surface : t.colors.bg.surfaceRaised,
            },
            knob,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

export type ListRowProps = {
  title: string;
  subtitle?: string;
  icon?: IconName;
  hue?: TileHue;
  value?: string;
  trailing?: React.ReactNode;
  chevron?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
};

export function ListRow({
  title,
  subtitle,
  icon,
  hue,
  value,
  trailing,
  chevron = false,
  onPress,
  style,
}: ListRowProps) {
  const t = useTokens();
  const { d } = useDesignScale();

  const body = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: d(14),
          backgroundColor: t.colors.bg.surface,
          borderRadius: d(14),
          paddingLeft: d(14),
          paddingRight: d(16),
          paddingVertical: d(14),
          // never below 72pt — the whole row is the tap target
          minHeight: d(72),
        },
        style,
      ]}
    >
      {icon ? <IconTile name={icon} hue={hue} size={44} /> : null}
      <View style={{ flex: 1, gap: d(3) }}>
        <Text variant="labelL" style={{ fontSize: d(16), lineHeight: d(20) }}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodyS" tone="secondary" style={{ fontSize: d(13), lineHeight: d(19) }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
          {value}
        </Text>
      ) : null}
      {trailing}
      {chevron ? <Icon name="chevron-right" size={d(20)} tone="tertiary" /> : null}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      {body}
    </Pressable>
  );
}

export default ListRow;
