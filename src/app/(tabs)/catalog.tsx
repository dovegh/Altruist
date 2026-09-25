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
 */
import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
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

export default function Catalog() {
  const t = useTokens();
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

  const onAdd = (id: string) => {
    add(id);
    // The card gives no other confirmation — the item leaves for a screen the
    // user is not on. The tick is the receipt.
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  // Two per row, in catalogue order.
  const items = products ?? [];
  const rows: Product[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));

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
        <TitleAppBar
          title="Catalog"
          showBack={false}
          actions={[
            { icon: 'cart', label: 'Cart', badge: cartCount, onPress: () => router.push('/cart') },
          ]}
        />

        {isPending ? (
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
        ) : (
          <>
            <SearchField onPress={() => router.push('/search')} />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: d(10) }}
            >
              {CATALOG_FILTERS.map((f) => (
                <FilterChip
                  key={f}
                  label={f}
                  selected={filter === f}
                  onPress={() => setFilter(f)}
                />
              ))}
            </ScrollView>

            {isError ? (
              <View style={{ gap: d(14), paddingTop: d(40) }}>
                <Text variant="headingM" center style={{ fontSize: d(18), lineHeight: d(24) }}>
                  Could not load the catalogue
                </Text>
                <Text
                  variant="bodyM"
                  tone="secondary"
                  center
                  style={{ fontSize: d(14), lineHeight: d(21) }}
                >
                  The pharmacy’s stock list did not come through. Your cart is untouched.
                </Text>
                <Button label="Try again" variant="secondary" size="large" onPress={() => refetch()} />
              </View>
            ) : rows.length === 0 ? (
              <View style={{ gap: d(10), paddingTop: d(40) }}>
                <Text variant="headingM" center style={{ fontSize: d(18), lineHeight: d(24) }}>
                  Nothing in {filter}
                </Text>
                <Text
                  variant="bodyM"
                  tone="secondary"
                  center
                  style={{ fontSize: d(14), lineHeight: d(21) }}
                >
                  This partner does not stock anything in that category today.
                </Text>
              </View>
            ) : (
              <View style={{ gap: d(12) }}>
                {rows.map((row, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: d(12) }}>
                    {row.map((p) => (
                      <ProductCard
                        key={p.id}
                        name={p.name}
                        pack={packLine(p)}
                        price={cedis(p.price)}
                        requiresPrescription={p.requiresPrescription}
                        inStock={p.inStock}
                        imageUrl={p.imageUrl}
                        onPress={() => router.push(`/product?id=${p.id}`)}
                        onAdd={() => onAdd(p.id)}
                      />
                    ))}
                    {/* Keeps a lone last card at half width rather than
                        stretching it across the grid. */}
                    {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
