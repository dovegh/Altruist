/**
 * Refunds — the list, in the Incoming orders table style (Figma 46:2). No
 * frame of its own; the decision screen is Figma 105:104.
 *
 * Awaiting requests sort first (the database orders them). Each one shows how
 * long is left to respond — under a day turns it amber — because a request
 * left past its deadline is the one that reaches Altruist support.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { AutoRefresh } from '@/components/AutoRefresh';
import { cedis, when } from '@/lib/portal';
import { supabaseServer } from '@/lib/supabase/server';
import styles from '../prescriptions/queue.module.css';
import { RefundPill, timeLeft } from './RefundPill';
import own from './refunds.module.css';
import type { RefundRow } from './types';

export const metadata: Metadata = { title: 'Refunds' };

export default async function RefundsPage() {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc('portal_refunds');
  if (error) throw new Error(`portal_refunds: ${error.message}`);
  const rows = (data ?? []) as RefundRow[];
  const awaiting = rows.filter((r) => r.status === 'AWAITING').length;

  return (
    <div className="page">
      <AutoRefresh />
      <header className="page-head">
        <div>
          <h1 className="page-title">Refunds</h1>
          <p className="page-sub">
            {awaiting === 0 ? 'Nothing awaiting your decision' : `${awaiting} awaiting your decision`}
          </p>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="empty">
          <h2>No refund requests</h2>
          <p>When a patient asks for a refund on a delivered order, it appears here for a pharmacist to decide.</p>
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Refund</th>
              <th scope="col">Order</th>
              <th scope="col">Patient</th>
              <th scope="col">Reason</th>
              <th scope="col">Amount</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const left = r.status === 'AWAITING' ? timeLeft(r.respond_by) : null;
              const approved = r.amount_approved === null ? null : Number(r.amount_approved);
              return (
                <tr key={r.id} className={`row-link ${styles.row}`}>
                  <td>
                    <Link href={`/refunds/${r.id}`} className={styles.stretch}>
                      <span className="cell-title">{r.id}</span>
                    </Link>
                    <div className="cell-sub">
                      {r.initiated_by === 'pharmacy' ? 'Started by pharmacy · ' : ''}
                      {when(r.created_at)}
                    </div>
                  </td>
                  <td>
                    <Link href={`/orders/${r.order_id}`} className={own.orderLink}>
                      TrxID {r.order_id}
                    </Link>
                  </td>
                  <td className="cell-brand">{r.patient_name}</td>
                  <td className={`cell-brand ${own.reason}`}>{r.reason}</td>
                  <td>
                    <div className="numeral">
                      {cedis(r.status === 'PARTIAL' && approved !== null ? approved : r.amount_requested)}
                    </div>
                    {r.status === 'PARTIAL' ? (
                      <div className="cell-sub">of {cedis(r.amount_requested)} asked</div>
                    ) : null}
                  </td>
                  <td>
                    <RefundPill status={r.status} />
                    {left ? (
                      <div className={`cell-sub ${own.left} ${left.urgent ? own.urgent : ''}`}>
                        {left.overdue ? 'Response overdue' : `${left.label} left to respond`}
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
