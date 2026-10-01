/**
 * Prescriptions — the queue.
 *
 * Built from the Incoming Orders table (Figma 46:2): same header, same
 * five-column table, same status pills. Two views:
 *
 *   To review  oldest first. A queue is first-come, first-served; the patient
 *              who has waited longest is the one at the top.
 *   Reviewed   newest first, for looking something up.
 *
 * Refreshes every 30 s, so a script a patient sends appears without a reload.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { AutoRefresh } from '@/components/AutoRefresh';
import { StatusPill } from '@/components/StatusPill';
import { awaitingReview, getMe, getQueue, when, waited } from '@/lib/portal';
import styles from './queue.module.css';

export const metadata: Metadata = { title: 'Prescriptions' };

export default async function PrescriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; done?: string; id?: string }>;
}) {
  const { view, done, id: doneId } = await searchParams;
  const reviewedView = view === 'reviewed';
  const [me, rows] = await Promise.all([getMe(), getQueue()]);

  const waiting = awaitingReview(rows).sort((a, b) => a.uploaded_at.localeCompare(b.uploaded_at));
  const reviewed = rows.filter((r) => r.status === 'VERIFIED' || r.status === 'REJECTED');
  const shown = reviewedView ? reviewed : waiting;

  return (
    <div className="page">
      <AutoRefresh />
      <header className="page-head">
        <div>
          <h1 className="page-title">Prescriptions</h1>
          <p className="page-sub">
            {me?.pharmacy_name} ·{' '}
            {waiting.length === 0
              ? 'nothing waiting'
              : `${waiting.length} awaiting review`}
          </p>
        </div>
        <nav className="tabs" aria-label="Prescription views">
          <Link className="tab" href="/prescriptions" aria-current={reviewedView ? undefined : 'page'}>
            To review <span className="tab-count">{waiting.length}</span>
          </Link>
          <Link
            className="tab"
            href="/prescriptions?view=reviewed"
            aria-current={reviewedView ? 'page' : undefined}
          >
            Reviewed <span className="tab-count">{reviewed.length}</span>
          </Link>
        </nav>
      </header>

      {done === 'approved' || done === 'rejected' ? (
        <div className={`notice ${done === 'approved' ? 'notice-info' : 'notice-warning'}`} role="status">
          <span>
            <strong>
              TrxID {doneId} {done === 'approved' ? 'approved' : 'rejected'}
            </strong>
            The patient has been told in the app.
          </span>
        </div>
      ) : null}

      {shown.length === 0 ? (
        <div className="empty">
          <h2>{reviewedView ? 'Nothing reviewed yet' : 'All caught up'}</h2>
          <p>
            {reviewedView
              ? 'Prescriptions you approve or reject will be listed here.'
              : 'New prescriptions from patients appear here as soon as they are sent.'}
          </p>
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Prescription</th>
              <th scope="col">Patient</th>
              <th scope="col">Covers</th>
              <th scope="col">{reviewedView ? 'Reviewed by' : 'Waiting'}</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className={`row-link ${styles.row}`}>
                <td>
                  {/* No prefetch: opening a prescription is logged, and a
                      background prefetch must never count as opening one. */}
                  <Link href={`/prescriptions/${r.id}`} prefetch={false} className={styles.stretch}>
                    <span className="cell-title">TrxID {r.id}</span>
                  </Link>
                  <div className="cell-sub">Uploaded {when(r.uploaded_at)}</div>
                </td>
                <td className="cell-brand">{r.patient_name}</td>
                <td className="cell-brand">
                  {r.item_count === 0
                    ? 'No items linked'
                    : `${r.item_count} item${r.item_count === 1 ? '' : 's'}`}
                  {r.has_image ? null : <div className="cell-sub">No photo attached</div>}
                </td>
                <td className={reviewedView ? 'cell-brand' : styles.age}>
                  {reviewedView ? (r.reviewed_by ?? '—') : waited(r.uploaded_at)}
                  {reviewedView && r.reviewed_at ? (
                    <div className="cell-sub">{when(r.reviewed_at)}</div>
                  ) : null}
                </td>
                <td>
                  <StatusPill status={r.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
