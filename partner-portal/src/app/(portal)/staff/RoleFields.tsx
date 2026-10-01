'use client';

/**
 * Role, PC number and "Can approve prescriptions" — shared by the invite form
 * and the Manage editor so both explain the approval rule the same way.
 *
 * The approve box is controlled but only counts while the rule allows it:
 * switching a pharmacist to counter staff, or clearing the PC number, unticks
 * it without anyone having to remember to.
 */
import { ROLE_LABEL } from '@/lib/format';
import type { StaffRole } from '@/lib/portal';
import { APPROVER_ROLES, approvalAllowed, ROLES } from './types';
import styles from './staff.module.css';

export function RoleFields({
  idPrefix,
  role,
  pcNumber,
  canApprove,
  onRole,
  onPcNumber,
  onCanApprove,
  roleLocked,
  disabled,
}: {
  idPrefix: string;
  role: StaffRole;
  pcNumber: string;
  canApprove: boolean;
  onRole: (role: StaffRole) => void;
  onPcNumber: (pc: string) => void;
  onCanApprove: (on: boolean) => void;
  /** Set (with the reason) when this person's role cannot be changed. */
  roleLocked?: string;
  disabled?: boolean;
}) {
  const allowed = approvalAllowed(role, pcNumber);
  const why = !APPROVER_ROLES.includes(role)
    ? `${ROLE_LABEL[role]} cannot approve prescriptions.`
    : !pcNumber.trim()
      ? 'Add their Pharmacy Council number to allow this.'
      : 'Their PC number is recorded against every approval they make.';

  return (
    <>
      <div className={styles.fieldRow}>
        <label className="field">
          <span className="field-label">Role</span>
          <select
            className={`input ${styles.select}`}
            value={role}
            disabled={disabled || Boolean(roleLocked)}
            onChange={(e) => onRole(e.target.value as StaffRole)}
            aria-describedby={roleLocked ? `${idPrefix}-role-help` : undefined}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
          {roleLocked ? (
            <span id={`${idPrefix}-role-help`} className="field-help">
              {roleLocked}
            </span>
          ) : null}
        </label>

        <label className="field">
          <span className="field-label">Pharmacy Council number</span>
          <input
            className="input"
            value={pcNumber}
            disabled={disabled}
            onChange={(e) => onPcNumber(e.target.value)}
            placeholder="e.g. 44219"
            autoComplete="off"
            maxLength={40}
            aria-describedby={`${idPrefix}-pc-help`}
          />
          <span id={`${idPrefix}-pc-help`} className="field-help">
            Leave empty if they are not registered.
          </span>
        </label>
      </div>

      <label className={`${styles.check} ${allowed ? '' : styles.checkOff}`}>
        <input
          type="checkbox"
          checked={allowed && canApprove}
          disabled={disabled || !allowed}
          onChange={(e) => onCanApprove(e.target.checked)}
          aria-describedby={`${idPrefix}-approve-help`}
        />
        <span>
          <span className={styles.checkLabel}>Can approve prescriptions</span>
          <span id={`${idPrefix}-approve-help`} className={styles.checkHelp}>
            {why}
          </span>
        </span>
      </label>
    </>
  );
}
