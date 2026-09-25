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
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    title: 'Profile',
    settings: 'Settings',
    editA11y: '{name}. Edit your profile.',
    profilePicture: 'Your profile picture',
    avatar: 'Your avatar',
    account: 'Account',
    addresses: 'Delivery addresses',
    addressesSub: '{count} saved · {name} default',
    none: 'none',
    noAddresses: 'None saved yet',
    payment: 'Payment methods',
    noPayment: 'None saved yet',
    orderNotifications: 'Order notifications',
    orderNotificationsSub: 'Push and SMS updates',
    partnersLegal: 'Partners & legal',
    partners: 'Partner pharmacies',
    partnersSub: 'See who fulfils your orders',
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
    privacySub: 'How your health data is handled',
    loggingOut: 'Logging out…',
    logOut: 'Log out',
    logOutSub: 'You will need to sign in again',
  },
  fr: {
    title: 'Profil',
    settings: 'Paramètres',
    editA11y: '{name}. Modifier votre profil.',
    profilePicture: 'Votre photo de profil',
    avatar: 'Votre avatar',
    account: 'Compte',
    addresses: 'Adresses de livraison',
    addressesSub: '{count} au total · par défaut : {name}',
    none: 'aucune',
    noAddresses: 'Aucune pour le moment',
    payment: 'Moyens de paiement',
    noPayment: 'Aucun pour le moment',
    orderNotifications: 'Notifications de commande',
    orderNotificationsSub: 'Mises à jour par push et SMS',
    partnersLegal: 'Partenaires et mentions légales',
    partners: 'Pharmacies partenaires',
    partnersSub: 'Qui prépare vos commandes',
    terms: "Conditions d'utilisation",
    privacy: 'Politique de confidentialité',
    privacySub: 'Comment vos données de santé sont traitées',
    loggingOut: 'Déconnexion…',
    logOut: 'Se déconnecter',
    logOutSub: 'Vous devrez vous reconnecter',
  },
  tw: {
    title: 'Wo ho',
    settings: 'Nhyehyɛeɛ',
    editA11y: '{name}. Sesa wo ho nsɛm.',
    profilePicture: 'Wo mfonini',
    avatar: 'Wo sɛnkyerɛnne',
    account: 'Akontaa',
    addresses: 'Baabi a wɔde nneɛma bɛbrɛ wo',
    addressesSub: '{count} wɔakora · {name} ne titire',
    none: 'biribiara',
    noAddresses: 'Biribiara nni hɔ',
    payment: 'Akatua akwan',
    noPayment: 'Biribiara nni hɔ',
    orderNotifications: 'Nneɛma a woato ho nkaeɛ',
    orderNotificationsSub: 'Push ne SMS nkaeɛ',
    partnersLegal: 'Adwumayɔnkoɔ ne mmara',
    partners: 'Nnuro adetɔnfoɔ a yɛne wɔn yɛ adwuma',
    partnersSub: 'Hwɛ wɔn a wɔsiesie wo nneɛma',
    terms: 'Dwumadie mmara',
    privacy: 'Kokoam nhyehyɛeɛ',
    privacySub: 'Sɛnea yɛhwɛ wo apɔmuden ho nsɛm so',
    loggingOut: 'Ɛrefi mu…',
    logOut: 'Fi mu',
    logOutSub: 'Ɛsɛ sɛ wosan kɔ mu bio',
  },
  gaa: {
    title: 'Bo he',
    settings: 'Toiŋjɔlɛmɔi',
    editA11y: '{name}. Tsake bo he saji.',
    profilePicture: 'Bo mfoniri',
    avatar: 'Bo okadi',
    account: 'Akɔŋt',
    addresses: 'He ni akɛ nibii baa',
    addressesSub: '{count} ni ato · {name} ji klɛŋklɛŋ',
    none: 'ekoko',
    noAddresses: 'Nɔ ko bɛ',
    payment: 'Gbɛi ni akɛwoɔ nyɔmɔ',
    noPayment: 'Nɔ ko bɛ',
    orderNotifications: 'Nɔ ni ohe he kaimɔi',
    orderNotificationsSub: 'Push kɛ SMS kaimɔi',
    partnersLegal: 'Nanemɛi kɛ mlai',
    partners: 'Tsofa shĩai ni wɔkɛ amɛ tsuɔ nii',
    partnersSub: 'Kwɛ mɛi ni saa o nibii',
    terms: 'Nitsumɔ mlai',
    privacy: 'Teemɔ he mlai',
    privacySub: 'Bɔ ni wɔkwɛɔ o hewalɛ saji',
    loggingOut: 'Ojeɔ kpo…',
    logOut: 'Je kpo',
    logOutSub: 'Esa akɛ oje mli ekoŋŋ',
  },
  ee: {
    title: 'Wò ŋuti',
    settings: 'Ɖoɖowo',
    editA11y: '{name}. Trɔ wò ŋutinyawo.',
    profilePicture: 'Wò foto',
    avatar: 'Wò dzesi',
    account: 'Akɔnta',
    addresses: 'Nuxɔƒewo',
    addressesSub: '{count} wodzra ɖo · {name} nye gbãtɔ',
    none: 'naneke',
    noAddresses: 'Naneke meli o',
    payment: 'Fexexe mɔnuwo',
    noPayment: 'Naneke meli o',
    orderNotifications: 'Nudodo ŋuti nyanyuiwo',
    orderNotificationsSub: 'Push kple SMS nyanyuiwo',
    partnersLegal: 'Kpeɖeŋutɔwo kple sewo',
    partners: 'Atikedzraƒe kpeɖeŋutɔwo',
    partnersSub: 'Kpɔ ame siwo wɔa wò nudodowo',
    terms: 'Zazã ƒe sewo',
    privacy: 'Adzamenyawo ƒe ɖoɖo',
    privacySub: 'Ale si wokpɔa wò lãmesẽ nyatakakawo dzi',
    loggingOut: 'Ele dodom…',
    logOut: 'Do go',
    logOutSub: 'Àgaɖo ge ɖe eme ake',
  },
  ha: {
    title: 'Bayananka',
    settings: 'Saituna',
    editA11y: '{name}. Gyara bayananka.',
    profilePicture: 'Hoton bayananka',
    avatar: 'Hotonka',
    account: 'Asusu',
    addresses: 'Adiresoshin kawowa',
    addressesSub: '{count} an ajiye · {name} na asali',
    none: 'babu',
    noAddresses: 'Babu wanda aka ajiye',
    payment: 'Hanyoyin biya',
    noPayment: 'Babu wanda aka ajiye',
    orderNotifications: 'Sanarwar oda',
    orderNotificationsSub: 'Sabuntawa ta push da SMS',
    partnersLegal: 'Abokan hulɗa da doka',
    partners: 'Kantunan magani abokan hulɗa',
    partnersSub: 'Duba waɗanda ke shirya odarka',
    terms: 'Sharuɗɗan amfani',
    privacy: 'Manufar sirri',
    privacySub: 'Yadda ake kula da bayanan lafiyarka',
    loggingOut: 'Ana fita…',
    logOut: 'Fita',
    logOutSub: 'Za ka buƙaci sake shiga',
  },
});

