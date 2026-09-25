/**
 * The option lists behind the app's forms.
 *
 * These look like copy but behave like configuration: a problem type decides
 * WHO the report is routed to, a refund reason is quoted to the pharmacist who
 * decides the case, and a deletion reason is retained as the record of why an
 * account was closed. Screens should not be able to add a sixth option by
 * typing one, and two screens offering different wording for the same reason
 * is how a report arrives at the wrong desk.
 */
import type { SupportParty } from './support';

/** Order cancellation, before dispatch. */
export const CANCEL_REASONS: string[] = [
  'Ordered by mistake',
  'Delivery is taking too long',
  'Found it cheaper elsewhere',
  'I no longer need it',
  'Something else',
];

/** Refund request, after delivery. Quoted verbatim to the pharmacist. */
export const REFUND_REASONS: string[] = [
  'Damaged on arrival',
  'Wrong item sent',
  'Missing from the order',
  'Expired or close to expiry',
  'Something else',
];

/** Account deletion. Optional for the user, retained with the request. */
export const DELETION_REASONS: string[] = [
  'I no longer need it',
  'Privacy concerns',
  'Delivery was too slow',
  'I use another pharmacy',
  'Something else',
];

export type ProblemType = {
  id: string;
  title: string;
  meta: string;
  /** Who handles it — the routing rule, see lib/support.ts. */
  routesTo: SupportParty;
};

export const PROBLEM_TYPES: ProblemType[] = [
  {
    id: 'missing',
    title: 'Something is missing from my order',
    meta: 'An item was not delivered',
    routesTo: 'pharmacy',
  },
  {
    id: 'wrong',
    title: 'I received the wrong item',
    meta: 'Different medicine or strength',
    routesTo: 'pharmacy',
  },
  {
    id: 'damaged',
    title: 'The item arrived damaged',
    meta: 'Broken seal, crushed box, leaking',
    routesTo: 'pharmacy',
  },
  {
    id: 'undelivered',
    title: 'The delivery never arrived',
    meta: 'Marked delivered but not received',
    routesTo: 'altruist',
  },
  {
    id: 'billing',
    title: 'A billing or payment problem',
    meta: 'Charged twice, wrong amount',
    routesTo: 'altruist',
  },
];

/**
 * Data-export contents (GDPR-style subject access).
 *
 * `on` is the default, not a permission: everything here is the user's own
 * data and they may take all of it. Wellness is off by default only because it
 * is the bulkiest and least often wanted, and prescription images carry the
 * size warning because a 40 MB attachment that silently fails to send is worse
 * than one the user chose.
 */
export type ExportPart = { id: string; title: string; meta: string; on: boolean };

export const EXPORT_PARTS: ExportPart[] = [
  {
    id: 'profile',
    title: 'Profile and addresses',
    meta: 'Name, contact details, saved addresses',
    on: true,
  },
  {
    id: 'orders',
    title: 'Order history',
    meta: 'Every order, item and receipt · JSON + CSV',
    on: true,
  },
  {
    id: 'scripts',
    title: 'Prescription images',
    meta: 'The original files you uploaded · adds ~40 MB',
    on: true,
  },
  {
    id: 'wellness',
    title: 'Wellness activity',
    meta: 'Plans, sessions and hydration logs',
    on: false,
  },
  {
    id: 'support',
    title: 'Support conversations',
    meta: 'Messages with Altruist and your pharmacies',
    on: true,
  },
];

export const EXPORT_FORMATS: string[] = ['JSON + CSV', 'PDF summary'];

/**
 * The refund timeline, shared by the cancellation and refund screens so the
 * two never promise different things about the same money movement.
 */
export type TimelineState = 'done' | 'current' | 'upcoming';
export type TimelineStep = { title: string; meta: string; state: TimelineState };

/** Card refund after a cancellation — Altruist moves this money itself. */
export const CANCELLATION_REFUND_STEPS: TimelineStep[] = [
  { title: 'Refund initiated', meta: 'Just now', state: 'done' },
  { title: 'Sent to Paystack', meta: 'Within 1 hour', state: 'current' },
  { title: 'Back on your card', meta: '3–5 business days', state: 'upcoming' },
];

/** Post-delivery refund — the pharmacy decides, so there is a review step. */
export function refundCaseSteps(pharmacyName: string, raisedAt: string): TimelineStep[] {
  return [
    { title: 'Request received', meta: `Altruist passed it to the pharmacy · ${raisedAt}`, state: 'done' },
    { title: 'Pharmacy reviewing', meta: `${pharmacyName} · usually within 2 business days`, state: 'current' },
    { title: 'Decision', meta: 'Approved in full, in part, or declined with a reason', state: 'upcoming' },
    { title: 'Money back on your card', meta: '3–5 business days after approval', state: 'upcoming' },
  ];
}
