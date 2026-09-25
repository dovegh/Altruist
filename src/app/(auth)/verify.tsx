/**
 * Verify Phone — ported from Figma node 218:194.
 *
 * Scroll content: V gap 20, pad 64/24/150/24. Six 48.7×62 digit cells (r16,
 * bg/surface, border/subtle 1) with the active cell on border/brand 2 and a 2pt
 * caret. Footer is pinned.
 *
 * Two steps. First the number — prefilled from the profile, checked as a Ghana
 * mobile and sent in +233 form, because that is what Supabase and Twilio need.
 * Then the code, with a real resend countdown.
 *
 * It used to message whatever was in the profile as typed ("024…" rather than
 * "+23324…"), fall back to sending a code to the words "your number", show a
 * resend timer that never moved, and offer "Call me with the code", which did
 * nothing — Supabase has no voice channel for a number change.
 *
 * The six cells are display only — a single hidden TextInput owns the value, so
 * paste, autofill and backspace all behave the way the OS expects.
 */
import React, { useRef, useState, useEffect } from 'react';
import { View, Pressable, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen, StickyFooter } from '@/components/ui/FormScreen';
import { TitleAppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { InputField } from '@/components/ui/Input';
import { FormMessage, describeFailure } from '@/components/ui/FormMessage';
import { NetworkBadge } from '@/components/NetworkBadge';
import { useProfile, useProfileStore } from '@/features/profile/store';
import { sendPhoneCode, verifyPhoneCode } from '@/lib/api';
import { detectProvider, formatGhanaMobile, ghanaE164, normalizeGhanaMobile } from '@/lib/momo';

const LENGTH = 6;
const RESEND_SECONDS = 60;

export default function VerifyPhone() {
  const params = useLocalSearchParams<{ phone?: string }>();
  const profile = useProfile();
  const t = useTokens();
  const { d } = useDesignScale();

  const start = normalizeGhanaMobile(params.phone || profile.phone || '');
  const [number, setNumber] = useState(start ? formatGhanaMobile(start) : '');
  const [numberError, setNumberError] = useState<string | undefined>();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [left, setLeft] = useState(0);
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<TextInput>(null);
  const network = detectProvider(number);

  useEffect(() => {
    if (left <= 0) return;
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [left]);

  const send = async () => {
    const e164 = ghanaE164(number);
    if (!e164) {
      setNumberError('Enter a Ghana mobile number, like 024 400 1188.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await sendPhoneCode(e164);
      setSentTo(e164);
      setCode('');
      setLeft(RESEND_SECONDS);
      setTimeout(() => input.current?.focus(), 250);
    } catch (e) {
      setError(describeFailure(e));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!sentTo) return;
    setError(null);
    setBusy(true);
    try {
      await verifyPhoneCode(sentTo, code);
      await useProfileStore.getState().reload();
      if (router.canGoBack()) router.back();
      else router.replace('/home');
    } catch (e) {
      setError(describeFailure(e));
    } finally {
      setBusy(false);
    }
  };

  const cells = Array.from({ length: LENGTH }, (_, i) => {
    const char = code[i];
    const active = focused && i === Math.min(code.length, LENGTH - 1);
    return (
      <View
        key={i}
        style={{
          flex: 1,
          height: d(62),
          borderRadius: d(16),
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: t.colors.bg.surface,
          borderWidth: active ? 2 : 1,
          borderColor: active ? t.colors.border.brand : t.colors.border.subtle,
        }}
      >
        {char ? (
          <Text variant="numericM" style={{ fontSize: d(20), lineHeight: d(26) }}>
            {char}
          </Text>
        ) : active ? (
          <View
            style={{ width: d(2), height: d(26), borderRadius: d(2), backgroundColor: t.colors.bg.brand }}
          />
        ) : null}
      </View>
    );
  });

  const shown = sentTo ? formatGhanaMobile(`0${sentTo.slice(4)}`) : '';

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      <FormScreen gap={20}>
        <TitleAppBar title="Verify" />

        <View style={{ gap: d(10) }}>
          <Text variant="displayS" style={{ fontSize: d(28), lineHeight: d(32) }}>
            {sentTo ? 'Enter the code' : 'Confirm your number'}
          </Text>
          <Text variant="bodyL" tone="secondary" style={{ fontSize: d(16), lineHeight: d(24) }}>
            {sentTo
              ? `We sent a 6-digit code to ${shown}.`
              : 'We will text you a 6-digit code.'}
          </Text>
        </View>

        {!sentTo ? (
          <InputField
            label="Mobile number"
            value={number}
            onChangeText={(v) => {
              setNumber(v);
              setNumberError(undefined);
            }}
            placeholder="024 400 1188"
            keyboardType="phone-pad"
            autoComplete="tel"
            maxLength={16}
            error={numberError}
            leading={network ? <NetworkBadge provider={network} size={28} /> : undefined}
          />
        ) : (
          <>
            <Pressable
              accessibilityRole="none"
              accessibilityLabel={`Verification code, ${code.length} of ${LENGTH} digits entered`}
              onPress={() => input.current?.focus()}
              style={{ flexDirection: 'row', gap: d(10) }}
            >
              {cells}
              <TextInput
                ref={input}
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, LENGTH))}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                maxLength={LENGTH}
                // Off-screen, not hidden: a display:none input cannot take focus.
                style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
              />
            </Pressable>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(8) }}>
              <Icon name="clock" size={d(16)} tone="tertiary" />
              {left > 0 ? (
                <Text variant="bodyS" tone="tertiary" style={{ flex: 1, fontSize: d(13), lineHeight: d(19) }}>
                  Resend code in 0:{String(left).padStart(2, '0')}
                </Text>
              ) : (
                <Pressable accessibilityRole="button" hitSlop={8} onPress={send} style={{ flex: 1 }}>
                  <Text variant="labelM" tone="brand" style={{ fontSize: d(14), lineHeight: d(18) }}>
                    Resend code
                  </Text>
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => {
                  setSentTo(null);
                  setCode('');
                  setError(null);
                }}
              >
                <Text variant="labelM" tone="brand" style={{ fontSize: d(14), lineHeight: d(18) }}>
                  Change number
                </Text>
              </Pressable>
            </View>
          </>
        )}

        <View
          style={{
            flexDirection: 'row',
            gap: d(12),
            padding: d(14),
            paddingHorizontal: d(16),
            borderRadius: d(20),
            backgroundColor: t.colors.bg.surfaceRaised,
          }}
        >
          <Icon name="shield-check" size={d(18)} tone="primary" />
          <Text variant="caption" tone="tertiary" style={{ flex: 1, fontSize: d(12), lineHeight: d(16) }}>
            Your pharmacist may call this number about a prescription.
          </Text>
        </View>
      </FormScreen>

      <StickyFooter>
        {error ? <FormMessage>{error}</FormMessage> : null}
        {sentTo ? (
          <Button
            label="Verify and continue"
            size="large"
            disabled={code.length < LENGTH || busy}
            loading={busy}
            onPress={confirm}
          />
        ) : (
          <Button
            label="Send code"
            size="large"
            disabled={!number.trim() || busy}
            loading={busy}
            onPress={send}
          />
        )}
      </StickyFooter>
    </View>
  );
}
