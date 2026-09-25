/**
 * The product catalogue — types, and the development fixture behind them.
 *
 * Until `EXPO_PUBLIC_API_URL` is set this array *is* the catalogue. Screens
 * never import it: they go through the query hooks in
 * `src/features/catalog/queries.ts`, which go through `src/lib/api.ts`. That
 * indirection is the whole point — when the gateway lands, the fixture below is
 * deleted and nothing above it changes.
 *
 * Before this existed the same handful of products was typed out again in
 * Catalog, Search, Cart and Product Detail, in four different shapes. One
 * catalogue, one price.
 *
 * `requiresPrescription` is not optional and has no default. SRS §3 requires
 * every product to carry a regulatory classification, and a default would let
 * an unclassified medicine reach a card by omission.
 */

import { VAFY_OTC } from './catalog.generated';
import { PROGRAMMES } from './wellness';

export type ProductCategory = 'Prescription' | 'OTC' | 'Vitamins';

export type Product = {
  id: string;
  name: string;
  /** Manufacturer. Shown next to the pack size on every surface. */
  brand: string;
  /** Pack description — "Pack of 21", "100ml". */
  pack: string;
  /** Whole cedis. See `src/lib/money.ts`. */
  price: number;
  /** SRS §3 `products.requires_prescription`. Required, never defaulted. */
  requiresPrescription: boolean;
  inStock: boolean;
  category: ProductCategory;
  /** Product Detail key facts. */
  form: string;
  dosage: string;
  ships: string;
  /** "₵2 per capsule" — the unit maths, when the pack makes it meaningful. */
  unitNote?: string;
  description: string;
  rating: number;
  reviews: number;
  /** SRS §3 `products.pharmacy_id` — in an aggregator, stock is per-pharmacy. */
  pharmacy: string;
  pharmacyMeta: string;
  /** Extra terms a user might search by — active ingredient, common brand. */
  keywords?: string[];
  /**
   * Product photograph, as a remote URL.
   *
   * Remote rather than bundled: the VAFY catalogue's 473 images come to 56 MB,
   * which is most of an app download for pictures that change whenever the
   * shop restocks. Cards fall back to the placeholder glyph while it loads or
   * if it fails.
   */
  imageUrl?: string;
};

/** "Pack of 21 · Kinapharma" — the Product Card's second line. */
export const packLine = (p: Product) => [p.pack, p.brand].filter(Boolean).join(' · ');

/** "Kinapharma · Pack of 21" — the Search Result Row's second line. */
export const brandLine = (p: Product) => [p.brand, p.pack].filter(Boolean).join(' · ');

/**
 * The catalogue the app renders — the real VAFY range, nothing else.
 *
 * Generated from the Shopify export by `node tools/catalogue.mjs otc`: the 482
 * products that sit in a consumer category and are not prescription-only.
 *
 * **There are no prescription products in here at all**, and that is a
 * statement about the import rather than about VAFY's shelves. The dispensary
 * lines — antibiotics, antihypertensives, the controlled substances — exist in
 * the export but are held back until a pharmacist has signed off
 * data/vafy-classification-draft.csv. Until then the Rx badge only ever reads
 * OTC, the Prescription filter is empty, and the cart's prescription gate has
 * nothing to block on. Run `tools/catalogue.mjs seed` once that file is
 * complete and all three come back on their own.
 */
export const PRODUCTS: Product[] = VAFY_OTC;

/** Catalog's filter chips, in Figma's order. `All` is not a category. */
export type CatalogFilter = 'All' | ProductCategory;
/**
 * Derived from what is actually stocked, not hardcoded.
 *
 * Figma draws all four chips, but the catalogue is currently the OTC slice, so
 * a Prescription chip would open an empty grid whose empty state reads "this
 * partner does not stock anything in that category" — which is untrue. VAFY
 * stocks plenty of prescription medicine; it is held back pending review.
 *
 * Deriving it means the chip disappears now and comes back on its own the day
 * `tools/catalogue.mjs seed` adds the Rx lines, with nothing to remember.
 */
