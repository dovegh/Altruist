'use server';

/**
 * Approve or reject. The rules live in `portal_review_prescription` (0018):
 * registered pharmacist only, this pharmacy only, two-factor session, a reason
 * on every rejection. The existing notify trigger tells the patient.
 */
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';

const MESSAGES: Record<string, string> = {
  not_staff: 'Your session has expired. Sign in again.',
  not_approver: 'Only a registered pharmacist can approve or reject prescriptions.',
  not_found: 'This prescription is no longer in your queue.',
  already_reviewed: 'Someone has already reviewed this prescription.',
  reason_required: 'Say why it is rejected. The patient sees this note.',
  note_too_long: 'Keep the note under 500 characters.',
};

export async function reviewPrescription(
  id: string,
  approve: boolean,
  note: string,
): Promise<{ error: string } | void> {
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('portal_review_prescription', {
    p_id: id,
    p_approve: approve,
    p_note: note.trim() || null,
  });
  if (error) {
    const key = Object.keys(MESSAGES).find((k) => error.message.includes(k));
    return { error: key ? MESSAGES[key]! : 'That did not save. Check your connection and try again.' };
  }
  revalidatePath('/prescriptions');
  redirect(`/prescriptions?done=${approve ? 'approved' : 'rejected'}&id=${encodeURIComponent(id)}`);
}
