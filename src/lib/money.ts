/**
 * Money.
 *
 * Prices in this market are whole cedis, so amounts are plain numbers rather
 * than minor units — there is no pesewa pricing anywhere in the catalogue, and
 * inventing a ×100 representation would mean every screen dividing it back out.
 *
 * The one rule: nothing formats a price by hand. The glyph, its position and
 * the grouping live here, so a currency change is one edit rather than sixty.
 */

/** `₵186`, `₵1,240`. */
export function cedis(amount: number): string {
  return `₵${Math.round(amount).toLocaleString('en-GH')}`;
}

/**
 * Spoken form for `accessibilityLabel`. VoiceOver reads "₵" as nothing at all,
 * so a price-only label would be silence followed by a number.
 */
export function cedisSpoken(amount: number): string {
  return `${Math.round(amount).toLocaleString('en-GH')} cedis`;
}
