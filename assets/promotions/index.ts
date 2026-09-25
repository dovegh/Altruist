/**
 * Promo banner artwork.
 *
 * One place to register the images, so `src/lib/promotions.ts` stays free of
 * `require()` calls and adding a campaign is a one-line change here.
 *
 * ---------------------------------------------------------------------------
 * TO ADD A BANNER
 *
 * 1. Drop the file in this folder, named after the promotion id.
 * 2. Uncomment (or add) its line below.
 * 3. Set `aspectRatio` on the matching entry in `src/lib/promotions.ts` to the
 *    artwork's real ratio — width ÷ height. The card sizes itself to the art
 *    rather than cropping it, because in these banners the headline IS the
 *    image: a centre-crop cuts the words in half.
 *
 * `require` is resolved at bundle time, so a line pointing at a file that is
 * not there is a build error, not a blank card. Only register files you have.
 *
 * Until a banner is registered, its promotion renders as a composed card built
 * from the same tokens — see PromoCarousel. That fallback is not scaffolding:
 * it is also what shows when a remote banner fails to load on a bad connection.
 * ---------------------------------------------------------------------------
 *
 * LICENSING — read before shipping. Banner art is the advertiser's property.
 * Anything registered here needs to be either Altruist's own artwork or
 * supplied by the partner with permission to display it. Marketing images
 * lifted from a brand's own site are not licensed by virtue of being public.
 */
import type { ImageSourcePropType } from 'react-native';

export const PROMO_ART: Record<string, ImageSourcePropType> = {
  'young-living-bloom': require('./young-living-bloom.jpg'),
  'anua-glass-skin': require('./anua-glass-skin.jpg'),
  'purito-centella': require('./purito-centella.jpg'),
  'caryophy-protection': require('./caryophy-protection.jpg'),
  'sisi-mini': require('./sisi-mini.jpg'),
  'manyo-prime-day': require('./manyo-prime-day.jpg'),
  'holos-supplements': require('./holos-supplements.jpg'),
  'atyab-all-over-spray': require('./atyab-all-over-spray.jpg'),
};
