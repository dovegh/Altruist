'use client';

/**
 * "Start refund" on a delivered order: a small form (amount, reason) under the
 * button. A refund the pharmacy starts is approved as it is created, so the
 * form asks once more before saving, then opens the new refund.
 *
 * `max` is the goods total less what earlier refunds already returned — the
 * same ceiling `portal_start_refund` enforces.
 */
import { useEffect, useId, useState, useTransition } from 'react';
import { Icon } from '@/components/Icon';
import { cedis } from '@/lib/format';
import { startRefund } from '../../refunds/actions';
import styles from './detail.module.css';

export function StartRefund({ orderId, max }: { orderId: string; max: number }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, pending]);

  const value = Number(amount);
  const valid = amount.trim() !== '' && Number.isFinite(value) && value > 0 && value <= max;

  const review = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!valid) return setError(`Enter an amount more than ₵0 and no more than ${cedis(max)}.`);
    if (!reason.trim()) return setError('Say why you are refunding. The patient sees this.');
    setConfirming(true);
  };

  const submit = () => {
    startTransition(async () => {
      const result = await startRefund(orderId, value, reason);
      if (result?.error) {
        setError(result.error);
        setConfirming(false);
      }
    });
  };

  return (
    <div className={styles.refundWrap}>
      <button
        type="button"
        className="btn btn-danger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((x) => !x)}
      >
        Start refund
      </button>

      {open ? (
        <form id={panelId} className={styles.refundPanel} onSubmit={review} noValidate>
          <fieldset className={styles.refundFields} disabled={pending}>
            <legend className="eyebrow">Refund this order</legend>
            <label className="field">
              <span className="field-label">Amount</span>
              <input
                className="input"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value.replace(/[^\d.]/g, ''));
                  setConfirming(false);
                }}
                placeholder={`Up to ${cedis(max)}`}
                aria-describedby={`${panelId}-amount`}
                autoFocus
              />
              <span id={`${panelId}-amount`} className="field-help">
                Goods only, up to {cedis(max)} after earlier refunds.
              </span>
            </label>
            <label className="field">
              <span className="field-label">Reason</span>
              <textarea
                className="textarea"
                value={reason}
                maxLength={500}
                onChange={(e) => {
                  setReason(e.target.value);
                  setConfirming(false);
                }}
                placeholder="Shown to the patient"
              />
            </label>

            {error ? (
              <div className="notice notice-danger" role="alert">
                {error}
              </div>
            ) : null}

            {confirming ? (
              <>
                <p className={styles.refundConfirm}>
                  Refund {cedis(value)} now? It is approved straight away, comes off your next payout and the
                  patient is told.
                </p>
                <button type="button" className="btn btn-danger btn-block" onClick={submit}>
                  {pending ? 'Saving…' : `Yes, refund ${cedis(value)}`}
                </button>
                <button type="button" className="btn btn-secondary btn-block" onClick={() => setConfirming(false)}>
                  Back
                </button>
              </>
            ) : (
              <div className={styles.refundButtons}>
                <button type="submit" className="btn btn-danger">
                  <Icon name="wallet" size={18} />
                  Refund
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
                  Cancel
                </button>
              </div>
            )}
          </fieldset>
        </form>
      ) : null}
    </div>
  );
}
