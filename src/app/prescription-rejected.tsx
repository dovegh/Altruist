/**
 * Rejected — Prescription — ported 1:1 from Figma node on page "System States".
 *
 * V gap20, pad 130/24/40/24. A 152/108 coral halo, the head, then the
 * pharmacist's note in a card with a coral hairline, and the two actions.
 *
 * The note is quoted verbatim and attributed to a named, licensed pharmacist
 * with a timestamp. A rejection the user cannot act on is worse than no
 * rejection at all — the reason is what turns this screen into a next step.
 */
import React from 'react';
import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { StatusScreen } from '@/components/ui/StatusScreen';
import { StatusPill } from '@/components/ui/PrescriptionCard';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { usePrescriptionStore } from '@/features/prescriptions/store';
import { defineStrings, useLocale, useT } from '@/i18n';

// The pharmacist's note is quoted as written and never goes through `tr`.
const S = defineStrings({
  en: {
    fallbackPharmacy: 'the partner pharmacy',
    title: 'Prescription not accepted',
    body: 'The pharmacist at {pharmacy} could not verify this document.',
    reupload: 'Re-upload prescription',
    contact: 'Contact the pharmacy',
    note: 'PHARMACIST NOTE',
  },
  fr: {
    fallbackPharmacy: 'la pharmacie partenaire',
    title: 'Ordonnance non acceptée',
    body: "Le pharmacien de {pharmacy} n'a pas pu vérifier ce document.",
    reupload: "Renvoyer l'ordonnance",
    contact: 'Contacter la pharmacie',
    note: 'NOTE DU PHARMACIEN',
  },
  tw: {
    fallbackPharmacy: 'nnuro adetɔnbea hokafoɔ no',
    title: 'Wɔannye nnuro krataa no',
    body: 'Oduruyɛfoɔ a ɔwɔ {pharmacy} antumi ansi krataa yi pi.',
    reupload: 'San fa nnuro krataa to so',
    contact: 'Frɛ nnuro adetɔnbea no',
    note: 'ODURUYƐFOƆ NSƐM',
  },
  gaa: {
    fallbackPharmacy: 'tsofa shĩa hefatalɔ lɛ',
    title: 'Akpɛɛɛ tsofa wolo lɛ nɔ',
    body: 'Tsofatsɛ ni yɔɔ {pharmacy} nyɛɛɛ akpɛ wolo nɛɛ nɔ.',
    reupload: 'Kɛ tsofa wolo lɛ ya ekoŋŋ',
    contact: 'Tsɛ tsofa shĩa lɛ',
    note: 'TSOFATSƐ WIEMƆ',
  },
  ee: {
    fallbackPharmacy: 'atikedzraƒe hati la',
    title: 'Womexɔ atikeŋɔŋlɔ la o',
    body: 'Atikedzrala si le {pharmacy} mete ŋu kpɔ nuŋlɔɖi sia ƒe nyateƒenyenye o.',
    reupload: 'Gaɖo atikeŋɔŋlɔ la ɖa',
    contact: 'Ƒo ka na atikedzraƒe la',
    note: 'ATIKEDZRALA ƑE NYA',
  },
  ha: {
    fallbackPharmacy: 'kantin magani abokin hulɗa',
    title: 'Ba a karɓi takardar magani ba',
    body: 'Likitan magunguna a {pharmacy} bai iya tabbatar da wannan takarda ba.',
    reupload: 'Sake ɗora takardar magani',
    contact: 'Tuntuɓi kantin magani',
    note: 'BAYANIN LIKITAN MAGUNGUNA',
  },
});

export default function PrescriptionRejected() {
  const tr = useT(S);
  const locale = useLocale();
  const t = useTokens();
  const { d } = useDesignScale();
  const { id } = useLocalSearchParams<{ id?: string }>();

  // A real rejection or nothing. This screen used to fall back to a written-in
  // note signed by the partner's superintendent when it had no script — and a
  // failed upload landed here, so people saw a review that never happened.
  const script = usePrescriptionStore((s) =>
    id ? s.items.find((p) => p.id === id) : s.items.find((p) => p.status === 'REJECTED'),
  );
  const pharmacy = script?.pharmacy ?? tr('fallbackPharmacy');
  const reviewed = script?.reviewedAt
    ? new Date(script.reviewedAt).toLocaleString(locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : '';

  if (!script || script.status !== 'REJECTED') return <Redirect href="/prescriptions" />;

  return (
    <StatusScreen
      icon="close"
      tone="danger"
      outer={152}
      inner={108}
      glyph={48}
      gap={20}
      paddingTop={130}
      title={tr('title')}
      body={tr('body', { pharmacy })}
      actions={
        <>
          <Button
            label={tr('reupload')}
            size="large"
            iconLeading="camera"
            onPress={() =>
              router.replace({
                pathname: '/prescription-upload',
                params: { for: script.productIds.join(',') },
              })
            }
          />
          <Button
            label={tr('contact')}
            variant="tertiary"
            size="large"
            onPress={() => router.push('/support-conversation')}
          />
        </>
      }
    >
      <View
        style={{
          gap: d(8),
          paddingVertical: d(16),
          paddingHorizontal: d(18),
          borderRadius: d(20),
          backgroundColor: t.colors.bg.surface,
          borderWidth: 1,
          borderColor: t.colors.border.danger,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(8) }}>
          <Text
            variant="labelXS"
            tone="tertiary"
            style={{ flex: 1, fontSize: d(11), lineHeight: d(14) }}
          >
            {tr('note')}
          </Text>
          <StatusPill status="REJECTED" />
        </View>
        <Text variant="bodyM" style={{ fontSize: d(14), lineHeight: d(21) }}>
          {/* Quoted verbatim. A rejection the user cannot act on is worse than
              no rejection at all, and the reason is the only actionable part. */}
          “{script.note}”
        </Text>
        <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
          {script.reviewedBy ?? pharmacy}
          {reviewed ? ` · ${reviewed}` : ''}
        </Text>
      </View>
    </StatusScreen>
  );
}
