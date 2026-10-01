/**
 * Refund request — Figma 105:104.
 *
 * Left: what is being returned, the patient's reason and evidence, and the
 * order it belongs to. Right: the pharmacist's decision (approve in full, in
 * part, or decline), or the recorded decision once made.
 *
 * Dispensed prescription medicines are never returnable — the patient app does
 * not let them be picked — but they are listed (gold, "not returnable") so the
 * pharmacist sees the whole order. The design's "Altruist service fee" lines
 * are left out: refunds record goods only, and nothing in the database says
 * what Altruist absorbs.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { cedis, dateTime, getMe } from '@/lib/portal';
import { supabaseServer } from '@/lib/supabase/server';
import { RefundPill, timeLeft } from '../RefundPill';
import type { RefundDetail, RefundItem } from '../types';
import { DecisionPanel } from './DecisionPanel';
import styles from './refund.module.css';

export const metadata: Metadata = { title: 'Refund request' };

function dayMonth(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Africa/Accra' });
}

export default async function RefundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const [me, { data, error }] = await Promise.all([getMe(), supabase.rpc('portal_refund', { p_id: id })]);
  if (error || !data) notFound();
  const r = data as RefundDetail;
  const requested = Number(r.amount_requested);
  const approved = r.amount_approved === null ? null : Number(r.amount_approved);
  const awaiting = r.status === 'AWAITING';
  const left = awaiting ? timeLeft(r.respond_by) : null;
  const byPatient = r.initiated_by === 'patient';

  // What was asked for, or — when the request names no items (a refund the
  // pharmacy started) — the whole order. Rx lines from the order are added for
  // context either way.
  const fromRequest = r.items.length > 0;
  const packOf = (name: string) => r.order.items.find((i) => i.name === name)?.pack;
  const shown: RefundItem[] = fromRequest ? r.items : r.order.items;
  const returnable = shown.filter((i) => !i.requires_prescription);
  const rx = [
    ...shown.filter((i) => i.requires_prescription),
    ...(fromRequest
      ? r.order.items.filter((i) => i.requires_prescription && !r.items.some((q) => q.name === i.name))
      : []),
  ];
  const delivered = r.order.delivered_at ? dayMonth(r.order.delivered_at) : null;

  return (
    <div className="page">
      <header className={styles.head}>
        <div>
          <nav aria-label="Breadcrumb" className={styles.crumbs}>
            <Link href="/refunds">Refunds</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page" className={styles.crumbHere}>
              {r.id}
            </span>
          </nav>
          <div className={styles.titleRow}>
            <h1 className="page-title">Refund request {r.id}</h1>
            <RefundPill status={r.status} />
          </div>
        </div>
        {left ? (
          <span className={`${styles.countdown} ${left.overdue ? styles.overdue : ''}`}>
            <Icon name="clock" size={16} />
            {left.overdue ? 'Response overdue' : `${left.label} left to respond`}
          </span>
        ) : null}
      </header>

      <div className={styles.grid}>
        <div className={styles.main}>
          <section className={styles.card} aria-labelledby="items-title">
            <h2 id="items-title" className="eyebrow">
              {fromRequest ? 'Requested items' : 'Order items'}
            </h2>
            <ul className={styles.items}>
              {returnable.map((i, k) => (
                <li key={`ok-${k}`} className={styles.item}>
                  <span className={styles.itemIcon}>
                    <Icon name="check" size={18} />
                  </span>
                  <div className={styles.itemBody}>
                    <span className={styles.itemName}>
                      {i.name} × {i.qty}
                    </span>
                    <span className={styles.itemMeta}>
                      {[i.pack ?? packOf(i.name), 'OTC', 'returnable'].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                  <span className={styles.itemPrice}>{cedis(Number(i.unit_price) * i.qty)}</span>
                </li>
              ))}
              {rx.map((i, k) => (
                <li key={`rx-${k}`} className={`${styles.item} ${styles.itemRx}`}>
                  <span className={styles.itemIcon}>
                    <Icon name="shield-check" size={18} />
                  </span>
                  <div className={styles.itemBody}>
                    <span className={styles.itemName}>
                      {i.name} × {i.qty}
                    </span>
                    <span className={styles.itemMeta}>
                      {[delivered ? `Dispensed ${delivered}` : 'Dispensed', 'Rx', 'not returnable'].join(' · ')}
                    </span>
                  </div>
                  <span className={styles.itemPrice}>{cedis(Number(i.unit_price) * i.qty)}</span>
                </li>
              ))}
            </ul>
            {rx.length > 0 ? (
              <p className={styles.fine}>
                {fromRequest
                  ? 'The patient could not select the Rx item — the app blocks return of dispensed prescription medicines. It is shown here for context only.'
                  : 'Dispensed prescription medicines cannot be returned. They are shown here for context only.'}
              </p>
            ) : null}
          </section>

          <section className={styles.card} aria-labelledby="reason-title">
            <h2 id="reason-title" className="eyebrow">
              {byPatient ? 'Patient reason' : 'Reason'}
            </h2>
            <blockquote className={styles.quote}>
              <p className={styles.quoteTitle}>{r.reason}</p>
              {r.details ? <p className={styles.quoteText}>“{r.details}”</p> : null}
            </blockquote>

            {byPatient ? (
              <>
                <h3 className="eyebrow">
                  Evidence · {r.photo_count} photo{r.photo_count === 1 ? '' : 's'}
                </h3>
                {r.photo_count > 0 ? (
                  <>
                    <div className={styles.photos}>
                      {Array.from({ length: Math.min(r.photo_count, 4) }, (_, k) => (
                        <div key={k} className={styles.photo}>
                          <Icon name="image" size={26} label={`Photo ${k + 1}`} />
                        </div>
                      ))}
                    </div>
                    <p className={styles.fine}>
                      Photos cannot be opened from the portal yet. Ask Altruist support if you need to see them.
                    </p>
                  </>
                ) : (
                  <p className={styles.fine}>No photos attached.</p>
                )}
              </>
            ) : null}
          </section>

          <section className={styles.card} aria-labelledby="context-title">
            <h2 id="context-title" className="eyebrow">
              Order context
            </h2>
            <dl className={styles.context}>
              <div>
                <dt>Order</dt>
                <dd>
                  <Link href={`/orders/${r.order.id}`} className={styles.link}>
                    TrxID {r.order.id}
                  </Link>
                  {r.order.delivered_at ? ` · delivered ${dateTime(r.order.delivered_at)}` : ` · ${r.order.status.toLowerCase()}`}
                </dd>
              </div>
              <div>
                <dt>Goods paid</dt>
                <dd>
                  {cedis(Number(r.order.subtotal))} of {cedis(Number(r.order.total))} total
                </dd>
              </div>
              <div>
                <dt>Patient</dt>
                <dd>
                  {r.patient.name} · {r.patient.previous_orders} previous order
                  {r.patient.previous_orders === 1 ? '' : 's'} · {r.patient.previous_refunds} previous refund
                  {r.patient.previous_refunds === 1 ? '' : 's'}
                </dd>
              </div>
              <div>
                <dt>Requested</dt>
                <dd>{dateTime(r.created_at)}</dd>
              </div>
            </dl>
          </section>
        </div>

        <aside className={styles.side}>
          {awaiting ? (
            <DecisionPanel
              id={r.id}
              amountRequested={requested}
              patientName={r.patient.name}
              canApprove={Boolean(me?.can_approve)}
            />
          ) : (
            <section className={styles.card} aria-labelledby="decision-title">
              <div className={styles.decidedHead}>
                <h2 id="decision-title" className="eyebrow">
                  {byPatient ? 'Decision' : 'Started by the pharmacy'}
                </h2>
                <RefundPill status={r.status} />
              </div>
              <dl className={styles.settle}>
                <div>
                  <dt>Requested</dt>
                  <dd>{cedis(requested)}</dd>
                </div>
                <div>
                  <dt>Deducted from your next payout</dt>
                  <dd>{cedis(approved ?? 0)}</dd>
                </div>
                <div>
                  <dt>Returned to the patient</dt>
                  <dd>{cedis(approved ?? 0)}</dd>
                </div>
              </dl>
              {r.decision_note ? (
                <blockquote className={styles.quote}>
                  <p className={styles.quoteLabel}>Note to the patient</p>
                  <p className={styles.quoteText}>{r.decision_note}</p>
                </blockquote>
              ) : null}
              <p className={styles.fine}>
                {[r.decided_by ? `Decided by ${r.decided_by}` : null, r.decided_at ? dateTime(r.decided_at) : null]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
