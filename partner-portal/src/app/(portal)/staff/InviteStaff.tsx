'use client';

/**
 * "Invite staff" and its dialog. A native <dialog> opened with showModal()
 * gives focus trapping and Escape-to-close without extra code.
 *
 * The invite is not an email we send: the database either links someone who
 * already has a confirmed Altruist account straight away ('linked'), or keeps
 * the invite until that email signs up and confirms ('invited'). The result
 * says which, so the superintendent knows whether to pass on the /join link.
 */
import Link from 'next/link';
import { useRef, useState, useTransition } from 'react';
import { Icon } from '@/components/Icon';
import type { StaffRole } from '@/lib/portal';
import { inviteStaff } from './actions';
import { RoleFields } from './RoleFields';
import { approvalAllowed } from './types';
import styles from './staff.module.css';

type Done = { outcome: 'linked' | 'invited'; name: string; email: string; joinUrl: string };

export function InviteStaff() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('pharmacist');
  const [pcNumber, setPcNumber] = useState('');
  const [canApprove, setCanApprove] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setFullName('');
    setEmail('');
    setRole('pharmacist');
    setPcNumber('');
    setCanApprove(false);
    setError(null);
    setDone(null);
  };

  const submit = () => {
    setError(null);
    const name = fullName.trim();
    const address = email.trim();
    startTransition(async () => {
      const result = await inviteStaff({
        email: address,
        fullName: name,
        role,
        pcNumber,
        canApprove: canApprove && approvalAllowed(role, pcNumber),
      });
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setDone({
        outcome: result.outcome,
        name,
        email: address.toLowerCase(),
        joinUrl: `${window.location.origin}/join`,
      });
    });
  };

  return (
    <>
      <button type="button" className="btn btn-primary" onClick={() => dialog.current?.showModal()}>
        <Icon name="add" size={20} />
        Invite staff
      </button>

      <dialog ref={dialog} className={styles.dialog} aria-labelledby="invite-title" onClose={reset}>
        <div className={styles.dialogHead}>
          <h2 id="invite-title" className={styles.dialogTitle}>
            Invite staff
          </h2>
          <button
            type="button"
            className={styles.close}
            aria-label="Close"
            onClick={() => dialog.current?.close()}
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {done ? (
          <div className={styles.dialogBody}>
            <div className="notice notice-info" role="status">
              <Icon name="check" size={18} />
              {done.outcome === 'linked' ? (
                <span>{done.name} already had an Altruist account and now has access.</span>
              ) : (
                <span>
                  Invite saved. Ask {done.name} to create their account at{' '}
                  <Link href="/join" prefetch={false} className={styles.link}>
                    {done.joinUrl}
                  </Link>{' '}
                  with {done.email} — they become staff as soon as they confirm their email.
                </span>
              )}
            </div>
            <div className={styles.formActions}>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => dialog.current?.close()}>
                Done
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={reset}>
                Invite someone else
              </button>
            </div>
          </div>
        ) : (
          <form
            className={styles.dialogBody}
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div className={styles.fieldRow}>
              <label className="field">
                <span className="field-label">Full name</span>
                <input
                  className="input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={pending}
                  required
                  maxLength={120}
                  autoComplete="off"
                />
              </label>
              <label className="field">
                <span className="field-label">Work email</span>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={pending}
                  required
                  autoComplete="off"
                />
              </label>
            </div>

            <RoleFields
              idPrefix="invite"
              role={role}
              pcNumber={pcNumber}
              canApprove={canApprove}
              onRole={setRole}
              onPcNumber={setPcNumber}
              onCanApprove={setCanApprove}
              disabled={pending}
            />

            {error ? (
              <div className="notice notice-danger" role="alert">
                {error}
              </div>
            ) : null}

            <div className={styles.formActions}>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={pending || !fullName.trim() || !email.trim()}
              >
                {pending ? 'Saving…' : 'Save invite'}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={pending}
                onClick={() => dialog.current?.close()}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
