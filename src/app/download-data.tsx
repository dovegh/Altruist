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



export default function DownloadData() {
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
        <TitleAppBar title="Download your data" />

        <View style={{ gap: d(12) }}>
          <FeatureIcon size={72} tone="subtle">
            <Icon name="upload" size={d(30)} tone="brand" />
          </FeatureIcon>
          <Text variant="displayS" style={{ fontSize: d(28), lineHeight: d(32) }}>
            Get a copy of everything
          </Text>
          <Text variant="bodyL" tone="secondary" style={{ fontSize: d(16), lineHeight: d(24) }}>
            We build a single archive and email you a secure download link. It expires after 7 days.
          </Text>
        </View>

        <SettingsGroup label="WHAT TO INCLUDE">
          {PARTS.map((p) => (
            <Pressable
              key={p.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: !!selected[p.id] }}
              accessibilityLabel={`${p.title}. ${p.meta}`}
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
                  {p.title}
                </Text>
                <Text
                  variant="caption"
                  tone="tertiary"
                  style={{ fontSize: d(12), lineHeight: d(16) }}
                >
                  {p.meta}
                </Text>
              </View>
            </Pressable>
          ))}
        </SettingsGroup>

        <SettingsGroup label="FORMAT">
          <View style={{ flexDirection: 'row', gap: d(10) }}>
            {FORMATS.map((f) => {
              const on = format === f;
              return (
                <Pressable
                  key={f}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={f}
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
                    {f}
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
            Dispensing records are kept by your pharmacy. Ask them for a copy.
          </Text>
        </View>
      </FormScreen>

      <StickyFooter>
        <Button
          label="Request my archive"
          size="large"
          disabled={!anySelected}
          onPress={() => router.back()}
        />
        <Text variant="caption" tone="tertiary" center style={{ fontSize: d(12), lineHeight: d(16) }}>
          Usually ready within 24 hours · sent to {profile.email}
        </Text>
      </StickyFooter>
    </View>
  );
}
