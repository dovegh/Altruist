/**
 * Wellness — programme content and the pure logic around it.
 *
 * Content lives here, not in the screens, for the same reason the catalogue
 * does: a screen that carries its own copy of "3 × 12" cannot be made to agree
 * with the one next to it, and a programme that only exists as JSX cannot be
 * served from a table later. Everything a screen renders about a workout is
 * looked up from `PROGRAMME`; everything about what the user has DONE is in
 * `features/wellness/store.ts`.
 *
 * Boundary, from the Wellness tab's own footer: this is general guidance.
 * Nothing in here knows about a prescription, and nothing in the store may
 * ever gate a medicine on it.
 */
import type { IconName } from '@/components/ui/Icon';
import type { Theme } from '@/theme/tokens';
import { ARTICLES, readMeta } from './articles';
import type { MovementPattern } from '@/components/MovementFigure';

export type Tone = keyof Theme['colors']['bg'];

export type Exercise = {
  id: string;
  name: string;
  /** Primary muscles, as shown on the figure panel tag. */
  muscles: string;
  sets: number;
  /** Reps per set, or a hold — free text because "45 s" is a valid target. */
  reps: string;
  restSec: number;
  equipment: string;
  grip?: string;
  /** Working weight the user last configured. Absent for bodyweight moves. */
  weightKg?: number;
  /** Swap targets: same muscles, different implement. */
  alternatives?: string[];
  /**
   * How to perform it, in order. Present on every exercise because the session
   * screen can only show a name and a rep count — someone meeting "Romanian
   * deadlift" for the first time needs more than a label to do it safely.
   */
  howTo: string[];
  /** The one thing people get wrong. Shown as a highlighted note. */
  cue: string;
  /**
   * Which diagram to draw. Families share one — a goblet squat and a leg press
   * are the same shape to the eye, and a per-exercise drawing would be thirty
   * near-identical figures pretending to be distinctions.
   */
  pattern: MovementPattern;
};

export type WorkoutDay = {
  id: string;
  title: string;
  durationMin: number;
  exerciseIds: string[];
};

export type Programme = {
  id: string;
  title: string;
  /** Eyebrow category, e.g. STRENGTH. */
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  sessionsTotal: number;
  /** One line under the title on the plan card and the routine hero. */
  summary: string;
  /** Cycled in order: session n uses days[n % days.length]. */
  days: WorkoutDay[];
  disclaimer: { title: string; body: string };
};

export type PlanCard = {
  id: string;
  title: string;
  meta: string;
  tone: Tone;
  icon: IconName;
  /** Route with its query, e.g. `/routine?id=daily-mobility`. */
  href: string;
};

/** A card in the Wellness tab's "Read next" strip. Built from an Article. */
export type Read = {
  id: string;
  title: string;
  meta: string;
  tone: Tone;
  icon: IconName;
};

/**
 * The strip, derived from the article library so a card always opens the
 * article it names. The two used to be separate lists kept in step by hand.
 */
export const READS: Read[] = (ARTICLES.filter((a) => a.featured).length
  ? ARTICLES.filter((a) => a.featured)
  : ARTICLES.slice(0, 3)
).map((a) => ({ id: a.id, title: a.title, meta: readMeta(a), tone: a.tone, icon: a.icon }));

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

