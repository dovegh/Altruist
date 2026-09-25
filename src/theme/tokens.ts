/**
 * Altruist Design System — Design Tokens
 * Generated from the Figma variable collections (v1.0).
 *
 * Source of truth: https://www.figma.com/design/MXZvKkbrOrU54cnfPHJF4O
 * Figma collections: Primitives · Color (Dark/Light) · Spacing · Radius · Sizing · Typography
 *
 * Do not hardcode colour, spacing, or radius values anywhere in the app.
 * Import from here so a Figma token change is a one-file change in code.
 */

// ---------------------------------------------------------------------------
// PRIMITIVES — raw ramps. Never reference these directly in a component.
// ---------------------------------------------------------------------------

export const primitives = {
 teal: {
 1000: '#020F0F', 950: '#041A1A', 900: '#062626', 800: '#093F3F', 700: '#0D5150',
 600: '#126764', 500: '#1A807C', 400: '#3D9E99', 300: '#6FBDB8', 200: '#A5D8D4',
 100: '#D2ECEA', 50: '#EDF7F6',
 },
 mint: {
 950: '#00301F', 900: '#005C41', 800: '#007A56', 700: '#00996C', 600: '#00B882',
 500: '#00DB9A', 400: '#33E3AE', 300: '#66EAC3', 200: '#99F1D7', 100: '#CCF8EB', 50: '#E6FCF5',
 },
 cream: { 700: '#E3DB86', 600: '#F5EFAF', 500: '#FFFAD0', 400: '#FFFCE0', 300: '#FFFDEC', 100: '#FFFEF7' },
 gold: { 900: '#4A3300', 800: '#7A5500', 700: '#C99306', 600: '#E6AC12', 500: '#FFC737', 400: '#FFD670', 300: '#FFE5A3', 100: '#FFF6DC' },
 blue: { 900: '#0D2954', 800: '#133C7D', 700: '#1A4FA8', 600: '#2261C7', 500: '#2B74E5', 400: '#6098ED', 300: '#95BCF4', 100: '#DCE9FC' },
 pink: { 500: '#FFB4CB', 400: '#FFCCDC', 300: '#FFE0EA', 100: '#FFF0F5', 600: '#E895AF', 700: '#B36680', 800: '#7A3E52', 900: '#4A2231', },
 coral: { 900: '#4A0F17', 800: '#801C2A', 700: '#B3283C', 600: '#D93A51', 500: '#FF5B6E', 400: '#FF8494', 300: '#FFADB8', 100: '#FFE4E8' },
 neutral: {
 0: '#FFFFFF', 50: '#F7F9F9', 100: '#EDF1F1', 200: '#DCE3E3', 300: '#BCC7C7', 400: '#94A3A3',
 500: '#6E7C7C', 600: '#556161', 700: '#3F4949', 800: '#2A3131', 900: '#171C1C', 1000: '#000000',
 },
} as const;

const p = primitives;

// ---------------------------------------------------------------------------
// SEMANTIC COLOUR — the only colour surface a component should touch.
// ---------------------------------------------------------------------------

