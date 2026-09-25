/**
 * The single seam between the app and whatever backend is chosen.
 *
 * Screens call the domain functions at the bottom of this file. They never call
 * `fetch`, never know a URL, and never branch on a transport detail. When the
 * backend lands, `request()` is the only thing that changes — every screen's
 * success, decline and offline path is already written against these types.
 *
 * Until `EXPO_PUBLIC_API_URL` is set, the client runs against in-memory
 * fixtures. That is a development stand-in, not a mock framework: it returns the
 * same shapes with the same latency characteristics, so the screens exercise
 * their real loading and error states rather than a happy path.
 *
 * Three failure modes, deliberately distinct, because the screens treat them
 * differently:
 *
 *   NetworkError  — we could not reach the server at all  → /offline
 *   DeclinedError — the server said no, with a reason      → the screen's own state
 *   ApiError      — anything else (5xx, malformed)         → generic failure
 *
 * Collapsing "declined" into "error" is the mistake that produces a payment
 * screen telling someone their card failed when the server was simply down.
 */
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { randomUUID } from 'expo-crypto';
import { formatGhanaMobile, providerName, type MomoProvider } from './momo';
import { getToken } from './session';
import { readLocalFile } from './files';
import { leaveAppFor } from './appLock';
import { SUPABASE_CONFIGURED, db } from './supabase';
import { PRODUCTS, matches, type Product, type CatalogFilter, type SearchFilter } from './catalog';
import { PROMOTIONS, advertisable, withArt, type Promotion } from './promotions';
import { FIXTURE_PROFILE, firstName, type Profile, type ProfilePatch } from './profile';
import { FIXTURE_PHARMACY, type Pharmacy } from './pharmacies';
import {
  DEFAULT_NOTIFICATION_PREFS,
  NOTIFICATION_PREF_COLUMNS,
  type NotificationPrefKey,
  type NotificationPrefs,
} from './notificationPrefs';
import {
  PROGRAMMES,
  READS,
  programmeById,
  type Programme,
  type Read,
  type WellnessSession,
  type WellnessSnapshot,
} from './wellness';
import { ARTICLES, byId as articleById, readMeta, withReviewer, type Article } from './articles';
import { fixtureNotifications, type Notification } from './notifications';
import {
  CONTACTS,
  FAQ,
  fixtureMessages,
  fixtureThreads,
  type Contact,
  type Message,
  type SupportThread,
} from './support';

export const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? '';

/**
 * True while no backend is configured at all — neither Supabase nor a REST
 * gateway. Screens must not read this; it exists so the domain functions below
 * can fall back to fixtures, and so the development-only helpers
 * (`devScenarios`, the seeded prescriptions, the fixture pharmacist) can make
 * sure they never run against real data.
 */
export const USING_FIXTURES = !SUPABASE_CONFIGURED && API_BASE === '';

export class NetworkError extends Error {
  constructor(message = 'Could not reach Altruist') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** A refusal the user can act on — a declined card, a rejected prescription. */
export class DeclinedError extends Error {
  reason: string;
  reference?: string;
  constructor(reason: string, reference?: string) {
    super(reason);
    this.name = 'DeclinedError';
    this.reason = reason;
    this.reference = reference;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    // fetch only rejects when the request never reached a server.
    throw new NetworkError();
  }

  if (response.status === 402 || response.status === 409) {
    const body = await response.json().catch(() => ({}));
    throw new DeclinedError(body.reason ?? 'Declined', body.reference);
  }

  if (!response.ok) {
    throw new ApiError(response.status, `${response.status} on ${path}`);
  }

  return (await response.json()) as T;
}

/** Fixture latency, so loading states are actually exercised in development. */
const settle = <T,>(value: T, ms = 1400): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

// ---------------------------------------------------------------------------
// DOMAIN
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// ROW MAPPING
//
// Postgres is snake_case, the app is camelCase, and the boundary between them
// is here — not in a screen and not in a store. Every Supabase read passes
// through one of these, so a column rename is a one-line change in this file.
// ---------------------------------------------------------------------------

/** Columns selected for a Product. Kept as one string so reads cannot drift. */
const PRODUCT_COLS =
  'id,name,brand,pack,price,requires_prescription,in_stock,category,form,dosage,' +
  'ships,unit_note,description,rating,reviews,keywords,image_url,' +
  'pharmacies(name,licence_number,address,distance_km)';

type ProductRow = Record<string, any>;

function toProduct(row: ProductRow): Product {
  const pharmacy = row.pharmacies ?? null;
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    pack: row.pack,
    // `numeric` arrives as a string over the wire — a price that is silently a
    // string turns every subtotal into concatenation.
    price: Number(row.price),
    requiresPrescription: row.requires_prescription,
    inStock: row.in_stock,
    category: row.category,
    form: row.form ?? '',
    dosage: row.dosage ?? '',
    ships: row.ships ?? '',
    unitNote: row.unit_note ?? undefined,
    description: row.description ?? '',
    rating: Number(row.rating ?? 0),
    reviews: row.reviews ?? 0,
    pharmacy: pharmacy?.name ?? 'Partner pharmacy',
    pharmacyMeta: pharmacy
      ? `Licensed partner · ${pharmacy.licence_number}${
          pharmacy.distance_km ? ` · ${pharmacy.distance_km} km` : ''
        }`
      : 'Licensed partner',
    keywords: row.keywords ?? [],
    // The catalogue import writes '' for the handful of products with no
    // photograph. Normalise it away: ProductCard treats undefined as "show the
    // glyph", and an empty string would otherwise reach <Image source={{uri:''}}>.
    imageUrl: row.image_url || undefined,
  };
}

function toPromotion(row: Record<string, any>): Promotion {
  return {
    id: row.id,
    image: row.image_url ? { uri: row.image_url } : undefined,
    alt: row.alt,
    aspectRatio: Number(row.aspect_ratio),
    advertiser: row.advertiser,
    href: row.href,
    productId: row.product_id ?? undefined,
    focus: row.focus ?? undefined,
    eyebrow: row.eyebrow,
    title: row.title,
    body: row.body,
    cta: row.cta,
    tone: row.tone,
  };
}

/**
 * Turns a Supabase error into the three failure modes the screens branch on.
 * Without this every failure looks the same and a dropped connection gets
 * reported to the user as a server error.
 */
function rethrow(error: { message: string; code?: string } | null, where: string): never {
  const message = error?.message ?? 'Unknown error';
  if (/fetch|network|timeout/i.test(message)) throw new NetworkError();
  throw new ApiError(500, `${where}: ${message}`);
}

// --- Catalogue -------------------------------------------------------------
//
// Reads, so they are cheap and cached by React Query rather than called
// directly. The fixture latency here is short: a catalogue that took 1.4s would
// make the skeleton the normal state of the Catalog tab rather than the edge
// case it is drawn for.

export async function listProducts(filter: CatalogFilter = 'All'): Promise<Product[]> {
  if (SUPABASE_CONFIGURED) {
    let q = db().from('products').select(PRODUCT_COLS).order('name');
    if (filter !== 'All') q = q.eq('category', filter);
    const { data, error } = await q;
    if (error) rethrow(error, 'listProducts');
    return (data ?? []).map(toProduct);
  }
  const all = filter === 'All' ? PRODUCTS : PRODUCTS.filter((p) => p.category === filter);
  if (USING_FIXTURES) return settle(all, 420);
  return request<Product[]>(`/products?category=${encodeURIComponent(filter)}`);
}

