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
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    networkError: 'Could not reach Altruist. Check your connection and try again.',
    serverError: 'Something went wrong on our side. Try again in a moment.',
    unconfirmed: 'Confirm your email first. Check your inbox for the link.',
    continueWith: 'Continue with {provider}',
    opening: 'Opening…',
    title: 'Welcome back',
    subtitle: 'Sign in to track prescriptions and reorder in a tap.',
    emailLabel: 'Email address',
    passwordLabel: 'Password',
    resendConfirmation: 'Send the confirmation link again',
    forgot: 'Forgot password?',
    signIn: 'Sign in',
    orContinue: 'or continue with',
    newTo: 'New to Altruist?',
    createAccount: 'Create an account',
  },
  fr: {
    networkError: 'Impossible de joindre Altruist. Vérifiez votre connexion et réessayez.',
    serverError: 'Un problème est survenu de notre côté. Réessayez dans un instant.',
    unconfirmed: "Confirmez d'abord votre e-mail. Le lien se trouve dans votre boîte de réception.",
    continueWith: 'Continuer avec {provider}',
    opening: 'Ouverture…',
    title: 'Bon retour',
    subtitle: 'Connectez-vous pour suivre vos ordonnances et recommander en un geste.',
    emailLabel: 'Adresse e-mail',
    passwordLabel: 'Mot de passe',
    resendConfirmation: 'Renvoyer le lien de confirmation',
    forgot: 'Mot de passe oublié ?',
    signIn: 'Se connecter',
    orContinue: 'ou continuer avec',
    newTo: 'Nouveau sur Altruist ?',
    createAccount: 'Créer un compte',
  },
  tw: {
    networkError: 'Yɛantumi anka Altruist. Hwɛ wo intanɛt na san sɔ hwɛ.',
    serverError: 'Biribi ankɔ yie wɔ yɛn fam. San sɔ hwɛ nkyɛ kakra.',
    unconfirmed: 'Di kan si wo email so dua. Hwɛ wo inbox mu ma link no.',
    continueWith: 'Kɔ so wɔ {provider} so',
    opening: 'Ɛrebue…',
    title: 'Akwaaba bio',
    subtitle: 'Kɔ mu na hwɛ wo nnuro nkrataa na tɔ bio ntɛm.',
    emailLabel: 'Email address',
    passwordLabel: 'Ahintasɛm',
    resendConfirmation: 'San de link a wode si so dua no kɔ',
    forgot: 'Wo werɛ afi wo ahintasɛm?',
    signIn: 'Kɔ mu',
    orContinue: 'anaa kɔ so wɔ',
    newTo: 'Woyɛ foforɔ wɔ Altruist?',
    createAccount: 'Bue akontaa',
  },
  gaa: {
    networkError: 'Ashɛɛɛ Altruist nɔ. Kwɛ o intanɛt ni oka ekoŋŋ.',
    serverError: 'Nɔko tɔ̃ yɛ wɔ gbɛfaŋ. Ka ekoŋŋ yɛ be fioo sɛɛ.',
    unconfirmed: 'Kpɛlɛ o email lɛ nɔ klɛŋklɛŋ. Kwɛ o inbox lɛ mli ha link lɛ.',
    continueWith: 'Ya nɔ kɛ {provider}',
    opening: 'Egbeleɔ…',
    title: 'Oba ekoŋŋ',
    subtitle: 'Bote mli koni okwɛ o tsofa woloi ni ohe ekoŋŋ oya.',
    emailLabel: 'Email address',
    passwordLabel: 'Password',
    resendConfirmation: 'Tsu kpɛlɛmɔ link lɛ ekoŋŋ',
    forgot: 'Ohiɛ kpa o password nɔ?',
    signIn: 'Bote mli',
    orContinue: 'loo ya nɔ kɛ',
    newTo: 'Oji mɔ hee yɛ Altruist?',
    createAccount: 'Fee akɔŋt',
  },
  ee: {
    networkError: 'Míete ŋu ɖo Altruist gbɔ o. Kpɔ wò intanɛt eye nàgate kpɔ.',
    serverError: 'Nane gblẽ le mía gbɔ. Gate kpɔ le ɣeyiɣi kpui aɖe megbe.',
    unconfirmed: 'Ka wò email dzi gbã. Kpɔ wò inbox me hena link la.',
    continueWith: 'Yi edzi kple {provider}',
    opening: 'Míele eʋum…',
    title: 'Woezɔ ake',
    subtitle: 'Ge ɖe eme nàkpɔ wò atikeŋɔŋlɔwo eye nàgaƒle nu kabakaba.',
    emailLabel: 'Email address',
    passwordLabel: 'Nyaʋiʋli',
    resendConfirmation: 'Gaɖo link si nàtsɔ aka edzi la ɖa',
    forgot: 'Nyaʋiʋli ŋlɔ be wò?',
    signIn: 'Ge ɖe eme',
    orContinue: 'alo yi edzi kple',
    newTo: 'Èle yeye le Altruist?',
    createAccount: 'Ʋu akɔnta',
  },
  ha: {
    networkError: 'Ba a iya kaiwa ga Altruist ba. Duba haɗin intanet ɗinka ka sake gwadawa.',
    serverError: 'Wani abu ya faru a ɓangarenmu. Sake gwadawa nan da ɗan lokaci.',
    unconfirmed: 'Ka fara tabbatar da imel ɗinka. Duba akwatin saƙonka don hanyar.',
    continueWith: 'Ci gaba da {provider}',
    opening: 'Ana buɗewa…',
    title: 'Barka da dawowa',
    subtitle: 'Shiga don bibiyar takardun magani da sake yin oda cikin sauƙi.',
    emailLabel: 'Adireshin imel',
    passwordLabel: 'Kalmar sirri',
    resendConfirmation: 'Sake aika hanyar tabbatarwa',
    forgot: 'Ka manta kalmar sirri?',
    signIn: 'Shiga',
    orContinue: 'ko ci gaba da',
    newTo: 'Sabo a Altruist?',
    createAccount: 'Ƙirƙiri asusu',
  },
});

