/**
 * Mobile — Terms Reader — ported 1:1 from Figma node on page "Legal".
 *
 * Scroll content: V gap16, pad 64/24/60/24. The updated line, a section-nav
 * chip row, the numbered sections, then an "open in browser" pill.
 *
 * The section chips SCROLL the reader rather than filtering it — legal text is
 * read in order, and hiding clauses behind a filter is how a user ends up
 * agreeing to something they were never shown.
 *
 * DRAFT: the wording below mirrors `docs/09-Terms-of-Service-DRAFT.md` and has
 * not been reviewed by counsel. The published version at TERMS_URL governs,
 * which is what the closing pill links to.
 */
import React, { useRef, useState } from 'react';
import { View, ScrollView, Pressable, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { TitleAppBar } from '@/components/ui/AppBar';
import { FilterChip } from '@/components/ui/Product';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { TERMS_SECTIONS as SECTIONS, termsStamp } from '@/lib/legal';
import { TERMS_URL } from './legal';
import { defineStrings, useLocale, useT } from '@/i18n';

// Screen chrome only: the terms themselves, and their section chips, stay in
// English — the published English text is the one that binds.
const S = defineStrings({
  en: {
    title: 'Terms of Service',
    more: 'More options',
    updated: 'Last updated {date} · {count} sections',
    viewA11y: 'View the published version in your browser',
    view: 'View the published version',
  },
  fr: {
    title: "Conditions d'utilisation",
    more: "Plus d'options",
    updated: 'Dernière mise à jour le {date} · {count} sections',
    viewA11y: 'Voir la version publiée dans votre navigateur',
    view: 'Voir la version publiée',
  },
  tw: {
    title: 'Nhyehyɛeɛ a ɛfa dwumadie ho',
    more: 'Nneɛma foforɔ',
    updated: 'Wɔsesaa no {date} · nkyekyɛmu {count}',
    viewA11y: 'Hwɛ deɛ wɔatintim no wɔ wo browser mu',
    view: 'Hwɛ deɛ wɔatintim no',
  },
  gaa: {
    title: 'Nitsumɔ he mlai',
    more: 'Nibii krokomɛi',
    updated: 'Atsake yɛ {date} · kuii {count}',
    viewA11y: 'Kwɛ nɔ ni afee kpo lɛ yɛ obrowser lɛ mli',
    view: 'Kwɛ nɔ ni afee kpo lɛ',
  },
  ee: {
    title: 'Zazã ƒe ɖoɖowo',
    more: 'Tiatia bubuwo',
    updated: 'Wotrɔe mamlɛtɔ le {date} · akpa {count}',
    viewA11y: 'Kpɔ esi wota le wò browser me',
    view: 'Kpɔ esi wota',
  },
  ha: {
    title: 'Sharuɗɗan amfani',
    more: 'Ƙarin zaɓuɓɓuka',
    updated: 'An sabunta {date} · sassa {count}',
    viewA11y: 'Duba sigar da aka wallafa a burauzarka',
    view: 'Duba sigar da aka wallafa',
  },
});

/** The date on the in-app copy of the terms. */
const UPDATED = new Date(2026, 7, 23);


export default function Terms() {
  const t = useTokens();
  const { d } = useDesignScale();
  const insets = useSafeAreaInsets();
  const tr = useT(S);
  const locale = useLocale();
  const scroller = useRef<ScrollView>(null);
  const offsets = useRef<number[]>([]);
  const [active, setActive] = useState(0);

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      <ScrollView
        ref={scroller}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          gap: d(16),
          paddingTop: insets.top + d(18),
          paddingHorizontal: d(24),
          paddingBottom: d(60) + insets.bottom,
        }}
      >
        <TitleAppBar title={tr('title')} actions={[{ icon: 'more', label: tr('more') }]} />

        <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
          {tr('updated', {
            date: UPDATED.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }),
            count: SECTIONS.length,
          })}
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: d(8) }}
        >
          {SECTIONS.map((s, i) => (
            <FilterChip
              key={s.chip}
              label={s.chip}
              selected={active === i}
              onPress={() => {
                setActive(i);
                const y = offsets.current[i];
                if (y != null) scroller.current?.scrollTo({ y: y - d(24), animated: true });
              }}
            />
          ))}
        </ScrollView>

        {SECTIONS.map((s, i) => (
          <View
            key={s.title}
            onLayout={(e) => {
              offsets.current[i] = e.nativeEvent.layout.y;
            }}
            style={{ gap: d(8) }}
          >
            <Text
              variant="headingM"
              accessibilityRole="header"
              style={{ fontSize: d(18), lineHeight: d(24) }}
            >
              {s.title}
            </Text>
            <Text variant="bodyM" tone="secondary" style={{ fontSize: d(14), lineHeight: d(21) }}>
              {s.body}
            </Text>
          </View>
        ))}

        <Pressable
          accessibilityRole="link"
          accessibilityLabel={tr('viewA11y')}
          onPress={() => Linking.openURL(TERMS_URL)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            height: d(56),
            paddingLeft: d(22),
            paddingRight: d(10),
            borderRadius: t.radius.full,
            backgroundColor: t.colors.bg.surfaceRaised,
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <Text variant="labelM" style={{ flex: 1, fontSize: d(14), lineHeight: d(18) }}>
            {tr('view')}
          </Text>
          <View
            style={{
              width: d(40),
              height: d(40),
              borderRadius: t.radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: t.colors.bg.brand,
            }}
          >
            <Icon name="arrow-right" size={d(18)} color={t.colors.icon.onBrand} />
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}