export const darkColors = {
 bg: {
 canvas: p.teal[950], surface: p.teal[900], surfaceRaised: p.teal[800],
 // Splash backdrop. It stays a brand teal in both themes — the launch
 // frame belongs to the brand, not to the reading surface — so it is a
 // token of its own rather than a reuse of canvas.
 brandCanvas: p.teal[950],
 surfaceSunken: p.teal[1000], overlay: p.teal[1000], inverse: p.cream[500],
 brand: p.mint[500], brandHover: p.mint[400], brandPressed: p.mint[600], brandSubtle: p.mint[950],
 accentCream: p.cream[500], accentGold: p.gold[500], accentBlue: p.blue[500], accentPink: p.pink[500],
 successSubtle: p.mint[950], warningSubtle: p.gold[900], dangerSubtle: p.coral[900], infoSubtle: p.blue[900],
 danger: p.coral[500], warning: p.gold[500], success: p.mint[500],
 disabled: p.teal[800],
 },
 text: {
 // tertiary is neutral/300, not /400: on bg/surface-raised (teal/800) the 400
 // step measures 4.47:1 — it misses AA body text by a hair, and tertiary is
 // where every timestamp and caption in the app lives.
 primary: p.neutral[50], secondary: p.teal[300], tertiary: p.neutral[300],
 onBrand: p.teal[900], onInverse: p.teal[900], onSolid: p.neutral[0], brand: p.mint[500],
 success: p.mint[400], warning: p.gold[400], danger: p.coral[400], info: p.blue[400],
 disabled: p.neutral[600], placeholder: p.neutral[500],
 },
 border: {
 subtle: p.teal[800], default: p.teal[700], strong: p.teal[600],
 // `warning` exists because the Cart's prescription gate and its blocked line
 // need a warning-hued RULE, and were binding text/warning to a border —
 // a semantic-layer violation that also rendered far louder in dark than light.
 brand: p.mint[500], focus: p.mint[400], warning: p.gold[700], danger: p.coral[500],
 inverse: p.cream[500],
 },
 icon: {
 primary: p.neutral[50], secondary: p.teal[300], tertiary: p.neutral[300],
 onBrand: p.teal[900], brand: p.mint[500], danger: p.coral[400], warning: p.gold[400],
 },
 /** Cast colour. Deep ink in BOTH modes — a shadow is not a themed surface. */
 shadow: p.teal[1000],
 tile: {
 mintBg: p.mint[900], mintIcon: p.mint[400],
 blueBg: p.blue[800], blueIcon: p.blue[300],
 goldBg: p.gold[800], goldIcon: p.gold[400],
 coralBg: p.coral[800], coralIcon: p.coral[300],
 pinkBg: p.pink[900], pinkIcon: p.pink[400],
 tealBg: p.teal[700], tealIcon: p.teal[200],
 },
} as const;

/**
 * Light mode is NOT a mechanical inversion. brand / warning / danger text each
 * step darker on their ramp so every one clears WCAG AA on white.
 * (mint/500 on white is 3.6:1 — fails. mint/800 is 5.4:1 — passes.)
 */
export const lightColors = {
 bg: {
 canvas: p.neutral[50], surface: p.neutral[0], surfaceRaised: p.neutral[0],
 brandCanvas: p.teal[800],
 surfaceSunken: p.neutral[100], overlay: p.neutral[900], inverse: p.teal[800],
 brand: p.mint[500], brandHover: p.mint[600], brandPressed: p.mint[700], brandSubtle: p.mint[100],
 accentCream: p.cream[500], accentGold: p.gold[500], accentBlue: p.blue[500], accentPink: p.pink[500],
 successSubtle: p.mint[100], warningSubtle: p.gold[100], dangerSubtle: p.coral[100], infoSubtle: p.blue[100],
 danger: p.coral[600], warning: p.gold[600], success: p.mint[600],
 disabled: p.neutral[200],
 },
 text: {
 // Both greys step one darker than the mechanical inversion, for the same
 // reason brand/warning/danger do. On white, neutral/500 measures 4.34:1 and
 // neutral/600 6.42:1 — the old tertiary failed AA body text on every caption,
 // timestamp and metadata line in light mode, which is most of them.
 primary: p.teal[900], secondary: p.neutral[700], tertiary: p.neutral[600],
 onBrand: p.teal[900], onInverse: p.neutral[0], onSolid: p.neutral[0], brand: p.mint[800],
 success: p.mint[800], warning: p.gold[800], danger: p.coral[700], info: p.blue[600],
 disabled: p.neutral[400], placeholder: p.neutral[500],
 },
 border: {
 subtle: p.neutral[200], default: p.neutral[300], strong: p.neutral[400],
 // gold/600 is only 2.04:1 on white — a warning rule you cannot see is not a
 // warning. gold/800 is the same step light-mode warning TEXT uses, so the
 // outline and the label it reinforces stay one hue.
 brand: p.mint[600], focus: p.mint[600], warning: p.gold[800], danger: p.coral[600],
 inverse: p.teal[800],
 },
 icon: {
 // tertiary was neutral/400 — 2.62:1 on white, well under the 3:1 that
 // non-text UI components need. The Cart's remove control is drawn with it.
 primary: p.teal[900], secondary: p.neutral[600], tertiary: p.neutral[500],
 onBrand: p.teal[900], brand: p.mint[800], danger: p.coral[700], warning: p.gold[800],
 },
 /** Cast colour. Deep ink in BOTH modes — a shadow is not a themed surface. */
 shadow: p.teal[1000],
 tile: {
 mintBg: p.mint[100], mintIcon: p.mint[700],
 blueBg: p.blue[100], blueIcon: p.blue[600],
 goldBg: p.gold[100], goldIcon: p.gold[700],
 coralBg: p.coral[100], coralIcon: p.coral[600],
 pinkBg: p.pink[100], pinkIcon: p.pink[700],
 tealBg: p.teal[100], tealIcon: p.teal[600],
 },
} as const;


