/**
 * Search result row — Figma "Result — …" (Search — Results).
 *
 * bg/surface, r20, H gap14, pad 12/14/12/12. A 58pt cream thumb, a meta column,
 * and a right column holding the price above a 32pt add button.
 *
 * Carries the same required `requiresPrescription` prop as ProductCard: search
 * is another surface where an unclassified medicine must be impossible to
 * render.
 */
import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { Text } from './Text';
import { Icon } from './Icon';
import { RxBadge } from './Product';
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    rowA11y: '{name}. {pack}. {price}. {rx}',
    rxA11y: 'Prescription required',
    otcA11y: 'Over the counter',
    addToCart: 'Add {name} to cart',
  },
  fr: {
    rowA11y: '{name}. {pack}. {price}. {rx}',
    rxA11y: 'Ordonnance requise',
    otcA11y: 'En vente libre',
    addToCart: 'Ajouter {name} au panier',
  },
  tw: {
    rowA11y: '{name}. {pack}. {price}. {rx}',
    rxA11y: 'Ɛhia nnuro krataa',
    otcA11y: 'Nnuro krataa nhia',
    addToCart: 'Fa {name} gu kɛntɛn mu',
  },
  gaa: {
    rowA11y: '{name}. {pack}. {price}. {rx}',
    rxA11y: 'Esa tsofa wolo',
    otcA11y: 'Tsofa wolo behiaŋ',
    addToCart: 'Fɔ {name} kɛntɛŋ lɛ mli',
  },
  ee: {
    rowA11y: '{name}. {pack}. {price}. {rx}',
    rxA11y: 'Atike ŋɔŋlɔ hiã',
    otcA11y: 'Atike ŋɔŋlɔ mehiã o',
    addToCart: 'Tsɔ {name} de kusi me',
  },
  ha: {
    rowA11y: '{name}. {pack}. {price}. {rx}',
    rxA11y: 'Ana buƙatar takardar likita',
    otcA11y: 'Ba a buƙatar takardar likita',
    addToCart: 'Saka {name} a kwando',
  },
});

export function SearchResultRow({
  name,
  pack,
  price,
  requiresPrescription,
  imageUrl,
  onPress,
  onAdd,
}: {
  name: string;
  pack: string;
  price: string;
  /** Required: SRS §3 — a product without a classification is a compliance defect. */
  requiresPrescription: boolean;
  imageUrl?: string;
  onPress?: () => void;
  onAdd?: () => void;
}) {
  const t = useTokens();
  const { d } = useDesignScale();
  const tr = useT(S);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tr('rowA11y', {
        name,
        pack,
        price,
        rx: requiresPrescription ? tr('rxA11y') : tr('otcA11y'),
      })}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        gap: d(14),
        paddingVertical: d(12),
        paddingLeft: d(12),
        paddingRight: d(14),
        borderRadius: d(20),
        backgroundColor: t.colors.bg.surface,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <View
        style={{
          width: d(58),
          height: d(58),
          borderRadius: d(16),
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: t.colors.bg.accentCream,
          alignSelf: 'center',
          overflow: 'hidden',
        }}
      >
        <View style={{ opacity: 0.4 }}>
          <Icon name="prescription" size={d(24)} color={t.colors.text.onBrand} />
        </View>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            contentFit="cover"
            transition={180}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
      </View>

      <View style={{ flex: 1, gap: d(5) }}>
        <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
          {name}
        </Text>
        <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
          {pack}
        </Text>
        <RxBadge requiresPrescription={requiresPrescription} size="full" />
      </View>

      <View style={{ alignItems: 'flex-end', gap: d(8), alignSelf: 'center' }}>
        <Text variant="numericM" style={{ fontSize: d(20), lineHeight: d(26) }}>
          {price}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('addToCart', { name })}
          hitSlop={8}
          onPress={onAdd}
          style={({ pressed }) => ({
            width: d(32),
            height: d(32),
            borderRadius: t.radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? t.colors.bg.brandPressed : t.colors.bg.brand,
          })}
        >
          <Icon name="add" size={d(16)} color={t.colors.icon.onBrand} />
        </Pressable>
      </View>
    </Pressable>
  );
}

export default SearchResultRow;
