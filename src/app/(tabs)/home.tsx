/**
 * Home — ported 1:1 from Figma node 38:2 (SRS §4.B Tab 1).
 *
 * Figma lays this out as a vertical auto-layout scroll frame, so this is flex
 * rather than absolute — but every gap, padding, size and radius is transcribed
 * from the design and scaled by useDesignScale().
 *
 * Hero Action Card rule from the component docs: "THE loud card. One per screen,
 * never two. All ink is text/on-brand because every tone is a light,
 * high-chroma surface. Never put white text on these."
 */
import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { Text } from '@/components/ui/Text';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PrescriptionCard } from '@/components/ui/PrescriptionCard';
import { PromoCarousel } from '@/components/ui/PromoCarousel';
import { Shimmer, SkeletonBlock } from '@/components/ui/Skeleton';
import { usePromotions } from '@/features/promotions/queries';
import { usePrescriptionStore } from '@/features/prescriptions/store';
import { useCartCount } from '@/features/cart/useCart';
import { useProfile } from '@/features/profile/store';
import { firstName, greetingFor, initialsOf } from '@/lib/profile';
import { Avatar } from '@/components/ui/Avatar';
import { homeCategories } from '@/lib/catalog';
import { useProducts } from '@/features/catalog/queries';

/** Category tiles bind to `colors.tile.*` — see IconTile in ListRow.tsx. */
type TileHue = 'mint' | 'blue' | 'gold' | 'pink';

// Icons come from the Category Tile's `Icon` instance-swap property in Figma
// (added 2026-08-24 — the component previously had no icon property at all, so
// every tile inherited the master's camera glyph).

/** "Verified 23 Aug 2026 · 05:41 PM" — the card's third line. */
function stamp(p: { status: string; uploadedAt: number; reviewedAt?: number }): string {
  const verb =
    p.status === 'VERIFIED' ? 'Verified' : p.status === 'REJECTED' ? 'Reviewed' : 'Uploaded';
  const at = new Date(p.reviewedAt ?? p.uploadedAt);
  const date = at.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const time = at
    .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })
    .toUpperCase();
  return `${verb} ${date} · ${time}`;
}

