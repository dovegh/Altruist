/**
 * notify — texts a person when their prescription or order changes (Twilio).
 *
 * Called by the database (migration 0015), never by the app:
 *   POST { table: 'prescriptions' | 'orders', id, status }
 *   header x-webhook-secret: the Vault secret `notify_webhook_secret`
 *
 * Deploy:   supabase functions deploy notify --no-verify-jwt
 * Secrets:  TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and one sender:
 *           TWILIO_MESSAGING_SERVICE_SID (preferred) or TWILIO_FROM
 *
 * Who gets what:
 *   prescription VERIFIED / REJECTED → always (someone may be waiting on medicine)
 *   order PACKING / DISPATCHED / DELIVERED / CANCELLED → only with "Order status
 *     changes" and "SMS" switched on in notification settings
 *
 * Only to a CONFIRMED number (auth.users.phone, set by the verify-code flow).
 * A number typed at sign-up is never texted: a typo would send someone else
 * news about a prescription.
 *
 * Texts say what happened and nothing medical — no medicine names, no reason
 * for a rejection. Those stay in the app, behind the person's sign-in.
 *
 * Duplicates: the `<table>:<id>:<status>` key is claimed in notification_log
 * before sending and released if Twilio refuses, so a retried webhook cannot
 * text the same news twice and a failed one can still be retried.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

type Payload = { table?: string; id?: string; status?: string };

const ORDER_TEXT: Record<string, string> = {
  PACKING: 'is being packed',
  DISPATCHED: 'is on its way',
  DELIVERED: 'has been delivered',
  CANCELLED: 'was cancelled. Any payment taken will be refunded',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Constant-time comparison, so the secret cannot be guessed by timing. */
function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  // 1. Only the database may call this.
  const { data: secret, error: secretError } = await admin.rpc('notify_webhook_secret');
  if (secretError || typeof secret !== 'string') return json({ error: 'not configured' }, 500);
  if (!sameSecret(req.headers.get('x-webhook-secret') ?? '', secret)) {
    return json({ error: 'unauthorized' }, 401);
  }

  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const service = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID');
  const from = Deno.env.get('TWILIO_FROM');
  if (!sid || !token || (!service && !from)) {
    console.error('notify: Twilio secrets are not set — nothing sent');
    return json({ error: 'twilio not configured' }, 503);
  }

  const { table, id, status } = (await req.json().catch(() => ({}))) as Payload;
  if (!table || !id || !status) return json({ error: 'bad payload' }, 400);

  // 2. What happened, to whom, and what to say.
  let userId: string;
  let body: string;

  if (table === 'prescriptions' && (status === 'VERIFIED' || status === 'REJECTED')) {
    const { data: rx } = await admin
      .from('prescriptions')
      .select('id, user_id, pharmacies(name)')
      .eq('id', id)
      .maybeSingle();
    if (!rx) return json({ skipped: 'prescription not found' });
    userId = rx.user_id;
    const pharmacy = (rx as { pharmacies?: { name?: string } }).pharmacies?.name ?? 'Your pharmacy';
    body =
      status === 'VERIFIED'
        ? `Altruist: your prescription ${rx.id} is verified. Open the app to check out.`
        : `Altruist: ${pharmacy} couldn't accept prescription ${rx.id}. Open the app to see why and upload again.`;
  } else if (table === 'orders' && ORDER_TEXT[status]) {
    const { data: order } = await admin
      .from('orders')
      .select('id, user_id, reference')
      .eq('id', id)
      .maybeSingle();
    if (!order) return json({ skipped: 'order not found' });
    userId = order.user_id;

    const { data: prefs } = await admin
      .from('notification_preferences')
      .select('order_status, channel_sms')
      .eq('user_id', order.user_id)
      .maybeSingle();
    // Defaults match the table's: both on.
    if (!(prefs?.order_status ?? true) || !(prefs?.channel_sms ?? true)) {
      return json({ skipped: 'sms order updates are off' });
    }
    body = `Altruist: order ${order.reference ?? order.id} ${ORDER_TEXT[status]}.`;
  } else {
    return json({ skipped: 'not a notified change' });
  }

  const { data: account } = await admin.auth.admin.getUserById(userId);
  const user = account?.user;
  if (!user?.phone || !user.phone_confirmed_at) {
    return json({ skipped: 'no confirmed phone number' });
  }
  const to = user.phone.startsWith('+') ? user.phone : `+${user.phone}`;

  // 3. Claim the message, then send it.
  const key = `${table}:${id}:${status}`;
  const { error: claimError } = await admin.from('notification_log').insert({ key, channel: 'sms' });
  if (claimError) {
    if (claimError.code === '23505') return json({ skipped: 'already sent' });
    return json({ error: 'log unavailable' }, 500);
  }

  const form = new URLSearchParams({ To: to, Body: body });
  if (service) form.set('MessagingServiceSid', service);
  else form.set('From', from!);

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    // Release the claim so a later retry can still send.
    await admin.from('notification_log').delete().eq('key', key);
    console.error(`notify: Twilio ${res.status}`, (detail as { code?: number; message?: string }).code, (detail as { message?: string }).message);
    return json({ error: 'send failed', status: res.status }, 502);
  }
  const sent = (await res.json()) as { sid?: string };
  return json({ sent: sent.sid, key });
});
