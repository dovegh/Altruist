/**
 * Fulfilment board — Figma 75:41.
 *
 * Four columns: Verifying · Packing · Dispatched · Delivered today. Each card
 * moves one step right with one button, and each step reaches the patient's
 * tracking screen with its real time. A card that has sat in its column for
 * more than 30 minutes gets the gold SLA border, and the header counts them.
 *
 * An order with a prescription-only item stays in Verifying until its
 * prescription is approved; the card links to the review instead of offering
 * "Mark packed".
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { AdvanceButton } from '@/components/AdvanceButton';
import { AutoRefresh } from '@/components/AutoRefresh';
import { Icon } from '@/components/Icon';
import { getMe, waited, type FulfilmentCard } from '@/lib/portal';
import { supabaseServer } from '@/lib/supabase/server';
import styles from './board.module.css';

export const metadata: Metadata = { title: 'Fulfilment' };

const SLA_MINUTES = 30;

const COLUMNS: { key: string; title: string; holds: FulfilmentCard['status'][] }[] = [
  { key: 'verifying', title: 'Verifying', holds: ['RECEIVED', 'VERIFYING'] },
  { key: 'packing', title: 'Packing', holds: ['PACKING'] },
  { key: 'dispatched', title: 'Dispatched', holds: ['DISPATCHED'] },
  { key: 'delivered', title: 'Delivered today', holds: ['DELIVERED'] },
];

const late = (c: FulfilmentCard) =>
  c.status !== 'DELIVERED' && Date.now() - new Date(c.stage_since).getTime() > SLA_MINUTES * 60_000;

export default async function FulfilmentPage() {
  const supabase = await supabaseServer();
  const [me, { data, error }] = await Promise.all([getMe(), supabase.rpc('portal_fulfilment')]);
  if (error) throw new Error(`portal_fulfilment: ${error.message}`);
  const cards = (data ?? []) as FulfilmentCard[];
  const inFlight = cards.filter((c) => c.status !== 'DELIVERED').length;
  const overdue = cards.filter(late).length;

  return (
    <div className={`page ${styles.page}`}>
      <AutoRefresh seconds={20} />
      <header className="page-head">
        <div>
          <h1 className="page-title">Fulfilment board</h1>
          <p className="page-sub">
            {me?.pharmacy_name} · {inFlight} order{inFlight === 1 ? '' : 's'} in flight · updates
            push to the customer app instantly
          </p>
        </div>
        {overdue > 0 ? (
          <span className={styles.sla}>
            <Icon name="clock" size={18} />
            {overdue} order{overdue === 1 ? '' : 's'} past {SLA_MINUTES} min SLA
          </span>
        ) : null}
      </header>

      <div className={styles.board}>
        {COLUMNS.map((col) => {
          const inCol = cards.filter((c) => col.holds.includes(c.status));
          return (
            <section key={col.key} className={styles.column} aria-labelledby={`col-${col.key}`}>
              <header className={styles.colHead}>
                <h2 id={`col-${col.key}`} className={styles.colTitle}>
                  {col.title}
                </h2>
                <span className={styles.count}>{inCol.length}</span>
              </header>

              {inCol.length === 0 ? <p className={styles.none}>Nothing here</p> : null}

              {inCol.map((c) => {
                const overdueCard = late(c);
                const blocked = c.rx_count > 0 && c.prescription_status !== 'VERIFIED' && col.key === 'verifying';
                return (
                  <article key={c.id} className={`${styles.card} ${overdueCard ? styles.late : ''}`}>
                    <Link href={`/orders/${c.id}`} className={styles.cardLink}>
                      <span className={styles.trx}>TrxID {c.id}</span>
                      <span className={styles.patient}>{c.patient_name}</span>
                    </Link>
                    <div className={styles.meta}>
                      <span>
                        {c.item_count} item{c.item_count === 1 ? '' : 's'} ·{' '}
                        {c.rx_count > 0 ? `${c.rx_count} Rx` : 'OTC'}
                      </span>
                      <span className={overdueCard ? styles.lateTime : undefined}>
                        {c.status === 'DELIVERED' ? `${waited(c.stage_since)} ago` : waited(c.stage_since)}
                      </span>
                    </div>
                    {c.status === 'DELIVERED' ? (
                      <span className="pill pill-success" style={{ alignSelf: 'flex-start' }}>
                        delivered
                      </span>
                    ) : blocked ? (
                      c.prescription_id ? (
                        <Link
                          href={`/prescriptions/${c.prescription_id}`}
                          prefetch={false}
                          className="btn btn-secondary btn-sm btn-block"
                        >
                          Review prescription first
                        </Link>
                      ) : (
                        <p className={styles.blocked}>
                          Has a prescription-only item but no prescription attached. Contact the
                          patient.
                        </p>
                      )
                    ) : (
                      <AdvanceButton id={c.id} status={c.status} />
                    )}
                  </article>
                );
              })}
            </section>
          );
        })}
      </div>

      <p className={styles.footnote}>
        Every status change here is recorded and shown to the patient with its time. Moving forward
        is one-way — a mistake is corrected by the pharmacist, not silently reverted.
      </p>
    </div>
  );
}