export default function Login() {
  const tr = useT(S);
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
      return tr('networkError');
    }
    if (e instanceof DeclinedError) return e.message;
    return tr('serverError');
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
          tr('unconfirmed'),
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
      accessibilityLabel={tr('continueWith', { provider: label })}
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
        {busy === provider ? tr('opening') : label}
      </Text>
    </Pressable>
  );

  return (
    <FormScreen gap={20}>
      <TitleAppBar title="" />

      <View style={{ gap: d(10) }}>
        <Text variant="displayS" style={{ fontSize: d(28), lineHeight: d(32) }}>
          {tr('title')}
        </Text>
        <Text variant="bodyL" tone="secondary" style={{ fontSize: d(16), lineHeight: d(24) }}>
          {tr('subtitle')}
        </Text>
      </View>

      <InputField
        label={tr('emailLabel')}
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <InputField
        label={tr('passwordLabel')}
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
          label={tr('resendConfirmation')}
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
          {tr('forgot')}
        </Text>
      </Pressable>

      <Button
        label={tr('signIn')}
        size="large"
        loading={busy === 'password'}
        disabled={!canSubmit || busy !== null}
        onPress={signIn}
      />

      {/* Or divider — two 111pt rules with a 92pt label between them */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(14), height: d(20) }}>
        <View style={{ flex: 1, height: 1, backgroundColor: t.colors.border.subtle }} />
        <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
          {tr('orContinue')}
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
          {tr('newTo')}{'  '}
          <Text variant="labelM" tone="brand" style={{ fontSize: d(14) }}>
            {tr('createAccount')}
          </Text>
        </Text>
      </Pressable>
    </FormScreen>
  );
}
