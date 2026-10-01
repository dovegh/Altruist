'use server';

/**
 * Save one product's edit. Two RPCs (0021), two permissions:
 *
 *   portal_update_stock  any staff member — the counter keeps the shelf. A
 *                        count of 0 is saved as not orderable, whatever the
 *                        checkbox said.
 *   portal_update_price  registered pharmacists only.
 *
 * Stock goes first: if the price is then refused, the stock change has still
 * been saved, and the message says so.
 */
import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabase/server';
import type { ProductChanges } from './types';

const MESSAGES: Record<string, string> = {
  not_staff: 'Your session has expired. Sign in again.',
  not_approver: 'Only a registered pharmacist can change prices.',
  not_found: 'This product is no longer listed for your pharmacy.',
  bad_stock: 'Stock must be a whole number, 0 or more.',
  bad_price: 'Price must be more than ₵0 and no more than ₵100,000.',
};

const explain = (message: string) => {
  const key = Object.keys(MESSAGES).find((k) => message.includes(k));
  return key ? MESSAGES[key]! : 'That did not save. Check your connection and try again.';
};

export async function saveProduct(id: string, changes: ProductChanges): Promise<{ error: string } | void> {
  const supabase = await supabaseServer();
  let saved = false;

  try {
    if (changes.stock) {
      const { qty, inStock } = changes.stock;
      if (qty !== null && (!Number.isInteger(qty) || qty < 0)) return { error: MESSAGES.bad_stock! };
      const { error } = await supabase.rpc('portal_update_stock', {
        p_id: id,
        p_stock_qty: qty,
        p_in_stock: Boolean(inStock),
      });
      if (error) return { error: explain(error.message) };
      saved = true;
    }

    if (changes.price !== undefined) {
      const price = changes.price;
      if (!Number.isFinite(price) || price <= 0 || price > 100_000) {
        return { error: withSaved(MESSAGES.bad_price!, saved) };
      }
      const { error } = await supabase.rpc('portal_update_price', { p_id: id, p_price: price });
      if (error) return { error: withSaved(explain(error.message), saved) };
    }
  } finally {
    revalidatePath('/inventory');
    revalidatePath('/dashboard');
  }
}

const withSaved = (message: string, stockSaved: boolean) =>
  stockSaved ? `Stock was saved, but the price was not. ${message}` : message;
