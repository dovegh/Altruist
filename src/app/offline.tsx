/**
 * Error — No Connection — ported 1:1 from Figma node on page "System States".
 *
 * V gap22, pad 200/24/120/24. A 148pt gold circle, the head, a cached-state
 * card, then Try again.
 *
 * Gold rather than coral: being offline is not a failure the user caused and
 * not one they can fix by acting differently. The card's job is to say that
 * nothing they typed has been lost, which is the actual worry.
 */
import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { StatusScreen } from '@/components/ui/StatusScreen';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    title: 'You are offline',
    body: 'We could not reach Altruist. Your cart and any draft prescription are saved on this device.',
    tryAgain: 'Try again',
    synced:
      'Last synced 12 minutes ago. Prescription uploads will send automatically when you reconnect.',
  },
  fr: {
    title: 'Vous êtes hors ligne',
    body: 'Impossible de joindre Altruist. Votre panier et toute ordonnance en brouillon sont enregistrés sur cet appareil.',
    tryAgain: 'Réessayer',
    synced:
      'Dernière synchronisation il y a 12 minutes. Les ordonnances envoyées partiront automatiquement dès votre reconnexion.',
  },
  tw: {
    title: 'Wonni intanɛt',
    body: 'Yɛantumi anka Altruist. Wo kɛntɛn ne nnuro krataa biara a woreyɛ akora wɔ saa fon yi so.',
    tryAgain: 'San sɔ hwɛ',
    synced:
      'Yɛhyɛɛ no ho mu simma 12 a atwam. Nnuro nkrataa a wode bɛto so bɛkɔ ankasa sɛ wo intanɛt ba a.',
  },
  gaa: {
    title: 'Intanɛt bɛ',
    body: 'Ashɛɛɛ Altruist nɔ. O kɛntɛŋ kɛ tsofa wolo fɛɛ ni ofeɔ lɛ ahiɛ tɛlifoŋ nɛɛ nɔ.',
    tryAgain: 'Ka ekoŋŋ',
    synced:
      'Akɛ nɔ fɛɛ to minitii 12 ni eho nɛ. Tsofa woloi ni otsuɔ lɛ baaya diɛŋtsɛ kɛ intanɛt ba.',
  },
  ee: {
    title: 'Intanɛt meli o',
    body: 'Míete ŋu ɖo Altruist gbɔ o. Wodzra wò kusi kple atikeŋɔŋlɔ ɖesiaɖe si nèle ŋɔŋlɔm ɖo ɖe fon sia dzi.',
    tryAgain: 'Gate kpɔ',
    synced:
      'Míeɖe nuwo ɖeka mlɔetɔ le aɖabaƒoƒo 12 si va yi. Atikeŋɔŋlɔ siwo nèɖo ɖa ayi le eɖokui si ne intanɛt gbɔ.',
  },
  ha: {
    title: 'Ba ka da intanet',
    body: 'Ba a iya kaiwa ga Altruist ba. An ajiye kwandonka da duk takardar maganin da kake shiryawa a wannan na’urar.',
    tryAgain: 'Sake gwadawa',
    synced:
      'An daidaita ƙarshe minti 12 da suka wuce. Takardun maganin da ka ɗora za su tafi kai tsaye idan ka dawo kan intanet.',
  },
});

export default function Offline() {
  const tr = useT(S);
  const t = useTokens();
  const { d } = useDesignScale();

  return (
    <StatusScreen
      icon="info"
      tone="warning"
      outer={148}
      inner={148}
      glyph={56}
      paddingTop={200}
      titleSize={24}
      title={tr('title')}
      body={tr('body')}
      actions={
        <Button label={tr('tryAgain')} size="large" iconLeading="arrow-right" onPress={() => router.back()} />
      }
    >
      <View
        style={{
          paddingVertical: d(14),
          paddingHorizontal: d(16),
          borderRadius: d(20),
          backgroundColor: t.colors.bg.surface,
        }}
      >
        <Text variant="bodyS" tone="secondary" style={{ fontSize: d(13), lineHeight: d(19) }}>
          {tr('synced')}
        </Text>
      </View>
    </StatusScreen>
  );
}
