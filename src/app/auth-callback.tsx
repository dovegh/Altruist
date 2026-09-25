/**
 * Where sign-in links come back into the app.
 *
 * Two things arrive here:
 *
 *   - **Provider sign-in** (Google, Apple). The browser session in
 *     `signInWithProvider` reads the redirect and finishes the job; this screen
 *     only steps aside, back to the screen that started it. Without a route
 *     here the same URL drew "Unmatched route" over sign-in.
 *
 *   - **The sign-up confirmation email.** Nothing else is waiting for this
 *     link, so this screen redeems the code and signs the person in.
 *
 * A code can only be redeemed on the phone that asked for it (it holds the
 * PKCE verifier). Opened anywhere else — the link tapped on a laptop, or after
 * reinstalling — the exchange fails, but Supabase has already confirmed the
 * address by the time it redirects. So that case says "confirmed, now sign in",
 * not "failed". An expired or reused link arrives with an error instead of a
 * code, and says so.
 */
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useDesignScale } from '@/theme/useDesignScale';
import { FixedScreen } from '@/components/ui/Surface';
import { FormScreen, FeatureIcon } from '@/components/ui/FormScreen';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { NetworkError, isProviderSignInOpen, redeemAuthCode } from '@/lib/api';
import { setSession } from '@/lib/session';
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    confirmedTitle: 'Email confirmed',
    confirmedBody: 'Sign in to continue.',
    offlineTitle: 'Could not reach Altruist',
    offlineBody: 'Check your connection and open the link again.',
    refusedTitle: 'That link has expired',
    refusedBody: 'Sign in and we will send you a new one.',
    signIn: 'Sign in',
  },
  fr: {
    confirmedTitle: 'E-mail confirmé',
    confirmedBody: 'Connectez-vous pour continuer.',
    offlineTitle: 'Impossible de joindre Altruist',
    offlineBody: 'Vérifiez votre connexion et rouvrez le lien.',
    refusedTitle: 'Ce lien a expiré',
    refusedBody: 'Connectez-vous et nous vous en enverrons un nouveau.',
    signIn: 'Se connecter',
  },
  tw: {
    confirmedTitle: 'Yɛasi email no so dua',
    confirmedBody: 'Kɔ mu na kɔ so.',
    offlineTitle: 'Yɛantumi anka Altruist',
    offlineBody: 'Hwɛ wo intanɛt na bue link no bio.',
    refusedTitle: 'Link no atwam',
    refusedBody: 'Kɔ mu na yɛde foforɔ bɛbrɛ wo.',
    signIn: 'Kɔ mu',
  },
  gaa: {
    confirmedTitle: 'Akpɛlɛ email lɛ nɔ',
    confirmedBody: 'Bote mli ni oya nɔ.',
    offlineTitle: 'Ashɛɛɛ Altruist nɔ',
    offlineBody: 'Kwɛ o intanɛt ni ogbele link lɛ ekoŋŋ.',
    refusedTitle: 'Link lɛ egbo',
    refusedBody: 'Bote mli ni wɔbaatsu ehee kɛba.',
    signIn: 'Bote mli',
  },
  ee: {
    confirmedTitle: 'Woka email la dzi',
    confirmedBody: 'Ge ɖe eme nàyi edzi.',
    offlineTitle: 'Míete ŋu ɖo Altruist gbɔ o',
    offlineBody: 'Kpɔ wò intanɛt eye nàgaʋu link la.',
    refusedTitle: 'Link la yi',
    refusedBody: 'Ge ɖe eme eye míaɖo yeye ɖe wò.',
    signIn: 'Ge ɖe eme',
  },
  ha: {
    confirmedTitle: 'An tabbatar da imel',
    confirmedBody: 'Shiga don ci gaba.',
    offlineTitle: 'Ba a iya kaiwa ga Altruist ba',
    offlineBody: 'Duba haɗin intanet ɗinka ka sake buɗe hanyar.',
    refusedTitle: 'Wannan hanyar ta ƙare',
    refusedBody: 'Shiga za mu aiko maka da sabuwa.',
    signIn: 'Shiga',
  },
});

type Outcome =
  | { kind: 'working' }
  | { kind: 'confirmed-elsewhere' }
  | { kind: 'offline' }
  | { kind: 'refused'; message: string };

export default function AuthCallback() {
  const tr = useT(S);
  const { d } = useDesignScale();
  const params = useLocalSearchParams<{ code?: string; error_description?: string }>();
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'working' });

  useEffect(() => {
    if (isProviderSignInOpen()) {
      if (router.canGoBack()) router.back();
      else router.replace('/');
      return;
    }

    if (params.error_description) {
      setOutcome({ kind: 'refused', message: params.error_description.replace(/\+/g, ' ') });
      return;
    }
    if (!params.code) {
      router.replace('/');
      return;
    }

    let cancelled = false;
    redeemAuthCode(params.code)
      .then(async (session) => {
        if (cancelled) return;
        await setSession(session.userId);
        router.replace('/home');
      })
      .catch((e) => {
        if (cancelled) return;
        setOutcome(e instanceof NetworkError ? { kind: 'offline' } : { kind: 'confirmed-elsewhere' });
      });
    return () => {
      cancelled = true;
    };
  }, [params.code, params.error_description]);

  if (outcome.kind === 'working') return <FixedScreen />;

  const copy = {
    'confirmed-elsewhere': {
      icon: 'check' as const,
      title: tr('confirmedTitle'),
      body: tr('confirmedBody'),
    },
    offline: {
      icon: 'danger' as const,
      title: tr('offlineTitle'),
      body: tr('offlineBody'),
    },
    refused: {
      icon: 'danger' as const,
      title: tr('refusedTitle'),
      body: tr('refusedBody'),
    },
  }[outcome.kind];

  return (
    <FormScreen gap={20}>
      <View style={{ height: d(64) }} />

      <FeatureIcon size={112} tone="subtle">
        <Icon name={copy.icon} size={d(47)} tone={copy.icon === 'check' ? 'brand' : 'danger'} />
      </FeatureIcon>

      <View style={{ gap: d(10) }}>
        <Text variant="displayS" style={{ fontSize: d(28), lineHeight: d(32) }}>
          {copy.title}
        </Text>
        <Text variant="bodyL" tone="secondary" style={{ fontSize: d(16), lineHeight: d(24) }}>
          {copy.body}
        </Text>
      </View>

      <Button label={tr('signIn')} size="large" onPress={() => router.replace('/login')} />
    </FormScreen>
  );
}
