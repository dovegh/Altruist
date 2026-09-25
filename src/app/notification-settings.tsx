/**
 * Notification Settings — ported 1:1 from Figma node 171:375.
 *
 * Scroll content: V gap16, pad 64/24/60/24. Four groups — orders, reminders,
 * marketing, channels — then a gold note: prescription outcomes always send.
 * That used to be a row with a switch locked on, which looked like a setting
 * and was not one; the note says it without pretending there is a choice.
 *
 * Every switch saves to `notification_preferences` (0011) the moment it is
 * flipped — they used to be component state that reset on every visit and that
 * nothing read. A failed save puts the switch back and says so.
 *
 * Marketing is off by default and stays that way unless the user turns it on.
 * That is the Data Protection Act 2012 (Act 843) position on consent; the
 * default lives in the table, so no client can drift from it.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen } from '@/components/ui/FormScreen';
import { TitleAppBar } from '@/components/ui/AppBar';
import { SettingsGroup, SettingsRow } from '@/components/ui/Settings';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { FormMessage, describeFailure } from '@/components/ui/FormMessage';
import { useProfile } from '@/features/profile/store';
import {
  setNotificationPref,
  useNotificationPrefs,
} from '@/features/notifications/preferences';
import {
  DEFAULT_NOTIFICATION_PREFS,
  type NotificationPrefKey,
} from '@/lib/notificationPrefs';

export default function NotificationSettings() {
  const profile = useProfile();
  const t = useTokens();
  const { d } = useDesignScale();

  const stored = useNotificationPrefs();
  // Until the first load lands the switches are inert, drawn at the defaults.
  const prefs = stored ?? DEFAULT_NOTIFICATION_PREFS;
  const [error, setError] = useState<string | null>(null);

  /** Props for one switch: its saved value and a handler that saves it. */
  const pref = (key: NotificationPrefKey) => ({
    value: prefs[key],
    disabled: !stored,
    onValueChange: (next: boolean) => {
      setError(null);
      setNotificationPref(key, next).catch((e) =>
        setError(`That change was not saved. ${describeFailure(e)}`),
      );
    },
  });

  return (
    <FormScreen gap={16} contentStyle={{ paddingBottom: d(60) }}>
      <TitleAppBar title="Notifications" />

      {error ? <FormMessage>{error}</FormMessage> : null}

      <SettingsGroup label="ORDERS & PRESCRIPTIONS">
        <SettingsRow
          icon="cart"
          title="Order status changes"
          subtitle="Packing, dispatched, delivered"
          {...pref('orderStatus')}
        />
        <SettingsRow
          icon="clock"
          title="Rider approaching"
          subtitle="About 5 minutes before arrival"
          {...pref('riderApproaching')}
        />
      </SettingsGroup>

      <SettingsGroup label="REMINDERS">
        <SettingsRow
          icon="prescription"
          title="Refill reminders"
          subtitle="When a repeat is due"
          {...pref('refillReminders')}
        />
        <SettingsRow
          icon="wellness"
          title="Wellness plan nudges"
          subtitle="Daily at 07:00"
          {...pref('wellnessNudges')}
        />
      </SettingsGroup>

      <SettingsGroup label="MARKETING">
        <SettingsRow
          icon="info"
          title="Offers and promotions"
          subtitle="Discounts and new products"
          {...pref('offers')}
        />
        <SettingsRow
          icon="info"
          title="Health tips digest"
          subtitle="Weekly, Sunday morning"
          {...pref('healthDigest')}
        />
      </SettingsGroup>

      <SettingsGroup label="HOW WE REACH YOU">
        <SettingsRow
          icon="notification"
          title="Push notifications"
          subtitle="On this device"
          {...pref('push')}
        />
        <SettingsRow
          icon="info"
          title="SMS"
          subtitle={`${profile.phone} · charges may apply`}
          {...pref('sms')}
        />
        <SettingsRow
          icon="info"
          title="Email"
          subtitle={profile.email}
          {...pref('email')}
        />
      </SettingsGroup>

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
        <Icon name="shield-check" size={d(18)} tone="warning" />
        <Text
          variant="caption"
          tone="secondary"
          style={{ flex: 1, fontSize: d(12), lineHeight: d(16) }}
        >
          You will always be told when your prescription is verified or rejected.
        </Text>
      </View>
    </FormScreen>
  );
}
