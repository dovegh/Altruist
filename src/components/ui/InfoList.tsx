/**
 * Info card with a bulleted body — Figma "Delete Account" (91:201) and
 * "Deletion Scheduled" (91:350).
 *
 * bg/surface (or a tinted variant) r24, V gap12, pad 16/18: a head row with a
 * 20pt icon and a 16pt title, then bullet lines at bodyS/secondary.
 */
import React from 'react';
import { View } from 'react-native';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { Text } from './Text';
import { Icon, type IconName } from './Icon';
import type { Theme } from '@/theme/tokens';

export function InfoCard({
  icon,
  title,
  bullets,
  tone = 'surface',
}: {
  icon: IconName;
  title: string;
  bullets: string[];
  tone?: keyof Theme['colors']['bg'];
}) {
  const t = useTokens();
  const { d } = useDesignScale();
  return (
    <View
      style={{
        gap: d(12),
        paddingVertical: d(16),
        paddingHorizontal: d(18),
        borderRadius: d(24),
        backgroundColor: t.colors.bg[tone],
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(10) }}>
        <Icon name={icon} size={d(20)} tone="primary" />
        <Text variant="labelL" style={{ flex: 1, fontSize: d(16), lineHeight: d(20) }}>
          {title}
        </Text>
      </View>
      {bullets.map((b) => (
        <Text
          key={b}
          variant="bodyS"
          tone="secondary"
          style={{ fontSize: d(13), lineHeight: d(19) }}
        >
          {'\u00B7  '}
          {b}
        </Text>
      ))}
    </View>
  );
}

/** Icon + two-line copy, used inside grouped cards. */
export function FactRow({
  icon,
  title,
  body,
}: {
  icon: IconName;
  title: string;
  body: string;
}) {
  const { d } = useDesignScale();
  return (
    <View style={{ flexDirection: 'row', gap: d(12) }}>
      <Icon name={icon} size={d(20)} tone="primary" />
      <View style={{ flex: 1, gap: d(3) }}>
        <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
          {title}
        </Text>
        <Text variant="bodyS" tone="secondary" style={{ fontSize: d(13), lineHeight: d(19) }}>
          {body}
        </Text>
      </View>
    </View>
  );
}
