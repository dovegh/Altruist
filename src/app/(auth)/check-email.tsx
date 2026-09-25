/**
 * Check Your Email — ported 1:1 from Figma node 55:30.
 *
 * Content: V gap 20, pad 64/24/40/24. Top App Bar → 40pt spacer → 112pt
 * brand-subtle feature circle with a 47pt send glyph → Head → Primary →
 * Tertiary Disabled resend countdown.
 *
 * Shown after two different emails: the sign-up confirmation (`kind=signup`)
 * and the password reset (`kind=reset`, the default). It used to say "reset
 * link" after sign-up too, and Resend only restarted the countdown — nothing
 * was sent. Resend now sends the right email again.
 */
import React, { useEffect, useState } from 'react';
import { View, Linking, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen, FeatureIcon } from '@/components/ui/FormScreen';
import { TitleAppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { FormMessage, describeFailure } from '@/components/ui/FormMessage';
import { requestPasswordReset, resendConfirmation } from '@/lib/api';
import { useProfile } from '@/features/profile/store';

const RESEND_SECONDS = 42;

export default function CheckYourEmail() {
  const params = useLocalSearchParams<{ email?: string; kind?: 'signup' | 'reset' }>();
  const profile = useProfile();
  const kind = params.kind === 'signup' ? 'signup' : 'reset';
  // The address typed on the previous screen, or the account's, or nothing pretending to be one.
  const address = params.email || profile.email || '';
  const email = address || 'your email address';
  const { d } = useDesignScale();
  const [left, setLeft] = useState(RESEND_SECONDS);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (left <= 0) return;
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [left]);

  const clock = `0:${String(left).padStart(2, '0')}`;

  const resend = async () => {
    if (!address) return;
    setError(null);
    setSent(false);
    setSending(true);
    try {
      if (kind === 'signup') await resendConfirmation(address);
      else await requestPasswordReset(address);
      setSent(true);
      setLeft(RESEND_SECONDS);
    } catch (e) {
      setError(describeFailure(e));
    } finally {
      setSending(false);
    }
  };

  const openMail = () =>
    // iOS opens the Mail inbox; Android has no inbox URL, so this opens the
    // mail app's composer, one Back away from the inbox.
    Linking.openURL(Platform.OS === 'ios' ? 'message:' : 'mailto:').catch(() => {
      if (kind === 'reset') router.push('/set-password');
    });

  return (
    <FormScreen gap={20}>
      <TitleAppBar title="" />

      <View style={{ height: d(40) }} />

      <FeatureIcon size={112} tone="subtle">
        <Icon name="send" size={d(47)} tone="brand" />
      </FeatureIcon>

      <View style={{ gap: d(10) }}>
        <Text variant="displayS" style={{ fontSize: d(28), lineHeight: d(32) }}>
          {kind === 'signup' ? 'Confirm your email' : 'Check your email'}
        </Text>
        <Text variant="bodyL" tone="secondary" style={{ fontSize: d(16), lineHeight: d(24) }}>
          {kind === 'signup'
            ? `We sent a confirmation link to ${email}.`
            : `We sent a reset link to ${email}. It expires in 30 minutes.`}
        </Text>
      </View>

      {sent ? (
        <FormMessage tone="success">{`Sent. Check your spam folder too.`}</FormMessage>
      ) : null}
      {error ? <FormMessage>{error}</FormMessage> : null}

      <Button label="Open mail app" size="large" onPress={openMail} />
      <Button
        label={sending ? 'Sending…' : left > 0 ? `Resend in ${clock}` : 'Resend link'}
        variant="tertiary"
        size="large"
        disabled={left > 0 || sending || !address}
        onPress={resend}
      />
      {kind === 'signup' ? (
        <Button
          label="Already confirmed? Sign in"
          variant="tertiary"
          size="large"
          onPress={() => router.replace('/login')}
        />
      ) : null}
    </FormScreen>
  );
}
