/**
 * Order detail — Figma 87:60.
 *
 * Left: items (with RX REQUIRED / OVER THE COUNTER chips), delivery, status
 * history. Right: patient, prescription, payment, settlement. Header actions:
 * contact the patient, move the order one step on.
 *
 * Settlement shows the pharmacy's own arithmetic: order total, delivery (kept
 * by Altruist for the rider), commission on the goods, and the payout.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdvanceButton } from '@/components/AdvanceButton';
import { Icon } from '@/components/Icon';
import { StatusPill } from '@/components/StatusPill';
import { cedis, dateTime, initials, time, type OrderDetail } from '@/lib/portal';
import { supabaseServer } from '@/lib/supabase/server';
import styles from './detail.module.css';

export const metadata: Metadata = { title: 'Order' };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc('portal_order', { p_id: id });
  if (error || !data) notFound();
  const o = data as OrderDetail;
  const units = o.items.reduce((n, i) => n + i.qty, 0);
  const rx = o.prescription;

  return (
    <div className="page">
      <header className={styles.head}>
        <div className={styles.headLeft}>
          <Link href="/orders" className={styles.back} aria-label="Back to orders">
            <Icon name="arrow-left" size={20} />
          </Link>
          <div>
            <div className={styles.titleRow}>
              <h1 className="page-title">Order {o.id}</h1>
              <StatusPill status={o.status} />
            </div>
            <p className="page-sub">
              Placed {dateTime(o.placed_at)} · {o.patient.name} · {units} item{units === 1 ? '' : 's'}
            </p>
          </div>
        </div>
        <div className={styles.actions}>
          {o.patient.phone ? (
            <a className="btn btn-secondary" href={`tel:${o.patient.phone.replace(/\s/g, '')}`}>
              <Icon name="call" size={18} />
              Contact patient
            </a>
          ) : null}
          <AdvanceButton id={o.id} status={o.status} size="md" block={false} />
        </div>
      </header>

      <div className={styles.grid}>
        <div className={styles.main}>
          <section className={`card ${styles.section}`}>
            <h2 className="eyebrow">Items</h2>
            <table className={styles.items}>
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col">Qty</th>
                  <th scope="col">Unit</th>
                  <th scope="col">Total</th>
                </tr>
              </thead>
              <tbody>
                {o.items.map((i, k) => (
                  <tr key={k}>
                    <td>
                      <div className="cell-title">{i.name}</div>
                      <div className="cell-sub">{i.pack}</div>
                      <span
                        className={`pill ${i.requires_prescription ? 'pill-warning' : 'pill-success'}`}
                        style={{ marginTop: 8 }}
                      >
                        {i.requires_prescription ? 'Rx required' : 'Over the counter'}
                      </span>
                    </td>
                    <td className="numeral">{i.qty}</td>
                    <td className="cell-brand">{cedis(i.unit_price)}</td>
                    <td className="numeral">{cedis(i.unit_price * i.qty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className={`card ${styles.section}`}>
            <h2 className="eyebrow">Delivery</h2>
            <div className={styles.line}>
              <span className={styles.lineIcon}>
                <Icon name="location" size={18} />
              </span>
              <div>
                <div className="cell-title">{o.address_line ?? 'No address recorded'}</div>
                {o.address_label ? <div className="cell-sub">{o.address_label}</div> : null}
              </div>
            </div>
            <div className={styles.line}>
              <span className={styles.lineIcon}>
                <Icon name="clock" size={18} />
              </span>
              <div>
                <div className="cell-title">
                  {[o.speed_label, o.speed_eta].filter(Boolean).join(' · ') || 'Standard delivery'}
                </div>
                <div className="cell-sub">
                  {o.status === 'DISPATCHED' ? 'Out with the rider' : o.status === 'DELIVERED' ? 'Delivered' : 'Rider not yet assigned'}
                </div>
              </div>
            </div>
          </section>

          <section className={`card ${styles.section}`}>
            <h2 className="eyebrow">Status history</h2>
            <ol className={styles.history}>
              {o.events.map((e, k) => (
                <li key={k} className={styles.event}>
                  <span className={styles.tick}>
                    <Icon name="check" size={14} />
                  </span>
                  <span className={styles.eventTitle}>{e.title}</span>
                  <span className={styles.eventSub}>{e.subtitle}</span>
                  <span className={styles.eventTime}>{time(e.at)}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className={styles.side}>
          <section className={`card ${styles.section}`}>
            <h2 className="eyebrow">Patient</h2>
            <div className={styles.patient}>
              <span className={styles.avatar}>{initials(o.patient.name)}</span>
              <div>
                <div className="cell-title">{o.patient.name}</div>
                <div className="cell-sub">
                  {[o.patient.phone, o.patient.email].filter(Boolean).join(' · ') || 'No contact details'}
                </div>
              </div>
            </div>
          </section>

          <section className={`card ${styles.section}`}>
            <div className={styles.sectionHead}>
              <h2 className="eyebrow">Prescription</h2>
              {rx ? <StatusPill status={rx.status} /> : null}
            </div>
            {rx ? (
              <>
                <p className={styles.rxLine}>
                  TrxID {rx.id}
                  <span className="cell-sub">
                    {rx.reviewed_by
                      ? `Reviewed by ${rx.reviewed_by}${rx.reviewed_at ? ` · ${dateTime(rx.reviewed_at)}` : ''}`
                      : 'Not reviewed yet'}
                  </span>
                </p>
                <Link href={`/prescriptions/${rx.id}`} prefetch={false} className="btn btn-secondary btn-block">
                  Open full document
                </Link>
              </>
            ) : (
              <p className="cell-sub">
                {o.items.some((i) => i.requires_prescription)
                  ? 'Has a prescription-only item but no prescription attached.'
                  : 'Not needed — every item is over the counter.'}
              </p>
            )}
          </section>

          <section className={`card ${styles.section}`}>
            <h2 className="eyebrow">Payment</h2>
            <div className={styles.line}>
              <span className={styles.lineIcon}>
                <Icon name="card" size={18} />
              </span>
              <div>
                <div className="cell-title">Paid · {o.method_label ?? 'Paystack'}</div>
                <div className="cell-sub">Paystack · {o.reference ?? '—'}</div>
              </div>
            </div>
          </section>

          <section className={`card ${styles.section}`}>
            <h2 className="eyebrow">Settlement</h2>
            <dl className={styles.settle}>
              <div>
                <dt>Order total</dt>
                <dd>{cedis(o.total)}</dd>
              </div>
              <div>
                <dt>Delivery (collected)</dt>
                <dd>{cedis(o.delivery_fee)}</dd>
              </div>
              <div className={styles.commission}>
                <dt>Altruist commission ({Math.round(o.commission_rate * 100)}%)</dt>
                <dd>−{cedis(o.commission)}</dd>
              </div>
              <div className={styles.payout}>
                <dt>Payout to pharmacy</dt>
                <dd>{cedis(o.payout)}</dd>
              </div>
            </dl>
            <p className={styles.fine}>
              Settled weekly. Altruist is a technology platform and is not the seller of these
              medicines.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
