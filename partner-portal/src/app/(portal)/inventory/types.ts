/** One product as `portal_inventory` (0021) returns it. */
export type InventoryRow = {
  id: string;
  name: string;
  brand: string;
  pack: string;
  category: 'Prescription' | 'OTC' | 'Vitamins';
  form: string | null;
  requires_prescription: boolean;
  price: number;
  in_stock: boolean;
  /** Null when the pharmacy does not count this product. */
  stock_qty: number | null;
  updated_at: string;
};

export type InventoryFilter = 'all' | 'in' | 'low' | 'out' | 'rx';

/** What one Save sends. A key is present only when that value changed. */
export type ProductChanges = {
  stock?: { qty: number | null; inStock: boolean };
  price?: number;
};

/** At or below this many on the shelf, a product needs attention. */
export const LOW_STOCK = 10;

/** Not orderable: switched off, or none left. The database treats 0 the same. */
export const isOut = (r: InventoryRow) => !r.in_stock || r.stock_qty === 0;

/** Orderable but running out. Out-of-stock rows are counted under Out, not here. */
export const isLow = (r: InventoryRow) =>
  !isOut(r) && r.stock_qty !== null && r.stock_qty >= 1 && r.stock_qty <= LOW_STOCK;
