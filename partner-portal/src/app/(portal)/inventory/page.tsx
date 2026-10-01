/**
 * Inventory — Figma 149:410.
 *
 * Every product listed for this pharmacy, with filter chips (All · In stock ·
 * Low · Out of stock · Prescription only) and a name/brand search. Both live in
 * the URL (`?filter=&q=&page=`), filtered here on the server, so a link such as
 * the Dashboard's `/inventory?q=Amoxicillin` opens straight onto the product.
 *
 * Needs attention = not orderable, or 10 or fewer left. "Low" counts only
 * products that can still be ordered; one switched off is under Out of stock.
 *
 * Stock is edited by any staff member, price only by a registered pharmacist,
 * Rx / OTC by nobody here. Products are added by Altruist after a
 * classification review, so "Add product" is an email, not a form.
 *
 * ~500 rows: 100 per page keeps the table quick to render and to scan.
 */
import type { Metadata } from 'next';
import Form from 'next/form';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { getMe } from '@/lib/portal';
import { supabaseServer } from '@/lib/supabase/server';
import { ProductRow } from './ProductRow';
import { isLow, isOut, type InventoryFilter, type InventoryRow } from './types';
import styles from './inventory.module.css';

export const metadata: Metadata = { title: 'Inventory' };

const PAGE_SIZE = 100;

const FILTERS: { key: InventoryFilter; label: string; test: (r: InventoryRow) => boolean }[] = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'in', label: 'In stock', test: (r) => !isOut(r) },
  { key: 'low', label: 'Low', test: isLow },
  { key: 'out', label: 'Out of stock', test: isOut },
  { key: 'rx', label: 'Prescription only', test: (r) => r.requires_prescription },
];

const ADD_PRODUCT = 'mailto:partners@altruist.gh?subject=Add%20a%20product';

function href(filter: InventoryFilter, q: string, page = 1) {
  const params = new URLSearchParams();
  if (filter !== 'all') params.set('filter', filter);
  if (q) params.set('q', q);
  if (page > 1) params.set('page', String(page));
  const s = params.toString();
  return s ? `/inventory?${s}` : '/inventory';
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const filter = FILTERS.find((f) => f.key === params.filter) ?? FILTERS[0]!;
  const q = (params.q ?? '').trim();

  const supabase = await supabaseServer();
  const [me, { data, error }] = await Promise.all([getMe(), supabase.rpc('portal_inventory')]);
  if (error) throw new Error(`portal_inventory: ${error.message}`);
  const rows = (data ?? []) as InventoryRow[];

  const attention = rows.filter((r) => isOut(r) || isLow(r)).length;
  const needle = q.toLowerCase();
  const searched = needle
    ? rows.filter((r) => r.name.toLowerCase().includes(needle) || r.brand.toLowerCase().includes(needle))
    : rows;
  const shown = searched.filter(filter.test);

  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1));
  const first = (page - 1) * PAGE_SIZE;
  const pageRows = shown.slice(first, first + PAGE_SIZE);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-sub">
            {rows.length} listed product{rows.length === 1 ? '' : 's'} · {attention} need
            {attention === 1 ? 's' : ''} attention
          </p>
        </div>
        <div className={styles.headActions}>
          <Form action="/inventory" className={styles.search} role="search">
            {filter.key !== 'all' ? <input type="hidden" name="filter" value={filter.key} /> : null}
            <Icon name="search" size={20} className={styles.searchIcon} />
            <label htmlFor="inventory-q" className="sr-only">
              Search by product or brand
            </label>
            <input
              id="inventory-q"
              className={styles.searchInput}
              type="search"
              name="q"
              defaultValue={q}
              key={q}
              placeholder="Search products"
              autoComplete="off"
            />
          </Form>
          <a
            className="btn btn-primary"
            href={ADD_PRODUCT}
            title="Altruist adds products after reviewing whether they are prescription-only. This opens an email to request one."
          >
            <Icon name="add" size={20} />
            Add product
          </a>
        </div>
      </header>

      <nav className={styles.chips} aria-label="Filter products">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={href(f.key, q)}
            className={styles.chip}
            aria-current={f.key === filter.key ? 'page' : undefined}
          >
            {f.label} <span className={styles.chipCount}>{searched.filter(f.test).length}</span>
          </Link>
        ))}
      </nav>

      {q ? (
        <p className={styles.searchNote} role="status">
          {shown.length} result{shown.length === 1 ? '' : 's'} for “{q}”.{' '}
          <Link href={href(filter.key, '')} className="btn-link">
            Clear search
          </Link>
        </p>
      ) : null}

      {rows.length === 0 ? (
        <div className="empty">
          <h2>No products listed yet</h2>
          <p>Products appear here once Altruist has reviewed and listed them for your pharmacy.</p>
        </div>
      ) : shown.length === 0 ? (
        <div className="empty">
          <h2>Nothing matches</h2>
          <p>
            No {filter.key === 'all' ? '' : `${filter.label.toLowerCase()} `}products
            {q ? ` match “${q}”` : ''}.
          </p>
        </div>
      ) : (
        <div className={`card ${styles.tableCard}`}>
          <table className={`table ${styles.table}`}>
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">Category</th>
                <th scope="col">Type</th>
                <th scope="col">Price</th>
                <th scope="col">Stock</th>
                <th scope="col">
                  <span className="sr-only">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((p) => (
                <ProductRow key={p.id} product={p} canEditPrice={Boolean(me?.can_approve)} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 ? (
        <nav className={styles.pager} aria-label="Pages">
          <span className={styles.pagerText}>
            {first + 1}–{first + pageRows.length} of {shown.length}
          </span>
          {page > 1 ? (
            <Link className="btn btn-secondary btn-sm" href={href(filter.key, q, page - 1)} rel="prev">
              Previous
            </Link>
          ) : (
            <span className="btn btn-secondary btn-sm" aria-disabled="true" data-disabled>
              Previous
            </span>
          )}
          {page < pages ? (
            <Link className="btn btn-secondary btn-sm" href={href(filter.key, q, page + 1)} rel="next">
              Next
            </Link>
          ) : (
            <span className="btn btn-secondary btn-sm" aria-disabled="true" data-disabled>
              Next
            </span>
          )}
        </nav>
      ) : null}
    </div>
  );
}
