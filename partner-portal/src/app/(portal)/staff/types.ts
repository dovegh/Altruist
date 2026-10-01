/** What `portal_staff_list` (0021) returns, plus the approval rule the UI mirrors. */
import type { StaffRole } from '@/lib/portal';

export type StaffMember = {
  user_id: string;
  full_name: string;
  email: string;
  role: StaffRole;
  pc_number: string | null;
  can_approve: boolean;
  active: boolean;
  last_active_at: string | null;
  is_me: boolean;
};

export type StaffInvite = {
  id: string;
  email: string;
  full_name: string;
  role: StaffRole;
  pc_number: string | null;
  can_approve: boolean;
  created_at: string;
};

export type StaffList = {
  staff: StaffMember[];
  invites: StaffInvite[];
  /** True only for the superintendent. */
  can_manage: boolean;
};

/** A staff row as the table draws it: the time label is worked out on the server. */
export type StaffRow = StaffMember & { last_active_label: string };

/** Order the role pickers list them in. */
export const ROLES: StaffRole[] = ['superintendent', 'pharmacist', 'locum', 'counter', 'dispatch'];

/**
 * The roles that may hold approval, and then only with a Pharmacy Council
 * number. The same rule is a CHECK constraint in the database; this copy only
 * decides which controls to disable and what to say about it.
 */
export const APPROVER_ROLES: StaffRole[] = ['superintendent', 'pharmacist', 'locum'];

export function approvalAllowed(role: StaffRole, pcNumber: string | null): boolean {
  return APPROVER_ROLES.includes(role) && Boolean(pcNumber?.trim());
}
