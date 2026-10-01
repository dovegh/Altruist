/**
 * Payouts — Figma 150:326.
 *
 * Four figures (next payout, this week's gross and commission, paid out this
 * year), one row per settled-or-due week with its CSV statement, and the
 * account the money goes to.
 *
 * Weeks run Monday to Sunday (Africa/Accra) and settle the Tuesday after, so
 * "next payout" is the oldest week not yet paid. Bank details are changed
 * through Altruist, who verify them; nobody types an account number here.
 */
import type { Metadata } from 'next';
import { Icon } from '@/components/Icon';
import { cedis, getMe } from '@/lib/portal';
import { supabaseServer } from '@/lib/supabase/server';
import styles from './payouts.module.css';
import type { DateString, Payouts, PayoutWeek } from './types';

export const metadata: Metadata = { title: 'Payouts' };

const ACCOUNT_MAILTO = 'mailto:partners@altruist.gh?subject=Settlement%20account';

// The RPC sends calendar dates, not instants: read and print them in UTC so
// no machine zone can move a Monday to a Sunday.
const day = (d: DateString) => new Date(`${d}T00:00:00Z`);
const fmt = (d: DateString, opts: Intl.DateTimeFormatOptions) =>
  day(d).toLocaleDateString('en-GB', { ...opts, timeZone: 'UTC' });

/** "11–17 Aug 2026", "28 Jul–3 Aug 2026", "29 Dec 2025–4 Jan 2026". */
function period(w: PayoutWeek): string {
  const s = day(w.week_start);
  const e = day(w.week_end);
  const end = fmt(w.week_end, { day: 'numeric', month: 'short', year: 'numeric' });
  if (s.getUTCFullYear() !== e.getUTCFullYear()) {
    return `${fmt(w.week_start, { day: 'numeric', month: 'short', year: 'numeric' })}–${end}`;
  }
  if (s.getUTCMonth() !== e.getUTCMonth()) {
    return `${fmt(w.week_start, { day: 'numeric', month: 'short' })}–${end}`;
  }
  return `${s.getUTCDate()}–${end}`;
}

/** Large yearly totals read as "₵107k" in the card, as designed. */
function compactCedis(amount: number): string {
  if (Math.abs(amount) < 100_000) return cedis(amount);
  const short = new Intl.NumberFormat('en-GB', { notation: 'compact', maximumFractionDigits: 1 });
  return `₵${short.format(amount).toLowerCase()}`;
}

const minus = (amount: number) => (amount > 0 ? `−${cedis(amount)}` : cedis(0));

export default async function PayoutsPage() {
  const supabase = await supabaseServer();
  const [me, { data, error }] = await Promise.all([getMe(), supabase.rpc('portal_payouts')]);
  if (error) throw new Error(`portal_payouts: ${error.message}`);
  const p = data as Payouts;

  const ratePct = `${Number((p.commission_rate * 100).toFixed(1))}%`;
  const unpaid = p.weeks.filter((w) => !w.paid_at);
  const next = unpaid[unpaid.length - 1]; // newest first, so the last unpaid is the oldest
  const showRefunds = p.weeks.some((w) => w.refunds > 0);
  const tw = p.this_week;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Payouts</h1>
          <p className="page-sub">Settlement runs every Tuesday for the preceding week</p>
        </div>
      </header>

      <section className={styles.stats} aria-label="Summary">
        <div className={`${styles.stat} ${styles.statNext}`}>
          <span className={styles.statLabel}>Next payout</span>
          <span className={styles.statValue}>{cedis(next?.net ?? 0)}</span>
          <span className={styles.statSub}>
            {next ? `Tuesday ${fmt(next.due_on, { day: 'numeric', month: 'long' })}` : 'Nothing due'}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Gross this week</span>
          <span className={styles.statValue}>{cedis(tw.gross)}</span>
          <span className={styles.statSub}>
            {tw.orders} order{tw.orders === 1 ? '' : 's'}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Commission ({ratePct})</span>
          <span className={styles.statValue}>{cedis(tw.commission)}</span>
          <span className={styles.statSub}>Deducted at settlement</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Paid out this year</span>
          <span className={styles.statValue} title={cedis(p.paid_this_year)}>
            {compactCedis(p.paid_this_year)}
          </span>
          <span className={styles.statSub}>Since 1 January</span>
        </div>
      </section>

      {p.weeks.length === 0 ? (
        <div className="empty">
          <p className={styles.emptyText}>
            No delivered orders yet. Payouts appear here once orders are delivered.
          </p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={`table ${styles.table}`}>
            <thead>
              <tr>
                <th scope="col">Period</th>
                <th scope="col">Orders</th>
                <th scope="col">Gross</th>
                <th scope="col">Commission</th>
                {showRefunds ? <th scope="col">Refunds</th> : null}
                <th scope="col">Net paid</th>
                <th scope="col">
                  <span className="sr-only">Status</span>
                </th>
                <th scope="col">
                  <span className="sr-only">Statement</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {p.weeks.map((w) => {
                const label = period(w);
                return (
                  <tr key={w.week_start}>
                    <td className={styles.period}>{label}</td>
                    <td>{w.orders}</td>
                    <td>{cedis(w.gross)}</td>
                    <td>{minus(w.commission)}</td>
                    {showRefunds ? <td>{minus(w.refunds)}</td> : null}
                    <td className={styles.net}>{cedis(w.net)}</td>
                    <td>
                      {w.paid_at ? (
                        <span
                          className={`pill pill-success ${styles.status}`}
                          title={w.reference ? `Reference ${w.reference}` : undefined}
                        >
                          Paid
                        </span>
                      ) : (
                        <span className={`pill pill-warning ${styles.status}`}>
                          Due Tue {fmt(w.due_on, { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </td>
                    <td className={styles.statementCell}>
                      {/* A plain anchor: the route returns a file, nothing to prefetch. */}
                      <a
                        href={`/payouts/statement/${w.week_start}`}
                        download
                        className="btn-link"
                        aria-label={`Statement for ${label}`}
                      >
                        Statement
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <section className={styles.account} aria-label="Settlement account">
        <span className={styles.accountIcon}>
          <Icon name="wallet" size={24} />
        </span>
        <div className={styles.accountText}>
          {p.settlement_account ? (
            <>
              <p className={styles.accountTitle}>Settlement account · {p.settlement_account}</p>
              <p className={styles.accountSub}>
                {me?.pharmacy_name ? `${me.pharmacy_name} · ` : ''}changes take one settlement cycle
                to take effect
              </p>
            </>
          ) : (
            <>
              <p className={styles.accountTitle}>No settlement account on file</p>
              <p className={styles.accountSub}>
                Altruist needs your bank or MoMo details before the first payout.
              </p>
            </>
          )}
        </div>
        <a className="btn btn-secondary" href={ACCOUNT_MAILTO}>
          {p.settlement_account ? 'Change account' : 'Add account'}
        </a>
      </section>
    </div>
  );
}