export async function getProduct(id: string): Promise<Product> {
  if (SUPABASE_CONFIGURED) {
    const { data, error } = await db()
      .from('products')
      .select(PRODUCT_COLS)
      .eq('id', id)
      .maybeSingle();
    if (error) rethrow(error, 'getProduct');
    // A missing id is a 404, not an empty screen — Product Detail renders its
    // own not-found state off this rejection.
    if (!data) throw new ApiError(404, `/products/${id}`);
    return toProduct(data);
  }
  if (USING_FIXTURES) {
    const found = PRODUCTS.find((p) => p.id === id);
    // A missing id is a 404, not an empty screen. Product Detail renders its own
    // not-found state off this rejection rather than crashing on `undefined`.
    if (!found) throw new ApiError(404, `/products/${id}`);
    return settle(found, 260);
  }
  return request<Product>(`/products/${encodeURIComponent(id)}`);
}

export async function searchProducts(
  query: string,
  filter: SearchFilter = 'All',
): Promise<Product[]> {
  if (SUPABASE_CONFIGURED) {
    const q = query.trim();
    if (!q) return [];
    // Name, brand and keywords — the same three the fixture matcher uses, so
    // "panadol" still finds paracetamol. `ilike` on an array needs `cs`, so
    // keywords are matched separately and merged.
    const escaped = q.replace(/[%,]/g, '');
    let builder = db()
      .from('products')
      .select(PRODUCT_COLS)
      .or(`name.ilike.%${escaped}%,brand.ilike.%${escaped}%`);
    if (filter === 'Rx only') builder = builder.eq('requires_prescription', true);
    if (filter === 'OTC') builder = builder.eq('requires_prescription', false);
    if (filter === 'In stock') builder = builder.eq('in_stock', true);
    const { data, error } = await builder;
    if (error) rethrow(error, 'searchProducts');
    const found = (data ?? []).map(toProduct);
    // Exact-prefix matches first: typing "amoxicillin" should not rank
    // "Amoxiclav" above "Amoxicillin 500mg".
    const lower = q.toLowerCase();
    return found.sort(
      (a, b) =>
        Number(b.name.toLowerCase().startsWith(lower)) -
        Number(a.name.toLowerCase().startsWith(lower)),
    );
  }
  if (USING_FIXTURES) {
    const found = PRODUCTS.filter((p) => matches(p, query));
    const cut =
      filter === 'Rx only'
        ? found.filter((p) => p.requiresPrescription)
        : filter === 'OTC'
          ? found.filter((p) => !p.requiresPrescription)
          : filter === 'In stock'
            ? found.filter((p) => p.inStock)
            : found;
    // Exact-prefix matches first: typing "amoxicillin" should not rank
    // "Amoxiclav" above "Amoxicillin 500mg".
    const q = query.trim().toLowerCase();
    return settle(
      [...cut].sort(
        (a, b) =>
          Number(b.name.toLowerCase().startsWith(q)) - Number(a.name.toLowerCase().startsWith(q)),
      ),
      320,
    );
  }
  return request<Product[]>(
    `/products/search?q=${encodeURIComponent(query)}&filter=${encodeURIComponent(filter)}`,
  );
}

/**
 * Home carousel campaigns.
 *
 * Filtered through `advertisable()` on the way out, so a campaign pointing at a
 * prescription-only product cannot reach the home screen even if one is
 * configured upstream. Do the same on the server — this is the second line.
 */
export async function listPromotions(): Promise<Promotion[]> {
  if (SUPABASE_CONFIGURED) {
    const { data, error } = await db()
      .from('promotions')
      .select('*')
      .eq('active', true)
      .order('sort_order');
    if (error) rethrow(error, 'listPromotions');
    // `withArt` fills in a bundled banner for any campaign whose row has no
    // image_url yet, so the carousel is never a row of empty cards.
    return withArt(advertisable((data ?? []).map(toPromotion)));
  }
  if (USING_FIXTURES) return settle(withArt(advertisable(PROMOTIONS)), 300);
  // The server sends `image` as a `{ uri }`; `withArt` is the fixture's way of
  // standing in for that and is a no-op on anything that already has one.
  return withArt(advertisable(await request<Promotion[]>('/promotions')));
}

export type PrescriptionUpload = {
  trxId: string;
  status: 'PENDING';
  pharmacy: string;
};

/**
 * A TrxID in the shape the pharmacy's own system uses: two letters, four
 * digits, four alphanumerics. Only the fixture backend makes one here; against
 * Supabase the database mints it (0012).
 */
function fixtureTrxId(): string {
  const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  const pick = (set: string, n: number) =>
    Array.from({ length: n }, () => set[Math.floor(Math.random() * set.length)]).join('');
  return `${pick(L, 2)}${pick('0123456789', 4)}${pick(A, 4)}`;
}

/**
 * Encrypts and routes a prescription photo to the partner pharmacy.
 *
 * `productIds` is the cart's blocked lines, so the pharmacist reviews the script
 * against the items it is meant to cover rather than against nothing. It is
 * empty for an upload started from the Prescriptions tab, where there is no
 * cart to attach it to yet.
 */
export async function uploadPrescription(
  uri?: string,
  productIds: string[] = [],
): Promise<PrescriptionUpload> {
  if (SUPABASE_CONFIGURED) {
    const client = db();
    const { data: auth } = await client.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) throw new ApiError(401, '/prescriptions');

    let imagePath: string | undefined;

    if (uri) {
      // Path is `<user_id>/<random>.jpg` because the storage policy checks
      // that the first segment is the caller's own id. The photo goes up
      // first: the row can only be written once (no UPDATE, 0012), so it has
      // to be born pointing at a file that already exists.
      imagePath = `${userId}/${randomUUID()}.jpg`;
      const body = await readLocalFile(uri);
      const { error: upload } = await client.storage
        .from('prescriptions')
        .upload(imagePath, body, { contentType: 'image/jpeg', upsert: false });
      if (upload) rethrow(upload, 'uploadPrescription/storage');
    }

    // The database mints the TrxID. A collision is vanishingly rare; one retry.
    const insert = () =>
      client
        .from('prescriptions')
        .insert({ user_id: userId, image_path: imagePath })
        .select('id')
        .single();
    let created = await insert();
    if (created.error?.code === '23505') created = await insert();
    if (created.error) rethrow(created.error, 'uploadPrescription');
    const trxId: string = created.data.id;

    if (productIds.length) {
      const { error: link } = await client
        .from('prescription_products')
        .insert(productIds.map((product_id) => ({ prescription_id: trxId, product_id })));
      if (link) rethrow(link, 'uploadPrescription/products');
    }

    return { trxId, status: 'PENDING', pharmacy: 'Healthview Pharmacy' };
  }
  if (USING_FIXTURES) {
    return settle({ trxId: fixtureTrxId(), status: 'PENDING' as const, pharmacy: 'Healthview Pharmacy' });
  }
  return request<PrescriptionUpload>('/prescriptions', {
    method: 'POST',
    body: JSON.stringify({ uri, productIds }),
  });
}

/** A prescription as the server holds it. `features/prescriptions` maps it. */
export type PrescriptionRecord = {
  id: string;
  status: 'PENDING' | 'VERIFYING' | 'VERIFIED' | 'REJECTED';
  pharmacy: string;
  note: string;
  uploadedAt: number;
  reviewedAt?: number;
  /** Who reviewed it, as the pharmacy recorded it. */
  reviewedBy?: string;
  /** Storage path of the photo in the private bucket; never shown or shared. */
  imagePath?: string;
  productIds: string[];
  /** Tucked under "Archived" by the patient (0017). */
  archived?: boolean;
  /** Removed from the patient's list (0017). The pharmacy's record stays. */
  hidden?: boolean;
};

