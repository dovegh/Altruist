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

// Pure formatting lives in ./format so client components can use it without
// pulling the server Supabase client into the browser bundle.
export { ROLE_LABEL, time, dateTime, when, waited, cedis, initials } from './format';
