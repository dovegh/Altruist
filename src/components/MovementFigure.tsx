/**
 * Movement figures — original line diagrams for the exercise library.
 *
 * A name and a rep count do not tell someone what to actually do, and the
 * session screen previously showed a generic wellness glyph in a 264pt panel.
 * These are drawn here rather than sourced: exercise photography is licensed
 * work, and the app already carries one set of placeholder banners it has to
 * replace before shipping. Nothing here needs replacing.
 *
 * TWO poses, always. A single frame shows a position; the point of a lift is
 * the change between two positions, so every pattern defines a start and an
 * end.
 *
 * On the panels that matter — Exercise Detail and the live session — the two
 * are ANIMATED, looping slowly between them, because a movement demonstrated
 * is understood immediately and a movement described is not. Small thumbnails
 * stay static: a list of a dozen looping figures is noise, and it would run a
 * dozen animations to decorate a row.
 *
 * The loop honours the system reduce-motion setting, in which case it settles
 * on the end position — the one being worked towards.
 *
 * Figures are built from joint coordinates rather than hand-drawn paths, so a
 * new movement is a dozen numbers instead of a bezier. The space is 120 x 100
 * per pose; the shared viewBox is 260 x 100.
 */
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import Svg, { Circle, Line, Path, G } from 'react-native-svg';

/** A stick figure as joints. Coordinates are in the 120 x 100 pose space. */
type Pose = {
  head: [number, number];
  neck: [number, number];
  hip: [number, number];
  /** Near-side arm, then far-side arm. */
  elbowA: [number, number];
  handA: [number, number];
  elbowB: [number, number];
  handB: [number, number];
  kneeA: [number, number];
  footA: [number, number];
  kneeB: [number, number];
  footB: [number, number];
  /** Straight line between the hands — a bar, rope or dumbbell pair. */
  implement?: boolean;
};

export type MovementPattern =
  | 'press'
  | 'row'
  | 'lateral-raise'
  | 'face-pull'
  | 'curl'
  | 'pushdown'
  | 'overhead-extension'
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'leg-curl'
  | 'calf-raise'
  | 'plank'
  | 'kneeling-stretch'
  | 'seated-twist'
  | 'quadruped'
  | 'side-lying'
  | 'wall'
  | 'doorway'
  | 'walk'
  | 'run';

type Diagram = {
  start: Pose;
  end: Pose;
  /** Ground, bench, wall or frame drawn behind the figures. */
  prop?: 'floor' | 'bench' | 'wall' | 'frame';
  /** Where the travel arrow points. */
  arrow: 'up' | 'down' | 'in' | 'out' | 'forward';
};

/** Standing, arms hanging. Every upright pattern is a variation of this. */
const STAND: Pose = {
  head: [60, 16],
  neck: [60, 26],
  hip: [60, 56],
  elbowA: [51, 40],
  handA: [49, 53],
  elbowB: [69, 40],
  handB: [71, 53],
  kneeA: [55, 74],
  footA: [53, 92],
  kneeB: [65, 74],
  footB: [67, 92],
};

const pose = (base: Pose, over: Partial<Pose>): Pose => ({ ...base, ...over });

