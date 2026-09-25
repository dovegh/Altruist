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

export default function ForgotPassword() {
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
          ? 'Could not reach Altruist. Check your connection and try again.'
          : 'Something went wrong on our side. Try again in a moment.',
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
          Reset your password
        </Text>
        <Text variant="bodyL" tone="secondary" style={{ fontSize: d(16), lineHeight: d(24) }}>
          Enter the email on your Altruist account and we will send you a secure reset link.
        </Text>
      </View>

      <InputField
        label="Email address"
        helper="The link expires after 30 minutes."
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
        label="Send reset link"
        size="large"
        loading={busy}
        disabled={!email.trim() || busy}
        onPress={send}
      />
    </FormScreen>
  );
}
