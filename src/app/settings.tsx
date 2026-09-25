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
import { setNotificationPref, useNotificationPrefs } from '@/features/notifications/preferences';
import {
  scenariosAvailable,
  useScenarioStore,
  type PaymentScenario,
  type ReviewScenario,
} from '@/lib/devScenarios';
import { defineStrings, languageInfo, useLanguage, useT } from '@/i18n';

// Developer-only rows further down stay in English: they never ship.
const S = defineStrings({
  en: {
    title: 'Settings',
    appearance: 'APPEARANCE',
    system: 'System',
    light: 'Light',
    dark: 'Dark',
    themeA11y: '{name} theme',
    preferences: 'PREFERENCES',
    notifications: 'Notifications',
    notificationsSub: 'Orders, refills, wellness',
    language: 'Language',
    payment: 'Default payment',
    noPayment: 'None saved yet',
    wellness: 'Wellness reminders',
    wellnessSub: 'Plan nudges and hydration',
    yourData: 'YOUR DATA',
    download: 'Download your data',
    downloadSub: 'Everything Altruist holds, as a file',
    scripts: 'My prescriptions',
    scriptsSub: 'Photos, reviews and status',
    deleteAccount: 'Delete account',
    deleteSub: 'Permanent after a 30-day grace period',
    about: 'ABOUT',
    version: 'Version',
    registered: 'Registered as',
    company: 'Company number',
    disclaimer:
      'Altruist is a technology platform connecting you with certified, independent partner pharmacies. It does not dispense medication or provide medical advice.',
  },
  fr: {
    title: 'Paramètres',
    appearance: 'APPARENCE',
    system: 'Système',
    light: 'Clair',
    dark: 'Sombre',
    themeA11y: 'Thème {name}',
    preferences: 'PRÉFÉRENCES',
    notifications: 'Notifications',
    notificationsSub: 'Commandes, renouvellements, bien-être',
    language: 'Langue',
    payment: 'Paiement par défaut',
    noPayment: 'Aucun enregistré',
    wellness: 'Rappels bien-être',
    wellnessSub: 'Programme du jour et hydratation',
    yourData: 'VOS DONNÉES',
    download: 'Télécharger vos données',
    downloadSub: 'Tout ce que détient Altruist, dans un fichier',
    scripts: 'Mes ordonnances',
    scriptsSub: 'Photos, vérifications et statut',
    deleteAccount: 'Supprimer le compte',
    deleteSub: 'Définitif après un délai de 30 jours',
    about: 'À PROPOS',
    version: 'Version',
    registered: 'Enregistré sous',
    company: "Numéro d'entreprise",
    disclaimer:
      "Altruist est une plateforme technologique qui vous met en relation avec des pharmacies partenaires certifiées et indépendantes. Elle ne délivre pas de médicaments et ne donne pas d'avis médical.",
  },
  tw: {
    title: 'Nhyehyɛeɛ',
    appearance: 'SƐNEA ƐTE',
    system: 'Fon no deɛ',
    light: 'Hann',
    dark: 'Sum',
    themeA11y: '{name} kɔla',
    preferences: 'DEƐ WOPƐ',
    notifications: 'Nkaeɛ',
    notificationsSub: 'Nneɛma a woato, nnuro foforɔ, apɔmuden',
    language: 'Kasa',
    payment: 'Ɛkwan a wode tua ka',
    noPayment: 'Biribiara nni hɔ',
    wellness: 'Apɔmuden nkaeɛ',
    wellnessSub: 'Da biara nhyehyɛeɛ ne nsuo nom',
    yourData: 'WO NSƐM',
    download: 'Twe wo nsɛm',
    downloadSub: 'Deɛ Altruist kora nyinaa, wɔ fael mu',
    scripts: 'Me nnuro krataa',
    scriptsSub: 'Mfonini, nhwehwɛmu ne tebea',
    deleteAccount: 'Yi wo akontaa',
    deleteSub: 'Ɛbɛyɛ daa akyi nna 30',
    about: 'ƐFA YƐN HO',
    version: 'Nsesaeɛ',
    registered: 'Din a yɛde kyerɛw',
    company: 'Adwumakuo nɔma',
    disclaimer:
      'Altruist yɛ mfiridwuma a ɛde wo ka nnuro adetɔnfoɔ a wɔagye wɔn atom ho. Ɛntɔn nnuro na ɛmma ayaresa ho afotuo.',
  },
  gaa: {
    title: 'Toiŋjɔlɛmɔi',
    appearance: 'BƆ NI ETSƆ',
    system: 'Tɛlifoŋ lɛ nɔ',
    light: 'La',
    dark: 'Duŋ',
    themeA11y: '{name} kɔlɔ',
    preferences: 'NƆ NI OSUMƆ',
    notifications: 'Kaimɔi',
    notificationsSub: 'Nɔ ni ohe, tsofai hei, hewalɛ',
    language: 'Wiemɔ',
    payment: 'Gbɛ ni okɛwoɔ nyɔmɔ',
    noPayment: 'Nɔ ko bɛ',
    wellness: 'Hewalɛ kaimɔi',
    wellnessSub: 'Daa gbi nɔ ni ofeɔ kɛ nu nɔmɔ',
    yourData: 'O SANEI',
    download: 'Gbala o sanei',
    downloadSub: 'Nɔ fɛɛ nɔ ni Altruist hiɛ, yɛ fael mli',
    scripts: 'Mi tsofa woloi',
    scriptsSub: 'Mfonirii, kpɔjiemɔ kɛ bɔ ni etsɔ',
    deleteAccount: 'Jiemɔ o akɔŋt',
    deleteSub: 'Ebaatsɔ daa yɛ gbii 30 sɛɛ',
    about: 'YƐ WƆ HE',
    version: 'Nɔ ni ji',
    registered: 'Gbɛi ni aŋma',
    company: 'Nitsumɔ he nɔmba',
    disclaimer:
      'Altruist ji tɛknoloji nɔ ni kɛ bo tsɔɔ tsofa shĩai ni ahe amɛ gbɛ. Ehɔɔɔ tsofai ni ekɛɛɛ helatsamɔ ŋaawoo.',
  },
  ee: {
    title: 'Ɖoɖowo',
    appearance: 'ALE SI WÒDZE',
    system: 'Fon la tɔ',
    light: 'Kekeli',
    dark: 'Viviti',
    themeA11y: '{name} amadede',
    preferences: 'NU SIWO NÈDI',
    notifications: 'Nyanyuiwo',
    notificationsSub: 'Nudodowo, atike yeyewo, lãmesẽ',
    language: 'Gbe',
    payment: 'Fexexe mɔnu',
    noPayment: 'Naneke meli o',
    wellness: 'Lãmesẽ ŋkuɖodzinyawo',
    wellnessSub: 'Gbesiagbe ɖoɖo kple tsinono',
    yourData: 'WÒ NYATAKAKAWO',
    download: 'Xɔ wò nyatakakawo',
    downloadSub: 'Nu siwo katã Altruist lé ɖe asi, le fael me',
    scripts: 'Nye atikeŋɔŋlɔwo',
    scriptsSub: 'Foto, dzodzrɔ kple nɔnɔme',
    deleteAccount: 'Tutu wò akɔnta',
    deleteSub: 'Anɔ anyi tegbee le ŋkeke 30 megbe',
    about: 'LE MIAƑE ŊU',
    version: 'Tɔtrɔ',
    registered: 'Ŋkɔ si wòŋlɔ',
    company: 'Dɔwɔƒe xexlẽdzesi',
    disclaimer:
      'Altruist nye mɔ̃ɖaŋu si tsɔa wò ɖoa atikedzraƒe siwo woɖo kpe edzi gbɔ. Medzraa atike o eye metsɔa atikewɔwɔ ƒe aɖaŋu o.',
  },
  ha: {
    title: 'Saituna',
    appearance: 'KAMANNI',
    system: 'Na waya',
    light: 'Haske',
    dark: 'Duhu',
    themeA11y: 'Jigon {name}',
    preferences: 'ZAƁUƁƁUKA',
    notifications: 'Sanarwa',
    notificationsSub: 'Oda, sabunta magani, lafiya',
    language: 'Harshe',
    payment: 'Hanyar biya ta asali',
    noPayment: 'Babu wanda aka ajiye',
    wellness: 'Tunatarwar lafiya',
    wellnessSub: 'Shirin rana da shan ruwa',
    yourData: 'BAYANANKA',
    download: 'Sauke bayananka',
    downloadSub: 'Duk abin da Altruist ke riƙe, a cikin fayil',
    scripts: 'Takardun magani na',
    scriptsSub: 'Hotuna, dubawa da matsayi',
    deleteAccount: 'Goge asusu',
    deleteSub: 'Na dindindin bayan kwana 30',
    about: 'GAME DA MU',
    version: 'Siga',
    registered: 'An yi rajista a matsayin',
    company: 'Lambar kamfani',
    disclaimer:
      "Altruist dandalin fasaha ne da ke haɗa ka da kantunan magani masu zaman kansu da aka tabbatar. Ba ya ba da magani kuma ba ya ba da shawarar likita.",
  },
});