export default function Home() {
  const profile = useProfile();
  const t = useTokens();
  const { d } = useDesignScale();
  const insets = useSafeAreaInsets();
  const cartCount = useCartCount();
  // The newest script, whatever state it is in. Showing only VERIFIED ones
  // would hide the rejection the user most needs to see.
  const recent = usePrescriptionStore((s) => s.items[0]);
  const { data: promotions, isPending: promosPending } = usePromotions();
  // Category counts come from the catalogue itself — see `homeCategories`.
  const { data: products } = useProducts();
  const CATEGORIES = homeCategories(products);

  const RoundAction = ({
    icon,
    label,
    onPress,
    badge = 0,
  }: {
    icon: IconName;
    label: string;
    onPress?: () => void;
    badge?: number;
  }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label}, ${badge} item${badge === 1 ? '' : 's'}` : label}
      onPress={onPress}
      style={{
        width: d(44),
        height: d(44),
        borderRadius: t.radius.full,
        backgroundColor: t.colors.bg.surfaceRaised,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={d(20)} tone="primary" />
      {badge ? (
        <View
          style={{
            position: 'absolute',
            top: d(1),
            right: d(1),
            minWidth: d(18),
            height: d(18),
            paddingHorizontal: d(5),
            borderRadius: t.radius.full,
            backgroundColor: t.colors.bg.brand,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: d(2),
            borderColor: t.colors.bg.canvas,
          }}
        >
          <Text
            variant="labelXS"
            color={t.colors.text.onBrand}
            style={{ fontSize: d(10), lineHeight: d(13) }}
          >
            {badge > 9 ? '9+' : badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );

  const SectionHeader = ({ title, onAction }: { title: string; onAction?: () => void }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(12), height: d(40) }}>
      <Text variant="headingL" style={{ flex: 1, fontSize: d(20), lineHeight: d(26) }}>
        {title}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View all ${title}`}
        onPress={onAction}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: d(4),
          paddingLeft: d(14),
          paddingRight: d(10),
          paddingVertical: d(7),
          borderRadius: t.radius.full,
          backgroundColor: t.colors.bg.surfaceRaised,
        }}
      >
        <Text variant="labelS" tone="secondary" style={{ fontSize: d(12), lineHeight: d(16) }}>
          View all
        </Text>
        <Icon name="chevron-right" size={d(16)} tone="secondary" />
      </Pressable>
    </View>
  );

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
        {/* Top App Bar — 56 high: avatar + greeting + two actions */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(12), height: d(56) }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Your profile"
            onPress={() => router.push('/profile')}
            hitSlop={4}
          >
            <Avatar
              initials={initialsOf(profile.name) || '?'}
              uri={profile.avatarUrl}
              preset={profile.avatarPreset}
              size={44}
              label="Your avatar"
            />
          </Pressable>
          <View style={{ flex: 1, gap: d(2) }}>
            <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
              {greetingFor()}
            </Text>
            {/* First name only: a greeting, not a form. "Good evening, Samuel",
                not the full name with its bracketed middle name. */}
            <Text variant="headingM" numberOfLines={1} style={{ fontSize: d(18), lineHeight: d(24) }}>
              {firstName(profile.name)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: d(8) }}>
            <RoundAction
              icon="notification"
              label="Notifications"
              onPress={() => router.push('/notifications')}
            />
            {/* Figma draws an overflow "more" in this slot with nothing behind
                it. The cart had no entry point on any tab root, so it takes the
                slot rather than adding a sixth control to a 56pt bar. */}
            <RoundAction
              icon="cart"
              label="Cart"
              badge={cartCount}
              onPress={() => router.push('/cart')}
            />
          </View>
        </View>

        {/* Promo carousel. Replaces the search field that used to sit here —
            that field was not a search box, it pushed straight to /catalog, and
            the Catalog tab plus the category grid below both still go there. */}
        {promosPending ? (
          <Shimmer>
            {/* Same shape as the ad slot, so the layout does not jump. */}
            <SkeletonBlock width="100%" height={164} radius={28} />
          </Shimmer>
        ) : (
          <PromoCarousel
            promotions={promotions ?? []}
            onPress={(promo) => router.push(promo.href as never)}
          />
        )}

        {/* Hero Action Card — one per screen, all ink text/on-brand */}
        <View
          style={{
            backgroundColor: t.colors.bg.brand,
            borderRadius: d(36),
            padding: d(24),
            gap: d(16),
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(12) }}>
            <Text
              variant="labelXS"
              color={t.colors.text.onBrand}
              style={{ flex: 1, opacity: 0.7, fontSize: d(11), lineHeight: d(14) }}
            >
              FASTEST WAY TO ORDER
            </Text>
            <View
              style={{
                width: d(44),
                height: d(44),
                borderRadius: t.radius.full,
                backgroundColor: t.colors.bg.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="camera" size={d(22)} tone="primary" />
            </View>
          </View>

          <Text
            variant="headingXL"
            color={t.colors.text.onBrand}
            style={{ fontSize: d(24), lineHeight: d(30) }}
          >
            Upload a prescription
          </Text>
          <Text
            variant="bodyM"
            color={t.colors.text.onBrand}
            style={{ opacity: 0.78, fontSize: d(14), lineHeight: d(21) }}
          >
            Snap it, send it. A licensed partner pharmacist reviews and fulfils it for you.
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Upload now"
            onPress={() => router.push('/prescriptions')}
            style={{
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: d(8),
              paddingHorizontal: d(22),
              paddingVertical: d(13),
              borderRadius: t.radius.full,
              backgroundColor: t.colors.bg.surface,
            }}
          >
            <Text variant="labelM" tone="primary" style={{ fontSize: d(14), lineHeight: d(18) }}>
              Upload now
            </Text>
            <Icon name="prescription" size={d(18)} tone="primary" />
          </Pressable>
        </View>

        <SectionHeader title="Shop by category" onAction={() => router.push('/catalog')} />

        {/* Category grid — 2 x 2, gap 14, tiles radius 28 padding 18 */}
        <View style={{ gap: d(14) }}>
          {[CATEGORIES.slice(0, 2), CATEGORIES.slice(2, 4)].map((row, r) => (
            <View key={r} style={{ flexDirection: 'row', gap: d(14) }}>
              {row.map((c) => (
                <Pressable
                  key={c.title}
                  accessibilityRole="button"
                  accessibilityLabel={`${c.title}. ${c.sub}`}
                  onPress={() => router.push(c.href as never)}
                  style={({ pressed }) => ({
                    flex: 1,
                    backgroundColor: t.colors.bg.surfaceRaised,
                    borderRadius: d(28),
                    padding: d(18),
                    gap: d(14),
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <View
                    style={{
                      width: d(40),
                      height: d(40),
                      borderRadius: d(13),
                      backgroundColor: t.colors.tile[`${c.hue}Bg`],
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name={c.icon} size={d(20)} color={t.colors.tile[`${c.hue}Icon`]} />
                  </View>
                  <Text
                    variant="labelL"
                    numberOfLines={2}
                    style={{ fontSize: d(16), lineHeight: d(20) }}
                  >
                    {c.title}
                  </Text>
                  {/* Pinned to the bottom of the tile. Tiles in a row stretch to
                      the taller one, so this keeps the counts on a single
                      baseline if a title ever wraps — without the dead gap that
                      reserving a second title line leaves when it does not. */}
                  <Text
                    variant="caption"
                    tone="primary"
                    numberOfLines={1}
                    style={{
                      marginTop: 'auto',
                      opacity: 0.7,
                      fontSize: d(12),
                      lineHeight: d(16),
                    }}
                  >
                    {c.sub}
                  </Text>
                </Pressable>
              ))}
            </View>
          ))}
        </View>

        {recent ? (
          <>
            <SectionHeader
              title="Recent prescriptions"
              onAction={() => router.push('/prescriptions')}
            />
            <PrescriptionCard
              title={`TrxID ${recent.id}`}
              note={recent.note}
              timestamp={stamp(recent)}
              status={recent.status}
              onPress={() =>
                router.push(
                  recent.status === 'REJECTED'
                    ? `/prescription-rejected?id=${recent.id}`
                    : `/prescription-viewer?id=${recent.id}`,
                )
              }
            />
          </>
        ) : null}

      </ScrollView>
    </View>
  );
}
