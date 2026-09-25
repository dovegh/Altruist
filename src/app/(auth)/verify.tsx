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
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    numberError: 'Enter a Ghana mobile number, like 024 400 1188.',
    appBar: 'Verify',
    enterCode: 'Enter the code',
    confirmNumber: 'Confirm your number',
    sentTo: 'We sent a 6-digit code to {phone}.',
    willText: 'We will text you a 6-digit code.',
    mobileLabel: 'Mobile number',
    codeA11y: 'Verification code, {count} of {total} digits entered',
    resendIn: 'Resend code in {clock}',
    resend: 'Resend code',
    changeNumber: 'Change number',
    pharmacistNote: 'Your pharmacist may call this number about a prescription.',
    verifyContinue: 'Verify and continue',
    sendCode: 'Send code',
  },
  fr: {
    numberError: 'Saisissez un numéro de mobile ghanéen, par exemple 024 400 1188.',
    appBar: 'Vérification',
    enterCode: 'Saisissez le code',
    confirmNumber: 'Confirmez votre numéro',
    sentTo: 'Nous avons envoyé un code à 6 chiffres au {phone}.',
    willText: 'Nous allons vous envoyer un code à 6 chiffres par SMS.',
    mobileLabel: 'Numéro de mobile',
    codeA11y: 'Code de vérification, {count} chiffres saisis sur {total}',
    resendIn: 'Renvoyer le code dans {clock}',
    resend: 'Renvoyer le code',
    changeNumber: 'Changer de numéro',
    pharmacistNote: "Votre pharmacien peut appeler ce numéro au sujet d'une ordonnance.",
    verifyContinue: 'Vérifier et continuer',
    sendCode: 'Envoyer le code',
  },
  tw: {
    numberError: 'Kyerɛw Ghana fon nɔma, te sɛ 024 400 1188.',
    appBar: 'Si so dua',
    enterCode: 'Kyerɛw code no',
    confirmNumber: 'Si wo nɔma so dua',
    sentTo: 'Yɛde code a ɛyɛ nɔma 6 akɔma {phone}.',
    willText: 'Yɛde code a ɛyɛ nɔma 6 bɛbrɛ wo wɔ SMS so.',
    mobileLabel: 'Fon nɔma',
    codeA11y: 'Code, woakyerɛw {count} wɔ {total} mu',
    resendIn: 'San de code kɔ wɔ {clock}',
    resend: 'San de code kɔ',
    changeNumber: 'Sesa nɔma',
    pharmacistNote: 'Wo oduruyɛfoɔ bɛtumi afrɛ saa nɔma yi wɔ nnuro krataa ho.',
    verifyContinue: 'Si so dua na kɔ so',
    sendCode: 'Fa code kɔ',
  },
  gaa: {
    numberError: 'Ŋma Ghana tɛlifoŋ nɔmba, tamɔ 024 400 1188.',
    appBar: 'Kpɛlɛ nɔ',
    enterCode: 'Ŋma code lɛ',
    confirmNumber: 'Kpɛlɛ o nɔmba lɛ nɔ',
    sentTo: 'Wɔtsu code ni yɔɔ nɔmbai 6 kɛya {phone}.',
    willText: 'Wɔbaatsu code ni yɔɔ nɔmbai 6 kɛba yɛ SMS nɔ.',
    mobileLabel: 'Tɛlifoŋ nɔmba',
    codeA11y: 'Code, oŋma {count} yɛ {total} mli',
    resendIn: 'Tsu code ekoŋŋ yɛ {clock}',
    resend: 'Tsu code ekoŋŋ',
    changeNumber: 'Tsake nɔmba',
    pharmacistNote: 'O tsofatsɛ baanyɛ atswa nɔmba nɛɛ yɛ tsofa wolo he.',
    verifyContinue: 'Kpɛlɛ nɔ ni oya nɔ',
    sendCode: 'Tsu code',
  },
  ee: {
    numberError: 'Ŋlɔ Ghana fon xexlẽdzesi, abe 024 400 1188 ene.',
    appBar: 'Ka edzi',
    enterCode: 'Ŋlɔ code la',
    confirmNumber: 'Ka wò xexlẽdzesi dzi',
    sentTo: 'Míeɖo code si nye xexlẽdzesi 6 ɖe {phone}.',
    willText: 'Míaɖo code si nye xexlẽdzesi 6 ɖe wò le SMS dzi.',
    mobileLabel: 'Fon xexlẽdzesi',
    codeA11y: 'Code, èŋlɔ {count} le {total} me',
    resendIn: 'Gaɖo code le {clock} me',
    resend: 'Gaɖo code',
    changeNumber: 'Trɔ xexlẽdzesi',
    pharmacistNote: 'Wò atikedzraɖola ate ŋu ayɔ xexlẽdzesi sia le atikeŋɔŋlɔ ŋu.',
    verifyContinue: 'Ka edzi eye nàyi edzi',
    sendCode: 'Ɖo code ɖa',
  },
  ha: {
    numberError: 'Shigar da lambar wayar Ghana, kamar 024 400 1188.',
    appBar: 'Tabbatarwa',
    enterCode: 'Shigar da lambar',
    confirmNumber: 'Tabbatar da lambarka',
    sentTo: 'Mun aika lambar lambobi 6 zuwa {phone}.',
    willText: 'Za mu aiko maka da lambar lambobi 6 ta SMS.',
    mobileLabel: 'Lambar waya',
    codeA11y: 'Lambar tabbatarwa, an shigar da {count} cikin {total}',
    resendIn: 'Sake aika lamba cikin {clock}',
    resend: 'Sake aika lamba',
    changeNumber: 'Canza lamba',
    pharmacistNote: 'Mai harhaɗa maganinka zai iya kiran wannan lambar game da takardar magani.',
    verifyContinue: 'Tabbatar ka ci gaba',
    sendCode: 'Aika lamba',
  },
});

const LENGTH = 6;
const RESEND_SECONDS = 60;

export default function VerifyPhone() {
  const tr = useT(S);
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
      setNumberError(tr('numberError'));
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
        <TitleAppBar title={tr('appBar')} />

        <View style={{ gap: d(10) }}>
          <Text variant="displayS" style={{ fontSize: d(28), lineHeight: d(32) }}>
            {sentTo ? tr('enterCode') : tr('confirmNumber')}
          </Text>
          <Text variant="bodyL" tone="secondary" style={{ fontSize: d(16), lineHeight: d(24) }}>
            {sentTo
              ? tr('sentTo', { phone: shown })
              : tr('willText')}
          </Text>
        </View>

        {!sentTo ? (
          <InputField
            label={tr('mobileLabel')}
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
              accessibilityLabel={tr('codeA11y', { count: code.length, total: LENGTH })}
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
                  {tr('resendIn', { clock: `0:${String(left).padStart(2, '0')}` })}
                </Text>
              ) : (
                <Pressable accessibilityRole="button" hitSlop={8} onPress={send} style={{ flex: 1 }}>
                  <Text variant="labelM" tone="brand" style={{ fontSize: d(14), lineHeight: d(18) }}>
                    {tr('resend')}
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
                  {tr('changeNumber')}
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
            {tr('pharmacistNote')}
          </Text>
        </View>
      </FormScreen>

      <StickyFooter>
        {error ? <FormMessage>{error}</FormMessage> : null}
        {sentTo ? (
          <Button
            label={tr('verifyContinue')}
            size="large"
            disabled={code.length < LENGTH || busy}
            loading={busy}
            onPress={confirm}
          />
        ) : (
          <Button
            label={tr('sendCode')}
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
