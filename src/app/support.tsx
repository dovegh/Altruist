/**
 * Help & Support — ported 1:1 from Figma node on page "Support & Disputes".
 *
 * Scroll content: V gap16, pad 64/24/60/24. A search field, the "who can help"
 * card, the conversation list, Report a problem, then common questions.
 *
 * The routing card is the screen's reason for existing. Altruist cannot answer
 * a clinical question — only the dispensing pharmacist can — and a single
 * generic "contact support" would put medicine questions in front of people not
 * licensed to answer them. Splitting the two contacts is a compliance decision
 * (SRS §1) wearing the clothes of an information architecture one.
 */
import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen } from '@/components/ui/FormScreen';
import { TitleAppBar } from '@/components/ui/AppBar';
import { SectionLabel } from '@/components/ui/Checkout';
import { InputField } from '@/components/ui/Input';
import { IconTile } from '@/components/ui/ListRow';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Icon, type IconName } from '@/components/ui/Icon';
import type { TileHue } from '@/components/ui/ListRow';
import { usePartnerPharmacy } from '@/features/profile/store';
import { CONTACTS, FAQ, fixtureThreads } from '@/lib/support';
import { relativeTime } from '@/lib/notifications';
import { defineStrings, useT } from '@/i18n';

// Contacts, FAQ and threads come from the support library and stay as they are.
const S = defineStrings({
  en: {
    title: 'Help & support',
    searchLabel: 'Search help',
    searchPlaceholder: 'Search articles and orders',
    whoCanHelp: 'WHO CAN HELP',
    message: 'Message',
    cannotAdvise:
      'Altruist cannot advise on medicines. Clinical questions always go to the pharmacy that dispensed your order.',
    conversations: 'YOUR CONVERSATIONS',
    threadA11y: '{title}. {preview}. {time}.',
    threadUnreadA11y: '{title}. {preview}. {time}. {count} unread.',
    report: 'Report a problem',
    common: 'COMMON QUESTIONS',
  },
  fr: {
    title: 'Aide et assistance',
    searchLabel: "Rechercher dans l'aide",
    searchPlaceholder: 'Rechercher des articles et des commandes',
    whoCanHelp: 'QUI PEUT VOUS AIDER',
    message: 'Écrire',
    cannotAdvise:
      'Altruist ne peut pas donner de conseils sur les médicaments. Les questions cliniques vont toujours à la pharmacie qui a préparé votre commande.',
    conversations: 'VOS CONVERSATIONS',
    threadA11y: '{title}. {preview}. {time}.',
    threadUnreadA11y: '{title}. {preview}. {time}. {count} non lus.',
    report: 'Signaler un problème',
    common: 'QUESTIONS FRÉQUENTES',
  },
  tw: {
    title: 'Mmoa',
    searchLabel: 'Hwehwɛ mmoa',
    searchPlaceholder: 'Hwehwɛ nsɛm ne nneɛma a woato',
    whoCanHelp: 'WƆN NA WƆBƐTUMI ABOA',
    message: 'Kyerɛw',
    cannotAdvise:
      'Altruist ntumi mma nnuro ho afotuo. Ayaresa ho nsɛmmisa kɔ nnuro adetɔnfoɔ a wɔmaa wo nnuro no hɔ bere nyinaa.',
    conversations: 'WO NKƆMMƆ',
    threadA11y: '{title}. {preview}. {time}.',
    threadUnreadA11y: '{title}. {preview}. {time}. {count} a wonkenkanee.',
    report: 'Bɔ ɔhaw bi ho amanneɛ',
    common: 'NSƐMMISA A ƐTAA BA',
  },
  gaa: {
    title: 'Yelikɛbuamɔ',
    searchLabel: 'Taomɔ yelikɛbuamɔ',
    searchPlaceholder: 'Taomɔ saji kɛ nibii ni ohe',
    whoCanHelp: 'MƐNI BAANYƐ AYE ABUA',
    message: 'Ŋma',
    cannotAdvise:
      'Altruist nyɛŋ aŋa tsofai ahe ŋaa. Hela he sanebimɔi yaa tsofa hejɔɔ he ni kɛ otsofa lɛ ha bo lɛ be fɛɛ be.',
    conversations: 'OSANEGBAA',
    threadA11y: '{title}. {preview}. {time}.',
    threadUnreadA11y: '{title}. {preview}. {time}. {count} ni okaneko.',
    report: 'Bɔ naagba ko he amaniɛ',
    common: 'SANEBIMƆI NI KƐƆ OFƆ',
  },
  ee: {
    title: 'Kpekpeɖeŋu',
    searchLabel: 'Di kpekpeɖeŋu',
    searchPlaceholder: 'Di nyatiwo kple nuƒleƒlewo',
    whoCanHelp: 'AME SIWO ATE ŊU AKPE ƉE ŊUWÒ',
    message: 'Ŋlɔ nya',
    cannotAdvise:
      'Altruist mate ŋu aɖo aɖaŋu tso atikewo ŋu o. Atikewɔwɔ ŋuti nyabiasewo yia atikedzraƒe si na atike wò la gbɔ ɣesiaɣi.',
    conversations: 'WÒ DZEDZEWO',
    threadA11y: '{title}. {preview}. {time}.',
    threadUnreadA11y: '{title}. {preview}. {time}. {count} siwo mèxlẽ o.',
    report: 'Gblɔ kuxi aɖe',
    common: 'NYABIASE SIWO VANA ZI GEƉE',
  },
  ha: {
    title: 'Taimako',
    searchLabel: 'Nemi taimako',
    searchPlaceholder: 'Nemi labarai da oda',
    whoCanHelp: 'WA ZAI IYA TAIMAKA',
    message: 'Aika saƙo',
    cannotAdvise:
      'Altruist ba ya ba da shawara kan magunguna. Tambayoyin lafiya koyaushe suna zuwa ga kantin maganin da ya ba da odarka.',
    conversations: 'TATTAUNAWARKA',
    threadA11y: '{title}. {preview}. {time}.',
    threadUnreadA11y: '{title}. {preview}. {time}. {count} ba a karanta ba.',
    report: 'Bayar da rahoton matsala',
    common: 'TAMBAYOYIN DA AKE YAWAN YI',
  },
});




