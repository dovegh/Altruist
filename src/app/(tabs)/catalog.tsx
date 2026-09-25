/**
 * Catalog — ported 1:1 from Figma node 38:138 (SRS §4.B Tab 2).
 *
 * Every product carries an Rx Badge. That is a compliance requirement from
 * SRS §3, not a styling choice — `requiresPrescription` is a required prop on
 * ProductCard so a card cannot be rendered without a classification.
 *
 * The loading state is Figma's "Loading — Catalog Skeleton": the same screen
 * with skeleton blocks in place of the search field, chips and cards. It is a
 * state of this screen, not a separate route — the design note is explicit that
 * a skeleton must show layout rather than a spinner, which only works if the
 * skeleton lives inside the layout it is standing in for. It is now driven by
 * the query rather than by a prop nothing ever passed.
 *
 * The header's second action is the cart. Figma draws an overflow "more" here,
 * but nothing behind it was ever specified and the cart had no entry point on
 * any tab root — an item added from this grid was unreachable until Product
 * Detail happened to push /cart.
 *
 * Rendering: a virtualised two-column FlatList. It used to be a ScrollView
 * that mounted all ~480 cards and started every photo download at once,
 * which is what made the tab slow to open and to scroll. Cards are memoised
 * and receive stable handlers, so a cart add does not re-render the grid.
 */
import React, { useCallback, useState } from 'react';
import { View, ScrollView, FlatList, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { TitleAppBar } from '@/components/ui/AppBar';
import { ProductCard, FilterChip, SearchField } from '@/components/ui/Product';
import { Shimmer, SkeletonBlock, ProductCardSkeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { cedis } from '@/lib/money';
import { packLine, CATALOG_FILTERS, type CatalogFilter, type Product } from '@/lib/catalog';
import { useProducts } from '@/features/catalog/queries';
import { useCartStore } from '@/features/cart/store';
import { useCartCount } from '@/features/cart/useCart';
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    title: 'Catalog',
    cart: 'Cart',
    loadError: 'Could not load the catalogue',
    loadErrorBody: 'Check your connection and try again.',
    tryAgain: 'Try again',
    emptyTitle: 'Nothing in {filter}',
    emptyBody: 'Nothing in this category today.',
    filterAll: 'All',
    filterPrescription: 'Prescription',
    filterOtc: 'OTC',
    filterVitamins: 'Vitamins',
  },
  fr: {
    title: 'Catalogue',
    cart: 'Panier',
    loadError: 'Impossible de charger le catalogue',
    loadErrorBody: 'Vérifiez votre connexion et réessayez.',
    tryAgain: 'Réessayer',
    emptyTitle: 'Rien dans {filter}',
    emptyBody: "Rien dans cette catégorie aujourd'hui.",
    filterAll: 'Tout',
    filterPrescription: 'Sur ordonnance',
    filterOtc: 'Sans ordonnance',
    filterVitamins: 'Vitamines',
  },
  tw: {
    title: 'Nneɛma',
    cart: 'Kɛntɛn',
    loadError: 'Yɛntumi mfaa nneɛma no mmaeɛ',
    loadErrorBody: 'Hwɛ wo intanɛt na san bɔ mmɔden.',
    tryAgain: 'San bɔ mmɔden',
    emptyTitle: 'Biribiara nni {filter} mu',
    emptyBody: 'Biribiara nni saa akuo yi mu nnɛ.',
    filterAll: 'Ne nyinaa',
    filterPrescription: 'Nnuro krataa',
    filterOtc: 'OTC',
    filterVitamins: 'Vitamin',
  },
  gaa: {
    title: 'Nibii',
    cart: 'Kɛntɛŋ',
    loadError: 'Wɔnyɛɛɛ nibii lɛ kɛbaa',
    loadErrorBody: 'Kwɛ o intanɛt ni oka ekoŋŋ.',
    tryAgain: 'Ka ekoŋŋ',
    emptyTitle: 'Nɔ ko bɛ {filter} mli',
    emptyBody: 'Nɔ ko bɛ akuu nɛɛ mli ŋmɛnɛ.',
    filterAll: 'Fɛɛ',
    filterPrescription: 'Tsofa wolo',
    filterOtc: 'OTC',
    filterVitamins: 'Vitamin',
  },
  ee: {
    title: 'Nuwo',
    cart: 'Kusi',
    loadError: 'Míete ŋu xɔ nuwo o',
    loadErrorBody: 'Kpɔ wò internet eye nàgadze agbagba.',
    tryAgain: 'Gadze agbagba',
    emptyTitle: 'Naneke meli le {filter} me o',
    emptyBody: 'Naneke meli le hatsotso sia me egbe o.',
    filterAll: 'Katã',
    filterPrescription: 'Atikeŋɔŋlɔ',
    filterOtc: 'OTC',
    filterVitamins: 'Vitamin',
  },
  ha: {
    title: 'Kayayyaki',
    cart: 'Kwando',
    loadError: 'Ba a iya loda kayayyakin ba',
    loadErrorBody: 'Duba haɗin intanet ɗinka ka sake gwadawa.',
    tryAgain: 'Sake gwadawa',
    emptyTitle: 'Babu komai a {filter}',
    emptyBody: 'Babu komai a wannan rukuni yau.',
    filterAll: 'Duka',
    filterPrescription: 'Takardar magani',
    filterOtc: 'OTC',
    filterVitamins: 'Bitamin',
  },
});

