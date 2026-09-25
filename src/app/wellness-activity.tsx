/**
 * Wellness — Activity.
 *
 * Every session this person has finished. The store has recorded them since
 * the feature shipped and nothing surfaced them: the Wellness tab showed a
 * streak number and a week of dots, so a month of work was invisible the
 * moment it scrolled past Sunday.
 *
 * Totals first, then the log newest-first, grouped by month. The per-plan
 * breakdown is what makes "12 sessions" mean something — six strength and six
 * mobility is a different fortnight from twelve of one.
 */
import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen } from '@/components/ui/FormScreen';
import { TitleAppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { programmeById, streakDays } from '@/lib/wellness';
import {
  historyNewestFirst,
  planTotals,
  sessionDaysOf,
  totalMinutes,
  useWellnessStore,
  type CompletedSession,
} from '@/features/wellness/store';

/** "September 2026" — the group heading. */
function monthLabel(at: number): string {
  return new Date(at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

/** "Mon 8 Sept · 6:30 PM" — one row's stamp. */
function rowStamp(at: number): string {
  const date = new Date(at);
  const day = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = date
    .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })
    .toUpperCase();
  return `${day} · ${time}`;
}

export default function WellnessActivity() {
  const t = useTokens();
  const { d } = useDesignScale();

  const history = useWellnessStore((s) => s.history);
  const rows = historyNewestFirst(history);
  const streak = streakDays(sessionDaysOf(history));
  const minutes = totalMinutes(history);
  const totals = planTotals(history);

  // Grouped in render order, so the list stays newest-first within each month.
  const months: { label: string; rows: CompletedSession[] }[] = [];
  for (const row of rows) {
    const label = monthLabel(row.finishedAt);
    const last = months[months.length - 1];
    if (last && last.label === label) last.rows.push(row);
    else months.push({ label, rows: [row] });
  }

  const stat = (value: string, unit: string, label: string) => (
    <View
      style={{
        flex: 1,
        gap: d(6),
        padding: d(18),
        borderRadius: d(24),
        backgroundColor: t.colors.bg.surface,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: d(3) }}>
        <Text variant="numericL" style={{ fontSize: d(28), lineHeight: d(32) }}>
          {value}
        </Text>
        <Text variant="labelS" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
          {unit}
        </Text>
      </View>
      <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
        {label}
      </Text>
    </View>
  );

  return (
    <FormScreen gap={16} contentStyle={{ paddingBottom: d(60) }}>
      <TitleAppBar title="Activity" />

      {rows.length === 0 ? (
        <View style={{ gap: d(16), paddingTop: d(40) }}>
          <View
            style={{
              width: d(96),
              height: d(96),
              borderRadius: t.radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: t.colors.bg.surface,
              alignSelf: 'center',
            }}
          >
            <Icon name="award" size={d(40)} tone="tertiary" />
          </View>
          <Text variant="headingM" center style={{ fontSize: d(18), lineHeight: d(24) }}>
            No sessions yet
          </Text>
          <Text
            variant="bodyM"
            tone="secondary"
            center
            style={{ fontSize: d(14), lineHeight: d(21) }}
          >
            Finish a session and it is logged here, with the plan it belonged to.
          </Text>
          <Button label="Go to today's plan" size="large" onPress={() => router.replace('/wellness')} />
        </View>
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: d(12) }}>
            {stat(String(rows.length), rows.length === 1 ? 'session' : 'sessions', 'Completed')}
            {stat(String(minutes), 'min', 'Time trained')}
            {stat(String(streak), streak === 1 ? 'day' : 'days', 'Current streak')}
          </View>

          {totals.length > 1 ? (
            <View
              style={{
                gap: d(12),
                padding: d(18),
                borderRadius: d(24),
                backgroundColor: t.colors.bg.surface,
              }}
            >
              <Text variant="labelXS" tone="tertiary" style={{ fontSize: d(11), lineHeight: d(14) }}>
                BY PLAN
              </Text>
              {totals.map(({ programme, done }) => (
                <View
                  key={programme.id}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: d(12) }}
                >
                  <Text
                    variant="bodyM"
                    tone="secondary"
                    style={{ flex: 1, fontSize: d(14), lineHeight: d(21) }}
                  >
                    {programme.title}
                  </Text>
                  <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
                    {done}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {months.map((month) => (
            <React.Fragment key={month.label}>
              <Text variant="labelXS" tone="tertiary" style={{ fontSize: d(11), lineHeight: d(14) }}>
                {month.label.toUpperCase()}
              </Text>
              {month.rows.map((row) => {
                const programme = programmeById(row.programmeId);
                const day = programme.days.find((x) => x.id === row.dayId);
                return (
                  <View
                    key={`${row.finishedAt}-${row.dayId}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: d(14),
                      paddingVertical: d(14),
                      paddingHorizontal: d(16),
                      borderRadius: d(20),
                      backgroundColor: t.colors.bg.surface,
                    }}
                  >
                    <View
                      style={{
                        width: d(40),
                        height: d(40),
                        borderRadius: t.radius.full,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: t.colors.bg.brandSubtle,
                      }}
                    >
                      <Icon name="check" size={d(18)} tone="brand" />
                    </View>
                    <View style={{ flex: 1, gap: d(3) }}>
                      <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
                        {day?.title ?? programme.title}
                      </Text>
                      <Text
                        variant="caption"
                        tone="tertiary"
                        style={{ fontSize: d(12), lineHeight: d(16) }}
                      >
                        {programme.title} · {rowStamp(row.finishedAt)}
                      </Text>
                    </View>
                    <Text variant="labelS" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
                      {row.durationMin} min
                    </Text>
                  </View>
                );
              })}
            </React.Fragment>
          ))}
        </>
      )}
    </FormScreen>
  );
}
