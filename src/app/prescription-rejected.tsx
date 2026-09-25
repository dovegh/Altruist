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

export default function PrescriptionRejected() {
  const t = useTokens();
  const { d } = useDesignScale();
  const { id } = useLocalSearchParams<{ id?: string }>();

  // A real rejection or nothing. This screen used to fall back to a written-in
  // note signed by the partner's superintendent when it had no script — and a
  // failed upload landed here, so people saw a review that never happened.
  const script = usePrescriptionStore((s) =>
    id ? s.items.find((p) => p.id === id) : s.items.find((p) => p.status === 'REJECTED'),
  );
  const pharmacy = script?.pharmacy ?? 'the partner pharmacy';
  const reviewed = script?.reviewedAt
    ? new Date(script.reviewedAt).toLocaleString('en-GB', {
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
      title="Prescription not accepted"
      body={`The pharmacist at ${pharmacy} could not verify this document.`}
      actions={
        <>
          <Button
            label="Re-upload prescription"
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
            label="Contact the pharmacy"
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
            PHARMACIST NOTE
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
