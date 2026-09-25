/**
 * Prescriptions — ported 1:1 from Figma node 40:2 (SRS §4.B Tab 3).
 *
 * Hero tone here is Cream, not Brand: Home already owns the mint hero, and the
 * component doc allows one loud card per screen.
 *
 * The empty state is Figma's "Empty — Prescriptions": the same tab root with a
 * neutral 148pt circle and two ways in. It replaces the hero and history rather
 * than sitting beside them, because a first-time user should see one obvious
 * next step, not an empty list under a call to action.
 *
 * The list is reverse-chronological and comes from the prescription store, so an
 * upload appears here the moment the gateway accepts it, and flips to VERIFIED
 * under the user without a refresh.
 *
 * Swipe a card left to archive or remove it. Both only change this person's
 * list (0017): the prescription is a record the pharmacy keeps, and a verified
 * one still covers its medicines at checkout wherever it is filed.
 */
import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { TitleAppBar, SectionHeader } from '@/components/ui/AppBar';
import { HeroActionCard } from '@/components/ui/HeroActionCard';
import { PrescriptionCard } from '@/components/ui/PrescriptionCard';
import { StatusHalo } from '@/components/ui/StatusScreen';
import { Button } from '@/components/ui/Button';
import { Stagger } from '@/components/ui/Motion';
import { Shimmer, SkeletonBlock } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { SwipeRow } from '@/components/ui/SwipeRow';
import { showDialog } from '@/components/ui/Dialog';
import { describeFailure } from '@/components/ui/FormMessage';
import {
  setListState,
  usePrescriptionStore,
  type Prescription,
} from '@/features/prescriptions/store';
import { defineStrings, translate, useLocale, useT } from '@/i18n';