const THEMES = [
  { key: 'system', label: 'system' },
  { key: 'light', label: 'light' },
  { key: 'dark', label: 'dark' },
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
  const tr = useT(S);
  const lang = useLanguage();
  // Version comes from the build, never a literal that goes stale on release.
  const ABOUT: [string, string][] = [
    [tr('version'), appVersion()],
    [tr('registered'), ORG.registeredName],
    [tr('company'), ORG.companyNumber],
  ];
  const { method } = useCheckoutSelection();
  const t = useTokens();
  const { d } = useDesignScale();
  const { preference, setPreference } = useTheme();
  // The same saved setting as "Wellness plan nudges" on Notification Settings.
  const notificationPrefs = useNotificationPrefs();

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
      <TitleAppBar title={tr('title')} />

      <SectionLabel>{tr('appearance')}</SectionLabel>

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
                accessibilityLabel={tr('themeA11y', { name: tr(x.label) })}
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
                  {tr(x.label)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <SectionLabel>{tr('preferences')}</SectionLabel>

      <ListRow
        icon="notification"
        hue="gold"
        title={tr('notifications')}
        subtitle={tr('notificationsSub')}
        chevron
        onPress={() => router.push('/notification-settings')}
      />
      <ListRow
        icon="info"
        hue="blue"
        title={tr('language')}
        subtitle={languageInfo(lang).native}
        chevron
        onPress={() => router.push('/language')}
      />
      <ListRow
        icon="card"
        hue="teal"
        title={tr('payment')}
        subtitle={method ? methodLabel(method) : tr('noPayment')}
        chevron
        onPress={() => router.push('/payment-methods')}
      />
      <ListRow
        icon="wellness"
        hue="pink"
        title={tr('wellness')}
        subtitle={tr('wellnessSub')}
        trailing={
          <Toggle
            value={notificationPrefs?.wellnessNudges ?? false}
            disabled={!notificationPrefs}
            onValueChange={(next) => {
              setNotificationPref('wellnessNudges', next).catch(() => {});
            }}
            label={tr('wellness')}
          />
        }
      />

      <SectionLabel>{tr('yourData')}</SectionLabel>

      <ListRow
        icon="upload"
        hue="mint"
        title={tr('download')}
        subtitle={tr('downloadSub')}
        chevron
        onPress={() => router.push('/download-data')}
      />
      <ListRow
        icon="shield-check"
        hue="teal"
        title={tr('scripts')}
        subtitle={tr('scriptsSub')}
        chevron
        onPress={() => router.push('/prescriptions')}
      />
      <ListRow
        icon="trash"
        hue="coral"
        title={tr('deleteAccount')}
        subtitle={tr('deleteSub')}
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

      <SectionLabel>{tr('about')}</SectionLabel>

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
        {tr('disclaimer')}
      </Text>
    </FormScreen>
  );
}
