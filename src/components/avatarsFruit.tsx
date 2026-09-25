/**
 * The fruity avatars — bold, flat characters on a saturated circle.
 *
 * Original drawings in the "kawaii fruit badge" style: one strong background,
 * flat fills with a single highlight, big glossy eyes, blush, and a prop that
 * gives each one a personality (sunglasses, a crown, a plaster). Fruit people
 * in Ghana actually buy — mango, pineapple, coconut, cocoa — plus a capsule,
 * because this is a pharmacy.
 *
 * Nothing suggestive: the style's usual peach-and-aubergine jokes are left out
 * on purpose.
 *
 * Artwork, like BrandMarks: fixed colours, not theme tokens. Each is drawn on
 * a 100×100 box; `Avatar` clips it to a circle.
 */
import React from 'react';
import { Circle, Defs, ClipPath, Ellipse, G, Path, Rect } from 'react-native-svg';
import { defineStrings, translate } from '@/i18n';

const S = defineStrings({
  en: {
    mango: 'Cool mango in sunglasses',
    pineapple: 'Happy pineapple',
    orange: 'Orange with heart eyes',
    watermelon: 'Watermelon king',
    avocado: 'Sleepy avocado',
    coconut: 'Coconut with a straw',
    strawberry: 'Winking strawberry',
    lemon: 'Sour lemon',
    grapes: 'Bunch of grapes',
    cocoa: 'Cocoa pod',
    apple: 'Green apple with a plaster',
    capsule: 'Smiling capsule',
  },
  fr: {
    mango: 'Mangue cool avec des lunettes de soleil',
    pineapple: 'Ananas joyeux',
    orange: 'Orange aux yeux en cœur',
    watermelon: 'Pastèque royale',
    avocado: 'Avocat endormi',
    coconut: 'Noix de coco avec une paille',
    strawberry: "Fraise qui fait un clin d'œil",
    lemon: 'Citron acide',
    grapes: 'Grappe de raisin',
    cocoa: 'Cabosse de cacao',
    apple: 'Pomme verte avec un pansement',
    capsule: 'Gélule souriante',
  },
  tw: {
    mango: 'Mango a ɔhyɛ owia ahwehwɛniwa',
    pineapple: "Aborɔbɛ a n'ani agye",
    orange: "Ankaa a n'aniwa yɛ akoma",
    watermelon: 'Ɛfrɛ hene',
    avocado: 'Paya a nna reko no',
    coconut: 'Kube a straw wɔ mu',
    strawberry: "Strawberry a ɔbɔ n'ani",
    lemon: 'Ankaatwadeɛ a ɛyɛ nkan',
    grapes: 'Bobe kuo',
    cocoa: 'Kookoo aba',
    apple: 'Aprɛ ahabammono a plaster wɔ ho',
    capsule: 'Aduro kapsul a ɔserew',
  },
  gaa: {
    mango: 'Mango ni wo hulu ahwehwɛ',
    pineapple: 'Blɔfo ŋmɛŋmɛ ni miishɛɛ',
    orange: 'Akutu ni ehiŋmɛi tamɔ tsui',
    watermelon: 'Watermelon maŋtsɛ',
    avocado: 'Pia ni wɔ miiŋɔ lɛ',
    coconut: 'Kube ni straw yɛ mli',
    strawberry: 'Strawberry ni miiŋmɛ ehiŋmɛi',
    lemon: 'Lemon ni ŋmɛŋ',
    grapes: 'Grapes ni abua naa',
    cocoa: 'Kookoo yibii',
    apple: 'Apple ni ŋmɔtoo ni plaster yɛ nɔ',
    capsule: 'Tsofa kapsul ni miishɛ',
  },
  ee: {
    mango: 'Mango si do ŋkuɖɔ',
    pineapple: 'Blefoŋeti si kpɔ dzidzɔ',
    orange: 'Aŋɔ si ƒe ŋku le abe dzi ene',
    watermelon: 'Ʋatromɛlon fia',
    avocado: 'Avoka si le alɔ̃ dɔm',
    coconut: 'Ne si me straw le',
    strawberry: 'Strawberry si le ŋku ƒom',
    lemon: 'Lemon si le vevem',
    grapes: 'Grapes ƒe ha',
    cocoa: 'Kokoa ƒe ku',
    apple: 'Apple gbemɔ si ŋu plaster le',
    capsule: 'Kapsul si le alɔgbɔnu kom',
  },
  ha: {
    mango: 'Mangwaro mai tabarau',
    pineapple: 'Abarba mai farin ciki',
    orange: 'Lemu mai idanu kamar zuciya',
    watermelon: 'Sarkin kankana',
    avocado: 'Avocado mai barci',
    coconut: 'Kwakwa da bututu',
    strawberry: 'Strawberry mai kashe ido',
    lemon: 'Lemun tsami',
    grapes: 'Tarin inabi',
    cocoa: 'Kwafon koko',
    apple: 'Tuffa kore mai filasta',
    capsule: 'Kwayar magani mai murmushi',
  },
});

