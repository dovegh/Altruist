/**
 * Mobile — Legal — ported 1:1 from Figma node on page "Legal".
 *
 * Scroll content: V gap18, pad 64/24/60/24. A mint framing card, five list rows,
 * then the browser note.
 *
 * Terms and Privacy open in the system browser rather than in-app, and the
 * closing line says why: the published document is the one that binds, and an
 * in-app copy can go stale between releases. The in-app reader exists for
 * offline reference only and links back out.
 */
import React from 'react';
import { View, Linking } from 'react-native';
import { router } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen } from '@/components/ui/FormScreen';
import { TitleAppBar } from '@/components/ui/AppBar';
import { ListRow } from '@/components/ui/ListRow';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { LEGAL_DOCS, PLATFORM_STATEMENT, PRIVACY_URL, docSubtitle } from '@/lib/legal';
export { TERMS_URL, PRIVACY_URL } from '@/lib/legal';
import { defineStrings, useT } from '@/i18n';

// The platform statement and the documents themselves stay in English.
const S = defineStrings({
  en: {
    title: 'Legal',
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
    partners: 'Partner pharmacies',
    partnersSub: 'Licences and who fulfils your orders',
    contact: 'Contact & data requests',
  },
  fr: {
    title: 'Mentions légales',
    terms: "Conditions d'utilisation",
    privacy: 'Politique de confidentialité',
    partners: 'Pharmacies partenaires',
    partnersSub: 'Licences et qui prépare vos commandes',
    contact: 'Contact et demandes de données',
  },
  tw: {
    title: 'Mmara',
    terms: 'Nhyehyɛeɛ a ɛfa dwumadie ho',
    privacy: 'Kokoam nsɛm ho nhyehyɛeɛ',
    partners: 'Nnuro adetɔnfoɔ a yɛne wɔn yɛ adwuma',
    partnersSub: 'Tumi krataa ne wɔn a wɔyɛ wo nneɛma',
    contact: 'Nkitahodie ne nsɛm ho abisadeɛ',
  },
  gaa: {
    title: 'Mlai',
    terms: 'Nitsumɔ he mlai',
    privacy: 'Teemɔ saji ahe mlai',
    partners: 'Tsofa hejɔɔ he ni wɔkɛtsuɔ nii',
    partnersSub: 'Lisɛnsii kɛ mɛi ni feɔ onibii',
    contact: 'Wiemɔ kɛ saji ahe sanebimɔi',
  },
  ee: {
    title: 'Sewo',
    terms: 'Zazã ƒe ɖoɖowo',
    privacy: 'Adzamenyawo ƒe ɖoɖo',
    partners: 'Atikedzraƒe siwo míewɔa dɔ kpli',
    partnersSub: 'Mɔɖeɖegbalẽwo kple ame siwo wɔa wò nuƒleƒlewo',
    contact: 'Kadodo kple nyatakaka biabiawo',
  },
  ha: {
    title: 'Sharuɗɗa',
    terms: 'Sharuɗɗan amfani',
    privacy: 'Manufar sirri',
    partners: 'Kantunan magani abokan hulɗa',
    partnersSub: 'Lasisi da wanda ke cika odarka',
    contact: 'Tuntuɓa da buƙatun bayanai',
  },
});


export default function Legal() {
  const t = useTokens();
  const { d } = useDesignScale();
  const tr = useT(S);

  return (
    <FormScreen gap={18} contentStyle={{ paddingBottom: d(60) }}>
      <TitleAppBar title={tr('title')} />

      {/* Framing card */}
      <View
        style={{
          gap: d(10),
          padding: d(20),
          borderRadius: d(28),
          backgroundColor: t.colors.bg.brandSubtle,
        }}
      >
        <View
          style={{
            width: d(44),
            height: d(44),
            borderRadius: t.radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: t.colors.bg.surface,
          }}
        >
          <Icon name="shield-check" size={d(22)} tone="brand" />
        </View>
        <Text variant="headingM" style={{ fontSize: d(18), lineHeight: d(24) }}>
          {PLATFORM_STATEMENT.title}
        </Text>
        <Text variant="bodyM" tone="secondary" style={{ fontSize: d(14), lineHeight: d(21) }}>
          {PLATFORM_STATEMENT.body}
        </Text>
      </View>

      <ListRow
        title={tr('terms')}
        subtitle={docSubtitle(LEGAL_DOCS[0])}
        chevron
        onPress={() => router.push('/terms')}
      />
      <ListRow
        title={tr('privacy')}
        subtitle={docSubtitle(LEGAL_DOCS[1])}
        chevron
        onPress={() => Linking.openURL(PRIVACY_URL)}
      />
      <ListRow
        title={tr('partners')}
        subtitle={tr('partnersSub')}
        chevron
        onPress={() => router.push('/partners')}
      />
      <ListRow
        title={tr('contact')}
        subtitle="privacy@altruistpharmacy.com"
        chevron
        onPress={() => Linking.openURL('mailto:privacy@altruistpharmacy.com')}
      />

    </FormScreen>
  );
}
