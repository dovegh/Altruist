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
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    title: 'Notifications',
    saveError: 'That change was not saved. {reason}',
    ordersGroup: 'ORDERS & PRESCRIPTIONS',
    orderStatus: 'Order status changes',
    orderStatusSub: 'Packing, dispatched, delivered',
    rider: 'Rider approaching',
    riderSub: 'About 5 minutes before arrival',
    remindersGroup: 'REMINDERS',
    refill: 'Refill reminders',
    refillSub: 'When a repeat is due',
    wellness: 'Wellness plan nudges',
    wellnessSub: 'Plan at 07:00, water through the day',
    marketingGroup: 'MARKETING',
    offers: 'Offers and promotions',
    offersSub: 'Discounts and new products',
    digest: 'Health tips digest',
    digestSub: 'Weekly, Sunday morning',
    channelsGroup: 'HOW WE REACH YOU',
    push: 'Push notifications',
    pushSub: 'On this device',
    sms: 'SMS',
    smsSub: '{phone} · charges may apply',
    email: 'Email',
    note: 'You will always be told when your prescription is verified or rejected.',
  },
  fr: {
    title: 'Notifications',
    saveError: "Ce changement n'a pas été enregistré. {reason}",
    ordersGroup: 'COMMANDES ET ORDONNANCES',
    orderStatus: 'Suivi de commande',
    orderStatusSub: 'Préparation, expédition, livraison',
    rider: 'Livreur en approche',
    riderSub: "Environ 5 minutes avant l'arrivée",
    remindersGroup: 'RAPPELS',
    refill: 'Rappels de renouvellement',
    refillSub: 'Quand un renouvellement est dû',
    wellness: 'Rappels du programme bien-être',
    wellnessSub: "Programme à 07:00, de l'eau tout au long de la journée",
    marketingGroup: 'MARKETING',
    offers: 'Offres et promotions',
    offersSub: 'Réductions et nouveaux produits',
    digest: 'Résumé de conseils santé',
    digestSub: 'Chaque semaine, le dimanche matin',
    channelsGroup: 'COMMENT NOUS VOUS JOIGNONS',
    push: 'Notifications push',
    pushSub: 'Sur cet appareil',
    sms: 'SMS',
    smsSub: "{phone} · des frais peuvent s'appliquer",
    email: 'E-mail',
    note: 'Vous serez toujours informé lorsque votre ordonnance est vérifiée ou refusée.',
  },
  tw: {
    title: 'Nkaeɛ',
    saveError: 'Nsesaeɛ no ankora so. {reason}',
    ordersGroup: 'NNEƐMA A WOATO NE NNURO KRATAA',
    orderStatus: 'Nneɛma a woato ho nsesaeɛ',
    orderStatusSub: 'Yɛreboaboa, yɛde aba, adu',
    rider: 'Ɔde nneɛma brɛfoɔ reba',
    riderSub: 'Bɛyɛ simma 5 ansa na ɔbɛduru',
    remindersGroup: 'NKAEƐ',
    refill: 'Nnuro foforɔ nkaeɛ',
    refillSub: 'Sɛ bere aso sɛ wotɔ bio a',
    wellness: 'Apɔmuden nhyehyɛeɛ nkaeɛ',
    wellnessSub: 'Nhyehyɛeɛ wɔ 07:00, nsuo da mũ nyinaa',
    marketingGroup: 'ADETƆN',
    offers: 'Ahyɛdeɛ ne nkɔsoɔ nsɛm',
    offersSub: 'Ɛka a wɔatew so ne nneɛma foforɔ',
    digest: 'Apɔmuden afotuo mmoaboa',
    digestSub: 'Dapɛn biara, Kwasiada anɔpa',
    channelsGroup: 'SƐNEA YƐDU WO HO',
    push: 'Push nkaeɛ',
    pushSub: 'Wɔ fon yi so',
    sms: 'SMS',
    smsSub: '{phone} · ebia wobɛtua ka',
    email: 'Email',
    note: 'Yɛbɛka akyerɛ wo bere biara a wɔagye wo nnuro krataa atom anaa wɔapo.',
  },
  gaa: {
    title: 'Kaimɔi',
    saveError: 'Atooo tsakemɔ lɛ. {reason}',
    ordersGroup: 'NƆ NI OHE KƐ TSOFA WOLOI',
    orderStatus: 'Nɔ ni ohe lɛ he tsakemɔi',
    orderStatusSub: 'Abuɔ, ajieɔ kpo, eshɛ',
    rider: 'Mɔ ni kɛ nibii baa lɛ miibɛŋkɛ',
    riderSub: 'Aaafee miniti 5 dani eshɛ',
    remindersGroup: 'KAIMƆI',
    refill: 'Tsofa ekoŋŋ he kaimɔi',
    refillSub: 'Be ni esa akɛ ohe ekoŋŋ',
    wellness: 'Hewalɛ gbɛjianɔtoo kaimɔi',
    wellnessSub: 'Gbɛjianɔtoo yɛ 07:00, nu gbi lɛ fɛɛ',
    marketingGroup: 'JUAMƆ',
    offers: 'Juamɔ he saji',
    offersSub: 'Nɔ ni ejara ba shi kɛ nibii hei',
    digest: 'Hewalɛ he ŋaawoo',
    digestSub: 'Otsi fɛɛ otsi, Hɔgbaa leebi',
    channelsGroup: 'BƆ NI WƆSHƐƆ BO',
    push: 'Push kaimɔi',
    pushSub: 'Yɛ tɛlifoŋ nɛɛ nɔ',
    sms: 'SMS',
    smsSub: '{phone} · ekolɛ oaawo nyɔmɔ',
    email: 'Email',
    note: 'Wɔbaakɛɛ bo be fɛɛ be ni aye o tsofa wolo lɛ odase loo akpoo.',
  },
  ee: {
    title: 'Nyanyuiwo',
    saveError: 'Womedzra tɔtrɔ la ɖo o. {reason}',
    ordersGroup: 'NUDODOWO KPLE ATIKEŊƆŊLƆWO',
    orderStatus: 'Nudodo ƒe nɔnɔme tɔtrɔwo',
    orderStatusSub: 'Le babla, wodɔe ɖa, eɖo',
    rider: 'Nuɖola le gbɔgbɔm',
    riderSub: 'Abe miniti 5 hafi wòaɖo',
    remindersGroup: 'ŊKUƉODZINYAWO',
    refill: 'Atike yeyeƒle ŋkuɖodziwo',
    refillSub: 'Ne ɣeyiɣi ɖo be nàgaƒlee',
    wellness: 'Lãmesẽ ɖoɖo ŋkuɖodziwo',
    wellnessSub: 'Ɖoɖo le 07:00, tsi le ŋkekea me katã',
    marketingGroup: 'ASITSATSA',
    offers: 'Nunana kple asitsatsa',
    offersSub: 'Asi ɖiɖi kple nu yeyewo',
    digest: 'Lãmesẽ aɖaŋuɖoɖowo',
    digestSub: 'Kwasiɖa sia kwasiɖa, Kɔsiɖa ŋdi',
    channelsGroup: 'ALE SI MÍEƉOA WÒ GBƆ',
    push: 'Push nyanyuiwo',
    pushSub: 'Le fon sia dzi',
    sms: 'SMS',
    smsSub: '{phone} · ɖewohĩ nàxe ga',
    email: 'Email',
    note: 'Míagblɔe na wò ɣesiaɣi ne woɖo kpe wò atikeŋɔŋlɔ dzi alo gbee.',
  },
  ha: {
    title: 'Sanarwa',
    saveError: 'Ba a ajiye wannan canjin ba. {reason}',
    ordersGroup: 'ODA DA TAKARDUN MAGANI',
    orderStatus: 'Canjin matsayin oda',
    orderStatusSub: 'Ana haɗawa, an tura, an kawo',
    rider: 'Mai kawowa na zuwa',
    riderSub: 'Kusan minti 5 kafin isowa',
    remindersGroup: 'TUNATARWA',
    refill: 'Tunatarwar sabunta magani',
    refillSub: 'Lokacin da maimaitawa ya yi',
    wellness: 'Tunatarwar shirin lafiya',
    wellnessSub: 'Shiri da ƙarfe 07:00, ruwa cikin yini',
    marketingGroup: 'TALLA',
    offers: 'Tayi da rangwame',
    offersSub: 'Rangwame da sababbin kayayyaki',
    digest: 'Taƙaitaccen shawarwarin lafiya',
    digestSub: 'Kowane mako, safiyar Lahadi',
    channelsGroup: 'YADDA MUKE ISA GARE KA',
    push: 'Sanarwar push',
    pushSub: "A kan wannan na'ura",
    sms: 'SMS',
    smsSub: '{phone} · ana iya cajin kuɗi',
    email: 'Imel',
    note: 'Za a sanar da kai koyaushe idan an tabbatar ko an ƙi takardar maganinka.',
  },
});

