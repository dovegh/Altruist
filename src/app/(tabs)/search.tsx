/**
 * Search — ported 1:1 from the Figma frames "Search — Results" and
 * "Search — No Results".
 *
 * Two frames, one screen: they are the populated and empty states of the same
 * surface, and the search header is identical in both. Splitting them in code
 * would mean two places to keep the header in sync.
 *
 * Scroll content: V gap16 (results) / gap20 (empty), pad 64/24/120/24. It lives
 * under (tabs) because Figma draws the Bottom Tab Bar on both frames — the tab
 * bar highlights Catalog, which is where search is entered from.
 */
import React, { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { FilterChip } from '@/components/ui/Product';
import { SearchResultRow } from '@/components/ui/SearchResultRow';
import { Shimmer, SkeletonBlock } from '@/components/ui/Skeleton';
import { cedis } from '@/lib/money';
import { brandLine, searchFiltersFor, type SearchFilter } from '@/lib/catalog';
import { useProductSearch } from '@/features/catalog/queries';
import { useCartStore } from '@/features/cart/store';
import { searchSuggestions } from '@/lib/catalog';
import { useProducts } from '@/features/catalog/queries';
import { useRecentSearchStore } from '@/features/catalog/recent';
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    placeholder: 'Search medicines, vitamins, brands',
    clearSearch: 'Clear search',
    cancel: 'Cancel',
    recent: 'RECENT SEARCHES',
    clear: 'Clear',
    trySearching: 'TRY SEARCHING FOR',
    hint: 'Search by brand or ingredient.',
    noResults: 'No results for “{query}”',
    noResultsIn: 'No results for “{query}” in {filter}',
    noResultsBody:
      'Check the spelling, or search by the active ingredient rather than the brand name.',
    didYouMean: 'DID YOU MEAN',
    browse: 'Browse the catalogue',
    uploadInstead: 'Upload a prescription instead',
    resultsOne: '{count} result · sorted by relevance',
    resultsMany: '{count} results · sorted by relevance',
    filterAll: 'All',
    filterRx: 'Rx only',
    filterOtc: 'OTC',
    filterInStock: 'In stock',
  },
  fr: {
    placeholder: 'Rechercher médicaments, vitamines, marques',
    clearSearch: 'Effacer la recherche',
    cancel: 'Annuler',
    recent: 'RECHERCHES RÉCENTES',
    clear: 'Effacer',
    trySearching: 'ESSAYEZ DE CHERCHER',
    hint: 'Cherchez par marque ou par principe actif.',
    noResults: 'Aucun résultat pour « {query} »',
    noResultsIn: 'Aucun résultat pour « {query} » dans {filter}',
    noResultsBody:
      "Vérifiez l'orthographe, ou cherchez par principe actif plutôt que par nom de marque.",
    didYouMean: 'VOULIEZ-VOUS DIRE',
    browse: 'Parcourir le catalogue',
    uploadInstead: 'Envoyer plutôt une ordonnance',
    resultsOne: '{count} résultat · par pertinence',
    resultsMany: '{count} résultats · par pertinence',
    filterAll: 'Tout',
    filterRx: 'Sur ordonnance',
    filterOtc: 'Sans ordonnance',
    filterInStock: 'En stock',
  },
  tw: {
    placeholder: 'Hwehwɛ nnuro, vitamin, din',
    clearSearch: 'Pepa deɛ wohwehwɛeɛ',
    cancel: 'Gyae',
    recent: 'DEƐ WOHWEHWƐƐ NNANSA YI',
    clear: 'Pepa',
    trySearching: 'HWEHWƐ EYINOM',
    hint: 'Hwehwɛ wɔ din anaa nneɛma a ɛwɔ mu so.',
    noResults: 'Yɛanhu “{query}”',
    noResultsIn: 'Yɛanhu “{query}” wɔ {filter} mu',
    noResultsBody:
      'Hwɛ sɛnea woakyerɛw no, anaa hwehwɛ aduro no mu adeɛ titire na ɛnyɛ ne din.',
    didYouMean: 'NA WOPƐ SƐ WOKA',
    browse: 'Hwɛ nneɛma no',
    uploadInstead: 'Fa nnuro krataa to so mmom',
    resultsOne: 'Yɛahu {count} · deɛ ɛfata di kan',
    resultsMany: 'Yɛahu {count} · deɛ ɛfata di kan',
    filterAll: 'Ne nyinaa',
    filterRx: 'Rx nko ara',
    filterOtc: 'OTC',
    filterInStock: 'Ɛwɔ hɔ',
  },
  gaa: {
    placeholder: 'Tao tsofai, vitamin, gbɛi',
    clearSearch: 'Jiemɔ taomɔ lɛ',
    cancel: 'Kpa',
    recent: 'TAOMƆI NI BA NYƐ',
    clear: 'Jiemɔ',
    trySearching: 'TAO NƐƐMƐI',
    hint: 'Tao yɛ gbɛi loo nɔ ni yɔɔ mli nɔ.',
    noResults: 'Ana “{query}” ko',
    noResultsIn: 'Ana “{query}” ko yɛ {filter} mli',
    noResultsBody:
      'Kwɛ bɔ ni oŋma lɛ, loo otao tsofa lɛ mli nɔ titri lɛ yɛ gbɛi lɛ najiaŋ.',
    didYouMean: 'ANI OSUMƆƆ AKƐ',
    browse: 'Kwɛ nibii lɛ',
    uploadInstead: 'Kɛ tsofa wolo wo mli moŋ',
    resultsOne: 'Ana nɔ {count} · nɔ ni sa fe fɛɛ klɛŋklɛŋ',
    resultsMany: 'Ana nibii {count} · nɔ ni sa fe fɛɛ klɛŋklɛŋ',
    filterAll: 'Fɛɛ',
    filterRx: 'Rx pɛ',
    filterOtc: 'OTC',
    filterInStock: 'Eyɛ',
  },
  ee: {
    placeholder: 'Di atikewo, vitamin, ŋkɔwo',
    clearSearch: 'Tutu didi la',
    cancel: 'Dzudzɔ',
    recent: 'DIDI YEYEWO',
    clear: 'Tutu',
    trySearching: 'DI NU SIAWO',
    hint: 'Di le ŋkɔ alo nu si le eme nu.',
    noResults: 'Womekpɔ “{query}” o',
    noResultsIn: 'Womekpɔ “{query}” le {filter} me o',
    noResultsBody:
      'Kpɔ ale si nèŋlɔe, alo di atike la me nu vevitɔ ɖe ŋkɔ la teƒe.',
    didYouMean: 'ƉE NÈDI BE',
    browse: 'Kpɔ nuwo',
    uploadInstead: 'Ɖo atikeŋɔŋlɔ ɖa boŋ',
    resultsOne: 'Nu {count} · esi sɔ wu gbã',
    resultsMany: 'Nu {count} · esi sɔ wu gbã',
    filterAll: 'Katã',
    filterRx: 'Rx ɖeɖe',
    filterOtc: 'OTC',
    filterInStock: 'Esiwo li',
  },
  ha: {
    placeholder: 'Nemo magunguna, bitamin, alamu',
    clearSearch: 'Share bincike',
    cancel: 'Soke',
    recent: 'BINCIKEN BAYA-BAYAN NAN',
    clear: 'Share',
    trySearching: 'GWADA NEMAN',
    hint: 'Nema ta alama ko sinadari.',
    noResults: 'Babu sakamako ga “{query}”',
    noResultsIn: 'Babu sakamako ga “{query}” a {filter}',
    noResultsBody: 'Duba rubutun, ko ka nemi sinadarin maganin maimakon sunan alama.',
    didYouMean: 'KO KANA NUFIN',
    browse: 'Duba kayayyaki',
    uploadInstead: 'Ɗora takardar magani maimakon haka',
    resultsOne: 'Sakamako {count} · bisa dacewa',
    resultsMany: 'Sakamako {count} · bisa dacewa',
    filterAll: 'Duka',
    filterRx: 'Rx kaɗai',
    filterOtc: 'OTC',
    filterInStock: 'Akwai a kanti',
  },
});

