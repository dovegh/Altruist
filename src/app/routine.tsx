/**
 * Wellness — Routine Detail — ported 1:1 from Figma node 90:208.
 *
 * A 306pt blue hero (eyebrow, title, three pill facts) with two floating 44pt
 * controls, then scroll content (V gap16, pad 22/24/140/24): a progress card,
 * today's exercises, equipment chips, and the safety note. Footer pins
 * Today / 45 min beside Start session.
 *
 * Completed exercises invert: brand-subtle circle with a check, secondary
 * title. That is the only state difference — the row keeps its position so the
 * session reads as a list being worked through, not a list being consumed.
 *
 * Which day is "today" is the programme's call, not the screen's: it cycles
 * upper / lower by how many sessions are done. A session left half-finished is
 * resumed, not restarted — the footer says so.
 */
import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { StickyFooter } from '@/components/ui/FormScreen';
import { FilterChip } from '@/components/ui/Product';
import { MedicalDisclaimer } from '@/components/ui/Disclaimer';
import { ProgressBar, Stagger } from '@/components/ui/Motion';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Icon, type IconName } from '@/components/ui/Icon';
import { MovementFigure } from '@/components/MovementFigure';
import { equipmentFor, nextDay, programmeById, resolveExercises } from '@/lib/wellness';
import { sessionsDoneFor, useWellnessStore } from '@/features/wellness/store';

