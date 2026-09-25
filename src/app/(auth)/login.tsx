/**
 * Login — ported 1:1 from Figma node 44:14.
 *
 * Content: V gap 20, pad 64/24/40/24. Top App Bar (Title, empty title) → Head →
 * two Input Fields → "Forgot password?" right-aligned → Primary Large →
 * or-divider → two social buttons → footer line.
 *
 * The three failure modes are kept apart because they need different words and
 * lead somewhere different:
 *
 *   wrong credentials → DeclinedError → the message, in place, field intact
 *   unreachable       → NetworkError  → "check your connection", retryable
 *   anything else     → ApiError      → a fault on our side, not the user's
 *
 * Collapsing them is how an app tells someone their password is wrong when the
 * server is down, and they change a password that was never the problem.
 */
import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTheme, useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen } from '@/components/ui/FormScreen';
import { TitleAppBar } from '@/components/ui/AppBar';
import { InputField } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { GoogleMark, AppleMark } from '@/components/BrandMarks';
import {
  DeclinedError,
  NetworkError,
  isUnconfirmedEmail,
  resendConfirmation,
  signIn as apiSignIn,
  signInWithProvider,
  type OAuthProvider,
} from '@/lib/api';
import { setSession } from '@/lib/session';

export default function Login() {
  const t = useTokens();
  const { name: themeName } = useTheme();
  const { d } = useDesignScale();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<null | 'password' | OAuthProvider>(null);
  const [error, setError] = useState<string | null>(null);
  // The account exists but its email was never confirmed: offer the link again.
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [resending, setResending] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0;

  /** Turns any thrown failure into the one sentence to put on screen. */
  const describe = (e: unknown): string => {
    if (e instanceof NetworkError) {
      return 'Could not reach Altruist. Check your connection and try again.';
    }
    if (e instanceof DeclinedError) return e.message;
    return 'Something went wrong on our side. Try again in a moment.';
  };

  const withSession = async (run: () => Promise<{ userId: string }>, mode: 'password' | OAuthProvider) => {
    setError(null);
    setUnconfirmed(false);
    setBusy(mode);
    try {
      const session = await run();
      // The user id is what the app treats as "signed in" for the fixture path;
      // Supabase keeps the real token itself and refreshes it.
      await setSession(session.userId);
      router.replace('/home');
    } catch (e) {
      if (isUnconfirmedEmail(e)) {
        setUnconfirmed(true);
        setError(
          'Confirm your email first. Check your inbox for the link.',
        );
      } else {
        setError(describe(e));
      }
    } finally {
      setBusy(null);
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      await resendConfirmation(email.trim());
      router.push({ pathname: '/check-email', params: { email: email.trim(), kind: 'signup' } });
    } catch (e) {
      setError(describe(e));
    } finally {
      setResending(false);
    }
  };

  const signIn = () =>
    withSession(() => apiSignIn(email.trim(), password), 'password');

  const social = (label: string, provider: OAuthProvider, mark: React.ReactNode) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Continue with ${label}`}
      accessibilityState={{ disabled: busy !== null }}
      disabled={busy !== null}
      onPress={() => withSession(() => signInWithProvider(provider), provider)}
      style={({ pressed }) => ({
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: d(10),
        height: d(56),
        borderRadius: d(18),
        backgroundColor: t.colors.bg.surfaceRaised,
        borderWidth: 1,
        borderColor: t.colors.border.default,
        opacity: busy !== null ? 0.5 : pressed ? 0.85 : 1,
      })}
    >
      {mark}
      <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
        {busy === provider ? 'Opening…' : label}
      </Text>
    </Pressable>
  );

  return (
    <FormScreen gap={20}>
      <TitleAppBar title="" />

      <View style={{ gap: d(10) }}>
        <Text variant="displayS" style={{ fontSize: d(28), lineHeight: d(32) }}>
          Welcome back
        </Text>
        <Text variant="bodyL" tone="secondary" style={{ fontSize: d(16), lineHeight: d(24) }}>
          Sign in to track prescriptions and reorder in a tap.
        </Text>
      </View>

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
        autoComplete="password"
      />

      {/* Errors sit above the button, so the thing that failed and the thing
          you press again are in the same glance. */}
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

      {unconfirmed ? (
        <Button
          label="Send the confirmation link again"
          variant="tertiary"
          size="large"
          loading={resending}
          disabled={resending}
          onPress={resend}
        />
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/forgot')}
        hitSlop={8}
        style={{ alignSelf: 'stretch' }}
      >
        <Text
          variant="labelM"
          tone="brand"
          style={{ textAlign: 'right', fontSize: d(14), lineHeight: d(18) }}
        >
          Forgot password?
        </Text>
      </Pressable>

      <Button
        label="Sign in"
        size="large"
        loading={busy === 'password'}
        disabled={!canSubmit || busy !== null}
        onPress={signIn}
      />

      {/* Or divider — two 111pt rules with a 92pt label between them */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(14), height: d(20) }}>
        <View style={{ flex: 1, height: 1, backgroundColor: t.colors.border.subtle }} />
        <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
          or continue with
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: t.colors.border.subtle }} />
      </View>

      <View style={{ flexDirection: 'row', gap: d(12) }}>
        {social('Google', 'google', <GoogleMark size={d(20)} />)}
        {social(
          'Apple',
          'apple',
          <AppleMark size={d(20)} tone={themeName === 'light' ? 'black' : 'white'} />,
        )}
      </View>

      <Pressable accessibilityRole="button" onPress={() => router.push('/register')} hitSlop={8}>
        <Text
          variant="bodyM"
          tone="secondary"
          center
          style={{ fontSize: d(14), lineHeight: d(21) }}
        >
          New to Altruist?{'  '}
          <Text variant="labelM" tone="brand" style={{ fontSize: d(14) }}>
            Create an account
          </Text>
        </Text>
      </Pressable>
    </FormScreen>
  );
}
