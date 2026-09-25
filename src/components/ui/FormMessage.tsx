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
  if (error instanceof NetworkError) return 'Could not reach Altruist. Check your connection and try again.';
  if (error instanceof DeclinedError) return error.message;
  return 'Something went wrong on our side. Try again in a moment.';
}
