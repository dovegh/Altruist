/**
 * Product Card, Rx Badge and Filter Chip — Figma nodes 33:82, 26:35, 37:77.
 *
 * Rx Badge doc: "Regulatory classification for a product. Type is the meaning;
 * Size is how much room you have. The label is not a text property on purpose —
 * regulatory wording should not be editable per instance."
 *
 * Product Card doc: "The Rx Badge is NOT optional — SRS §3 requires every
 * product to declare requires_prescription. A card without one is a compliance
 * defect."  That is why `requiresPrescription` is a required prop here: you
 * cannot render a product without classifying it.
 */
import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { Text } from './Text';
import { Icon } from './Icon';
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    rxRequired: 'RX REQUIRED',
    rxOnly: 'RX ONLY',
    overCounter: 'OVER THE COUNTER',
    otc: 'OTC',
    rxA11y: 'Prescription required',
    otcA11y: 'Over the counter',
    inStock: 'In stock',
    outOfStock: 'Out of stock',
    cardA11y: '{name}. {pack}. {price}. {rx}. {stock}',
    save: 'Save {name}',
    addToCart: 'Add {name} to cart',
    search: 'Search medicines, vitamins, brands',
  },
  fr: {
    rxRequired: 'ORDONNANCE REQUISE',
    rxOnly: 'SUR ORDONNANCE',
    overCounter: 'EN VENTE LIBRE',
    otc: 'VENTE LIBRE',
    rxA11y: 'Ordonnance requise',
    otcA11y: 'En vente libre',
    inStock: 'En stock',
    outOfStock: 'Rupture de stock',
    cardA11y: '{name}. {pack}. {price}. {rx}. {stock}',
    save: 'Enregistrer {name}',
    addToCart: 'Ajouter {name} au panier',
    search: 'Rechercher médicaments, vitamines, marques',
  },
  tw: {
    rxRequired: 'ƐHIA NNURO KRATAA',
    rxOnly: 'RX NKOA',
    overCounter: 'NNURO KRATAA NHIA',
    otc: 'OTC',
    rxA11y: 'Ɛhia nnuro krataa',
    otcA11y: 'Nnuro krataa nhia',
    inStock: 'Ɛwɔ hɔ',
    outOfStock: 'Asa',
    cardA11y: '{name}. {pack}. {price}. {rx}. {stock}',
    save: 'Kora {name}',
    addToCart: 'Fa {name} gu kɛntɛn mu',
    search: 'Hwehwɛ nnuro, vitamin, ne brand',
  },
  gaa: {
    rxRequired: 'ESA TSOFA WOLO',
    rxOnly: 'RX PƐ',
    overCounter: 'TSOFA WOLO BEHIAŊ',
    otc: 'OTC',
    rxA11y: 'Esa tsofa wolo',
    otcA11y: 'Tsofa wolo behiaŋ',
    inStock: 'Eyɛ',
    outOfStock: 'Eta',
    cardA11y: '{name}. {pack}. {price}. {rx}. {stock}',
    save: 'Toɔ {name}',
    addToCart: 'Fɔ {name} kɛntɛŋ lɛ mli',
    search: 'Taomɔ tsofai, vitamin, kɛ brand',
  },
  ee: {
    rxRequired: 'ATIKE ŊƆŊLƆ HIÃ',
    rxOnly: 'RX ƉEƉE',
    overCounter: 'ATIKE ŊƆŊLƆ MEHIÃ O',
    otc: 'OTC',
    rxA11y: 'Atike ŋɔŋlɔ hiã',
    otcA11y: 'Atike ŋɔŋlɔ mehiã o',
    inStock: 'Eli',
    outOfStock: 'Eva to',
    cardA11y: '{name}. {pack}. {price}. {rx}. {stock}',
    save: 'Dzra {name} ɖo',
    addToCart: 'Tsɔ {name} de kusi me',
    search: 'Di atikewo, vitamin, kple brand',
  },
  ha: {
    rxRequired: 'ANA BUƘATAR TAKARDAR LIKITA',
    rxOnly: 'RX KAƊAI',
    overCounter: 'BA A BUƘATAR TAKARDA',
    otc: 'OTC',
    rxA11y: 'Ana buƙatar takardar likita',
    otcA11y: 'Ba a buƙatar takardar likita',
    inStock: 'Akwai',
    outOfStock: 'Ya ƙare',
    cardA11y: '{name}. {pack}. {price}. {rx}. {stock}',
    save: 'Ajiye {name}',
    addToCart: 'Saka {name} a kwando',
    search: 'Nemi magunguna, bitamin, alamu',
  },
});

