/**
 * App Settings — ported 1:1 from Figma node 213:465.
 *
 * Scroll content: V gap16, pad 64/24/60/24. APPEARANCE (theme segmented control
 * in a r22 card), PREFERENCES, YOUR DATA, ABOUT.
 *
 * The theme control writes straight through to ThemeProvider, so the segment
 * shown is the live preference rather than local state that could drift from
 * what the app is actually rendering.
 *
 * Row tile hues are identity, not status — gold notifications, blue language,
 * teal payment, pink wellness, mint data, coral delete. Coral appears exactly
 * once, on the only destructive row.
 */
import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTheme, useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen } from '@/components/ui/FormScreen';
import { TitleAppBar } from '@/components/ui/AppBar';
import { SectionLabel } from '@/components/ui/Checkout';
import { ListRow, Toggle, IconTile } from '@/components/ui/ListRow';
import { Radio } from '@/components/ui/Form';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { methodLabel, useCheckoutSelection } from '@/features/checkout/store';
import { appVersion, ORG } from '@/lib/legal';
import { Button, ButtonRow } from '@/components/ui/Button';
import { resetToNewAccount } from '@/lib/resetAccount';
import {
  scenariosAvailable,
  useScenarioStore,
  type PaymentScenario,
  type ReviewScenario,
} from '@/lib/devScenarios';

