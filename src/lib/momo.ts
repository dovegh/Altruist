/**
 * Ghana mobile money: the three networks, and reading a wallet number.
 *
 * Provider ids are Paystack's (`mtn`, `vod` for Telecel, `atl` for AT,
 * formerly AirtelTigo); the database checks for exactly these (0006, 0013).
 *
 * The network is guessed from the number's prefix, but only guessed: numbers
 * can be ported between networks in Ghana, so the person can always pick a
 * different one.
 */
export type MomoProvider = 'mtn' | 'vod' | 'atl';

export const MOMO_PROVIDERS: { id: MomoProvider; name: string; short: string }[] = [
  { id: 'mtn', name: 'MTN MoMo', short: 'MTN' },
  { id: 'vod', name: 'Telecel Cash', short: 'Telecel' },
  // AirtelTigo is now AT; Paystack still calls it `atl`.
  { id: 'atl', name: 'AT Money', short: 'AT' },
];

const PREFIXES: Record<MomoProvider, string[]> = {
  mtn: ['024', '025', '053', '054', '055', '059'],
  vod: ['020', '050'],
  atl: ['026', '027', '056', '057'],
};

export function providerName(id: MomoProvider | string | undefined): string {
  return MOMO_PROVIDERS.find((p) => p.id === id)?.name ?? 'Mobile money';
}

/**
 * "+233 24 400 1188", "233244001188", "024-400-1188" → "0244001188".
 * Null when it is not a ten-digit Ghana mobile number.
 */
export function normalizeGhanaMobile(input: string): string | null {
  let digits = input.replace(/[^\d]/g, '');
  if (digits.startsWith('233')) digits = `0${digits.slice(3)}`;
  else if (digits.length === 9) digits = `0${digits}`;
  return /^0[2-5][0-9]{8}$/.test(digits) ? digits : null;
}

/**
 * The network a number was issued on, from its first three digits — so it can
 * be shown while the person is still typing. Accepts +233 / 233 forms too.
 */
export function detectProvider(input: string): MomoProvider | null {
  let digits = input.replace(/[^\d]/g, '');
  if (digits.startsWith('233')) digits = `0${digits.slice(3)}`;
  const prefix = digits.slice(0, 3);
  for (const id of Object.keys(PREFIXES) as MomoProvider[]) {
    if (PREFIXES[id].includes(prefix)) return id;
  }
  return null;
}

/**
 * "024 400 1188" → "+233244001188": the international form SMS providers
 * (Supabase phone auth, Twilio) need. Null when it is not a Ghana mobile.
 */
export function ghanaE164(input: string): string | null {
  const local = normalizeGhanaMobile(input);
  return local ? `+233${local.slice(1)}` : null;
}

/** "0244001188" → "024 400 1188". */
export function formatGhanaMobile(localNumber: string): string {
  return localNumber.replace(/^(\d{3})(\d{3})(\d{4})$/, '$1 $2 $3');
}