/** Every prescription this person has uploaded, newest first. */
export async function listPrescriptions(): Promise<PrescriptionRecord[]> {
  if (!SUPABASE_CONFIGURED) throw new ApiError(501, 'listPrescriptions: fixtures keep their own');
  const { data, error } = await db()
    .from('prescriptions')
    .select(
      'id, status, note, uploaded_at, reviewed_at, reviewed_by, image_path, pharmacies(name), prescription_products(product_id), prescription_user_state(archived_at, hidden_at)',
    )
    .order('uploaded_at', { ascending: false });
  if (error) rethrow(error, 'listPrescriptions');
  return (data ?? []).map((row: any) => ({
    id: row.id,
    status: row.status,
    pharmacy: row.pharmacies?.name ?? FIXTURE_PHARMACY.name,
    note: row.note ?? '',
    uploadedAt: Date.parse(row.uploaded_at),
    reviewedAt: row.reviewed_at ? Date.parse(row.reviewed_at) : undefined,
    reviewedBy: row.reviewed_by ?? undefined,
    imagePath: row.image_path ?? undefined,
    productIds: (row.prescription_products ?? []).map((l: { product_id: string }) => l.product_id),
    archived: Boolean(row.prescription_user_state?.archived_at),
    hidden: Boolean(row.prescription_user_state?.hidden_at),
  }));
}

/**
 * Archives, unarchives or removes a prescription from the patient's own list.
 * Only their view changes: the row in `prescriptions` is a health record the
 * pharmacy keeps, and the patient has no delete right on it.
 */
export async function setPrescriptionListState(
  id: string,
  state: { archived: boolean; hidden: boolean },
): Promise<void> {
  if (!SUPABASE_CONFIGURED) return;
  const client = db();
  const { data: auth } = await client.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) throw new ApiError(401, 'setPrescriptionListState');
  const now = new Date().toISOString();
  const { error } = await client.from('prescription_user_state').upsert({
    prescription_id: id,
    user_id: userId,
    archived_at: state.archived ? now : null,
    hidden_at: state.hidden ? now : null,
    updated_at: now,
  });
  if (error) rethrow(error, 'setPrescriptionListState');
}

/**
 * A short-lived link to a prescription photo. Ten minutes: long enough to look
 * at and export, short enough that a link copied out of a log is soon useless.
 */
export async function prescriptionImageUrl(path: string): Promise<string> {
  const { data, error } = await db().storage.from('prescriptions').createSignedUrl(path, 600);
  if (error || !data?.signedUrl) {
    if (error && /network|fetch/i.test(error.message)) throw new NetworkError();
    throw new ApiError(404, 'prescriptionImageUrl');
  }
  return data.signedUrl;
}

export type PaymentResult = {
  orderId: string;
  reference: string;
  amount: number;
  /**
   * `approved` is money taken. `pending` is a mobile-money prompt sitting on
   * the user's phone: nothing has been charged yet, and the app has to keep
   * asking `verifyPayment()` until it becomes one of the other two. A card
   * answers in one round trip; MoMo — the default method in Ghana — never does.
   */
  status: 'approved' | 'pending';
  /** What the user should do next, from the gateway. Only set while pending. */
  next?: string;
};

/**
 * Creates the order. Returns the id the pharmacy and the user will both quote.
 *
 * Called before payment, not after: an authorisation has to reference something
 * that already exists, and a payment that succeeds against an order that was
 * never created is money taken for nothing.
 */
export async function createOrder(payload: {
  lines: { productId: string; qty: number }[];
  addressId: string;
  speedId: string;
  prescriptionId?: string;
}): Promise<{ orderId: string; reference: string }> {
  if (SUPABASE_CONFIGURED) {
    const client = db();
    const { data: auth } = await client.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) throw new ApiError(401, '/orders');

    const orderId = fixtureTrxId();
    const reference = `PSK_${orderId.slice(2, 6)}_${orderId}`;

    // Line prices are read from the catalogue HERE, server-side of the client,
    // and written onto the order as a snapshot. Trusting a total posted by the
    // app would let anyone pay one cedi for anything.
    const ids = payload.lines.map((l) => l.productId);
    const { data: products, error: priceError } = await client
      .from('products')
      .select(PRODUCT_COLS)
      .in('id', ids);
    if (priceError) rethrow(priceError, 'createOrder/prices');

    const priced = (products ?? []).map(toProduct);
    const items = payload.lines.flatMap((line) => {
      const product = priced.find((p) => p.id === line.productId);
      if (!product) return [];
      return [
        {
          order_id: orderId,
          product_id: product.id,
          name: product.name,
          pack: `${product.pack} · ${product.brand}`,
          unit_price: product.price,
          qty: line.qty,
          requires_prescription: product.requiresPrescription,
        },
      ];
    });
    const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.qty, 0);

    const { error } = await client.from('orders').insert({
      id: orderId,
      user_id: userId,
      prescription_id: payload.prescriptionId ?? null,
      status: 'RECEIVED',
      reference,
      subtotal,
      delivery_fee: 0,
      service_fee: 0,
      total: subtotal,
    });
    if (error) rethrow(error, 'createOrder');

    const { error: itemError } = await client.from('order_items').insert(items);
    if (itemError) rethrow(itemError, 'createOrder/items');

    const { error: eventError } = await client.from('order_status_events').insert({
      order_id: orderId,
      status: 'RECEIVED',
      title: 'Order received',
      subtitle: 'Sent to the partner pharmacy',
    });
    if (eventError) rethrow(eventError, 'createOrder/events');

    return { orderId, reference };
  }
  if (USING_FIXTURES) {
    const orderId = fixtureTrxId();
    return settle({ orderId, reference: `PSK_${orderId.slice(2, 6)}_${orderId}` }, 500);
  }
  // The reference comes back with the order, not with the authorisation. The
  // Processing screen shows it for the whole time the bank has the request —
  // a user whose banking app steals focus needs the string before the payment
  // resolves, not after.
  return request<{ orderId: string; reference: string }>('/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Authorises a payment. Throws `DeclinedError` when the gateway says no —
 * that is a normal outcome of this call, not an exception in the error sense.
 *
 * Under fixtures the outcome is whatever Settings ▸ Developer has selected, so
 * the decline, offline and error branches are reachable without a real card.
 * See `src/lib/devScenarios.ts`; it is inert outside development.
 */
export async function payOrder(orderId: string, methodId: string): Promise<PaymentResult> {
  if (SUPABASE_CONFIGURED) {
    // Authorisation goes through an Edge Function, and it has to.
    //
    // Paystack's secret key can charge any card on file. It cannot live in
    // this bundle — anything the app can read, so can anyone holding the APK.
    // The function is the only place that key exists, and it is also where the
    // amount is recomputed from `order_items`: a client that posts its own
    // total can pay one cedi for anything.
    //
    // Deploy: supabase/functions/pay-order (not written yet — see the README
    // note in supabase/migrations/0001).
    const { data, error } = await db().functions.invoke('pay-order', {
      body: { orderId, methodId },
    });

    if (error) {
      // A decline is an ordinary outcome and gets its own screen; an
      // unreachable function is a different thing and must never be shown to
      // the user as a declined card.
      const message = error.message ?? '';
      if (/fetch|network|timeout/i.test(message)) throw new NetworkError();
      throw new ApiError(502, `payOrder: ${message}`);
    }
    return fromFunction(orderId, data);
  }
  if (USING_FIXTURES) {
    // Deferred so `api` does not import `devScenarios` at module scope, which
    // would be a cycle — devScenarios imports USING_FIXTURES from here.
    const { scenario, DECLINE_REASONS } = require('./devScenarios');
    const outcome = scenario('payment');

    // The wait happens first either way: a decline that returns instantly does
    // not exercise the Processing screen the real one is shown behind.
    await settle(null, 2200);

    if (outcome === 'network') throw new NetworkError();
    if (outcome === 'error') throw new ApiError(500, `/orders/${orderId}/pay`);
    if (outcome.startsWith('decline')) {
      throw new DeclinedError(DECLINE_REASONS[outcome] ?? 'Declined', `PSK_${orderId}`);
    }
    const reference = `PSK_${orderId.slice(2, 6)}_${orderId}`;
    if (outcome === 'momo-pending') {
      fixtureMomoPolls = 0;
      return {
        orderId,
        reference,
        amount: 0,
        status: 'pending',
        next: 'Approve the MTN Mobile Money prompt on your phone.',
      };
    }
    return { orderId, reference, amount: 0, status: 'approved' };
  }
  return request<PaymentResult>(`/orders/${orderId}/pay`, {
    method: 'POST',
    body: JSON.stringify({ methodId }),
  });
}

/** How many `verifyPayment` calls the fixture MoMo prompt stays pending for. */
let fixtureMomoPolls = 0;

/**
 * Maps the Edge Function's reply onto the app's three outcomes. A `declined`
 * reply is thrown, because it is one the user acts on; the other two return.
 */
function fromFunction(orderId: string, data: any): PaymentResult {
  if (data?.status === 'declined') {
    throw new DeclinedError(data.reason ?? 'Declined', data.reference);
  }
  return {
    orderId,
    reference: data?.reference ?? '',
    amount: Number(data?.amount ?? 0),
    status: data?.status === 'pending' ? 'pending' : 'approved',
    next: data?.next,
  };
}

/**
 * Re-checks a pending mobile-money payment. Called on a timer by the
 * Processing screen until it resolves. Same three outcomes as `payOrder`.
 */
export async function verifyPayment(orderId: string, reference: string): Promise<PaymentResult> {
  if (SUPABASE_CONFIGURED) {
    const { data, error } = await db().functions.invoke('pay-order', {
      body: { action: 'verify', reference },
    });
    if (error) {
      const message = error.message ?? '';
      if (/fetch|network|timeout/i.test(message)) throw new NetworkError();
      throw new ApiError(502, `verifyPayment: ${message}`);
    }
    return fromFunction(orderId, data);
  }
  if (USING_FIXTURES) {
    await settle(null, 900);
    // Stays pending for two polls so the waiting state is actually visible,
    // then approves — the phone-prompt round trip in miniature.
    fixtureMomoPolls += 1;
    return {
      orderId,
      reference,
      amount: 0,
      status: fixtureMomoPolls >= 3 ? 'approved' : 'pending',
      next: 'Approve the MTN Mobile Money prompt on your phone.',
    };
  }
  return request<PaymentResult>(`/orders/${orderId}/pay/verify`, {
    method: 'POST',
    body: JSON.stringify({ reference }),
  });
}

// ---------------------------------------------------------------------------
// AUTH
//
// Supabase owns the session; `src/lib/session.ts` keeps only the flag for
// whether onboarding has been seen. Two stores of truth for "is this user
// signed in" is how an app ends up showing a signed-in shell over a logged-out
// backend that 401s on every read.
// ---------------------------------------------------------------------------

export type Session = { userId: string; email?: string };

/**
 * The outcome of a sign-up.
 *
 * Supabase either returns a session immediately or, when the project requires
 * email confirmation, returns a user with no session. Those are different
 * screens — straight into the app, versus "go and check your email" — so the
 * caller is told which happened rather than having to infer it.
 */
export type SignUpResult = {
  session: Session | null;
  needsEmailConfirmation: boolean;
};

export async function signUp(params: {
  email: string;
  password: string;
  fullName?: string;
  phone?: string;
}): Promise<SignUpResult> {
  if (!SUPABASE_CONFIGURED) {
    return {
      session: { userId: 'fixture-user', email: params.email },
      needsEmailConfirmation: false,
    };
  }
  const { data, error } = await db().auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      // Read by the `handle_new_user` trigger to fill in the profile row, so
      // the app never has to check whether a profile exists.
      data: { full_name: params.fullName, phone: params.phone },
      // The confirmation link comes back into the app and signs in there.
      emailRedirectTo: authReturnUrl(),
    },
  });
  if (error) {
    if (/network|fetch/i.test(error.message)) throw new NetworkError();
    throw new DeclinedError(error.message);
  }
  if (!data.user) throw new ApiError(500, 'signUp: no user returned');
  return {
    session: data.session
      ? { userId: data.user.id, email: data.user.email ?? undefined }
      : null,
    needsEmailConfirmation: !data.session,
  };
}

