/**
 * Radio, Checkbox and Quantity Stepper — Figma page "Input & Form".
 *
 * All three are 24pt or smaller visually, which is below the 44pt minimum tap
 * target. None of them is tappable on its own: Radio and Checkbox expose
 * `ChoiceRow`, which makes the whole row the control, and the stepper's two
 * buttons carry `hitSlop`. Never render a bare Radio/Checkbox as the hit area.
 *
 * The dot and the tick scale in over `motion.fast`. These are 9pt and 15pt
 * marks inside a 24pt box — at that size a hard cut is genuinely easy to miss,
 * and the growth is what confirms the tap landed.
 */
import React, { useEffect } from 'react';
import { View, Pressable } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { motion } from '@/theme/tokens';
import { Text } from './Text';
import { Icon } from './Icon';

/** Scales a selection mark in and out instead of cutting. */
function useMarkScale(on: boolean) {
  const scale = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    scale.value = withTiming(on ? 1 : 0, {
      duration: motion.duration.fast,
      easing: Easing.bezier(...motion.easing.standard),
      reduceMotion: ReduceMotion.System,
    });
  }, [on, scale]);
  return useAnimatedStyle(() => ({ opacity: scale.value, transform: [{ scale: scale.value }] }));
}

/** 24pt circle. Selected fills brand with a 9pt knockout dot. */
export function Radio({ selected, disabled }: { selected: boolean; disabled?: boolean }) {
  const t = useTokens();
  const { d } = useDesignScale();
  const mark = useMarkScale(selected);
  return (
    <View
      style={{
        width: d(24),
        height: d(24),
        borderRadius: t.radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: selected
          ? disabled
            ? t.colors.bg.disabled
            : t.colors.bg.brand
          : 'transparent',
        borderWidth: selected ? 0 : 1.5,
        borderColor: disabled ? t.colors.border.subtle : t.colors.border.strong,
      }}
    >
      <Animated.View
        style={[
          {
            width: d(9),
            height: d(9),
            borderRadius: t.radius.full,
            backgroundColor: t.colors.text.onBrand,
          },
          mark,
        ]}
      />
    </View>
  );
}

/** 24pt square, radius 6. Checked fills brand with a 15pt check. */
export function Checkbox({ checked, disabled }: { checked: boolean; disabled?: boolean }) {
  const t = useTokens();
  const { d } = useDesignScale();
  const mark = useMarkScale(checked);
  return (
    <View
      style={{
        width: d(24),
        height: d(24),
        borderRadius: d(6),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: checked
          ? disabled
            ? t.colors.bg.disabled
            : t.colors.bg.brand
          : 'transparent',
        borderWidth: checked ? 0 : 1.5,
        borderColor: disabled ? t.colors.border.subtle : t.colors.border.strong,
      }}
    >
      <Animated.View style={mark}>
        <Icon name="check" size={d(15)} color={t.colors.icon.onBrand} />
      </Animated.View>
    </View>
  );
}

/**
 * A selectable row. The control is 24pt but the row is the tap target, and the
 * selected row lifts to `surface-raised` with a brand hairline so selection is
 * legible without relying on the 24pt glyph alone.
 */
export function ChoiceRow({
  kind = 'radio',
  selected,
  title,
  subtitle,
  trailing,
  disabled,
  onPress,
}: {
  kind?: 'radio' | 'checkbox';
  selected: boolean;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const t = useTokens();
  const { d } = useDesignScale();
  return (
    <Pressable
      accessibilityRole={kind === 'radio' ? 'radio' : 'checkbox'}
      accessibilityState={{ selected, checked: selected, disabled: !!disabled }}
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: d(14),
        minHeight: d(72),
        paddingHorizontal: d(16),
        paddingVertical: d(16),
        borderRadius: d(14),
        backgroundColor: t.colors.bg.surface,
        borderWidth: 1,
        borderColor: selected ? t.colors.border.brand : 'transparent',
        opacity: pressed ? 0.85 : disabled ? 0.5 : 1,
      })}
    >
      {kind === 'radio' ? (
        <Radio selected={selected} disabled={disabled} />
      ) : (
        <Checkbox checked={selected} disabled={disabled} />
      )}
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
      {trailing}
    </Pressable>
  );
}

/** 140×52 pill: 40pt minus button, 40pt value, 40pt brand plus button. */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  label = 'Quantity',
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  label?: string;
}) {
  const t = useTokens();
  const { d } = useDesignScale();

  const step = (delta: number) => {
    const next = Math.min(max, Math.max(min, value + delta));
    if (next !== value) onChange(next);
  };

  const btn = (icon: 'minus' | 'add', delta: number, atLimit: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={delta < 0 ? `Decrease ${label}` : `Increase ${label}`}
      accessibilityState={{ disabled: atLimit }}
      disabled={atLimit}
      hitSlop={6}
      onPress={() => step(delta)}
      style={({ pressed }) => ({
        width: d(40),
        height: d(40),
        borderRadius: t.radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: delta < 0 ? t.colors.bg.surface : t.colors.bg.brand,
        // 0.4 reads as "absent" rather than "unavailable" on the dark palette,
        // where the minus button is already low-contrast against its well.
        opacity: atLimit ? 0.55 : pressed ? 0.85 : 1,
      })}
    >
      <Icon
        name={icon}
        size={d(18)}
        color={delta < 0 ? t.colors.icon.primary : t.colors.icon.onBrand}
      />
    </Pressable>
  );

  return (
    <View
      accessibilityLabel={`${label}: ${value}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: d(4),
        padding: d(6),
        borderRadius: t.radius.full,
        // A WELL, not a raised surface. In the light palette bg/surface-raised
        // and bg/surface are both neutral/0, so a stepper sitting on a card had
        // no visible track at all and the minus button no visible shape —
        // bg/surface-sunken is the only fill that reads against BOTH.
        backgroundColor: t.colors.bg.surfaceSunken,
        alignSelf: 'flex-start',
      }}
    >
      {btn('minus', -1, value <= min)}
      <Text
        variant="numericM"
        center
        style={{ width: d(40), fontSize: d(20), lineHeight: d(26) }}
      >
        {value}
      </Text>
      {btn('add', 1, value >= max)}
    </View>
  );
}