// Filter values stay English (they are query values); only the chip text is translated.
const FILTER_LABELS: Record<CatalogFilter, keyof (typeof S)['en']> = {
  All: 'filterAll',
  Prescription: 'filterPrescription',
  OTC: 'filterOtc',
  Vitamins: 'filterVitamins',
};

export default function Catalog() {
  const t = useTokens();
  const tr = useT(S);
  const { d } = useDesignScale();
  const insets = useSafeAreaInsets();
  /**
   * Opened from a Home category tile, which passes the category it names.
   * Without this both "Over the counter" and "Vitamins" landed on the same
   * unfiltered list, so the tiles looked like they did nothing.
   */
  const { filter: opening } = useLocalSearchParams<{ filter?: string }>();
  const initial = CATALOG_FILTERS.find((f) => f === opening) ?? 'All';
  const [filter, setFilter] = useState<CatalogFilter>(initial);

  const { data: products, isPending, isError, refetch } = useProducts(filter);
  const add = useCartStore((s) => s.add);
  const cartCount = useCartCount();

  const onAdd = useCallback(
    (id: string) => {
      add(id);
      // The card gives no other confirmation — the item leaves for a screen the
      // user is not on. The tick is the receipt.
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    },
    [add],
  );

  const items = products ?? [];
  const padH = d(24);

  const header = (
    <View style={{ gap: d(20), paddingBottom: d(20) }}>
      <TitleAppBar
        title={tr('title')}
        showBack={false}
        actions={[
          { icon: 'cart', label: tr('cart'), badge: cartCount, onPress: () => router.push('/cart') },
        ]}
      />
      {isPending && !products ? null : (
        <>
          <SearchField onPress={() => router.push('/search')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: d(10) }}>
            {CATALOG_FILTERS.map((f) => (
              <FilterChip key={f} label={tr(FILTER_LABELS[f])} selected={filter === f} onPress={() => setFilter(f)} />
            ))}
          </ScrollView>
        </>
      )}
    </View>
  );

  const empty = isPending ? (
    <Shimmer style={{ gap: d(20) }}>
      <SkeletonBlock width="100%" height={52} radius={999} />
      <View style={{ flexDirection: 'row', gap: d(10) }}>
        {[72, 118, 82, 96].map((w) => (
          <SkeletonBlock key={w} width={w} height={42} radius={999} />
        ))}
      </View>
      <View style={{ gap: d(14) }}>
        {[0, 1].map((row) => (
          <View key={row} style={{ flexDirection: 'row', gap: d(14) }}>
            <ProductCardSkeleton />
            <ProductCardSkeleton />
          </View>
        ))}
      </View>
    </Shimmer>
  ) : isError ? (
    <View style={{ gap: d(14), paddingTop: d(40) }}>
      <Text variant="headingM" center style={{ fontSize: d(18), lineHeight: d(24) }}>
        {tr('loadError')}
      </Text>
      <Text variant="bodyM" tone="secondary" center style={{ fontSize: d(14), lineHeight: d(21) }}>
        {tr('loadErrorBody')}
      </Text>
      <Button label={tr('tryAgain')} variant="secondary" size="large" onPress={() => refetch()} />
    </View>
  ) : (
    <View style={{ gap: d(10), paddingTop: d(40) }}>
      <Text variant="headingM" center style={{ fontSize: d(18), lineHeight: d(24) }}>
        {tr('emptyTitle', { filter: tr(FILTER_LABELS[filter]) })}
      </Text>
      <Text variant="bodyM" tone="secondary" center style={{ fontSize: d(14), lineHeight: d(21) }}>
        {tr('emptyBody')}
      </Text>
    </View>
  );

  const renderItem = useCallback(
    ({ item: p }: { item: Product }) => (
      <CatalogCard product={p} onAdd={onAdd} />
    ),
    [onAdd],
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      <FlatList
        data={isError ? [] : items}
        keyExtractor={(p) => p.id}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={{ gap: d(12) }}
        ItemSeparatorComponent={() => <View style={{ height: d(12) }} />}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + d(18),
          paddingHorizontal: padH,
          paddingBottom: d(120) + insets.bottom,
        }}
        // A screenful and a little either side; the rest mounts as you scroll.
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
      />
    </View>
  );
}

/**
 * One grid cell. Memoised with stable props, so adding one product to the cart
 * re-renders one card, not the whole list. The spacer keeps a lone last card
 * at half width — FlatList columns already handle that; the flex:1 cell does.
 */
const CatalogCard = React.memo(function CatalogCard({
  product: p,
  onAdd,
}: {
  product: Product;
  onAdd: (id: string) => void;
}) {
  const open = useCallback(() => router.push(`/product?id=${p.id}`), [p.id]);
  const addThis = useCallback(() => onAdd(p.id), [onAdd, p.id]);
  return (
    <View style={{ flex: 1, maxWidth: '50%' }}>
      <ProductCard
        name={p.name}
        pack={packLine(p)}
        price={cedis(p.price)}
        requiresPrescription={p.requiresPrescription}
        inStock={p.inStock}
        imageUrl={p.imageUrl}
        onPress={open}
        onAdd={addThis}
      />
    </View>
  );
});
