/**
 * Promotions — the banner carousel on Home.
 *
 * A promotion is a piece of **artwork**: the photography, the headline and the
 * call to action are all baked into one image the advertiser supplies. Campaigns
 * turn over without a release, so these are server data like everything else —
 * screens read them through `listPromotions()` in `src/lib/api.ts`, never from
 * this file. The array below is the development fixture.
 *
 * ---------------------------------------------------------------------------
 * FOUR THINGS THAT ARE NOT EDITORIAL
 *
 * 1. **`alt` is required.** Every word in a banner is pixels. Without alt text
 *    a screen reader reaches the most prominent element on the home screen and
 *    announces nothing at all. This is the single biggest accessibility risk in
 *    an image-driven carousel, and it is why `alt` is not optional here.
 *
 * 2. **`advertiser` is required.** Altruist is a technology platform, not the
 *    seller (SRS §1). A banner that reads as Altruist's own offer
 *    misrepresents who is dispensing.
 *
 * 3. **`aspectRatio` is required.** The eight banners here measure anywhere
 *    from 1.67:1 to 2.84:1, and the ad slot is one fixed shape, so every one of
 *    them is cropped to fill it. This value is how the carousel knows how much
 *    it is taking off a given creative — and warns, in development, when that
 *    passes a quarter of the image. Use `focus` to choose which edge goes.
 *
 * 4. **Nothing prescription-only is advertised.** Direct-to-consumer
 *    advertising of prescription medicines is restricted in Ghana and is an
 *    App Store review trigger. `advertisable()` below is the second line; the
 *    campaign tooling and the backend have to enforce it too.
 * ---------------------------------------------------------------------------
 */
import type { ImageSourcePropType } from 'react-native';
import { PRODUCTS } from './catalog';
import { PROMO_ART } from '@/assets/promotions';

/**
 * Fallback palette, used to compose a card when a banner has no artwork
 * registered yet or fails to load. Every tone is a light, high-chroma surface —
 * ink is always text/on-brand.
 */
export type PromoTone = 'brand' | 'accentCream' | 'accentGold' | 'accentBlue' | 'accentPink';

export type Promotion = {
  id: string;
  /** The banner. A bundled asset under fixtures; a `{ uri }` from the server. */
  image?: ImageSourcePropType;
  /** What the banner says, for anyone who cannot see it. Required. */
  alt: string;
  /**
   * Artwork width ÷ height. The slot is a fixed shape, so this is not what the
   * card is sized from — it is how the carousel works out how much of this
   * particular creative the crop is eating, and warns in development when that
   * is too much.
   */
  aspectRatio: number;
  /**
   * Which part of the artwork survives the crop. Defaults to the centre.
   *
   * Set it when a creative puts something load-bearing against one edge — a
   * logo, a price, a "NEW!" flag. `'left'` keeps the left edge and crops the
   * right, and so on.
   */
  focus?: 'center' | 'left' | 'right' | 'top' | 'bottom';
  /** Whose offer this is. Required — see the note above. */
  advertiser: string;
  /** Route the banner opens. */
  href: string;
  /** Product this promotes, when it promotes one. Must not be Rx-only. */
  productId?: string;

  // --- Fallback composition, for when there is no usable artwork ------------
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  tone: PromoTone;
};

