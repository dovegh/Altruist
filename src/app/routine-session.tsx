/**
 * Wellness — Routine Session — ported 1:1 from Figma node 196:363.
 *
 * A session bar (close, "3 / 6" over set segments, settings), the exercise
 * name, a 264pt figure panel carrying a muscle tag, an INFORMATION stack of
 * 47pt rows, then the control row: 48pt circle, Complete set, 48pt circle ×2.
 *
 * The segment strip is the whole navigation model — no back-and-forth, just
 * where you are in this exercise's sets. The current segment sits at 60%
 * opacity so "in progress" is distinct from both done and not-started.
 *
 * The round controls are 48pt, not 56, and the CTA carries no leading icon:
 * at 56pt the row left the button 144pt, which is not enough for "Complete set"
 * at 16pt and truncated the primary action. 48pt is still above the 44pt
 * minimum and gives the label 20pt of slack. Changed in Figma first (196:363).
 *
 * State lives in features/wellness/store.ts, so closing this screen mid-set
 * and coming back resumes exactly where the strip was. Finishing the last set
 * of the last exercise records the session and shows the completion screen.
 */
import React, { useEffect, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import Animated, {
  Easing,
  ReduceMotion,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Button } from '@/components/ui/Button';
import { StatusScreen } from '@/components/ui/StatusScreen';
import { Text } from '@/components/ui/Text';
import { Icon, type IconName } from '@/components/ui/Icon';
import { MovementFigure } from '@/components/MovementFigure';
import { motion, radius } from '@/theme/tokens';
import {
  EXERCISES,
  formatSeconds,
  nextDay,
  programmeById,
  resolveExercises,
} from '@/lib/wellness';
import { sessionsDoneFor, useWellnessStore } from '@/features/wellness/store';

/**
 * One set marker. Fills by cross-fade as sets complete — the strip is a status
 * readout, so it follows the no-bounce rule the design system sets for status.
 */
function Segment({
  filled,
  current,
  width,
  height,
  on,
  off,
}: {
  filled: boolean;
  current: boolean;
  width: number;
  height: number;
  on: string;
  off: string;
}) {
  const p = useSharedValue(filled ? 1 : 0);

  useEffect(() => {
    p.value = withTiming(filled ? 1 : 0, {
      duration: motion.duration.base,
      easing: Easing.bezier(...motion.easing.standard),
      reduceMotion: ReduceMotion.System,
    });
  }, [filled, p]);

  const animated = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, [0, 1], [off, on]),
  }));

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius.full, opacity: current ? 0.6 : 1 }, animated]}
    />
  );
}

type Finished = { dayTitle: string; exercises: number; durationMin: number; sessionsLeft: number };

