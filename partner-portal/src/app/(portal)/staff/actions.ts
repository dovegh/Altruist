'use server';

/**
 * Invite, change and cancel. The rules live in the `portal_*_staff` functions
 * (0021): superintendent only, approval only for a registered pharmacist role
 * with a PC number, and nobody can demote or lock out themselves.
 */
import { revalidatePath } from 'next/cache';
import type { StaffRole } from '@/lib/portal';
import { supabaseServer } from '@/lib/supabase/server';

const MESSAGES: Record<string, string> = {
  not_staff: 'Your session has expired. Sign in again.',
  not_superintendent: 'Only the superintendent can invite or change staff.',
  bad_email: 'Enter a valid work email address.',
  name_required: 'Enter their full name.',
  approver_needs_pc:
    'Only a pharmacist, locum or superintendent with a Pharmacy Council number can approve prescriptions.',
  already_staff: 'This email already belongs to a member of pharmacy staff.',
  cannot_demote_self: 'You cannot change your own role or remove your own access.',
  not_found: 'This person is no longer on your staff list.',
};

function explain(message: string): string {
  const key = Object.keys(MESSAGES).find((k) => message.includes(k));
  return key ? MESSAGES[key]! : 'That did not save. Check your connection and try again.';
}

export type InviteInput = {
  email: string;
  fullName: string;
  role: StaffRole;
  pcNumber: string;
  canApprove: boolean;
};

export async function inviteStaff(
  input: InviteInput,
): Promise<{ error: string } | { outcome: 'linked' | 'invited' }> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc('portal_invite_staff', {
    p_email: input.email.trim(),
    p_full_name: input.fullName.trim(),
    p_role: input.role,
    p_pc_number: input.pcNumber.trim() || null,
    p_can_approve: input.canApprove,
  });
  if (error) return { error: explain(error.message) };
  revalidatePath('/staff');
  return { outcome: data === 'linked' ? 'linked' : 'invited' };
}

export async function cancelInvite(id: string): Promise<{ error: string } | void> {
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('portal_cancel_invite', { p_id: id });
  if (error) return { error: explain(error.message) };
  revalidatePath('/staff');
}

export type StaffUpdate = {
  userId: string;
  role: StaffRole;
  pcNumber: string;
  canApprove: boolean;
  active: boolean;
};

export async function updateStaff(input: StaffUpdate): Promise<{ error: string } | void> {
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('portal_update_staff', {
    p_user_id: input.userId,
    p_role: input.role,
    p_pc_number: input.pcNumber.trim() || null,
    p_can_approve: input.canApprove,
    p_active: input.active,
  });
  if (error) return { error: explain(error.message) };
  revalidatePath('/staff');
}
