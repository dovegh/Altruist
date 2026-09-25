/**
 * Forgot Password — ported 1:1 from Figma node 55:2.
 * Content: V gap 20, pad 64/24/40/24. One field with a visible helper.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen } from '@/components/ui/FormScreen';
import { TitleAppBar } from '@/components/ui/AppBar';
import { InputField } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { NetworkError, requestPasswordReset } from '@/lib/api';
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    title: 'Reset your password',
    body: 'Enter the email on your Altruist account and we will send you a secure reset link.',
    emailLabel: 'Email address',
    emailHelper: 'The link expires after 30 minutes.',
    send: 'Send reset link',
    networkError: 'Could not reach Altruist. Check your connection and try again.',
    serverError: 'Something went wrong on our side. Try again in a moment.',
  },
  fr: {
    title: 'Réinitialiser votre mot de passe',
    body: "Saisissez l'e-mail de votre compte Altruist et nous vous enverrons un lien de réinitialisation sécurisé.",
    emailLabel: 'Adresse e-mail',
    emailHelper: 'Le lien expire au bout de 30 minutes.',
    send: 'Envoyer le lien',
    networkError: 'Impossible de joindre Altruist. Vérifiez votre connexion et réessayez.',
    serverError: 'Un problème est survenu de notre côté. Réessayez dans un instant.',
  },
  tw: {
    title: 'Sesa wo ahintasɛm',
    body: 'Kyerɛw email a ɛwɔ wo Altruist akontaa so na yɛde link a ahobammɔ wom bɛbrɛ wo.',
    emailLabel: 'Email address',
    emailHelper: 'Link no bɛtwam simma 30 akyi.',
    send: 'Fa link no kɔ',
    networkError: 'Yɛantumi anka Altruist. Hwɛ wo intanɛt na san sɔ hwɛ.',
    serverError: 'Biribi ankɔ yie wɔ yɛn fam. San sɔ hwɛ nkyɛ kakra.',
  },
  gaa: {
    title: 'Tsake o password',
    body: 'Ŋma email ni yɔɔ o Altruist akɔŋt lɛ nɔ ni wɔbaatsu link ni hi kɛba.',
    emailLabel: 'Email address',
    emailHelper: 'Link lɛ baagbo yɛ minitii 30 sɛɛ.',
    send: 'Tsu link lɛ',
    networkError: 'Ashɛɛɛ Altruist nɔ. Kwɛ o intanɛt ni oka ekoŋŋ.',
    serverError: 'Nɔko tɔ̃ yɛ wɔ gbɛfaŋ. Ka ekoŋŋ yɛ be fioo sɛɛ.',
  },
  ee: {
    title: 'Trɔ wò nyaʋiʋli',
    body: 'Ŋlɔ email si le wò Altruist akɔnta dzi eye míaɖo link si le dedie la ɖe wò.',
    emailLabel: 'Email address',
    emailHelper: 'Link la ayi le aɖabaƒoƒo 30 megbe.',
    send: 'Ɖo link la ɖa',
    networkError: 'Míete ŋu ɖo Altruist gbɔ o. Kpɔ wò intanɛt eye nàgate kpɔ.',
    serverError: 'Nane gblẽ le mía gbɔ. Gate kpɔ le ɣeyiɣi kpui aɖe megbe.',
  },
  ha: {
    title: 'Sake saita kalmar sirri',
    body: 'Shigar da imel na asusunka na Altruist za mu aiko maka da amintacciyar hanyar sake saitawa.',
    emailLabel: 'Adireshin imel',
    emailHelper: 'Hanyar za ta ƙare bayan minti 30.',
    send: 'Aika hanyar sake saitawa',
    networkError: 'Ba a iya kaiwa ga Altruist ba. Duba haɗin intanet ɗinka ka sake gwadawa.',
    serverError: 'Wani abu ya faru a ɓangarenmu. Sake gwadawa nan da ɗan lokaci.',
  },
});

export default function ForgotPassword() {
  const tr = useT(S);
  const t = useTokens();
  const { d } = useDesignScale();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Always continues to "check your email", whether or not the address has an
   * account. Reporting "no account with that email" here would turn this form
   * into a way to find out who is registered with a pharmacy.
   */
  const send = async () => {
    setError(null);
    setBusy(true);
    try {
      await requestPasswordReset(email.trim());
      router.push({ pathname: '/check-email', params: { email: email.trim(), kind: 'reset' } });
    } catch (e) {
      setError(
        e instanceof NetworkError
          ? tr('networkError')
          : tr('serverError'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormScreen gap={20}>
      <TitleAppBar title="" />

      <View style={{ gap: d(10) }}>
        <Text variant="displayS" style={{ fontSize: d(28), lineHeight: d(32) }}>
          {tr('title')}
        </Text>
        <Text variant="bodyL" tone="secondary" style={{ fontSize: d(16), lineHeight: d(24) }}>
          {tr('body')}
        </Text>
      </View>

      <InputField
        label={tr('emailLabel')}
        helper={tr('emailHelper')}
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />

      {error ? (
        <View
          accessibilityLiveRegion="polite"
          style={{
            flexDirection: 'row',
            gap: d(10),
            paddingVertical: d(12),
            paddingHorizontal: d(14),
            borderRadius: d(16),
            backgroundColor: t.colors.bg.dangerSubtle,
          }}
        >
          <Icon name="danger" size={d(18)} tone="danger" />
          <Text variant="bodyS" tone="danger" style={{ flex: 1, fontSize: d(13), lineHeight: d(19) }}>
            {error}
          </Text>
        </View>
      ) : null}

      <Button
        label={tr('send')}
        size="large"
        loading={busy}
        disabled={!email.trim() || busy}
        onPress={send}
      />
    </FormScreen>
  );
}
