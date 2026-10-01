'use client';

/**
 * One inventory row, with its editor inline: Edit swaps the five value cells
 * for a small form and keeps the product name in view, so it is clear which
 * product is being changed.
 *
 * Rx / OTC is shown, never edited — classification is a compliance decision
 * made by Altruist, not a shelf setting.
 */
import { useRef, useState, useTransition } from 'react';
import { Icon } from '@/components/Icon';
import { cedis } from '@/lib/format';
import { saveProduct } from './actions';
import { LOW_STOCK, isOut, type InventoryRow, type ProductChanges } from './types';
import styles from './inventory.module.css';

type Draft = { stock: string; available: boolean; price: string };

const draftOf = (p: InventoryRow): Draft => ({
  stock: p.stock_qty === null ? '' : String(p.stock_qty),
  available: p.in_stock,
  price: String(Number(p.price)),
});

export function ProductRow({ product: p, canEditPrice }: { product: InventoryRow; canEditPrice: boolean }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const editButton = useRef<HTMLButtonElement>(null);
  const out = isOut(p);

  const open = () => {
    setError(null);
    setDraft(draftOf(p));
  };
  const close = () => {
    setDraft(null);
    setError(null);
    // Back to the button that opened the editor, so keyboard users keep their place.
    requestAnimationFrame(() => editButton.current?.focus());
  };

  const save = (d: Draft) => {
    const qty = d.stock.trim() === '' ? null : Number(d.stock);
    if (qty !== null && (!Number.isInteger(qty) || qty < 0)) {
      setError('Stock must be a whole number, 0 or more. Leave it empty if you do not count this product.');
      return;
    }
    const price = Number(d.price);
    if (canEditPrice && (!Number.isFinite(price) || price <= 0 || price > 100_000)) {
      setError('Price must be more than ₵0 and no more than ₵100,000.');
      return;
    }

    // The database saves 0 as not orderable anyway; send what it will store.
    const inStock = qty === 0 ? false : d.available;
    const changes: ProductChanges = {};
    if (qty !== p.stock_qty || inStock !== p.in_stock) changes.stock = { qty, inStock };
    if (canEditPrice && price !== Number(p.price)) changes.price = price;
    if (!changes.stock && changes.price === undefined) {
      close();
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await saveProduct(p.id, changes);
      if (result?.error) setError(result.error);
      else close();
    });
  };

  const product = (
    <td>
      <div className="cell-title">{p.name}</div>
      <div className="cell-sub">{p.pack}</div>
    </td>
  );

  if (draft) {
    const zero = draft.stock.trim() !== '' && Number(draft.stock) === 0;
    return (
      <tr className={`${styles.row} ${styles.editing}`}>
        {product}
        <td colSpan={5}>
          <form
            className={styles.editor}
            aria-label={`Edit ${p.name}`}
            onSubmit={(e) => {
              e.preventDefault();
              save(draft);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && !pending) close();
            }}
          >
            <label className={styles.editField}>
              <span className="field-label">Stock count</span>
              <input
                className={`input ${styles.editInput}`}
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={draft.stock}
                placeholder="Not tracked"
                autoFocus
                onChange={(e) => setDraft({ ...draft, stock: e.target.value })}
              />
            </label>

            <label className={styles.check}>
              <input
                type="checkbox"
                checked={zero ? false : draft.available}
                disabled={zero}
                onChange={(e) => setDraft({ ...draft, available: e.target.checked })}
              />
              <span>
                Available to order
                {zero ? <span className={styles.checkHelp}>None left, so patients cannot order it.</span> : null}
              </span>
            </label>

            <label className={styles.editField}>
              <span className="field-label">Price (₵)</span>
              <input
                className={`input ${styles.editInput}`}
                type="number"
                inputMode="decimal"
                min={0.01}
                max={100000}
                step={0.01}
                value={draft.price}
                disabled={!canEditPrice}
                aria-describedby={canEditPrice ? undefined : `price-why-${p.id}`}
                onChange={(e) => setDraft({ ...draft, price: e.target.value })}
              />
              {canEditPrice ? null : (
                <span id={`price-why-${p.id}`} className="field-help">
                  Only a registered pharmacist can change prices.
                </span>
              )}
            </label>

            <div className={styles.editActions}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
                {pending ? 'Saving…' : 'Save'}
              </button>
              <button type="button" className="btn btn-secondary btn-sm" disabled={pending} onClick={close}>
                Cancel
              </button>
            </div>

            {error ? (
              <div className={`notice notice-danger ${styles.editError}`} role="alert">
                {error}
              </div>
            ) : null}
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className={`${styles.row} ${out ? styles.out : ''}`}>
      {product}
      <td className="cell-brand">{p.form ?? p.category}</td>
      <td>
        {p.requires_prescription ? (
          <span className={`pill pill-warning ${styles.tag}`}>
            <Icon name="prescription" size={14} />
            Rx only
          </span>
        ) : (
          <span className={`pill pill-success ${styles.tag}`}>
            <Icon name="check" size={14} />
            OTC
          </span>
        )}
      </td>
      <td className={styles.price}>{cedis(p.price)}</td>
      <td>
        <Stock product={p} />
      </td>
      <td className={styles.editCell}>
        <button
          ref={editButton}
          type="button"
          className="btn-link"
          onClick={open}
          aria-label={`Edit ${p.name}`}
        >
          Edit
        </button>
      </td>
    </tr>
  );
}

function Stock({ product: p }: { product: InventoryRow }) {
  if (isOut(p)) return <span className={styles.outText}>Out of stock</span>;
  if (p.stock_qty === null) return <span className={`pill pill-neutral ${styles.tag} ${styles.count}`}>Not tracked</span>;
  if (p.stock_qty <= LOW_STOCK)
    return <span className={`pill pill-warning ${styles.tag} ${styles.count}`}>{p.stock_qty} left</span>;
  return <span className={`pill pill-success ${styles.tag} ${styles.count}`}>{p.stock_qty}</span>;
}
