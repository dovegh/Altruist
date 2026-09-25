/**
 * Set New Password — ported 1:1 from Figma node 55:59.
 *
 * Content: V gap 18, pad 64/24/40/24. Two fields, then a requirements card
 * (bg/surface, r20, pad 16/18, gap 10) with a 20pt status dot per rule, then the
 * submit button.
 *
 * Figma shows the mismatch case (second field in Error, button Disabled). Here
 * the same states are derived from the two values, so the comp is the empty
 * case of the live logic rather than a separate screen.
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
import { DeclinedError, NetworkError, updatePassword } from '@/lib/api';

const RULES = [
  { label: 'At least 10 characters', test: (v: string) => v.length >= 10 },
  { label: 'One number', test: (v: string) => /\d/.test(v) },
  { label: 'One symbol', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

export default function SetNewPassword() {
  const t = useTokens();
  const { d } = useDesignScale();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Supabase applies this to whoever the current session belongs to. Arriving
   * from the emailed recovery link puts a recovery session in place first, so
   * the same call serves both "I forgot it" and "I want to change it".
   */
  const save = async () => {
    setError(null);
    setBusy(true);
    try {
      await updatePassword(password);
      router.replace('/password-changed');
    } catch (e) {
      setError(
        e instanceof NetworkError
          ? 'Could not reach Altruist. Check your connection and try again.'
          : e instanceof DeclinedError
            ? e.message
            : 'Something went wrong on our side. Try again in a moment.',
      );
    } finally {
      setBusy(false);
    }
  };

  const results = RULES.map((r) => ({ ...r, ok: r.test(password) }));
  const allOk = results.every((r) => r.ok);
  const mismatch = confirm.length > 0 && confirm !== password;

  return (
    <FormScreen gap={18}>
      <TitleAppBar title="" />

      <View style={{ gap: d(10) }}>
        <Text variant="displayS" style={{ fontSize: d(28), lineHeight: d(32) }}>
          Set a new password
        </Text>
      </View>

      <InputField
        label="New password"
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••••••"
        secureTextEntry={!reveal}
        autoComplete="new-password"
        trailingIcon={reveal ? 'eye-off' : 'eye'}
        onTrailingPress={() => setReveal((v) => !v)}
      />
      <InputField
        label="Confirm password"
        value={confirm}
        onChangeText={setConfirm}
        placeholder="•••••••••"
        secureTextEntry={!reveal}
        autoComplete="new-password"
        error={mismatch ? 'Passwords do not match.' : undefined}
      />

      {/* Requirements — bg/surface, r20, pad 16/18, gap 10 */}
      <View
        style={{
          gap: d(10),
          paddingVertical: d(16),
          paddingHorizontal: d(18),
          borderRadius: d(20),
          backgroundColor: t.colors.bg.surface,
        }}
      >
        {results.map((r) => (
          <View
            key={r.label}
            accessibilityRole="text"
            accessibilityLabel={`${r.label}: ${r.ok ? 'met' : 'not met'}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: d(10) }}
          >
            <View
              style={{
                width: d(20),
                height: d(20),
                borderRadius: t.radius.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: r.ok ? t.colors.bg.brand : t.colors.bg.surfaceRaised,
              }}
            >
              <Icon
                name={r.ok ? 'check' : 'close'}
                size={d(12)}
                color={r.ok ? t.colors.icon.onBrand : t.colors.icon.tertiary}
              />
            </View>
            <Text
              variant="bodyS"
              tone={r.ok ? 'secondary' : 'tertiary'}
              style={{ flex: 1, fontSize: d(13), lineHeight: d(19) }}
            >
              {r.label}
            </Text>
          </View>
        ))}
      </View>

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
        label="Update password"
        size="large"
        loading={busy}
        disabled={!allOk || confirm !== password || confirm.length === 0 || busy}
        onPress={save}
      />
    </FormScreen>
  );
}