const DIAGRAMS: Record<MovementPattern, Diagram> = {
  // Lying on a bench, pressing up.
  press: {
    prop: 'bench',
    arrow: 'up',
    start: {
      head: [34, 44],
      neck: [44, 46],
      hip: [78, 56],
      elbowA: [44, 62],
      handA: [56, 60],
      elbowB: [44, 32],
      handB: [56, 34],
      kneeA: [92, 68],
      footA: [92, 88],
      kneeB: [96, 68],
      footB: [96, 88],
      implement: true,
    },
    end: {
      head: [34, 44],
      neck: [44, 46],
      hip: [78, 56],
      elbowA: [50, 30],
      handA: [56, 18],
      elbowB: [50, 28],
      handB: [56, 16],
      kneeA: [92, 68],
      footA: [92, 88],
      kneeB: [96, 68],
      footB: [96, 88],
      implement: true,
    },
  },
  // Seated, pulling the handle to the stomach.
  row: {
    prop: 'floor',
    arrow: 'in',
    start: pose(STAND, {
      head: [56, 24],
      neck: [58, 34],
      hip: [56, 62],
      elbowA: [74, 46],
      handA: [92, 50],
      elbowB: [74, 44],
      handB: [92, 48],
      kneeA: [86, 66],
      footA: [104, 74],
      kneeB: [88, 68],
      footB: [106, 76],
      implement: true,
    }),
    end: pose(STAND, {
      head: [54, 22],
      neck: [56, 32],
      hip: [56, 62],
      elbowA: [70, 40],
      handA: [66, 52],
      elbowB: [70, 38],
      handB: [66, 50],
      kneeA: [86, 66],
      footA: [104, 74],
      kneeB: [88, 68],
      footB: [106, 76],
      implement: true,
    }),
  },
  // Arms out to the sides, to shoulder height.
  'lateral-raise': {
    prop: 'floor',
    arrow: 'out',
    start: STAND,
    end: pose(STAND, {
      elbowA: [42, 30],
      handA: [28, 28],
      elbowB: [78, 30],
      handB: [92, 28],
    }),
  },
  // Rope pulled towards the face, elbows high.
  'face-pull': {
    prop: 'floor',
    arrow: 'in',
    start: pose(STAND, {
      elbowA: [44, 26],
      handA: [26, 22],
      elbowB: [76, 26],
      handB: [94, 22],
      implement: true,
    }),
    end: pose(STAND, {
      elbowA: [38, 24],
      handA: [50, 18],
      elbowB: [82, 24],
      handB: [70, 18],
      implement: true,
    }),
  },
  // Elbows pinned, hands to shoulders.
  curl: {
    prop: 'floor',
    arrow: 'up',
    start: pose(STAND, { implement: true }),
    end: pose(STAND, {
      elbowA: [51, 40],
      handA: [55, 26],
      elbowB: [69, 40],
      handB: [65, 26],
      implement: true,
    }),
  },
  // Elbows pinned, hands driving down.
  pushdown: {
    prop: 'floor',
    arrow: 'down',
    start: pose(STAND, {
      elbowA: [52, 40],
      handA: [56, 28],
      elbowB: [68, 40],
      handB: [64, 28],
      implement: true,
    }),
    end: pose(STAND, {
      elbowA: [52, 40],
      handA: [56, 54],
      elbowB: [68, 40],
      handB: [64, 54],
      implement: true,
    }),
  },
  // Weight behind the head, pressed overhead.
  'overhead-extension': {
    prop: 'floor',
    arrow: 'up',
    start: pose(STAND, {
      elbowA: [54, 16],
      handA: [62, 26],
      elbowB: [66, 16],
      handB: [58, 26],
      implement: true,
    }),
    end: pose(STAND, {
      elbowA: [56, 12],
      handA: [58, 2],
      elbowB: [64, 12],
      handB: [62, 2],
      implement: true,
    }),
  },
  squat: {
    prop: 'floor',
    arrow: 'down',
    start: pose(STAND, {
      elbowA: [46, 38],
      handA: [56, 33],
      elbowB: [74, 38],
      handB: [64, 33],
      implement: true,
    }),
    end: {
      head: [60, 34],
      neck: [60, 44],
      hip: [60, 70],
      elbowA: [44, 56],
      handA: [56, 51],
      elbowB: [76, 56],
      handB: [64, 51],
      kneeA: [42, 78],
      footA: [50, 92],
      kneeB: [78, 78],
      footB: [70, 92],
      implement: true,
    },
  },
  // Hips back, weights down the legs, knees softly bent.
  hinge: {
    prop: 'floor',
    arrow: 'down',
    start: pose(STAND, { implement: true }),
    end: {
      head: [40, 32],
      neck: [48, 38],
      hip: [72, 52],
      elbowA: [50, 52],
      handA: [50, 68],
      elbowB: [52, 52],
      handB: [52, 68],
      kneeA: [70, 72],
      footA: [68, 92],
      kneeB: [76, 72],
      footB: [74, 92],
      implement: true,
    },
  },
  lunge: {
    prop: 'floor',
    arrow: 'forward',
    start: pose(STAND, { implement: true }),
    end: {
      head: [56, 22],
      neck: [56, 32],
      hip: [56, 60],
      elbowA: [48, 44],
      handA: [46, 58],
      elbowB: [64, 44],
      handB: [66, 58],
      kneeA: [82, 68],
      footA: [84, 92],
      kneeB: [38, 82],
      footB: [30, 92],
      implement: true,
    },
  },
  // Lying face down, heels curling towards the hips.
  'leg-curl': {
    prop: 'bench',
    arrow: 'in',
    start: {
      head: [26, 50],
      neck: [36, 52],
      hip: [70, 56],
      elbowA: [40, 62],
      handA: [30, 64],
      elbowB: [40, 60],
      handB: [30, 62],
      kneeA: [94, 58],
      footA: [112, 60],
      kneeB: [94, 56],
      footB: [112, 58],
    },
    end: {
      head: [26, 50],
      neck: [36, 52],
      hip: [70, 56],
      elbowA: [40, 62],
      handA: [30, 64],
      elbowB: [40, 60],
      handB: [30, 62],
      kneeA: [94, 58],
      footA: [96, 34],
      kneeB: [94, 56],
      footB: [98, 32],
    },
  },
  'calf-raise': {
    prop: 'floor',
    arrow: 'up',
    start: STAND,
    end: pose(STAND, {
      head: [60, 10],
      neck: [60, 20],
      hip: [60, 50],
      elbowA: [51, 34],
      handA: [49, 47],
      elbowB: [69, 34],
      handB: [71, 47],
      kneeA: [55, 68],
      footA: [53, 86],
      kneeB: [65, 68],
      footB: [67, 86],
    }),
  },
  // Forearms down, body in one line.
  plank: {
    prop: 'floor',
    arrow: 'in',
    start: {
      head: [26, 56],
      neck: [38, 58],
      hip: [74, 66],
      elbowA: [38, 78],
      handA: [24, 84],
      elbowB: [38, 78],
      handB: [24, 84],
      kneeA: [94, 76],
      footA: [110, 88],
      kneeB: [96, 78],
      footB: [112, 90],
    },
    end: {
      head: [26, 52],
      neck: [38, 56],
      hip: [74, 62],
      elbowA: [38, 78],
      handA: [24, 84],
      elbowB: [38, 78],
      handB: [24, 84],
      kneeA: [94, 72],
      footA: [110, 86],
      kneeB: [96, 74],
      footB: [112, 88],
    },
  },
  // Half-kneeling, hips easing forward.
  'kneeling-stretch': {
    prop: 'floor',
    arrow: 'forward',
    start: {
      head: [52, 26],
      neck: [52, 36],
      hip: [52, 62],
      elbowA: [44, 48],
      handA: [44, 60],
      elbowB: [60, 48],
      handB: [60, 60],
      kneeA: [80, 70],
      footA: [86, 92],
      kneeB: [46, 84],
      footB: [30, 90],
    },
    end: {
      head: [60, 24],
      neck: [60, 34],
      hip: [60, 62],
      elbowA: [52, 46],
      handA: [52, 58],
      elbowB: [68, 46],
      handB: [68, 58],
      kneeA: [86, 70],
      footA: [88, 92],
      kneeB: [50, 86],
      footB: [32, 92],
    },
  },
  // Seated 90/90, knees switching side to side.
  'seated-twist': {
    prop: 'floor',
    arrow: 'out',
    start: {
      head: [56, 30],
      neck: [56, 40],
      hip: [56, 66],
      elbowA: [46, 54],
      handA: [40, 66],
      elbowB: [66, 54],
      handB: [72, 66],
      kneeA: [30, 74],
      footA: [22, 88],
      kneeB: [82, 72],
      footB: [96, 84],
    },
    end: {
      head: [64, 30],
      neck: [64, 40],
      hip: [64, 66],
      elbowA: [54, 54],
      handA: [48, 66],
      elbowB: [74, 54],
      handB: [80, 66],
      kneeA: [90, 74],
      footA: [98, 88],
      kneeB: [38, 72],
      footB: [24, 84],
    },
  },
  // On hands and knees, spine rounding then dropping.
  quadruped: {
    prop: 'floor',
    arrow: 'up',
    start: {
      head: [28, 50],
      neck: [40, 52],
      hip: [80, 52],
      elbowA: [40, 68],
      handA: [40, 86],
      elbowB: [42, 68],
      handB: [42, 86],
      kneeA: [80, 70],
      footA: [90, 86],
      kneeB: [82, 70],
      footB: [92, 86],
    },
    end: {
      head: [28, 58],
      neck: [40, 44],
      hip: [80, 44],
      elbowA: [40, 64],
      handA: [40, 86],
      elbowB: [42, 64],
      handB: [42, 86],
      kneeA: [80, 66],
      footA: [90, 86],
      kneeB: [82, 66],
      footB: [92, 86],
    },
  },
  // Side lying, top arm sweeping open.
  'side-lying': {
    prop: 'floor',
    arrow: 'out',
    start: {
      head: [30, 56],
      neck: [42, 58],
      hip: [76, 62],
      elbowA: [58, 62],
      handA: [74, 62],
      elbowB: [58, 60],
      handB: [74, 60],
      kneeA: [76, 80],
      footA: [96, 84],
      kneeB: [78, 82],
      footB: [98, 86],
    },
    end: {
      head: [30, 56],
      neck: [42, 58],
      hip: [76, 62],
      elbowA: [48, 44],
      handA: [40, 26],
      elbowB: [58, 60],
      handB: [74, 60],
      kneeA: [76, 80],
      footA: [96, 84],
      kneeB: [78, 82],
      footB: [98, 86],
    },
  },
  // Back to a wall, arms sliding overhead.
  wall: {
    prop: 'wall',
    arrow: 'up',
    start: pose(STAND, {
      head: [62, 16],
      neck: [62, 26],
      hip: [62, 56],
      elbowA: [48, 34],
      handA: [50, 20],
      elbowB: [76, 34],
      handB: [74, 20],
    }),
    end: pose(STAND, {
      head: [62, 16],
      neck: [62, 26],
      hip: [62, 56],
      elbowA: [50, 20],
      handA: [54, 4],
      elbowB: [74, 20],
      handB: [70, 4],
    }),
  },
  // Forearm on a frame, chest turning away.
  doorway: {
    prop: 'frame',
    arrow: 'forward',
    start: pose(STAND, {
      head: [56, 16],
      neck: [56, 26],
      hip: [56, 56],
      elbowA: [40, 30],
      handA: [38, 14],
      elbowB: [64, 40],
      handB: [66, 53],
    }),
    end: pose(STAND, {
      head: [66, 16],
      neck: [66, 26],
      hip: [64, 56],
      elbowA: [42, 30],
      handA: [38, 14],
      elbowB: [74, 40],
      handB: [76, 53],
    }),
  },
  walk: {
    prop: 'floor',
    arrow: 'forward',
    start: pose(STAND, {
      elbowA: [50, 40],
      handA: [44, 50],
      elbowB: [70, 40],
      handB: [76, 50],
      kneeA: [50, 74],
      footA: [44, 92],
      kneeB: [68, 74],
      footB: [74, 92],
    }),
    end: pose(STAND, {
      elbowA: [70, 40],
      handA: [76, 50],
      elbowB: [50, 40],
      handB: [44, 50],
      kneeA: [68, 74],
      footA: [74, 92],
      kneeB: [50, 74],
      footB: [44, 92],
    }),
  },
  run: {
    prop: 'floor',
    arrow: 'forward',
    start: {
      head: [58, 16],
      neck: [58, 26],
      hip: [56, 54],
      elbowA: [44, 36],
      handA: [40, 24],
      elbowB: [70, 38],
      handB: [76, 50],
      kneeA: [40, 66],
      footA: [30, 78],
      kneeB: [70, 70],
      footB: [78, 88],
    },
    end: {
      head: [62, 14],
      neck: [62, 24],
      hip: [58, 52],
      elbowA: [74, 34],
      handA: [80, 22],
      elbowB: [48, 38],
      handB: [42, 50],
      kneeA: [76, 64],
      footA: [86, 76],
      kneeB: [46, 70],
      footB: [38, 88],
    },
  },
};

