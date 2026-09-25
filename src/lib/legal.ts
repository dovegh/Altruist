/**
 * Who Altruist is, legally, and the documents that say so.
 *
 * Every liability statement in the app is a variation on one sentence:
 * Altruist is a technology platform, the partner pharmacy is the seller of
 * record. Those statements appear on Legal, Terms, Partner pharmacies, the
 * receipt, the refund flow and both wellness disclaimers. They have to agree
 * word for word, so they are written once, here.
 *
 * Accessibility doc §2.1 lists them as load-bearing: do not reword them to
 * fit a layout, and do not drop one to tidy a screen.
 */
import Constants from 'expo-constants';

export type LegalDoc = {
  id: string;
  title: string;
  url: string;
  /** ISO date the published document last changed. */
  updated: string;
};

export const ORG = {
  name: 'Altruist',
  registeredName: 'Altruist Technologies Ltd',
  companyNumber: '1234567',
  privacyEmail: 'privacy@altruistpharmacy.com',
  domain: 'altruistpharmacy.com',
} as const;

/**
 * "1.0.0 (build 214)" — read from the build, never typed.
 *
 * A version literal in a screen is wrong from the first release after someone
 * forgets it, and it is the one string a support agent asks for.
 */
export function appVersion(): string {
  const version = Constants.expoConfig?.version ?? '0.0.0';
  const build =
    Constants.expoConfig?.android?.versionCode ?? Constants.expoConfig?.ios?.buildNumber;
  return build ? `${version} (build ${build})` : version;
}

export const TERMS_URL = `https://${ORG.domain}/terms`;
export const PRIVACY_URL = `https://${ORG.domain}/privacy`;

const UPDATED = '2026-08-23';

export const LEGAL_DOCS: LegalDoc[] = [
  { id: 'terms', title: 'Terms of Service', url: TERMS_URL, updated: UPDATED },
  { id: 'privacy', title: 'Privacy Policy', url: PRIVACY_URL, updated: UPDATED },
];

/** "altruistpharmacy.com/terms · updated 23 Aug 2026" */
export function docSubtitle(doc: LegalDoc): string {
  const when = new Date(doc.updated).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `${doc.url.replace(/^https?:\/\//, '')} · updated ${when}`;
}

/** "Last updated 23 August 2026 · 4 sections" */
export function termsStamp(): string {
  const when = new Date(UPDATED).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return `Last updated ${when} · ${TERMS_SECTIONS.length} sections`;
}

/**
 * The one-paragraph framing shown on Legal and quoted on Partner pharmacies.
 * Reused rather than retyped — see the file header.
 */
export const PLATFORM_STATEMENT = {
  title: `${ORG.name} is a technology platform`,
  body: 'We connect you with certified, independent partner pharmacies. We do not dispense medication, employ pharmacists, or provide medical advice.',
} as const;

export type TermsSection = { chip: string; title: string; body: string };

export const TERMS_SECTIONS: TermsSection[] = [
  {
    chip: 'Who we are',
    title: '1. Who we are',
    body:
      `${ORG.name} operates a technology platform that connects people who need pharmaceutical, over-the-counter and wellness products with independent, licensed partner pharmacies.\n\n` +
      `${ORG.name} is not a pharmacy. It does not hold a pharmacy licence, does not employ pharmacists, does not stock or dispense medication, and does not take custody of any product at any point.`,
  },
  {
    chip: 'Prescriptions',
    title: '2. What the platform does',
    body:
      `The platform lets you upload a prescription, browse partner catalogues, place an order, pay, and track fulfilment. Each of those steps is performed by a partner pharmacy; ${ORG.name} provides the software that carries the request between you and them.\n\n` +
      'Verification of any prescription is performed solely by a licensed pharmacist employed by the partner pharmacy.',
  },
  {
    chip: 'Payment',
    title: '3. Partner pharmacies',
    body: `Every partner is independently licensed and is identified by name on your order. Your contract for the supply of goods is with that partner pharmacy, not with ${ORG.name}.`,
  },
  {
    chip: 'Liability',
    title: '4. Prescriptions',
    body: 'You must only upload a prescription that was lawfully issued to you by a qualified prescriber. A prescription may be rejected by the reviewing pharmacist; where it is, the reason given is shown to you in the app.',
  },
];