export const CATALOG_FILTERS: CatalogFilter[] = [
  'All',
  ...(['Prescription', 'OTC', 'Vitamins'] as const).filter((c) =>
    PRODUCTS.some((p) => p.category === c),
  ),
];

/** Search's filter chips. These cut across category rather than replacing it. */
export type SearchFilter = 'All' | 'Rx only' | 'OTC' | 'In stock';
/**
 * Search filters, narrowed to the ones the loaded catalogue can satisfy.
 *
 * "Rx only" against an OTC-only catalogue is a chip that always returns
 * nothing — the user reads that as broken search, not as an empty category.
 * Derived the same way `CATALOG_FILTERS` is.
 */
export function searchFiltersFor(products: Product[] | undefined): SearchFilter[] {
  const all = products ?? PRODUCTS;
  const filters: SearchFilter[] = ['All'];
  if (all.some((p) => p.requiresPrescription)) filters.push('Rx only');
  if (all.some((p) => !p.requiresPrescription)) filters.push('OTC');
  if (all.some((p) => !p.inStock)) filters.push('In stock');
  return filters;
}

/** Every filter the type allows. Prefer `searchFiltersFor`. */
export const SEARCH_FILTERS: SearchFilter[] = ['All', 'Rx only', 'OTC', 'In stock'];

/**
 * Name, brand and keyword match.
 *
 * Keywords are what make "panadol" find paracetamol and "antibiotic" find all
 * four amoxicillins. Searching the display name alone returns nothing for
 * either — which is the failure the "No results" screen exists to catch, not
 * one the search should be manufacturing.
 */
export function matches(p: Product, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return (
    p.name.toLowerCase().includes(q) ||
    p.brand.toLowerCase().includes(q) ||
    (p.keywords ?? []).some((k) => k.includes(q))
  );
}

/**
 * The Home tab's four category tiles.
 *
 * The counts are computed from the catalogue that is actually loaded, not
 * written down: "840 items" stopped being true the moment the VAFY import
 * replaced the demo products, and nobody noticed because it was a string.
 * A category with nothing in it shows its purpose instead of "0 items".
 */
export type HomeCategory = {
  title: string;
  sub: string;
  hue: 'mint' | 'blue' | 'gold' | 'pink';
  icon: 'prescription' | 'cart' | 'wellness' | 'award';
  href: string;
};

export function homeCategories(products: Product[] | undefined): HomeCategory[] {
  const count = (c: ProductCategory) => (products ?? []).filter((p) => p.category === c).length;
  const items = (n: number) => (n ? `${n} item${n === 1 ? '' : 's'}` : 'Browse');
  return [
    { title: 'Prescriptions', sub: 'Upload & track', hue: 'mint', icon: 'prescription', href: '/prescriptions' },
    // Spaced, not hyphenated: React Native does not hyphenate, so the single
    // token was character-wrapped and left an orphaned "r" on line two. It also
    // matches the Rx badge's full label, which already reads OVER THE COUNTER.
    { title: 'Over the counter', sub: items(count('OTC')), hue: 'blue', icon: 'cart', href: '/catalog?filter=OTC' },
    { title: 'Vitamins', sub: items(count('Vitamins')), hue: 'gold', icon: 'wellness', href: '/catalog?filter=Vitamins' },
    // "Plans & gear" promised a shop that does not exist. The count is real.
    { title: 'Fitness', sub: `${PROGRAMMES.length} plans`, hue: 'pink', icon: 'award', href: '/wellness' },
  ];
}

/**
 * Search starter chips — the most-stocked brands in the catalogue.
 *
 * Derived rather than listed: the previous three were antibiotic names that
 * return nothing at all against an OTC-only catalogue, which makes the feature
 * look broken the first time anyone taps one.
 */
export function searchSuggestions(products: Product[] | undefined, limit = 3): string[] {
  const counts = new Map<string, number>();
  for (const p of products ?? []) {
    const word = p.name.split(/\s+/)[0]?.toLowerCase();
    if (word && word.length > 3 && !/^[0-9]/.test(word)) {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word]) => word);
}
