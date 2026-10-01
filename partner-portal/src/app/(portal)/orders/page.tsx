/**
 * Incoming orders — Figma 46:2.
 *
 * 5 columns: Order / Patient / Items / Total / Status, rows split by a 1px
 * border/subtle rule, the same status pill the patient sees. A row opens the
 * order; moving it through packing and dispatch is on the Fulfilment board.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { AutoRefresh } from '@/components/AutoRefresh';
import { StatusPill } from '@/components/StatusPill';
import { cedis, getMe, when, type OrderRow } from '@/lib/portal';
import { supabaseServer } from '@/lib/supabase/server';
import styles from '../prescriptions/queue.module.css';

export const metadata: Metadata = { title: 'Incoming orders' };

const OPEN = new Set(['RECEIVED', 'VERIFYING', 'PACKING']);

export default async function OrdersPage() {
  const supabase = await supabaseServer();
  const [me, { data, error }] = await Promise.all([getMe(), supabase.rpc('portal_orders')]);
  if (error) throw new Error(`portal_orders: ${error.message}`);
  const rows = (data ?? []) as OrderRow[];
  const open = rows.filter((r) => OPEN.has(r.status)).length;

  return (
    <div className="page">
      <AutoRefresh />
      <header className="page-head">
        <div>
          <h1 className="page-title">Incoming orders</h1>
          <p className="page-sub">
            {me?.pharmacy_name} · {open === 0 ? 'nothing awaiting action' : `${open} awaiting action`}
          </p>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="empty">
          <h2>No orders yet</h2>
          <p>Orders placed in the Altruist app for your pharmacy appear here.</p>
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Order</th>
              <th scope="col">Patient</th>
              <th scope="col">Items</th>
              <th scope="col">Total</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className={`row-link ${styles.row}`}>
                <td>
                  <Link href={`/orders/${o.id}`} className={styles.stretch}>
                    <span className="cell-title">TrxID {o.id}</span>
                  </Link>
                  <div className="cell-sub">Placed {when(o.placed_at)}</div>
                </td>
                <td className="cell-brand">{o.patient_name}</td>
                <td className="cell-brand">
                  {o.item_count} item{o.item_count === 1 ? '' : 's'} ·{' '}
                  {o.rx_count > 0 ? `${o.rx_count} Rx` : 'OTC'}
                </td>
                <td className="numeral">{cedis(o.total)}</td>
                <td>
                  <StatusPill status={o.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