// ---------------------------------------------------------------------------
// DIMENSIONS
// ---------------------------------------------------------------------------

/** 4pt base grid. `xxxs`/`xxs` exist only for icon-to-label nudges. */
export const spacing = {
 none: 0, xxxs: 2, xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24,
 xxl: 32, xxxl: 40, x4l: 48, x5l: 64, x6l: 80,
} as const;

/** Deliberately generous — large soft geometry is the system's signature. */
export const radius = {
 none: 0, xs: 6, sm: 10, md: 14, lg: 20, xl: 28, xxl: 36, xxxl: 44, full: 999,
} as const;

export const size = {
 icon: { sm: 16, md: 20, lg: 24, xl: 32 },
 control: { sm: 36, md: 48, lg: 56 },
 touchTargetMin: 44,
 avatar: { xs: 28, sm: 32, md: 44, lg: 56, xl: 72 },
 border: { thin: 1, medium: 1.5, thick: 2, focus: 2 },
} as const;

// ---------------------------------------------------------------------------
// TYPOGRAPHY
// ---------------------------------------------------------------------------

/**
 * Install:
 * npx expo install @expo-google-fonts/outfit @expo-google-fonts/plus-jakarta-sans expo-font
 *
 * React Native has no synthetic bolding worth trusting — always reference the
 * concrete family name below rather than combining fontWeight with a base family.
 */
export const fontFamily = {
 display: {
 regular: 'Outfit_400Regular', medium: 'Outfit_500Medium', semibold: 'Outfit_600SemiBold',
 bold: 'Outfit_700Bold', extrabold: 'Outfit_800ExtraBold',
 },
 text: {
 regular: 'PlusJakartaSans_400Regular', medium: 'PlusJakartaSans_500Medium',
 semibold: 'PlusJakartaSans_600SemiBold', bold: 'PlusJakartaSans_700Bold',
 extrabold: 'PlusJakartaSans_800ExtraBold',
 },
} as const;

const F = fontFamily;

/** Mirrors the 19 Figma text styles exactly. letterSpacing is in px (RN units). */
export const typography = {
 displayXL: { fontFamily: F.display.extrabold, fontSize: 48, lineHeight: 52, letterSpacing: -0.96 },
 displayL: { fontFamily: F.display.extrabold, fontSize: 40, lineHeight: 44, letterSpacing: -0.80 },
 displayM: { fontFamily: F.display.bold, fontSize: 34, lineHeight: 38, letterSpacing: -0.51 },
 displayS: { fontFamily: F.display.bold, fontSize: 28, lineHeight: 32, letterSpacing: -0.28 },

 headingXL: { fontFamily: F.display.semibold, fontSize: 24, lineHeight: 30, letterSpacing: -0.12 },
 headingL: { fontFamily: F.display.semibold, fontSize: 20, lineHeight: 26, letterSpacing: -0.10 },
 headingM: { fontFamily: F.display.semibold, fontSize: 18, lineHeight: 24, letterSpacing: 0 },
 headingS: { fontFamily: F.display.semibold, fontSize: 16, lineHeight: 22, letterSpacing: 0 },

 bodyL: { fontFamily: F.text.regular, fontSize: 16, lineHeight: 24, letterSpacing: 0 },
 bodyM: { fontFamily: F.text.regular, fontSize: 14, lineHeight: 21, letterSpacing: 0 },
 bodyS: { fontFamily: F.text.regular, fontSize: 13, lineHeight: 19, letterSpacing: 0 },

 labelL: { fontFamily: F.text.semibold, fontSize: 16, lineHeight: 20, letterSpacing: 0 },
 labelM: { fontFamily: F.text.semibold, fontSize: 14, lineHeight: 18, letterSpacing: 0 },
 labelS: { fontFamily: F.text.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0 },
 labelXS: { fontFamily: F.text.bold, fontSize: 11, lineHeight: 14, letterSpacing: 0.44 },

 /** Figures only. Keeps totals from inheriting heading tracking. */
 numericXL: { fontFamily: F.display.extrabold, fontSize: 40, lineHeight: 44, letterSpacing: -0.80 },
 numericL: { fontFamily: F.display.bold, fontSize: 28, lineHeight: 32, letterSpacing: -0.28 },
 numericM: { fontFamily: F.display.semibold, fontSize: 20, lineHeight: 26, letterSpacing: 0 },

 caption: { fontFamily: F.text.medium, fontSize: 12, lineHeight: 16, letterSpacing: 0 },
} as const;

