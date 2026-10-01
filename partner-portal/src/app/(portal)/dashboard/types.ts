/** What `portal_dashboard()` returns (migration 0021). */
import type { PrescriptionStatus } from '@/lib/portal';

export type ActivityKind =
  | 'received'
  | 'verifying'
  | 'packing'
  | 'dispatched'
  | 'delivered'
  | 'approved'
  | 'rejected'
  // Order events are lower-cased order statuses, so a cancellation can appear too.
  | 'cancelled';

export type Dashboard = {
  awaiting: number;
  oldest_wait_minutes: number | null;
  orders_today: number;
  orders_last_week_same_day: number;
  dispatched_today: number;
  out_for_delivery: number;
  revenue_today_net: number;
  /** A fraction: 0.08 is 8%. */
  commission_rate: number;
  licence: {
    number: string;
    /** YYYY-MM-DD */
    expires_on: string | null;
    /** Negative once it has lapsed. */
    days_left: number | null;
  };
  attention_prescriptions: {
    id: string;
    status: Extract<PrescriptionStatus, 'PENDING' | 'VERIFYING'>;
    uploaded_at: string;
    patient_name: string;
  }[];
  attention_stock: {
    id: string;
    name: string;
    pack: string;
    stock_qty: number | null;
    in_stock: boolean;
    open_orders: number;
  }[];
  activity: { at: string; kind: ActivityKind; text: string }[];
};
