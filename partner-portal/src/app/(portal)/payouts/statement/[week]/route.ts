/**
 * Weekly payout statement — CSV of the orders behind one week's settlement.
 *
 * Runs as the signed-in staff member (their session cookie), so
 * `portal_payout_orders` scopes the rows to their pharmacy and refuses anyone
 * else. `week` is the Monday the week starts on, as the payouts table links it.
 */
import type { NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import type { PayoutOrder } from '../../types';

const WEEK = /^\d{4}-\d{2}-\d{2}$/;

/** A real calendar date that falls on a Monday (weeks start on Monday). */
function isMonday(week: string): boolean {
  if (!WEEK.test(week)) return false;
  const d = new Date(`${week}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === week && d.getUTCDay() === 1;
}

/**
 * Quote every field; a leading = + - @ would make a spreadsheet run the cell
 * as a formula (patient names are user-entered), so those get a ' first.
 */
function field(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

const money = (n: number) => Number(n).toFixed(2);

/** "2026-08-11 14:32" in Accra time. */
const accra = (iso: string) =>
  new Date(iso).toLocaleString('sv-SE', {
    timeZone: 'Africa/Accra',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

export async function GET(_request: NextRequest, { params }: { params: Promise<{ week: string }> }) {
  const { week } = await params;
  if (!isMonday(week)) {
    return new Response('Week must be a Monday as YYYY-MM-DD.', { status: 400 });
  }

  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc('portal_payout_orders', { p_week_start: week });
  if (error) {
    if (error.message.includes('not_staff')) return new Response('Not signed in as pharmacy staff.', { status: 401 });
    return new Response('Could not build the statement.', { status: 500 });
  }
  const rows = (data ?? []) as PayoutOrder[];

  // Sum in pesewas so the totals row matches the lines to the pesewa.
  const sum = (pick: (r: PayoutOrder) => number) =>
    rows.reduce((t, r) => t + Math.round(Number(pick(r)) * 100), 0) / 100;

  const lines = [
    ['Order', 'Delivered', 'Patient', 'Goods', 'Commission', 'Net'].map(field).join(','),
    ...rows.map((r) =>
      [r.id, accra(r.delivered_at), r.patient_name, money(r.subtotal), money(r.commission), money(r.net)]
        .map(field)
        .join(','),
    ),
    [
      'Total',
      `${rows.length} order${rows.length === 1 ? '' : 's'}`,
      '',
      money(sum((r) => r.subtotal)),
      money(sum((r) => r.commission)),
      money(sum((r) => r.net)),
    ]
      .map(field)
      .join(','),
  ];

  // The BOM makes Excel read the file as UTF-8 (patient names with accents).
  return new Response(`﻿${lines.join('\r\n')}\r\n`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="altruist-statement-${week}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