export const PROMOTIONS: Promotion[] = [
  {
    id: 'young-living-bloom',
    alt: 'Young Living Bloom. Brighter skin, a more radiant you, naturally. The first essential oil-infused skin care line, with brightening cleanser, essence and lotion.',
    aspectRatio: 1197 / 421,
    // 2.84:1 in a 2.5:1 slot loses 12% horizontally. Centred, that halves the
    // "NEW!" flag on the far left into "W!" and clips the logo on the far
    // right — a half-eaten word reads as a rendering fault. Taking the whole
    // 12% off the left drops "NEW!" cleanly and keeps the headline and logo.
    focus: 'right',
    advertiser: 'Young Living',
    href: '/catalog',
    eyebrow: 'NEW IN',
    title: 'Brighter skin, naturally',
    body: 'An essential oil-infused brightening cleanser, essence and lotion.',
    cta: 'See the range',
    tone: 'accentCream',
  },
  {
    id: 'anua-glass-skin',
    alt: 'Anua Glass Skin Beginner Set. Three steps to luminous skin, all in one set: heartleaf cleansing oil, pore deep cleansing foam and niacinamide serum.',
    aspectRatio: 1198 / 491,
    advertiser: 'Anua',
    href: '/catalog',
    eyebrow: 'ANUA’S CHOICE',
    title: 'Glass Skin Beginner Set',
    body: 'Three steps to luminous skin, all in one set.',
    cta: 'View the set',
    tone: 'accentPink',
  },
  {
    id: 'manyo-prime-day',
    alt: 'Manyo Prime Day Sale, 23rd to 26th June. Up to 60 percent off Air Light sunscreen SPF 50, Pure Soybean cleansing oil and Glutathione dark spot serum.',
    aspectRatio: 1200 / 600,
    advertiser: 'Manyo Factory',
    href: '/catalog',
    eyebrow: 'PRIME DAY · 23–26 JUN',
    title: 'Up to 60% off Manyo',
    body: 'Sunscreen, cleansing oil and the Glutathione dark spot serum.',
    cta: 'Shop the sale',
    tone: 'accentGold',
  },
  {
    id: 'purito-centella',
    alt: 'Purito Seoul, most loved Korean skincare in Europe. Wonder Releaf Centella range, unscented. Vegan, cruelty free, gentle ingredients, dermatologically tested.',
    aspectRatio: 1200 / 600,
    advertiser: 'Purito Seoul',
    href: '/catalog',
    eyebrow: 'MOST LOVED',
    title: 'Korean skincare, unscented',
    body: 'Wonder Releaf Centella — vegan, cruelty free, dermatologically tested.',
    cta: 'Browse Purito',
    tone: 'brand',
  },
  {
    id: 'caryophy-protection',
    alt: 'Caryophy, made in Korea. Complete protection for every skin type: smart sunscreen SPF 50 plus, skin repair cream, portulaca mist and ampoule.',
    aspectRatio: 1200 / 456,
    advertiser: 'Caryophy',
    href: '/catalog',
    eyebrow: 'PARTNER OFFER',
    title: 'Complete daily protection',
    body: 'Sunscreen, repair cream, mist and ampoule for troubled skin.',
    cta: 'Shop Caryophy',
    tone: 'accentBlue',
  },
  {
    id: 'sisi-mini',
    alt: 'SISI Tokyo, I’m Your HERO dual watery cleansing. The long-awaited mini size, now on sale.',
    aspectRatio: 1200 / 675,
    advertiser: 'SISI Tokyo',
    href: '/catalog',
    eyebrow: 'NOW IN MINI',
    title: 'I’m Your HERO, travel size',
    body: 'The dual watery cleanser, in a size that fits your bag.',
    cta: 'See sizes',
    tone: 'accentBlue',
  },
  {
    id: 'holos-supplements',
    alt: 'Hólos supplements. BioFlex Collagen, Imuno Defense, Omega 3 Pro, Gluta Pure and Ósseo Force, in blue and white tubs.',
    aspectRatio: 1199 / 712,
    advertiser: 'Hólos',
    href: '/catalog',
    eyebrow: 'SUPPLEMENTS',
    title: 'Daily support, covered',
    body: 'Collagen, omega 3, glutathione and bone health in one range.',
    cta: 'Shop supplements',
    tone: 'accentBlue',
  },
  {
    id: 'atyab-all-over-spray',
    alt: 'Atyab Al Marshoud All Over Spray collection. Long-lasting fragrance with skin-loving hydration, in lychee, tonka, magnolia, salt and honey.',
    aspectRatio: 1200 / 720,
    advertiser: 'Atyab Al Marshoud',
    href: '/catalog',
    eyebrow: 'FRAGRANCE',
    title: 'All Over Spray collection',
    body: 'Long-lasting scent with skin-loving hydration, in five notes.',
    cta: 'Explore scents',
    tone: 'accentGold',
  },
];

/** Attaches registered artwork. A real backend returns a `{ uri }` instead. */
export function withArt(promos: Promotion[]): Promotion[] {
  return promos.map((promo) => ({ ...promo, image: promo.image ?? PROMO_ART[promo.id] }));
}

/**
 * Drops any promotion pointing at a prescription-only product.
 *
 * Cheap here, and the cost of getting it wrong is an advert for a prescription
 * antibiotic on the home screen of a health app in store review.
 */
export function advertisable(promos: Promotion[]): Promotion[] {
  return promos.filter((promo) => {
    if (!promo.productId) return true;
    const product = PRODUCTS.find((p) => p.id === promo.productId);
    return !!product && !product.requiresPrescription;
  });
}
