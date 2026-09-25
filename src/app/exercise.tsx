/**
 * Exercise Detail.
 *
 * Opened from a routine row or from the session screen's info control. It is
 * the answer to "what actually is this?" — the session screen can only show a
 * name, a rep count and a muscle tag, which is not enough for someone meeting
 * a Romanian deadlift for the first time.
 *
 * The cue is separated from the steps on purpose. Steps tell you the shape of
 * the movement; the cue is the single thing people get wrong, and burying it
 * as step four is how it gets skimmed past.
 *
 * The diagram leads, before any numbers about the movement. It is drawn, not
 * photographed: exercise photography is licensed work, and a diagram of the
 * start and end position answers "what am I doing?" better than one frame of
 * someone mid-rep. See components/MovementFigure.tsx.
 */
import React from 'react';
import { View, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen } from '@/components/ui/FormScreen';
import { TitleAppBar } from '@/components/ui/AppBar';
import { StatusScreen } from '@/components/ui/StatusScreen';
import { MedicalDisclaimer } from '@/components/ui/Disclaimer';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { EXERCISES } from '@/lib/wellness';
import { MovementFigure } from '@/components/MovementFigure';
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    title: 'Exercise',
    notFound: 'Exercise not found',
    notFoundBody: 'That movement is not in the library. It may have been renamed.',
    goBack: 'Go back',
    sets: 'Sets',
    reps: 'Reps',
    rest: 'Rest',
    restValue: '{sec} sec',
    equipment: 'Equipment',
    grip: 'Grip',
    workingWeight: 'Working weight',
    weightValue: '{kg} kg',
    figure: 'Start position, then the end of the rep.',
    howTo: 'HOW TO DO IT',
    watch: 'Watch for this',
    swapFor: 'SWAP FOR',
    disclaimer:
      'General fitness guidance, not physiotherapy. If a movement causes pain rather than effort, stop and speak to a clinician.',
  },
  fr: {
    title: 'Exercice',
    notFound: 'Exercice introuvable',
    notFoundBody: "Ce mouvement n'est pas dans la bibliothèque. Il a peut-être été renommé.",
    goBack: 'Retour',
    sets: 'Séries',
    reps: 'Répétitions',
    rest: 'Repos',
    restValue: '{sec} s',
    equipment: 'Matériel',
    grip: 'Prise',
    workingWeight: 'Charge de travail',
    weightValue: '{kg} kg',
    figure: 'Position de départ, puis la fin de la répétition.',
    howTo: 'COMMENT FAIRE',
    watch: 'Attention à ceci',
    swapFor: 'REMPLACER PAR',
    disclaimer:
      "Conseils généraux de remise en forme, pas de la kinésithérapie. Si un mouvement provoque une douleur plutôt qu'un effort, arrêtez et parlez-en à un professionnel de santé.",
  },
  tw: {
    title: 'Apɔmuhyɛ',
    notFound: 'Yɛanhu apɔmuhyɛ no',
    notFoundBody: 'Saa apɔmuhyɛ no nni nhoma korabea hɔ. Ebia wɔasesa ne din.',
    goBack: 'San kɔ akyi',
    sets: 'Nkyekyɛmu',
    reps: 'Mpɛn dodoɔ',
    rest: 'Home',
    restValue: 'sikani {sec}',
    equipment: 'Nneɛma',
    grip: 'Sɛnea wokura',
    workingWeight: 'Emu duru',
    weightValue: '{kg} kg',
    figure: 'Mfitiaseɛ gyinabea, na ɛno akyi awieeɛ.',
    howTo: 'SƐNEA WOBƐYƐ',
    watch: 'Hwɛ yei yie',
    swapFor: 'SESA FA',
    disclaimer:
      'Apɔmuhyɛ ho afotuo kɛkɛ, ɛnyɛ ayaresa. Sɛ apɔmuhyɛ bi de yea ba sen mmɔden a, gyae na kasa kyerɛ dɔkota.',
  },
  gaa: {
    title: 'Gbɔmɔtsoŋ kpaa',
    notFound: 'Anaaa gbɔmɔtsoŋ kpaa lɛ',
    notFoundBody: 'Nɔ nɛɛ bɛ wolokpaa lɛ mli. Ekolɛ atsake egbɛi.',
    goBack: 'Ku sɛɛ',
    sets: 'Kuii',
    reps: 'Shii abɔ',
    rest: 'Hejɔɔmɔ',
    restValue: 'sekɛnd {sec}',
    equipment: 'Nibii',
    grip: 'Hiɛmɔ',
    workingWeight: 'Tsii ni okɛtsuɔ nii',
    weightValue: '{kg} kg',
    figure: 'Shishijee shihilɛ, ni no sɛɛ naagbee.',
    howTo: 'BƆ NI OAAFEE',
    watch: 'Kwɛ enɛ jogbaŋŋ',
    swapFor: 'TSAKE KƐ',
    disclaimer:
      'Gbɔmɔtsoŋ kpaa he ŋaawoo kɛkɛ, jeee hela tsamɔ. Kɛ nɔ ko haa ohe miiye bo moŋ fe hewalɛ, kpa ni ogba datrɛfonyo.',
  },
  ee: {
    title: 'Kamedefefe',
    notFound: 'Míekpɔ kamedefefe la o',
    notFoundBody: 'Ŋutilãʋaʋã ma mele agbalẽdzraɖoƒea o. Ɖewohĩ wotrɔ eŋkɔ.',
    goBack: 'Trɔ yi megbe',
    sets: 'Ƒuƒoƒowo',
    reps: 'Zi nenie',
    rest: 'Gbɔɖeme',
    restValue: 'sekend {sec}',
    equipment: 'Dɔwɔnuwo',
    grip: 'Alɔlele',
    workingWeight: 'Kpekpeme',
    weightValue: '{kg} kg',
    figure: 'Gɔmedzeƒe, emegbe nuwuwu.',
    howTo: 'ALESI NÀWƆE',
    watch: 'Kpɔ esia ɖa nyuie',
    swapFor: 'ƉƆLI KPLE',
    disclaimer:
      'Kamedefefe ŋuti aɖaŋuɖoɖo ko, menye atikewɔwɔ o. Ne ŋutilãʋaʋã aɖe na nèse veve wu agbagbadzedze la, dzudzɔ eye nàƒo nu kple dɔyɔla.',
  },
  ha: {
    title: 'Motsa jiki',
    notFound: 'Ba a sami motsa jikin ba',
    notFoundBody: 'Wannan motsi baya cikin ɗakin karatu. Wataƙila an sauya sunansa.',
    goBack: 'Koma baya',
    sets: 'Zagaye',
    reps: 'Maimaitawa',
    rest: 'Hutu',
    restValue: 'daƙiƙa {sec}',
    equipment: 'Kayan aiki',
    grip: 'Riƙo',
    workingWeight: 'Nauyin aiki',
    weightValue: '{kg} kg',
    figure: 'Matsayin farko, sannan ƙarshen maimaitawa.',
    howTo: 'YADDA ZA A YI',
    watch: 'Kula da wannan',
    swapFor: 'MAYE DA',
    disclaimer:
      'Shawarar motsa jiki ce kawai, ba jinya ba. Idan wani motsi ya jawo ciwo maimakon wahala, ka tsaya ka yi magana da likita.',
  },
});