const S = defineStrings({
  en: {
    title: 'Prescriptions',
    moreOptions: 'More options',
    stampVerified: 'Verified {date} · {time}',
    stampReviewed: 'Reviewed {date} · {time}',
    stampUploaded: 'Uploaded {date} · {time}',
    saveFailed: 'That did not save',
    ok: 'OK',
    removeTitle: 'Remove from your list?',
    removeMessage: 'TrxID {id} will no longer show here. The pharmacy keeps its record.',
    remove: 'Remove',
    cancel: 'Cancel',
    archive: 'Archive',
    unarchive: 'Unarchive',
    delete: 'Delete',
    emptyTitle: 'No prescriptions yet',
    emptyBody:
      'Upload a photo of a prescription and a licensed partner pharmacist will review it — usually within the hour.',
    upload: 'Upload a prescription',
    howItWorks: 'How it works',
    eyebrow: 'FASTEST WAY TO ORDER',
    heroBody: 'Snap it, send it. A licensed partner pharmacist reviews and fulfils it for you.',
    uploadNow: 'Upload now',
    history: 'History',
    allArchived: 'Everything is archived.',
    archived: 'Archived ({count})',
    hide: 'Hide',
    show: 'Show',
  },
  fr: {
    title: 'Ordonnances',
    moreOptions: "Plus d'options",
    stampVerified: 'Vérifiée le {date} · {time}',
    stampReviewed: 'Examinée le {date} · {time}',
    stampUploaded: 'Envoyée le {date} · {time}',
    saveFailed: "L'enregistrement a échoué",
    ok: 'OK',
    removeTitle: 'Retirer de votre liste ?',
    removeMessage:
      "L'ordonnance TrxID {id} n'apparaîtra plus ici. La pharmacie conserve son dossier.",
    remove: 'Retirer',
    cancel: 'Annuler',
    archive: 'Archiver',
    unarchive: 'Désarchiver',
    delete: 'Supprimer',
    emptyTitle: 'Aucune ordonnance pour le moment',
    emptyBody:
      "Envoyez la photo d'une ordonnance et un pharmacien partenaire agréé la vérifiera, généralement en moins d'une heure.",
    upload: 'Envoyer une ordonnance',
    howItWorks: 'Comment ça marche',
    eyebrow: 'LE PLUS RAPIDE POUR COMMANDER',
    heroBody:
      'Prenez-la en photo, envoyez-la. Un pharmacien partenaire agréé la vérifie et la prépare pour vous.',
    uploadNow: 'Envoyer',
    history: 'Historique',
    allArchived: 'Tout est archivé.',
    archived: 'Archivées ({count})',
    hide: 'Masquer',
    show: 'Afficher',
  },
  tw: {
    title: 'Nnuro krataa',
    moreOptions: 'Nneɛma foforɔ',
    stampVerified: 'Wɔagye atom {date} · {time}',
    stampReviewed: 'Wɔahwɛ mu {date} · {time}',
    stampUploaded: 'Wɔde too so {date} · {time}',
    saveFailed: 'Ɛankora so',
    ok: 'Yoo',
    removeTitle: 'Yi fi wo nhyehyɛeɛ mu?',
    removeMessage: 'TrxID {id} renna ha bio. Nnuro dwumadibea no bɛkora ne nsɛm.',
    remove: 'Yi fi hɔ',
    cancel: 'Gyae',
    archive: 'Kora',
    unarchive: 'San fa bra',
    delete: 'Popa',
    emptyTitle: 'Nnuro krataa biara nni hɔ',
    emptyBody:
      'Fa nnuro krataa mfonini to so na nnuro ho ɔbenfoɔ a ɔwɔ tumi bɛhwɛ mu — mpɛn pii dɔnhwereɛ baako mu.',
    upload: 'Fa nnuro krataa to so',
    howItWorks: 'Sɛnea ɛyɛ adwuma',
    eyebrow: 'ƐKWAN A ƐYƐ NTƐM PAA',
    heroBody:
      'Twa ne mfonini, fa kɔ. Nnuro ho ɔbenfoɔ a ɔwɔ tumi bɛhwɛ so na wasiesie ama wo.',
    uploadNow: 'Fa to so seesei',
    history: 'Abakɔsɛm',
    allArchived: 'Wɔakora ne nyinaa.',
    archived: 'Deɛ wɔakora ({count})',
    hide: 'Fa sie',
    show: 'Kyerɛ',
  },
  gaa: {
    title: 'Tsofa woloi',
    moreOptions: 'Nibii krokomɛi',
    stampVerified: 'Aye lɛ odase {date} · {time}',
    stampReviewed: 'Akwɛ lɛ {date} · {time}',
    stampUploaded: 'Akɛwo mli {date} · {time}',
    saveFailed: 'Atoooo nakai',
    ok: 'Hɛɛ',
    removeTitle: 'Ojie kɛjɛ o wolo lɛ mli?',
    removeMessage: 'TrxID {id} jeŋ jɛmɛ dɔŋŋ. Tsofa shĩa lɛ baato ehe saji.',
    remove: 'Jiemɔ',
    cancel: 'Kpa',
    archive: 'To lɛ',
    unarchive: 'Kɛ lɛ ku sɛɛ',
    delete: 'Hiɛ lɛ',
    emptyTitle: 'Tsofa wolo ko bɛ',
    emptyBody:
      'Kɛ tsofa wolo mfoniri wo mli ni tsofatsɛ ni ahe lɛ gbɛ baakwɛ — bei pii lɛ ŋmɛlɛtswaa kome mli.',
    upload: 'Kɛ tsofa wolo wo mli',
    howItWorks: 'Bɔ ni etsuɔ nii',
    eyebrow: 'GBƐ NI YAA OYA FE FƐƐ',
    heroBody: 'Fɔ mfoniri, ni okɛmaje. Tsofatsɛ ni ahe lɛ gbɛ baakwɛ nɔ ni esaa ha bo.',
    uploadNow: 'Kɛwo mli bianɛ',
    history: 'Blema saji',
    allArchived: 'Ato fɛɛ.',
    archived: 'Ni ato ({count})',
    hide: 'Tee',
    show: 'Tsɔɔ',
  },
  ee: {
    title: 'Atikeŋɔŋlɔwo',
    moreOptions: 'Nu bubuwo',
    stampVerified: 'Woɖo kpe edzi {date} · {time}',
    stampReviewed: 'Wodzro eme {date} · {time}',
    stampUploaded: 'Woɖoe ɖa {date} · {time}',
    saveFailed: 'Mexɔ o',
    ok: 'Ɛ̃',
    removeTitle: 'Àɖee ɖa le wò xexlẽ me?',
    removeMessage: 'TrxID {id} madze le afii o. Atikedzraƒe la adzra eƒe nuŋlɔɖi ɖo.',
    remove: 'Ɖee ɖa',
    cancel: 'Dzudzɔ',
    archive: 'Dzrae ɖo',
    unarchive: 'Ɖee go',
    delete: 'Tutui',
    emptyTitle: 'Atikeŋɔŋlɔ aɖeke meli haɖe o',
    emptyBody:
      'Ɖo atikeŋɔŋlɔ ƒe foto ɖa eye atikewɔla si woɖo kpe edzi alé ŋku ɖe eŋu — zi geɖe le gaƒoƒo ɖeka me.',
    upload: 'Ɖo atikeŋɔŋlɔ ɖa',
    howItWorks: 'Ale si wòwɔa dɔe',
    eyebrow: 'MƆ SI LE KABA WU',
    heroBody:
      'Ɖe foto, ɖoe ɖa. Atikewɔla si woɖo kpe edzi alé ŋku ɖe eŋu eye wòawɔe na wò.',
    uploadNow: 'Ɖoe ɖa fifia',
    history: 'Ŋutinya',
    allArchived: 'Wodzra wo katã ɖo.',
    archived: 'Esiwo wodzra ɖo ({count})',
    hide: 'Ɣlae',
    show: 'Ɖee fia',
  },
  ha: {
    title: 'Takardun magani',
    moreOptions: 'Ƙarin zaɓuɓɓuka',
    stampVerified: 'An tabbatar {date} · {time}',
    stampReviewed: 'An duba {date} · {time}',
    stampUploaded: 'An ɗora {date} · {time}',
    saveFailed: 'Ba a ajiye ba',
    ok: 'To',
    removeTitle: 'Cire daga jerinka?',
    removeMessage:
      'TrxID {id} ba zai ƙara bayyana a nan ba. Kantin magani yana riƙe da bayanansa.',
    remove: 'Cire',
    cancel: 'Soke',
    archive: 'Adana',
    unarchive: 'Fitar da shi',
    delete: 'Goge',
    emptyTitle: 'Babu takardar magani tukuna',
    emptyBody:
      'Ɗora hoton takardar magani kuma mai harhaɗa magani abokin hulɗa mai lasisi zai duba ta — yawanci cikin awa ɗaya.',
    upload: 'Ɗora takardar magani',
    howItWorks: 'Yadda yake aiki',
    eyebrow: 'HANYA MAFI SAURI TA YIN ODA',
    heroBody:
      'Ɗauki hotonta, ka aika. Mai harhaɗa magani abokin hulɗa mai lasisi zai duba ya shirya maka.',
    uploadNow: 'Ɗora yanzu',
    history: 'Tarihi',
    allArchived: 'An adana komai.',
    archived: 'Adanannu ({count})',
    hide: 'Ɓoye',
    show: 'Nuna',
  },
});

