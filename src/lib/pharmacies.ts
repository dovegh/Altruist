/**
 * Partner pharmacies — the seller of record on every order.
 *
 * Altruist is the bridge; the pharmacy is the licensed party. Its name,
 * licence and superintendent appear on receipts, disclaimers, support and the
 * deletion notice, and the four liability statements only hold if all of
 * those name the SAME entity. So there is one record, and screens read it
 * through `usePartnerPharmacy` rather than typing "Healthview" themselves.
 *
 * Mirrors `public.pharmacies` (0001) plus the superintendent, which the table
 * does not yet carry — see `toPharmacy` in api.ts for the fallback.
 */
export type Pharmacy = {
  id: string;
  name: string;
  /** Pharmacy Council premises licence, printed on the receipt. */
  licence: string;
  address: string;
  /** Short locality for chips: "Osu, Accra". */
  locality: string;
  phone: string;
  distanceKm: number;
  hours: string;
  superintendent: {
    name: string;
    /** "Akosua B." — how the pharmacist is shown on notes and chat. */
    short: string;
    /** Pharmacy Council registration. */
    registration: string;
  };
};

export const FIXTURE_PHARMACY: Pharmacy = {
  id: 'healthview',
  name: 'Healthview Pharmacy',
  licence: 'PC/PP/2026/0447',
  address: '18 Ring Road East, Osu, Accra',
  locality: 'Osu, Accra',
  phone: '+233 24 400 1188',
  distanceKm: 2.1,
  hours: 'Open till 10pm',
  superintendent: { name: 'Akosua Boateng', short: 'Akosua B.', registration: 'PC 44219' },
};

/** "Healthview" — the brand word alone, for tight chips. */
export function shortName(p: Pharmacy): string {
  return p.name.replace(/\s+Pharmacy$/i, '');
}