/** Exercise library. Keyed so days and swaps can reference by id. */
export const EXERCISES: Record<string, Exercise> = {
  'incline-db-press': {
    id: 'incline-db-press',
    name: 'Incline dumbbell press',
    muscles: 'Chest · front delts',
    sets: 3,
    reps: '10',
    restSec: 90,
    equipment: 'Dumbbells + bench',
    grip: 'Neutral',
    weightKg: 16,
    alternatives: ['machine-chest-press'],
    howTo: [
      'Set the bench to about 30 degrees and sit with a dumbbell on each thigh.',
      'Lie back, driving the weights to the start position over your chest.',
      'Lower until your elbows are level with your ribs.',
      'Press back up without letting the dumbbells clash.',
    ],
    cue: 'Keep your shoulder blades pinned to the bench — shrugging turns this into a shoulder exercise.',
    pattern: 'press',
  },
  'machine-chest-press': {
    id: 'machine-chest-press',
    name: 'Machine chest press',
    muscles: 'Chest · front delts',
    sets: 3,
    reps: '10',
    restSec: 90,
    equipment: 'Chest press machine',
    grip: 'Pronated',
    weightKg: 40,
    alternatives: ['incline-db-press'],
    howTo: [
      'Set the seat so the handles sit level with the middle of your chest.',
      'Grip the handles and press out until your arms are almost straight.',
      'Return under control until you feel a stretch across the chest.',
    ],
    cue: 'Stop just short of locking the elbows; the tension should stay on the chest.',
    pattern: 'press',
  },
  'seated-row': {
    id: 'seated-row',
    name: 'Seated row',
    muscles: 'Lats · mid back',
    sets: 3,
    reps: '12',
    restSec: 90,
    equipment: 'Cable machine',
    grip: 'Neutral',
    weightKg: 35,
    alternatives: ['single-arm-db-row'],
    howTo: [
      'Sit tall with a slight bend in the knees and grip the handle.',
      'Pull to your stomach, leading with the elbows.',
      'Let the handle travel back out until your shoulder blades separate.',
    ],
    cue: 'Row with your back, not your arms — think of putting your elbows in your back pockets.',
    pattern: 'row',
  },
  'single-arm-db-row': {
    id: 'single-arm-db-row',
    name: 'Single-arm dumbbell row',
    muscles: 'Lats · mid back',
    sets: 3,
    reps: '12 each side',
    restSec: 90,
    equipment: 'Dumbbell + bench',
    grip: 'Neutral',
    weightKg: 18,
    alternatives: ['seated-row'],
    howTo: [
      'Put one knee and the same-side hand on a bench.',
      'Let the dumbbell hang straight down from the free arm.',
      'Pull it to your hip, then lower it fully.',
    ],
    cue: 'Keep your torso square to the floor; rotating turns it into a twist, not a row.',
    pattern: 'row',
  },
  'lateral-raise': {
    id: 'lateral-raise',
    name: 'Lateral raise',
    muscles: 'Side delts',
    sets: 3,
    reps: '15',
    restSec: 60,
    equipment: 'Dumbbells',
    grip: 'Neutral',
    weightKg: 6,
    alternatives: ['cable-lateral-raise'],
    howTo: [
      'Stand with a light dumbbell in each hand, elbows slightly bent.',
      'Raise out to the sides until your arms reach shoulder height.',
      'Lower slowly, resisting the whole way down.',
    ],
    cue: 'Lighter than you think. If you have to swing it up, it is too heavy.',
    pattern: 'lateral-raise',
  },
  'cable-lateral-raise': {
    id: 'cable-lateral-raise',
    name: 'Cable lateral raise',
    muscles: 'Side delts',
    sets: 3,
    reps: '15 each side',
    restSec: 60,
    equipment: 'Cable machine',
    grip: 'Neutral',
    weightKg: 5,
    alternatives: ['lateral-raise'],
    howTo: [
      'Stand side-on to a low pulley and take the handle in the outside hand.',
      "Raise the arm out to shoulder height across your body's line.",
      'Lower under control and repeat before switching sides.',
    ],
    cue: 'Keep the working shoulder down and away from your ear throughout.',
    pattern: 'lateral-raise',
  },
  'face-pull': {
    id: 'face-pull',
    name: 'Face pull',
    muscles: 'Rear delts · rotator cuff',
    sets: 3,
    reps: '15',
    restSec: 60,
    equipment: 'Cable + rope',
    grip: 'Overhand',
    weightKg: 15,
    howTo: [
      'Set a rope at roughly face height and step back until the cable is taut.',
      'Pull the rope towards your forehead, splitting your hands apart.',
      'Finish with your knuckles beside your ears, then return slowly.',
    ],
    cue: 'This is a posture exercise — go light and aim for a hard squeeze between the shoulder blades.',
    pattern: 'face-pull',
  },
  'bicep-curl': {
    id: 'bicep-curl',
    name: 'Bicep curl',
    muscles: 'Biceps',
    sets: 2,
    reps: '12',
    restSec: 60,
    equipment: 'Dumbbells',
    grip: 'Supinated',
    weightKg: 10,
    alternatives: ['hammer-curl-pulley'],
    howTo: [
      'Stand with a dumbbell in each hand, palms forward.',
      'Curl to shoulder height, keeping the elbows at your sides.',
      'Lower all the way until the arms are straight.',
    ],
    cue: 'If your elbows drift forward, the shoulders have taken over.',
    pattern: 'curl',
  },
  'hammer-curl-pulley': {
    id: 'hammer-curl-pulley',
    name: 'Hammer curl on pulley',
    muscles: 'Biceps · brachialis',
    sets: 2,
    reps: '12',
    restSec: 90,
    equipment: 'Cable + rope',
    grip: 'Neutral',
    weightKg: 24,
    alternatives: ['bicep-curl'],
    howTo: [
      'Attach a rope to a low pulley and hold it with palms facing each other.',
      'Curl towards your shoulders, keeping the elbows pinned.',
      'Lower to a full stretch before the next rep.',
    ],
    cue: 'Neutral grip throughout — the thumbs stay up.',
    pattern: 'curl',
  },
  'triceps-pushdown': {
    id: 'triceps-pushdown',
    name: 'Triceps pushdown',
    muscles: 'Triceps',
    sets: 2,
    reps: '12',
    restSec: 60,
    equipment: 'Cable + rope',
    grip: 'Neutral',
    weightKg: 20,
    alternatives: ['overhead-extension'],
    howTo: [
      'Set a rope at head height and take a neutral grip.',
      'Tuck your elbows to your ribs and press down until the arms lock.',
      'Let the rope rise only as far as your elbows allow.',
    ],
    cue: 'Only the forearms move. If your shoulders dip, drop the weight.',
    pattern: 'pushdown',
  },
  'overhead-extension': {
    id: 'overhead-extension',
    name: 'Overhead triceps extension',
    muscles: 'Triceps',
    sets: 2,
    reps: '12',
    restSec: 60,
    equipment: 'Dumbbell',
    grip: 'Neutral',
    weightKg: 14,
    alternatives: ['triceps-pushdown'],
    howTo: [
      'Hold one dumbbell with both hands above your head.',
      'Lower it behind your head by bending only at the elbows.',
      'Press back up to the start.',
    ],
    cue: 'Keep the upper arms vertical and close to your ears.',
    pattern: 'overhead-extension',
  },
  'goblet-squat': {
    id: 'goblet-squat',
    name: 'Goblet squat',
    muscles: 'Quads · glutes',
    sets: 3,
    reps: '10',
    restSec: 120,
    equipment: 'Dumbbell',
    grip: 'Goblet',
    weightKg: 20,
    alternatives: ['leg-press'],
    howTo: [
      'Hold a dumbbell vertically against your chest.',
      'Sit down between your hips, keeping your chest tall.',
      'Drive through mid-foot to stand.',
    ],
    cue: 'Let the knees track over the toes rather than caving inwards.',
    pattern: 'squat',
  },
  'leg-press': {
    id: 'leg-press',
    name: 'Leg press',
    muscles: 'Quads · glutes',
    sets: 3,
    reps: '10',
    restSec: 120,
    equipment: 'Leg press machine',
    weightKg: 90,
    alternatives: ['goblet-squat'],
    howTo: [
      'Set the seat so your knees reach about 90 degrees at the bottom.',
      'Place your feet shoulder-width on the platform.',
      'Press out, then lower under control.',
    ],
    cue: 'Do not let your lower back round off the pad at the bottom.',
    pattern: 'squat',
  },
  'romanian-deadlift': {
    id: 'romanian-deadlift',
    name: 'Romanian deadlift',
    muscles: 'Hamstrings · glutes',
    sets: 3,
    reps: '10',
    restSec: 120,
    equipment: 'Dumbbells',
    grip: 'Overhand',
    weightKg: 20,
    howTo: [
      'Stand holding the weights in front of your thighs.',
      'Push your hips back, letting the weights travel down your legs.',
      'Stop when you feel a strong hamstring stretch, then stand tall.',
    ],
    cue: 'This is a hip hinge, not a squat — the knees stay softly bent, not bending further.',
    pattern: 'hinge',
  },
  'walking-lunge': {
    id: 'walking-lunge',
    name: 'Walking lunge',
    muscles: 'Quads · glutes',
    sets: 3,
    reps: '12 each side',
    restSec: 90,
    equipment: 'Dumbbells',
    grip: 'Neutral',
    weightKg: 10,
    howTo: [
      'Hold a dumbbell in each hand at your sides.',
      'Step forward and lower until the back knee nearly touches the floor.',
      'Drive through the front heel and step through into the next rep.',
    ],
    cue: 'Keep your torso upright; leaning forward shifts the work off the glutes.',
    pattern: 'lunge',
  },
  'leg-curl': {
    id: 'leg-curl',
    name: 'Leg curl',
    muscles: 'Hamstrings',
    sets: 3,
    reps: '12',
    restSec: 90,
    equipment: 'Leg curl machine',
    weightKg: 30,
    howTo: [
      'Set the pad just above your heels and lie or sit as the machine requires.',
      'Curl the pad towards you as far as the machine allows.',
      'Return slowly without letting the weight stack rest.',
    ],
    cue: 'Squeeze at the top for a beat rather than rushing the return.',
    pattern: 'leg-curl',
  },
  'calf-raise': {
    id: 'calf-raise',
    name: 'Standing calf raise',
    muscles: 'Calves',
    sets: 3,
    reps: '15',
    restSec: 60,
    equipment: 'Bodyweight or machine',
    howTo: [
      'Stand with the balls of your feet on a step or the floor.',
      'Rise as high onto the toes as you can.',
      'Lower until you feel a stretch through the calf.',
    ],
    cue: 'Full range beats extra weight here — go all the way up and all the way down.',
    pattern: 'calf-raise',
  },
  // --- Mobility ------------------------------------------------------------
  'hip-flexor-stretch': {
    id: 'hip-flexor-stretch',
    name: 'Half-kneeling hip flexor stretch',
    muscles: 'Hip flexors',
    sets: 2,
    reps: '40 s each side',
    restSec: 20,
    equipment: 'Mat',
    howTo: [
      'Kneel on one knee with the other foot flat in front.',
      'Tuck your tailbone under so your lower back flattens.',
      'Ease your hips forward until you feel a stretch at the front of the kneeling hip.',
    ],
    cue: 'The tuck does the work. If you only lunge forward you stretch the knee, not the hip.',
    pattern: 'kneeling-stretch',
  },
  'nineties-hip-switch': {
    id: 'nineties-hip-switch',
    name: '90/90 hip switch',
    muscles: 'Hips · glutes',
    sets: 2,
    reps: '10 switches',
    restSec: 20,
    equipment: 'Mat',
    howTo: [
      'Sit with one leg bent in front at 90 degrees and the other bent behind you.',
      'Keep your chest tall and rotate both knees over to the other side.',
      'Pause when both are down, then switch back.',
    ],
    cue: 'Move slowly enough that you never need to push off the floor with your hands.',
    pattern: 'seated-twist',
  },
  'ankle-rock': {
    id: 'ankle-rock',
    name: 'Kneeling ankle rock',
    muscles: 'Ankles · calves',
    sets: 2,
    reps: '12 each side',
    restSec: 20,
    equipment: 'Mat',
    howTo: [
      'Half-kneel with the front foot flat and about a hand-span from a wall.',
      'Drive the front knee forward over the toes towards the wall.',
      'Return and repeat, keeping the heel down throughout.',
    ],
    cue: 'The heel must stay glued to the floor — that is the whole point of the drill.',
    pattern: 'kneeling-stretch',
  },
  'deep-squat-hold': {
    id: 'deep-squat-hold',
    name: 'Deep squat hold',
    muscles: 'Hips · ankles',
    sets: 2,
    reps: '45 s hold',
    restSec: 30,
    equipment: 'Bodyweight',
    howTo: [
      'Stand with feet a little wider than your hips, toes turned slightly out.',
      'Sit all the way down, using your elbows to gently push the knees apart.',
      'Hold, breathing slowly, keeping the chest lifted.',
    ],
    cue: 'Hold a door frame for balance if your heels lift; the range matters more than doing it unaided.',
    pattern: 'squat',
  },
  'cat-cow': {
    id: 'cat-cow',
    name: 'Cat-cow',
    muscles: 'Spine',
    sets: 2,
    reps: '12 cycles',
    restSec: 20,
    equipment: 'Mat',
    howTo: [
      'Start on hands and knees, hands under shoulders and knees under hips.',
      'Exhale and round your spine towards the ceiling.',
      'Inhale and let the belly drop as you lift the chest and tailbone.',
    ],
    cue: 'Let the breath set the pace — one full breath per cycle, not faster.',
    pattern: 'quadruped',
  },
  'thoracic-rotation': {
    id: 'thoracic-rotation',
    name: 'Open-book rotation',
    muscles: 'Upper back',
    sets: 2,
    reps: '10 each side',
    restSec: 20,
    equipment: 'Mat',
    howTo: [
      'Lie on your side with knees bent to 90 degrees and arms stacked in front.',
      'Keeping the knees down, sweep the top arm over and across to the other side.',
      'Follow your hand with your eyes, then return.',
    ],
    cue: 'The knees stay pinned together — if they lift, the rotation has moved into your lower back.',
    pattern: 'side-lying',
  },
  'wall-slide': {
    id: 'wall-slide',
    name: 'Wall slide',
    muscles: 'Shoulders · upper back',
    sets: 2,
    reps: '12',
    restSec: 20,
    equipment: 'Wall',
    howTo: [
      'Stand with your back, head and arms against a wall, elbows at 90 degrees.',
      'Slide the arms overhead as far as they will go without leaving the wall.',
      'Return under control.',
    ],
    cue: 'Keep your ribs down; arching the lower back is what usually creates the extra range.',
    pattern: 'wall',
  },
  'doorway-pec-stretch': {
    id: 'doorway-pec-stretch',
    name: 'Doorway chest stretch',
    muscles: 'Chest · front delts',
    sets: 2,
    reps: '40 s each side',
    restSec: 20,
    equipment: 'Doorway',
    howTo: [
      'Place a forearm on the door frame with the elbow at shoulder height.',
      'Step through gently with the same-side foot.',
      'Turn your chest away until you feel the stretch, then hold.',
    ],
    cue: 'Ease in. A sharp pull at the front of the shoulder means you have gone too far.',
    pattern: 'doorway',
  },

  // --- Cardio --------------------------------------------------------------
  'brisk-walk-warmup': {
    id: 'brisk-walk-warmup',
    name: 'Brisk walk warm-up',
    muscles: 'Whole body',
    sets: 1,
    reps: '5 min',
    restSec: 0,
    equipment: 'None',
    howTo: [
      'Start at an easy walking pace.',
      'Build over five minutes until you are walking briskly but can still talk in full sentences.',
    ],
    cue: 'Do not skip this in the heat — going straight to pace is what makes the session feel awful.',
    pattern: 'walk',
  },
  'zone2-steady': {
    id: 'zone2-steady',
    name: 'Steady zone 2',
    muscles: 'Heart · lungs',
    sets: 1,
    reps: '20 min',
    restSec: 0,
    equipment: 'None',
    howTo: [
      'Settle into a pace you could hold for an hour.',
      'You should be able to speak a full sentence without gasping.',
      'Hold that effort for the full block, adjusting pace rather than stopping.',
    ],
    cue: 'If you cannot talk, you are training too hard for this session. Slow down.',
    pattern: 'run',
  },
  'interval-block': {
    id: 'interval-block',
    name: 'Easy intervals',
    muscles: 'Heart · lungs',
    sets: 6,
    reps: '1 min on, 1 min easy',
    restSec: 60,
    equipment: 'None',
    howTo: [
      'Lift to a pace that is firm but not a sprint for one minute.',
      'Drop back to an easy walk or jog for one minute.',
      'Repeat for the full set count.',
    ],
    cue: 'The easy minute is part of the session, not a break — keep moving through it.',
    pattern: 'run',
  },
  'cooldown-walk': {
    id: 'cooldown-walk',
    name: 'Cool-down walk',
    muscles: 'Whole body',
    sets: 1,
    reps: '5 min',
    restSec: 0,
    equipment: 'None',
    howTo: [
      'Walk easily for five minutes, letting your breathing settle.',
      'Finish with a drink of water.',
    ],
    cue: 'Do not sit straight down at the end; walking it off settles the heart rate faster.',
    pattern: 'walk',
  },

  plank: {
    id: 'plank',
    name: 'Plank',
    muscles: 'Core',
    sets: 3,
    reps: '45 s hold',
    restSec: 60,
    equipment: 'Mat',
    howTo: [
      'Set your forearms under your shoulders and extend the legs behind you.',
      'Squeeze the glutes and brace the stomach.',
      'Hold, breathing normally, for the target time.',
    ],
    cue: 'A sagging or piked hip ends the set — stop when the line breaks, not when the timer does.',
    pattern: 'plank',
  },
};