// ---------------------------------------------------------------------------
// ELEVATION
// ---------------------------------------------------------------------------

/**
 * Shadow colour is near-black teal, so elevation never reads as grey haze on the
 * dark canvas. Reserve these for genuinely floating surfaces (nav bar, sheets,
 * modals) — use the surface ladder for ordinary hierarchy.
 */
export const elevation = {
 sm: {
 shadowColor: p.teal[1000], shadowOffset: { width: 0, height: 2 },
 shadowOpacity: 0.16, shadowRadius: 8, elevation: 2,
 },
 md: {
 shadowColor: p.teal[1000], shadowOffset: { width: 0, height: 8 },
 shadowOpacity: 0.24, shadowRadius: 24, elevation: 8,
 },
 lg: {
 shadowColor: p.teal[1000], shadowOffset: { width: 0, height: 16 },
 shadowOpacity: 0.32, shadowRadius: 40, elevation: 16,
 },
 /** Only ever under the single accent card on a screen. */
 brandGlow: {
 shadowColor: p.mint[500], shadowOffset: { width: 0, height: 8 },
 shadowOpacity: 0.28, shadowRadius: 32, elevation: 12,
 },
} as const;

// ---------------------------------------------------------------------------
// MOTION
// ---------------------------------------------------------------------------

export const motion = {
 duration: { instant: 100, fast: 180, base: 260, slow: 420 },
 /** react-native-reanimated Easing.bezier(...) arguments */
 easing: {
 standard: [0.2, 0, 0, 1] as const,
 decelerate: [0.3, 0, 0, 1] as const,
 accelerate: [0.4, 0, 1, 1] as const,
 },
} as const;

// ---------------------------------------------------------------------------
// THEME
// ---------------------------------------------------------------------------

/**
 * `as const` gives every token a literal type, which makes `dark` and `light`
 * mutually unassignable. Widen literals to their base type so one `Theme` type
 * describes both palettes and a component can hold either.
 */
type Widen<T> = T extends string
 ? string
 : T extends number
 ? number
 : T extends boolean
 ? boolean
 : T extends readonly (infer U)[]
 ? readonly Widen<U>[]
 : { -readonly [K in keyof T]: Widen<T[K]> };

export type ColorScheme = Widen<typeof darkColors>;

export type Theme = {
 colors: ColorScheme;
 spacing: Widen<typeof spacing>;
 radius: Widen<typeof radius>;
 size: Widen<typeof size>;
 typography: Widen<typeof typography>;
 elevation: Widen<typeof elevation>;
 motion: Widen<typeof motion>;
 fontFamily: Widen<typeof fontFamily>;
};

export type ThemeName = 'dark' | 'light';

export const theme: Record<ThemeName, Theme> = {
 dark: { colors: darkColors, spacing, radius, size, typography, elevation, motion, fontFamily },
 light: { colors: lightColors, spacing, radius, size, typography, elevation, motion, fontFamily },
};

/** Dark is the default — the system is designed dark-first. */
export const defaultTheme: ThemeName = 'dark';

export default theme;