export type FruitPreset =
  | 'mango'
  | 'pineapple'
  | 'orange'
  | 'watermelon'
  | 'avocado'
  | 'coconut'
  | 'strawberry'
  | 'lemon'
  | 'grapes'
  | 'cocoa'
  | 'apple'
  | 'capsule';

// `label` is a getter so it reads in the current language wherever it is used.
const fruit = (id: FruitPreset) => ({
  id,
  get label() {
    return translate(S, id);
  },
});

export const FRUIT_PRESETS: { id: FruitPreset; label: string }[] = [
  fruit('mango'),
  fruit('pineapple'),
  fruit('orange'),
  fruit('watermelon'),
  fruit('avocado'),
  fruit('coconut'),
  fruit('strawberry'),
  fruit('lemon'),
  fruit('grapes'),
  fruit('cocoa'),
  fruit('apple'),
  fruit('capsule'),
];

// --- Palette -------------------------------------------------------------------

const BG = {
  indigo: '#5B5BD6',
  sun: '#FFB020',
  coral: '#F0504F',
  teal: '#12BFCB',
  pink: '#F45D78',
  purple: '#7B3FB0',
};
const INK = '#1D1A2F';
const WHITE = '#FFFFFF';
const BLUSH = '#FF7A8A';
const LEAF = '#3FAE49';
const STEM = '#6B3E1E';

// --- Face kit ------------------------------------------------------------------

/** Big glossy eyes: white, dark pupil looking slightly down, a glint. */
function BigEyes({ cx = 50, cy, gap = 11, r = 6.6 }: { cx?: number; cy: number; gap?: number; r?: number }) {
  return (
    <G>
      {[cx - gap, cx + gap].map((x) => (
        <G key={x}>
          <Circle cx={x} cy={cy} r={r} fill={WHITE} />
          <Circle cx={x + r * 0.12} cy={cy + r * 0.12} r={r * 0.58} fill={INK} />
          <Circle cx={x + r * 0.35} cy={cy - r * 0.2} r={r * 0.2} fill={WHITE} />
        </G>
      ))}
    </G>
  );
}

/** Small dark eyes with a glint. */
function DotEyes({ cx = 50, cy, gap = 9 }: { cx?: number; cy: number; gap?: number }) {
  return (
    <G>
      {[cx - gap, cx + gap].map((x) => (
        <G key={x}>
          <Circle cx={x} cy={cy} r={3.6} fill={INK} />
          <Circle cx={x + 1.2} cy={cy - 1.2} r={1.2} fill={WHITE} />
        </G>
      ))}
    </G>
  );
}

/** Content, closed eyes: two little upward arcs. */
function HappyEyes({ cx = 50, cy, gap = 9 }: { cx?: number; cy: number; gap?: number }) {
  return (
    <G stroke={INK} strokeWidth={3} strokeLinecap="round" fill="none">
      <Path d={`M${cx - gap - 3.5} ${cy + 1} Q${cx - gap} ${cy - 3} ${cx - gap + 3.5} ${cy + 1}`} />
      <Path d={`M${cx + gap - 3.5} ${cy + 1} Q${cx + gap} ${cy - 3} ${cx + gap + 3.5} ${cy + 1}`} />
    </G>
  );
}

function Smile({ cx = 50, cy, w = 8 }: { cx?: number; cy: number; w?: number }) {
  return (
    <Path
      d={`M${cx - w / 2} ${cy} Q${cx} ${cy + w * 0.6} ${cx + w / 2} ${cy}`}
      stroke={INK}
      strokeWidth={3}
      strokeLinecap="round"
      fill="none"
    />
  );
}

