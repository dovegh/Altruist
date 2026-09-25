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

  // Wording is fixed by type and size — never passed in.
  const label = requiresPrescription
    ? size === 'full'
      ? 'RX REQUIRED'
      : 'RX ONLY'
    : size === 'full'
      ? 'OVER THE COUNTER'
      : 'OTC';

  const bg = requiresPrescription ? t.colors.bg.warningSubtle : t.colors.bg.successSubtle;
  const fg = requiresPrescription ? t.colors.text.warning : t.colors.text.success;

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={requiresPrescription ? 'Prescription required' : 'Over the counter'}
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

export function ProductCard({
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

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}. ${pack}. ${price}. ${
        requiresPrescription ? 'Prescription required' : 'Over the counter'
      }. ${inStock ? 'In stock' : 'Out of stock'}`}
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
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
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
          accessibilityLabel={`Save ${name}`}
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
            accessibilityLabel={`Add ${name} to cart`}
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
            Out of stock
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export function SearchField({ onPress }: { onPress?: () => void }) {
  const t = useTokens();
  const { d } = useDesignScale();
  return (
    <Pressable
      accessibilityRole="search"
      accessibilityLabel="Search medicines, vitamins, brands"
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
        Search medicines, vitamins, brands
      </Text>
    </Pressable>
  );
}
