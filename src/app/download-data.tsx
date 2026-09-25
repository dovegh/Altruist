/**
 * Download Your Data — ported 1:1 from Figma node 171:496.
 *
 * Scroll content: V gap16, pad 64/24/140/24. A brand feature circle and head,
 * a "what to include" group of checkbox rows, a format segmented pair, then the
 * scope note. Footer: Request my archive + the turnaround line.
 *
 * The scope note is the point. A subject access request under the Data
 * Protection Act 2012 (Act 843) reaches the data a controller holds — and
 * Altruist is not the controller of the pharmacy's dispensing record. Telling
 * the user where the rest of their history lives is part of answering the
 * request honestly.
 */
import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen, StickyFooter, FeatureIcon } from '@/components/ui/FormScreen';
import { TitleAppBar } from '@/components/ui/AppBar';
import { SettingsGroup } from '@/components/ui/Settings';
import { Checkbox } from '@/components/ui/Form';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { useProfile } from '@/features/profile/store';
import { EXPORT_FORMATS as FORMATS, EXPORT_PARTS as PARTS } from '@/lib/forms';
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    title: 'Download your data',
    heading: 'Get a copy of everything',
    intro: 'We build a single archive and email you a secure download link. It expires after 7 days.',
    include: 'WHAT TO INCLUDE',
    profileTitle: 'Profile and addresses',
    profileMeta: 'Name, contact details, saved addresses',
    ordersTitle: 'Order history',
    ordersMeta: 'Every order, item and receipt · JSON + CSV',
    scriptsTitle: 'Prescription images',
    scriptsMeta: 'The original files you uploaded · adds ~40 MB',
    wellnessTitle: 'Wellness activity',
    wellnessMeta: 'Plans, sessions and hydration logs',
    supportTitle: 'Support conversations',
    supportMeta: 'Messages with Altruist and your pharmacies',
    format: 'FORMAT',
    pdfSummary: 'PDF summary',
    scope: 'Dispensing records are kept by your pharmacy. Ask them for a copy.',
    request: 'Request my archive',
    turnaround: 'Usually ready within 24 hours · sent to {email}',
  },
  fr: {
    title: 'Télécharger vos données',
    heading: 'Obtenir une copie de tout',
    intro:
      'Nous créons une archive unique et vous envoyons par e-mail un lien de téléchargement sécurisé. Il expire au bout de 7 jours.',
    include: 'CE QUE VOUS VOULEZ INCLURE',
    profileTitle: 'Profil et adresses',
    profileMeta: 'Nom, coordonnées, adresses enregistrées',
    ordersTitle: 'Historique des commandes',
    ordersMeta: 'Chaque commande, article et reçu · JSON + CSV',
    scriptsTitle: "Images d'ordonnances",
    scriptsMeta: 'Les fichiers originaux que vous avez envoyés · environ 40 Mo en plus',
    wellnessTitle: 'Activité bien-être',
    wellnessMeta: "Programmes, séances et suivi d'hydratation",
    supportTitle: "Conversations avec l'assistance",
    supportMeta: 'Messages avec Altruist et vos pharmacies',
    format: 'FORMAT',
    pdfSummary: 'Résumé PDF',
    scope: 'Les registres de délivrance sont conservés par votre pharmacie. Demandez-lui une copie.',
    request: 'Demander mon archive',
    turnaround: 'Généralement prête sous 24 heures · envoyée à {email}',
  },
  tw: {
    title: 'Twe wo nsɛm',
    heading: 'Nya biribiara ho kɔpi',
    intro: 'Yɛboaboa ano yɛ no fael baako na yɛde link a ahobammɔ wom to wo email so. Ɛsɛe nna 7 akyi.',
    include: 'DEƐ ƐSƐ SƐ ƐKA HO',
    profileTitle: 'Wo ho nsɛm ne address',
    profileMeta: 'Din, nkitahodie nsɛm, address a woakora',
    ordersTitle: 'Nneɛma a woato ho nsɛm',
    ordersMeta: 'Oda biara, adeɛ biara ne ka krataa biara · JSON + CSV',
    scriptsTitle: 'Nnuro krataa mfonini',
    scriptsMeta: 'Fael a wode too so no ankasa · ɛka ~40 MB ho',
    wellnessTitle: 'Apɔmuden dwumadie',
    wellnessMeta: 'Nhyehyɛeɛ, dwumadie ne nsuo nom ho nsɛm',
    supportTitle: 'Mmoa ho nkɔmmɔ',
    supportMeta: 'Nkra a wo ne Altruist ne wo nnuro adetɔnbea di',
    format: 'SƐNEA ƐBƐYƐ',
    pdfSummary: 'PDF mu tiawa',
    scope: 'Wo nnuro adetɔnbea na ɛkora nnuro a wɔde ama ho nsɛm. Bisa wɔn kɔpi.',
    request: 'Bisa me fael',
    turnaround: 'Taa yɛ krado nnɔnhwerew 24 mu · yɛde kɔ {email}',
  },
  gaa: {
    title: 'Gbala o sanei',
    heading: 'Na nɔ fɛɛ nɔ kɔpi',
    intro: 'Wɔbuaa fɛɛ naa yɛ fael kome mli ni wɔkɛ link ni he yɔɔ shweshwe maa o email nɔ. Egbeɔ yɛ gbii 7 sɛɛ.',
    include: 'NƆ NI ESA AKƐFATA HE',
    profileTitle: 'O he saji kɛ address',
    profileMeta: 'Gbɛi, gbɛi ni atsɛɔ bo, address ni otoko',
    ordersTitle: 'Nɔ ni ohe he saji',
    ordersMeta: 'Nɔ fɛɛ nɔ ni ohe, nɔ fɛɛ nɔ kɛ nyɔmɔwoo wolo · JSON + CSV',
    scriptsTitle: 'Tsofa wolo mfonirii',
    scriptsMeta: 'Fael ni okɛya lɛ diŋŋ · efataa ~40 MB he',
    wellnessTitle: 'Hewalɛ nitsumɔi',
    wellnessMeta: 'Gbɛjianɔtoi, nitsumɔi kɛ nu nɔmɔ he saji',
    supportTitle: 'Yelikɛbuamɔ sanegbaai',
    supportMeta: 'Sanegbaai kɛ Altruist kɛ o tsofa shĩai',
    format: 'BƆ NI EBAAFEE',
    pdfSummary: 'PDF kuku',
    scope: 'O tsofa shĩa hiɛɔ tsofai ni akɛha lɛ he saji. Bi amɛ kɔpi.',
    request: 'Bi mi fael lɛ',
    turnaround: 'Etaa ekpeɔ yɛ ŋmɛlɛtswai 24 mli · wɔkɛyaa {email}',
  },
  ee: {
    title: 'Xɔ wò nyatakakawo',
    heading: 'Xɔ nuwo katã ƒe kɔpi',
    intro: 'Míeƒoa wo nu ƒu ɖe fael ɖeka me eye míeɖoa link si ŋu dedienɔnɔ le ɖe wò email. Ewua enu le ŋkeke 7 megbe.',
    include: 'NU SIWO NAƉO EME',
    profileTitle: 'Wò nyatakakawo kple adrɛswo',
    profileMeta: 'Ŋkɔ, kadodo ŋuti nyatakakawo, adrɛs siwo nèdzra ɖo',
    ordersTitle: 'Nudodowo ƒe ŋutinya',
    ordersMeta: 'Nudodo ɖesiaɖe, nu ɖesiaɖe kple fexexe ŋuɖoɖo ɖesiaɖe · JSON + CSV',
    scriptsTitle: 'Atikeŋɔŋlɔ ƒe fotowo',
    scriptsMeta: 'Fael gbãtɔ siwo nèɖo ɖa · etsɔa ~40 MB kpena ɖe eŋu',
    wellnessTitle: 'Lãmesẽ dɔwɔwɔwo',
    wellnessMeta: 'Ɖoɖowo, dɔwɔɣiwo kple tsinono ŋuti nuŋlɔɖiwo',
    supportTitle: 'Kpekpeɖeŋu ƒe dzeɖoɖowo',
    supportMeta: 'Nya siwo wò kple Altruist kpakple wò atikedzraƒewo ɖo',
    format: 'ALE SI WÒANƆ',
    pdfSummary: 'PDF ƒe kpuie',
    scope: 'Wò atikedzraƒe lé atike siwo wona ƒe nuŋlɔɖiwo ɖe asi. Bia kɔpi tso wo gbɔ.',
    request: 'Bia nye fael',
    turnaround: 'Enɔa klalo zi geɖe le gaƒoƒo 24 me · míeɖonɛ ɖe {email}',
  },
  ha: {
    title: 'Sauke bayananka',
    heading: 'Samu kwafin komai',
    intro: 'Muna haɗa fayil guda ɗaya kuma mu aiko maka hanyar saukewa mai tsaro ta imel. Tana ƙarewa bayan kwana 7.',
    include: 'ABIN DA ZA A HAƊA',
    profileTitle: 'Bayanai da adireshi',
    profileMeta: 'Suna, bayanan tuntuɓa, adireshin da aka ajiye',
    ordersTitle: 'Tarihin oda',
    ordersMeta: 'Kowace oda, kaya da rasit · JSON + CSV',
    scriptsTitle: 'Hotunan takardun magani',
    scriptsMeta: 'Ainihin fayilolin da ka ɗora · yana ƙara ~40 MB',
    wellnessTitle: 'Ayyukan lafiya',
    wellnessMeta: 'Shirye-shirye, zama da bayanan shan ruwa',
    supportTitle: 'Tattaunawar tallafi',
    supportMeta: 'Saƙonni da Altruist da kantunan maganinka',
    format: 'TSARI',
    pdfSummary: 'Taƙaitaccen PDF',
    scope: 'Kantin maganinka ne ke riƙe da rikodin bayar da magani. Ka roƙe su kwafi.',
    request: 'Nemi fayil ɗina',
    turnaround: 'Yawanci yana shiri cikin awa 24 · za a aika zuwa {email}',
  },
});