const STRENGTH: Programme = {
  id: 'upper-lower-split',
  title: 'Upper / lower split',
  category: 'STRENGTH',
  level: 'Intermediate',
  sessionsTotal: 8,
  summary: 'Two alternating days, six movements each, built around compound lifts.',
  days: [
    {
      id: 'upper',
      title: 'Upper body',
      durationMin: 45,
      exerciseIds: [
        'incline-db-press',
        'seated-row',
        'lateral-raise',
        'face-pull',
        'bicep-curl',
        'triceps-pushdown',
      ],
    },
    {
      id: 'lower',
      title: 'Lower body',
      durationMin: 45,
      exerciseIds: [
        'goblet-squat',
        'romanian-deadlift',
        'walking-lunge',
        'leg-curl',
        'calf-raise',
        'plank',
      ],
    },
  ],
  disclaimer: {
    title: 'General guidance, not a prescription',
    body: 'If you are on blood-pressure or heart medication, speak to a clinician before starting a new programme. Altruist does not provide medical advice.',
  },
};

const MOBILITY: Programme = {
  id: 'daily-mobility',
  title: 'Daily mobility',
  category: 'MOBILITY',
  level: 'Beginner',
  sessionsTotal: 14,
  summary: 'Fifteen minutes of holds and controlled range, doable every day.',
  days: [
    {
      id: 'lower-mobility',
      title: 'Hips & ankles',
      durationMin: 15,
      exerciseIds: ['hip-flexor-stretch', 'nineties-hip-switch', 'ankle-rock', 'deep-squat-hold'],
    },
    {
      id: 'upper-mobility',
      title: 'Spine & shoulders',
      durationMin: 15,
      exerciseIds: ['cat-cow', 'thoracic-rotation', 'wall-slide', 'doorway-pec-stretch'],
    },
  ],
  disclaimer: {
    title: 'Range, not pain',
    body: 'Mobility work should feel like tension, never sharp pain. If a joint hurts rather than stretches, stop and speak to a clinician.',
  },
};