export type RxSize = 'full' | 'compact';

export function RxBadge({
  requiresPrescription,
  size = 'compact',
}: {
  requiresPrescription: boolean;
  size?: RxSize;
}) {
  const t = useTokens();
  const { d } = useDesignScale();
  const tr = useT(S);

  // Wording is fixed by type and size — never passed in.
  const label = requiresPrescription
    ? size === 'full'
      ? tr('rxRequired')
      : tr('rxOnly')
    : size === 'full'
      ? tr('overCounter')
      : tr('otc');

  const bg = requiresPrescription ? t.colors.bg.warningSubtle : t.colors.bg.successSubtle;
  const fg = requiresPrescription ? t.colors.text.warning : t.colors.text.success;

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={requiresPrescription ? tr('rxA11y') : tr('otcA11y')}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: d(4),
        paddingLeft: d(8),
        paddingRight: d(10),
        paddingVertical: d(5),
        borderRadius: t.radius.full,
        backgroundColor: bg,
        alignSelf: 'flex-start',
      }}
    >
      <Icon name={requiresPrescription ? 'prescription' : 'check'} size={d(14)} color={fg} />
      <Text variant="labelXS" color={fg} style={{ fontSize: d(11), lineHeight: d(14) }}>
        {label}
      </Text>
    </View>
  );
}

