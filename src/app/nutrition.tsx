/**
 * Wellness — Nutrition — ported 1:1 from Figma node 146:423.
 *
 * Scroll content: V gap16, pad 64/24/60/24. Two stat cards, the food-and-
 * medicine interaction card, SUGGESTED TODAY meals, then the disclaimer.
 *
 * The interaction list is derived from the user's own order history, which is
 * why each line names the medicine it applies to. It is the one place in the
 * wellness tab that touches a prescription, so the disclaimer under it says
 * explicitly that these are general notes and the pharmacy confirms.
 *
 * The water card is the log: tapping it adds a glass. That is the whole
 * hydration feature — no separate screen for something done eight times a day.
 */
import React from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen } from '@/components/ui/FormScreen';
import { TitleAppBar } from '@/components/ui/AppBar';
import { MedicalDisclaimer } from '@/components/ui/Disclaimer';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { NUTRITION, formatThousands } from '@/lib/wellness';
import { selectGlasses, useWellnessStore } from '@/features/wellness/store';

export default function Nutrition() {
  const t = useTokens();
  const { d } = useDesignScale();
  const glasses = useWellnessStore(selectGlasses);
  const logGlass = useWellnessStore((s) => s.logGlass);
  const goal = NUTRITION.hydrationGoal;
  const atGoal = glasses >= goal;

  const stat = (
    value: string,
    unit: string,
    label: string,
    cream: boolean,
    onPress?: () => void,
    a11y?: string,
  ) => (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={a11y ?? `${value}${unit} ${label}`}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        gap: d(6),
        padding: d(18),
        borderRadius: d(24),
        backgroundColor: cream ? t.colors.bg.accentCream : t.colors.bg.surface,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: d(3) }}>
        <Text
          variant="numericL"
          color={cream ? t.colors.text.onBrand : t.colors.text.primary}
          style={{ fontSize: d(28), lineHeight: d(32) }}
        >
          {value}
        </Text>
        <Text
          variant="labelS"
          color={cream ? t.colors.text.onBrand : t.colors.text.primary}
          style={{ fontSize: d(12), lineHeight: d(16) }}
        >
          {unit}
        </Text>
      </View>
      <Text
        variant="caption"
        color={cream ? t.colors.text.onBrand : t.colors.text.primary}
        style={{ opacity: 0.7, fontSize: d(12), lineHeight: d(16) }}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <FormScreen gap={16} contentStyle={{ paddingBottom: d(60) }}>
      <TitleAppBar
        title="Nutrition"
        actions={[
          { icon: 'info', label: 'Health tips', onPress: () => router.push('/health-tips') },
        ]}
      />

      <View style={{ flexDirection: 'row', gap: d(12) }}>
        {stat(
          String(glasses),
          `/${goal}`,
          atGoal ? 'Water goal reached' : 'Glasses of water · tap to log one',
          true,
          atGoal ? undefined : () => logGlass(goal),
          atGoal
            ? `${glasses} of ${goal} glasses of water. Goal reached.`
            : `${glasses} of ${goal} glasses of water. Log a glass.`,
        )}
        {stat(formatThousands(NUTRITION.kcalTarget), 'kcal', 'Energy target today', false)}
      </View>

      {/* Food & medicine */}
      <View
        style={{
          gap: d(14),
          padding: d(18),
          borderRadius: d(24),
          backgroundColor: t.colors.bg.surface,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(10) }}>
          <Icon name="danger" size={d(20)} tone="warning" />
          <Text variant="labelL" style={{ flex: 1, fontSize: d(16), lineHeight: d(20) }}>
            Foods to watch with your current medicines
          </Text>
        </View>

        {NUTRITION.interactions.map((i) => (
          <View key={i.title} style={{ flexDirection: 'row', gap: d(12) }}>
            <View
              style={{
                width: d(8),
                height: d(8),
                borderRadius: t.radius.full,
                marginTop: d(6),
                backgroundColor: t.colors.icon.warning,
              }}
            />
            <View style={{ flex: 1, gap: d(3) }}>
              <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
                {i.title}
              </Text>
              <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
                {i.note}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <Text variant="labelXS" tone="tertiary" style={{ fontSize: d(11), lineHeight: d(14) }}>
        SUGGESTED TODAY
      </Text>

      {NUTRITION.meals.map((m) => (
        <View
          key={m.title}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: d(14),
            paddingVertical: d(12),
            paddingLeft: d(12),
            paddingRight: d(16),
            borderRadius: d(20),
            backgroundColor: t.colors.bg.surface,
          }}
        >
          <View
            style={{
              width: d(48),
              height: d(48),
              borderRadius: d(14),
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: t.colors.bg[m.tone],
            }}
          >
            <Icon name="wellness" size={d(20)} color={t.colors.text.onBrand} />
          </View>
          <View style={{ flex: 1, gap: d(3) }}>
            <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
              {m.title}
            </Text>
            <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
              {m.meta}
            </Text>
          </View>
        </View>
      ))}

      <MedicalDisclaimer body="Interaction notes are drawn from your current order history and are general guidance only. Confirm anything that affects your treatment with your partner pharmacy." />
    </FormScreen>
  );
}
