/**
 * Medical disclaimer — Figma "Medical disclaimer" (Wellness screens).
 *
 * bg/warning-subtle r20, H gap12, pad 14/16: a 20pt shield, a gold title and a
 * secondary body.
 *
 * This is a single component rather than copy repeated per screen on purpose.
 * It is the sentence that keeps a wellness tab from reading as clinical advice,
 * and SRS §1 puts it on every surface that discusses medicines. One definition
 * means one place to change it if counsel revises the wording.
 */
import React from 'react';
import { View } from 'react-native';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { Text } from './Text';
import { Icon } from './Icon';
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: { title: 'General information, not medical advice' },
  fr: { title: 'Informations générales, pas un avis médical' },
  tw: { title: 'Nsɛm kɛkɛ, ɛnyɛ ayaresa ho afotuo' },
  gaa: { title: 'Saji kɛkɛ, jeee hela he ŋaawoo' },
  ee: { title: 'Nyatakaka ko, menye atikewɔwɔ ƒe aɖaŋuɖoɖo o' },
  ha: { title: 'Bayani na gaba ɗaya, ba shawarar likita ba' },
});

export function MedicalDisclaimer({
  title: titleProp,
  body,
}: {
  title?: string;
  body: string;
}) {
  const t = useTokens();
  const { d } = useDesignScale();
  const tr = useT(S);
  const title = titleProp ?? tr('title');
  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: 'row',
        gap: d(12),
        paddingVertical: d(14),
        paddingHorizontal: d(16),
        borderRadius: d(20),
        backgroundColor: t.colors.bg.warningSubtle,
      }}
    >
      <Icon name="shield-check" size={d(20)} tone="warning" />
      <View style={{ flex: 1, gap: d(4) }}>
        <Text variant="labelM" tone="warning" style={{ fontSize: d(14), lineHeight: d(18) }}>
          {title}
        </Text>
        <Text variant="bodyS" tone="secondary" style={{ fontSize: d(13), lineHeight: d(19) }}>
          {body}
        </Text>
      </View>
    </View>
  );
}

export default MedicalDisclaimer;