/** A big open grin with a tongue. */
function Grin({ cx = 50, cy, w = 11 }: { cx?: number; cy: number; w?: number }) {
  const h = w * 0.7;
  return (
    <G>
      <Path
        d={`M${cx - w / 2} ${cy} L${cx + w / 2} ${cy} Q${cx + w / 2} ${cy + h} ${cx} ${cy + h} Q${cx - w / 2} ${cy + h} ${cx - w / 2} ${cy} Z`}
        fill={INK}
      />
      <Ellipse cx={cx} cy={cy + h * 0.72} rx={w * 0.26} ry={h * 0.26} fill={BLUSH} />
    </G>
  );
}

function Blush({ cx = 50, cy, gap = 15 }: { cx?: number; cy: number; gap?: number }) {
  return (
    <G fill={BLUSH} opacity={0.75}>
      <Ellipse cx={cx - gap} cy={cy} rx={3.6} ry={2.3} />
      <Ellipse cx={cx + gap} cy={cy} rx={3.6} ry={2.3} />
    </G>
  );
}

/** A four-point sparkle. */
function Sparkle({ x, y, r = 4, fill = WHITE }: { x: number; y: number; r?: number; fill?: string }) {
  return (
    <Path
      d={`M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z`}
      fill={fill}
    />
  );
}

function Leaf({ d }: { d: string }) {
  return <Path d={d} fill={LEAF} />;
}

// --- The set -------------------------------------------------------------------

function Mango() {
  return (
    <G>
      <Rect width={100} height={100} fill={BG.indigo} />
      <Rect x={48.5} y={15} width={3} height={9} rx={1.5} fill={STEM} />
      <Leaf d="M51 20 C58 10 71 11 75 15 C67 22 58 24 51 20 Z" />
      <Path
        d="M50 22 C68 22 80 38 78 58 C76 76 62 85 48 83 C32 81 22 67 24 50 C26 34 36 22 50 22 Z"
        fill="#FFB21E"
      />
      <Path d="M50 22 C68 22 80 38 78 58 C74 50 66 30 50 22 Z" fill="#FF8F1E" opacity={0.6} />
      <Ellipse cx={37} cy={40} rx={4} ry={8} fill={WHITE} opacity={0.35} transform="rotate(25 37 40)" />
      {/* Sunglasses */}
      <G fill={INK}>
        <Rect x={31} y={45} width={16} height={10} rx={4} />
        <Rect x={53} y={45} width={16} height={10} rx={4} />
        <Rect x={46} y={47} width={8} height={2.4} rx={1.2} />
        <Rect x={25} y={46.5} width={7} height={2.2} rx={1.1} />
        <Rect x={68} y={46.5} width={7} height={2.2} rx={1.1} />
      </G>
      <Path d="M34 48 L38 48" stroke={WHITE} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M56 48 L60 48" stroke={WHITE} strokeWidth={1.6} strokeLinecap="round" />
      <Smile cy={65} w={12} />
    </G>
  );
}

function Pineapple() {
  return (
    <G>
      <Rect width={100} height={100} fill={BG.teal} />
      <Leaf d="M50 34 L40 12 L49 24 L50 6 L54 24 L63 12 L58 34 Z" />
      <Path d="M44 34 L30 20 L46 28 Z M56 34 L70 20 L54 28 Z" fill="#2E8B3A" />
      <Defs>
        <ClipPath id="pineapple-body">
          <Rect x={27} y={30} width={46} height={58} rx={22} />
        </ClipPath>
      </Defs>
      <Rect x={27} y={30} width={46} height={58} rx={22} fill="#FFC425" />
      <G clipPath="url(#pineapple-body)" stroke="#E8960F" strokeWidth={1.8} opacity={0.7}>
        {[-20, -6, 8, 22, 36].map((o) => (
          <Path key={`a${o}`} d={`M${20 + o} 30 L${56 + o} 92`} />
        ))}
        {[-20, -6, 8, 22, 36].map((o) => (
          <Path key={`b${o}`} d={`M${80 - o} 30 L${44 - o} 92`} />
        ))}
      </G>
      <Ellipse cx={37} cy={44} rx={3.5} ry={7} fill={WHITE} opacity={0.35} />
      <BigEyes cy={56} gap={11} r={6.3} />
      <Blush cy={65} gap={14} />
      <Smile cy={68} w={10} />
    </G>
  );
}

