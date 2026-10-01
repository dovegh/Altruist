/**
 * Review prescription — Figma 46:100.
 *
 * Split layout: the document viewer (660) and the decision panel (428).
 *
 * Rendering this page IS opening the prescription: `portal_open_prescription`
 * writes the access log first, moves a PENDING script to "in review" (the
 * patient's app shows it), and only then can the image be signed — the storage
 * policy allows it for 15 minutes after that log entry, to this person only.
 * The link is short-lived too (10 minutes) and never leaves this page.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { StatusPill } from '@/components/StatusPill';
import { dateTime, getMe, type OpenedPrescription } from '@/lib/portal';
import { supabaseServer } from '@/lib/supabase/server';
import { DocumentViewer } from './DocumentViewer';
import { ReviewPanel } from './ReviewPanel';
import styles from './review.module.css';

export const metadata: Metadata = { title: 'Review prescription' };

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const me = await getMe();

  const { data, error } = await supabase.rpc('portal_open_prescription', { p_id: id });
  if (error || !data?.length) notFound();
  const p = data[0] as OpenedPrescription;

  let imageUrl: string | null = null;
  if (p.image_path) {
    const { data: signed } = await supabase.storage
      .from('prescriptions')
      .createSignedUrl(p.image_path, 600);
    imageUrl = signed?.signedUrl ?? null;
  }

  const decided = p.status === 'VERIFIED' || p.status === 'REJECTED';

  return (
    <div className={`page ${styles.page}`}>
      <header className="page-head">
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <Link href="/prescriptions" className={styles.back} aria-label="Back to the queue">
            <Icon name="arrow-left" size={20} />
          </Link>
          <div>
            <h1 className="page-title">Review prescription · TrxID {p.id}</h1>
            <p className="page-sub">
              {p.patient_name} · uploaded {dateTime(p.uploaded_at)} · stored encrypted
            </p>
          </div>
        </div>
        <StatusPill status={p.status} />
      </header>

      <div className={styles.split}>
        <section className={styles.viewer} aria-label="Prescription document">
          {imageUrl ? (
            <DocumentViewer src={imageUrl} alt={`Prescription ${p.id} as photographed by the patient`} />
          ) : (
            <div className={styles.noImage}>
              <Icon name="image" size={40} />
              <p>
                {p.image_path
                  ? 'The photo could not be loaded. Reload the page to try again.'
                  : 'The patient sent this without a photo.'}
              </p>
            </div>
          )}
        </section>

        <aside className={styles.panel}>
          <div className={styles.block}>
            <h2 className="eyebrow">Requested items</h2>
            {p.items.length === 0 ? (
              <p className={styles.muted}>
                Sent without a cart, so no items are linked. Review the document on its own.
              </p>
            ) : (
              <ul className={styles.items}>
                {p.items.map((item) => (
                  <li key={item.id} className={styles.item}>
                    <span className={styles.itemName}>{item.name}</span>
                    <span className={styles.itemMeta}>
                      {item.pack} · {item.brand}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.block}>
            <h2 className="eyebrow">Patient</h2>
            <p className={styles.patient}>
              {p.patient_name}
              {p.patient_phone ? (
                <a href={`tel:${p.patient_phone.replace(/\s/g, '')}`} className={styles.phone}>
                  <Icon name="call" size={16} />
                  {p.patient_phone}
                </a>
              ) : null}
            </p>
          </div>

          {decided ? (
            <div className={styles.decision}>
              <h2 className="eyebrow">Decision</h2>
              <p className={styles.decisionWhat}>
                {p.status === 'VERIFIED' ? 'Approved' : 'Rejected'}
                {p.reviewed_by ? ` by ${p.reviewed_by}` : ''}
              </p>
              {p.reviewed_at ? <p className={styles.muted}>{dateTime(p.reviewed_at)}</p> : null}
              {p.note ? <p className={styles.note}>“{p.note}”</p> : null}
            </div>
          ) : (
            <ReviewPanel
              id={p.id}
              canApprove={Boolean(me?.can_approve)}
              approverName={me?.full_name ?? ''}
            />
          )}

          <p className={styles.footnote}>
            Approving records your Pharmacy Council licence number against this prescription.
            Altruist stores the decision but is not a party to it.
          </p>
        </aside>
      </div>
    </div>
  );
}