export default function NotificationSettings() {
  const profile = useProfile();
  const t = useTokens();
  const tr = useT(S);
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
        setError(tr('saveError', { reason: describeFailure(e) })),
      );
    },
  });

  return (
    <FormScreen gap={16} contentStyle={{ paddingBottom: d(60) }}>
      <TitleAppBar title={tr('title')} />

      {error ? <FormMessage>{error}</FormMessage> : null}

      <SettingsGroup label={tr('ordersGroup')}>
        <SettingsRow
          icon="cart"
          title={tr('orderStatus')}
          subtitle={tr('orderStatusSub')}
          {...pref('orderStatus')}
        />
        <SettingsRow
          icon="clock"
          title={tr('rider')}
          subtitle={tr('riderSub')}
          {...pref('riderApproaching')}
        />
      </SettingsGroup>

      <SettingsGroup label={tr('remindersGroup')}>
        <SettingsRow
          icon="prescription"
          title={tr('refill')}
          subtitle={tr('refillSub')}
          {...pref('refillReminders')}
        />
        <SettingsRow
          icon="wellness"
          title={tr('wellness')}
          subtitle={tr('wellnessSub')}
          {...pref('wellnessNudges')}
        />
      </SettingsGroup>

      <SettingsGroup label={tr('marketingGroup')}>
        <SettingsRow
          icon="info"
          title={tr('offers')}
          subtitle={tr('offersSub')}
          {...pref('offers')}
        />
        <SettingsRow
          icon="info"
          title={tr('digest')}
          subtitle={tr('digestSub')}
          {...pref('healthDigest')}
        />
      </SettingsGroup>

      <SettingsGroup label={tr('channelsGroup')}>
        <SettingsRow
          icon="notification"
          title={tr('push')}
          subtitle={tr('pushSub')}
          {...pref('push')}
        />
        <SettingsRow
          icon="info"
          title={tr('sms')}
          subtitle={tr('smsSub', { phone: profile.phone })}
          {...pref('sms')}
        />
        <SettingsRow
          icon="info"
          title={tr('email')}
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
          {tr('note')}
        </Text>
      </View>
    </FormScreen>
  );
}