const CARDIO: Programme = {
  id: 'zone-2-base',
  title: 'Zone 2 base',
  category: 'CARDIO',
  level: 'Beginner',
  sessionsTotal: 12,
  summary: 'Conversational-pace aerobic work, the pace you can hold and still talk.',
  days: [
    {
      id: 'steady',
      title: 'Steady state',
      durationMin: 30,
      exerciseIds: ['brisk-walk-warmup', 'zone2-steady', 'cooldown-walk'],
    },
    {
      id: 'intervals',
      title: 'Easy intervals',
      durationMin: 30,
      exerciseIds: ['brisk-walk-warmup', 'interval-block', 'cooldown-walk'],
    },
  ],
  disclaimer: {
    title: 'Build slowly in the heat',
    body: 'Ghana\'s humidity raises heart rate at any given pace. Judge effort by how easily you can talk, not by the clock, and stop if you feel light-headed.',
  },
};

/** Every plan the app offers. Order is the order they appear on Wellness. */
export const PROGRAMMES: Programme[] = [STRENGTH, MOBILITY, CARDIO];

/** The plan a session starts on when nothing else is specified. */
export const DEFAULT_PROGRAMME_ID = STRENGTH.id;

export function programmeById(id?: string): Programme {
  return PROGRAMMES.find((p) => p.id === id) ?? STRENGTH;
}

