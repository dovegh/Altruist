/**
 * pay-order — authorises payment for an order through Paystack.
 *
 * Deploy:   supabase functions deploy pay-order --project-ref <ref>
 * Secrets:  supabase secrets set PAYSTACK_SECRET_KEY=sk_test_... --project-ref <ref>
 *
 * The app calls this from `payOrder()` in src/lib/api.ts and reads back one of:
 *
 *   { status: 'approved', reference, amount }
 *   { status: 'pending',  reference, amount, next }   ← mobile money, awaiting the
 *                                                        user's approval on their phone
 *   { status: 'declined', reference, reason }
 *
 * and, with `{ action: 'verify', reference }`, re-checks a pending one.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS AS A FUNCTION AND NOT AS APP CODE
 *
 * 1. The Paystack secret key can charge any instrument on file. It is read
 *    here from Deno.env and exists nowhere else. Anything in the app bundle is
 *    readable by anyone holding the APK.
 *
 * 2. The amount is recomputed from `order_items` on every charge. The client
 *    sends an order id and a method id — never a total. A client that could
 *    post its own total could pay one cedi for anything.
 *
 * 3. Writes to `orders.paid_at` and `payment_attempts` use the service role,
 *    because RLS deliberately gives users no UPDATE on orders and no INSERT on
 *    the ledger. The ownership check still happens through the *user's* client
 *    first — the service role is never used to read on the user's behalf.
 * ---------------------------------------------------------------------------
 */
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const PAYSTACK = 'https://api.paystack.co';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Body = {
  action?: 'charge' | 'verify';
  orderId?: string;
  methodId?: string;
  reference?: string;
};

type Outcome =
  | { status: 'approved'; reference: string; amount: number }
  | { status: 'pending'; reference: string; amount: number; next: string }
  | { status: 'declined'; reference: string; reason: string };

/** A response the app can branch on. Non-2xx surfaces as `error` in the client. */
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// PAYSTACK
// ---------------------------------------------------------------------------

type PaystackData = {
  status: string; // 'success' | 'failed' | 'pending' | 'send_otp' | 'pay_offline' | ...
  reference: string;
  amount: number; // pesewas
  gateway_response?: string;
  display_text?: string;
  authorization?: { authorization_code?: string; reusable?: boolean };
};

