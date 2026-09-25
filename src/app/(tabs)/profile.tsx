/**
 * Profile — ported 1:1 from Figma node 45:125 (SRS §4.B Tab 5).
 *
 * Row hues are identity, not status: blue = addresses, mint = payment,
 * gold = notifications, teal = partners, pink/coral = legal.
 *
 * The closing disclaimer is not boilerplate — it is the platform's liability
 * position and appears on every surface where a user could mistake Altruist for
 * the dispensing pharmacy.
 */
import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { TitleAppBar, SectionHeader } from '@/components/ui/AppBar';
import { ListRow, Toggle } from '@/components/ui/ListRow';
import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { useProfile } from '@/features/profile/store';
import {
  methodLabel,
  useAddresses,
  useCheckoutSelection,
  useSavedMethods,
} from '@/features/checkout/store';
import { initialsOf } from '@/lib/profile';
import { endSession } from '@/features/account/session';
import {
  setNotificationPref,
  useNotificationPrefs,
} from '@/features/notifications/preferences';

export default function Profile() {
  const profile = useProfile();
  const addresses = useAddresses();
  const { address } = useCheckoutSelection();
  // Saved instruments only. Checkout's always-offered options (Telecel, bank
  // transfer) are ways to pay, not something on file, and must not read as one.
  const [method] = useSavedMethods();
  const t = useTokens();
  const { d } = useDesignScale();
  const insets = useSafeAreaInsets();
  // The same saved setting as "Order status changes" on Notification Settings.
  const notificationPrefs = useNotificationPrefs();

  const [leaving, setLeaving] = useState(false);

  const logOut = async () => {
    if (leaving) return;
    setLeaving(true);
    // Ends the session on the server AND forgets this person on the device.
    // Clearing only the token used to leave their name, addresses and
    // prescriptions on the phone for whoever signed in next.
    await endSession();
    router.replace('/welcome');
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + d(18),
          paddingHorizontal: d(24),
          paddingBottom: d(120) + insets.bottom,
          gap: d(18),
        }}
      >
        <TitleAppBar
          title="Profile"
          showBack={false}
          actions={[
            { icon: 'settings', label: 'Settings', onPress: () => router.push('/settings') },
          ]}
        />

        {/* Identity — radius 28, padding 20, 56pt avatar */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${profile.name}. Edit your profile.`}
          onPress={() => router.push('/edit-profile')}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: d(16),
            backgroundColor: t.colors.bg.surface,
            borderRadius: d(28),
            padding: d(20),
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <Avatar
            initials={initialsOf(profile.name) || '?'}
            uri={profile.avatarUrl}
            preset={profile.avatarPreset}
            size={56}
            label={profile.avatarUrl ? 'Your profile picture' : 'Your avatar'}
          />
          <View style={{ flex: 1, gap: d(4) }}>
            <Text variant="headingL" style={{ fontSize: d(20), lineHeight: d(26) }}>
              {profile.name}
            </Text>
            <Text variant="bodyS" tone="secondary" style={{ fontSize: d(13), lineHeight: d(19) }}>
              {[profile.email, profile.phone].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </Pressable>

        <SectionHeader title="Account" />

        <ListRow
          icon="location"
          hue="blue"
          title="Delivery addresses"
          subtitle={
            addresses.length
              ? `${addresses.length} saved · ${address?.title ?? 'none'} default`
              : 'None saved yet'
          }
          chevron
          onPress={() => router.push('/addresses')}
        />
        <ListRow
          icon="wallet"
          hue="mint"
          title="Payment methods"
          subtitle={method ? `Paystack · ${methodLabel(method)}` : 'None saved yet'}
          chevron
          onPress={() => router.push('/payment-methods')}
        />
        <ListRow
          icon="notification"
          hue="gold"
          title="Order notifications"
          subtitle="Push and SMS updates"
          onPress={() => router.push('/notification-settings')}
          trailing={
            <Toggle
              value={notificationPrefs?.orderStatus ?? true}
              disabled={!notificationPrefs}
              onValueChange={(next) => {
                // A failed save reverts the switch in the store; the full
                // screen, one tap away, is where the error is explained.
                setNotificationPref('orderStatus', next).catch(() => {});
              }}
              label="Order notifications"
            />
          }
        />

        <SectionHeader title="Partners & legal" />

        <ListRow
          icon="shield-check"
          hue="teal"
          title="Partner pharmacies"
          subtitle="See who fulfils your orders"
          chevron
          onPress={() => router.push('/partners')}
        />
        <ListRow
          icon="prescription"
          hue="pink"
          title="Terms of Service"
          subtitle="altruistpharmacy.com/terms"
          chevron
          onPress={() => router.push('/legal')}
        />
        <ListRow
          icon="shield-check"
          hue="coral"
          title="Privacy Policy"
          subtitle="How your health data is handled"
          chevron
          onPress={() => router.push('/legal')}
        />
        <ListRow
          icon="logout"
          hue="teal"
          title={leaving ? 'Logging out…' : 'Log out'}
          subtitle="You will need to sign in again"
          onPress={logOut}
        />
        {/* No platform disclosure footer: it is the first section of the Terms
            of Service, one row up. */}
      </ScrollView>
    </View>
  );
}
