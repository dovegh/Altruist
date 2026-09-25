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


export default function Legal() {
  const t = useTokens();
  const { d } = useDesignScale();

  return (
    <FormScreen gap={18} contentStyle={{ paddingBottom: d(60) }}>
      <TitleAppBar title="Legal" />

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
        title="Terms of Service"
        subtitle={docSubtitle(LEGAL_DOCS[0])}
        chevron
        onPress={() => router.push('/terms')}
      />
      <ListRow
        title="Privacy Policy"
        subtitle={docSubtitle(LEGAL_DOCS[1])}
        chevron
        onPress={() => Linking.openURL(PRIVACY_URL)}
      />
      <ListRow
        title="Partner pharmacies"
        subtitle="Licences and who fulfils your orders"
        chevron
        onPress={() => router.push('/partners')}
      />
      <ListRow
        title="Contact & data requests"
        subtitle="privacy@altruistpharmacy.com"
        chevron
        onPress={() => Linking.openURL('mailto:privacy@altruistpharmacy.com')}
      />

    </FormScreen>
  );
}
