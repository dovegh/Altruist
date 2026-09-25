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
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    title: 'Wellness',
    moreOptions: 'More options',
    streakA11yOne: 'Current streak: {count} day on plan. See all activity.',
    streakA11yMany: 'Current streak: {count} days on plan. See all activity.',
    currentStreak: 'CURRENT STREAK',
    dayOnPlan: 'day on plan',
    daysOnPlan: 'days on plan',
    heartRate: 'Resting heart rate',
    hydration: 'Hydration',
    goalReached: 'Goal reached',
    glassToGo: '{count} glass to go',
    glassesToGo: '{count} glasses to go',
    todaysPlan: 'Today’s plan',
    readNext: 'Read next',
    disclaimer:
      'General wellness guidance, not medical advice. Talk to your partner pharmacist or a clinician before changing how you take a prescribed medicine.',
    kcalTarget: '{kcal} kcal target',
    inProgress: 'In progress · {n} of {total}',
    planMeta: '{min} min · {count} exercises',
  },
  fr: {
    title: 'Bien-être',
    moreOptions: "Plus d'options",
    streakA11yOne: "Série en cours : {count} jour dans le programme. Voir toute l'activité.",
    streakA11yMany: "Série en cours : {count} jours dans le programme. Voir toute l'activité.",
    currentStreak: 'SÉRIE EN COURS',
    dayOnPlan: 'jour dans le programme',
    daysOnPlan: 'jours dans le programme',
    heartRate: 'Fréquence cardiaque au repos',
    hydration: 'Hydratation',
    goalReached: 'Objectif atteint',
    glassToGo: 'Encore {count} verre',
    glassesToGo: 'Encore {count} verres',
    todaysPlan: 'Programme du jour',
    readNext: 'À lire ensuite',
    disclaimer:
      'Conseils généraux de bien-être, pas un avis médical. Parlez-en à votre pharmacien partenaire ou à un clinicien avant de changer la façon dont vous prenez un médicament prescrit.',
    kcalTarget: 'Objectif : {kcal} kcal',
    inProgress: 'En cours · {n} sur {total}',
    planMeta: '{min} min · {count} exercices',
  },
  tw: {
    title: 'Apɔmuden',
    moreOptions: 'Nneɛma foforɔ',
    streakA11yOne: 'Nna a woadi so: da {count} wɔ nhyehyɛeɛ so. Hwɛ wo dwumadie nyinaa.',
    streakA11yMany: 'Nna a woadi so: nna {count} wɔ nhyehyɛeɛ so. Hwɛ wo dwumadie nyinaa.',
    currentStreak: 'NNA A WOADI SO',
    dayOnPlan: 'da wɔ nhyehyɛeɛ so',
    daysOnPlan: 'nna wɔ nhyehyɛeɛ so',
    heartRate: 'Koma bɔ bere a wogye w’ahome',
    hydration: 'Nsuo nom',
    goalReached: 'Woadu botaeɛ no ho',
    glassToGo: 'Kuruwa {count} aka',
    glassesToGo: 'Nkuruwa {count} aka',
    todaysPlan: 'Nnɛ nhyehyɛeɛ',
    readNext: 'Kenkan deɛ ɛdi so',
    disclaimer:
      'Apɔmuden ho afotuo kɛkɛ, ɛnyɛ ayaresa ho afotuo. Kasa kyerɛ wo nnuro ho ɔbenfoɔ anaa dɔkota ansa na woasesa sɛnea wonom aduro a wɔakyerɛw ama wo.',
    kcalTarget: 'kcal {kcal} botaeɛ',
    inProgress: 'Ɛrekɔ so · {n} wɔ {total} mu',
    planMeta: 'simma {min} · apɔw-mu-tenten {count}',
  },
  gaa: {
    title: 'Hewalɛ',
    moreOptions: 'Nibii krokomɛi',
    streakA11yOne: 'Gbii ni otsa: gbi {count} yɛ gbɛjianɔtoo lɛ nɔ. Kwɛ onitsumɔi fɛɛ.',
    streakA11yMany: 'Gbii ni otsa: gbii {count} yɛ gbɛjianɔtoo lɛ nɔ. Kwɛ onitsumɔi fɛɛ.',
    currentStreak: 'GBII NI OTSA',
    dayOnPlan: 'gbi yɛ gbɛjianɔtoo lɛ nɔ',
    daysOnPlan: 'gbii yɛ gbɛjianɔtoo lɛ nɔ',
    heartRate: 'Bɔ ni otsui fãa kɛ ojɔɔ ohe',
    hydration: 'Nu nɔmɔ',
    goalReached: 'Oshɛ otsɔne lɛ he',
    glassToGo: 'Kɔɔpu {count} shwɛ',
    glassesToGo: 'Kɔɔpui {count} shwɛ',
    todaysPlan: 'Ŋmɛnɛ gbɛjianɔtoo',
    readNext: 'Kane nɔ ni nyiɛ sɛɛ',
    disclaimer:
      'Hewalɛ he ŋaawoo kɛkɛ, jeee helatsamɔ ŋaawoo. Kɛ o tsofatsɛ loo datrɛfonyo awie dani otsake bɔ ni onuɔ tsofa ni aŋma ha bo.',
    kcalTarget: 'kcal {kcal} otsɔne',
    inProgress: 'Eyaa nɔ · {n} yɛ {total} mli',
    planMeta: 'miniti {min} · nitsumɔi {count}',
  },
  ee: {
    title: 'Lãmesẽ',
    moreOptions: 'Nu bubuwo',
    streakA11yOne: 'Ŋkeke siwo nèwɔ yi edzi: ŋkeke {count} le ɖoɖoa dzi. Kpɔ wò dɔwɔwɔwo katã.',
    streakA11yMany: 'Ŋkeke siwo nèwɔ yi edzi: ŋkeke {count} le ɖoɖoa dzi. Kpɔ wò dɔwɔwɔwo katã.',
    currentStreak: 'ŊKEKE SIWO NÈWƆ YI EDZI',
    dayOnPlan: 'ŋkeke le ɖoɖoa dzi',
    daysOnPlan: 'ŋkekewo le ɖoɖoa dzi',
    heartRate: 'Dzi ƒoƒo ne èle gbɔɖeme',
    hydration: 'Tsinono',
    goalReached: 'Èɖo taɖodzinu la gbɔ',
    glassToGo: 'Kplu {count} susɔ',
    glassesToGo: 'Kpluwo {count} susɔ',
    todaysPlan: 'Egbe ƒe ɖoɖo',
    readNext: 'Xlẽ esi kplɔe ɖo',
    disclaimer:
      'Lãmesẽ ŋuti aɖaŋuɖoɖo ko, menye atikewɔwɔ ƒe aɖaŋu o. Ƒo nu kple wò atikewɔla alo dɔyɔla hafi natrɔ ale si nèxɔa atike si woŋlɔ na wò.',
    kcalTarget: 'kcal {kcal} taɖodzinu',
    inProgress: 'Ele edzi yim · {n} le {total} me',
    planMeta: 'miniti {min} · kamedefefe {count}',
  },
  ha: {
    title: 'Lafiya',
    moreOptions: 'Ƙarin zaɓuɓɓuka',
    streakA11yOne: 'Jerin kwanaki: kwana {count} a kan shiri. Duba duk ayyuka.',
    streakA11yMany: 'Jerin kwanaki: kwanaki {count} a kan shiri. Duba duk ayyuka.',
    currentStreak: 'JERIN KWANAKI',
    dayOnPlan: 'kwana a kan shiri',
    daysOnPlan: 'kwanaki a kan shiri',
    heartRate: 'Bugun zuciya a hutu',
    hydration: 'Shan ruwa',
    goalReached: 'An cimma buri',
    glassToGo: 'Saura kofi {count}',
    glassesToGo: 'Saura kofuna {count}',
    todaysPlan: 'Shirin yau',
    readNext: 'Karanta na gaba',
    disclaimer:
      'Shawarar lafiya ta gaba ɗaya, ba shawarar likita ba. Yi magana da mai harhaɗa magani abokin hulɗarka ko likita kafin ka canza yadda kake shan maganin da aka rubuta maka.',
    kcalTarget: 'Burin kcal {kcal}',
    inProgress: 'Ana ci gaba · {n} cikin {total}',
    planMeta: 'minti {min} · motsa jiki {count}',
  },
});

