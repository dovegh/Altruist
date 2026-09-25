/**
 * Support — who you can talk to, and about what.
 *
 * The routing rule at the top is the whole point of this file and is a
 * regulatory boundary, not a support-desk convenience: Altruist may answer for
 * the app, payments, delivery and refunds. Anything clinical — a dose, an
 * interaction, whether two medicines can be taken together — goes to the
 * partner pharmacy, because they are the licensed party and Altruist does not
 * employ pharmacists. `CONTACTS` encodes that, and `routeFor` is what screens
 * ask rather than deciding for themselves.
 */
import type { IconName } from '@/components/ui/Icon';
import type { TileHue } from '@/components/ui/ListRow';
import type { Pharmacy } from './pharmacies';
import { initialsOf, firstName } from './profile';
import { languageInfo, useLanguageStore } from '@/i18n';

export type SupportParty = 'pharmacy' | 'altruist';

export type Contact = {
  id: SupportParty;
  icon: IconName;
  hue: TileHue;
  title: string;
  meta: string;
};

export const CONTACTS: Contact[] = [
  {
    id: 'pharmacy',
    icon: 'prescription',
    hue: 'teal',
    title: 'Your partner pharmacy',
    meta: 'Medicines, prescriptions, dosage, dispensing questions',
  },
  {
    id: 'altruist',
    icon: 'cart',
    hue: 'blue',
    title: 'Altruist support',
    meta: 'The app, payments, delivery tracking, refunds',
  },
];

export type SupportThread = {
  id: string;
  party: SupportParty;
  initials: string;
  title: string;
  /** Who replies, and how fast — shown under the title in the conversation. */
  subtitle: string;
  at: number;
  preview: string;
  unread: number;
};

export type Message = {
  id: string;
  from: 'them' | 'you';
  text: string;
  /** Epoch ms; the bubble timestamp is formatted at render. */
  at: number;
};

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export function fixtureThreads(p: Pharmacy, now: number = Date.now()): SupportThread[] {
  return [
    {
      id: p.id,
      party: 'pharmacy',
      initials: initialsOf(p.name),
      title: p.name,
      subtitle: `${p.superintendent.short} · usually replies in 10 min`,
      at: now - 12 * MINUTE,
      preview: `${firstName(p.superintendent.name)}: The dose on the label is correct —`,
      unread: 1,
    },
    {
      id: 'altruist',
      party: 'altruist',
      initials: 'AS',
      title: 'Altruist support',
      subtitle: 'Support team · usually replies in an hour',
      at: now - DAY,
      preview: 'Refund case RF-2291 is with the pharmacy',
      unread: 0,
    },
  ];
}

/**
 * The pharmacy conversation. `you` is the user's first name because the
 * pharmacist is talking to a person, not to an account.
 */
export function fixtureMessages(you: string, now: number = Date.now()): Message[] {
  const min = (n: number) => now - n * MINUTE;
  return [
    {
      id: '1',
      from: 'them',
      text: `Hello ${you} — I can see your order was delivered this afternoon. How can I help?`,
      at: min(21),
    },
    {
      id: '2',
      from: 'you',
      text: 'The label says take twice daily but the box says three times. Which is right?',
      at: min(18),
    },
    {
      id: '3',
      from: 'them',
      text: 'Good catch, and thank you for checking. Follow the label on the dispensing sticker: twice daily with food. The box shows the manufacturer’s general range, not your prescription.',
      at: min(15),
    },
    { id: '4', from: 'you', text: 'Understood, thank you.', at: min(14) },
  ];
}

export const FAQ: string[] = [
  'Why was my prescription rejected?',
  'How long do refunds take?',
  'Can I change my delivery address after ordering?',
  'Who is the seller of my medicines?',
];

/** "05:41 PM" — the bubble stamp. */
export function messageTime(at: number): string {
  const locale = languageInfo(useLanguageStore.getState().lang).locale;
  return new Date(at)
    .toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: true })
    .toUpperCase();
}
