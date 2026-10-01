/**
 * Staff — Figma 150:659.
 *
 * Everyone who can open this portal, what they may do, and when they were
 * last here. Any staff member can read the list; only the superintendent
 * (`can_manage`) can invite, change or remove people, and the database
 * refuses anyone else whatever the page shows.
 *
 * Approval is regulated: only a superintendent, pharmacist or locum with a
 * Pharmacy Council number may approve prescriptions. The table says why each
 * blocked person is blocked rather than just showing an empty box.
 */
import type { Metadata } from 'next';
import { Icon } from '@/components/Icon';
import { initials, ROLE_LABEL, when } from '@/lib/portal';
import { supabaseServer } from '@/lib/supabase/server';
import { CancelInvite } from './CancelInvite';
import { InviteStaff } from './InviteStaff';
import { StaffTable } from './StaffTable';
import type { StaffList, StaffRow } from './types';
import styles from './staff.module.css';

export const metadata: Metadata = { title: 'Staff' };

// Ghana keeps GMT all year; days are counted on the Accra calendar so
// "Yesterday" means the same thing to the server and to the pharmacy.
const TZ = 'Africa/Accra';
const accraDay = (d: Date) => Date.parse(d.toLocaleDateString('en-CA', { timeZone: TZ }));

/** "Now", "14 min ago", "2 hours ago", "Yesterday", "3 days ago", then the date. */
function lastActive(iso: string | null): string {
  if (!iso) return 'Never signed in';
  const then = new Date(iso);
  const now = new Date();
  const mins = Math.floor((now.getTime() - then.getTime()) / 60_000);
  if (mins < 2) return 'Now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.max(1, Math.round((accraDay(now) - accraDay(then)) / 86_400_000));
  if (days === 1) return 'Yesterday';
  if (days <= 30) return `${days} days ago`;
  return then.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ });
}

export default async function StaffPage() {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc('portal_staff_list');
  if (error) throw new Error(`portal_staff_list: ${error.message}`);
  const list = (data ?? { staff: [], invites: [], can_manage: false }) as StaffList;

  const rows: StaffRow[] = list.staff.map((s) => ({ ...s, last_active_label: lastActive(s.last_active_at) }));
  const withAccess = list.staff.filter((s) => s.active).length;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Staff</h1>
          <p className="page-sub">
            {withAccess === 1 ? '1 person has' : `${withAccess} people have`} access to this portal
          </p>
        </div>
        {list.can_manage ? (
          <InviteStaff />
        ) : (
          <p className={styles.readOnly}>Only the superintendent can invite or change staff.</p>
        )}
      </header>

      <div className={`notice notice-warning ${styles.rule}`}>
        <Icon name="shield-check" size={20} />
        <span>
          <strong>Only Pharmacy Council-registered pharmacists can approve prescriptions</strong>
          Counter staff and dispatch riders can move orders through fulfilment, but the
          approve/reject decision is restricted to a registered pharmacist and is logged against
          their Pharmacy Council number. This permission cannot be delegated.
        </span>
      </div>

      <StaffTable rows={rows} canManage={list.can_manage} />

      {list.invites.length > 0 ? (
        <section className={styles.invites} aria-labelledby="invites-title">
          <h2 id="invites-title" className={styles.sectionTitle}>
            Pending invites <span className={styles.count}>{list.invites.length}</span>
          </h2>
          <p className={styles.sectionSub}>
            They become staff as soon as they create an Altruist account with this email and confirm
            it.
          </p>
          <div className={styles.tableWrap}>
            <table className={`table ${styles.staffTable}`}>
              <thead>
                <tr>
                  <th scope="col">Person</th>
                  <th scope="col">Role</th>
                  <th scope="col">Sent</th>
                  {list.can_manage ? (
                    <th scope="col">
                      <span className="sr-only">Cancel</span>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {list.invites.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <div className={styles.person}>
                        <span className={`${styles.avatar} ${styles.avatarPending}`} aria-hidden="true">
                          {initials(i.full_name)}
                        </span>
                        <span>
                          <span className={styles.name}>{i.full_name}</span>
                          <span className={styles.email}>{i.email}</span>
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.cellMain}>{ROLE_LABEL[i.role]}</div>
                      <div className={styles.cellSub}>
                        {i.pc_number ? `PC ${i.pc_number}` : 'Not registered'}
                        {i.can_approve ? ' · will approve Rx' : ''}
                      </div>
                    </td>
                    <td className={styles.lastActive}>{when(i.created_at)}</td>
                    {list.can_manage ? (
                      <td className={styles.manageCell}>
                        <CancelInvite id={i.id} name={i.full_name} />
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