export default function Wellness() {
  const t = useTokens();
  const tr = useT(S);
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
      return { ...card, meta: tr('kcalTarget', { kcal: formatThousands(NUTRITION.kcalTarget) }) };
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
        ? tr('inProgress', { n: mine.index + 1, total: day.exerciseIds.length })
        : tr('planMeta', { min: day.durationMin, count: day.exerciseIds.length }),
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
          title={tr('title')}
          showBack={false}
          actions={[{ icon: 'more', label: tr('moreOptions') }]}
        />

        {/* Streak hero — gold, radius 36 */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr(streak === 1 ? 'streakA11yOne' : 'streakA11yMany', { count: streak })}
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
              {tr('currentStreak')}
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
              {streak === 1 ? tr('dayOnPlan') : tr('daysOnPlan')}
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
            title={tr('heartRate')}
            meta={NUTRITION.restingBpm.meta}
          />
          <StatCard
            tone="accentCream"
            icon="wellness"
            value={String(glasses)}
            unit={`/${NUTRITION.hydrationGoal}`}
            title={tr('hydration')}
            meta={
              toGo === 0
                ? tr('goalReached')
                : tr(toGo === 1 ? 'glassToGo' : 'glassesToGo', { count: toGo })
            }
            onPress={() => router.push('/nutrition')}
          />
        </View>

        <SectionHeader title={tr('todaysPlan')} onAction={() => router.push('/wellness-activity')} />

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

        <SectionHeader title={tr('readNext')} onAction={() => router.push('/health-tips')} />

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
          {tr('disclaimer')}
        </Text>
      </ScrollView>
    </View>
  );
}
