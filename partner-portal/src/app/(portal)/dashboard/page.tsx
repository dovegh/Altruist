/**
 * Dashboard — Figma 149:207.
 *
 * Today at a glance: four stat cards (each opens its page), what needs the
 * pharmacy's attention (prescriptions waiting, stock that is running out or
 * wrongly listed), the premises licence, and today's activity.
 *
 * The "orders today" comparison is only a percentage when last week's same
 * day had orders; otherwise it shows the plain count rather than a made-up
 * trend. Prescription links are never prefetched: opening one is access-logged.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { AutoRefresh } from '@/components/AutoRefresh';
import { Icon, type IconName } from '@/components/Icon';
import { StatusPill } from '@/components/StatusPill';
import { cedis, getMe } from '@/lib/portal';
import { supabaseServer } from '@/lib/supabase/server';
import styles from './dashboard.module.css';
import type { ActivityKind, Dashboard } from './types';

export const metadata: Metadata = { title: 'Dashboard' };

const TZ = 'Africa/Accra';
const RENEWAL_WARNING_DAYS = 60;

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Named date parts in Accra, so the header reads "Sunday 23 August 2026" on any ICU version. */
function accraParts(d: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    hourCycle: 'h23',
    timeZone: TZ,
  }).formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    weekday: get('weekday'),
    date: `${get('weekday')} ${get('day')} ${get('month')} ${get('year')}`,
    hour: Number(get('hour')),
  };
}

function greeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** "05:34" in Accra. */
const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: TZ });