export default function RoutineSession() {
  const t = useTokens();
  const { d } = useDesignScale();
  const insets = useSafeAreaInsets();

  const { id } = useLocalSearchParams<{ id?: string }>();
  // Opening this screen IS starting the session; a second open resumes it.
  useState(() => useWellnessStore.getState().startSession(id));
  const active = useWellnessStore((s) => s.active);
  const history = useWellnessStore((s) => s.history);
  const PROGRAMME = programmeById(active?.programmeId ?? id);
  const sessionsDone = sessionsDoneFor(history, PROGRAMME.id);
  const completeSet = useWellnessStore((s) => s.completeSet);
  const skipExercise = useWellnessStore((s) => s.skipExercise);
  const swapExercise = useWellnessStore((s) => s.swapExercise);

  const [finished, setFinished] = useState<Finished | null>(null);
  const [restLeft, setRestLeft] = useState<number | null>(null);

  // Rest countdown. Starts after each completed set, or from the clock control.
  useEffect(() => {
    if (restLeft === null) return;
    if (restLeft <= 0) {
      setRestLeft(null);
      return;
    }
    const id = setTimeout(() => setRestLeft((r) => (r === null ? null : r - 1)), 1_000);
    return () => clearTimeout(id);
  }, [restLeft]);

  const day = active
    ? PROGRAMME.days.find((x) => x.id === active.dayId) ?? nextDay(PROGRAMME, sessionsDone)
    : null;
  const exercises = active && day ? resolveExercises(day, active.swaps) : [];
  const exercise = active ? exercises[active.index] : undefined;

  if (finished) {
    return (
      <StatusScreen
        icon="award"
        tone="brand"
        title="Session complete"
        body={`${finished.dayTitle} · ${finished.exercises} exercises · ${finished.durationMin} min. ${
          finished.sessionsLeft <= 0
            ? `That was the last session of ${PROGRAMME.title}.`
            : `${finished.sessionsLeft} ${finished.sessionsLeft === 1 ? 'session' : 'sessions'} left in ${PROGRAMME.title}.`
        }`}
        actions={
          <View style={{ gap: d(10) }}>
            <Button
              label="Back to plan"
              size="large"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/routine'))}
            />
          </View>
        }
      />
    );
  }

  if (!active || !day || !exercise) return null;

  const totalSets = exercise.sets;
  const set = active.setsDone + 1;
  const originalId = day.exerciseIds[active.index];
  const swapTarget = exercise.id === originalId ? exercise.alternatives?.[0] : originalId;

  const finishWith = (outcome: 'set' | 'exercise' | 'session') => {
    if (outcome === 'session') {
      setRestLeft(null);
      setFinished({
        dayTitle: day.title,
        exercises: exercises.length,
        durationMin: day.durationMin,
        sessionsLeft: PROGRAMME.sessionsTotal - (sessionsDone + 1),
      });
    } else if (outcome === 'exercise') {
      setRestLeft(null);
    } else {
      setRestLeft(exercise.restSec);
    }
  };

  const info: [string, string][] = [
    ['Weight (current configuration)', exercise.weightKg ? `${exercise.weightKg} kg` : 'Bodyweight'],
    ['Reps', `${exercise.sets} × ${exercise.reps}`],
    ['Rest time', `${exercise.restSec} sec`],
    ['Equipment', exercise.equipment],
    ...(exercise.grip ? ([['Grip', exercise.grip]] as [string, string][]) : []),
  ];

  const control = (icon: IconName, label: string, onPress?: () => void, disabled?: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: d(48),
        height: d(48),
        borderRadius: t.radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: t.colors.bg.surface,
        opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
      })}
    >
      <Icon name={icon} size={d(20)} tone="primary" />
    </Pressable>
  );

  const barControl = (icon: IconName, label: string, onPress?: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
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
      <Icon name={icon} size={d(20)} tone="primary" />
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          gap: d(16),
          paddingTop: insets.top + d(18),
          paddingHorizontal: d(24),
          paddingBottom: d(40) + insets.bottom,
        }}
      >
        {/* Session bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(16) }}>
          {/* Leaving keeps the session; the plan screen offers Resume. */}
          {barControl('close', 'Leave session', () => router.back())}

          <View style={{ flex: 1, gap: d(8), alignItems: 'center' }}>
            <Text variant="labelM" center style={{ fontSize: d(14), lineHeight: d(18) }}>
              {set} / {totalSets}
            </Text>
            <View
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: totalSets, now: active.setsDone }}
              style={{ flexDirection: 'row', gap: d(4) }}
            >
              {Array.from({ length: totalSets }, (_, i) => {
                const done = i < active.setsDone;
                const current = i === active.setsDone;
                return (
                  <Segment
                    key={i}
                    filled={done || current}
                    current={current}
                    width={d(24)}
                    height={d(3)}
                    on={t.colors.bg.brand}
                    off={t.colors.bg.surfaceRaised}
                  />
                );
              })}
            </View>
          </View>

          {barControl('info', 'How to do this exercise', () =>
            router.push(`/exercise?id=${exercise.id}`),
          )}
        </View>

        <View style={{ gap: d(6) }}>
          <Text variant="labelXS" tone="tertiary" center style={{ fontSize: d(11), lineHeight: d(14) }}>
            {day.title.toUpperCase()} · EXERCISE {active.index + 1} OF {exercises.length}
          </Text>
          <Text variant="headingXL" center style={{ fontSize: d(24), lineHeight: d(30) }}>
            {exercise.name}
          </Text>
        </View>

        {/* Figure panel — or the rest countdown, which takes the panel over. */}
        <View
          accessibilityLiveRegion="polite"
          style={{
            height: d(264),
            borderRadius: d(28),
            backgroundColor: restLeft !== null ? t.colors.bg.brandSubtle : t.colors.bg.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              position: 'absolute',
              left: d(18),
              top: d(18),
              flexDirection: 'row',
              alignItems: 'center',
              gap: d(7),
              paddingVertical: d(6),
              paddingLeft: d(10),
              paddingRight: d(12),
              borderRadius: t.radius.full,
              backgroundColor: t.colors.bg.brandSubtle,
            }}
          >
            <View
              style={{
                width: d(8),
                height: d(8),
                borderRadius: t.radius.full,
                backgroundColor: t.colors.bg.brand,
              }}
            />
            <Text variant="labelXS" tone="brand" style={{ fontSize: d(11), lineHeight: d(14) }}>
              {exercise.muscles}
            </Text>
          </View>

          {restLeft !== null ? (
            <View style={{ alignItems: 'center', gap: d(6) }}>
              <Text variant="labelS" tone="brand" style={{ fontSize: d(12), lineHeight: d(16) }}>
                REST
              </Text>
              <Text variant="numericXL" tone="brand" style={{ fontSize: d(56), lineHeight: d(60) }}>
                {formatSeconds(restLeft)}
              </Text>
              <Text variant="caption" tone="secondary" style={{ fontSize: d(12), lineHeight: d(16) }}>
                Next: set {set} of {totalSets}
              </Text>
            </View>
          ) : (
            /* The movement itself, looping, not a decorative glyph. This panel
               is the only place mid-set where someone can check what they are
               meant to be doing, and a demonstration answers that faster than
               going back out to the exercise page. */
            <MovementFigure
              pattern={exercise.pattern}
              // Derived from the 264pt panel height; see exercise.tsx.
              size={d(264 * 0.82 * 1.2)}
              colour={t.colors.icon.primary}
              muted={t.colors.border.default}
              animated
            />
          )}
        </View>

        <Text variant="labelXS" tone="tertiary" style={{ fontSize: d(11), lineHeight: d(14) }}>
          INFORMATION
        </Text>

        <View style={{ gap: d(6) }}>
          {info.map(([label, value]) => (
            <View
              key={label}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: d(10),
                paddingVertical: d(13),
                paddingHorizontal: d(16),
                borderRadius: d(14),
                backgroundColor: t.colors.bg.surface,
              }}
            >
              <Text
                variant="bodyM"
                tone="secondary"
                style={{ flex: 1, fontSize: d(14), lineHeight: d(21) }}
              >
                {label}
              </Text>
              <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
                {value}
              </Text>
            </View>
          ))}
        </View>

        {/* Controls */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(10) }}>
          {control(
            'clock',
            restLeft !== null ? 'Cancel rest timer' : 'Start rest timer',
            () => setRestLeft((r) => (r === null ? exercise.restSec : null)),
          )}
          <Button
            label={set === totalSets ? 'Finish exercise' : 'Complete set'}
            size="large"
            style={{ flex: 1 }}
            onPress={() => finishWith(completeSet())}
          />
          {control(
            'catalog',
            swapTarget ? `Swap for ${EXERCISES[swapTarget].name}` : 'No alternative exercise',
            () => swapTarget && swapExercise(originalId, swapTarget),
            !swapTarget,
          )}
          {control('arrow-right', 'Skip to next exercise', () => finishWith(skipExercise()))}
        </View>
      </ScrollView>
    </View>
  );
}
