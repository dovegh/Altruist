/**
 * Password Changed — ported 1:1 from Figma node 55:111.
 *
 * Content: V gap 20, pad 64/24/40/24. 120pt spacer → 120pt brand feature circle
 * with a 50pt check → Head → Primary.
 *
 * No Top App Bar and no Back: the old password is gone, so there is nothing to
 * return to. `router.replace` on entry is what makes that true at runtime.
 */
import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen, FeatureIcon } from '@/components/ui/FormScreen';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    title: 'Password updated',
    body: 'You are signed out on all other devices. Sign in again with your new password.',
    back: 'Back to sign in',
  },
  fr: {
    title: 'Mot de passe mis à jour',
    body: 'Vous êtes déconnecté de tous vos autres appareils. Reconnectez-vous avec votre nouveau mot de passe.',
    back: 'Retour à la connexion',
  },
  tw: {
    title: 'Yɛasesa ahintasɛm no',
    body: 'Yɛayi wo afi mfiri afoforɔ nyinaa so. Fa wo ahintasɛm foforɔ no kɔ mu bio.',
    back: 'San kɔ kɔ mu',
  },
  gaa: {
    title: 'Atsake password lɛ',
    body: 'Ajie bo yɛ nii krokomɛi fɛɛ anɔ. Kɛ o password hee lɛ bote mli ekoŋŋ.',
    back: 'Kua sɛɛ kɛya bote mli',
  },
  ee: {
    title: 'Wotrɔ nyaʋiʋli la',
    body: 'Míeɖe wò le mɔ̃ bubuawo katã dzi. Tsɔ nyaʋiʋli yeye la ge ɖe eme ake.',
    back: 'Trɔ yi gedeɖeme',
  },
  ha: {
    title: 'An sabunta kalmar sirri',
    body: 'An fitar da kai daga duk sauran na’urori. Sake shiga da sabuwar kalmar sirrinka.',
    back: 'Koma wurin shiga',
  },
});

export default function PasswordChanged() {
  const tr = useT(S);
  const t = useTokens();
  const { d } = useDesignScale();

  return (
    <FormScreen gap={20}>
      <View style={{ height: d(120) }} />

      <FeatureIcon size={120} tone="brand" celebrate>
        <Icon name="check" size={d(50)} color={t.colors.icon.onBrand} />
      </FeatureIcon>

      <View style={{ gap: d(10) }}>
        <Text variant="displayS" style={{ fontSize: d(28), lineHeight: d(32) }}>
          {tr('title')}
        </Text>
        <Text variant="bodyL" tone="secondary" style={{ fontSize: d(16), lineHeight: d(24) }}>
          {tr('body')}
        </Text>
      </View>

      <Button label={tr('back')} size="large" onPress={() => router.replace('/login')} />
    </FormScreen>
  );
}