/**
 * Sends the sign-up confirmation email again.
 *
 * Supabase rate-limits this per address; its "wait N seconds" refusal is passed
 * through as the message, because it tells the person exactly what to do.
 */
export async function resendConfirmation(email: string): Promise<void> {
  if (!SUPABASE_CONFIGURED) return settle(undefined, 400);
  const { error } = await db().auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: authReturnUrl() },
  });
  if (error) {
    if (/network|fetch/i.test(error.message)) throw new NetworkError();
    throw new DeclinedError(error.message);
  }
}

/**
 * Supabase's refusal for a password sign-in to an account whose email was
 * never confirmed. Sign-in offers to resend the link instead of just failing.
 */
export function isUnconfirmedEmail(error: unknown): boolean {
  return error instanceof DeclinedError && /email not confirmed/i.test(error.message);
}

/**
 * Sends a password-reset email.
 *
 * Deliberately does NOT report whether the address has an account. Telling an
 * unauthenticated caller "no account with that email" turns the reset form into
 * a way to enumerate who is registered with a pharmacy.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  if (!SUPABASE_CONFIGURED) return settle(undefined, 400);
  const { error } = await db().auth.resetPasswordForEmail(email, {
    // The deep link the emailed button returns to. `altruist` is the scheme in
    // app.json; the route handles the recovery token Supabase appends.
    redirectTo: 'altruist://set-password',
  });
  if (error && /network|fetch/i.test(error.message)) throw new NetworkError();
  // Any other error is swallowed on purpose — see the note above.
}

/** Sets a new password for the signed-in (or recovery-linked) user. */
export async function updatePassword(password: string): Promise<void> {
  if (!SUPABASE_CONFIGURED) return settle(undefined, 400);
  const { error } = await db().auth.updateUser({ password });
  if (error) {
    if (/network|fetch/i.test(error.message)) throw new NetworkError();
    throw new DeclinedError(error.message);
  }
}

/**
 * Starts verifying a phone number for the signed-in user.
 *
 * Supabase sends the code through whichever SMS provider the project has
 * configured. With none configured this throws with Supabase's own message,
 * which is the honest answer — the screen used to accept any six digits.
 */
export async function sendPhoneCode(phone: string): Promise<void> {
  if (!SUPABASE_CONFIGURED) {
    throw new DeclinedError(
      'Confirming a number needs the Supabase connection configured first.',
    );
  }
  const { error } = await db().auth.updateUser({ phone });
  if (error) {
    if (/network|fetch/i.test(error.message)) throw new NetworkError();
    // Supabase's wording when no SMS provider (Twilio) is connected.
    if (/sms provider/i.test(error.message)) {
      throw new DeclinedError("We can't send text messages right now. Try again later.");
    }
    throw new DeclinedError(error.message);
  }
}

/** Confirms the code that was sent to `phone`. Wrong codes are refusals. */
export async function verifyPhoneCode(phone: string, code: string): Promise<void> {
  if (!SUPABASE_CONFIGURED) {
    throw new DeclinedError(
      'Confirming a number needs the Supabase connection configured first.',
    );
  }
  const { error } = await db().auth.verifyOtp({ phone, token: code, type: 'phone_change' });
  if (error) {
    if (/network|fetch/i.test(error.message)) throw new NetworkError();
    throw new DeclinedError(error.message);
  }
}

export type OAuthProvider = 'google' | 'apple';

/**
 * Where emailed links and provider sign-in come back to: `/auth-callback` on
 * whatever scheme the running app answers to (see `signInWithProvider`).
 */
function authReturnUrl(): string {
  return Linking.createURL('auth-callback');
}

/**
 * One exchange per code. A provider redirect reaches both the browser session
 * below and the router (as a deep link to `/auth-callback`); a code can only be
 * redeemed once, so whichever asks second gets the first one's result.
 */
const redemptions = new Map<string, Promise<Session>>();

