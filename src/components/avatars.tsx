/**
 * Illustrated avatars — what a profile shows until the person uploads a photo.
 *
 * Every account is given one at random when it is created (migration 0010), so
 * nobody starts as a grey circle of initials; they can pick another on Choose
 * Avatar, or replace it with a photo.
 *
 * The set is chosen to look like the people using a Ghanaian pharmacy: a range
 * of deep-to-light skin tones, and hair and headwear people actually wear —
 * a headwrap, an afro, braids, locs, a hijab, a low fade with a beard.
 *
 * Like the brand marks, these are artwork and use palette primitives directly
 * rather than semantic tokens: an illustration's colours do not flip with the
 * theme. Each is drawn on a 100×100 box and clipped to a circle by `Avatar`.
 *
 * The ids are stored in `profiles.avatar_preset`. Renaming one orphans every
 * account that holds it — add new ids, do not rename old ones.
 */
import React from 'react';
import Svg, { Circle, Ellipse, Path, Rect, G } from 'react-native-svg';
import { primitives as p } from '@/theme/tokens';
import { FRUIT_ART, FRUIT_PRESETS, type FruitPreset } from './avatarsFruit';

type PersonPreset = 'wrap' | 'afro' | 'fade' | 'braids' | 'hijab' | 'bun' | 'locs' | 'elder';

export type AvatarPreset = PersonPreset | FruitPreset;

export type AvatarGroup = 'people' | 'fruit';

const PEOPLE: { id: PersonPreset; label: string }[] = [
  { id: 'wrap', label: 'Woman in a patterned headwrap' },
  { id: 'afro', label: 'Person with an afro' },
  { id: 'fade', label: 'Man with a low fade and beard' },
  { id: 'braids', label: 'Woman with braids' },
  { id: 'hijab', label: 'Woman in a hijab' },
  { id: 'bun', label: 'Person with a bun and glasses' },
  { id: 'locs', label: 'Person with locs' },
  { id: 'elder', label: 'Older man with a grey beard' },
];

/** Picker order, the group each sits under, and the screen-reader name. */
export const AVATAR_PRESETS: { id: AvatarPreset; label: string; group: AvatarGroup }[] = [
  ...PEOPLE.map((a) => ({ ...a, group: 'people' as const })),
  ...FRUIT_PRESETS.map((a) => ({ ...a, group: 'fruit' as const })),
];

export function isAvatarPreset(id: string | undefined | null): id is AvatarPreset {
  return AVATAR_PRESETS.some((a) => a.id === id);
}

export function avatarPresetLabel(id: AvatarPreset): string {
  return AVATAR_PRESETS.find((a) => a.id === id)?.label ?? 'Illustrated avatar';
}

// --- Shared parts --------------------------------------------------------------

const INK = '#1B120E';
const SKIN = {
  deep: '#5A3620',
  brown: '#7B4A2B',
  warm: '#8A5533',
  medium: '#A0663F',
  tan: '#C68A5E',
  light: '#E8B892',
} as const;

function Shoulders({ color }: { color: string }) {
  return <Path d="M12 100 C12 80 28 71 50 71 C72 71 88 80 88 100 Z" fill={color} />;
}

function Neck({ skin }: { skin: string }) {
  const d = 'M42 58 L58 58 L58 72 C55 76 45 76 42 72 Z';
  return (
    <G>
      <Path d={d} fill={skin} />
      <Path d={d} fill="#000" opacity={0.14} />
    </G>
  );
}

function Head({ skin, ears = true }: { skin: string; ears?: boolean }) {
  return (
    <G>
      {ears ? (
        <G>
          <Circle cx={33.8} cy={47} r={3.6} fill={skin} />
          <Circle cx={66.2} cy={47} r={3.6} fill={skin} />
        </G>
      ) : null}
      <Ellipse cx={50} cy={45} rx={16.5} ry={18.5} fill={skin} />
    </G>
  );
}

/** Eyes with a glint (so they read on deep skin), cheeks and a smile. */
function Face({ smile = true }: { smile?: boolean }) {
  return (
    <G>
      <Circle cx={41} cy={52.5} r={2.6} fill={p.pink[400]} opacity={0.35} />
      <Circle cx={59} cy={52.5} r={2.6} fill={p.pink[400]} opacity={0.35} />
      <Circle cx={44} cy={47} r={2} fill={INK} />
      <Circle cx={56} cy={47} r={2} fill={INK} />
      <Circle cx={44.7} cy={46.3} r={0.65} fill="#fff" />
      <Circle cx={56.7} cy={46.3} r={0.65} fill="#fff" />
      {smile ? (
        <Path
          d="M45.5 54 Q50 58 54.5 54"
          stroke={INK}
          strokeWidth={1.8}
          strokeLinecap="round"
          fill="none"
        />
      ) : null}
    </G>
  );
}