function Heart({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <Path
      d={`M${x} ${y + 5 * s} C${x - 9 * s} ${y - 1 * s} ${x - 6 * s} ${y - 8 * s} ${x} ${y - 3.5 * s} C${x + 6 * s} ${y - 8 * s} ${x + 9 * s} ${y - 1 * s} ${x} ${y + 5 * s} Z`}
      fill="#FF2E57"
      stroke={WHITE}
      strokeWidth={2}
    />
  );
}

function Orange() {
  return (
    <G>
      <Rect width={100} height={100} fill={BG.pink} />
      <Circle cx={50} cy={56} r={28} fill="#FF8A1F" />
      <Path d="M50 28 A28 28 0 0 1 78 56 C72 44 62 34 50 28 Z" fill="#FFA24A" opacity={0.7} />
      <G fill="#E86F0A">
        <Circle cx={34} cy={66} r={1.2} />
        <Circle cx={66} cy={70} r={1.2} />
        <Circle cx={60} cy={40} r={1.2} />
        <Circle cx={40} cy={42} r={1.2} />
      </G>
      <Rect x={48.5} y={23} width={3} height={8} rx={1.5} fill={STEM} />
      <Leaf d="M51 27 C57 17 69 17 73 21 C66 28 57 30 51 27 Z" />
      <Heart x={40} y={52} s={1.1} />
      <Heart x={60} y={52} s={1.1} />
      <Ellipse cx={50} cy={68} rx={3.4} ry={4.2} fill={INK} />
      {/* "Wow" marks */}
      <G stroke={WHITE} strokeWidth={2.4} strokeLinecap="round">
        <Path d="M20 30 L25 34" />
        <Path d="M26 22 L29 28" />
        <Path d="M16 40 L22 41" />
      </G>
    </G>
  );
}

function Watermelon() {
  return (
    <G>
      <Rect width={100} height={100} fill={BG.purple} />
      <Path d="M36 42 L36 29 L43 35 L50 26 L57 35 L64 29 L64 42 Z" fill="#FFC425" />
      <Circle cx={50} cy={27} r={1.8} fill="#FFC425" />
      <Path d="M17 44 A33 33 0 0 0 83 44 Z" fill="#F2545B" />
      <Path d="M17 44 A33 33 0 0 0 83 44" stroke="#3FAE49" strokeWidth={6} fill="none" />
      <Path d="M21 45 A29 29 0 0 0 79 45" stroke="#B6E27A" strokeWidth={2} fill="none" />
      <G fill={INK}>
        <Ellipse cx={33} cy={60} rx={1.4} ry={2.2} transform="rotate(-20 33 60)" />
        <Ellipse cx={67} cy={60} rx={1.4} ry={2.2} transform="rotate(20 67 60)" />
        <Ellipse cx={42} cy={70} rx={1.4} ry={2.2} />
        <Ellipse cx={58} cy={70} rx={1.4} ry={2.2} />
      </G>
      <BigEyes cy={52} gap={11} r={6.6} />
      <Ellipse cx={50} cy={63} rx={2.8} ry={3.6} fill={INK} />
    </G>
  );
}

function Avocado() {
  return (
    <G>
      <Rect width={100} height={100} fill={BG.sun} />
      <Path
        d="M50 14 C61 14 67 25 69 37 C75 47 79 58 77 68 C75 82 63 89 50 89 C37 89 25 82 23 68 C21 58 25 47 31 37 C33 25 39 14 50 14 Z"
        fill="#2F7D32"
      />
      <Path
        d="M50 20 C58 20 62 29 64 40 C70 50 73 59 72 68 C70 79 61 84 50 84 C39 84 30 79 28 68 C27 59 30 50 36 40 C38 29 42 20 50 20 Z"
        fill="#C6E57A"
      />
      <Circle cx={50} cy={67} r={11} fill="#9C5B2E" />
      <Ellipse cx={46} cy={63} rx={3} ry={2} fill={WHITE} opacity={0.35} />
      <HappyEyes cy={45} gap={9} />
      <Blush cy={50} gap={13} />
      <Smile cy={51} w={8} />
    </G>
  );
}