/**
 * The "Today's plan" tiles.
 *
 * One per programme plus Nutrition. Each carries its own programme id, so the
 * tiles open the plan they name — Mobility and Cardio both used to open the
 * strength routine, which made two of the four tiles lie about their content.
 */
export const PLAN_CARDS: PlanCard[] = [
  {
    id: STRENGTH.id,
    title: STRENGTH.title,
    meta: '',
    tone: 'accentBlue',
    icon: 'award',
    href: `/routine?id=${STRENGTH.id}`,
  },
  {
    id: MOBILITY.id,
    title: MOBILITY.title,
    meta: '',
    tone: 'accentPink',
    icon: 'wellness',
    href: `/routine?id=${MOBILITY.id}`,
  },
  {
    id: CARDIO.id,
    title: CARDIO.title,
    meta: '',
    tone: 'brand',
    icon: 'heart',
    href: `/routine?id=${CARDIO.id}`,
  },
  { id: 'nutrition', title: 'Nutrition', meta: '', tone: 'accentCream', icon: 'catalog', href: '/nutrition' },
];


export const NUTRITION = {
  hydrationGoal: 8,
  kcalTarget: 1840,
  /** Resting heart rate is illustrative until a wearable is connected. */
  restingBpm: { value: 64, meta: 'Steady this week' },
  /**
   * Derived from the user's own order history upstream — each line names the
   * medicine it applies to, which is why this is the one wellness surface that
   * carries a pharmacy disclaimer.
   */
  interactions: [
    { title: 'Dairy and calcium', note: 'Blocks absorption — leave 2 hours either side · Amoxicillin 500mg' },
    { title: 'Grapefruit juice', note: 'Raises drug levels in the blood · Amlodipine 5mg' },
    { title: 'Alcohol', note: 'Increases liver strain · Paracetamol 500mg' },
  ],
  meals: [
    { title: 'Waakye with boiled egg', meta: 'Breakfast · 420 kcal', tone: 'accentGold' as Tone },
    { title: 'Jollof rice, grilled tilapia, salad', meta: 'Lunch · 680 kcal', tone: 'accentBlue' as Tone },
    { title: 'Light soup with fufu', meta: 'Dinner · 540 kcal', tone: 'accentPink' as Tone },
  ],
};

