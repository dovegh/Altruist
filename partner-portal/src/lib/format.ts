/**
 * Formatting shared by server and browser code. Nothing here touches
 * Supabase or Next server APIs, so client components may import it —
 * `lib/portal.ts` (which does) re-exports all of it for server pages.
 */
import type { StaffRole } from './portal';

export const ROLE_LABEL: Record<StaffRole, string> = {
  superintendent: 'Superintendent pharmacist',
  pharmacist: 'Pharmacist',
  locum: 'Locum pharmacist',
  counter: 'Counter staff',
  dispatch: 'Dispatch',
};

// Ghana keeps GMT all year; formatting in Africa/Accra makes server and
// browser agree whatever the machine's own zone is.
const TZ = 'Africa/Accra';

export function time(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: TZ })
    .toUpperCase();
}

export function dateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ });
  return `${date}, ${time(iso)}`;
}

/** "Today 05:29 PM", "Yesterday 09:12 AM", "23 Aug 05:29 PM". */
export function when(iso: string): string {
  const d = new Date(iso);
  const day = (x: Date) => x.toLocaleDateString('en-GB', { timeZone: TZ });
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (day(d) === day(now)) return `Today ${time(iso)}`;
  if (day(d) === day(yesterday)) return `Yesterday ${time(iso)}`;
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: TZ })} ${time(iso)}`;
}

/** Minutes waiting, for the queue's age column. */
export function waited(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
}

/** "₵186", "₵26.40" — whole cedis stay short; anything with pesewas shows both digits. */
export function cedis(amount: number): string {
  const n = Number(amount);
  const digits = Number.isInteger(n) ? 0 : 2;
  return `₵${n.toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}