// Filter values stay English (they are query values); only the chip text is translated.
const FILTER_LABELS: Record<SearchFilter, keyof (typeof S)['en']> = {
  All: 'filterAll',
  'Rx only': 'filterRx',
  OTC: 'filterOtc',
  'In stock': 'filterInStock',
};


export default function Search() {
  const t = useTokens();
  const tr = useT(S);
  const { d } = useDesignScale();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const { data: allProducts } = useProducts();
  const SUGGESTIONS = searchSuggestions(allProducts);
  // Only the filters this catalogue can satisfy — an "Rx only" chip that can
  // never match reads as broken search rather than an empty category.
  const FILTERS = searchFiltersFor(allProducts);
  const [filter, setFilter] = useState<SearchFilter>('All');
  const add = useCartStore((s) => s.add);
  const recent = useRecentSearchStore((s) => s.terms);
  const recordSearch = useRecentSearchStore((s) => s.record);
  const clearRecent = useRecentSearchStore((s) => s.clear);

  const { data, isFetching } = useProductSearch(query, filter);
  const results = data ?? [];

  // Recorded when a term actually returns something, not on every keystroke:
  // the history should be things the user found, not things they mistyped.
  useEffect(() => {
    if (!isFetching && query.trim().length > 1 && results.length > 0) {
      recordSearch(query);
    }
  }, [isFetching, query, results.length, recordSearch]);

  // A filter that has been narrowed away must not stay selected.
  useEffect(() => {
    if (!FILTERS.includes(filter)) setFilter('All');
  }, [FILTERS, filter]);

  const chipRow = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: d(10) }}>
      {FILTERS.map((f) => (
        <FilterChip key={f} label={tr(FILTER_LABELS[f])} selected={filter === f} onPress={() => setFilter(f)} />
      ))}
    </ScrollView>
  );
  // `isFetching` alone flickers the skeleton on every keystroke, because
  // `placeholderData` keeps the previous results on screen while the next
  // request lands. The skeleton is only for the first search of a term.
  const searching = isFetching && results.length === 0 && query.trim().length > 0;

  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(12) }}>
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: d(10),
          height: d(52),
          paddingLeft: d(18),
          paddingRight: d(10),
          borderRadius: t.radius.full,
          backgroundColor: t.colors.bg.surfaceRaised,
          borderWidth: 2,
          borderColor: t.colors.border.focus,
        }}
      >
        <Icon name="search" size={d(20)} tone="primary" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
          placeholder={tr('placeholder')}
          placeholderTextColor={t.colors.text.placeholder}
          accessibilityLabel={tr('placeholder')}
          style={{
            flex: 1,
            padding: 0,
            fontFamily: t.typography.bodyM.fontFamily,
            fontSize: d(14),
            lineHeight: d(21),
            color: t.colors.text.primary,
          }}
        />
        {query.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr('clearSearch')}
            hitSlop={10}
            onPress={() => setQuery('')}
            style={{
              width: d(26),
              height: d(26),
              borderRadius: t.radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: t.colors.bg.surfaceSunken,
            }}
          >
            <Icon name="close" size={d(13)} tone="secondary" />
          </Pressable>
        ) : null}
      </View>
      <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.back()}>
        <Text variant="labelM" tone="brand" style={{ fontSize: d(14), lineHeight: d(18) }}>
          {tr('cancel')}
        </Text>
      </Pressable>
    </View>
  );

  /**
   * Nothing typed yet. The field autofocuses, so this is the first thing a user
   * sees on this screen — showing "No results for “”" instead, which is what a
   * two-state results/empty split does, reads as a bug on arrival.
   */
  const idle = (
    <>
      <View style={{ height: d(24) }} />

      {recent.length ? (
        <View
          style={{
            gap: d(12),
            paddingVertical: d(16),
            paddingHorizontal: d(18),
            borderRadius: d(20),
            backgroundColor: t.colors.bg.surface,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(8) }}>
            <Text
              variant="labelXS"
              tone="tertiary"
              style={{ flex: 1, fontSize: d(11), lineHeight: d(14) }}
            >
              {tr('recent')}
            </Text>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={clearRecent}>
              <Text variant="labelS" tone="brand" style={{ fontSize: d(12), lineHeight: d(16) }}>
                {tr('clear')}
              </Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: d(8) }}>
            {recent.map((term) => (
              <FilterChip key={term} label={term} onPress={() => setQuery(term)} />
            ))}
          </View>
        </View>
      ) : null}

      <View
        style={{
          gap: d(12),
          paddingVertical: d(16),
          paddingHorizontal: d(18),
          borderRadius: d(20),
          backgroundColor: t.colors.bg.surface,
        }}
      >
        <Text variant="labelXS" tone="tertiary" style={{ fontSize: d(11), lineHeight: d(14) }}>
          {tr('trySearching')}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: d(8) }}>
          {SUGGESTIONS.map((sug) => (
            <FilterChip key={sug} label={sug} onPress={() => setQuery(sug)} />
          ))}
        </View>
      </View>
      <Text variant="bodyS" tone="secondary" center style={{ fontSize: d(13), lineHeight: d(19) }}>
        {tr('hint')}
      </Text>
    </>
  );

  const searchingState = (
    <Shimmer style={{ gap: d(14) }}>
      <View style={{ flexDirection: 'row', gap: d(10) }}>
        {[64, 96, 74, 104].map((w) => (
          <SkeletonBlock key={w} width={w} height={42} radius={999} />
        ))}
      </View>
      {[0, 1, 2].map((i) => (
        <SkeletonBlock key={i} width="100%" height={82} radius={20} />
      ))}
    </Shimmer>
  );

  const empty = (
    <>
      {/* The filter row stays reachable with no results: "no matches" is very
          often "no matches in this filter", and the way out is one tap. */}
      {chipRow}

      <View style={{ height: d(24) }} />

      <View
        style={{
          width: d(132),
          height: d(132),
          borderRadius: t.radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: t.colors.bg.surface,
          alignSelf: 'flex-start',
        }}
      >
        <Icon name="search" size={d(50)} tone="secondary" />
      </View>

      <View style={{ gap: d(10) }}>
        <Text variant="headingXL" center style={{ fontSize: d(24), lineHeight: d(30) }}>
          {filter === 'All'
            ? tr('noResults', { query })
            : tr('noResultsIn', { query, filter: tr(FILTER_LABELS[filter]) })}
        </Text>
        <Text
          variant="bodyM"
          tone="secondary"
          center
          style={{ fontSize: d(14), lineHeight: d(21) }}
        >
          {tr('noResultsBody')}
        </Text>
      </View>

      {/* Did you mean — bg/surface, r20, pad 16/18, gap 12 */}
      <View
        style={{
          gap: d(12),
          paddingVertical: d(16),
          paddingHorizontal: d(18),
          borderRadius: d(20),
          backgroundColor: t.colors.bg.surface,
        }}
      >
        <Text variant="labelXS" tone="tertiary" style={{ fontSize: d(11), lineHeight: d(14) }}>
          {tr('didYouMean')}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: d(8) }}>
          {SUGGESTIONS.map((s) => (
            <FilterChip key={s} label={s} onPress={() => setQuery(s)} />
          ))}
        </View>
      </View>

      <Button
        label={tr('browse')}
        size="large"
        onPress={() => router.replace('/catalog')}
      />
      <Button
        label={tr('uploadInstead')}
        variant="tertiary"
        size="large"
        onPress={() => router.push('/prescription-upload')}
      />
    </>
  );

  const found = (
    <>
      {chipRow}

      <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
        {tr(results.length === 1 ? 'resultsOne' : 'resultsMany', { count: results.length })}
      </Text>

      {results.map((p) => (
        <SearchResultRow
          key={p.id}
          name={p.name}
          pack={brandLine(p)}
          price={cedis(p.price)}
          requiresPrescription={p.requiresPrescription}
          imageUrl={p.imageUrl}
          onPress={() => router.push(`/product?id=${p.id}`)}
          onAdd={() => add(p.id)}
        />
      ))}
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + d(18),
          paddingHorizontal: d(24),
          paddingBottom: d(120) + insets.bottom,
          gap: d(results.length ? 16 : 20),
        }}
      >
        {header}
        {!query.trim() ? idle : searching ? searchingState : results.length ? found : empty}
      </ScrollView>
    </View>
  );
}
