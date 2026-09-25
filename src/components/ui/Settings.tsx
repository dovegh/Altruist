/**
 * Settings group and row — Figma "Notification Settings" (171:375).
 *
 * A group is bg/surface r24 (pad 16/18, gap 10) holding an uppercase label and
 * a stack of rows; each row is bg/surface-raised r16 (H gap12, pad 12/14) with
 * a 19pt icon, a two-line copy column and a trailing control.
 *
 * `locked` renders the switch ON and inert — brand-coloured, not greyed, which
 * is what Figma draws. Some alerts are not preferences: a rejected prescription
 * may mean someone is waiting on medicine they need, so that one always sends.
 * The row still shows a switch rather than hiding it, because a missing control
 * reads as an oversight. The subtitle carries the reason and the accessibility
 * label says it cannot be changed.
 */
import React from 'react';
import { View } from 'react-native';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { Text } from './Text';
import { Icon, type IconName } from './Icon';
import { Toggle } from './ListRow';

export function SettingsGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const t = useTokens();
  const { d } = useDesignScale();
  return (
    <View
      style={{
        gap: d(10),
        paddingVertical: d(16),
        paddingHorizontal: d(18),
        borderRadius: d(24),
        backgroundColor: t.colors.bg.surface,
      }}
    >
      <Text variant="labelXS" tone="tertiary" style={{ fontSize: d(11), lineHeight: d(14) }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

export function SettingsRow({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
  locked = false,
  disabled = false,
  trailing,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  value?: boolean;
  onValueChange?: (next: boolean) => void;
  /** Always-on and non-interactive; `subtitle` must say why. */
  locked?: boolean;
  /** Inert for now (e.g. not loaded yet) — unlike `locked`, drawn as disabled. */
  disabled?: boolean;
  trailing?: React.ReactNode;
}) {
  const t = useTokens();
  const { d } = useDesignScale();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: d(12),
        paddingVertical: d(12),
        paddingHorizontal: d(14),
        borderRadius: d(16),
        backgroundColor: t.colors.bg.surfaceRaised,
      }}
    >
      <Icon name={icon} size={d(19)} tone="primary" />
      <View style={{ flex: 1, gap: d(3) }}>
        <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
          {title}
        </Text>
        <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
          {subtitle}
        </Text>
      </View>
      {trailing ??
        (value !== undefined ? (
          <Toggle
            value={locked ? true : value}
            onValueChange={locked ? undefined : onValueChange}
            disabled={disabled}
            label={locked ? `${title}. Always on and cannot be changed.` : title}
          />
        ) : null)}
    </View>
  );
}
