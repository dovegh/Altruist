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
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    networkError: 'Could not reach Altruist. Check your connection and try again.',
    serverError: 'Something went wrong on our side. Try again in a moment.',
    title: 'Create your account',
    nameLabel: 'Full name',
    namePlaceholder: 'Your full name',
    phoneLabel: 'Phone number',
    emailLabel: 'Email address',
    passwordLabel: 'Password',
    consent:
      'By creating an account you agree to the Altruist Terms of Service and Privacy Policy. Altruist is a technology platform and does not provide medical advice or dispense medication.',
    create: 'Create account',
  },
  fr: {
    networkError: 'Impossible de joindre Altruist. Vérifiez votre connexion et réessayez.',
    serverError: 'Un problème est survenu de notre côté. Réessayez dans un instant.',
    title: 'Créez votre compte',
    nameLabel: 'Nom complet',
    namePlaceholder: 'Votre nom complet',
    phoneLabel: 'Numéro de téléphone',
    emailLabel: 'Adresse e-mail',
    passwordLabel: 'Mot de passe',
    consent:
      "En créant un compte, vous acceptez les Conditions d'utilisation et la Politique de confidentialité d'Altruist. Altruist est une plateforme technologique : elle ne donne pas d'avis médical et ne délivre pas de médicaments.",
    create: 'Créer le compte',
  },
  tw: {
    networkError: 'Yɛantumi anka Altruist. Hwɛ wo intanɛt na san sɔ hwɛ.',
    serverError: 'Biribi ankɔ yie wɔ yɛn fam. San sɔ hwɛ nkyɛ kakra.',
    title: 'Bue wo akontaa',
    nameLabel: 'Wo din nyinaa',
    namePlaceholder: 'Wo din nyinaa',
    phoneLabel: 'Fon nɔma',
    emailLabel: 'Email address',
    passwordLabel: 'Ahintasɛm',
    consent:
      'Sɛ wobue akontaa a, na wopene Altruist Terms of Service ne Privacy Policy so. Altruist yɛ mfiridwuma; ɛmma ayaresa ho afotuo na ɛntɔn nnuro.',
    create: 'Bue akontaa',
  },
  gaa: {
    networkError: 'Ashɛɛɛ Altruist nɔ. Kwɛ o intanɛt ni oka ekoŋŋ.',
    serverError: 'Nɔko tɔ̃ yɛ wɔ gbɛfaŋ. Ka ekoŋŋ yɛ be fioo sɛɛ.',
    title: 'Fee o akɔŋt',
    nameLabel: 'O gbɛi muu',
    namePlaceholder: 'O gbɛi muu',
    phoneLabel: 'Tɛlifoŋ nɔmba',
    emailLabel: 'Email address',
    passwordLabel: 'Password',
    consent:
      'Kɛ ofee akɔŋt lɛ, okpɛlɛ Altruist Terms of Service kɛ Privacy Policy lɛ nɔ. Altruist ji tɛknoloji nɔ; ekɛɛɛ helatsamɔ ŋaawoo ni ehɔɔɔ tsofai.',
    create: 'Fee akɔŋt',
  },
  ee: {
    networkError: 'Míete ŋu ɖo Altruist gbɔ o. Kpɔ wò intanɛt eye nàgate kpɔ.',
    serverError: 'Nane gblẽ le mía gbɔ. Gate kpɔ le ɣeyiɣi kpui aɖe megbe.',
    title: 'Ʋu wò akɔnta',
    nameLabel: 'Wò ŋkɔ bliboa',
    namePlaceholder: 'Wò ŋkɔ bliboa',
    phoneLabel: 'Fon xexlẽdzesi',
    emailLabel: 'Email address',
    passwordLabel: 'Nyaʋiʋli',
    consent:
      'Ne èʋu akɔnta la, èlɔ̃ ɖe Altruist ƒe Terms of Service kple Privacy Policy dzi. Altruist nye mɔ̃ɖaŋu; metsɔa atikewɔwɔ ƒe aɖaŋu o eye medzraa atike o.',
    create: 'Ʋu akɔnta',
  },
  ha: {
    networkError: 'Ba a iya kaiwa ga Altruist ba. Duba haɗin intanet ɗinka ka sake gwadawa.',
    serverError: 'Wani abu ya faru a ɓangarenmu. Sake gwadawa nan da ɗan lokaci.',
    title: 'Ƙirƙiri asusunka',
    nameLabel: 'Cikakken suna',
    namePlaceholder: 'Cikakken sunanka',
    phoneLabel: 'Lambar waya',
    emailLabel: 'Adireshin imel',
    passwordLabel: 'Kalmar sirri',
    consent:
      'Ta hanyar ƙirƙirar asusu ka yarda da Sharuɗɗan Sabis da Manufar Sirri na Altruist. Altruist dandalin fasaha ne; ba ya ba da shawarar likita kuma ba ya ba da magani.',
    create: 'Ƙirƙiri asusu',
  },
});

export default function Register() {
  const tr = useT(S);
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
      return tr('networkError');
    }
    if (e instanceof DeclinedError) return e.message;
    return tr('serverError');
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
          {tr('title')}
        </Text>
      </View>

      <InputField
        label={tr('nameLabel')}
        value={name}
        onChangeText={setName}
        placeholder={tr('namePlaceholder')}
        autoComplete="name"
      />
      <InputField
        label={tr('phoneLabel')}
        value={phone}
        onChangeText={setPhone}
        placeholder="+233 XX XXX XXXX"
        keyboardType="phone-pad"
        autoComplete="tel"
      />
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
        autoComplete="new-password"
      />

      <Text variant="bodyS" tone="tertiary" style={{ fontSize: d(13), lineHeight: d(19) }}>
        {tr('consent')}
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
        label={tr('create')}
        size="large"
        loading={busy}
        disabled={!canSubmit || busy}
        onPress={createAccount}
      />
    </FormScreen>
  );
}