/** "Verified 23 Aug 2026 · 05:41 PM" — the card's third line. */
function stamp(p: Prescription, locale: string): string {
  const key =
    p.status === 'VERIFIED'
      ? 'stampVerified'
      : p.status === 'REJECTED'
        ? 'stampReviewed'
        : 'stampUploaded';
  const at = new Date(p.reviewedAt ?? p.uploadedAt);
  const date = at.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  const time = at
    .toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: true })
    .toUpperCase();
  return translate(S, key, { date, time });
}

function saveListState(p: Prescription, change: { archived: boolean; hidden: boolean }) {
  setListState(p.id, change).catch((e) =>
    showDialog({
      icon: 'danger',
      tone: 'danger',
      title: translate(S, 'saveFailed'),
      message: describeFailure(e),
      actions: [{ label: translate(S, 'ok') }],
    }),
  );
}

function confirmRemove(p: Prescription) {
  showDialog({
    icon: 'trash',
    tone: 'danger',
    title: translate(S, 'removeTitle'),
    message: translate(S, 'removeMessage', { id: p.id }),
    actions: [
      {
        label: translate(S, 'remove'),
        variant: 'danger',
        onPress: () => saveListState(p, { archived: Boolean(p.archived), hidden: true }),
      },
      { label: translate(S, 'cancel'), variant: 'tertiary' },
    ],
  });
}

