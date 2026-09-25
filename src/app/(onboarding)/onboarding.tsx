/**
 * Onboarding — ported 1:1 from Figma node 67:69 (and siblings).
 *
 * Layout is absolute, using the exact design-canvas coordinates from the Figma
 * file scaled by useDesignScale(). Do not "tidy" these numbers into flex — the
 * tilted chip cluster and the hero card crop depend on them.
 *
 * Status Bar and Home Indicator are deliberately NOT drawn: the Figma component
 * descriptions state they are mockups and the OS renders the real ones.
 */
import React, { useRef, useState } from 'react';
import { View, ScrollView, Pressable, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { Text } from '@/components/ui/Text';
import { Icon, type IconName } from '@/components/ui/Icon';
import { markOnboarded } from '@/lib/session';
import { usePartnerPharmacy } from '@/features/profile/store';
import { shortName, type Pharmacy } from '@/lib/pharmacies';
import { FREE_DELIVERY_OVER } from '@/features/cart/useCart';
import { cedis } from '@/lib/money';
import { PRODUCTS } from '@/lib/catalog';
import { ARTICLES, cardMeta } from '@/lib/articles';
import { programmeById } from '@/lib/wellness';

type Chip = {
  /** Rotated bounding box from Figma, design-canvas units. */
  box: { left: number; top: number; width: number; height: number };
  rotate: number;
  surface: 'accentCream' | 'surface' | 'accentBlue' | 'accentGold' | 'accentPink';
  thumb: 'surface' | 'accentGold' | 'accentPink' | 'accentBlue';
  icon: IconName;
  title: string;
  sub: string;
};

type Slide = {
  card: 'brand' | 'accentCream' | 'accentGold';
  head: { text: string; highlight?: boolean }[];
  body: string;
  cta: string;
  chips: Chip[];
};

// Partner facts on the chips come from the partner record, not the copy deck.
/**
 * Two real products from the catalogue for the second slide's chips.
 *
 * These were invented ("Vitamin C ₵24", "Paracetamol ₵12") and matched nothing
 * a user would find after signing up — an onboarding screen advertising a price
 * the catalogue does not have is the first thing the app says and it was false.
 */
const samples = () => {
  const inStock = PRODUCTS.filter((x) => x.inStock && !x.requiresPrescription);
  return [inStock[0], inStock[Math.min(1, inStock.length - 1)]].filter(Boolean);
};

const slidesFor = (p: Pharmacy): Slide[] => [
  {
    card: 'brand',
    head: [{ text: 'Upload your' }, { text: 'prescription', highlight: true }],
    body: 'Upload prescriptions instantly and connect directly with certified local pharmacies for doorstep fulfilment.',
    cta: 'Next',
    chips: [
      {
        box: { left: 15.19, top: 296, width: 151.998, height: 61.218 },
        rotate: 6,
        surface: 'accentCream',
        thumb: 'surface',
        icon: 'prescription',
        title: shortName(p),
        sub: 'Verified partner',
      },
      {
        box: { left: 176, top: 267.88, width: 165.393, height: 59.944 },
        rotate: -5,
        surface: 'surface',
        thumb: 'accentGold',
        icon: 'prescription',
        title: 'Reviewed in 4 min',
        sub: 'Real pharmacist',
      },
      {
        box: { left: 36, top: 349.68, width: 129.899, height: 54.747 },
        rotate: -4,
        surface: 'accentBlue',
        thumb: 'surface',
        icon: 'prescription',
        title: p.locality,
        sub: `${p.distanceKm} km away`,
      },
      {
        box: { left: 164.79, top: 366, width: 165.812, height: 57.258 },
        rotate: 4,
        surface: 'surface',
        thumb: 'accentPink',
        icon: 'check',
        title: 'Rx approved',
        sub: 'Ready to dispatch',
      },
    ],
  },
  {
    card: 'accentCream',
    head: [{ text: 'Everything the' }, { text: 'cabinet', highlight: true }, { text: 'needs' }],
    body: 'Browse everyday medicines, vitamins, and healthcare essentials with secure checkout.',
    cta: 'Next',
    chips: [
      {
        box: { left: 15.19, top: 296, width: 151.998, height: 61.218 },
        rotate: 6,
        surface: 'surface',
        thumb: 'accentBlue',
        icon: 'cart',
        title: samples()[0]?.name ?? 'In stock today',
        sub: samples()[0] ? `${cedis(samples()[0].price)} · in stock` : 'Ready to dispatch',
      },
      {
        box: { left: 176, top: 267.88, width: 165.393, height: 59.944 },
        rotate: -5,
        surface: 'accentBlue',
        thumb: 'surface',
        icon: 'catalog',
        title: samples()[1]?.name ?? 'Over the counter',
        sub: samples()[1] ? `${cedis(samples()[1].price)} · OTC` : 'No prescription needed',
      },
      {
        box: { left: 36, top: 349.68, width: 129.899, height: 54.747 },
        rotate: -4,
        surface: 'surface',
        thumb: 'accentPink',
        icon: 'cart',
        title: `${PRODUCTS.length} items`,
        sub: `From ${shortName(p)}`,
      },
      {
        box: { left: 164.79, top: 366, width: 165.812, height: 57.258 },
        rotate: 4,
        surface: 'accentCream',
        thumb: 'surface',
        icon: 'send',
        title: 'Free delivery',
        sub: `Orders over ${cedis(FREE_DELIVERY_OVER)}`,
      },
    ],
  },
  {
    card: 'accentGold',
    head: [{ text: 'Stay' }, { text: 'well', highlight: true }, { text: 'between refills' }],
    body: 'Access expert health tips, nutrition advice, and structured workout routines to stay on top of your goals.',
    cta: 'Get started',
    chips: [
      {
        box: { left: 15.19, top: 296, width: 151.998, height: 61.218 },
        rotate: 6,
        surface: 'surface',
        thumb: 'accentGold',
        icon: 'award',
        title: `${programmeById().sessionsTotal}-session plan`,
        sub: programmeById().title,
      },
      {
        box: { left: 176, top: 267.88, width: 165.393, height: 59.944 },
        rotate: -5,
        surface: 'accentCream',
        thumb: 'surface',
        icon: 'heart',
        title: 'Resting HR 64',
        sub: 'Steady this week',
      },
      {
        box: { left: 36, top: 349.68, width: 129.899, height: 54.747 },
        rotate: -4,
        surface: 'accentBlue',
        thumb: 'surface',
        icon: 'wellness',
        title: ARTICLES[1].category,
        sub: cardMeta(ARTICLES[1]).split(' · ')[1] + ' read',
      },
      {
        box: { left: 164.79, top: 366, width: 165.812, height: 57.258 },
        rotate: 4,
        surface: 'surface',
        thumb: 'accentPink',
        icon: 'info',
        title: ARTICLES.find((a) => a.id === 'blood-pressure')?.category ?? 'Heart',
        sub: `${ARTICLES.find((a) => a.id === 'blood-pressure')?.minutes ?? 6} min read`,
      },
    ],
  },
];

export default function Onboarding() {
  const t = useTokens();
  const { d, width } = useDesignScale();
  const pharmacy = usePartnerPharmacy();
  const SLIDES = slidesFor(pharmacy);
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const scroller = useRef<ScrollView>(null);

  const finish = async () => {
    await markOnboarded();
    router.replace('/welcome');
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      scroller.current?.scrollTo({ x: (index + 1) * width, animated: true });
      setIndex(index + 1);
    } else {
      finish();
    }
  };

  // Ink on every card tone is dark: brand, cream and gold are all light surfaces.
  const cardInk = t.colors.text.onBrand;

  const chipInk = (surface: Chip['surface']) => {
    if (surface === 'surface') return { title: t.colors.text.primary, sub: t.colors.text.tertiary };
    if (surface === 'accentBlue') return { title: t.colors.text.onSolid, sub: t.colors.text.onSolid };
    return { title: t.colors.text.onBrand, sub: t.colors.text.onBrand };
  };

  const thumbIconTone = (thumb: Chip['thumb']) =>
    thumb === 'surface' ? t.colors.icon.primary : t.colors.icon.onBrand;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        scrollEventThrottle={16}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={{ width }}>
            {/* Hero card — Figma: 358 x 500 at (16, 52), radius 36, clipped */}
            <View
              style={{
                position: 'absolute',
                left: d(16),
                top: insets.top + d(6),
                width: d(358),
                height: d(500),
                borderRadius: d(36),
                backgroundColor: t.colors.bg[s.card],
                overflow: 'hidden',
              }}
            >
              {/* Skip — Figma: (264, 20), 1.5 border, padL16 padR12 padY9 */}
              <Pressable
                onPress={finish}
                accessibilityRole="button"
                accessibilityLabel="Skip onboarding"
                style={{
                  position: 'absolute',
                  left: d(264),
                  top: d(20),
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: d(6),
                  paddingLeft: d(16),
                  paddingRight: d(12),
                  paddingVertical: d(9),
                  borderRadius: t.radius.full,
                  borderWidth: 1.5,
                  borderColor: cardInk,
                }}
              >
                <Text variant="labelS" color={cardInk}>
                  Skip
                </Text>
                <Icon name="arrow-right" size={d(14)} color={cardInk} />
              </Pressable>

              {/* Headline — Figma: (28, 84), width 300, wrap gap 4 / 10 */}
              <View
                style={{
                  position: 'absolute',
                  left: d(28),
                  top: d(84),
                  width: d(300),
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  rowGap: d(4),
                  columnGap: d(10),
                }}
              >
                {s.head.map((w, k) =>
                  w.highlight ? (
                    <View
                      key={k}
                      style={{
                        backgroundColor: t.colors.bg.surface,
                        borderRadius: t.radius.full,
                        paddingHorizontal: d(16),
                        paddingTop: d(2),
                        paddingBottom: d(5),
                      }}
                    >
                      <Text variant="displayM" tone="primary" style={{ fontSize: d(34), lineHeight: d(38) }}>
                        {w.text}
                      </Text>
                    </View>
                  ) : (
                    <Text
                      key={k}
                      variant="displayM"
                      color={cardInk}
                      style={{ fontSize: d(34), lineHeight: d(38) }}
                    >
                      {w.text}
                    </Text>
                  ),
                )}
              </View>

              {/* Partner chips — exact rotated boxes from Figma */}
              {s.chips.map((c, k) => {
                const ink = chipInk(c.surface);
                return (
                  <View
                    key={k}
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      left: d(c.box.left),
                      top: d(c.box.top),
                      width: d(c.box.width),
                      height: d(c.box.height),
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <View
                      style={
                        {
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: d(8),
                          paddingLeft: d(7),
                          paddingRight: d(14),
                          paddingVertical: d(7),
                          borderRadius: t.radius.full,
                          backgroundColor: t.colors.bg[c.surface],
                          transform: [{ rotate: `${c.rotate}deg` }],
                          shadowColor: t.colors.shadow,
                          shadowOpacity: 0.18,
                          shadowRadius: d(12),
                          shadowOffset: { width: 0, height: d(4) },
                          elevation: 4,
                        } as ViewStyle
                      }
                    >
                      <View
                        style={{
                          width: d(30),
                          height: d(30),
                          borderRadius: t.radius.full,
                          backgroundColor: t.colors.bg[c.thumb],
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon name={c.icon} size={d(16)} color={thumbIconTone(c.thumb)} />
                      </View>
                      <View>
                        <Text variant="labelS" color={ink.title} style={{ fontSize: d(12), lineHeight: d(16) }}>
                          {c.title}
                        </Text>
                        <Text
                          variant="caption"
                          color={ink.sub}
                          style={{ fontSize: d(12), lineHeight: d(16), opacity: 0.75 }}
                        >
                          {c.sub}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Body — Figma: (24, 580), width 342 */}
            <Text
              variant="bodyL"
              tone="secondary"
              style={{
                position: 'absolute',
                left: d(24),
                top: insets.top + d(534),
                width: d(342),
                fontSize: d(16),
                lineHeight: d(24),
              }}
            >
              {s.body}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Pagination — Figma: (24, 672), gap 7, active 28x8 */}
      <View
        style={{
          position: 'absolute',
          left: d(24),
          top: insets.top + d(626),
          flexDirection: 'row',
          alignItems: 'center',
          gap: d(7),
        }}
      >
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={{
              width: i === index ? d(28) : d(8),
              height: d(8),
              borderRadius: t.radius.full,
              backgroundColor: i === index ? t.colors.bg.brand : t.colors.bg.surfaceRaised,
            }}
          />
        ))}
      </View>

      {/* CTA — Figma: (24, 708), 342 x 62, split pill with a 46pt dark arrow */}
      <Pressable
        onPress={next}
        accessibilityRole="button"
        accessibilityLabel={SLIDES[index].cta}
        style={{
          position: 'absolute',
          left: d(24),
          top: insets.top + d(662),
          width: d(342),
          height: d(62),
          borderRadius: t.radius.full,
          backgroundColor: t.colors.bg.brand,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: d(28),
          paddingRight: d(8),
        }}
      >
        <Text variant="labelL" color={t.colors.text.onBrand} style={{ fontSize: d(16), lineHeight: d(20) }}>
          {SLIDES[index].cta}
        </Text>
        <View
          style={{
            width: d(46),
            height: d(46),
            borderRadius: t.radius.full,
            backgroundColor: t.colors.bg.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="arrow-right" size={d(20)} color={t.colors.icon.primary} />
        </View>
      </Pressable>
    </View>
  );
}
