'use server';

/**
 * One step right on the board. The rules are in `portal_advance_order` (0020):
 * next step only, prescription verified before packing, this pharmacy only.
 */
import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabase/server';
import type { OrderStatus } from '@/lib/portal';

const MESSAGES: Record<string, string> = {
  not_staff: 'Your session has expired. Sign in again.',
  not_found: 'This order is no longer on your board.',
  wrong_step: 'Someone has already moved this order. The board has been refreshed.',
  prescription_not_verified: 'The prescription for this order has not been approved yet.',
};

export async function advanceOrder(id: string, to: OrderStatus): Promise<{ error: string } | void> {
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('portal_advance_order', { p_id: id, p_to: to });
  revalidatePath('/fulfilment');
  revalidatePath('/orders');
  revalidatePath(`/orders/${id}`);
  if (error) {
    const key = Object.keys(MESSAGES).find((k) => error.message.includes(k));
    return { error: key ? MESSAGES[key]! : 'That did not save. Check your connection and try again.' };
  }
}
