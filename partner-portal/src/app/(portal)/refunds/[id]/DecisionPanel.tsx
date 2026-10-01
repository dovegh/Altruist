'use client';

/**
 * The decision: approve in full, approve in part, or decline.
 *
 * The amount is the requested one and only becomes editable for a part
 * refund. A part refund or a decline cannot be sent without a note, because
 * the patient reads it. Every decision asks once more before saving — it is
 * recorded against the pharmacist's licence and cannot be changed here.
 */
import { useState, useTransition } from 'react';
import { Icon } from '@/components/Icon';
import { cedis } from '@/lib/format';
import { decideRefund } from '../actions';
import type { RefundDecision } from '../types';
import styles from './refund.module.css';

const OPTIONS: { value: RefundDecision; title: string; sub: (requested: number) => string }[] = [
  { value: 'full', title: 'Approve in full', sub: (n) => `Refund ${cedis(n)}, the amount asked for` },
  { value: 'partial', title: 'Approve in part', sub: () => 'Choose a smaller amount and explain why' },
  { value: 'decline', title: 'Decline', sub: () => 'A written reason is required and is shown to the patient' },
];

export function DecisionPanel({
  id,
  amountRequested,
  patientName,
  canApprove,
}: {
  id: string;
  amountRequested: number;
  patientName: string;
  canApprove: boolean;
}) {
  const [decision, setDecision] = useState<RefundDecision>('full');
  const [partAmount, setPartAmount] = useState('');
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const parsed = Number(partAmount);
  const partValid = partAmount.trim() !== '' && Number.isFinite(parsed) && parsed > 0 && parsed < amountRequested;
  const amount = decision === 'full' ? amountRequested : decision === 'partial' ? (partValid ? parsed : 0) : 0;
  const noteNeeded = decision !== 'full';

  const change = () => {
    setConfirming(false);
    setError(null);
  };

  const review = () => {
    setError(null);
    if (decision === 'partial' && !partValid) {
      setError(`A part refund must be more than ₵0 and less than ${cedis(amountRequested)}.`);
      return;
    }
    if (noteNeeded && !note.trim()) {
      setError('Write a note to the patient. It is required for a part refund or a decline.');
      return;
    }
    setConfirming(true);
  };

  const submit = () => {
    startTransition(async () => {
      const result = await decideRefund(id, decision, decision === 'partial' ? parsed : null, note);
      if (result?.error) {
        setError(result.error);
        setConfirming(false);
      }
    });
  };

  const confirmText =
    decision === 'decline'
      ? `Decline ${id}? ${patientName} is told straight away and nothing is refunded.`
      : `Refund ${cedis(amount)} to ${patientName}? It comes off your next payout and the patient is told straight away.`;

  return (
    <section className={styles.card} aria-labelledby="decide-title">
      {!canApprove ? (
        <p className="notice notice-warning" style={{ margin: 0 }}>
          <Icon name="shield-check" size={16} />
          Only a registered pharmacist can decide refunds.
        </p>
      ) : null}

      <fieldset className={styles.fieldset} disabled={!canApprove || pending}>
        <legend id="decide-title" className={`eyebrow ${styles.legend}`}>
          Your decision
        </legend>

        <div className={styles.options} role="radiogroup" aria-labelledby="decide-title">
          {OPTIONS.map((o) => (
            <label key={o.value} className={styles.option} data-checked={decision === o.value}>
              <input
                type="radio"
                name="decision"
                value={o.value}
                checked={decision === o.value}
                onChange={() => {
                  setDecision(o.value);
                  change();
                }}
                className="sr-only"
              />
              <span className={styles.radio} aria-hidden="true" />
              <span className={styles.optionBody}>
                <span className={styles.optionTitle}>{o.title}</span>
                <span className={styles.optionSub}>{o.sub(amountRequested)}</span>
              </span>
            </label>
          ))}
        </div>

        <label className="field">
          <span className="field-label">Refund amount</span>
          <span className={styles.money}>
            <span className={styles.moneySign} aria-hidden="true">
              ₵
            </span>
            <input
              className={`input ${styles.moneyInput}`}
              inputMode="decimal"
              value={decision === 'partial' ? partAmount : String(amount)}
              readOnly={decision !== 'partial'}
              onChange={(e) => {
                setPartAmount(e.target.value.replace(/[^\d.]/g, ''));
                change();
              }}
              placeholder={decision === 'partial' ? 'Less than requested' : undefined}
              aria-describedby="amount-help"
            />
          </span>
          <span id="amount-help" className="field-help">
            {decision === 'full'
              ? `The amount the patient asked for`
              : decision === 'partial'
                ? `Less than the ${cedis(amountRequested)} asked for`
                : 'Nothing is refunded'}
          </span>
        </label>

        <label className="field">
          <span className="field-label">Note to the patient</span>
          <textarea
            className="textarea"
            value={note}
            maxLength={500}
            onChange={(e) => {
              setNote(e.target.value);
              change();
            }}
            placeholder={noteNeeded ? 'Required — tell the patient why' : 'Optional — the patient reads this'}
            aria-required={noteNeeded}
          />
        </label>

        <div className={styles.settleCard}>
          <h3 className="eyebrow">How this settles</h3>
          <dl className={styles.settle}>
            <div>
              <dt>Deducted from your next payout</dt>
              <dd>{cedis(amount)}</dd>
            </div>
            <div>
              <dt>Returned to the patient</dt>
              <dd>{cedis(amount)}</dd>
            </div>
          </dl>
        </div>

        <p className="notice notice-info" style={{ margin: 0 }}>
          <Icon name="info" size={16} />
          Your decision, the amount and any note are recorded against your licence and shown to the patient.
          Altruist does not overrule a pharmacist decision.
        </p>

        {error ? (
          <div className="notice notice-danger" role="alert">
            {error}
          </div>
        ) : null}

        {confirming ? (
          <div className={styles.confirm}>
            <p className={styles.confirmText}>{confirmText}</p>
            <button
              type="button"
              className={`btn btn-lg btn-block ${decision === 'decline' ? 'btn-danger' : 'btn-primary'}`}
              onClick={submit}
            >
              {pending ? 'Saving…' : decision === 'decline' ? 'Yes, decline' : `Yes, refund ${cedis(amount)}`}
            </button>
            <button type="button" className="btn btn-secondary btn-block" onClick={() => setConfirming(false)}>
              Back
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={`btn btn-lg btn-block ${decision === 'decline' ? 'btn-danger' : 'btn-primary'}`}
            onClick={review}
          >
            {decision === 'decline'
              ? 'Decline refund'
              : decision === 'partial'
                ? `Approve part refund${partValid ? ` of ${cedis(parsed)}` : ''}`
                : `Approve ${cedis(amountRequested)} refund`}
          </button>
        )}
      </fieldset>
    </section>
  );
}
