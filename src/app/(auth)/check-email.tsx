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
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    yourEmail: 'your email address',
    confirmTitle: 'Confirm your email',
    checkTitle: 'Check your email',
    confirmBody: 'We sent a confirmation link to {email}.',
    resetBody: 'We sent a reset link to {email}. It expires in 30 minutes.',
    sent: 'Sent. Check your spam folder too.',
    openMail: 'Open mail app',
    sending: 'Sending…',
    resendIn: 'Resend in {clock}',
    resendLink: 'Resend link',
    alreadyConfirmed: 'Already confirmed? Sign in',
  },
  fr: {
    yourEmail: 'votre adresse e-mail',
    confirmTitle: 'Confirmez votre e-mail',
    checkTitle: 'Consultez vos e-mails',
    confirmBody: 'Nous avons envoyé un lien de confirmation à {email}.',
    resetBody:
      'Nous avons envoyé un lien de réinitialisation à {email}. Il expire dans 30 minutes.',
    sent: 'Envoyé. Vérifiez aussi vos spams.',
    openMail: "Ouvrir l'app e-mail",
    sending: 'Envoi…',
    resendIn: 'Renvoyer dans {clock}',
    resendLink: 'Renvoyer le lien',
    alreadyConfirmed: 'Déjà confirmé ? Se connecter',
  },
  tw: {
    yourEmail: 'wo email address',
    confirmTitle: 'Si wo email no so dua',
    checkTitle: 'Hwɛ wo email',
    confirmBody: 'Yɛde link a wode bɛsi so dua akɔma {email}.',
    resetBody: 'Yɛde link a wode bɛsesa ahintasɛm akɔma {email}. Ɛbɛtwam wɔ simma 30 mu.',
    sent: 'Yɛde akɔ. Hwɛ spam folder no nso mu.',
    openMail: 'Bue email app',
    sending: 'Ɛrekɔ…',
    resendIn: 'San de kɔ wɔ {clock}',
    resendLink: 'San de link no kɔ',
    alreadyConfirmed: 'Woasi so dua dada? Kɔ mu',
  },
  gaa: {
    yourEmail: 'o email address',
    confirmTitle: 'Kpɛlɛ o email lɛ nɔ',
    checkTitle: 'Kwɛ o email',
    confirmBody: 'Wɔtsu link ni okɛaakpɛlɛ nɔ kɛya {email}.',
    resetBody: 'Wɔtsu link ni okɛaatsake password lɛ kɛya {email}. Ebaagbo yɛ minitii 30 mli.',
    sent: 'Wɔtsu. Kwɛ spam folder lɛ hu mli.',
    openMail: 'Gbele email app',
    sending: 'Etsuɔ…',
    resendIn: 'Tsu ekoŋŋ yɛ {clock}',
    resendLink: 'Tsu link lɛ ekoŋŋ',
    alreadyConfirmed: 'Okpɛlɛ nɔ momo? Bote mli',
  },
  ee: {
    yourEmail: 'wò email address',
    confirmTitle: 'Ka wò email dzi',
    checkTitle: 'Kpɔ wò email',
    confirmBody: 'Míeɖo link si nàtsɔ aka edzi ɖe {email}.',
    resetBody: 'Míeɖo link si nàtsɔ atrɔ nyaʋiʋli ɖe {email}. Ayi le aɖabaƒoƒo 30 me.',
    sent: 'Míeɖoe ɖa. Kpɔ spam folder hã me.',
    openMail: 'Ʋu email app',
    sending: 'Míele eɖom…',
    resendIn: 'Gaɖoe le {clock} me',
    resendLink: 'Gaɖo link la ɖa',
    alreadyConfirmed: 'Èka edzi xoxo? Ge ɖe eme',
  },
  ha: {
    yourEmail: 'adireshin imel ɗinka',
    confirmTitle: 'Tabbatar da imel ɗinka',
    checkTitle: 'Duba imel ɗinka',
    confirmBody: 'Mun aika hanyar tabbatarwa zuwa {email}.',
    resetBody: 'Mun aika hanyar sake saitawa zuwa {email}. Za ta ƙare cikin minti 30.',
    sent: 'An aika. Duba babban fayil na spam ma.',
    openMail: 'Buɗe manhajar imel',
    sending: 'Ana aikawa…',
    resendIn: 'Sake aikawa cikin {clock}',
    resendLink: 'Sake aika hanyar',
    alreadyConfirmed: 'Ka riga ka tabbatar? Shiga',
  },
});

const RESEND_SECONDS = 42;

export default function CheckYourEmail() {
  const tr = useT(S);
  const params = useLocalSearchParams<{ email?: string; kind?: 'signup' | 'reset' }>();
  const profile = useProfile();
  const kind = params.kind === 'signup' ? 'signup' : 'reset';
  // The address typed on the previous screen, or the account's, or nothing pretending to be one.
  const address = params.email || profile.email || '';
  const email = address || tr('yourEmail');
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
          {kind === 'signup' ? tr('confirmTitle') : tr('checkTitle')}
        </Text>
        <Text variant="bodyL" tone="secondary" style={{ fontSize: d(16), lineHeight: d(24) }}>
          {kind === 'signup'
            ? tr('confirmBody', { email })
            : tr('resetBody', { email })}
        </Text>
      </View>

      {sent ? (
        <FormMessage tone="success">{tr('sent')}</FormMessage>
      ) : null}
      {error ? <FormMessage>{error}</FormMessage> : null}

      <Button label={tr('openMail')} size="large" onPress={openMail} />
      <Button
        label={sending ? tr('sending') : left > 0 ? tr('resendIn', { clock }) : tr('resendLink')}
        variant="tertiary"
        size="large"
        disabled={left > 0 || sending || !address}
        onPress={resend}
      />
      {kind === 'signup' ? (
        <Button
          label={tr('alreadyConfirmed')}
          variant="tertiary"
          size="large"
          onPress={() => router.replace('/login')}
        />
      ) : null}
    </FormScreen>
  );
}