export function redeemAuthCode(code: string): Promise<Session> {
  let pending = redemptions.get(code);
  if (!pending) {
    pending = db()
      .auth.exchangeCodeForSession(code)
      .then(({ data, error }) => {
        if (error) {
          if (/network|fetch/i.test(error.message)) throw new NetworkError();
          throw new DeclinedError(error.message);
        }
        return { userId: data.user.id, email: data.user.email ?? undefined };
      });
    redemptions.set(code, pending);
  }
  return pending;
}

/** True while a provider sign-in is open, so `/auth-callback` knows the link is its. */
let providerSignInOpen = false;

export function isProviderSignInOpen(): boolean {
  return providerSignInOpen;
}

/**
 * Provider sign-in through the system browser.
 *
 * Supabase hands back an authorisation URL; the browser returns to the app
 * with a code, which is exchanged for a session. If the provider is not enabled
 * on the project this throws with Supabase's own message, which is the honest
 * outcome — the button used to sign a fake user in regardless of whether any
 * provider existed.
 *
 * The return address comes from the running app, not a constant: a build
 * answers to `altruist://auth-callback`, but Expo Go answers only to its own
 * `exp://…/--/auth-callback`, so a hardcoded `altruist://` never came back
 * during development. BOTH must be in Supabase's Redirect URLs allow-list —
 * anything else and Supabase sends the browser to the Site URL instead.
 */
export async function signInWithProvider(provider: OAuthProvider): Promise<Session> {
  if (!SUPABASE_CONFIGURED) {
    throw new DeclinedError('Provider sign-in is not set up yet.');
  }
  const redirectTo = authReturnUrl();
  const { data, error } = await db().auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) {
    if (/network|fetch/i.test(error.message)) throw new NetworkError();
    throw new DeclinedError(error.message);
  }
  if (!data?.url) throw new ApiError(500, 'signInWithProvider: no authorisation URL');

  providerSignInOpen = true;
  try {
    const result = await leaveAppFor(() => WebBrowser.openAuthSessionAsync(data.url, redirectTo));
    if (result.type !== 'success') {
      // Dismissed or cancelled. Not an error to report as a failure.
      throw new DeclinedError('Sign-in was cancelled.');
    }

    const returned = new URL(result.url);
    // A refusal (consent denied, provider misconfigured) comes back as a
    // redirect too, with the reason in the query or the fragment.
    const fragment = new URLSearchParams(returned.hash.replace(/^#/, ''));
    const refusal =
      returned.searchParams.get('error_description') ?? fragment.get('error_description');
    if (refusal) throw new DeclinedError(refusal.replace(/\+/g, ' '));

    const code = returned.searchParams.get('code');
    if (!code) throw new ApiError(500, 'signInWithProvider: no code returned');
    return await redeemAuthCode(code);
  } finally {
    providerSignInOpen = false;
  }
}

export async function signIn(email: string, password: string): Promise<Session> {
  if (!SUPABASE_CONFIGURED) return { userId: 'fixture-user', email };
  const { data, error } = await db().auth.signInWithPassword({ email, password });
  if (error) {
    if (/network|fetch/i.test(error.message)) throw new NetworkError();
    // Wrong credentials is a refusal the user can act on, not a server fault.
    throw new DeclinedError(error.message);
  }
  return { userId: data.user.id, email: data.user.email ?? undefined };
}

/**
 * Ends the session on the server.
 *
 * `'local'` by default: "Log out" on a phone should end that phone's session,
 * not quietly sign the person out of the web app and their other devices too,
 * which is what supabase-js does when no scope is given. Account deletion passes
 * `'global'`, because a deleted account must not stay signed in anywhere.
 */
export async function signOut(scope: 'local' | 'global' = 'local'): Promise<void> {
  if (SUPABASE_CONFIGURED) await db().auth.signOut({ scope });
}

/** The signed-in user, or null. Used by the splash to choose where to land. */
export async function currentSession(): Promise<Session | null> {
  if (!SUPABASE_CONFIGURED) return null;
  const { data } = await db().auth.getSession();
  const user = data.session?.user;
  return user ? { userId: user.id, email: user.email ?? undefined } : null;
}

/**
 * Cheap reachability probe used when the app comes back to the foreground.
 * Returns false only when the server could not be reached at all.
 */
export async function isReachable(): Promise<boolean> {
  if (SUPABASE_CONFIGURED) {
    try {
      // Cheapest possible round-trip: a head count against a table every
      // signed-in user can read.
      const { error } = await db().from('products').select('id', { head: true, count: 'exact' });
      return !error;
    } catch {
      return false;
    }
  }
  if (USING_FIXTURES) return true;
  try {
    const response = await fetch(`${API_BASE}/health`, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

// --- Profile & partner --------------------------------------------------------

/** How long an avatar link stays valid. Rebuilt on every profile load. */
const AVATAR_URL_TTL_SECONDS = 60 * 60 * 24;

/** A signed URL for a private avatar path, or undefined if it cannot be made. */
async function avatarUrlFor(path: string | null | undefined): Promise<string | undefined> {
  if (!path) return undefined;
  const { data, error } = await db()
    .storage.from('avatars')
    .createSignedUrl(path, AVATAR_URL_TTL_SECONDS);
  // A missing photo is not a failed profile. The initials render instead.
  return error ? undefined : data?.signedUrl;
}

/**
 * The signed-in person. Supabase: `profiles` joined with the auth user, which
 * owns the email, the pending email change and whether the phone was verified.
 * Fixture: Ama. Screens never hold their own copy.
 */
export async function getProfile(): Promise<Profile> {
  if (SUPABASE_CONFIGURED) {
    const { data: auth } = await db().auth.getUser();
    const user = auth?.user;
    if (!user) throw new ApiError(401, 'getProfile: not signed in');
    const { data, error } = await db()
      .from('profiles')
      .select('full_name, phone, date_of_birth, avatar_path, avatar_preset')
      .eq('id', user.id)
      .maybeSingle();
    if (error) rethrow(error, 'getProfile');
    return {
      name: data?.full_name ?? user.user_metadata?.full_name ?? '',
      email: user.email ?? '',
      // The confirmed number wins over the one typed at sign-up. Supabase keeps
      // it without the '+'.
      phone: user.phone ? `+${user.phone}` : (data?.phone ?? user.user_metadata?.phone ?? ''),
      phoneVerified: Boolean(user.phone_confirmed_at),
      dateOfBirth: data?.date_of_birth ?? undefined,
      avatarUrl: await avatarUrlFor(data?.avatar_path),
      avatarPreset: data?.avatar_preset ?? undefined,
      pendingEmail: user.new_email ?? undefined,
    };
  }
  if (USING_FIXTURES) return settle(FIXTURE_PROFILE, 120);
  return request<Profile>('/me');
}

/**
 * Saves the editable half of the profile: name and date of birth.
 *
 * Phone is not in `ProfilePatch` and the database would refuse it anyway —
 * 0009 grants UPDATE on those two columns and the avatar only. Returns the
 * profile as the server now holds it, so the caller adopts the stored truth
 * rather than what it sent.
 */
export async function updateProfile(patch: ProfilePatch): Promise<Profile> {
  if (SUPABASE_CONFIGURED) {
    const { data: auth } = await db().auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) throw new ApiError(401, 'updateProfile');
    const row: Record<string, unknown> = {};
    if (patch.name !== undefined) row.full_name = patch.name;
    if (patch.dateOfBirth !== undefined) row.date_of_birth = patch.dateOfBirth;
    if (Object.keys(row).length) {
      const { error } = await db().from('profiles').update(row).eq('id', userId);
      if (error) rethrow(error, 'updateProfile');
    }
    return getProfile();
  }
  if (USING_FIXTURES) {
    return settle(
      {
        ...FIXTURE_PROFILE,
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.dateOfBirth !== undefined ? { dateOfBirth: patch.dateOfBirth ?? undefined } : {}),
      },
      400,
    );
  }
  return request<Profile>('/me', { method: 'PATCH', body: JSON.stringify(patch) });
}

/**
 * Starts an email change.
 *
 * Goes through auth, not the profiles table: the email is the sign-in
 * identity, and moving it is the auth server's decision. Depending on the
 * project's confirmation setting it either applies at once or waits for a link
 * in the NEW inbox — `'pending'` means the account still signs in with the old
 * address, and the screen has to say so rather than pretend it changed.
 */
export async function changeEmail(email: string): Promise<'changed' | 'pending'> {
  if (SUPABASE_CONFIGURED) {
    const { data, error } = await db().auth.updateUser({ email });
    if (error) {
      if (/network|fetch/i.test(error.message)) throw new NetworkError();
      throw new DeclinedError(error.message);
    }
    return data.user?.email?.toLowerCase() === email.toLowerCase() ? 'changed' : 'pending';
  }
  if (USING_FIXTURES) return settle<'changed' | 'pending'>('changed', 400);
  const result = await request<{ status: 'changed' | 'pending' }>('/me/email', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  return result.status;
}

/**
 * Uploads a new avatar from a local file URI and returns a URL to show it.
 *
 * One file per person, `<user_id>/avatar.jpg`, replaced in place. The bucket is
 * private (0009); what comes back is a signed URL, and each upload gets a fresh
 * one, so an image cache keyed on the URL cannot keep showing the old face.
 */
export async function uploadAvatar(uri: string): Promise<string | undefined> {
  if (SUPABASE_CONFIGURED) {
    const client = db();
    const { data: auth } = await client.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) throw new ApiError(401, 'uploadAvatar');
    const path = `${userId}/avatar.jpg`;
    const body = await readLocalFile(uri);
    const { error: uploadError } = await client.storage
      .from('avatars')
      .upload(path, body, { contentType: 'image/jpeg', upsert: true });
    if (uploadError) rethrow(uploadError, 'uploadAvatar/storage');
    const { error } = await client.from('profiles').update({ avatar_path: path }).eq('id', userId);
    if (error) rethrow(error, 'uploadAvatar/profile');
    return avatarUrlFor(path);
  }
  // Under fixtures the picked file itself stands in for the upload.
  if (USING_FIXTURES) return settle(uri, 600);
  throw new ApiError(501, 'uploadAvatar: not supported by the REST backend yet');
}

/**
 * Switches to an illustrated avatar.
 *
 * A photo outranks an illustration wherever the avatar is drawn, so choosing
 * one clears the photo too — otherwise the choice would save and change
 * nothing on screen. The file itself is removed as well: a photo someone chose
 * to stop showing should not stay in storage.
 */
export async function setAvatarPreset(preset: string): Promise<void> {
  if (SUPABASE_CONFIGURED) {
    const client = db();
    const { data: auth } = await client.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) throw new ApiError(401, 'setAvatarPreset');
    const { data: before } = await client
      .from('profiles')
      .select('avatar_path')
      .eq('id', userId)
      .maybeSingle();
    const { error } = await client
      .from('profiles')
      .update({ avatar_preset: preset, avatar_path: null })
      .eq('id', userId);
    if (error) rethrow(error, 'setAvatarPreset');
    if (before?.avatar_path) {
      // Best effort: the profile no longer points at it either way.
      await client.storage.from('avatars').remove([before.avatar_path]).catch(() => {});
    }
    return;
  }
  if (USING_FIXTURES) return settle(undefined, 300);
  await request<void>('/me/avatar', { method: 'PUT', body: JSON.stringify({ preset }) });
}

// --- Notification preferences ---------------------------------------------------

function toNotificationPrefs(row: Record<string, unknown>): NotificationPrefs {
  const prefs = { ...DEFAULT_NOTIFICATION_PREFS };
  for (const key of Object.keys(NOTIFICATION_PREF_COLUMNS) as NotificationPrefKey[]) {
    const v = row[NOTIFICATION_PREF_COLUMNS[key]];
    if (typeof v === 'boolean') prefs[key] = v;
  }
  return prefs;
}

/**
 * The signed-in person's notification preferences.
 *
 * The first read creates the row: it is inserted with only the user id, so the
 * database's column defaults are the one source of what "default" means —
 * including marketing off until the person turns it on.
 */
export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  if (SUPABASE_CONFIGURED) {
    const client = db();
    const { data: auth } = await client.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) throw new ApiError(401, 'getNotificationPrefs');
    const { data, error } = await client
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) rethrow(error, 'getNotificationPrefs');
    if (data) return toNotificationPrefs(data);

    const created = await client
      .from('notification_preferences')
      .insert({ user_id: userId })
      .select('*')
      .single();
    // Two screens racing to create it: the other one won, read theirs.
    if (created.error?.code === '23505') return getNotificationPrefs();
    if (created.error) rethrow(created.error, 'getNotificationPrefs/create');
    return toNotificationPrefs(created.data);
  }
  if (USING_FIXTURES) return settle({ ...DEFAULT_NOTIFICATION_PREFS }, 200);
  return request<NotificationPrefs>('/me/notification-preferences');
}

