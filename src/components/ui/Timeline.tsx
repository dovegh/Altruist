/**
 * Order Timeline Step — Figma component set on page "List & Rows".
 *
 * H gap16: a 40pt rail (40pt dot + a 2×40 connector, gap 6) beside a body
 * column (V gap4, 8pt top padding so the title's cap height lines up with the
 * dot's centre).
 *
 * | State    | Dot                | Icon  | Connector     | Title      | Subtitle   |
 * |----------|--------------------|-------|---------------|------------|------------|
 * | Complete | bg/brand           | check | border/brand  | primary    | tertiary   |
 * | Current  | bg/brand-subtle    | send  | border/brand  | primary    | brand      |
 * | Upcoming | bg/surface-raised  | clock | border/subtle | tertiary   | tertiary   |
 *
 * Only Current colours its subtitle — that is the line carrying the live ETA,
 * and it is the one thing on the screen a waiting user is actually reading.
 *
 * Hide the connector on the final step: a rail that continues past the last
 * event implies an event that has not been told to you.
 *
 * Motion: steps arrive in sequence so the rail reads top-down, and the CURRENT
 * step's dot breathes. The pulse is opacity only — nothing moves and nothing
 * springs, per the design system's rule on status transitions. It marks the
 * step as live, which is the one thing a waiting user is looking for.
 */
import React from 'react';
import { View } from 'react-native';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { Appear, Pulse } from './Motion';
import { Text } from './Text';
import { Icon, type IconName } from './Icon';

/** Only the live step breathes; the rest are static. */
function Dot({ pulsing, children }: { pulsing: boolean; children: React.ReactNode }) {
  return pulsing ? <Pulse>{children}</Pulse> : <>{children}</>;
}

export type StepState = 'complete' | 'current' | 'upcoming';

export type TimelineStep = {
  title: string;
  subtitle: string;
  timestamp?: string;
  state: StepState;
  icon?: IconName;
};

const DEFAULT_ICON: Record<StepState, IconName> = {
  complete: 'check',
  current: 'send',
  upcoming: 'clock',
};

export function OrderTimelineStep({
  title,
  subtitle,
  timestamp,
  state,
  icon,
  last = false,
}: TimelineStep & { last?: boolean }) {
  const t = useTokens();
  const { d } = useDesignScale();

  const dotFill =
    state === 'complete'
      ? t.colors.bg.brand
      : state === 'current'
        ? t.colors.bg.brandSubtle
        : t.colors.bg.surfaceRaised;

  const iconColor =
    state === 'complete'
      ? t.colors.icon.onBrand
      : state === 'current'
        ? t.colors.icon.brand
        : t.colors.icon.tertiary;

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={[title, subtitle, timestamp, state].filter(Boolean).join('. ')}
      style={{ flexDirection: 'row', gap: d(16), minHeight: d(92) }}
    >
      <View style={{ width: d(40), alignItems: 'center', gap: d(6) }}>
        <Dot pulsing={state === 'current'}>
          <View
            style={{
              width: d(40),
              height: d(40),
              borderRadius: t.radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: dotFill,
            }}
          >
            <Icon name={icon ?? DEFAULT_ICON[state]} size={d(20)} color={iconColor} />
          </View>
        </Dot>
        {!last ? (
          <View
            style={{
              flex: 1,
              width: d(2),
              minHeight: d(40),
              borderRadius: d(2),
              backgroundColor:
                state === 'upcoming' ? t.colors.border.subtle : t.colors.border.brand,
            }}
          />
        ) : null}
      </View>

      <View style={{ flex: 1, gap: d(4), paddingTop: d(8) }}>
        <Text
          variant="labelL"
          tone={state === 'upcoming' ? 'tertiary' : 'primary'}
          style={{ fontSize: d(16), lineHeight: d(20) }}
        >
          {title}
        </Text>
        <Text
          variant="bodyS"
          tone={state === 'current' ? 'brand' : 'tertiary'}
          style={{ fontSize: d(13), lineHeight: d(19) }}
        >
          {subtitle}
        </Text>
        {timestamp ? (
          <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
            {timestamp}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function OrderTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <View>
      {steps.map((s, i) => (
        <Appear key={s.title} delay={i * 70} distance={10}>
          <OrderTimelineStep {...s} last={i === steps.length - 1} />
        </Appear>
      ))}
    </View>
  );
}
