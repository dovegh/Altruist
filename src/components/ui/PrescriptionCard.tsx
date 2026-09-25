/**
 * Prescription Card + Status Pill — Figma nodes 33:119 and 27:28.
 *
 * Status Pill doc: "Colour encodes the lifecycle CATEGORY, not the individual
 * step: grey=queued, gold=awaiting review, blue=in motion, mint=complete,
 * coral=failed. Never rely on colour alone — the label always carries the
 * meaning."
 *
 * Prescription Card doc: "Maps 1:1 to prescriptions.status. Rejected
 * additionally carries a border/danger outline and puts pharmacist_notes in the
 * Note slot — the reason for rejection must always be visible without tapping
 * through."
 */
import React from 'react';
import { View, Pressable } from 'react-native';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { Text } from './Text';
import { Icon } from './Icon';
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    PENDING: 'PENDING',
    VERIFYING: 'VERIFYING',
    VERIFIED: 'VERIFIED',
    REJECTED: 'REJECTED',
    RECEIVED: 'RECEIVED',
    PACKING: 'PACKING',
    DISPATCHED: 'DISPATCHED',
    DELIVERED: 'DELIVERED',
    CANCELLED: 'CANCELLED',
    statusA11y: 'Status: {status}',
  },
  fr: {
    PENDING: 'EN ATTENTE',
    VERIFYING: 'EN VÉRIFICATION',
    VERIFIED: 'VÉRIFIÉE',
    REJECTED: 'REFUSÉE',
    RECEIVED: 'REÇUE',
    PACKING: 'EN PRÉPARATION',
    DISPATCHED: 'EXPÉDIÉE',
    DELIVERED: 'LIVRÉE',
    CANCELLED: 'ANNULÉE',
    statusA11y: 'Statut : {status}',
  },
  tw: {
    PENDING: 'ƐRETWƐN',
    VERIFYING: 'YƐREHWƐ MU',
    VERIFIED: 'WƆAHWƐ MU',
    REJECTED: 'WƆAPO',
    RECEIVED: 'YƐANYA',
    PACKING: 'YƐREBOA ANO',
    DISPATCHED: 'ƐWƆ KWAN SO',
    DELIVERED: 'WƆADE ABA',
    CANCELLED: 'WƆATWA MU',
    statusA11y: 'Tebea: {status}',
  },
  gaa: {
    PENDING: 'EEMƐ',
    VERIFYING: 'AMƐKWƐ MLI',
    VERIFIED: 'AKWƐ MLI',
    REJECTED: 'AKPOO',
    RECEIVED: 'NINE ESHƐ',
    PACKING: 'AMƐBUA NAA',
    DISPATCHED: 'EJE KPO',
    DELIVERED: 'ESHƐ',
    CANCELLED: 'AFITE',
    statusA11y: 'Shihilɛ: {status}',
  },
  ee: {
    PENDING: 'LALAM',
    VERIFYING: 'WOLE EKPƆM',
    VERIFIED: 'WOKPƆE',
    REJECTED: 'WOGBE',
    RECEIVED: 'EXƆE',
    PACKING: 'WOLE EBLAM',
    DISPATCHED: 'EDZO',
    DELIVERED: 'EVA',
    CANCELLED: 'WOTSƆE ƉA ƉI',
    statusA11y: 'Nɔnɔme: {status}',
  },
  ha: {
    PENDING: 'ANA JIRA',
    VERIFYING: 'ANA TANTANCEWA',
    VERIFIED: 'AN TABBATAR',
    REJECTED: 'AN ƘI',
    RECEIVED: 'AN KARƁA',
    PACKING: 'ANA SHIRYAWA',
    DISPATCHED: 'AN TURA',
    DELIVERED: 'AN KAWO',
    CANCELLED: 'AN SOKE',
    statusA11y: 'Matsayi: {status}',
  },
});

