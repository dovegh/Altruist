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
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    eyebrowComplete: '{category} · PROGRAMME COMPLETE',
    eyebrowSession: '{category} · SESSION {n} OF {total}',
    minutes: '{min} min',
    exercises: '{count} exercises',
    goBack: 'Go back',
    unsave: 'Remove from saved routines',
    save: 'Save this routine',
    restart: 'Restart programme',
    resumeSession: 'Resume session',
    startSession: 'Start session',
    progress: 'Programme progress',
    allDone: 'All sessions done',
    oneLeft: '1 session left',
    manyLeft: '{count} sessions left',
    inProgressDay: 'IN PROGRESS · {day}',
    todayDay: 'TODAY · {day}',
    metaDone: '{sets} × {reps} · done',
    metaSet: '{sets} × {reps} · set {n} of {total}',
    equipment: 'EQUIPMENT',
    resume: 'Resume',
    today: 'Today',
  },
  fr: {
    eyebrowComplete: '{category} · PROGRAMME TERMINÉ',
    eyebrowSession: '{category} · SÉANCE {n} SUR {total}',
    minutes: '{min} min',
    exercises: '{count} exercices',
    goBack: 'Retour',
    unsave: 'Retirer des routines enregistrées',
    save: 'Enregistrer cette routine',
    restart: 'Recommencer le programme',
    resumeSession: 'Reprendre la séance',
    startSession: 'Commencer la séance',
    progress: 'Progression du programme',
    allDone: 'Toutes les séances terminées',
    oneLeft: '1 séance restante',
    manyLeft: '{count} séances restantes',
    inProgressDay: 'EN COURS · {day}',
    todayDay: "AUJOURD'HUI · {day}",
    metaDone: '{sets} × {reps} · fait',
    metaSet: '{sets} × {reps} · série {n} sur {total}',
    equipment: 'MATÉRIEL',
    resume: 'Reprendre',
    today: "Aujourd'hui",
  },
  tw: {
    eyebrowComplete: '{category} · NHYEHYƐEƐ NO AWIE',
    eyebrowSession: '{category} · ƐKYƐFA {n} WƆ {total} MU',
    minutes: 'simma {min}',
    exercises: 'apɔmuhyɛ {count}',
    goBack: 'San kɔ akyi',
    unsave: 'Yi fi deɛ woakora mu',
    save: 'Kora saa nhyehyɛeɛ yi',
    restart: 'Hyɛ nhyehyɛeɛ no ase bio',
    resumeSession: 'Toa ɛkyɛfa no so',
    startSession: 'Hyɛ ɛkyɛfa no ase',
    progress: 'Nhyehyɛeɛ no nkɔsoɔ',
    allDone: 'Ɛkyɛfa nyinaa awie',
    oneLeft: 'Ɛkyɛfa 1 aka',
    manyLeft: 'Ɛkyɛfa {count} aka',
    inProgressDay: 'ƐREKƆ SO · {day}',
    todayDay: 'ƐNNƐ · {day}',
    metaDone: '{sets} × {reps} · awie',
    metaSet: '{sets} × {reps} · nkyekyɛmu {n} wɔ {total} mu',
    equipment: 'NNEƐMA',
    resume: 'Toa so',
    today: 'Ɛnnɛ',
  },
  gaa: {
    eyebrowComplete: '{category} · TOIŊJƆLƐMƆ LƐ EGBE NAA',
    eyebrowSession: '{category} · BƆ {n} YƐ {total} MLI',
    minutes: 'minitii {min}',
    exercises: 'gbɔmɔtsoŋ kpaai {count}',
    goBack: 'Ku sɛɛ',
    unsave: 'Jie kɛjɛ nɔ ni otoɔ lɛ mli',
    save: 'Toɔ toiŋjɔlɛmɔ nɛɛ',
    restart: 'Je toiŋjɔlɛmɔ lɛ shishi ekoŋŋ',
    resumeSession: 'Ya nɔ kɛ bɔ lɛ',
    startSession: 'Je bɔ lɛ shishi',
    progress: 'Toiŋjɔlɛmɔ lɛ yaa hiɛ',
    allDone: 'Bɔi lɛ fɛɛ egbe naa',
    oneLeft: 'Bɔ 1 shwɛ',
    manyLeft: 'Bɔi {count} ashwɛ',
    inProgressDay: 'EMIIYA NƆ · {day}',
    todayDay: 'ŊMƐNƐ · {day}',
    metaDone: '{sets} × {reps} · egbe naa',
    metaSet: '{sets} × {reps} · ku {n} yɛ {total} mli',
    equipment: 'NIBII',
    resume: 'Ya nɔ',
    today: 'Ŋmɛnɛ',
  },
  ee: {
    eyebrowComplete: '{category} · ƉOƉOA WU ENU',
    eyebrowSession: '{category} · AKPA {n} LE {total} ME',
    minutes: 'miniti {min}',
    exercises: 'kamedefefe {count}',
    goBack: 'Trɔ yi megbe',
    unsave: 'Ɖee ɖa le nu siwo nèdzra ɖo me',
    save: 'Dzra ɖoɖo sia ɖo',
    restart: 'Gadze ɖoɖoa gɔme',
    resumeSession: 'Yi akpaa dzi',
    startSession: 'Dze akpaa gɔme',
    progress: 'Ɖoɖoa ƒe ŋgɔyiyi',
    allDone: 'Akpawo katã wu enu',
    oneLeft: 'Akpa 1 susɔ',
    manyLeft: 'Akpa {count} susɔ',
    inProgressDay: 'ELE EDZI YIM · {day}',
    todayDay: 'EGBE · {day}',
    metaDone: '{sets} × {reps} · wu enu',
    metaSet: '{sets} × {reps} · ƒuƒoƒo {n} le {total} me',
    equipment: 'DƆWƆNUWO',
    resume: 'Yi edzi',
    today: 'Egbe',
  },
  ha: {
    eyebrowComplete: '{category} · AN KAMMALA SHIRIN',
    eyebrowSession: '{category} · ZAMA {n} CIKIN {total}',
    minutes: 'minti {min}',
    exercises: 'motsa jiki {count}',
    goBack: 'Koma baya',
    unsave: 'Cire daga ajiyayyun tsare-tsare',
    save: 'Ajiye wannan tsarin',
    restart: 'Sake fara shirin',
    resumeSession: 'Ci gaba da zama',
    startSession: 'Fara zama',
    progress: 'Ci gaban shiri',
    allDone: 'An gama duk zama',
    oneLeft: 'Zama 1 ya rage',
    manyLeft: 'Zama {count} sun rage',
    inProgressDay: 'ANA CIKI · {day}',
    todayDay: 'YAU · {day}',
    metaDone: '{sets} × {reps} · an gama',
    metaSet: '{sets} × {reps} · zagaye {n} cikin {total}',
    equipment: 'KAYAN AIKI',
    resume: 'Ci gaba',
    today: 'Yau',
  },
});

