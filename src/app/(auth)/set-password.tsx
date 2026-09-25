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
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    networkError: 'Could not reach Altruist. Check your connection and try again.',
    serverError: 'Something went wrong on our side. Try again in a moment.',
    title: 'Set a new password',
    newLabel: 'New password',
    confirmLabel: 'Confirm password',
    mismatch: 'Passwords do not match.',
    ruleLength: 'At least 10 characters',
    ruleNumber: 'One number',
    ruleSymbol: 'One symbol',
    ruleMet: '{rule}: met',
    ruleNotMet: '{rule}: not met',
    save: 'Update password',
  },
  fr: {
    networkError: 'Impossible de joindre Altruist. Vérifiez votre connexion et réessayez.',
    serverError: 'Un problème est survenu de notre côté. Réessayez dans un instant.',
    title: 'Choisissez un nouveau mot de passe',
    newLabel: 'Nouveau mot de passe',
    confirmLabel: 'Confirmez le mot de passe',
    mismatch: 'Les mots de passe ne correspondent pas.',
    ruleLength: 'Au moins 10 caractères',
    ruleNumber: 'Un chiffre',
    ruleSymbol: 'Un symbole',
    ruleMet: '{rule} : respecté',
    ruleNotMet: '{rule} : non respecté',
    save: 'Mettre à jour le mot de passe',
  },
  tw: {
    networkError: 'Yɛantumi anka Altruist. Hwɛ wo intanɛt na san sɔ hwɛ.',
    serverError: 'Biribi ankɔ yie wɔ yɛn fam. San sɔ hwɛ nkyɛ kakra.',
    title: 'Yɛ ahintasɛm foforɔ',
    newLabel: 'Ahintasɛm foforɔ',
    confirmLabel: 'San kyerɛw ahintasɛm no',
    mismatch: 'Ahintasɛm no nyɛ pɛ.',
    ruleLength: 'Nkyerɛwde 10 anaa nea ɛboro saa',
    ruleNumber: 'Nɔma baako',
    ruleSymbol: 'Agyiraeɛ baako',
    ruleMet: '{rule}: ɛyɛ',
    ruleNotMet: '{rule}: ɛnyɛ yie',
    save: 'Sesa ahintasɛm',
  },
  gaa: {
    networkError: 'Ashɛɛɛ Altruist nɔ. Kwɛ o intanɛt ni oka ekoŋŋ.',
    serverError: 'Nɔko tɔ̃ yɛ wɔ gbɛfaŋ. Ka ekoŋŋ yɛ be fioo sɛɛ.',
    title: 'Fee password hee',
    newLabel: 'Password hee',
    confirmLabel: 'Ŋma password lɛ ekoŋŋ',
    mismatch: 'Password lɛ kɛ ekome kpaaa gbee.',
    ruleLength: 'Okadi 10 loo fe nakai',
    ruleNumber: 'Nɔmba kome',
    ruleSymbol: 'Okadi kome',
    ruleMet: '{rule}: eye',
    ruleNotMet: '{rule}: eyeee',
    save: 'Tsake password',
  },
  ee: {
    networkError: 'Míete ŋu ɖo Altruist gbɔ o. Kpɔ wò intanɛt eye nàgate kpɔ.',
    serverError: 'Nane gblẽ le mía gbɔ. Gate kpɔ le ɣeyiɣi kpui aɖe megbe.',
    title: 'Ɖo nyaʋiʋli yeye',
    newLabel: 'Nyaʋiʋli yeye',
    confirmLabel: 'Gaŋlɔ nyaʋiʋli la',
    mismatch: 'Nyaʋiʋliawo mesɔ o.',
    ruleLength: 'Nuŋlɔdzesi 10 ya teti',
    ruleNumber: 'Xexlẽdzesi ɖeka',
    ruleSymbol: 'Dzesi ɖeka',
    ruleMet: '{rule}: esɔ',
    ruleNotMet: '{rule}: mesɔ o',
    save: 'Trɔ nyaʋiʋli',
  },
  ha: {
    networkError: 'Ba a iya kaiwa ga Altruist ba. Duba haɗin intanet ɗinka ka sake gwadawa.',
    serverError: 'Wani abu ya faru a ɓangarenmu. Sake gwadawa nan da ɗan lokaci.',
    title: 'Saita sabuwar kalmar sirri',
    newLabel: 'Sabuwar kalmar sirri',
    confirmLabel: 'Tabbatar da kalmar sirri',
    mismatch: 'Kalmomin sirrin ba su yi daidai ba.',
    ruleLength: 'Aƙalla haruffa 10',
    ruleNumber: 'Lamba ɗaya',
    ruleSymbol: 'Alama ɗaya',
    ruleMet: '{rule}: an cika',
    ruleNotMet: '{rule}: ba a cika ba',
    save: 'Sabunta kalmar sirri',
  },
});

const RULES = [
  { key: 'ruleLength', test: (v: string) => v.length >= 10 },
  { key: 'ruleNumber', test: (v: string) => /\d/.test(v) },
  { key: 'ruleSymbol', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
] as const;

export default function SetNewPassword() {
  const tr = useT(S);
  const t = useTokens();
  const { d } = useDesignScale();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
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
          ? tr('networkError')
          : e instanceof DeclinedError
            ? e.message
            : tr('serverError'),
      );
    } finally {
      setBusy(false);
    }
  };

  const results = RULES.map((r) => ({ ...r, label: tr(r.key), ok: r.test(password) }));
  const allOk = results.every((r) => r.ok);
  const mismatch = confirm.length > 0 && confirm !== password;

  return (
    <FormScreen gap={18}>
      <TitleAppBar title="" />

      <View style={{ gap: d(10) }}>
        <Text variant="displayS" style={{ fontSize: d(28), lineHeight: d(32) }}>
          {tr('title')}
        </Text>
      </View>

      <InputField
        label={tr('newLabel')}
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••••••"
        secureTextEntry
        autoComplete="new-password"
      />
      <InputField
        label={tr('confirmLabel')}
        value={confirm}
        onChangeText={setConfirm}
        placeholder="•••••••••"
        secureTextEntry
        autoComplete="new-password"
        error={mismatch ? tr('mismatch') : undefined}
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
            key={r.key}
            accessibilityRole="text"
            accessibilityLabel={tr(r.ok ? 'ruleMet' : 'ruleNotMet', { rule: r.label })}
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
        label={tr('save')}
        size="large"
        loading={busy}
        disabled={!allOk || confirm !== password || confirm.length === 0 || busy}
        onPress={save}
      />
    </FormScreen>
  );
}
