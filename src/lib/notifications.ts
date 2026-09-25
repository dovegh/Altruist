/**
 * The notification feed.
 *
 * Shape first, content second: `Notification` is what a push payload will
 * deserialise into, so the screen is already rendering the real thing and the
 * server only has to fill it. The fixtures below are a development feed.
 *
 * `at` is a timestamp, not "12 min ago". A relative string baked into data is
 * wrong the moment the app has been open for a minute, and it cannot be
 * grouped or sorted. `relativeTime` renders it at the point of display.
 */
import type { IconName } from '@/components/ui/Icon';
import type { Pharmacy } from './pharmacies';
import { defineStrings, languageInfo, translate, useLanguageStore } from '@/i18n';

const WHEN = defineStrings({
  en: { now: 'Just now', min: '{n} min ago', hours: '{n} h ago', yesterday: 'Yesterday', days: '{n} days ago' },
  fr: { now: "À l'instant", min: 'Il y a {n} min', hours: 'Il y a {n} h', yesterday: 'Hier', days: 'Il y a {n} jours' },
  tw: { now: 'Seesei ara', min: 'Simma {n} a atwam', hours: 'Dɔnhwere {n} a atwam', yesterday: 'Ɛnnora', days: 'Nna {n} a atwam' },
  gaa: { now: 'Bianɛ nɔŋŋ', min: 'Miniti {n} ni eho', hours: 'Ŋmɛlɛtswaa {n} ni eho', yesterday: 'Nyɛ', days: 'Gbii {n} ni eho' },
  ee: { now: 'Fifia ko', min: 'Aɖabaƒoƒo {n} va yi', hours: 'Gaƒoƒo {n} va yi', yesterday: 'Etsɔ si va yi', days: 'Ŋkeke {n} va yi' },
  ha: { now: 'Yanzu-yanzu', min: 'Minti {n} da suka wuce', hours: 'Awa {n} da suka wuce', yesterday: 'Jiya', days: 'Kwana {n} da suka wuce' },
});

export type NotificationTone = 'brand' | 'info' | 'danger' | 'warning' | 'neutral';

export type Notification = {
  id: string;
  icon: IconName;
  tone: NotificationTone;
  title: string;
  body: string;
  /** Epoch ms. Grouping and ordering both derive from this. */
  at: number;
  /** Whether the sender marked it unread; local reads are tracked separately. */
  unread: boolean;
  /** In-app destination. Absent means the row is informational. */
  href?: string;
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * The development feed, positioned relative to now so "TODAY" is always today
 * — a fixture pinned to a date reads as a week-old app within a week.
 */
export function fixtureNotifications(p: Pharmacy, now: number = Date.now()): Notification[] {
  return [
    {
      id: 'verified',
      icon: 'check',
      tone: 'brand',
      title: 'Prescription verified',
      body: `${p.superintendent.short} at ${p.name} approved TrxID CJ4901TUZ0. Your order is being packed.`,
      at: now - 12 * MINUTE,
      unread: true,
      href: '/order-tracking',
    },
    {
      id: 'delivery',
      icon: 'send',
      tone: 'info',
      title: 'Out for delivery',
      body: 'Your rider is 25 minutes away. Order CJ4901TUZ0.',
      at: now - 31 * MINUTE,
      unread: true,
      href: '/order-tracking',
    },
    {
      id: 'rejected',
      icon: 'danger',
      tone: 'danger',
      title: 'Prescription rejected',
      body: 'The dosage line was cut off. Re-upload with the full page visible.',
      at: now - 2 * HOUR,
      unread: true,
      href: '/prescription-upload',
    },
    {
      id: 'refill',
      icon: 'cart',
      tone: 'neutral',
      title: 'Refill reminder',
      body: 'Your Amoxicillin course ends in 2 days. Re-order in one tap.',
      at: now - DAY,
      unread: false,
      href: '/catalog',
    },
    {
      id: 'streak',
      icon: 'award',
      tone: 'warning',
      title: 'Wellness streak',
      body: 'You have logged your wellness plan several days running. Keep going.',
      at: now - 2 * DAY,
      unread: false,
      href: '/wellness',
    },
    {
      id: 'delivered',
      icon: 'check',
      tone: 'neutral',
      title: 'Order delivered',
      body: 'Paracetamol 500mg was handed over at 4:12 PM.',
      at: now - 20 * DAY,
      unread: false,
      href: '/order-receipt',
    },
  ];
}

/** Same calendar day as `now` — the boundary the TODAY / EARLIER split uses. */
export function isToday(at: number, now: number = Date.now()): boolean {
  const a = new Date(at);
  const b = new Date(now);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** "12 min ago", "2 h ago", "Yesterday", "19 Aug". */
export function relativeTime(at: number, now: number = Date.now()): string {
  const delta = Math.max(0, now - at);
  if (delta < MINUTE) return translate(WHEN, 'now');
  if (delta < HOUR) return translate(WHEN, 'min', { n: Math.floor(delta / MINUTE) });
  if (isToday(at, now)) return translate(WHEN, 'hours', { n: Math.floor(delta / HOUR) });
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isToday(at, yesterday.getTime())) return translate(WHEN, 'yesterday');
  if (delta < 7 * DAY) return translate(WHEN, 'days', { n: Math.floor(delta / DAY) });
  const locale = languageInfo(useLanguageStore.getState().lang).locale;
  return new Date(at).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}