/** Height of the demonstration panel, in design units. */
const FIGURE_PANEL = 210;
/** How much of the panel height the drawing may occupy. */
const FIGURE_FIT = 0.88;

export default function ExerciseDetail() {
  const t = useTokens();
  const { d } = useDesignScale();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const tr = useT(S);
  const exercise = id ? EXERCISES[id] : undefined;

  if (!exercise) {
    return (
      <StatusScreen
        icon="danger"
        tone="neutral"
        title={tr('notFound')}
        body={tr('notFoundBody')}
        actions={<Button label={tr('goBack')} size="large" onPress={() => router.back()} />}
      />
    );
  }

  const facts: [string, string][] = [
    [tr('sets'), String(exercise.sets)],
    [tr('reps'), exercise.reps],
    [tr('rest'), tr('restValue', { sec: exercise.restSec })],
    [tr('equipment'), exercise.equipment],
    ...(exercise.grip ? ([[tr('grip'), exercise.grip]] as [string, string][]) : []),
    ...(exercise.weightKg
      ? ([[tr('workingWeight'), tr('weightValue', { kg: exercise.weightKg })]] as [string, string][])
      : []),
  ];

  const alternatives = (exercise.alternatives ?? [])
    .map((altId) => EXERCISES[altId])
    .filter(Boolean);

  return (
    <FormScreen gap={16} contentStyle={{ paddingBottom: d(60) }}>
      <TitleAppBar title={tr('title')} />

      <View style={{ gap: d(8) }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: d(7),
            alignSelf: 'flex-start',
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
        <Text variant="displayS" style={{ fontSize: d(28), lineHeight: d(32) }}>
          {exercise.name}
        </Text>
      </View>

      {/* The movement, before any numbers about it.

          The figure's width is derived from the panel height rather than set
          independently: the animated viewBox is 120 x 100, so a figure W wide
          is W * 100/120 tall, and picking the two separately is what pushed
          the feet outside the card. FIGURE_FIT leaves a margin inside it. */}
      <View
        style={{
          height: d(FIGURE_PANEL),
          borderRadius: d(28),
          backgroundColor: t.colors.bg.surface,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <MovementFigure
          pattern={exercise.pattern}
          size={d(FIGURE_PANEL * FIGURE_FIT * 1.2)}
          colour={t.colors.icon.primary}
          muted={t.colors.border.default}
          animated
        />
      </View>
      <Text variant="caption" tone="tertiary" center style={{ fontSize: d(12), lineHeight: d(16) }}>
        {tr('figure')}
      </Text>

      {/* Prescription of the movement — sets, reps, rest. */}
      <View
        style={{
          gap: d(6),
          padding: d(6),
          borderRadius: d(24),
          backgroundColor: t.colors.bg.surface,
        }}
      >
        {facts.map(([label, value]) => (
          <View
            key={label}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: d(10),
              paddingVertical: d(11),
              paddingHorizontal: d(14),
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

      <Text variant="labelXS" tone="tertiary" style={{ fontSize: d(11), lineHeight: d(14) }}>
        {tr('howTo')}
      </Text>

      <View style={{ gap: d(12) }}>
        {exercise.howTo.map((step, i) => (
          <View key={step} style={{ flexDirection: 'row', gap: d(12) }}>
            <View
              style={{
                width: d(24),
                height: d(24),
                borderRadius: t.radius.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: t.colors.bg.brandSubtle,
              }}
            >
              <Text variant="labelS" tone="brand" style={{ fontSize: d(12), lineHeight: d(16) }}>
                {i + 1}
              </Text>
            </View>
            <Text
              variant="bodyM"
              tone="secondary"
              style={{ flex: 1, fontSize: d(14), lineHeight: d(21) }}
            >
              {step}
            </Text>
          </View>
        ))}
      </View>

      {/* The one thing people get wrong — deliberately not step N. */}
      <View
        style={{
          flexDirection: 'row',
          gap: d(12),
          padding: d(16),
          borderRadius: d(20),
          backgroundColor: t.colors.bg.warningSubtle,
        }}
      >
        <Icon name="info" size={d(20)} tone="warning" />
        <View style={{ flex: 1, gap: d(4) }}>
          <Text variant="labelM" tone="warning" style={{ fontSize: d(14), lineHeight: d(18) }}>
            {tr('watch')}
          </Text>
          <Text variant="bodyS" tone="secondary" style={{ fontSize: d(13), lineHeight: d(19) }}>
            {exercise.cue}
          </Text>
        </View>
      </View>

      {alternatives.length ? (
        <>
          <Text variant="labelXS" tone="tertiary" style={{ fontSize: d(11), lineHeight: d(14) }}>
            {tr('swapFor')}
          </Text>
          {alternatives.map((alt) => (
            <Pressable
              key={alt.id}
              accessibilityRole="button"
              accessibilityLabel={`${alt.name}. ${alt.equipment}`}
              onPress={() => router.replace(`/exercise?id=${alt.id}`)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: d(14),
                paddingVertical: d(14),
                paddingHorizontal: d(16),
                borderRadius: d(20),
                backgroundColor: t.colors.bg.surface,
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <View style={{ flex: 1, gap: d(3) }}>
                <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
                  {alt.name}
                </Text>
                <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
                  {alt.equipment}
                </Text>
              </View>
              <Icon name="chevron-right" size={d(18)} tone="tertiary" />
            </Pressable>
          ))}
        </>
      ) : null}

      <MedicalDisclaimer body={tr('disclaimer')} />
    </FormScreen>
  );
}