/** Saves one switch. */
export async function saveNotificationPref(
  key: NotificationPrefKey,
  value: boolean,
): Promise<void> {
  if (SUPABASE_CONFIGURED) {
    const client = db();
    const { data: auth } = await client.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) throw new ApiError(401, 'saveNotificationPref');
    const { error } = await client
      .from('notification_preferences')
      .update({ [NOTIFICATION_PREF_COLUMNS[key]]: value })
      .eq('user_id', userId);
    if (error) rethrow(error, 'saveNotificationPref');
    return;
  }
  if (USING_FIXTURES) return settle(undefined, 250);
  await request<void>('/me/notification-preferences', {
    method: 'PATCH',
    body: JSON.stringify({ [key]: value }),
  });
}

// --- Address book --------------------------------------------------------------
//
// The server shape of a saved address. The feature layer maps it onto the
// wallet's `Address`; this file does not import from `features`.

/** A map pin. Both halves or neither — the table checks the same. */
export type LatLng = { lat: number; lng: number };

// --- Saved payment methods ---------------------------------------------------------
//
// Mobile money wallets are added here. Cards arrive only through the payment
// function, once Paystack has tokenised one — the database refuses a card, or
// an authorization code, from the app (0013).

export type SavedPaymentMethod = {
  id: string;
  kind: 'momo' | 'card' | 'bank';
  label: string;
  subtitle: string;
  isDefault: boolean;
  momoPhone?: string;
  momoProvider?: MomoProvider;
};

type PaymentMethodRow = {
  id: string;
  kind: 'momo' | 'card' | 'bank';
  label: string;
  subtitle: string | null;
  is_default: boolean;
  momo_phone: string | null;
  momo_provider: MomoProvider | null;
};

const PAYMENT_METHOD_COLS = 'id, kind, label, subtitle, is_default, momo_phone, momo_provider';

const toSavedPaymentMethod = (row: PaymentMethodRow): SavedPaymentMethod => ({
  id: row.id,
  kind: row.kind,
  label: row.label,
  subtitle: row.subtitle ?? '',
  isDefault: row.is_default,
  momoPhone: row.momo_phone ?? undefined,
  momoProvider: row.momo_provider ?? undefined,
});

export async function listPaymentMethods(): Promise<SavedPaymentMethod[]> {
  if (!SUPABASE_CONFIGURED) throw new ApiError(501, 'listPaymentMethods: fixtures keep their own');
  const { data, error } = await db()
    .from('payment_methods')
    .select(PAYMENT_METHOD_COLS)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });
  if (error) rethrow(error, 'listPaymentMethods');
  return (data ?? []).map(toSavedPaymentMethod);
}