function Figure({
  p,
  colour,
  width,
  faint,
}: {
  p: Pose;
  colour: string;
  width: number;
  faint?: boolean;
}) {
  const limb = (a: [number, number], b: [number, number], key: string) => (
    <Line
      key={key}
      x1={a[0]}
      y1={a[1]}
      x2={b[0]}
      y2={b[1]}
      stroke={colour}
      strokeWidth={width}
      strokeLinecap="round"
    />
  );
  return (
    <G opacity={faint ? 0.42 : 1}>
      <Circle cx={p.head[0]} cy={p.head[1]} r={7} stroke={colour} strokeWidth={width} fill="none" />
      {limb(p.neck, p.hip, 'spine')}
      {limb(p.neck, p.elbowB, 'armB1')}
      {limb(p.elbowB, p.handB, 'armB2')}
      {limb(p.hip, p.kneeB, 'legB1')}
      {limb(p.kneeB, p.footB, 'legB2')}
      {limb(p.neck, p.elbowA, 'armA1')}
      {limb(p.elbowA, p.handA, 'armA2')}
      {limb(p.hip, p.kneeA, 'legA1')}
      {limb(p.kneeA, p.footA, 'legA2')}
      {p.implement ? limb(p.handA, p.handB, 'implement') : null}
    </G>
  );
}

