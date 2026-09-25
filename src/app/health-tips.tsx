/**
 * Wellness — Health Tips — ported 1:1 from Figma node 146:274.
 *
 * Scroll content: V gap16, pad 64/24/60/24. Category chips, a mint featured
 * card (r28, pad 20, gap 14), a LATEST list of 56pt-tile rows, then the medical
 * disclaimer.
 *
 * Every row's tile hue is drawn from the accent palette rather than the
 * semantic one: an article about heart health is not a warning, and using gold
 * or coral here would collide with the meaning those colours carry on the
 * prescription screens.
 *
 * Content is the shared article library, and the chips are derived from what
 * is actually in it — a category with nothing behind it cannot appear, and the
 * featured card opens the article it is advertising rather than a fixed route.
 */
import React, { useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen } from '@/components/ui/FormScreen';
import { TitleAppBar } from '@/components/ui/AppBar';
import { FilterChip } from '@/components/ui/Product';
import { MedicalDisclaimer } from '@/components/ui/Disclaimer';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { ARTICLES, ARTICLE_CATEGORIES, cardMeta } from '@/lib/articles';

export default function HealthTips() {
  const t = useTokens();
  const { d } = useDesignScale();
  const [category, setCategory] = useState('All');

  const featured = ARTICLES.find((a) => a.featured) ?? ARTICLES[0];
  const rest = ARTICLES.filter((a) => a.id !== featured.id);
  const visible = category === 'All' ? rest : rest.filter((a) => a.category === category);

  const open = (id: string) => router.push(`/article?id=${id}`);

  return (
    <FormScreen gap={16} contentStyle={{ paddingBottom: d(60) }}>
      <TitleAppBar title="Health tips" />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: d(8) }}>
        {ARTICLE_CATEGORIES.map((c) => (
          <FilterChip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
        ))}
      </ScrollView>

      {/* Featured — mint, r28 */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`This week. ${featured.headline ?? featured.title}. ${featured.minutes} minute read, reviewed by a pharmacist.`}
        onPress={() => open(featured.id)}
        style={({ pressed }) => ({
          gap: d(14),
          padding: d(20),
          borderRadius: d(28),
          backgroundColor: t.colors.bg.brand,
          opacity: pressed ? 0.9 : 1,
        })}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: d(6),
            alignSelf: 'flex-start',
            paddingVertical: d(5),
            paddingLeft: d(10),
            paddingRight: d(12),
            borderRadius: t.radius.full,
            backgroundColor: t.colors.bg.surface,
          }}
        >
          <Icon name="star" size={d(13)} tone="warning" />
          <Text variant="labelXS" style={{ fontSize: d(11), lineHeight: d(14) }}>
            THIS WEEK
          </Text>
        </View>

        <Text
          variant="headingL"
          color={t.colors.text.onBrand}
          style={{ fontSize: d(20), lineHeight: d(26) }}
        >
          {featured.headline ?? featured.title}
        </Text>
        <Text
          variant="bodyM"
          color={t.colors.text.onBrand}
          numberOfLines={2}
          style={{ opacity: 0.8, fontSize: d(14), lineHeight: d(21) }}
        >
          {featured.body.find((b) => b.kind === 'p')?.text ?? ''}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(8) }}>
          <Icon name="clock" size={d(14)} color={t.colors.text.onBrand} />
          <Text
            variant="caption"
            color={t.colors.text.onBrand}
            style={{ opacity: 0.8, fontSize: d(12), lineHeight: d(16) }}
          >
            {featured.minutes} min read · Reviewed by a pharmacist
          </Text>
        </View>
      </Pressable>

      <Text variant="labelXS" tone="tertiary" style={{ fontSize: d(11), lineHeight: d(14) }}>
        LATEST
      </Text>

      {visible.map((a) => (
        <Pressable
          key={a.id}
          accessibilityRole="button"
          accessibilityLabel={`${a.title}. ${cardMeta(a)}`}
          onPress={() => open(a.id)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: d(14),
            paddingVertical: d(12),
            paddingLeft: d(12),
            paddingRight: d(16),
            borderRadius: d(20),
            backgroundColor: t.colors.bg.surface,
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <View
            style={{
              width: d(56),
              height: d(56),
              borderRadius: d(16),
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: t.colors.bg[a.tone],
            }}
          >
            <Icon name={a.icon} size={d(24)} color={t.colors.text.onBrand} />
          </View>
          <View style={{ flex: 1, gap: d(4) }}>
            <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
              {a.title}
            </Text>
            <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
              {cardMeta(a)}
            </Text>
          </View>
          <Icon name="chevron-right" size={d(18)} tone="tertiary" />
        </Pressable>
      ))}

      {visible.length === 0 ? (
        <Text variant="bodyM" tone="tertiary" style={{ fontSize: d(14), lineHeight: d(21) }}>
          Nothing in {category} yet.
        </Text>
      ) : null}

      <MedicalDisclaimer body="These articles are reviewed by a registered pharmacist but are not a diagnosis. Speak to a clinician about your own treatment." />
    </FormScreen>
  );
}
