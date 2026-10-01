'use client';

/**
 * The staff table, with Manage opening an editor row directly under the
 * person it changes (one at a time). The "Last active" labels arrive already
 * worked out on the server so the browser never re-renders them differently.
 */
import { Fragment, useState, useTransition } from 'react';
import { Icon } from '@/components/Icon';
import { initials, ROLE_LABEL } from '@/lib/format';
import type { StaffRole } from '@/lib/portal';
import { updateStaff } from './actions';
import { RoleFields } from './RoleFields';
import { APPROVER_ROLES, approvalAllowed, type StaffRow } from './types';
import styles from './staff.module.css';

export function StaffTable({ rows, canManage }: { rows: StaffRow[]; canManage: boolean }) {
  const [editing, setEditing] = useState<string | null>(null);
  const columns = canManage ? 5 : 4;

  return (
    <div className={styles.tableWrap}>
      <table className={`table ${styles.staffTable}`}>
        <thead>
          <tr>
            <th scope="col">Person</th>
            <th scope="col">Role</th>
            <th scope="col">Can approve Rx</th>
            <th scope="col">Last active</th>
            {canManage ? (
              <th scope="col">
                <span className="sr-only">Manage</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => {
            const open = editing === s.user_id;
            return (
              <Fragment key={s.user_id}>
                <tr className={s.active ? undefined : styles.inactive}>
                  <td>
                    <div className={styles.person}>
                      <span className={styles.avatar} aria-hidden="true">
                        {initials(s.full_name)}
                      </span>
                      <span className={styles.dim}>
                        <span className={styles.name}>
                          {s.full_name}
                          {s.is_me ? <span className={styles.you}> (you)</span> : null}
                        </span>
                        <span className={styles.email}>{s.email}</span>
                      </span>
                      {s.active ? null : <span className="pill pill-neutral">Access removed</span>}
                    </div>
                  </td>
                  <td className={styles.dim}>
                    <div className={styles.cellMain}>{ROLE_LABEL[s.role]}</div>
                    <div className={styles.cellSub}>{s.pc_number ? `PC ${s.pc_number}` : 'Not registered'}</div>
                  </td>
                  <td className={styles.dim}>
                    <Approval row={s} />
                  </td>
                  <td className={`${styles.dim} ${styles.lastActive}`}>{s.last_active_label}</td>
                  {canManage ? (
                    <td className={styles.manageCell}>
                      <button
                        type="button"
                        className="btn-link"
                        aria-expanded={open}
                        aria-controls={`edit-${s.user_id}`}
                        aria-label={`Manage ${s.full_name}`}
                        onClick={() => setEditing(open ? null : s.user_id)}
                      >
                        {open ? 'Close' : 'Manage'}
                      </button>
                    </td>
                  ) : null}
                </tr>
                {open ? (
                  <tr className={styles.editRow}>
                    <td colSpan={columns} id={`edit-${s.user_id}`}>
                      <StaffEditor row={s} onDone={() => setEditing(null)} />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Approval({ row }: { row: StaffRow }) {
  if (row.can_approve) {
    return (
      <span className={styles.approval}>
        <span className={`${styles.box} ${styles.boxOn}`} aria-hidden="true">
          <Icon name="check" size={16} />
        </span>
        Yes
      </span>
    );
  }
  const reason = !APPROVER_ROLES.includes(row.role)
    ? `Blocked — ${ROLE_LABEL[row.role]} cannot approve`
    : !row.pc_number
      ? 'Blocked — no PC number'
      : 'Not enabled';
  return (
    <span className={`${styles.approval} ${styles.approvalOff}`}>
      <span className={styles.box} aria-hidden="true" />
      {reason}
    </span>
  );
}

function StaffEditor({ row, onDone }: { row: StaffRow; onDone: () => void }) {
  const [role, setRole] = useState<StaffRole>(row.role);
  const [pcNumber, setPcNumber] = useState(row.pc_number ?? '');
  const [canApprove, setCanApprove] = useState(row.can_approve);
  const [active, setActive] = useState(row.active);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const approve = canApprove && approvalAllowed(role, pcNumber);
  const changed =
    role !== row.role ||
    pcNumber.trim() !== (row.pc_number ?? '') ||
    approve !== row.can_approve ||
    active !== row.active;
  const selfReason = row.is_me
    ? 'This is you. You cannot change your own role or remove your own access.'
    : undefined;

  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateStaff({
        userId: row.user_id,
        role,
        pcNumber,
        canApprove: approve,
        active,
      });
      if (result?.error) setError(result.error);
      else onDone();
    });
  };

  return (
    <form
      className={styles.editor}
      aria-label={`Change ${row.full_name}`}
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <RoleFields
        idPrefix={`edit-${row.user_id}`}
        role={role}
        pcNumber={pcNumber}
        canApprove={canApprove}
        onRole={setRole}
        onPcNumber={setPcNumber}
        onCanApprove={setCanApprove}
        roleLocked={selfReason}
        disabled={pending}
      />

      <label className={`${styles.check} ${row.is_me ? styles.checkOff : ''}`}>
        <input
          type="checkbox"
          checked={active}
          disabled={pending || row.is_me}
          onChange={(e) => setActive(e.target.checked)}
          aria-describedby={`access-help-${row.user_id}`}
        />
        <span>
          <span className={styles.checkLabel}>Has access</span>
          <span id={`access-help-${row.user_id}`} className={styles.checkHelp}>
            {row.is_me
              ? 'You cannot remove your own access.'
              : active
                ? 'Untick to stop them opening this portal. You can restore access later.'
                : 'They cannot open this portal until access is restored.'}
          </span>
        </span>
      </label>

      {error ? (
        <div className="notice notice-danger" role="alert">
          {error}
        </div>
      ) : null}

      <div className={styles.formActions}>
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending || !changed}>
          {pending ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" className="btn btn-secondary btn-sm" disabled={pending} onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}
