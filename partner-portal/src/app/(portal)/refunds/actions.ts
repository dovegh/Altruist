'use server';

/**
 * Deciding a patient's refund, and starting one from a delivered order. The
 * rules are in 0021: registered pharmacist only, this pharmacy only,
 * two-factor session; a note on every part refund or decline; never more than
 * the goods were paid for. Money is recorded, not moved: the approved amount
 * comes off the pharmacy's next payout.
 */
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import type { RefundDecision } from './types';

const COMMON: Record<string, string> = {
  not_staff: 'Your session has expired. Sign in again.',
  not_approver: 'Only a registered pharmacist can decide refunds.',
};

const DECIDE: Record<string, string> = {
  ...COMMON,
  not_found: 'This refund is no longer on your list.',
  already_decided: 'Someone has already decided this refund. The page has been refreshed.',
  reason_required: 'Write a note to the patient. It is required for a part refund or a decline.',
  bad_amount: 'A part refund must be more than ₵0 and less than the amount requested.',
  bad_decision: 'Choose approve in full, approve in part or decline.',
};

const START: Record<string, string> = {
  ...COMMON,
  not_found: 'This order is no longer on your list.',
  reason_required: 'Say why you are refunding. The patient sees this.',
  bad_amount: 'The amount must be more than ₵0 and no more than the goods total less earlier refunds.',
};

function message(map: Record<string, string>, raw: string): string {
  const key = Object.keys(map).find((k) => raw.includes(k));
  return key ? map[key]! : 'That did not save. Check your connection and try again.';
}

export async function decideRefund(
  id: string,
  decision: RefundDecision,
  amount: number | null,
  note: string,
): Promise<{ error: string } | void> {
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('portal_decide_refund', {
    p_id: id,
    p_decision: decision,
    p_amount: decision === 'partial' ? amount : null,
    p_note: note.trim() || null,
  });
  revalidatePath('/refunds');
  revalidatePath(`/refunds/${id}`);
  if (error) return { error: message(DECIDE, error.message) };
}

export async function startRefund(
  orderId: string,
  amount: number,
  reason: string,
): Promise<{ error: string } | void> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc('portal_start_refund', {
    p_order_id: orderId,
    p_amount: amount,
    p_reason: reason.trim(),
  });
  if (error || typeof data !== 'string') {
    return { error: message(START, error?.message ?? '') };
  }
  revalidatePath('/refunds');
  revalidatePath(`/orders/${orderId}`);
  redirect(`/refunds/${encodeURIComponent(data)}`);
}
