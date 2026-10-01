/** What `portal_payouts` and `portal_payout_orders` (migration 0021) return. */

/** A calendar date, 'YYYY-MM-DD'. */
export type DateString = string;

export type PayoutWeek = {
  /** Monday. Weeks run Monday to Sunday, Africa/Accra. */
  week_start: DateString;
  week_end: DateString;
  /** The Tuesday after the week ends. */
  due_on: DateString;
  orders: number;
  gross: number;
  commission: number;
  refunds: number;
  net: number;
  paid_at: string | null;
  reference: string | null;
};

export type Payouts = {
  /** A fraction: 0.08 is 8%. */
  commission_rate: number;
  settlement_account: string | null;
  this_week: { week_start: DateString; orders: number; gross: number; commission: number };
  paid_this_year: number;
  /** Newest first. */
  weeks: PayoutWeek[];
};

export type PayoutOrder = {
  id: string;
  delivered_at: string;
  patient_name: string;
  subtotal: number;
  commission: number;
  net: number;
};