export default function Profile() {
  const profile = useProfile();
  const addresses = useAddresses();
  const { address } = useCheckoutSelection();
  // Saved instruments only. Checkout's always-offered options (Telecel, bank
  // transfer) are ways to pay, not something on file, and must not read as one.
  const [method] = useSavedMethods();
  const t = useTokens();
  const tr = useT(S);
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
          title={tr('title')}
          showBack={false}
          actions={[
            { icon: 'settings', label: tr('settings'), onPress: () => router.push('/settings') },
          ]}
        />

        {/* Identity — radius 28, padding 20, 56pt avatar */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('editA11y', { name: profile.name })}
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
            label={profile.avatarUrl ? tr('profilePicture') : tr('avatar')}
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

        <SectionHeader title={tr('account')} />

        <ListRow
          icon="location"
          hue="blue"
          title={tr('addresses')}
          subtitle={
            addresses.length
              ? tr('addressesSub', { count: addresses.length, name: address?.title ?? tr('none') })
              : tr('noAddresses')
          }
          chevron
          onPress={() => router.push('/addresses')}
        />
        <ListRow
          icon="wallet"
          hue="mint"
          title={tr('payment')}
          subtitle={method ? `Paystack · ${methodLabel(method)}` : tr('noPayment')}
          chevron
          onPress={() => router.push('/payment-methods')}
        />
        <ListRow
          icon="notification"
          hue="gold"
          title={tr('orderNotifications')}
          subtitle={tr('orderNotificationsSub')}
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
              label={tr('orderNotifications')}
            />
          }
        />

        <SectionHeader title={tr('partnersLegal')} />

        <ListRow
          icon="shield-check"
          hue="teal"
          title={tr('partners')}
          subtitle={tr('partnersSub')}
          chevron
          onPress={() => router.push('/partners')}
        />
        <ListRow
          icon="prescription"
          hue="pink"
          title={tr('terms')}
          subtitle="altruistpharmacy.com/terms"
          chevron
          onPress={() => router.push('/legal')}
        />
        <ListRow
          icon="shield-check"
          hue="coral"
          title={tr('privacy')}
          subtitle={tr('privacySub')}
          chevron
          onPress={() => router.push('/legal')}
        />
        <ListRow
          icon="logout"
          hue="teal"
          title={leaving ? tr('loggingOut') : tr('logOut')}
          subtitle={tr('logOutSub')}
          onPress={logOut}
        />
        {/* No platform disclosure footer: it is the first section of the Terms
            of Service, one row up. */}
      </ScrollView>
    </View>
  );
}