async function paystack<T = PaystackData>(
  path: string,
  init: { method: 'GET' | 'POST'; body?: unknown },
): Promise<{ ok: boolean; message: string; data?: T }> {
  const secret = Deno.env.get('PAYSTACK_SECRET_KEY');
  if (!secret) {
    throw new HttpError(
      500,
      'PAYSTACK_SECRET_KEY is not set. Run: supabase secrets set PAYSTACK_SECRET_KEY=sk_...',
    );
  }
  const res = await fetch(`${PAYSTACK}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const parsed = (await res.json().catch(() => ({}))) as {
    status?: boolean;
    message?: string;
    data?: T;
  };
  return { ok: res.ok && parsed.status !== false, message: parsed.message ?? '', data: parsed.data };
}

/**
 * Collapses Paystack's several in-flight states to the three the app knows.
 * `pay_offline` and `send_otp` both mean "the user has to do something on
 * their phone" — the mobile-money prompt or an OTP — and are the normal path
 * for MoMo, not an error.
 */
function classify(d: PaystackData): Outcome {
  const amount = d.amount / 100;
  if (d.status === 'success') return { status: 'approved', reference: d.reference, amount };
  if (d.status === 'failed' || d.status === 'abandoned' || d.status === 'reversed') {
    return {
      status: 'declined',
      reference: d.reference,
      reason: (d.gateway_response ?? d.status).toLowerCase(),
    };
  }
  return {
    status: 'pending',
    reference: d.reference,
    amount,
    next: d.display_text ?? 'Approve the payment prompt on your phone.',
  };
}

// ---------------------------------------------------------------------------
// HANDLER
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  try {
    const body = (await req.json().catch(() => ({}))) as Body;

    // --- Who is asking ------------------------------------------------------
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) throw new HttpError(401, 'Sign in required');

    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Scoped to the caller: every read below goes through RLS, so an order or
    // method that is not theirs simply does not exist from here.
    const asUser: SupabaseClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    // Elevated: used only for the writes RLS forbids the user from making.
    const asService: SupabaseClient = createClient(url, service);

    const { data: auth, error: authError } = await asUser.auth.getUser();
    if (authError || !auth.user) throw new HttpError(401, 'Sign in required');
    const user = auth.user;
    if (!user.email) throw new HttpError(400, 'Paystack needs an email on the account');

    // --- Verify a pending attempt -----------------------------------------
    if (body.action === 'verify') {
      if (!body.reference) throw new HttpError(400, 'reference is required');

      // The attempt has to be the caller's. RLS on payment_attempts enforces
      // that; a foreign reference reads back as not found.
      const { data: attempt } = await asUser
        .from('payment_attempts')
        .select('id, order_id, status, amount_pesewas')
        .eq('reference', body.reference)
        .maybeSingle();
      if (!attempt) throw new HttpError(404, 'No such payment');

      // Already settled — answer from the ledger, do not hit Paystack again.
      if (attempt.status === 'success') {
        return json({ status: 'approved', reference: body.reference, amount: attempt.amount_pesewas / 100 });
      }

      const v = await paystack(`/transaction/verify/${encodeURIComponent(body.reference)}`, { method: 'GET' });
      if (!v.ok || !v.data) throw new HttpError(502, `Paystack verify failed: ${v.message}`);

      const outcome = classify(v.data);
      await settle(asService, attempt.id, attempt.order_id, outcome, v.data);
      return json(outcome);
    }

    // --- Charge -------------------------------------------------------------
    if (!body.orderId || !body.methodId) throw new HttpError(400, 'orderId and methodId are required');

    const { data: order } = await asUser
      .from('orders')
      .select('id, user_id, delivery_fee, service_fee, paid_at, reference')
      .eq('id', body.orderId)
      .maybeSingle();
    if (!order) throw new HttpError(404, 'No such order');
    // RLS already filtered by owner; this is the belt to that braces.
    if (order.user_id !== user.id) throw new HttpError(403, 'Not your order');

    // Idempotent: a second tap on "Pay", a retried request, a duplicate from a
    // flaky network — none of them may charge twice.
    if (order.paid_at) {
      const { data: prior } = await asUser
        .from('payment_attempts')
        .select('reference, amount_pesewas')
        .eq('order_id', order.id)
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return json({
        status: 'approved',
        reference: prior?.reference ?? order.reference ?? '',
        amount: (prior?.amount_pesewas ?? 0) / 100,
      });
    }

    // A mobile-money prompt already out on the user's phone — do not send a
    // second one; tell the app to keep verifying the first.
    const { data: inflight } = await asUser
      .from('payment_attempts')
      .select('reference, amount_pesewas')
      .eq('order_id', order.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (inflight) {
      return json({
        status: 'pending',
        reference: inflight.reference,
        amount: inflight.amount_pesewas / 100,
        next: 'Approve the payment prompt on your phone.',
      });
    }

    // --- The amount, from the ledger, not the client -----------------------
    const { data: items, error: itemsError } = await asUser
      .from('order_items')
      .select('unit_price, qty')
      .eq('order_id', order.id);
    if (itemsError) throw new HttpError(500, itemsError.message);
    if (!items?.length) throw new HttpError(400, 'Order has no items');

    const subtotal = items.reduce((s, i) => s + Number(i.unit_price) * Number(i.qty), 0);
    const total = subtotal + Number(order.delivery_fee ?? 0) + Number(order.service_fee ?? 0);
    // Paystack wants the minor unit. GHS 186.00 → 18600 pesewas.
    const amountPesewas = Math.round(total * 100);
    if (!(amountPesewas > 0)) throw new HttpError(400, 'Order total must be positive');

    // --- The instrument -----------------------------------------------------
    const { data: method } = await asUser
      .from('payment_methods')
      .select('id, kind, label, paystack_authorization_code, momo_phone, momo_provider')
      .eq('id', body.methodId)
      .maybeSingle();
    if (!method) throw new HttpError(404, 'No such payment method');

    const reference = `ALT_${order.id}_${Date.now().toString(36).toUpperCase()}`;

    const { data: attempt, error: attemptError } = await asService
      .from('payment_attempts')
      .insert({
        order_id: order.id,
        user_id: user.id,
        reference,
        method_kind: method.kind,
        amount_pesewas: amountPesewas,
        status: 'initiated',
      })
      .select('id')
      .single();
    if (attemptError || !attempt) throw new HttpError(500, attemptError?.message ?? 'ledger write failed');

    // --- Charge -------------------------------------------------------------
    let result: { ok: boolean; message: string; data?: PaystackData };

    if (method.kind === 'card') {
      if (!method.paystack_authorization_code) {
        throw new HttpError(
          400,
          'This card has not been tokenised with Paystack yet. Add it through Paystack checkout first.',
        );
      }
      // Synchronous: Paystack answers approved/declined in this call.
      result = await paystack('/transaction/charge_authorization', {
        method: 'POST',
        body: {
          email: user.email,
          amount: amountPesewas,
          currency: 'GHS',
          reference,
          authorization_code: method.paystack_authorization_code,
          metadata: { order_id: order.id, user_id: user.id },
        },
      });
    } else if (method.kind === 'momo') {
      if (!method.momo_phone || !method.momo_provider) {
        throw new HttpError(400, 'This mobile money method has no wallet number or provider');
      }
      // Asynchronous: Paystack pushes a prompt to the phone and answers
      // `pay_offline`. The app polls `verify` until the user approves.
      result = await paystack('/charge', {
        method: 'POST',
        body: {
          email: user.email,
          amount: amountPesewas,
          currency: 'GHS',
          reference,
          mobile_money: { phone: method.momo_phone, provider: method.momo_provider },
          metadata: { order_id: order.id, user_id: user.id },
        },
      });
    } else {
      // Bank transfer is not a synchronous charge and needs a different flow
      // (Paystack Transfer Recipient + a virtual account). Fail loudly rather
      // than let the app read a missing `declined` as "approved".
      await asService
        .from('payment_attempts')
        .update({ status: 'failed', gateway_response: 'unsupported method' })
        .eq('id', attempt.id);
      throw new HttpError(400, `Payment method "${method.kind}" is not supported yet`);
    }

    if (!result.ok || !result.data) {
      // Paystack refused the request itself (bad key, malformed body, unknown
      // authorization). Not a decline — a 502 the app shows as a failure.
      await asService
        .from('payment_attempts')
        .update({ status: 'failed', gateway_response: result.message, raw: result })
        .eq('id', attempt.id);
      throw new HttpError(502, `Paystack: ${result.message || 'request rejected'}`);
    }

    const outcome = classify(result.data);
    await settle(asService, attempt.id, order.id, outcome, result.data);

    // First successful card charge returns a reusable token: keep it so the
    // next order does not need the card again.
    if (
      outcome.status === 'approved' &&
      method.kind === 'card' &&
      result.data.authorization?.reusable &&
      result.data.authorization.authorization_code &&
      result.data.authorization.authorization_code !== method.paystack_authorization_code
    ) {
      await asService
        .from('payment_methods')
        .update({ paystack_authorization_code: result.data.authorization.authorization_code })
        .eq('id', method.id);
    }

    return json(outcome);
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error('pay-order', e);
    return json({ error: 'Payment could not be processed' }, 500);
  }
});

/**
 * Records the outcome. Runs with the service role because these are the writes
 * RLS forbids the user: the ledger row, `orders.paid_at`, and the timeline
 * event Order Tracking draws.
 */
async function settle(
  asService: SupabaseClient,
  attemptId: string,
  orderId: string,
  outcome: Outcome,
  raw: PaystackData,
) {
  const status = outcome.status === 'approved' ? 'success' : outcome.status === 'declined' ? 'failed' : 'pending';

  await asService
    .from('payment_attempts')
    .update({
      status,
      gateway_response: raw.gateway_response ?? raw.status,
      raw,
    })
    .eq('id', attemptId);

  if (outcome.status !== 'approved') return;

  // `paid_at` is set once. A second success for the same order (a verify
  // racing a webhook, say) must not move it.
  await asService
    .from('orders')
    .update({ paid_at: new Date().toISOString(), reference: outcome.reference })
    .eq('id', orderId)
    .is('paid_at', null);

  await asService.from('order_status_events').insert({
    order_id: orderId,
    status: 'RECEIVED',
    title: 'Payment confirmed',
    subtitle: `Paystack · ${outcome.reference}`,
  });
}