/** A calendar date from the database, formatted without shifting a day. */
const longDate = (ymd: string) =>
  new Date(`${ymd}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

function waitingFor(iso: string) {
  return waitedMinutes(Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
}

/** "12 minutes", "3 hours", "6 days". */
function waitedMinutes(minutes: number) {
  const mins = Math.max(0, minutes);
  if (mins < 60) return plural(mins, 'minute');
  const hours = Math.floor(mins / 60);
  if (hours < 24) return plural(hours, 'hour');
  return plural(Math.floor(hours / 24), 'day');
}

function ordersCompare(today: number, lastWeek: number, weekday: string) {
  if (lastWeek <= 0) return `Same day last week: ${lastWeek}`;
  const pct = Math.round(((today - lastWeek) / lastWeek) * 100);
  if (pct === 0) return `Same as last ${weekday}`;
  return `${pct > 0 ? '+' : '−'}${Math.abs(pct)}% on last ${weekday}`;
}

function stockLine(s: Dashboard['attention_stock'][number]) {
  if (!s.in_stock) return 'Marked out of stock';
  if (s.stock_qty === 0) return 'Out of stock, still listed as available';
  const left = `Only ${s.stock_qty} left`;
  if (s.open_orders <= 0) return left;
  return `${left} — ${plural(s.open_orders, 'unfulfilled order')} ${s.open_orders === 1 ? 'needs' : 'need'} it`;
}

const DOT: Partial<Record<ActivityKind, string>> = {
  rejected: styles.dotDanger,
  delivered: styles.dotSuccess,
  approved: styles.dotSuccess,
};

function Stat({
  href,
  icon,
  label,
  value,
  note,
  tone,
}: {
  href: string;
  icon: IconName;
  label: string;
  value: string | number;
  note: string;
  tone?: 'gold' | 'mint';
}) {
  return (
    <Link href={href} className={`${styles.stat} ${tone ? styles[tone] : ''}`}>
      <span className={styles.statHead}>
        <span className={styles.statIcon}>
          <Icon name={icon} size={18} />
        </span>
        {label}
      </span>
      <span className={`display ${styles.statValue}`}>{value}</span>
      <span className={styles.statNote}>{note}</span>
    </Link>
  );
}

function Licence({ licence }: { licence: Dashboard['licence'] }) {
  const { number, expires_on, days_left } = licence;

  if (!expires_on || days_left === null) {
    return (
      <section className={`${styles.licence} ${styles.licenceCalm}`} aria-labelledby="licence-title">
        <h2 id="licence-title" className={styles.licenceTitle}>
          <Icon name="shield-check" size={20} />
          No licence expiry on file
        </h2>
        <p className={styles.licenceBody}>Upload your current licence so Altruist can track renewal.</p>
        <Link href="/settings#licence" className="btn btn-secondary btn-block">
          Upload licence
        </Link>
      </section>
    );
  }

  const date = longDate(expires_on);
  const expired = days_left < 0;
  const due = !expired && days_left <= RENEWAL_WARNING_DAYS;
  const tone = expired ? styles.licenceExpired : due ? styles.licenceDue : styles.licenceCalm;

  return (
    <section className={`${styles.licence} ${tone}`} aria-labelledby="licence-title">
      <h2 id="licence-title" className={styles.licenceTitle}>
        <Icon name="shield-check" size={20} />
        {expired ? 'Licence expired' : due ? 'Licence renewal due' : 'Licence'}
      </h2>
      <p className={styles.licenceBody}>
        {expired ? (
          <>
            Pharmacy Council premises licence {number} expired on {date}. Orders stop routing to you
            until a renewed licence is on file.
          </>
        ) : due ? (
          <>
            Pharmacy Council premises licence {number} expires on {date} —{' '}
            {days_left === 0 ? 'today' : plural(days_left, 'day')}. Orders stop routing to you the day
            it lapses.
          </>
        ) : (
          <>
            Pharmacy Council premises licence {number} is valid until {date} —{' '}
            {plural(days_left, 'day')} left.
          </>
        )}
      </p>
      {expired || due ? (
        <Link href="/settings#licence" className="btn btn-secondary btn-block">
          Upload renewal
        </Link>
      ) : null}
    </section>
  );
}

export default async function DashboardPage() {
  const supabase = await supabaseServer();
  const [me, { data, error }] = await Promise.all([getMe(), supabase.rpc('portal_dashboard')]);
  if (error) throw new Error(`portal_dashboard: ${error.message}`);
  const d = data as Dashboard;

  const now = accraParts(new Date());
  const firstName = me?.full_name.split(/\s+/)[0] ?? '';
  const rate = Math.round(Number(d.commission_rate) * 1000) / 10;
  const rx = d.attention_prescriptions;
  const stock = d.attention_stock;
  const attention = rx.length + stock.length;
  const moreRx = d.awaiting - rx.length;

  return (
    <div className="page">
      <AutoRefresh seconds={30} />
      <header className="page-head">
        <div>
          <h1 className="page-title">
            {greeting(now.hour)}
            {firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="page-sub">
            {now.date}
            {me?.pharmacy_name ? ` · ${me.pharmacy_name}` : ''}
          </p>
        </div>
      </header>

      <div className={styles.stats}>
        <Stat
          href="/prescriptions"
          icon="upload"
          label="Awaiting verification"
          value={d.awaiting}
          note={
            d.oldest_wait_minutes === null
              ? 'Nothing waiting'
              : `Oldest waiting ${waitedMinutes(d.oldest_wait_minutes)}`
          }
          tone="gold"
        />
        <Stat
          href="/orders"
          icon="cart"
          label="Orders today"
          value={d.orders_today}
          note={ordersCompare(d.orders_today, d.orders_last_week_same_day, now.weekday)}
          tone="mint"
        />
        <Stat
          href="/fulfilment"
          icon="send"
          label="Dispatched"
          value={d.dispatched_today}
          note={`${d.out_for_delivery} out for delivery`}
        />
        <Stat
          href="/payouts"
          icon="wallet"
          label="Revenue today"
          value={cedis(d.revenue_today_net)}
          note={`Net of ${rate}% commission`}
        />
      </div>

      <div className={styles.columns}>
        <section className={`card ${styles.attention}`} aria-labelledby="attention-title">
          <header className={styles.attentionHead}>
            <h2 id="attention-title" className={styles.sectionTitle}>
              <Icon name="danger" size={22} className={styles.attentionIcon} />
              Needs your attention
            </h2>
            {attention > 0 ? (
              <span className={styles.badge}>
                {attention}
                <span className="sr-only"> {attention === 1 ? 'item' : 'items'}</span>
              </span>
            ) : null}
          </header>

          {attention === 0 ? <p className={styles.none}>Nothing needs you right now.</p> : null}

          <ul className={styles.rows}>
            {rx.map((p) => (
              <li key={p.id} className={styles.row}>
                <span className={`${styles.rowIcon} ${styles.rowIconRx}`}>
                  <Icon name="upload" size={20} />
                </span>
                <div className={styles.rowText}>
                  <span className={styles.rowTitle}>
                    {p.id} · {p.patient_name}
                  </span>
                  <span className={styles.rowSub}>Prescription waiting {waitingFor(p.uploaded_at)}</span>
                </div>
                <StatusPill status={p.status} />
                <Link
                  href={`/prescriptions/${p.id}`}
                  prefetch={false}
                  className={`btn btn-secondary btn-sm ${styles.rowAction}`}
                  aria-label={`Review prescription ${p.id} for ${p.patient_name}`}
                >
                  Review
                </Link>
              </li>
            ))}
            {stock.map((s) => (
              <li key={s.id} className={styles.row}>
                <span className={`${styles.rowIcon} ${styles.rowIconStock}`}>
                  <Icon name="catalog" size={20} />
                </span>
                <div className={styles.rowText}>
                  <span className={styles.rowTitle}>{s.name}</span>
                  <span className={styles.rowSub}>{stockLine(s)}</span>
                </div>
                <Link
                  href={`/inventory?q=${encodeURIComponent(s.name)}`}
                  className={`btn btn-secondary btn-sm ${styles.rowAction}`}
                  aria-label={`Update stock for ${s.name}`}
                >
                  Update stock
                </Link>
              </li>
            ))}
          </ul>

          {moreRx > 0 ? (
            <Link href="/prescriptions" className={`btn-link ${styles.more}`}>
              {plural(moreRx, 'more prescription')} waiting
            </Link>
          ) : null}
        </section>

        <div className={styles.side}>
          <Licence licence={d.licence} />

          <section className={`card ${styles.activity}`} aria-labelledby="activity-title">
            <h2 id="activity-title" className="eyebrow">
              Today&rsquo;s activity
            </h2>
            {d.activity.length === 0 ? (
              <p className={styles.none}>Nothing yet today.</p>
            ) : (
              <ol className={styles.events}>
                {d.activity.map((a, i) => (
                  <li key={`${a.at}-${i}`} className={styles.event}>
                    <time dateTime={a.at} className={styles.eventTime}>
                      {clock(a.at)}
                    </time>
                    <span className={`${styles.dot} ${DOT[a.kind] ?? styles.dotBrand}`} aria-hidden />
                    <span className={styles.eventText}>{a.text}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
