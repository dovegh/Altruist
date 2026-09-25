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
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    title: 'Nutrition',
    healthTips: 'Health tips',
    goalReached: 'Water goal reached',
    tapToLog: 'Glasses of water · tap to log one',
    reachedA11y: '{glasses} of {goal} glasses of water. Goal reached.',
    logA11y: '{glasses} of {goal} glasses of water. Log a glass.',
    energy: 'Energy target today',
    foodsToWatch: 'Foods to watch with your current medicines',
    suggested: 'SUGGESTED TODAY',
    disclaimer:
      'Interaction notes are drawn from your current order history and are general guidance only. Confirm anything that affects your treatment with your partner pharmacy.',
  },
  fr: {
    title: 'Nutrition',
    healthTips: 'Conseils santé',
    goalReached: "Objectif d'eau atteint",
    tapToLog: "Verres d'eau · touchez pour en noter un",
    reachedA11y: "{glasses} verres d'eau sur {goal}. Objectif atteint.",
    logA11y: "{glasses} verres d'eau sur {goal}. Noter un verre.",
    energy: "Objectif d'énergie du jour",
    foodsToWatch: 'Aliments à surveiller avec vos médicaments actuels',
    suggested: "SUGGESTIONS DU JOUR",
    disclaimer:
      "Les notes d'interaction sont tirées de l'historique de vos commandes et ne sont que des conseils généraux. Confirmez tout ce qui touche votre traitement auprès de votre pharmacie partenaire.",
  },
  tw: {
    title: 'Aduane pa',
    healthTips: 'Apɔmuden ho afotuo',
    goalReached: 'Woadu nsuo botaeɛ no ho',
    tapToLog: 'Nsuo kuruwa · mia so na kyerɛw baako',
    reachedA11y: 'Nsuo kuruwa {glasses} wɔ {goal} mu. Woadu botaeɛ no ho.',
    logA11y: 'Nsuo kuruwa {glasses} wɔ {goal} mu. Kyerɛw kuruwa baako.',
    energy: 'Ahoɔden botaeɛ ɛnnɛ',
    foodsToWatch: 'Nnuane a ɛsɛ sɛ wohwɛ yie wɔ wo nnuro a wonom seesei ho',
    suggested: 'DEƐ YƐKAMFO KYERƐ ƐNNƐ',
    disclaimer:
      'Nsɛm yi fi nneɛma a woato dada no mu, na ɛyɛ afotuo kɛkɛ. Bisa wo nnuro adetɔnfoɔ ansa na woayɛ biribi a ɛfa wo ayaresa ho.',
  },
  gaa: {
    title: 'Niyenii kpakpa',
    healthTips: 'Hewalɛ he ŋaawoo',
    goalReached: 'Oshɛ nu yaa he ni otoɔ lɛ',
    tapToLog: 'Nu kɔpui · nɔ nɔ koni oŋma kome',
    reachedA11y: 'Nu kɔpui {glasses} yɛ {goal} mli. Oshɛ he ni otoɔ lɛ.',
    logA11y: 'Nu kɔpui {glasses} yɛ {goal} mli. Ŋma kɔpu kome.',
    energy: 'Hewalɛ ni otoɔ ŋmɛnɛ',
    foodsToWatch: 'Niyenii ni esa akɛ okwɛ jogbaŋŋ kɛ otsofai ni onuɔ ŋmɛnɛ',
    suggested: 'NƆ NI WƆTSƆƆ ŊMƐNƐ',
    disclaimer:
      'Saji nɛɛ jɛ nibii ni ohe momo lɛ mli, ni amɛji ŋaawoo kɛkɛ. Bi bo tsofa hejɔɔ he lɛ dani ofee nɔ ko ni kɔɔ otsamɔ he.',
  },
  ee: {
    title: 'Nuɖuɖu nyui',
    healthTips: 'Lãmesẽ ŋuti aɖaŋuwo',
    goalReached: 'Èɖo tsi ƒe taɖodzinu gbɔ',
    tapToLog: 'Tsi kpluwo · zi edzi nàŋlɔ ɖeka ɖi',
    reachedA11y: 'Tsi kplu {glasses} le {goal} me. Èɖo taɖodzinu gbɔ.',
    logA11y: 'Tsi kplu {glasses} le {goal} me. Ŋlɔ kplu ɖeka ɖi.',
    energy: 'Ŋusẽ ƒe taɖodzinu egbe',
    foodsToWatch: 'Nuɖuɖu siwo ŋu nàkpɔ nyuie le wò atike siwo nèle zazãm ta',
    suggested: 'NU SIWO MÍEƉO ŊU NA EGBE',
    disclaimer:
      'Nya siawo tso nu siwo nèƒle va yi me, eye wonye aɖaŋuɖoɖo ko. Bia wò atikedzraƒe hafi nàwɔ nane si ku ɖe wò atikewɔwɔ ŋu.',
  },
  ha: {
    title: 'Abinci mai gina jiki',
    healthTips: 'Shawarwarin lafiya',
    goalReached: 'Ka cimma burin ruwa',
    tapToLog: 'Kofunan ruwa · taɓa don yin rikodin ɗaya',
    reachedA11y: 'Kofunan ruwa {glasses} cikin {goal}. An cimma buri.',
    logA11y: 'Kofunan ruwa {glasses} cikin {goal}. Yi rikodin kofi ɗaya.',
    energy: 'Burin kuzari na yau',
    foodsToWatch: 'Abincin da za a kula da su tare da magungunanka na yanzu',
    suggested: 'SHAWARAR YAU',
    disclaimer:
      'Bayanan sun fito ne daga tarihin odarka kuma shawara ce ta gaba ɗaya kawai. Tabbatar da duk abin da ya shafi maganinka tare da kantin maganinka.',
  },
});

export default function Nutrition() {
  const t = useTokens();
  const { d } = useDesignScale();
  const tr = useT(S);
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
        title={tr('title')}
        actions={[
          { icon: 'info', label: tr('healthTips'), onPress: () => router.push('/health-tips') },
        ]}
      />

      <View style={{ flexDirection: 'row', gap: d(12) }}>
        {stat(
          String(glasses),
          `/${goal}`,
          atGoal ? tr('goalReached') : tr('tapToLog'),
          true,
          atGoal ? undefined : () => logGlass(goal),
          atGoal ? tr('reachedA11y', { glasses, goal }) : tr('logA11y', { glasses, goal }),
        )}
        {stat(formatThousands(NUTRITION.kcalTarget), 'kcal', tr('energy'), false)}
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
            {tr('foodsToWatch')}
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
        {tr('suggested')}
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

      <MedicalDisclaimer body={tr('disclaimer')} />
    </FormScreen>
  );
}