function Coconut() {
  return (
    <G>
      <Rect width={100} height={100} fill={BG.coral} />
      {/* Straw */}
      <Path d="M58 42 L70 12" stroke="#FF6FA3" strokeWidth={4.5} strokeLinecap="round" />
      <Path d="M61 34 L63.5 28 M65 24 L67.5 18" stroke={WHITE} strokeWidth={4.5} />
      <Circle cx={50} cy={60} r={27} fill="#8B5A2B" />
      <Path d="M50 33 A27 27 0 0 1 77 60 C72 48 62 38 50 33 Z" fill="#A87040" opacity={0.7} />
      <Ellipse cx={50} cy={40} rx={17} ry={5} fill="#5E3A18" />
      <Ellipse cx={50} cy={40} rx={14} ry={3.4} fill="#FFF4E0" />
      <BigEyes cy={58} gap={11} r={6.3} />
      <Blush cy={67} gap={14} />
      <Smile cy={70} w={10} />
    </G>
  );
}

function Strawberry() {
  return (
    <G>
      <Rect width={100} height={100} fill={BG.sun} />
      <Sparkle x={18} y={30} r={5} />
      <Sparkle x={82} y={24} r={4} />
      <Sparkle x={84} y={72} r={3.5} />
      <Path
        d="M50 88 C35 80 21 63 23 45 C25 34 36 30 50 35 C64 30 75 34 77 45 C79 63 65 80 50 88 Z"
        fill="#F2414E"
      />
      <Ellipse cx={34} cy={48} rx={3} ry={7} fill={WHITE} opacity={0.3} transform="rotate(20 34 48)" />
      <G fill="#FFE08A">
        {[
          [38, 66],
          [50, 74],
          [62, 66],
          [44, 80],
          [56, 80],
          [30, 58],
          [70, 58],
        ].map(([x, y]) => (
          <Ellipse key={`${x}-${y}`} cx={x} cy={y} rx={1.2} ry={1.9} />
        ))}
      </G>
      <Path d="M50 38 L38 28 L45 30 L42 21 L50 28 L58 21 L55 30 L62 28 Z" fill={LEAF} />
      <Rect x={48.5} y={16} width={3} height={8} rx={1.5} fill="#2E8B3A" />
      {/* Wink: one closed, one open */}
      <Path d="M36 53 Q40 50 44 53" stroke={INK} strokeWidth={3} strokeLinecap="round" fill="none" />
      <Circle cx={60} cy={52} r={6.6} fill={WHITE} />
      <Circle cx={60.8} cy={52.8} r={3.8} fill={INK} />
      <Circle cx={62.4} cy={50.8} r={1.3} fill={WHITE} />
      <Blush cy={61} gap={14} />
      <Grin cy={61} w={10} />
    </G>
  );
}

function Lemon() {
  return (
    <G>
      <Rect width={100} height={100} fill={BG.indigo} />
      <Circle cx={22} cy={56} r={5} fill="#FFE14D" />
      <Circle cx={78} cy={56} r={5} fill="#FFE14D" />
      <Ellipse cx={50} cy={56} rx={28} ry={23} fill="#FFE14D" />
      <Ellipse cx={38} cy={45} rx={6} ry={3} fill={WHITE} opacity={0.4} transform="rotate(-20 38 45)" />
      <Leaf d="M58 34 C62 24 74 22 78 26 C72 34 64 36 58 34 Z" />
      {/* Sour squint > < */}
      <G stroke={INK} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <Path d="M36 50 L42 53 L36 56" />
        <Path d="M64 50 L58 53 L64 56" />
        <Path d="M44 66 L47 63.5 L50 66 L53 63.5 L56 66" />
      </G>
      <Blush cy={60} gap={16} />
      {/* Sweat drop */}
      <Path d="M76 36 C76 36 71 43 71 46 A5 5 0 0 0 81 46 C81 43 76 36 76 36 Z" fill="#8FD8FF" />
    </G>
  );
}

