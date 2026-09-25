/**
 * Health content — the article library.
 *
 * One record per article, carrying both the card fields (Health Tips, the
 * Wellness tab's "Read next") and the full body the Article screen renders.
 * Splitting those across two files is how a list ends up promising an article
 * that opens as a different one.
 *
 * SRS §1: health content Altruist publishes must be traceable to a named,
 * registered pharmacist. `reviewer` is therefore NOT optional — an article
 * with nobody's name on it cannot be rendered, because the type will not let
 * you build one. The default is the partner pharmacy's superintendent, filled
 * in at read time (see `withReviewer`), never a generic "medically reviewed".
 */
import type { IconName } from '@/components/ui/Icon';
import type { Theme } from '@/theme/tokens';
import type { Pharmacy } from './pharmacies';

export type Tone = keyof Theme['colors']['bg'];

export type ArticleBlock = { kind: 'p' | 'h'; text: string };

export type Reviewer = {
  name: string;
  /** Pharmacy Council registration — printed under the byline. */
  registration: string;
  role: string;
};

export type Article = {
  id: string;
  title: string;
  /** Headline as it appears on the article hero, if it differs from `title`. */
  headline?: string;
  category: string;
  /** Reading time in minutes; every "N min read" string is built from this. */
  minutes: number;
  icon: IconName;
  tone: Tone;
  /** Shown in the Wellness tab's "Read next" strip. */
  featured?: boolean;
  body: ArticleBlock[];
  reviewer?: Reviewer;
};