export default function RoutineDetail() {
  const t = useTokens();
  const { d } = useDesignScale();
  const insets = useSafeAreaInsets();

  /** Which plan. Absent means the strength programme, the app's default. */
  const { id } = useLocalSearchParams<{ id?: string }>();
  const PROGRAMME = programmeById(id);

  const history = useWellnessStore((s) => s.history);
  const sessionsDone = sessionsDoneFor(history, PROGRAMME.id);
  const active = useWellnessStore((s) => s.active);
  const saved = useWellnessStore((s) => s.saved.includes(PROGRAMME.id));
  const toggleSaved = useWellnessStore((s) => s.toggleSaved);
  const restartProgramme = useWellnessStore((s) => s.restartProgramme);

  // Only a session on THIS plan counts as in progress here — otherwise opening
  // Mobility mid-strength-session would claim the strength work as its own.
  const mine = active?.programmeId === PROGRAMME.id ? active : null;

  const total = PROGRAMME.sessionsTotal;
  const left = total - sessionsDone;
  const complete = left <= 0 && !mine;
  const day = mine
    ? PROGRAMME.days.find((x) => x.id === mine.dayId) ?? nextDay(PROGRAMME, sessionsDone)
    : nextDay(PROGRAMME, sessionsDone);
  const exercises = resolveExercises(day, mine?.swaps ?? {});
  const equipment = equipmentFor(exercises);

  const eyebrow = complete
    ? `${PROGRAMME.category} · PROGRAMME COMPLETE`
    : `${PROGRAMME.category} · SESSION ${Math.min(sessionsDone + 1, total)} OF ${total}`;
  const facts = [`${day.durationMin} min`, `${exercises.length} exercises`, PROGRAMME.level];

  const round = (icon: IconName, label: string, onPress?: () => void, on?: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!on }}
      onPress={onPress}
      style={({ pressed }) => ({
        width: d(44),
        height: d(44),
        borderRadius: t.radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: t.colors.bg.surface,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Icon name={icon} size={d(20)} color={on ? t.colors.icon.brand : t.colors.icon.primary} />
    </Pressable>
  );

  const startLabel = complete ? 'Restart programme' : mine ? 'Resume session' : 'Start session';
  const onStart = () => {
    if (complete) {
      restartProgramme(PROGRAMME.id);
      return;
    }
    router.push(`/routine-session?id=${PROGRAMME.id}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: d(20) }}
      >
        {/* Hero */}
        <View
          style={{
            minHeight: d(306),
            justifyContent: 'flex-end',
            gap: d(12),
            paddingHorizontal: d(24),
            paddingBottom: d(22),
            backgroundColor: t.colors.bg.accentBlue,
            overflow: 'hidden',
          }}
        >
          <View style={{ position: 'absolute', right: d(-40), top: d(40), opacity: 0.1 }}>
            <Icon name="award" size={d(220)} color={t.colors.text.onSolid} />
          </View>

          <Text
            variant="labelXS"
            color={t.colors.text.onSolid}
            style={{ opacity: 0.8, fontSize: d(11), lineHeight: d(14) }}
          >
            {eyebrow}
          </Text>
          <Text
            variant="displayS"
            color={t.colors.text.onSolid}
            style={{ fontSize: d(28), lineHeight: d(32) }}
          >
            {PROGRAMME.title}
          </Text>
          <Text
            variant="bodyM"
            color={t.colors.text.onSolid}
            style={{ opacity: 0.85, fontSize: d(14), lineHeight: d(21) }}
          >
            {PROGRAMME.summary}
          </Text>
          <View style={{ flexDirection: 'row', gap: d(8) }}>
            {facts.map((f) => (
              <View
                key={f}
                style={{
                  paddingVertical: d(6),
                  paddingHorizontal: d(12),
                  borderRadius: t.radius.full,
                  backgroundColor: t.colors.bg.surface,
                }}
              >
                <Text variant="labelS" style={{ fontSize: d(12), lineHeight: d(16) }}>
                  {f}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View
          style={{
            position: 'absolute',
            left: d(24),
            right: d(24),
            top: insets.top + d(16),
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          {round('arrow-left', 'Go back', () => router.back())}
          {round(
            'heart',
            saved ? 'Remove from saved routines' : 'Save this routine',
            () => toggleSaved(PROGRAMME.id),
            saved,
          )}
        </View>

        {/* Body */}
        <View style={{ gap: d(16), paddingTop: d(22), paddingHorizontal: d(24) }}>
          {/* Progress */}
          <View
            style={{
              gap: d(12),
              paddingVertical: d(18),
              paddingHorizontal: d(20),
              borderRadius: d(24),
              backgroundColor: t.colors.bg.surface,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(12) }}>
              <Text variant="labelM" style={{ flex: 1, fontSize: d(14), lineHeight: d(18) }}>
                Programme progress
              </Text>
              <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
                {left <= 0 ? 'All sessions done' : `${left} ${left === 1 ? 'session' : 'sessions'} left`}
              </Text>
            </View>
            <View
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: total, now: sessionsDone }}
            >
              <ProgressBar
                value={sessionsDone / total}
                height={d(8)}
                track={t.colors.bg.surfaceSunken}
                fill={t.colors.bg.brand}
              />
            </View>
          </View>

          <Text variant="labelXS" tone="tertiary" style={{ fontSize: d(11), lineHeight: d(14) }}>
            {mine ? 'IN PROGRESS' : 'TODAY'} · {day.title.toUpperCase()}
          </Text>

          <Stagger step={45}>
            {exercises.map((e, i) => {
              const done = !!mine?.completed.includes(e.id);
              const current = !!mine && mine.index === i;
              const meta = done
                ? `${e.sets} × ${e.reps} · done`
                : current
                  ? `${e.sets} × ${e.reps} · set ${mine.setsDone + 1} of ${e.sets}`
                  : `${e.sets} × ${e.reps}`;
              return (
                <Pressable
                  key={e.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${e.name}. ${meta}`}
                  onPress={() => router.push(`/exercise?id=${e.id}`)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: d(14),
                    paddingVertical: d(12),
                    paddingLeft: d(14),
                    paddingRight: d(16),
                    borderRadius: d(18),
                    backgroundColor: t.colors.bg.surface,
                    borderWidth: current ? t.size.border.thin : 0,
                    borderColor: t.colors.border.brand,
                    opacity: pressed ? 0.9 : 1,
                  })}
                >
                  {/* A thumbnail of the movement rather than the same glyph on
                      every row — the list becomes scannable by shape. */}
                  <View
                    style={{
                      width: d(56),
                      height: d(40),
                      borderRadius: d(12),
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      backgroundColor: done ? t.colors.bg.brandSubtle : t.colors.bg.surfaceRaised,
                    }}
                  >
                    {done ? (
                      <Icon name="check" size={d(18)} tone="brand" />
                    ) : (
                      <MovementFigure
                        pattern={e.pattern}
                        size={d(56)}
                        colour={t.colors.icon.secondary}
                        muted={t.colors.border.subtle}
                      />
                    )}
                  </View>
                  <View style={{ flex: 1, gap: d(3) }}>
                    <Text
                      variant="labelM"
                      tone={done ? 'secondary' : 'primary'}
                      style={{ fontSize: d(14), lineHeight: d(18) }}
                    >
                      {e.name}
                    </Text>
                    <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
                      {meta}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={d(18)} tone="tertiary" />
                </Pressable>
              );
            })}
          </Stagger>

          <Text variant="labelXS" tone="tertiary" style={{ fontSize: d(11), lineHeight: d(14) }}>
            EQUIPMENT
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: d(8) }}>
            {equipment.map((e) => (
              <FilterChip key={e} label={e} />
            ))}
          </View>

          <MedicalDisclaimer title={PROGRAMME.disclaimer.title} body={PROGRAMME.disclaimer.body} />
        </View>
      </ScrollView>

      <StickyFooter>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(14) }}>
          <View style={{ gap: d(1) }}>
            <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
              {mine ? 'Resume' : 'Today'}
            </Text>
            <Text variant="numericM" style={{ fontSize: d(20), lineHeight: d(26) }}>
              {day.durationMin} min
            </Text>
          </View>
          <Button
            label={startLabel}
            size="large"
            iconTrailing={complete ? undefined : 'arrow-right'}
            style={{ flex: 1 }}
            onPress={onStart}
          />
        </View>
      </StickyFooter>
    </View>
  );
}
