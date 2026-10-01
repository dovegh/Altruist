'use client';

/** "Cancel invite", asked once more so a stray click does not drop a pending colleague. */
import { useState, useTransition } from 'react';
import { cancelInvite } from './actions';
import styles from './staff.module.css';

export function CancelInvite({ id, name }: { id: string; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        className="btn-link"
        aria-label={`Cancel invite for ${name}`}
        onClick={() => setConfirming(true)}
      >
        Cancel invite
      </button>
    );
  }

  return (
    <div className={styles.confirm}>
      <span className={styles.confirmButtons}>
        <button
          type="button"
          className="btn btn-danger btn-sm"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await cancelInvite(id);
              if (result?.error) setError(result.error);
            });
          }}
        >
          {pending ? 'Saving…' : 'Yes, cancel'}
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={pending}
          onClick={() => setConfirming(false)}
        >
          Keep
        </button>
      </span>
      {error ? (
        <span role="alert" className={styles.inlineError}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