type Key = keyof typeof S.en;

// Parts and formats come from lib/forms in English; only their labels translate.
const PART_KEYS: Record<string, [Key, Key]> = {
  profile: ['profileTitle', 'profileMeta'],
  orders: ['ordersTitle', 'ordersMeta'],
  scripts: ['scriptsTitle', 'scriptsMeta'],
  wellness: ['wellnessTitle', 'wellnessMeta'],
  support: ['supportTitle', 'supportMeta'],
};
const FORMAT_KEYS: Record<string, Key> = { 'PDF summary': 'pdfSummary' };

export default function DownloadData() {
  const tr = useT(S);
  const profile = useProfile();
  const t = useTokens();
  const { d } = useDesignScale();
  const [selected, setSelected] = useState<Record<string, boolean>>(
    Object.fromEntries(PARTS.map((p) => [p.id, p.on])),
  );
  const [format, setFormat] = useState(FORMATS[0]);

  const anySelected = Object.values(selected).some(Boolean);

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      <FormScreen gap={16}>
        <TitleAppBar title={tr('title')} />

        <View style={{ gap: d(12) }}>
          <FeatureIcon size={72} tone="subtle">
            <Icon name="upload" size={d(30)} tone="brand" />
          </FeatureIcon>
          <Text variant="displayS" style={{ fontSize: d(28), lineHeight: d(32) }}>
            {tr('heading')}
          </Text>
          <Text variant="bodyL" tone="secondary" style={{ fontSize: d(16), lineHeight: d(24) }}>
            {tr('intro')}
          </Text>
        </View>

        <SettingsGroup label={tr('include')}>
          {PARTS.map((p) => {
            const keys = PART_KEYS[p.id];
            const title = keys ? tr(keys[0]) : p.title;
            const meta = keys ? tr(keys[1]) : p.meta;
            return (
              <Pressable
                key={p.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: !!selected[p.id] }}
                accessibilityLabel={`${title}. ${meta}`}
                onPress={() => setSelected((s) => ({ ...s, [p.id]: !s[p.id] }))}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: d(12),
                  paddingVertical: d(12),
                  paddingHorizontal: d(14),
                  borderRadius: d(16),
                  backgroundColor: t.colors.bg.surfaceRaised,
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Checkbox checked={!!selected[p.id]} />
                <View style={{ flex: 1, gap: d(3) }}>
                  <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
                    {title}
                  </Text>
                  <Text
                    variant="caption"
                    tone="tertiary"
                    style={{ fontSize: d(12), lineHeight: d(16) }}
                  >
                    {meta}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </SettingsGroup>

        <SettingsGroup label={tr('format')}>
          <View style={{ flexDirection: 'row', gap: d(10) }}>
            {FORMATS.map((f) => {
              const on = format === f;
              const label = FORMAT_KEYS[f] ? tr(FORMAT_KEYS[f]) : f;
              return (
                <Pressable
                  key={f}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={label}
                  onPress={() => setFormat(f)}
                  style={({ pressed }) => ({
                    flex: 1,
                    height: d(44),
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: t.radius.full,
                    backgroundColor: on ? t.colors.bg.brand : t.colors.bg.surfaceRaised,
                    opacity: pressed ? 0.9 : 1,
                  })}
                >
                  <Text
                    variant="labelM"
                    color={on ? t.colors.text.onBrand : t.colors.text.secondary}
                    style={{ fontSize: d(14), lineHeight: d(18) }}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </SettingsGroup>

        <View
          style={{
            flexDirection: 'row',
            gap: d(12),
            paddingVertical: d(14),
            paddingHorizontal: d(16),
            borderRadius: d(20),
            backgroundColor: t.colors.bg.surfaceRaised,
          }}
        >
          <Icon name="info" size={d(18)} tone="tertiary" />
          <Text
            variant="caption"
            tone="tertiary"
            style={{ flex: 1, fontSize: d(12), lineHeight: d(16) }}
          >
            {tr('scope')}
          </Text>
        </View>
      </FormScreen>

      <StickyFooter>
        <Button
          label={tr('request')}
          size="large"
          disabled={!anySelected}
          onPress={() => router.back()}
        />
        <Text variant="caption" tone="tertiary" center style={{ fontSize: d(12), lineHeight: d(16) }}>
          {tr('turnaround', { email: profile.email })}
        </Text>
      </StickyFooter>
    </View>
  );
}