export default function RoutineDetail() {
  const t = useTokens();
  const { d } = useDesignScale();
  const insets = useSafeAreaInsets();
  const tr = useT(S);

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
    ? tr('eyebrowComplete', { category: PROGRAMME.category })
    : tr('eyebrowSession', {
        category: PROGRAMME.category,
        n: Math.min(sessionsDone + 1, total),
        total,
      });
  const facts = [
    tr('minutes', { min: day.durationMin }),
    tr('exercises', { count: exercises.length }),
    PROGRAMME.level,
  ];

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

  const startLabel = complete ? tr('restart') : mine ? tr('resumeSession') : tr('startSession');
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
          {round('arrow-left', tr('goBack'), () => router.back())}
          {round(
            'heart',
            saved ? tr('unsave') : tr('save'),
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
                {tr('progress')}
              </Text>
              <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
                {left <= 0
                  ? tr('allDone')
                  : left === 1
                    ? tr('oneLeft')
                    : tr('manyLeft', { count: left })}
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
            {tr(mine ? 'inProgressDay' : 'todayDay', { day: day.title.toUpperCase() })}
          </Text>

          <Stagger step={45}>
            {exercises.map((e, i) => {
              const done = !!mine?.completed.includes(e.id);
              const current = !!mine && mine.index === i;
              const meta = done
                ? tr('metaDone', { sets: e.sets, reps: e.reps })
                : current
                  ? tr('metaSet', { sets: e.sets, reps: e.reps, n: mine.setsDone + 1, total: e.sets })
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
            {tr('equipment')}
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
              {mine ? tr('resume') : tr('today')}
            </Text>
            <Text variant="numericM" style={{ fontSize: d(20), lineHeight: d(26) }}>
              {tr('minutes', { min: day.durationMin })}
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