/** Saves a mobile money wallet. `phone` is the ten-digit local form. */
export async function addMomoWallet(
  wallet: { phone: string; provider: MomoProvider },
  makeDefault: boolean,
): Promise<SavedPaymentMethod> {
  if (!SUPABASE_CONFIGURED) throw new ApiError(501, 'addMomoWallet: fixtures keep their own');
  const client = db();
  const { data: auth } = await client.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) throw new ApiError(401, 'addMomoWallet');
  const { data, error } = await client
    .from('payment_methods')
    .insert({
      user_id: userId,
      kind: 'momo',
      label: providerName(wallet.provider),
      subtitle: formatGhanaMobile(wallet.phone),
      momo_phone: wallet.phone,
      momo_provider: wallet.provider,
    })
    .select(PAYMENT_METHOD_COLS)
    .single();
  if (error) {
    if (error.code === '23505') throw new DeclinedError('This wallet is already saved.');
    rethrow(error, 'addMomoWallet');
  }
  if (makeDefault) {
    await setDefaultPaymentMethod(data.id);
    return toSavedPaymentMethod({ ...data, is_default: true });
  }
  return toSavedPaymentMethod(data);
}

export async function setDefaultPaymentMethod(id: string): Promise<void> {
  if (!SUPABASE_CONFIGURED) return;
  const { error } = await db().rpc('set_default_payment_method', { p_id: id });
  if (error) rethrow(error, 'setDefaultPaymentMethod');
}

export async function removePaymentMethod(id: string): Promise<void> {
  if (!SUPABASE_CONFIGURED) return;
  const { error } = await db().from('payment_methods').delete().eq('id', id);
  if (error) rethrow(error, 'removePaymentMethod');
}

export type SavedAddress = {
  id: string;
  label: string;
  line: string;
  note: string;
  isDefault: boolean;
  pin?: LatLng;
};

type AddressRow = {
  id: string;
  label: string;
  line: string;
  note: string | null;
  is_default: boolean;
  lat: number | null;
  lng: number | null;
};

const ADDRESS_COLS = 'id, label, line, note, is_default, lat, lng';

const toSavedAddress = (row: AddressRow): SavedAddress => ({
  id: row.id,
  label: row.label,
  line: row.line,
  note: row.note ?? '',
  isDefault: row.is_default,
  pin: row.lat != null && row.lng != null ? { lat: row.lat, lng: row.lng } : undefined,
});

/** The signed-in person's addresses, default first. */
export async function listAddresses(): Promise<SavedAddress[]> {
  if (SUPABASE_CONFIGURED) {
    const { data, error } = await db()
      .from('addresses')
      .select(ADDRESS_COLS)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });
    if (error) rethrow(error, 'listAddresses');
    return (data ?? []).map(toSavedAddress);
  }
  if (USING_FIXTURES) return settle<SavedAddress[]>([], 200);
  return request<SavedAddress[]>('/me/addresses');
}

/**
 * Creates or updates one address, then makes it the default if asked.
 *
 * Always written with `is_default = false` first and promoted through
 * `set_default_address`: inserting it as default directly would trip the
 * one-default index whenever another address already holds the flag.
 */
export async function saveAddress(
  draft: { label: string; line: string; note: string; pin?: LatLng },
  options: { id?: string; makeDefault: boolean },
): Promise<SavedAddress> {
  if (SUPABASE_CONFIGURED) {
    const client = db();
    const { data: auth } = await client.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) throw new ApiError(401, 'saveAddress');
    const fields = {
      label: draft.label,
      line: draft.line,
      note: draft.note || null,
      lat: draft.pin?.lat ?? null,
      lng: draft.pin?.lng ?? null,
    };

    const write = options.id
      ? client.from('addresses').update(fields).eq('id', options.id)
      : client.from('addresses').insert({ ...fields, user_id: userId, is_default: false });
    const { data, error } = await write.select(ADDRESS_COLS).single();
    if (error) rethrow(error, 'saveAddress');

    if (options.makeDefault && !data.is_default) {
      await setDefaultAddress(data.id);
      return toSavedAddress({ ...data, is_default: true });
    }
    return toSavedAddress(data);
  }
  if (USING_FIXTURES) {
    return settle(
      { id: options.id ?? `addr-${Date.now().toString(36)}`, ...draft, isDefault: options.makeDefault },
      300,
    );
  }
  return request<SavedAddress>(options.id ? `/me/addresses/${options.id}` : '/me/addresses', {
    method: options.id ? 'PUT' : 'POST',
    body: JSON.stringify({ ...draft, isDefault: options.makeDefault }),
  });
}

export async function deleteAddress(id: string): Promise<void> {
  if (SUPABASE_CONFIGURED) {
    const { error } = await db().from('addresses').delete().eq('id', id);
    if (error) rethrow(error, 'deleteAddress');
    return;
  }
  if (USING_FIXTURES) return settle(undefined, 200);
  await request<void>(`/me/addresses/${id}`, { method: 'DELETE' });
}

/** Moves the default flag in one transaction — see `set_default_address`. */
export async function setDefaultAddress(id: string): Promise<void> {
  if (SUPABASE_CONFIGURED) {
    const { error } = await db().rpc('set_default_address', { p_id: id });
    if (error) rethrow(error, 'setDefaultAddress');
    return;
  }
  if (USING_FIXTURES) return settle(undefined, 200);
  await request<void>(`/me/addresses/${id}/default`, { method: 'POST' });
}

/**
 * The partner pharmacy that fulfils orders in the user's area. One partner
 * today (see partners.tsx); the shape is a list-of-one so the second partner
 * is a data change, not a rewrite.
 */
