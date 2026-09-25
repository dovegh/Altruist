/**
 * Wellness — Article — ported 1:1 from Figma node 146:366.
 *
 * A 250pt mint hero carrying the headline and two floating 44pt controls, then
 * scroll content (V gap16, pad 22/24/60/24): the reviewer byline, alternating
 * body and 18pt subheads, a secondary CTA, then the disclaimer.
 *
 * The byline is named and licensed, not a generic "medically reviewed" stamp.
 * Health content that cannot be traced to a specific registered pharmacist is
 * exactly the kind of thing SRS §1 says Altruist must not publish.
 */
import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { MedicalDisclaimer } from '@/components/ui/Disclaimer';
import { Text } from '@/components/ui/Text';
import { Icon, type IconName } from '@/components/ui/Icon';
import { usePartnerPharmacy } from '@/features/profile/store';
import { initialsOf } from '@/lib/profile';
import { ARTICLES, byId, withReviewer } from '@/lib/articles';


export default function Article() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const pharmacy = usePartnerPharmacy();
  // Falls back to the featured article: this route is also reached from cards
  // that predate ids, and an empty hero is worse than the week's lead piece.
  const article = withReviewer(byId(id) ?? ARTICLES[0], pharmacy);
  const reviewer = article.reviewer;
  const t = useTokens();
  const { d } = useDesignScale();
  const insets = useSafeAreaInsets();
  const [saved, setSaved] = React.useState(false);

  const round = (icon: IconName, label: string, onPress?: () => void, active?: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      style={({ pressed }) => ({
        width: d(44),
        height: d(44),
        borderRadius: t.radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: t.colors.bg.surface,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Icon name={icon} size={d(20)} color={active ? t.colors.icon.brand : t.colors.icon.primary} />
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: d(60) + insets.bottom }}
      >
        {/* Hero */}
        <View
          style={{
            minHeight: d(250),
            justifyContent: 'flex-end',
            paddingHorizontal: d(24),
            paddingBottom: d(22),
            backgroundColor: t.colors.bg.brand,
            overflow: 'hidden',
          }}
        >
          <View style={{ position: 'absolute', right: d(-30), top: d(30), opacity: 0.1 }}>
            <Icon name="prescription" size={d(190)} color={t.colors.text.onBrand} />
          </View>
          <Text
            variant="headingXL"
            color={t.colors.text.onBrand}
            style={{ fontSize: d(24), lineHeight: d(30) }}
          >
            {article.headline ?? article.title}
          </Text>
        </View>

        <View
          style={{
            position: 'absolute',
            left: d(24),
            right: d(24),
            top: insets.top + d(16),
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          {round('arrow-left', 'Go back', () => router.back())}
          {round('heart', 'Save this article', () => setSaved((v) => !v), saved)}
        </View>

        {/* Body */}
        <View style={{ gap: d(16), paddingTop: d(22), paddingHorizontal: d(24) }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: d(12),
              paddingVertical: d(12),
              paddingLeft: d(14),
              paddingRight: d(16),
              borderRadius: d(20),
              backgroundColor: t.colors.bg.surface,
            }}
          >
            <Avatar initials={initialsOf(reviewer.name)} size={44} label={reviewer.name} />
            <View style={{ flex: 1, gap: d(3) }}>
              <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
                Reviewed by {reviewer.name}
              </Text>
              <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
                {reviewer.role} · {reviewer.registration} · {article.minutes} min read
              </Text>
            </View>
          </View>

          {article.body.map((b) =>
            b.kind === 'h' ? (
              <Text
                key={b.text}
                variant="headingM"
                accessibilityRole="header"
                style={{ fontSize: d(18), lineHeight: d(24) }}
              >
                {b.text}
              </Text>
            ) : (
              <Text
                key={b.text}
                variant="bodyL"
                tone="secondary"
                style={{ fontSize: d(16), lineHeight: d(24) }}
              >
                {b.text}
              </Text>
            ),
          )}

          <Button
            label="Ask your partner pharmacy"
            variant="secondary"
            size="large"
            iconLeading="call"
            onPress={() => router.push('/support')}
          />

          <MedicalDisclaimer body="Reviewed by a registered pharmacist for general accuracy. It is not a diagnosis and does not replace advice about your own prescription." />
        </View>
      </ScrollView>
    </View>
  );
}
