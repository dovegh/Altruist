/**
 * Status pill — the same component and colours the mobile app uses, so a
 * pharmacist and a patient looking at the same order see the same word.
 */
import type { OrderStatus, PrescriptionStatus } from '@/lib/portal';

const TONE: Record<PrescriptionStatus | OrderStatus, string> = {
  PENDING: 'warning',
  VERIFYING: 'warning',
  VERIFIED: 'success',
  REJECTED: 'danger',
  RECEIVED: 'warning',
  PACKING: 'info',
  DISPATCHED: 'info',
  DELIVERED: 'success',
  CANCELLED: 'neutral',
};

const LABEL: Partial<Record<PrescriptionStatus | OrderStatus, string>> = {
  VERIFYING: 'In review',
};

export function StatusPill({ status }: { status: PrescriptionStatus | OrderStatus }) {
  return (
    <span className={`pill pill-${TONE[status]}`}>{LABEL[status] ?? status.toLowerCase()}</span>
  );
}
