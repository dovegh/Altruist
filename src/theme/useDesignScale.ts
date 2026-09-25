/**
 * Design-canvas scaling.
 *
 * Every screen in the Figma file is drawn on a 390 x 844 canvas. To reproduce a
 * layout exactly rather than approximately, coordinates are taken verbatim from
 * Figma and multiplied by a single uniform factor derived from the real screen
 * width.
 *
 *   d(28)  ->  28pt on a 390pt-wide device, 28 * (393/390) on a Pixel 7
 *
 * Uniform scale (width-derived, applied to both axes) preserves the designed
 * aspect of every card, radius and rotation. Non-uniform scaling would distort
 * circles and corner radii, so it is deliberately not offered.
 */
import { useWindowDimensions } from 'react-native';

export const DESIGN_WIDTH = 390;
export const DESIGN_HEIGHT = 844;

/**
 * Multiplier applied to every font size, line height and letter spacing at
 * the point of rendering — in `Text`, after the screen's own inline sizes.
 *
 * `d()` answers "how wide is this device compared to the canvas". This answers
 * a different question: "the comp's type reads large on a real phone". It is
 * separate because they must move independently — a 44pt touch target has to
 * stay 44pt however small the type gets, and a uniform shrink of `d()` would
 * drag every button under the accessibility minimum with it.
 *
 * Proportional, so the hierarchy is untouched: a heading is still exactly as
 * many times larger than a caption as Figma drew it. 1 restores the comp.
 */
export const TYPE_SCALE = 0.9;

export type DesignScale = {
  /** Scale a design-canvas value to device points. */
  d: (n: number) => number;
  /** The raw factor, for cases that need it directly. */
  scale: number;
  width: number;
  height: number;
};

export function useDesignScale(): DesignScale {
  const { width, height } = useWindowDimensions();
  const scale = width / DESIGN_WIDTH;
  return {
    scale,
    width,
    height,
    d: (n: number) => n * scale,
  };
}
