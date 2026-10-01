/**
 * Settings — Figma 150:510.
 *
 * Left: the pharmacy profile and availability form (superintendent only; the
 * trading name is read-only because it must match the premises licence).
 * Right: the Pharmacy Council licence (`#licence`, linked from the dashboard)
 * and the account-closure card.
 *
 * Licence status is advisory here. Routing stops on its own the day the
 * licence lapses (`route_to_pharmacy`, 0021) — nothing on this screen can
 * override that, and the copy says so.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { getMe } from '@/lib/portal';
import { supabaseServer } from '@/lib/supabase/server';
import { LicenceUpload } from './LicenceUpload';
import { SettingsForm } from './SettingsForm';
import styles from './settings.module.css';
import type { PharmacySettings } from './types';

export const metadata: Metadata = { title: 'Settings' };

const TZ = 'Africa/Accra';

/** 'YYYY-MM-DD' → "30 September 2026". A date, not an instant: no zone shift. */
function longDate(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ });
}

/** Tomorrow in Accra, 'YYYY-MM-DD' — the earliest expiry the database accepts. */
function tomorrow(): string {
  return new Date(Date.now() + 86_400_000).toLocaleDateString('en-CA', { timeZone: TZ });
}

function licenceStatus(daysLeft: number | null): { text: string; tone: 'ok' | 'warning' | 'danger' | 'muted' } {
  if (daysLeft === null) return { text: 'Unknown', tone: 'muted' };
  if (daysLeft < 0) return { text: 'Expired', tone: 'danger' };
  if (daysLeft === 0) return { text: 'Expires today', tone: 'danger' };
  if (daysLeft <= 60) return { text: `Expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`, tone: 'warning' };
  return { text: `Valid — ${daysLeft} days remaining`, tone: 'ok' };
}

export default async function SettingsPage() {
  const supabase = await supabaseServer();
  const [me, { data, error }] = await Promise.all([getMe(), supabase.rpc('portal_settings')]);
  if (error) throw new Error(`portal_settings: ${error.message}`);
  if (!data || !me) notFound();
  const s = data as PharmacySettings;
  const status = licenceStatus(s.days_left);
  const latest = s.latest_licence;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Pharmacy profile, licence and availability</p>
        </div>
      </header>

      <div className={styles.grid}>
        <SettingsForm
          canManage={s.can_manage}
          name={s.name}
          initial={{
            address: s.address ?? '',
            phone: s.phone ?? '',
            opening_hours: s.opening_hours ?? '',
            delivery_radius_km: s.delivery_radius_km === null ? null : Number(s.delivery_radius_km),
            accepting_orders: s.accepting_orders,
          }}
        />

        <aside className={styles.side}>
          <section id="licence" className={`${styles.card} ${styles.licence}`} aria-labelledby="licence-title">
            <h2 id="licence-title" className={styles.licenceTitle}>
              <Icon name="shield-check" size={22} />
              Pharmacy Council premises licence
            </h2>

            <dl className={styles.facts}>
              <div>
                <dt>Licence number</dt>
                <dd>{s.licence_number || '—'}</dd>
              </div>
              <div>
                <dt>Superintendent</dt>
                <dd>
                  {s.superintendent
                    ? [s.superintendent.name, s.superintendent.pc_number ? `PC ${s.superintendent.pc_number}` : null]
                        .filter(Boolean)
                        .join(' · ')
                    : 'None on record'}
                </dd>
              </div>
              <div>
                <dt>Expires</dt>
                <dd>{s.licence_expires_on ? longDate(s.licence_expires_on) : 'Not on file'}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd className={styles[`status_${status.tone}`]}>{status.text}</dd>
              </div>
            </dl>

            {latest ? (
              <p className={latest.status === 'REJECTED' ? styles.submissionBad : styles.submission}>
                {latest.status === 'SUBMITTED'
                  ? `Renewal submitted ${shortDate(latest.submitted_at)} — under review by Altruist`
                  : latest.status === 'REJECTED'
                    ? 'Rejected — upload again'
                    : `Renewal accepted · valid to ${longDate(latest.expires_on)}`}
              </p>
            ) : null}

            {s.can_manage ? (
              <LicenceUpload pharmacyId={me.pharmacy_id} minExpiry={tomorrow()} />
            ) : (
              <p className={styles.fine}>Only the superintendent can upload a renewed licence.</p>
            )}

            <p className={styles.fine}>
              Altruist stops routing orders to a pharmacy the day its licence lapses. This is automatic
              and cannot be overridden from this screen.
            </p>
          </section>

          <section className={`${styles.card} ${styles.leaving}`} aria-labelledby="leaving-title">
            <h2 id="leaving-title" className={`eyebrow ${styles.leavingTitle}`}>
              Leaving Altruist
            </h2>
            <p className={styles.leavingBody}>
              Closing your partner account does not delete dispensing records you are required to keep.
              Outstanding orders must be fulfilled or refunded first.
            </p>
            <a className="btn btn-danger btn-block" href="mailto:partners@altruist.gh?subject=Close%20partner%20account">
              Request account closure
            </a>
          </section>
        </aside>
      </div>
    </div>
  );
}
