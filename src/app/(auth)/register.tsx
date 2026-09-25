/**
 * Register — ported 1:1 from Figma node 44:52.
 *
 * Content: V gap 18, pad 64/24/40/24. Four fields, then the liability line, then
 * the primary action.
 *
 * The consent paragraph sits ABOVE the button on purpose: it is the text the
 * button's tap constitutes agreement to, and the design system's rule is that a
 * user never agrees to something rendered below the control that agrees to it.
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
import { DeclinedError, NetworkError, signUp } from '@/lib/api';
import { setSession } from '@/lib/session';

export default function Register() {
  const t = useTokens();
  const { d } = useDesignScale();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Supabase rejects anything under six characters; saying so before the round
  // trip is kinder than a server refusal.
  const canSubmit =
    name.trim().length > 0 && email.trim().length > 0 && password.length >= 6;

  /** Turns any thrown failure into the one sentence to put on screen. */
  const describe = (e: unknown): string => {
    if (e instanceof NetworkError) {
      return 'Could not reach Altruist. Check your connection and try again.';
    }
    if (e instanceof DeclinedError) return e.message;
    return 'Something went wrong on our side. Try again in a moment.';
  };

  const createAccount = async () => {
    setError(null);
    setBusy(true);
    try {
      const result = await signUp({
        email: email.trim(),
        password,
        fullName: name.trim(),
        phone: phone.trim() || undefined,
      });
      if (result.session) {
        await setSession(result.session.userId);
        router.replace('/home');
        return;
      }
      // The project requires a confirmed email, so there is no session yet.
      // Verifying is the next step, and it happens in their inbox.
      router.replace({ pathname: '/check-email', params: { email: email.trim(), kind: 'signup' } });
    } catch (e) {
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormScreen gap={18}>
      <TitleAppBar title="" />

      <View style={{ gap: d(10) }}>
        <Text variant="displayS" style={{ fontSize: d(28), lineHeight: d(32) }}>
          Create your account
        </Text>
      </View>

      <InputField
        label="Full name"
        value={name}
        onChangeText={setName}
        placeholder="Your full name"
        autoComplete="name"
      />
      <InputField
        label="Phone number"
        value={phone}
        onChangeText={setPhone}
        placeholder="+233 XX XXX XXXX"
        keyboardType="phone-pad"
        autoComplete="tel"
      />
      <InputField
        label="Email address"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <InputField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••••"
        secureTextEntry
        autoComplete="new-password"
      />

      <Text variant="bodyS" tone="tertiary" style={{ fontSize: d(13), lineHeight: d(19) }}>
        By creating an account you agree to the Altruist Terms of Service and Privacy Policy.
        Altruist is a technology platform and does not provide medical advice or dispense
        medication.
      </Text>

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
        label="Create account"
        size="large"
        loading={busy}
        disabled={!canSubmit || busy}
        onPress={createAccount}
      />
    </FormScreen>
  );
}
