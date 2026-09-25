/**
 * The one-sentence outcome under a form: why a save failed, or what happens
 * next after it succeeded ("check your inbox to confirm").
 *
 * Extracted from Register, which drew it inline, now that Edit Profile and the
 * address book write to the server and can fail the same way. Announced
 * politely to screen readers — it appears after a tap and is the answer to it.
 */
import React from 'react';
import { View } from 'react-native';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { NetworkError, DeclinedError } from '@/lib/api';
import { Text } from './Text';
import { Icon } from './Icon';
import { defineStrings, translate } from '@/i18n';

const S = defineStrings({
  en: {
    network: 'Could not reach Altruist. Check your connection and try again.',
    ourSide: 'Something went wrong on our side. Try again in a moment.',
  },
  fr: {
    network: 'Impossible de joindre Altruist. Vérifiez votre connexion et réessayez.',
    ourSide: 'Un problème est survenu de notre côté. Réessayez dans un instant.',
  },
  tw: {
    network: 'Yɛntumi nnu Altruist ho. Hwɛ wo intanɛt na san bɔ mmɔden.',
    ourSide: 'Biribi asɛe wɔ yɛn fam. San bɔ mmɔden bere tiaa bi akyi.',
  },
  gaa: {
    network: 'Wɔnyɛɛɛ wɔshɛɛɛ Altruist. Kwɛmɔ bo intanɛt lɛ ni okā ekoŋŋ.',
    ourSide: 'Nɔ ko fite yɛ wɔ gbɛfaŋ. Kā ekoŋŋ yɛ be fioo sɛɛ.',
  },
  ee: {
    network: 'Míete ŋu de Altruist gbɔ o. Kpɔ wò intanɛt eye nàgate kpɔ.',
    ourSide: 'Nane gblẽ le mía gbɔ. Gate kpɔ le ɣeyiɣi kpui aɖe megbe.',
  },
  ha: {
    network: 'Ba a sami Altruist ba. Duba haɗin intanet ɗinka ka sake gwadawa.',
    ourSide: 'Wani abu ya lalace a ɓangarenmu. Sake gwadawa nan ba da jimawa ba.',
  },
});

export type FormMessageTone = 'danger' | 'success';

export function FormMessage({ tone = 'danger', children }: { tone?: FormMessageTone; children: string }) {
  const t = useTokens();
  const { d } = useDesignScale();
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: 'row',
        gap: d(10),
        paddingVertical: d(12),
        paddingHorizontal: d(14),
        borderRadius: d(16),
        backgroundColor: tone === 'danger' ? t.colors.bg.dangerSubtle : t.colors.bg.successSubtle,
      }}
    >
      <Icon name={tone === 'danger' ? 'danger' : 'check'} size={d(18)} tone={tone === 'danger' ? 'danger' : 'brand'} />
      <Text
        variant="bodyS"
        tone={tone === 'danger' ? 'danger' : 'success'}
        style={{ flex: 1, fontSize: d(13), lineHeight: d(19) }}
      >
        {children}
      </Text>
    </View>
  );
}

/**
 * Any thrown failure as the sentence to put on screen. A dropped connection
 * reads as a connection problem, a server refusal quotes the server, and
 * anything else is our fault rather than the user's.
 */
export function describeFailure(error: unknown): string {
  if (error instanceof NetworkError) return translate(S, 'network');
  if (error instanceof DeclinedError) return error.message;
  return translate(S, 'ourSide');
}