export function FilterChip({
  label,
  selected = false,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  const t = useTokens();
  const { d } = useDesignScale();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: d(18),
        paddingVertical: d(11),
        borderRadius: t.radius.full,
        backgroundColor: selected ? t.colors.bg.brand : t.colors.bg.surfaceRaised,
        borderWidth: selected ? 0 : 1,
        borderColor: t.colors.border.subtle,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Text
        variant="labelM"
        color={selected ? t.colors.text.onBrand : t.colors.text.secondary}
        style={{ fontSize: d(14), lineHeight: d(18) }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * A small version of a product photo. The catalogue's images come from
 * Shopify's CDN at their original size — up to ~1900px wide — to fill a card
 * about 160pt wide; loading hundreds of those is most of why the catalogue was
 * slow. The CDN resizes on request (`width`), so ask for roughly 2× the tile.
 */
export function productThumbnail(url: string | undefined, width = 360): string | undefined {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (u.hostname !== 'cdn.shopify.com') return url;
    u.searchParams.set('width', String(width));
    return u.toString();
  } catch {
    return url;
  }
}

export const ProductCard = React.memo(function ProductCard({
  name,
  pack,
  price,
  requiresPrescription,
  inStock,
  imageUrl,
  onPress,
  onAdd,
}: {
  name: string;
  pack: string;
  price: string;
  /** Required: SRS §3 — a product without a classification is a compliance defect. */
  requiresPrescription: boolean;
  inStock: boolean;
  /** Remote product photograph. The glyph below shows until it arrives. */
  imageUrl?: string;
  onPress?: () => void;
  onAdd?: () => void;
}) {
  const t = useTokens();
  const { d } = useDesignScale();
  const tr = useT(S);
  const thumbnail = productThumbnail(imageUrl);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tr('cardA11y', {
        name,
        pack,
        price,
        rx: requiresPrescription ? tr('rxA11y') : tr('otcA11y'),
        stock: inStock ? tr('inStock') : tr('outOfStock'),
      })}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minWidth: 1,
        backgroundColor: t.colors.bg.surface,
        borderRadius: d(22),
        paddingTop: d(10),
        paddingBottom: d(12),
        paddingHorizontal: d(10),
        gap: d(8),
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <View>
        <View
          style={{
            height: d(100),
            borderRadius: d(16),
            backgroundColor: t.colors.bg.accentCream,
            alignItems: 'center',
            justifyContent: 'center',
            // `cover` bleeds to the edges, so the panel has to clip or the
            // photograph renders square corners over the rounded tile.
            overflow: 'hidden',
            // Out of stock dims the image so the state reads before the label.
            opacity: inStock ? 1 : 0.45,
          }}
        >
          {/* The glyph is the resting state, not a spinner: it sits underneath
              and the photograph fades in over it, so a slow or missing image
              leaves a deliberate-looking card rather than a hole. */}
          <View style={{ opacity: 0.35 }}>
            <Icon name="prescription" size={d(36)} color={t.colors.text.onBrand} />
          </View>
          {thumbnail ? (
            <Image
              source={{ uri: thumbnail }}
              // Kept in memory and on disk: scrolling back up, or opening the
              // catalogue again, does not download the same photos twice.
              cachePolicy="memory-disk"
              recyclingKey={thumbnail}
              // Fills the tile. These are catalogue shots on white with generous
              // margins, so the crop takes background rather than product on
              // almost all of them — and a grid of uniformly filled tiles reads
              // far better than one where every pack floats at its own size.
              contentFit="cover"
              transition={180}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('save', { name })}
          hitSlop={10}
          style={{ position: 'absolute', right: d(12), top: d(13) }}
        >
          <Icon name="heart" size={d(18)} color={t.colors.text.onBrand} />
        </Pressable>
      </View>

      <RxBadge requiresPrescription={requiresPrescription} size="compact" />

      <Text
        variant="labelM"
        tone={inStock ? 'primary' : 'disabled'}
        style={{ fontSize: d(14), lineHeight: d(18) }}
      >
        {name}
      </Text>
      <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
        {pack}
      </Text>

      {inStock ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(8) }}>
          <Text variant="numericM" style={{ flex: 1, fontSize: d(20), lineHeight: d(26) }}>
            {price}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr('addToCart', { name })}
            onPress={onAdd}
            hitSlop={8}
            style={({ pressed }) => ({
              width: d(32),
              height: d(32),
              borderRadius: t.radius.full,
              backgroundColor: pressed ? t.colors.bg.brandPressed : t.colors.bg.brand,
              alignItems: 'center',
              justifyContent: 'center',
            })}
          >
            <Icon name="add" size={d(18)} color={t.colors.icon.onBrand} />
          </Pressable>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text variant="labelS" tone="danger" style={{ flex: 1, fontSize: d(12), lineHeight: d(16) }}>
            {tr('outOfStock')}
          </Text>
        </View>
      )}
    </Pressable>
  );
});

export function SearchField({ onPress }: { onPress?: () => void }) {
  const t = useTokens();
  const { d } = useDesignScale();
  const tr = useT(S);
  return (
    <Pressable
      accessibilityRole="search"
      accessibilityLabel={tr('search')}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: d(12),
        height: d(52),
        paddingHorizontal: d(18),
        borderRadius: t.radius.full,
        backgroundColor: t.colors.bg.surfaceRaised,
        borderWidth: 1,
        borderColor: t.colors.border.subtle,
      }}
    >
      <Icon name="search" size={d(20)} tone="primary" />
      <Text variant="bodyM" tone="placeholder" style={{ flex: 1, fontSize: d(14), lineHeight: d(21) }}>
        {tr('search')}
      </Text>
    </Pressable>
  );
}