function HistoryCard({ p }: { p: Prescription }) {
  const tr = useT(S);
  const locale = useLocale();
  return (
    <SwipeRow
      actions={[
        p.archived
          ? {
              key: 'unarchive',
              label: tr('unarchive'),
              icon: 'archive',
              tone: 'neutral',
              onPress: () => saveListState(p, { archived: false, hidden: false }),
            }
          : {
              key: 'archive',
              label: tr('archive'),
              icon: 'archive',
              tone: 'neutral',
              onPress: () => saveListState(p, { archived: true, hidden: false }),
            },
        { key: 'remove', label: tr('delete'), icon: 'trash', tone: 'danger', onPress: () => confirmRemove(p) },
      ]}
    >
      <PrescriptionCard
        title={`TrxID ${p.id}`}
        note={p.note}
        timestamp={stamp(p, locale)}
        status={p.status}
        // A rejection opens the pharmacist's reason, not the image —
        // the reason is the only thing that lets the user act.
        onPress={() =>
          router.push(
            p.status === 'REJECTED'
              ? `/prescription-rejected?id=${p.id}`
              : `/prescription-viewer?id=${p.id}`,
          )
        }
      />
    </SwipeRow>
  );
}

export default function Prescriptions() {
  const t = useTokens();
  const tr = useT(S);
  const { d } = useDesignScale();
  const insets = useSafeAreaInsets();

  const items = usePrescriptionStore((s) => s.items);
  const hydrated = usePrescriptionStore((s) => s.hydrated);
  const [showArchived, setShowArchived] = useState(false);

  const visible = items.filter((p) => !p.hidden);
  const history = visible.filter((p) => !p.archived);
  const archived = visible.filter((p) => p.archived);
  const isEmpty = visible.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + d(18),
          paddingHorizontal: d(24),
          paddingBottom: d(120) + insets.bottom,
          gap: d(20),
        }}
      >
        <TitleAppBar
          title={tr('title')}
          showBack={false}
          actions={[{ icon: 'more', label: tr('moreOptions') }]}
        />

        {!hydrated ? (
          <Shimmer style={{ gap: d(20) }}>
            <SkeletonBlock width="100%" height={210} radius={36} />
            <SkeletonBlock width={120} height={26} radius={10} />
            {[0, 1, 2].map((i) => (
              <SkeletonBlock key={i} width="100%" height={92} radius={20} />
            ))}
          </Shimmer>
        ) : isEmpty ? (
          <View style={{ gap: d(22), paddingTop: d(116) }}>
            <StatusHalo icon="prescription" tone="neutral" outer={148} glyph={56} />

            <View style={{ gap: d(10) }}>
              <Text variant="headingXL" center style={{ fontSize: d(24), lineHeight: d(30) }}>
                {tr('emptyTitle')}
              </Text>
              <Text variant="bodyM" tone="secondary" center style={{ fontSize: d(14), lineHeight: d(21) }}>
                {tr('emptyBody')}
              </Text>
            </View>

            <Button
              label={tr('upload')}
              size="large"
              onPress={() => router.push('/prescription-upload')}
            />
            <Button
              label={tr('howItWorks')}
              variant="tertiary"
              size="large"
              // The handling explainer already exists under Legal; this is the
              // same document, reached from where the question is asked.
              onPress={() => router.push('/legal')}
            />
          </View>
        ) : (
          <>
            <HeroActionCard
              tone="accentCream"
              eyebrow={tr('eyebrow')}
              title={tr('upload')}
              body={tr('heroBody')}
              cta={tr('uploadNow')}
              ctaIcon="prescription"
              icon="camera"
              onPress={() => router.push('/prescription-upload')}
            />

            <SectionHeader title={tr('history')} />

            {history.length ? (
              <Stagger step={55}>
                {history.map((p) => (
                  <HistoryCard key={p.id} p={p} />
                ))}
              </Stagger>
            ) : (
              <Text variant="bodyS" tone="secondary" style={{ fontSize: d(13), lineHeight: d(19) }}>
                {tr('allArchived')}
              </Text>
            )}

            {archived.length ? (
              <>
                <SectionHeader
                  title={tr('archived', { count: archived.length })}
                  action={showArchived ? tr('hide') : tr('show')}
                  onAction={() => setShowArchived((v) => !v)}
                />
                {showArchived
                  ? archived.map((p) => <HistoryCard key={p.id} p={p} />)
                  : null}
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}
