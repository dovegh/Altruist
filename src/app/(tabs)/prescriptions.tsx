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
 */
import React from 'react';
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
import { usePrescriptionStore, type Prescription } from '@/features/prescriptions/store';

/** "Verified 23 Aug 2026 · 05:41 PM" — the card's third line. */
function stamp(p: Prescription): string {
  const verb =
    p.status === 'VERIFIED' ? 'Verified' : p.status === 'REJECTED' ? 'Reviewed' : 'Uploaded';
  const at = new Date(p.reviewedAt ?? p.uploadedAt);
  const date = at.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const time = at
    .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })
    .toUpperCase();
  return `${verb} ${date} · ${time}`;
}

export default function Prescriptions() {
  const t = useTokens();
  const { d } = useDesignScale();
  const insets = useSafeAreaInsets();

  const history = usePrescriptionStore((s) => s.items);
  const hydrated = usePrescriptionStore((s) => s.hydrated);
  const isEmpty = history.length === 0;

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
          title="Prescriptions"
          showBack={false}
          actions={[{ icon: 'more', label: 'More options' }]}
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
                No prescriptions yet
              </Text>
              <Text variant="bodyM" tone="secondary" center style={{ fontSize: d(14), lineHeight: d(21) }}>
                Upload a photo of a prescription and a licensed partner pharmacist will review it —
                usually within the hour.
              </Text>
            </View>

            <Button
              label="Upload a prescription"
              size="large"
              onPress={() => router.push('/prescription-upload')}
            />
            <Button
              label="How it works"
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
              eyebrow="FASTEST WAY TO ORDER"
              title="Upload a prescription"
              body="Snap it, send it. A licensed partner pharmacist reviews and fulfils it for you."
              cta="Upload now"
              ctaIcon="prescription"
              icon="camera"
              onPress={() => router.push('/prescription-upload')}
            />

            <SectionHeader title="History" />

            <Stagger step={55}>
              {history.map((p) => (
                <PrescriptionCard
                  key={p.id}
                  title={`TrxID ${p.id}`}
                  note={p.note}
                  timestamp={stamp(p)}
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
              ))}
            </Stagger>
          </>
        )}
      </ScrollView>
    </View>
  );
}