// ---------------------------------------------------------------------------
// What syncs
//
// These are the wire shapes shared by the api seam and the wellness store.
// They live here, not in the store, because `lib` may not import from
// `features` — the dependency runs one way.
// ---------------------------------------------------------------------------

/**
 * A FINISHED session. The id is generated on the device, which is what makes
 * pushing one idempotent: a phone that uploads, loses signal before it hears
 * back, and retries later writes the same row twice and ends up with one
 * session rather than two.
 */
export type WellnessSession = {
  id: string;
  /** Local calendar day, YYYY-MM-DD. What streaks and week dots are built from. */
  day: string;
  /** Which plan this session belonged to. Progress is counted per programme. */
  programmeId: string;
  dayId: string;
  durationMin: number;
  finishedAt: number;
};

/** Everything the server holds for one person's wellness. */
export type WellnessSnapshot = {
  sessions: WellnessSession[];
  hydration: { day: string; glasses: number }[];
  saved: string[];
};

/**
 * An id for a session row.
 *
 * Not a v4 UUID and not trying to be: the column is `text` (same as
 * `orders.id`) and this is an identifier, never a secret. Time-prefixed so
 * ids sort roughly by creation, which makes a raw table dump readable.
 */
export function newSessionId(): string {
  const stamp = Date.now().toString(36);
  const noise = Math.random().toString(36).slice(2, 10);
  return `ws_${stamp}_${noise}`;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/** Local calendar day as YYYY-MM-DD. Streaks are about days, not timestamps. */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function shiftDays(date: Date, n: number): Date {
  const out = new Date(date);
  out.setDate(out.getDate() + n);
  return out;
}

/**
 * Consecutive days with a completed session, counted back from today. A day
 * off today does not break the streak until tomorrow — otherwise the number
 * would drop to zero every morning before the user had a chance to train.
 */
export function streakDays(sessionDays: Iterable<string>, today: Date = new Date()): number {
  const days = new Set(sessionDays);
  let cursor = days.has(dayKey(today)) ? today : shiftDays(today, -1);
  let n = 0;
  while (days.has(dayKey(cursor))) {
    n += 1;
    cursor = shiftDays(cursor, -1);
  }
  return n;
}

/** Monday-first week of { label, done } for the streak card. */
export function weekDots(
  sessionDays: Iterable<string>,
  today: Date = new Date(),
): { label: string; done: boolean; isToday: boolean }[] {
  const days = new Set(sessionDays);
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  // getDay(): Sunday = 0. Shift so Monday = 0.
  const offset = (today.getDay() + 6) % 7;
  const monday = shiftDays(today, -offset);
  return labels.map((label, i) => {
    const key = dayKey(shiftDays(monday, i));
    return { label, done: days.has(key), isToday: i === offset };
  });
}

/** Which day the next session uses: the programme cycles its days in order. */
export function nextDay(programme: Programme, sessionsDone: number): WorkoutDay {
  return programme.days[sessionsDone % programme.days.length];
}

/** A day's exercises with any swaps applied. */
export function resolveExercises(day: WorkoutDay, swaps: Record<string, string>): Exercise[] {
  return day.exerciseIds.map((id) => EXERCISES[swaps[id] ?? id]);
}

/** Distinct equipment across a day, in order of first use. */
export function equipmentFor(exercises: Exercise[]): string[] {
  const seen = new Set<string>();
  for (const e of exercises) {
    for (const item of e.equipment.split(/\s*(?:\+|or)\s*/i)) {
      const name = item.trim();
      if (name) seen.add(name.charAt(0).toUpperCase() + name.slice(1));
    }
  }
  return [...seen];
}

export function formatSeconds(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** 1840 → "1,840". Hermes' toLocaleString is not reliable across locales. */
export function formatThousands(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
