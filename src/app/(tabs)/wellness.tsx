/**
 * Wellness — ported 1:1 from Figma node 79:227 (SRS §4.B Tab 4).
 *
 * The closing line is load-bearing, not decoration: a fitness tab sitting one
 * tap from a prescription is exactly where an aggregator starts to look like a
 * care provider. Wellness content is guidance; anything touching a prescribed
 * medicine routes back to the pharmacist.
 *
 * Everything with a number on this screen is read, not typed: the streak and
 * week dots come from finished sessions, hydration from today's log, the plan
 * tile from whichever day the programme serves next. See lib/wellness.ts.
 */
import React, { useMemo } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { TitleAppBar, SectionHeader } from '@/components/ui/AppBar';
import { Text } from '@/components/ui/Text';
import { Icon, type IconName } from '@/components/ui/Icon';
import {
  NUTRITION,
  PLAN_CARDS,
  READS,
  formatThousands,
  nextDay,
  programmeById,
  streakDays,
  weekDots,
  type Tone,
} from '@/lib/wellness';
import {
  selectGlasses,
  sessionDaysOf,
  sessionsDoneFor,
  useWellnessStore,
} from '@/features/wellness/store';

export default function Wellness() {
  const t = useTokens();
  const { d } = useDesignScale();
  const insets = useSafeAreaInsets();

  const history = useWellnessStore((s) => s.history);
  const glasses = useWellnessStore(selectGlasses);
  const active = useWellnessStore((s) => s.active);

  // Derived here, not in a selector — see `sessionDaysOf` in the store.
  const sessionDays = useMemo(() => sessionDaysOf(history), [history]);
  const streak = streakDays(sessionDays);
  const week = weekDots(sessionDays);
  const toGo = Math.max(0, NUTRITION.hydrationGoal - glasses);

  // The tiles carry programme facts, so they are filled in here rather than in
  // the content file — "45 min · 6 exercises" must match the routine screen.
  /**
   * Each tile describes the plan it opens: the day that plan serves next, or
   * where a session on it has got to. Mobility and Cardio previously carried
   * invented strings and all three opened the strength routine.
   */
  const plans = PLAN_CARDS.map((card) => {
    if (card.id === 'nutrition') {
      return { ...card, meta: `${formatThousands(NUTRITION.kcalTarget)} kcal target` };
    }
    const programme = programmeById(card.id);
    const done = sessionsDoneFor(history, programme.id);
    const mine = active?.programmeId === programme.id ? active : null;
    const day = mine
      ? programme.days.find((x) => x.id === mine.dayId) ?? nextDay(programme, done)
      : nextDay(programme, done);
    return {
      ...card,
      title: day.title,
      meta: mine
        ? `In progress · ${mine.index + 1} of ${day.exerciseIds.length}`
        : `${day.durationMin} min · ${day.exerciseIds.length} exercises`,
    };
  });

  const StatCard = ({
    tone,
    icon,
    value,
    unit,
    title,
    meta,
    onPress,
  }: {
    tone: Tone;
    icon: IconName;
    value: string;
    unit: string;
    title: string;
    meta: string;
    onPress?: () => void;
  }) => (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={`${value}${unit} ${title}. ${meta}`}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        backgroundColor: t.colors.bg[tone],
        borderRadius: d(28),
        padding: d(18),
        gap: d(10),
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <View
        style={{
          width: d(36),
          height: d(36),
          borderRadius: t.radius.full,
          backgroundColor: t.colors.bg.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={d(18)} tone="primary" />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: d(3) }}>
        <Text variant="numericL" color={t.colors.text.onBrand} style={{ fontSize: d(28), lineHeight: d(32) }}>
          {value}
        </Text>
        <Text variant="labelS" color={t.colors.text.onBrand} style={{ fontSize: d(12), lineHeight: d(16) }}>
          {unit}
        </Text>
      </View>
      <Text variant="labelM" color={t.colors.text.onBrand} style={{ fontSize: d(14), lineHeight: d(18) }}>
        {title}
      </Text>
      <Text
        variant="caption"
        color={t.colors.text.onBrand}
        style={{ opacity: 0.7, fontSize: d(12), lineHeight: d(16) }}
      >
        {meta}
      </Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + d(18),
          paddingHorizontal: d(24),
          paddingBottom: d(130) + insets.bottom,
          gap: d(18),
        }}
      >
        <TitleAppBar
          title="Wellness"
          showBack={false}
          actions={[{ icon: 'more', label: 'More options' }]}
        />

        {/* Streak hero — gold, radius 36 */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Current streak: ${streak} ${streak === 1 ? 'day' : 'days'} on plan. See all activity.`}
          onPress={() => router.push('/wellness-activity')}
          style={{
            backgroundColor: t.colors.bg.accentGold,
            borderRadius: d(36),
            paddingVertical: d(22),
            paddingHorizontal: d(24),
            gap: d(16),
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(12) }}>
            <Text
              variant="labelXS"
              color={t.colors.text.onBrand}
              style={{ flex: 1, opacity: 0.7, fontSize: d(11), lineHeight: d(14) }}
            >
              CURRENT STREAK
            </Text>
            <View
              style={{
                width: d(44),
                height: d(44),
                borderRadius: t.radius.full,
                backgroundColor: t.colors.bg.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="award" size={d(22)} tone="primary" />
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: d(10) }}>
            <Text
              variant="numericXL"
              color={t.colors.text.onBrand}
              style={{ fontSize: d(48), lineHeight: d(52) }}
            >
              {streak}
            </Text>
            <Text
              variant="headingM"
              color={t.colors.text.onBrand}
              style={{ fontSize: d(18), lineHeight: d(24) }}
            >
              {streak === 1 ? 'day on plan' : 'days on plan'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: d(8) }}>
            {week.map((w, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', gap: d(6) }}>
                <View
                  style={{
                    width: d(26),
                    height: d(26),
                    borderRadius: t.radius.full,
                    backgroundColor: w.done ? t.colors.bg.surface : 'transparent',
                    borderWidth: w.done ? 0 : t.size.border.medium,
                    borderColor: t.colors.text.onBrand,
                    alignItems: 'center',
                    justifyContent: 'center',
                    // Today, not yet trained, reads as pending rather than missed.
                    opacity: w.done || w.isToday ? 1 : 0.45,
                  }}
                >
                  {w.done ? <Icon name="check" size={d(14)} tone="brand" /> : null}
                </View>
                <Text
                  variant="caption"
                  color={t.colors.text.onBrand}
                  style={{ opacity: w.isToday ? 1 : 0.7, fontSize: d(12), lineHeight: d(16) }}
                >
                  {w.label}
                </Text>
              </View>
            ))}
          </View>
        </Pressable>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: d(14) }}>
          <StatCard
            tone="brand"
            icon="heart"
            value={String(NUTRITION.restingBpm.value)}
            unit="bpm"
            title="Resting heart rate"
            meta={NUTRITION.restingBpm.meta}
          />
          <StatCard
            tone="accentCream"
            icon="wellness"
            value={String(glasses)}
            unit={`/${NUTRITION.hydrationGoal}`}
            title="Hydration"
            meta={toGo === 0 ? 'Goal reached' : `${toGo} ${toGo === 1 ? 'glass' : 'glasses'} to go`}
            onPress={() => router.push('/nutrition')}
          />
        </View>

        <SectionHeader title="Today’s plan" onAction={() => router.push('/wellness-activity')} />

        <View style={{ gap: d(14) }}>
          {[plans.slice(0, 2), plans.slice(2, 4)].map((row, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: d(14) }}>
              {row.map((p) => (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${p.title}. ${p.meta}`}
                  onPress={() => router.push(p.href as never)}
                  style={({ pressed }) => ({
                    flex: 1,
                    backgroundColor: t.colors.bg[p.tone],
                    borderRadius: d(28),
                    padding: d(18),
                    gap: d(12),
                    opacity: pressed ? 0.9 : 1,
                  })}
                >
                  <View
                    style={{
                      width: d(36),
                      height: d(36),
                      borderRadius: t.radius.full,
                      backgroundColor: t.colors.bg.surface,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name={p.icon} size={d(18)} tone="primary" />
                  </View>
                  <Text
                    variant="labelL"
                    color={t.colors.text.onBrand}
                    style={{ fontSize: d(16), lineHeight: d(20) }}
                  >
                    {p.title}
                  </Text>
                  <Text
                    variant="caption"
                    color={t.colors.text.onBrand}
                    style={{ opacity: 0.7, fontSize: d(12), lineHeight: d(16) }}
                  >
                    {p.meta}
                  </Text>
                </Pressable>
              ))}
            </View>
          ))}
        </View>

        <SectionHeader title="Read next" onAction={() => router.push('/health-tips')} />

        {READS.map((r) => (
          <Pressable
            key={r.id}
            accessibilityRole="button"
            accessibilityLabel={`${r.title}. ${r.meta}`}
            onPress={() => router.push(`/article?id=${r.id}`)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: d(14),
              backgroundColor: t.colors.bg.surface,
              borderRadius: d(20),
              paddingLeft: d(14),
              paddingRight: d(16),
              paddingVertical: d(14),
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <View
              style={{
                width: d(44),
                height: d(44),
                borderRadius: t.radius.full,
                backgroundColor: t.colors.bg[r.tone],
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name={r.icon} size={d(20)} tone="primary" />
            </View>
            <View style={{ flex: 1, gap: d(3) }}>
              <Text variant="labelL" style={{ fontSize: d(16), lineHeight: d(20) }}>
                {r.title}
              </Text>
              <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
                {r.meta}
              </Text>
            </View>
            <Icon name="chevron-right" size={d(20)} tone="tertiary" />
          </Pressable>
        ))}

        <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
          General wellness guidance, not medical advice. Talk to your partner pharmacist or a
          clinician before changing how you take a prescribed medicine.
        </Text>
      </ScrollView>
    </View>
  );
}
