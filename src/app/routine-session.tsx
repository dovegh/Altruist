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
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    sessionComplete: 'Session complete',
    lastBody: '{day} · {count} exercises · {min} min. That was the last session of {programme}.',
    oneLeftBody: '{day} · {count} exercises · {min} min. 1 session left in {programme}.',
    manyLeftBody: '{day} · {count} exercises · {min} min. {left} sessions left in {programme}.',
    backToPlan: 'Back to plan',
    weight: 'Weight (current configuration)',
    weightValue: '{kg} kg',
    bodyweight: 'Bodyweight',
    reps: 'Reps',
    restTime: 'Rest time',
    restValue: '{sec} sec',
    equipment: 'Equipment',
    grip: 'Grip',
    leave: 'Leave session',
    howTo: 'How to do this exercise',
    exerciseOf: '{day} · EXERCISE {n} OF {total}',
    rest: 'REST',
    next: 'Next: set {n} of {total}',
    information: 'INFORMATION',
    cancelRest: 'Cancel rest timer',
    startRest: 'Start rest timer',
    finishExercise: 'Finish exercise',
    completeSet: 'Complete set',
    swapFor: 'Swap for {name}',
    noAlternative: 'No alternative exercise',
    skip: 'Skip to next exercise',
  },
  fr: {
    sessionComplete: 'Séance terminée',
    lastBody: "{day} · {count} exercices · {min} min. C'était la dernière séance de {programme}.",
    oneLeftBody: '{day} · {count} exercices · {min} min. Il reste 1 séance dans {programme}.',
    manyLeftBody: '{day} · {count} exercices · {min} min. Il reste {left} séances dans {programme}.',
    backToPlan: 'Retour au programme',
    weight: 'Poids (configuration actuelle)',
    weightValue: '{kg} kg',
    bodyweight: 'Poids du corps',
    reps: 'Répétitions',
    restTime: 'Temps de repos',
    restValue: '{sec} s',
    equipment: 'Matériel',
    grip: 'Prise',
    leave: 'Quitter la séance',
    howTo: 'Comment faire cet exercice',
    exerciseOf: '{day} · EXERCICE {n} SUR {total}',
    rest: 'REPOS',
    next: 'Suivant : série {n} sur {total}',
    information: 'INFORMATIONS',
    cancelRest: 'Annuler le minuteur de repos',
    startRest: 'Lancer le minuteur de repos',
    finishExercise: "Terminer l'exercice",
    completeSet: 'Valider la série',
    swapFor: 'Remplacer par {name}',
    noAlternative: "Pas d'exercice de remplacement",
    skip: "Passer à l'exercice suivant",
  },
  tw: {
    sessionComplete: 'Ɛkyɛfa no awie',
    lastBody: '{day} · apɔmuhyɛ {count} · simma {min}. Na ɛyɛ {programme} ɛkyɛfa a ɛtwa toɔ.',
    oneLeftBody: '{day} · apɔmuhyɛ {count} · simma {min}. Ɛkyɛfa 1 aka wɔ {programme} mu.',
    manyLeftBody: '{day} · apɔmuhyɛ {count} · simma {min}. Ɛkyɛfa {left} aka wɔ {programme} mu.',
    backToPlan: 'San kɔ nhyehyɛeɛ no so',
    weight: 'Emu duru (seesei nhyehyɛeɛ)',
    weightValue: '{kg} kg',
    bodyweight: 'Wo nipadua duru',
    reps: 'Mpɛn dodoɔ',
    restTime: 'Home bere',
    restValue: 'sikani {sec}',
    equipment: 'Nneɛma',
    grip: 'Sɛnea wokura',
    leave: 'Fi ɛkyɛfa no mu',
    howTo: 'Sɛnea wobɛyɛ saa apɔmuhyɛ yi',
    exerciseOf: '{day} · APƆMUHYƐ {n} WƆ {total} MU',
    rest: 'HOME',
    next: 'Deɛ ɛdi hɔ: nkyekyɛmu {n} wɔ {total} mu',
    information: 'NSƐM',
    cancelRest: 'Gyae home bere no',
    startRest: 'Hyɛ home bere no ase',
    finishExercise: 'Wie apɔmuhyɛ no',
    completeSet: 'Wie nkyekyɛmu no',
    swapFor: 'Sesa fa {name}',
    noAlternative: 'Apɔmuhyɛ foforɔ biara nni hɔ',
    skip: 'Kɔ apɔmuhyɛ a ɛdi hɔ so',
  },
  gaa: {
    sessionComplete: 'Bɔ lɛ egbe naa',
    lastBody: '{day} · gbɔmɔtsoŋ kpaai {count} · minitii {min}. No ji {programme} bɔ ni sɛɛ fɛɛ.',
    oneLeftBody: '{day} · gbɔmɔtsoŋ kpaai {count} · minitii {min}. Bɔ 1 shwɛ yɛ {programme} mli.',
    manyLeftBody: '{day} · gbɔmɔtsoŋ kpaai {count} · minitii {min}. Bɔi {left} ashwɛ yɛ {programme} mli.',
    backToPlan: 'Ku sɛɛ kɛya toiŋjɔlɛmɔ lɛ nɔ',
    weight: 'Tsii (bɔ ni eyɔɔ amrɔ nɛɛ)',
    weightValue: '{kg} kg',
    bodyweight: 'Bo gbɔmɔtso tsii',
    reps: 'Shii abɔ',
    restTime: 'Hejɔɔmɔ be',
    restValue: 'sekɛnd {sec}',
    equipment: 'Nibii',
    grip: 'Hiɛmɔ',
    leave: 'Shi bɔ lɛ',
    howTo: 'Bɔ ni oaafee gbɔmɔtsoŋ kpaa nɛɛ',
    exerciseOf: '{day} · GBƆMƆTSOŊ KPAA {n} YƐ {total} MLI',
    rest: 'HEJƆƆMƆ',
    next: 'Nɔ ni nyiɛ sɛɛ: ku {n} yɛ {total} mli',
    information: 'SAJI',
    cancelRest: 'Kpa hejɔɔmɔ be lɛ',
    startRest: 'Je hejɔɔmɔ be lɛ shishi',
    finishExercise: 'Gbe gbɔmɔtsoŋ kpaa lɛ naa',
    completeSet: 'Gbe ku lɛ naa',
    swapFor: 'Tsake kɛ {name}',
    noAlternative: 'Gbɔmɔtsoŋ kpaa kroko bɛ',
    skip: 'Ya gbɔmɔtsoŋ kpaa ni nyiɛ sɛɛ lɛ nɔ',
  },
  ee: {
    sessionComplete: 'Akpaa wu enu',
    lastBody: '{day} · kamedefefe {count} · miniti {min}. Enye {programme} ƒe akpa mamlɛtɔ.',
    oneLeftBody: '{day} · kamedefefe {count} · miniti {min}. Akpa 1 susɔ le {programme} me.',
    manyLeftBody: '{day} · kamedefefe {count} · miniti {min}. Akpa {left} susɔ le {programme} me.',
    backToPlan: 'Trɔ yi ɖoɖoa gbɔ',
    weight: 'Kpekpeme (ɖoɖo si li fifia)',
    weightValue: '{kg} kg',
    bodyweight: 'Wò ŋutilã ƒe kpekpeme',
    reps: 'Zi nenie',
    restTime: 'Gbɔɖeme ɣeyiɣi',
    restValue: 'sekend {sec}',
    equipment: 'Dɔwɔnuwo',
    grip: 'Alɔlele',
    leave: 'Dzo le akpaa me',
    howTo: 'Alesi nàwɔ kamedefefe sia',
    exerciseOf: '{day} · KAMEDEFEFE {n} LE {total} ME',
    rest: 'GBƆƉEME',
    next: 'Esi kplɔe ɖo: ƒuƒoƒo {n} le {total} me',
    information: 'NYATAKAKAWO',
    cancelRest: 'Tɔ te gbɔɖeme ɣeyiɣia',
    startRest: 'Dze gbɔɖeme ɣeyiɣia gɔme',
    finishExercise: 'Wu kamedefefea nu',
    completeSet: 'Wu ƒuƒoƒoa nu',
    swapFor: 'Ɖɔli kple {name}',
    noAlternative: 'Kamedefefe bubu aɖeke meli o',
    skip: 'Yi kamedefefe si kplɔe ɖo dzi',
  },
  ha: {
    sessionComplete: 'An gama zama',
    lastBody: '{day} · motsa jiki {count} · minti {min}. Wannan shi ne zaman ƙarshe na {programme}.',
    oneLeftBody: '{day} · motsa jiki {count} · minti {min}. Zama 1 ya rage a {programme}.',
    manyLeftBody: '{day} · motsa jiki {count} · minti {min}. Zama {left} sun rage a {programme}.',
    backToPlan: 'Koma ga shiri',
    weight: 'Nauyi (tsarin yanzu)',
    weightValue: '{kg} kg',
    bodyweight: 'Nauyin jiki',
    reps: 'Maimaitawa',
    restTime: 'Lokacin hutu',
    restValue: 'daƙiƙa {sec}',
    equipment: 'Kayan aiki',
    grip: 'Riƙo',
    leave: 'Bar zama',
    howTo: 'Yadda ake wannan motsa jiki',
    exerciseOf: '{day} · MOTSA JIKI {n} CIKIN {total}',
    rest: 'HUTU',
    next: 'Na gaba: zagaye {n} cikin {total}',
    information: 'BAYANI',
    cancelRest: 'Soke lokacin hutu',
    startRest: 'Fara lokacin hutu',
    finishExercise: 'Gama motsa jiki',
    completeSet: 'Gama zagaye',
    swapFor: 'Maye da {name}',
    noAlternative: 'Babu wani motsa jiki madadin',
    skip: 'Tsallake zuwa motsa jiki na gaba',
  },
});

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
  const tr = useT(S);

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
        title={tr('sessionComplete')}
        body={tr(
          finished.sessionsLeft <= 0
            ? 'lastBody'
            : finished.sessionsLeft === 1
              ? 'oneLeftBody'
              : 'manyLeftBody',
          {
            day: finished.dayTitle,
            count: finished.exercises,
            min: finished.durationMin,
            left: finished.sessionsLeft,
            programme: PROGRAMME.title,
          },
        )}
        actions={
          <View style={{ gap: d(10) }}>
            <Button
              label={tr('backToPlan')}
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
    [
      tr('weight'),
      exercise.weightKg ? tr('weightValue', { kg: exercise.weightKg }) : tr('bodyweight'),
    ],
    [tr('reps'), `${exercise.sets} × ${exercise.reps}`],
    [tr('restTime'), tr('restValue', { sec: exercise.restSec })],
    [tr('equipment'), exercise.equipment],
    ...(exercise.grip ? ([[tr('grip'), exercise.grip]] as [string, string][]) : []),
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
          {barControl('close', tr('leave'), () => router.back())}

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

          {barControl('info', tr('howTo'), () =>
            router.push(`/exercise?id=${exercise.id}`),
          )}
        </View>

        <View style={{ gap: d(6) }}>
          <Text variant="labelXS" tone="tertiary" center style={{ fontSize: d(11), lineHeight: d(14) }}>
            {tr('exerciseOf', {
              day: day.title.toUpperCase(),
              n: active.index + 1,
              total: exercises.length,
            })}
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
                {tr('rest')}
              </Text>
              <Text variant="numericXL" tone="brand" style={{ fontSize: d(56), lineHeight: d(60) }}>
                {formatSeconds(restLeft)}
              </Text>
              <Text variant="caption" tone="secondary" style={{ fontSize: d(12), lineHeight: d(16) }}>
                {tr('next', { n: set, total: totalSets })}
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
          {tr('information')}
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
            restLeft !== null ? tr('cancelRest') : tr('startRest'),
            () => setRestLeft((r) => (r === null ? exercise.restSec : null)),
          )}
          <Button
            label={set === totalSets ? tr('finishExercise') : tr('completeSet')}
            size="large"
            style={{ flex: 1 }}
            onPress={() => finishWith(completeSet())}
          />
          {control(
            'catalog',
            swapTarget ? tr('swapFor', { name: EXERCISES[swapTarget].name }) : tr('noAlternative'),
            () => swapTarget && swapExercise(originalId, swapTarget),
            !swapTarget,
          )}
          {control('arrow-right', tr('skip'), () => finishWith(skipExercise()))}
        </View>
      </ScrollView>
    </View>
  );
}