function Grapes() {
  const grape = '#8E4DD8';
  const rows: [number, number][] = [
    [38, 40], [50, 38], [62, 40],
    [32, 52], [44, 51], [56, 51], [68, 52],
    [38, 64], [50, 64], [62, 64],
    [44, 76], [56, 76],
  ];
  return (
    <G>
      <Rect width={100} height={100} fill={BG.teal} />
      <Path d="M50 30 L50 20" stroke={STEM} strokeWidth={3} strokeLinecap="round" />
      <Leaf d="M51 24 C57 13 70 13 74 17 C67 25 58 27 51 24 Z" />
      {rows.map(([x, y]) => (
        <G key={`${x}-${y}`}>
          <Circle cx={x} cy={y} r={8} fill={grape} />
          <Circle cx={x - 2.5} cy={y - 2.5} r={2} fill={WHITE} opacity={0.35} />
        </G>
      ))}
      <BigEyes cy={52} gap={10} r={6.1} />
      <Blush cy={60} gap={14} />
      <Smile cy={63} w={9} />
    </G>
  );
}

function Cocoa() {
  return (
    <G>
      <Rect width={100} height={100} fill={BG.purple} />
      <Rect x={48.5} y={8} width={3} height={9} rx={1.5} fill={STEM} />
      <Path
        d="M50 14 C68 18 77 38 75 56 C73 74 63 89 50 89 C37 89 27 74 25 56 C23 38 32 18 50 14 Z"
        fill="#F29B26"
      />
      <G stroke="#D9771A" strokeWidth={2} fill="none" opacity={0.85}>
        <Path d="M40 19 C33 40 33 70 41 87" />
        <Path d="M60 19 C67 40 67 70 59 87" />
      </G>
      <Ellipse cx={37} cy={36} rx={3} ry={7} fill={WHITE} opacity={0.3} transform="rotate(15 37 36)" />
      <HappyEyes cy={48} gap={9} />
      <Blush cy={56} gap={14} />
      <Grin cy={55} w={11} />
    </G>
  );
}

function Apple() {
  return (
    <G>
      <Rect width={100} height={100} fill={BG.coral} />
      <Path d="M50 30 L52 18" stroke={STEM} strokeWidth={3} strokeLinecap="round" />
      <Leaf d="M52 22 C58 12 70 12 74 16 C67 24 58 26 52 22 Z" />
      <Path
        d="M50 30 C58 22 77 24 79 44 C81 64 67 85 53 83 C51 82 49 82 47 83 C33 85 19 64 21 44 C23 24 42 22 50 30 Z"
        fill="#8CD13A"
      />
      <Ellipse cx={34} cy={42} rx={4} ry={8} fill={WHITE} opacity={0.35} transform="rotate(20 34 42)" />
      <BigEyes cy={52} gap={10} r={6.6} />
      <Smile cy={66} w={10} />
      <Ellipse cx={36} cy={63} rx={3.6} ry={2.3} fill={BLUSH} opacity={0.75} />
      {/* A plaster on the cheek */}
      <G transform="rotate(-30 65 64)">
        <Rect x={56} y={60} width={18} height={8} rx={4} fill="#FFD9A8" />
        <Rect x={62} y={60} width={6} height={8} fill="#F5C089" />
        <Circle cx={64} cy={62.5} r={0.6} fill="#D99A5B" />
        <Circle cx={66} cy={65.5} r={0.6} fill="#D99A5B" />
      </G>
    </G>
  );
}

function Capsule() {
  return (
    <G>
      <Rect width={100} height={100} fill={BG.pink} />
      <Sparkle x={20} y={24} r={4.5} />
      <Sparkle x={80} y={78} r={4} />
      <G transform="rotate(-35 50 52)">
        <Rect x={29} y={18} width={42} height={68} rx={21} fill={WHITE} />
        <Path d="M29 52 L29 39 A21 21 0 0 1 71 39 L71 52 Z" fill="#2ED3A1" />
        <Rect x={35} y={28} width={5} height={16} rx={2.5} fill={WHITE} opacity={0.45} />
        <DotEyes cy={62} gap={9} />
        <Blush cy={69} gap={12} />
        <Smile cy={71} w={9} />
      </G>
    </G>
  );
}

export const FRUIT_ART: Record<FruitPreset, () => React.JSX.Element> = {
  mango: Mango,
  pineapple: Pineapple,
  orange: Orange,
  watermelon: Watermelon,
  avocado: Avocado,
  coconut: Coconut,
  strawberry: Strawberry,
  lemon: Lemon,
  grapes: Grapes,
  cocoa: Cocoa,
  apple: Apple,
  capsule: Capsule,
};