export default function Support() {
  const t = useTokens();
  const { d } = useDesignScale();
  const pharmacy = usePartnerPharmacy();
  const THREADS = fixtureThreads(pharmacy);
  const tr = useT(S);
  const [query, setQuery] = useState('');

  return (
    <FormScreen gap={16} contentStyle={{ paddingBottom: d(60) }}>
      <TitleAppBar title={tr('title')} />

      <InputField
        label={tr('searchLabel')}
        value={query}
        onChangeText={setQuery}
        placeholder={tr('searchPlaceholder')}
      />

      {/* Who can help */}
      <View
        style={{
          gap: d(12),
          paddingVertical: d(16),
          paddingHorizontal: d(18),
          borderRadius: d(24),
          backgroundColor: t.colors.bg.surface,
        }}
      >
        <SectionLabel>{tr('whoCanHelp')}</SectionLabel>

        {CONTACTS.map((c) => (
          <View
            key={c.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: d(12),
              paddingVertical: d(12),
              paddingHorizontal: d(14),
              borderRadius: d(18),
              backgroundColor: t.colors.bg.surfaceRaised,
            }}
          >
            <IconTile name={c.icon} hue={c.hue} size={40} />
            <View style={{ flex: 1, gap: d(3) }}>
              <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
                {c.title}
              </Text>
              <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
                {c.meta}
              </Text>
            </View>
            <Button
              label={tr('message')}
              variant="secondary"
              size="small"
              fullWidth={false}
              onPress={() => router.push('/support-conversation')}
            />
          </View>
        ))}

        <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
          {tr('cannotAdvise')}
        </Text>
      </View>

      <SectionLabel>{tr('conversations')}</SectionLabel>

      {THREADS.map((th) => (
        <Pressable
          key={th.id}
          accessibilityRole="button"
          accessibilityLabel={tr(th.unread ? 'threadUnreadA11y' : 'threadA11y', {
            title: th.title,
            preview: th.preview,
            time: relativeTime(th.at),
            count: th.unread,
          })}
          onPress={() => router.push('/support-conversation')}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: d(12),
            paddingVertical: d(12),
            paddingLeft: d(14),
            paddingRight: d(16),
            borderRadius: d(20),
            backgroundColor: t.colors.bg.surface,
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <Avatar initials={th.initials} size={44} label={th.title} />
          <View style={{ flex: 1, gap: d(3) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(8) }}>
              <Text variant="labelM" style={{ flex: 1, fontSize: d(14), lineHeight: d(18) }}>
                {th.title}
              </Text>
              <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
                {relativeTime(th.at)}
              </Text>
            </View>
            <Text
              variant="caption"
              tone={th.unread ? 'secondary' : 'tertiary'}
              numberOfLines={1}
              style={{ fontSize: d(12), lineHeight: d(16) }}
            >
              {th.preview}
            </Text>
          </View>
          {th.unread ? <Badge label={String(th.unread)} tone="brand" solid /> : null}
        </Pressable>
      ))}

      <Button
        label={tr('report')}
        size="large"
        iconLeading="danger"
        onPress={() => router.push('/report-problem')}
      />

      <SectionLabel>{tr('common')}</SectionLabel>

      {FAQ.map((q) => (
        <Pressable
          key={q}
          accessibilityRole="button"
          accessibilityLabel={q}
          // Every FAQ answer lives with the pharmacy or Altruist support, so
          // the row opens the conversation rather than a dead-end article.
          onPress={() => router.push('/support-conversation')}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: d(12),
            paddingVertical: d(13),
            paddingLeft: d(16),
            paddingRight: d(14),
            borderRadius: d(16),
            backgroundColor: t.colors.bg.surface,
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <Text variant="bodyM" style={{ flex: 1, fontSize: d(14), lineHeight: d(21) }}>
            {q}
          </Text>
          <Icon name="chevron-right" size={d(18)} tone="tertiary" />
        </Pressable>
      ))}
    </FormScreen>
  );
}
