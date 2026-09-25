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

type Outcome =
  | { kind: 'working' }
  | { kind: 'confirmed-elsewhere' }
  | { kind: 'offline' }
  | { kind: 'refused'; message: string };

export default function AuthCallback() {
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
      title: 'Email confirmed',
      body: 'Sign in to continue.',
    },
    offline: {
      icon: 'danger' as const,
      title: 'Could not reach Altruist',
      body: 'Check your connection and open the link again.',
    },
    refused: {
      icon: 'danger' as const,
      title: 'That link has expired',
      body: 'Sign in and we will send you a new one.',
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

      <Button label="Sign in" size="large" onPress={() => router.replace('/login')} />
    </FormScreen>
  );
}