export const ARTICLES: Article[] = [
  {
    id: 'finish-the-course',
    title: 'Antibiotics: finish the course',
    headline: 'Finishing your antibiotics matters more than feeling better',
    category: 'Medication',
    minutes: 4,
    icon: 'shield-check',
    tone: 'infoSubtle',
    featured: true,
    body: [
      {
        kind: 'p',
        text: 'Most people stop taking antibiotics the moment they feel better. That is usually two or three days before the course is finished — and it is the single biggest driver of antibiotic resistance in Ghana.',
      },
      { kind: 'h', text: 'Feeling better is not the same as being clear' },
      {
        kind: 'p',
        text: 'Symptoms fade once your immune system gains the upper hand. The bacteria causing the infection are not gone yet. The ones that survive a partial course are, by definition, the hardest to kill.',
      },
      { kind: 'h', text: 'What to do instead' },
      {
        kind: 'p',
        text: 'Finish the full course exactly as the label states, even if you feel completely well. If side effects are making that difficult, call the pharmacy rather than stopping — the dose or the drug can often be changed.',
      },
    ],
  },
  {
    id: 'tablets-with-food',
    title: 'Why some tablets must be taken with food',
    category: 'Medication',
    minutes: 3,
    icon: 'prescription',
    tone: 'accentBlue',
    body: [
      {
        kind: 'p',
        text: 'A label that says "with food" is not a suggestion about comfort. For some medicines it changes how much of the dose reaches your blood; for others it is what stops the tablet irritating your stomach lining.',
      },
      { kind: 'h', text: 'Two different reasons, one instruction' },
      {
        kind: 'p',
        text: 'Anti-inflammatories are taken with food to protect the stomach. Some antibiotics and antifungals are taken with food because fat in the meal helps them absorb. Skipping the meal changes the dose you actually receive.',
      },
      { kind: 'h', text: 'What counts as food' },
      {
        kind: 'p',
        text: 'A proper meal, not a biscuit. If your schedule makes that hard, ask the pharmacy — several medicines have a version that does not depend on it.',
      },
    ],
  },
  {
    id: 'hydration-antihypertensives',
    title: 'Staying hydrated on antihypertensives',
    category: 'Heart',
    minutes: 5,
    icon: 'heart',
    tone: 'accentCream',
    body: [
      {
        kind: 'p',
        text: 'Several blood-pressure medicines work partly by making you pass more water. In the heat that is easy to underestimate, and dehydration will make you feel worse than the pressure ever did.',
      },
      { kind: 'h', text: 'The signs to watch' },
      {
        kind: 'p',
        text: 'Light-headedness on standing, cramp, dark urine and a dry mouth all point the same way. They are also the signs of a dose that has become too strong for you, which is why they are worth reporting rather than pushing through.',
      },
      { kind: 'h', text: 'Do not stop on your own' },
      {
        kind: 'p',
        text: 'Stopping a blood-pressure medicine abruptly can raise pressure sharply. Speak to the pharmacy or your prescriber about timing and dose before changing anything.',
      },
    ],
  },
  {
    id: 'paracetamol-label',
    title: 'Reading a paracetamol label properly',
    category: 'Medication',
    minutes: 2,
    icon: 'info',
    tone: 'accentGold',
    body: [
      {
        kind: 'p',
        text: 'Paracetamol is in more products than people expect: cold and flu sachets, night-time remedies and combination painkillers all contain it. Taking two of them together is the most common way people exceed the daily maximum without meaning to.',
      },
      { kind: 'h', text: 'Read the active ingredient, not the brand' },
      {
        kind: 'p',
        text: 'The brand on the front tells you nothing. The active ingredient list on the back is where paracetamol appears, sometimes as acetaminophen.',
      },
      { kind: 'h', text: 'If in doubt, ask before you double up' },
      {
        kind: 'p',
        text: 'The pharmacy can tell you in seconds whether two things you are holding can be taken together.',
      },
    ],
  },
  {
    id: 'sleep-blood-sugar',
    title: 'Sleep and blood-sugar control',
    category: 'Sleep',
    minutes: 6,
    icon: 'wellness',
    tone: 'accentPink',
    body: [
      {
        kind: 'p',
        text: 'Short sleep raises the amount of insulin your body needs to handle the same meal. Over a run of bad nights that shows up in your morning readings, even when nothing about your diet has changed.',
      },
      { kind: 'h', text: 'It is a two-way street' },
      {
        kind: 'p',
        text: 'High readings overnight also break sleep, so a poor night and a poor reading tend to reinforce each other. Treating either one usually improves the other.',
      },
      { kind: 'h', text: 'Where to start' },
      {
        kind: 'p',
        text: 'A consistent wake time does more than a consistent bedtime. If a medicine you take at night is keeping you awake, ask whether it can be moved.',
      },
    ],
  },
  {
    id: 'blood-pressure',
    title: 'Managing blood pressure',
    category: 'Heart',
    minutes: 6,
    icon: 'heart',
    tone: 'dangerSubtle',
    featured: true,
    body: [
      {
        kind: 'p',
        text: 'Blood pressure is managed, not cured. That single fact explains why the medicine continues after the numbers come down, and why stopping when you feel fine is the most common reason people end up back where they started.',
      },
      { kind: 'h', text: 'Measure it properly or not at all' },
      {
        kind: 'p',
        text: 'Sit still for five minutes first, feet flat, arm supported at heart height. A reading taken straight after climbing stairs is not a reading of anything useful.',
      },
      { kind: 'h', text: 'Salt is the lever most people have' },
      {
        kind: 'p',
        text: 'Most salt comes from prepared food rather than the shaker. Cutting it is unglamorous and works.',
      },
    ],
  },
  {
    id: 'sleep-recovery',
    title: 'Sleep and recovery',
    category: 'Sleep',
    minutes: 5,
    icon: 'clock',
    tone: 'warningSubtle',
    featured: true,
    body: [
      {
        kind: 'p',
        text: 'Training breaks tissue down; sleep is when it is rebuilt. Cutting sleep to fit another session in is the one trade in fitness that reliably loses on both sides.',
      },
      { kind: 'h', text: 'The first night after a hard session matters most' },
      {
        kind: 'p',
        text: 'Growth hormone release is concentrated in deep sleep early in the night, which is exactly the part a late finish removes.',
      },
      { kind: 'h', text: 'Signs you are under-recovered' },
      {
        kind: 'p',
        text: 'A resting heart rate that has drifted up, weights that feel heavier than the log says, and a short fuse. Take the rest day; the programme assumes it.',
      },
    ],
  },
];

/** Chip row for Health Tips — "All" plus each category actually present. */
export const ARTICLE_CATEGORIES: string[] = [
  'All',
  ...Array.from(new Set(ARTICLES.map((a) => a.category))),
];

export const byId = (id?: string): Article | undefined =>
  id ? ARTICLES.find((a) => a.id === id) : undefined;

/** "Medication · 3 min" for a card; "3 min read · Medication" for the strip. */
export const cardMeta = (a: Article) => `${a.category} · ${a.minutes} min`;
export const readMeta = (a: Article) => `${a.minutes} min read · ${a.category}`;

/**
 * Attaches the reviewing pharmacist. Content is written centrally, but the
 * person who stands behind it is whoever is superintendent at the partner
 * pharmacy fulfilling for this user — see the file header.
 */
export function withReviewer(a: Article, p: Pharmacy): Article & { reviewer: Reviewer } {
  return {
    ...a,
    reviewer: a.reviewer ?? {
      name: p.superintendent.name,
      registration: p.superintendent.registration,
      role: 'Lead Pharmacist',
    },
  };
}
