/**
 * The signed-in person, as the screens need them.
 *
 * One source. Before this, "Ama Mensah" and her phone number were typed into
 * a dozen screens by hand, which is the kind of thing that survives a real
 * sign-in and greets the next user by the wrong name. Screens read `useProfile`
 * from `features/profile/store.ts`; this file holds the shape and the fixture.
 */
export type Profile = {
  name: string;
  email: string;
  /** E.164-ish display form, e.g. "+233 24 400 1188". */
  phone: string;
  /**
   * Whether the phone number has actually been confirmed by a code. Edit
   * Profile used to show a "Verified" badge unconditionally, which told a
   * pharmacist-facing number was checked when nobody had checked it.
   */
  phoneVerified?: boolean;
  /** ISO `YYYY-MM-DD`. Pharmacists see it at review for age-restricted medicines. */
  dateOfBirth?: string;
  /**
   * A short-lived signed URL for the private avatar, or undefined for none.
   * Rebuilt on every profile load; never the storage path itself.
   */
  avatarUrl?: string;
  /**
   * The illustrated avatar (see `components/avatars`). Every account has one
   * from creation (0010); it shows whenever there is no photo.
   */
  avatarPreset?: string;
  /**
   * An email change that is waiting on the confirmation link. The account still
   * signs in with `email` until the link is clicked, and the screen says so.
   */
  pendingEmail?: string;
};

/** What Edit Profile may change. Phone is deliberately absent — see 0009. */
export type ProfilePatch = {
  name?: string;
  dateOfBirth?: string | null;
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** "1994-03-14" → "14 March 1994". Empty for no date. */
export function formatDateOfBirth(iso?: string): string {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

/** "1994-03-14" → "14/03/1994", the form the input field edits. */
export function dateOfBirthInput(iso?: string): string {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

/**
 * "14/03/1994" → "1994-03-14", or an error sentence the form can show.
 *
 * Day first, because that is how dates are written in Ghana. Rejects dates that
 * do not exist (31/02), dates in the future, and anything implying an age over
 * 130 — each of those is a typo, and a typo in a field a pharmacist checks
 * against an age limit is worth stopping at the form.
 */
export function parseDateOfBirth(
  input: string,
  today: Date = new Date(),
): { iso: string } | { error: string } {
  const m = input.trim().match(/^(\d{1,2})[/.\-\s](\d{1,2})[/.\-\s](\d{4})$/);
  if (!m) return { error: 'Enter your date of birth as DD/MM/YYYY.' };
  const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  const real =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!real) return { error: 'That date does not exist. Check the day and month.' };
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  if (date.getTime() > todayUtc) return { error: 'Your date of birth cannot be in the future.' };
  if (year < today.getFullYear() - 130) return { error: 'Check the year — that is over 130 years ago.' };
  const pad = (n: number) => String(n).padStart(2, '0');
  return { iso: `${year}-${pad(month)}-${pad(day)}` };
}

/** Two-letter monogram for avatars. "Ama Mensah" → "AM". */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

/** Titles people type in front of their name, which are not what we call them. */
const HONORIFICS = /^(dr|mr|mrs|ms|miss|mx|prof|rev|pastor|hon|sir)\.?$/i;

/**
 * "Ama Mensah" → "Ama". "Dr. Kwame Asante" → "Kwame". For a greeting, never
 * for a form. Brackets and stray punctuation are not part of a name
 * ("Samuel Amusa (Oluwatominsin)" → "Samuel").
 */
export function firstName(name: string): string {
  const words = name
    .replace(/[()[\]{}"“”,]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = words.find((w) => !HONORIFICS.test(w)) ?? words[0] ?? '';
  return first;
}

/** "+233 24 400 1188" → "024 400 1188": the form a Ghanaian wallet shows. */
export function localPhone(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '');
  const local = digits.startsWith('+233') ? '0' + digits.slice(4) : digits.replace(/^\+/, '');
  return local.replace(/^(\d{3})(\d{3})(\d{4})$/, '$1 $2 $3');
}

/** Time-of-day greeting for the Home header. Local time; no locale games. */
export function greetingFor(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** The development stand-in. Never shown when a real session exists. */
export const FIXTURE_PROFILE: Profile = {
  name: 'Ama Mensah',
  email: 'ama@altruist.gh',
  phone: '+233 24 400 1188',
  phoneVerified: true,
  dateOfBirth: '1994-03-14',
  avatarPreset: 'wrap',
};

/** The empty person: what a signed-out device knows. */
export const EMPTY_PROFILE: Profile = { name: '', email: '', phone: '' };