function Prop({ kind, colour }: { kind: Diagram['prop']; colour: string }) {
  if (kind === 'bench') {
    return (
      <>
        <Line x1={20} y1={70} x2={100} y2={70} stroke={colour} strokeWidth={2} strokeLinecap="round" />
        <Line x1={30} y1={70} x2={30} y2={92} stroke={colour} strokeWidth={2} strokeLinecap="round" />
        <Line x1={90} y1={70} x2={90} y2={92} stroke={colour} strokeWidth={2} strokeLinecap="round" />
      </>
    );
  }
  if (kind === 'wall') {
    return <Line x1={84} y1={4} x2={84} y2={96} stroke={colour} strokeWidth={2} strokeLinecap="round" />;
  }
  if (kind === 'frame') {
    return <Line x1={32} y1={4} x2={32} y2={96} stroke={colour} strokeWidth={2} strokeLinecap="round" />;
  }
  return <Line x1={12} y1={95} x2={108} y2={95} stroke={colour} strokeWidth={2} strokeLinecap="round" />;
}

/** Ease-in-out, so the figure slows at both ends of the range like a real rep. */
function ease(x: number): number {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function lerpPoint(a: [number, number], b: [number, number], t: number): [number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
}

/** The pose partway between start and end. */
function between(a: Pose, b: Pose, t: number): Pose {
  return {
    head: lerpPoint(a.head, b.head, t),
    neck: lerpPoint(a.neck, b.neck, t),
    hip: lerpPoint(a.hip, b.hip, t),
    elbowA: lerpPoint(a.elbowA, b.elbowA, t),
    handA: lerpPoint(a.handA, b.handA, t),
    elbowB: lerpPoint(a.elbowB, b.elbowB, t),
    handB: lerpPoint(a.handB, b.handB, t),
    kneeA: lerpPoint(a.kneeA, b.kneeA, t),
    footA: lerpPoint(a.footA, b.footA, t),
    kneeB: lerpPoint(a.kneeB, b.kneeB, t),
    footB: lerpPoint(a.footB, b.footB, t),
    implement: a.implement || b.implement,
  };
}

/**
 * A 0→1→0 loop, driven frame by frame.
 *
 * Deliberately NOT Reanimated. `useAnimatedProps` on react-native-svg
 * primitives did not reach the native view here — the panel rendered a single
 * static pose and the surface never redrew, which a screen recording of the
 * page proved (five seconds, two frames). Interpolating the pose in JS and
 * re-rendering ordinary SVG props is a little more work per frame for one
 * small drawing, and it actually moves.
 *
 * Updates are throttled: the eye cannot see a joint shift by a fifth of a
 * coordinate unit, and every skipped update is a render saved.
 */
function useLoop(durationMs: number, enabled: boolean): number {
  const [t, setT] = useState(0);

  useEffect(() => {
    if (!enabled) {
      // Reduced motion settles on the end position — the one being worked
      // towards — rather than freezing halfway through a rep.
      setT(1);
      return;
    }
    let raf = 0;
    let started: number | null = null;
    let last = -1;

    const frame = (now: number) => {
      if (started === null) started = now;
      const cycle = ((now - started) % (durationMs * 2)) / durationMs;
      const linear = cycle <= 1 ? cycle : 2 - cycle;
      const next = ease(linear);
      if (Math.abs(next - last) > 0.012) {
        last = next;
        setT(next);
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [durationMs, enabled]);

  return t;
}

/**
 * The looping demonstration: one figure travelling between the two poses.
 *
 * The start position stays behind it as a faint outline, so the range of the
 * movement is readable even at the instant the figure is at the far end of it.
 */
function AnimatedDiagram({
  diagram,
  size,
  colour,
  muted,
}: {
  diagram: Diagram;
  size: number;
  colour: string;
  muted: string;
}) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => !cancelled && setReduceMotion(on))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  // Paced like a rep rather than a UI transition. This is the one animation in
  // the app that is instructional, not decorative.
  const t = useLoop(1500, !reduceMotion);
  const current = between(diagram.start, diagram.end, t);

  return (
    <Svg width={size} height={(size * 100) / 120} viewBox="0 0 120 100" fill="none">
      <Prop kind={diagram.prop} colour={muted} />
      <Figure p={diagram.start} colour={muted} width={3} faint />
      <Figure p={current} colour={colour} width={3} />
    </Svg>
  );
}

/**
 * One movement, start to end.
 *
 * `animated` loops between the two poses — use it wherever someone is deciding
 * what to do or doing it. Without it the poses are drawn side by side with a
 * direction arrow, which is what a thumbnail needs.
 *
 * `size` is the rendered width; the height follows the viewBox ratio.
 */
export function MovementFigure({
  pattern,
  size,
  colour,
  muted,
  animated,
}: {
  pattern: MovementPattern;
  size: number;
  /** Ink for the live figure and the arrow. */
  colour: string;
  /** Ink for the ground, bench and the held start pose. */
  muted: string;
  animated?: boolean;
}) {
  const diagram = DIAGRAMS[pattern];

  if (animated) {
    return <AnimatedDiagram diagram={diagram} size={size} colour={colour} muted={muted} />;
  }

  const stroke = 3;
  const arrowPath =
    diagram.arrow === 'up'
      ? 'M130 62 L130 40 M124 46 L130 40 L136 46'
      : diagram.arrow === 'down'
        ? 'M130 40 L130 62 M124 56 L130 62 L136 56'
        : diagram.arrow === 'out'
          ? 'M120 51 L112 51 M140 51 L148 51 M116 47 L112 51 L116 55 M144 47 L148 51 L144 55'
          : diagram.arrow === 'in'
            ? 'M112 51 L122 51 M148 51 L138 51 M118 47 L122 51 L118 55 M142 47 L138 51 L142 55'
            : 'M118 51 L142 51 M136 45 L142 51 L136 57';

  return (
    <Svg width={size} height={(size * 100) / 260} viewBox="0 0 260 100" fill="none">
      <G>
        <Prop kind={diagram.prop} colour={muted} />
        <Figure p={diagram.start} colour={muted} width={stroke} faint />
      </G>

      <Path
        d={arrowPath}
        stroke={colour}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      <G x={140}>
        <Prop kind={diagram.prop} colour={muted} />
        <Figure p={diagram.end} colour={colour} width={stroke} />
      </G>
    </Svg>
  );
}