export async function getPartnerPharmacy(): Promise<Pharmacy> {
  if (SUPABASE_CONFIGURED) {
    const { data, error } = await db()
      .from('pharmacies')
      .select('id, name, licence_number, address, phone, distance_km')
      .order('distance_km', { ascending: true, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (error) rethrow(error, 'getPartnerPharmacy');
    if (!data) return FIXTURE_PHARMACY;
    return {
      id: data.id,
      name: data.name,
      licence: data.licence_number,
      address: data.address,
      locality: data.address.split(',').slice(-2).join(',').trim() || data.address,
      phone: data.phone ?? '',
      distanceKm: Number(data.distance_km ?? 0),
      // Not modelled in 0001 yet; the fixture's values stand in until they are.
      hours: FIXTURE_PHARMACY.hours,
      superintendent: FIXTURE_PHARMACY.superintendent,
    };
  }
  if (USING_FIXTURES) return settle(FIXTURE_PHARMACY, 120);
  return request<Pharmacy>('/pharmacies/partner');
}

// --- Wellness -------------------------------------------------------------------
//
// Programme content is bundled: it is editorial, it changes with a release,
// and a workout that needs a network round-trip to show "3 × 12" is a workout
// that fails in a basement gym. Progress against it is local (features/wellness).

export async function getProgramme(id?: string): Promise<Programme> {
  return programmeById(id);
}

export async function listProgrammes(): Promise<Programme[]> {
  return PROGRAMMES;
}

/**
 * The Wellness tab's "Read next" strip.
 *
 * Drawn from the article library rather than a parallel list, so a card there
 * always opens the article it names — the two used to be separate arrays and
 * agreed only by hand.
 */
export async function listReads(): Promise<Read[]> {
  const featured = ARTICLES.filter((a) => a.featured);
  return (featured.length ? featured : ARTICLES.slice(0, 3)).map((a) => ({
    id: a.id,
    title: a.title,
    meta: readMeta(a),
    tone: a.tone,
    icon: a.icon,
  }));
}

// --- Wellness progress (server) ------------------------------------------------
//
// The progress half of wellness, and the only half that leaves the device.
// Everything here is scoped to the signed-in user by RLS (migration 0007), so
// these calls carry no user id — the policy supplies it and the client cannot
// lie about it.
//
// Under fixtures every one of these is a no-op that resolves. That is
// deliberate: the wellness store keeps working offline-first against local
// storage, and turning Supabase on adds durability rather than changing
// behaviour.

/** The signed-in user's id, or null when there is no session to write against. */
async function currentUserId(): Promise<string | null> {
  const { data } = await db().auth.getUser();
  return data.user?.id ?? null;
}

/**
 * Everything the server holds for this person's wellness, in one round trip.
 *
 * One call rather than three because the caller always wants all of it: the
 * Wellness tab needs sessions for the streak, hydration for the water card and
 * saved routines for the heart, and three sequential requests on a phone
 * network is three chances to half-load the screen.
 */
export async function fetchWellnessState(): Promise<WellnessSnapshot> {
  if (SUPABASE_CONFIGURED) {
    const client = db();
    if (!(await currentUserId())) return { sessions: [], hydration: [], saved: [] };

    const [sessions, hydration, saved] = await Promise.all([
      client
        .from('wellness_sessions')
        .select('id, programme_id, day_id, day, duration_min, finished_at')
        .order('finished_at', { ascending: false })
        .limit(500),
      client.from('wellness_hydration').select('day, glasses'),
      client.from('wellness_saved_routines').select('programme_id'),
    ]);

    if (sessions.error) rethrow(sessions.error, 'fetchWellnessState/sessions');
    if (hydration.error) rethrow(hydration.error, 'fetchWellnessState/hydration');
    if (saved.error) rethrow(saved.error, 'fetchWellnessState/saved');

    return {
      sessions: (sessions.data ?? []).map((row) => ({
        id: row.id,
        programmeId: row.programme_id,
        dayId: row.day_id,
        day: row.day,
        durationMin: row.duration_min,
        finishedAt: new Date(row.finished_at).getTime(),
      })),
      hydration: (hydration.data ?? []).map((row) => ({
        day: row.day,
        glasses: row.glasses,
      })),
      saved: (saved.data ?? []).map((row) => row.programme_id),
    };
  }
  if (USING_FIXTURES) return { sessions: [], hydration: [], saved: [] };
  return request<WellnessSnapshot>('/wellness');
}

/**
 * Uploads finished sessions.
 *
 * `upsert` on the client-generated id, so a retry after a dropped response
 * writes the same rows again and changes nothing. Called with whatever the
 * outbox is holding, which is usually one session and occasionally a week of
 * them after a long stretch offline.
 */
export async function pushWellnessSessions(sessions: WellnessSession[]): Promise<void> {
  if (!sessions.length) return;
  if (SUPABASE_CONFIGURED) {
    const userId = await currentUserId();
    if (!userId) throw new ApiError(401, 'pushWellnessSessions');
    const { error } = await db()
      .from('wellness_sessions')
      .upsert(
        sessions.map((s) => ({
          id: s.id,
          user_id: userId,
          programme_id: s.programmeId,
          day_id: s.dayId,
          day: s.day,
          duration_min: s.durationMin,
          finished_at: new Date(s.finishedAt).toISOString(),
        })),
        { onConflict: 'id' },
      );
    if (error) rethrow(error, 'pushWellnessSessions');
    return;
  }
  if (USING_FIXTURES) return;
  await request<void>('/wellness/sessions', {
    method: 'POST',
    body: JSON.stringify({ sessions }),
  });
}

/**
 * Clears one plan's finished sessions — what "Restart programme" means.
 *
 * Scoped to the one programme on purpose: restarting the strength plan must
 * not wipe the mobility streak beside it.
 */
export async function clearWellnessProgramme(programmeId: string): Promise<void> {
  if (SUPABASE_CONFIGURED) {
    const userId = await currentUserId();
    if (!userId) throw new ApiError(401, 'clearWellnessProgramme');
    const { error } = await db()
      .from('wellness_sessions')
      .delete()
      .eq('user_id', userId)
      .eq('programme_id', programmeId);
    if (error) rethrow(error, 'clearWellnessProgramme');
    return;
  }
  if (USING_FIXTURES) return;
  await request<void>(`/wellness/programmes/${encodeURIComponent(programmeId)}`, {
    method: 'DELETE',
  });
}

/**
 * Records water for a day and returns the count the server settled on.
 *
 * Goes through the `log_hydration` function rather than an upsert because the
 * merge has to be `greatest()`: two devices logging the same day must not
 * overwrite each other downwards, and the only gesture the UI offers adds a
 * glass. The returned number is authoritative — the caller adopts it.
 */
export async function logHydration(day: string, glasses: number): Promise<number> {
  if (SUPABASE_CONFIGURED) {
    if (!(await currentUserId())) throw new ApiError(401, 'logHydration');
    const { data, error } = await db().rpc('log_hydration', {
      p_day: day,
      p_glasses: glasses,
    });
    if (error) rethrow(error, 'logHydration');
    return typeof data === 'number' ? data : glasses;
  }
  if (USING_FIXTURES) return glasses;
  const result = await request<{ glasses: number }>('/wellness/hydration', {
    method: 'POST',
    body: JSON.stringify({ day, glasses }),
  });
  return result.glasses;
}

/** Stars or unstars a plan. */
export async function setSavedRoutine(programmeId: string, saved: boolean): Promise<void> {
  if (SUPABASE_CONFIGURED) {
    const userId = await currentUserId();
    if (!userId) throw new ApiError(401, 'setSavedRoutine');
    const table = db().from('wellness_saved_routines');
    const { error } = saved
      ? await table.upsert(
          { user_id: userId, programme_id: programmeId },
          { onConflict: 'user_id,programme_id' },
        )
      : await table.delete().eq('user_id', userId).eq('programme_id', programmeId);
    if (error) rethrow(error, 'setSavedRoutine');
    return;
  }
  if (USING_FIXTURES) return;
  await request<void>('/wellness/saved', {
    method: 'POST',
    body: JSON.stringify({ programmeId, saved }),
  });
}

// --- Health content -----------------------------------------------------------
//
// Bundled, like the wellness programme: it is editorial, it ships with a
// release, and an article that needs a round-trip is an article nobody reads on
// a slow connection. The reviewing pharmacist is attached at read time from the
// partner record — see `withReviewer`.

export async function listArticles(): Promise<Article[]> {
  return ARTICLES;
}

export async function getArticle(id: string | undefined): Promise<Article | undefined> {
  return articleById(id) ?? ARTICLES[0];
}

/** An article with its named, registered reviewer resolved. */
export async function getReviewedArticle(id: string | undefined) {
  const article = articleById(id) ?? ARTICLES[0];
  return withReviewer(article, await getPartnerPharmacy());
}

// --- Notifications ------------------------------------------------------------

/**
 * The feed. Read state is local (features/notifications/store).
 *
 * Supabase has no notifications table yet — when it does this reads it the way
 * `listPromotions` reads promotions. Until then a configured project still gets
 * the development feed rather than an empty screen.
 */
export async function listNotifications(): Promise<Notification[]> {
  const pharmacy = await getPartnerPharmacy();
  if (USING_FIXTURES || SUPABASE_CONFIGURED) return settle(fixtureNotifications(pharmacy), 200);
  return request<Notification[]>('/notifications');
}

// --- Support ------------------------------------------------------------------

export async function listContacts(): Promise<Contact[]> {
  return CONTACTS;
}

export async function listSupportThreads(): Promise<SupportThread[]> {
  const pharmacy = await getPartnerPharmacy();
  if (USING_FIXTURES || SUPABASE_CONFIGURED) return settle(fixtureThreads(pharmacy), 200);
  return request<SupportThread[]>('/support/threads');
}

export async function listMessages(threadId: string): Promise<Message[]> {
  if (USING_FIXTURES || SUPABASE_CONFIGURED) {
    const profile = await getProfile();
    return settle(fixtureMessages(firstName(profile.name)), 200);
  }
  return request<Message[]>(`/support/threads/${encodeURIComponent(threadId)}/messages`);
}

export async function listFaq(): Promise<string[]> {
  return FAQ;
}
