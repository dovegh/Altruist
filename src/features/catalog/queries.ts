/**
 * Catalogue reads.
 *
 * Thin React Query wrappers over `src/lib/api.ts`. They exist so that Catalog,
 * Search, Product Detail and the Cart's price join all share one cache — the
 * Cart does not re-fetch the catalogue to price a line the Catalog tab loaded a
 * second ago, and a product opened from Search renders instantly because the
 * list that produced it already warmed the entry.
 *
 * Query keys are the argument tuple, so a filter change is a different query
 * rather than a mutation of the current one, and the previous result stays on
 * screen while the new one loads.
 */
import { useQuery } from '@tanstack/react-query';
import { listProducts, getProduct, searchProducts } from '@/lib/api';
import type { CatalogFilter, SearchFilter } from '@/lib/catalog';

export const catalogKeys = {
  all: ['products'] as const,
  list: (filter: CatalogFilter) => ['products', 'list', filter] as const,
  detail: (id: string) => ['products', 'detail', id] as const,
  search: (query: string, filter: SearchFilter) => ['products', 'search', query, filter] as const,
};

export function useProducts(filter: CatalogFilter = 'All') {
  return useQuery({
    queryKey: catalogKeys.list(filter),
    queryFn: () => listProducts(filter),
    // A catalogue is not a status pill — it does not change while you look at
    // it, so the aggressive 30s default in the root client is wrong here.
    staleTime: 5 * 60_000,
    // Switching filter keeps the current grid up until the next one arrives,
    // instead of dropping back to the skeleton on every chip tap.
    placeholderData: (previous) => previous,
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: catalogKeys.detail(id ?? ''),
    queryFn: () => getProduct(id as string),
    enabled: !!id,
    staleTime: 5 * 60_000,
    // A 404 is an answer, not a hiccup. Retrying it three times only delays the
    // not-found state the user is already looking at a spinner instead of.
    retry: false,
  });
}

export function useProductSearch(query: string, filter: SearchFilter = 'All') {
  const q = query.trim();
  return useQuery({
    queryKey: catalogKeys.search(q, filter),
    queryFn: () => searchProducts(q, filter),
    enabled: q.length > 0,
    staleTime: 60_000,
    // Keeps the previous results on screen while the next query lands, so
    // typing does not flash the "No results" screen between keystrokes.
    placeholderData: (previous) => previous,
  });
}