/** A full beard with the mouth left clear. */
function Beard({ color, skin }: { color: string; skin: string }) {
  return (
    <G>
      <Path
        d="M33.8 46 C34.5 60 41 66.5 50 66.5 C59 66.5 65.5 60 66.2 46 C64 54 58 58.5 50 58.5 C42 58.5 36 54 33.8 46 Z"
        fill={color}
      />
      <Ellipse cx={50} cy={55.4} rx={5.4} ry={2.8} fill={skin} />
      <Path d="M43.5 52.6 Q50 49.6 56.5 52.6 Q50 54.4 43.5 52.6 Z" fill={color} />
      <Path
        d="M46.5 55 Q50 57.4 53.5 55"
        stroke={INK}
        strokeWidth={1.6}
        strokeLinecap="round"
        fill="none"
      />
    </G>
  );
}

/** Close-cropped hair sitting on the head. */
function Crop({ color }: { color: string }) {
  return (
    <Path
      d="M33.5 43 C33 30 40 25.5 50 25.5 C60 25.5 67 30 66.5 43 C64 35 58 31.5 50 31.5 C42 31.5 36 35 33.5 43 Z"
      fill={color}
    />
  );
}

// --- The set -------------------------------------------------------------------

function Wrap() {
  const skin = SKIN.brown;
  return (
    <G>
      <Rect width={100} height={100} fill={p.mint[100]} />
      <Shoulders color={p.teal[700]} />
      <Neck skin={skin} />
      <Head skin={skin} />
      <Face />
      <Circle cx={33.4} cy={53} r={1.9} fill={p.gold[500]} />
      <Circle cx={66.6} cy={53} r={1.9} fill={p.gold[500]} />
      {/* The wrap, then its knot, then the pattern bands across it. */}
      <Path
        d="M31 46 C29 30 37 17 50 17 C63 17 71 30 69 46 C66 38 59 33 50 33 C41 33 34 38 31 46 Z"
        fill={p.gold[500]}
      />
      <Path d="M37 22 C34 7 49 3 55 11 C61 3 74 9 67 22 C60 18 44 18 37 22 Z" fill={p.coral[500]} />
      <Path d="M33.5 38 C40 29.5 60 29.5 66.5 38" stroke={p.coral[500]} strokeWidth={2.4} fill="none" />
      <Path d="M35.5 27.5 C43 21.5 57 21.5 64.5 27.5" stroke={p.teal[700]} strokeWidth={2.4} fill="none" />
    </G>
  );
}

function Afro() {
  const skin = SKIN.warm;
  const hair = INK;
  return (
    <G>
      <Rect width={100} height={100} fill={p.gold[300]} />
      <G fill={hair}>
        <Circle cx={50} cy={37} r={25} />
        <Circle cx={28} cy={32} r={10} />
        <Circle cx={72} cy={32} r={10} />
        <Circle cx={35} cy={17} r={11} />
        <Circle cx={65} cy={17} r={11} />
        <Circle cx={50} cy={12} r={12} />
      </G>
      <Shoulders color={p.blue[600]} />
      <Neck skin={skin} />
      <Head skin={skin} />
      <Face />
      <Path
        d="M33.5 42 C33 31 40 27 50 27 C60 27 67 31 66.5 42 C63 36 57 34 50 34 C43 34 37 36 33.5 42 Z"
        fill={hair}
      />
    </G>
  );
}

function Fade() {
  const skin = SKIN.deep;
  const hair = '#140D0A';
  return (
    <G>
      <Rect width={100} height={100} fill={p.blue[100]} />
      <Shoulders color={p.mint[700]} />
      <Neck skin={skin} />
      <Head skin={skin} />
      <Face smile={false} />
      <Beard color={hair} skin={skin} />
      <Crop color={hair} />
    </G>
  );
}

function Braids() {
  const skin = SKIN.medium;
  const hair = '#2A1A12';
  const braid = (x: number) => (
    <G>
      <Rect x={x} y={34} width={8} height={44} rx={4} fill={hair} />
      {[40, 47, 54, 61, 68].map((y) => (
        <Path
          key={y}
          d={`M${x + 1} ${y} L${x + 7} ${y + 3}`}
          stroke="#4A3226"
          strokeWidth={1.2}
          strokeLinecap="round"
        />
      ))}
      <Circle cx={x + 4} cy={79} r={2.8} fill={p.gold[500]} />
    </G>
  );
  return (
    <G>
      <Rect width={100} height={100} fill={p.pink[300]} />
      <Shoulders color={p.teal[600]} />
      <Neck skin={skin} />
      <Head skin={skin} />
      <Face />
      {braid(27)}
      {braid(65)}
      <Path
        d="M33 44 C32 29 40 24 50 24 C60 24 68 29 67 44 C64 35 58 31 50 31 C42 31 36 35 33 44 Z"
        fill={hair}
      />
      <Path d="M50 24.5 L50 31" stroke="#4A3226" strokeWidth={1.2} strokeLinecap="round" />
    </G>
  );
}

