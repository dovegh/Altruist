/**
 * Refund status pill and the respond-by countdown, shared by the list and the
 * decision page so both say the same thing.
 */
import type { RefundStatus } from './types';

const PILL: Record<RefundStatus, { tone: string; label: string }> = {
  AWAITING: { tone: 'warning', label: 'Awaiting decision' },
  APPROVED: { tone: 'success', label: 'Approved' },
  PARTIAL: { tone: 'info', label: 'Part refund' },
  DECLINED: { tone: 'neutral', label: 'Declined' },
};

export function RefundPill({ status }: { status: RefundStatus }) {
  const p = PILL[status];
  return <span className={`pill pill-${p.tone}`}>{p.label}</span>;
}

/**
 * "1 day 4 hrs", "5 hrs 10 min", "40 min" until `iso`. `urgent` under 24 hours,
 * `overdue` once it has passed.
 */
export function timeLeft(iso: string): { label: string; urgent: boolean; overdue: boolean } {
  const mins = Math.floor((new Date(iso).getTime() - Date.now()) / 60_000);
  if (mins <= 0) return { label: 'Overdue', urgent: true, overdue: true };
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const rest = mins % 60;
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const label =
    days > 0
      ? [plural(days, 'day', 'days'), hours > 0 ? plural(hours, 'hr', 'hrs') : null].filter(Boolean).join(' ')
      : hours > 0
        ? [plural(hours, 'hr', 'hrs'), rest > 0 ? `${rest} min` : null].filter(Boolean).join(' ')
        : `${rest} min`;
  return { label, urgent: mins < 1440, overdue: false };
}
