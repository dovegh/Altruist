/** What `portal_refunds()` / `portal_refund(p_id)` (0021) return. */
import type { OrderStatus } from '@/lib/portal';

export type RefundStatus = 'AWAITING' | 'APPROVED' | 'PARTIAL' | 'DECLINED';
export type RefundDecision = 'full' | 'partial' | 'decline';

export type RefundRow = {
  id: string;
  order_id: string;
  patient_name: string;
  reason: string;
  amount_requested: number;
  amount_approved: number | null;
  status: RefundStatus;
  initiated_by: 'patient' | 'pharmacy';
  created_at: string;
  respond_by: string;
};

export type RefundItem = {
  name: string;
  qty: number;
  unit_price: number;
  requires_prescription: boolean;
  pack?: string;
};

export type RefundDetail = {
  id: string;
  status: RefundStatus;
  initiated_by: 'patient' | 'pharmacy';
  reason: string;
  details: string | null;
  items: RefundItem[];
  photo_count: number;
  amount_requested: number;
  amount_approved: number | null;
  decision_note: string | null;
  decided_by: string | null;
  decided_at: string | null;
  respond_by: string;
  created_at: string;
  order: {
    id: string;
    status: OrderStatus;
    subtotal: number;
    total: number;
    placed_at: string;
    delivered_at: string | null;
    items: (RefundItem & { pack: string })[];
  };
  patient: { name: string; previous_orders: number; previous_refunds: number };
};