function Hijab() {
  const skin = SKIN.tan;
  const scarf = p.teal[500];
  const fold = p.teal[600];
  return (
    <G>
      <Rect width={100} height={100} fill={p.gold[100]} />
      <Path
        d="M22 100 C22 82 27 73 30 64 C25 40 34 20 50 20 C66 20 75 40 70 64 C73 73 78 82 78 100 Z"
        fill={scarf}
      />
      <Ellipse cx={50} cy={47} rx={14} ry={16} fill={skin} />
      <Ellipse cx={50} cy={47} rx={14.8} ry={16.8} stroke={fold} strokeWidth={1.6} fill="none" />
      <Face />
      <Path d="M33 68 C40 76 60 76 67 68" stroke={fold} strokeWidth={1.6} fill="none" />
      <Path d="M28 84 C38 90 62 90 72 84" stroke={fold} strokeWidth={1.6} fill="none" />
    </G>
  );
}

function Bun() {
  const skin = SKIN.light;
  const hair = '#5A3A22';
  return (
    <G>
      <Rect width={100} height={100} fill={p.cream[500]} />
      <Circle cx={50} cy={21} r={8.5} fill={hair} />
      <Shoulders color={p.pink[600]} />
      <Neck skin={skin} />
      <Head skin={skin} />
      <Face />
      <Path
        d="M33.5 44 C32 30 40 25.5 50 25.5 C60 25.5 68 30 66.5 44 C63 34 56 31 48 32 C42 33 36 37 33.5 44 Z"
        fill={hair}
      />
      <G stroke={INK} strokeWidth={1.4} fill="#fff" fillOpacity={0.18}>
        <Circle cx={44} cy={47} r={4.6} />
        <Circle cx={56} cy={47} r={4.6} />
      </G>
      <Path d="M48.6 47 L51.4 47" stroke={INK} strokeWidth={1.4} />
    </G>
  );
}

function Locs() {
  const skin = SKIN.brown;
  const hair = '#24160F';
  const strand = '#3D2A1E';
  return (
    <G>
      <Rect width={100} height={100} fill={p.mint[200]} />
      <Shoulders color={p.gold[600]} />
      <Neck skin={skin} />
      <Path
        d="M29 44 C27 26 38 19 50 19 C62 19 73 26 71 44 L73 76 C69 79 65 79 62 76 L62 50 L38 50 L38 76 C35 79 31 79 27 76 Z"
        fill={hair}
      />
      <Head skin={skin} ears={false} />
      <Face />
      <Path
        d="M33.5 42 C33 30 40 25 50 25 C60 25 67 30 66.5 42 C62 35 56 32.5 50 32.5 C44 32.5 38 35 33.5 42 Z"
        fill={hair}
      />
      <G stroke={strand} strokeWidth={1.3} strokeLinecap="round">
        <Path d="M31 46 L31 75" />
        <Path d="M35 50 L35 76" />
        <Path d="M65 50 L65 76" />
        <Path d="M69 46 L69 75" />
      </G>
    </G>
  );
}

function Elder() {
  const skin = SKIN.deep;
  const grey = '#D9D4CC';
  return (
    <G>
      <Rect width={100} height={100} fill={p.coral[100]} />
      <Shoulders color={p.blue[800]} />
      <Neck skin={skin} />
      <Head skin={skin} />
      <Ellipse cx={44} cy={32} rx={5.5} ry={2.4} fill="#fff" opacity={0.18} />
      <Face smile={false} />
      <Path d="M33.4 44 C33 38.5 35 35.5 38.5 34.5" stroke={grey} strokeWidth={3} strokeLinecap="round" fill="none" />
      <Path d="M66.6 44 C67 38.5 65 35.5 61.5 34.5" stroke={grey} strokeWidth={3} strokeLinecap="round" fill="none" />
      <Beard color={grey} skin={skin} />
    </G>
  );
}

const ART: Record<AvatarPreset, () => React.JSX.Element> = {
  wrap: Wrap,
  afro: Afro,
  fade: Fade,
  braids: Braids,
  hijab: Hijab,
  bun: Bun,
  locs: Locs,
  elder: Elder,
  ...FRUIT_ART,
};

/** One illustration, filling its box. The caller clips it to a circle. */
export function AvatarArt({ preset }: { preset: AvatarPreset }) {
  const Art = ART[preset];
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100">
      <Art />
    </Svg>
  );
}