export type LifecycleStatus =
  | 'PENDING'
  | 'VERIFYING'
  | 'VERIFIED'
  | 'REJECTED'
  | 'RECEIVED'
  | 'PACKING'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'CANCELLED';

export function StatusPill({ status }: { status: LifecycleStatus }) {
  const t = useTokens();
  const { d } = useDesignScale();
  const tr = useT(S);

  // category, not step: queued / awaiting / in-motion / complete / failed
  const MAP: Record<LifecycleStatus, { label: string; bg: string; fg: string }> = {
    PENDING: { label: tr('PENDING'), bg: t.colors.bg.warningSubtle, fg: t.colors.text.warning },
    VERIFYING: { label: tr('VERIFYING'), bg: t.colors.bg.infoSubtle, fg: t.colors.text.info },
    VERIFIED: { label: tr('VERIFIED'), bg: t.colors.bg.successSubtle, fg: t.colors.text.success },
    REJECTED: { label: tr('REJECTED'), bg: t.colors.bg.dangerSubtle, fg: t.colors.text.danger },
    RECEIVED: { label: tr('RECEIVED'), bg: t.colors.bg.surfaceRaised, fg: t.colors.text.secondary },
    PACKING: { label: tr('PACKING'), bg: t.colors.bg.infoSubtle, fg: t.colors.text.info },
    DISPATCHED: { label: tr('DISPATCHED'), bg: t.colors.bg.infoSubtle, fg: t.colors.text.info },
    DELIVERED: { label: tr('DELIVERED'), bg: t.colors.bg.successSubtle, fg: t.colors.text.success },
    CANCELLED: { label: tr('CANCELLED'), bg: t.colors.bg.dangerSubtle, fg: t.colors.text.danger },
  };
  const s = MAP[status];

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={tr('statusA11y', { status: s.label.toLowerCase() })}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: d(7),
        paddingLeft: d(10),
        paddingRight: d(12),
        paddingVertical: d(6),
        borderRadius: t.radius.full,
        backgroundColor: s.bg,
        alignSelf: 'flex-start',
      }}
    >
      <View style={{ width: d(8), height: d(8), borderRadius: t.radius.full, backgroundColor: s.fg }} />
      <Text variant="labelXS" color={s.fg} style={{ fontSize: d(11), lineHeight: d(14) }}>
        {s.label}
      </Text>
    </View>
  );
}

export function PrescriptionCard({
  title,
  note,
  timestamp,
  status,
  onPress,
}: {
  title: string;
  note: string;
  timestamp: string;
  status: LifecycleStatus;
  onPress?: () => void;
}) {
  const t = useTokens();
  const { d } = useDesignScale();
  const rejected = status === 'REJECTED';

  const body = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: d(14),
        backgroundColor: t.colors.bg.surface,
        borderWidth: 1,
        // A rejected script is outlined so the failure is visible in a list scan.
        borderColor: rejected ? t.colors.border.danger : t.colors.border.subtle,
        borderRadius: d(20),
        paddingLeft: d(14),
        paddingRight: d(16),
        paddingVertical: d(14),
      }}
    >
      <View
        style={{
          width: d(60),
          height: d(60),
          borderRadius: d(14),
          backgroundColor: t.colors.bg.surfaceRaised,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="prescription" size={d(24)} tone="primary" />
      </View>
      <View style={{ flex: 1, gap: d(6) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(8) }}>
          <Text variant="labelM" style={{ flex: 1, fontSize: d(14), lineHeight: d(18) }}>
            {title}
          </Text>
          <StatusPill status={status} />
        </View>
        {/* Rejection reason is never hidden behind a tap. */}
        <Text
          variant="bodyS"
          tone={rejected ? 'danger' : 'secondary'}
          style={{ fontSize: d(13), lineHeight: d(19) }}
        >
          {note}
        </Text>
        <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
          {timestamp}
        </Text>
      </View>
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${note}`}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
    >
      {body}
    </Pressable>
  );
}

export default PrescriptionCard;