const THEMES = [
  { key: 'system', label: 'System' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
] as const;

const PAYMENT_SCENARIOS: { key: PaymentScenario; label: string; note: string }[] = [
  { key: 'approve', label: 'Approve', note: 'Order placed' },
  { key: 'momo-pending', label: 'MoMo prompt', note: 'Pending, then approves after 2 polls' },
  { key: 'decline-funds', label: 'Insufficient funds', note: 'Payment failed' },
  { key: 'decline-bank', label: 'Bank declined', note: 'Payment failed' },
  { key: 'network', label: 'No connection', note: 'Offline screen' },
  { key: 'error', label: 'Server error', note: 'Generic failure' },
];

const REVIEW_SCENARIOS: { key: ReviewScenario; label: string; note: string }[] = [
  { key: 'approve', label: 'Approve', note: 'Script verifies, gate opens' },
  { key: 'reject', label: 'Reject', note: 'Rejected card + reason screen' },
];


export default function Settings() {
  const [resetting, setResetting] = useState(false);
  // Version comes from the build, never a literal that goes stale on release.
  const ABOUT: [string, string][] = [
    ['Version', appVersion()],
    ['Registered as', ORG.registeredName],
    ['Company number', ORG.companyNumber],
  ];
  const { method } = useCheckoutSelection();
  const t = useTokens();
  const { d } = useDesignScale();
  const { preference, setPreference } = useTheme();
  const [wellnessReminders, setWellnessReminders] = React.useState(false);

  const payment = useScenarioStore((s) => s.payment);
  const review = useScenarioStore((s) => s.review);
  const setPayment = useScenarioStore((s) => s.setPayment);
  const setReview = useScenarioStore((s) => s.setReview);

  /** A stack of radio rows. Used only by the developer section below. */
  const scenarioGroup = <T extends string>(
    options: { key: T; label: string; note: string }[],
    value: T,
    onChange: (next: T) => void,
  ) => (
    <View
      style={{
        gap: d(2),
        padding: d(6),
        borderRadius: d(22),
        backgroundColor: t.colors.bg.surface,
      }}
    >
      {options.map((o) => {
        const on = value === o.key;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${o.label}. ${o.note}`}
            onPress={() => onChange(o.key)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: d(12),
              paddingVertical: d(12),
              paddingHorizontal: d(12),
              borderRadius: d(16),
              backgroundColor: on ? t.colors.bg.surfaceRaised : 'transparent',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Radio selected={on} />
            <View style={{ flex: 1, gap: d(2) }}>
              <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
                {o.label}
              </Text>
              <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
                {o.note}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <FormScreen gap={16} contentStyle={{ paddingBottom: d(60) }}>
      <TitleAppBar title="Settings" />

      <SectionLabel>APPEARANCE</SectionLabel>

      <View
        style={{
          gap: d(14),
          padding: d(16),
          borderRadius: d(22),
          backgroundColor: t.colors.bg.surface,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            gap: d(4),
            padding: d(4),
            borderRadius: t.radius.full,
            backgroundColor: t.colors.bg.surfaceSunken,
          }}
        >
          {THEMES.map((x) => {
            const on = preference === x.key;
            return (
              <Pressable
                key={x.key}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${x.label} theme`}
                onPress={() => setPreference(x.key)}
                style={({ pressed }) => ({
                  flex: 1,
                  height: d(38),
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: t.radius.full,
                  backgroundColor: on ? t.colors.bg.brand : 'transparent',
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Text
                  variant="labelM"
                  color={on ? t.colors.text.onBrand : t.colors.text.secondary}
                  style={{ fontSize: d(14), lineHeight: d(18) }}
                >
                  {x.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <SectionLabel>PREFERENCES</SectionLabel>

      <ListRow
        icon="notification"
        hue="gold"
        title="Notifications"
        subtitle="Orders, refills, wellness"
        chevron
        onPress={() => router.push('/notification-settings')}
      />
      <ListRow
        icon="info"
        hue="blue"
        title="Language"
        subtitle="English (Ghana)"
        // One language ships today. The row states that rather than opening an
        // empty picker; it gains an onPress when a second locale lands.
      />
      <ListRow
        icon="card"
        hue="teal"
        title="Default payment"
        subtitle={method ? methodLabel(method) : 'None saved yet'}
        chevron
        onPress={() => router.push('/payment-methods')}
      />
      <ListRow
        icon="wellness"
        hue="pink"
        title="Wellness reminders"
        subtitle="Plan nudges and hydration"
        trailing={
          <Toggle
            value={wellnessReminders}
            onValueChange={setWellnessReminders}
            label="Wellness reminders"
          />
        }
      />

      <SectionLabel>YOUR DATA</SectionLabel>

      <ListRow
        icon="upload"
        hue="mint"
        title="Download your data"
        subtitle="Everything Altruist holds, as a file"
        chevron
        onPress={() => router.push('/download-data')}
      />
      <ListRow
        icon="shield-check"
        hue="teal"
        title="My prescriptions"
        subtitle="Photos, reviews and status"
        chevron
        onPress={() => router.push('/prescriptions')}
      />
      <ListRow
        icon="trash"
        hue="coral"
        title="Delete account"
        subtitle="Permanent after a 30-day grace period"
        chevron
        onPress={() => router.push('/delete-account')}
      />

      {/* Development only. `scenariosAvailable()` is false in any build that is
          not __DEV__ or is pointed at a real gateway, so this section cannot
          reach a production app — and `scenario()` returns the happy path even
          if some state were somehow set. */}
      {scenariosAvailable() ? (
        <>
          <SectionLabel>DEVELOPER · FIXTURE OUTCOMES</SectionLabel>

          <View
            style={{
              flexDirection: 'row',
              gap: d(12),
              paddingVertical: d(14),
              paddingHorizontal: d(16),
              borderRadius: d(20),
              backgroundColor: t.colors.bg.warningSubtle,
            }}
          >
            <Icon name="danger" size={d(20)} tone="warning" />
            <Text
              variant="bodyS"
              tone="secondary"
              style={{ flex: 1, fontSize: d(13), lineHeight: d(19) }}
            >
              Forces what the fixture backend returns next, so the decline, offline and rejection
              paths can be walked without a real card. Resets on reload, and never ships.
            </Text>
          </View>

          <Text variant="labelS" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
            Next payment
          </Text>
          {scenarioGroup(PAYMENT_SCENARIOS, payment, setPayment)}

          <Text variant="labelS" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
            Next prescription review
          </Text>
          {scenarioGroup(REVIEW_SCENARIOS, review, setReview)}

          <Text variant="labelXS" tone="tertiary" style={{ fontSize: d(11), lineHeight: d(14) }}>
            DEVELOPER · ACCOUNT
          </Text>
          <View
            style={{
              gap: d(12),
              padding: d(16),
              borderRadius: d(22),
              backgroundColor: t.colors.bg.surface,
            }}
          >
            <Text variant="bodyS" tone="secondary" style={{ fontSize: d(13), lineHeight: d(19) }}>
              Wipes the cart, orders, prescriptions, saved addresses and cards, wellness history
              and search history, then signs out and returns to onboarding — the app exactly as a
              new user first sees it. Your theme preference is kept.
            </Text>
            {resetting ? (
              <ButtonRow>
                <Button
                  label="Yes, start fresh"
                  variant="danger"
                  size="medium"
                  style={{ flex: 1 }}
                  onPress={async () => {
                    await resetToNewAccount();
                    router.replace('/onboarding');
                  }}
                />
                <Button
                  label="Cancel"
                  variant="tertiary"
                  size="medium"
                  style={{ flex: 1 }}
                  onPress={() => setResetting(false)}
                />
              </ButtonRow>
            ) : (
              <Button
                label="Reset to a new account"
                variant="secondary"
                size="medium"
                iconLeading="trash"
                onPress={() => setResetting(true)}
              />
            )}
          </View>
        </>
      ) : null}

      <SectionLabel>ABOUT</SectionLabel>

      <View
        style={{
          gap: d(10),
          padding: d(16),
          borderRadius: d(22),
          backgroundColor: t.colors.bg.surface,
        }}
      >
        {ABOUT.map(([label, value]) => (
          <View key={label} style={{ flexDirection: 'row', gap: d(12) }}>
            <Text
              variant="bodyS"
              tone="tertiary"
              style={{ flex: 1, fontSize: d(13), lineHeight: d(19) }}
            >
              {label}
            </Text>
            <Text variant="labelS" tone="secondary" style={{ fontSize: d(12), lineHeight: d(16) }}>
              {value}
            </Text>
          </View>
        ))}
      </View>

      <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
        Altruist is a technology platform connecting you with certified, independent partner
        pharmacies. It does not dispense medication or provide medical advice.
      </Text>
    </FormScreen>
  );
}
