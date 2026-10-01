/**
 * What the portal reads, typed. Every call goes through a `portal_*` function
 * (migration 0018), which checks the caller's staff row and two-factor session
 * in the database and scopes the result to their pharmacy.
 */
import { cache } from 'react';
import { supabaseServer } from '@/lib/supabase/server';

export type StaffRole = 'superintendent' | 'pharmacist' | 'locum' | 'counter' | 'dispatch';

export type Me = {
  user_id: string;
  full_name: string;
  role: StaffRole;
  pc_number: string | null;
  can_approve: boolean;
  pharmacy_id: string;
  pharmacy_name: string;
  licence_number: string;
  licence_expires_on: string | null;
};

export type PrescriptionStatus = 'PENDING' | 'VERIFYING' | 'VERIFIED' | 'REJECTED';

export type QueueRow = {
  id: string;
  status: PrescriptionStatus;
  patient_name: string;
  uploaded_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  item_count: number;
  has_image: boolean;
};

export type OpenedPrescription = {
  id: string;
  status: PrescriptionStatus;
  note: string;
  patient_name: string;
  patient_phone: string | null;
  uploaded_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  image_path: string | null;
  items: { id: string; name: string; pack: string; brand: string }[];
};

export type OrderStatus =
  | 'RECEIVED'
  | 'VERIFYING'
  | 'PACKING'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REJECTED';

export type OrderRow = {
  id: string;
  status: OrderStatus;
  patient_name: string;
  placed_at: string;
  total: number;
  item_count: number;
  rx_count: number;
  prescription_id: string | null;
};

export type FulfilmentCard = {
  id: string;
  status: OrderStatus;
  patient_name: string;
  placed_at: string;
  /** When the order entered its current column. */
  stage_since: string;
  item_count: number;
  rx_count: number;
  prescription_id: string | null;
  prescription_status: PrescriptionStatus | null;
};

export type OrderDetail = {
  id: string;
  status: OrderStatus;
  placed_at: string;
  reference: string | null;
  method_label: string | null;
  address_label: string | null;
  address_line: string | null;
  speed_label: string | null;
  speed_eta: string | null;
  subtotal: number;
  delivery_fee: number;
  service_fee: number;
  total: number;
  commission_rate: number;
  commission: number;
  payout: number;
  patient: { name: string; phone: string | null; email: string | null };
  prescription: {
    id: string;
    status: PrescriptionStatus;
    reviewed_at: string | null;
    reviewed_by: string | null;
    has_image: boolean;
  } | null;
  items: { name: string; pack: string; unit_price: number; qty: number; requires_prescription: boolean }[];
  events: { status: OrderStatus; title: string; subtitle: string | null; at: string }[];
};

/** The signed-in staff member, or null. Cached for the length of one request. */
export const getMe = cache(async (): Promise<Me | null> => {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc('portal_me');
  if (error || !data?.length) return null;
  return data[0] as Me;
});

/** The pharmacy's prescription queue. Cached per request: the sidebar badge and the page share it. */
export const getQueue = cache(async (): Promise<QueueRow[]> => {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc('portal_prescriptions');
  if (error) throw new Error(`portal_prescriptions: ${error.message}`);
  return (data ?? []) as QueueRow[];
});

export const awaitingReview = (rows: QueueRow[]) =>
  rows.filter((r) => r.status === 'PENDING' || r.status === 'VERIFYING');

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

export function cedis(amount: number): string {
  return `₵${Number(amount).toLocaleString('en-GB', { maximumFractionDigits: 2 })}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}
