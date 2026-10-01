'use server';

/**
 * Pharmacy profile, availability and licence renewals. The rules are in 0021:
 * superintendent only, this pharmacy only, two-factor session. The licence
 * file itself is uploaded from the browser (the storage policy checks the
 * same things); this only records the submission for Altruist to review.
 */
import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabase/server';
import type { PharmacyUpdate } from './types';

const MESSAGES: Record<string, string> = {
  not_staff: 'Your session has expired. Sign in again.',
  not_superintendent: 'Only the superintendent can change pharmacy settings.',
  address_required: 'Enter the street address patients and riders should use.',
  bad_radius: 'Delivery radius must be more than 0 km and no more than 100 km.',
  bad_path: 'That file did not upload to your pharmacy’s folder. Try again.',
  bad_expiry: 'The expiry date must be in the future.',
};

function message(raw: string): string {
  const key = Object.keys(MESSAGES).find((k) => raw.includes(k));
  return key ? MESSAGES[key]! : 'That did not save. Check your connection and try again.';
}

export async function updatePharmacy(input: PharmacyUpdate): Promise<{ error: string } | void> {
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('portal_update_pharmacy', {
    p_address: input.address.trim(),
    p_phone: input.phone.trim() || null,
    p_opening_hours: input.opening_hours.trim() || null,
    p_delivery_radius_km: input.delivery_radius_km,
    p_accepting_orders: input.accepting_orders,
  });
  if (error) return { error: message(error.message) };
  revalidatePath('/settings');
}

export async function submitLicence(path: string, expiresOn: string): Promise<{ error: string } | void> {
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('portal_submit_licence', {
    p_path: path,
    p_expires_on: expiresOn,
  });
  if (error) return { error: message(error.message) };
  revalidatePath('/settings');
}
