'use client';

/**
 * The decision: pharmacist notes, then Approve (primary) or Reject (danger).
 *
 * Both ask once more before saving — the decision goes straight to the
 * patient's phone and cannot be undone from here. A rejection cannot be sent
 * without a reason, and the field says the patient will read it: a note
 * written as internal shorthand that lands on a patient's screen is a real
 * failure mode (Screen Specifications §17).
 */
import { useState, useTransition } from 'react';
import { Icon } from '@/components/Icon';
import { reviewPrescription } from './actions';
import styles from './review.module.css';

const QUICK_REASONS = [
  'The dosage line is not readable. Please re-upload a clearer photo.',
  'This prescription has expired. Please ask your prescriber for a new one.',
  'The prescriber’s name or signature is missing.',
  'This is not a prescription we can dispense against.',
];

export function ReviewPanel({
  id,
  canApprove,
  approverName,
}: {
  id: string;
  canApprove: boolean;
  approverName: string;
}) {
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (approve: boolean) => {
    setError(null);
    startTransition(async () => {
      const result = await reviewPrescription(id, approve, note);
      if (result?.error) {
        setError(result.error);
        setConfirming(null);
      }
    });
  };

  if (!canApprove) {
    return (
      <div className="notice notice-warning">
        <Icon name="shield-check" size={18} />
        <span>
          <strong>Only a registered pharmacist can decide</strong>
          You can view this prescription, but approving or rejecting it needs a Pharmacy Council
          registration on your staff record.
        </span>
      </div>
    );
  }

  const rejecting = confirming === 'reject';

  return (
    <div className={styles.decide}>
      <label className="field">
        <span className="field-label">Pharmacist notes</span>
        <textarea
          className="textarea"
          value={note}
          maxLength={500}
          onChange={(e) => setNote(e.target.value)}
          placeholder={
            rejecting ? 'Required — tell the patient what to do next' : 'Optional — shown to the patient'
          }
          aria-describedby="note-help"
        />
        <span id="note-help" className="field-help">
          The patient sees this note in the app. Write it for them, not for the pharmacy.
        </span>
      </label>

      {rejecting ? (
        <div className={styles.quick}>
          {QUICK_REASONS.map((r) => (
            <button key={r} type="button" className={styles.quickChip} onClick={() => setNote(r)}>
              {r}
            </button>
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="notice notice-danger" role="alert">
          {error}
        </div>
      ) : null}

      <div className={styles.actions}>
        {confirming === 'approve' ? (
          <>
            <p className={styles.confirmText}>
              Approve TrxID {id} as {approverName}? The patient is told straight away.
            </p>
            <button className="btn btn-primary btn-lg btn-block" disabled={pending} onClick={() => submit(true)}>
              <Icon name="check" size={20} />
              {pending ? 'Saving…' : 'Yes, approve'}
            </button>
            <button className="btn btn-secondary btn-block" disabled={pending} onClick={() => setConfirming(null)}>
              Cancel
            </button>
          </>
        ) : rejecting ? (
          <>
            <button
              className="btn btn-danger btn-lg btn-block"
              disabled={pending || !note.trim()}
              onClick={() => submit(false)}
            >
              <Icon name="close" size={20} />
              {pending ? 'Saving…' : 'Reject and tell the patient'}
            </button>
            <button className="btn btn-secondary btn-block" disabled={pending} onClick={() => setConfirming(null)}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-primary btn-lg btn-block" onClick={() => setConfirming('approve')}>
              <Icon name="check" size={20} />
              Approve prescription
            </button>
            <button className="btn btn-danger btn-lg btn-block" onClick={() => setConfirming('reject')}>
              <Icon name="close" size={20} />
              Reject
            </button>
          </>
        )}
      </div>
    </div>
  );
}
