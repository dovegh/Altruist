/**
 * Onboarding — ported 1:1 from Figma node 67:69 (and siblings).
 *
 * Layout is absolute, using the exact design-canvas coordinates from the Figma
 * file scaled by useDesignScale(). Do not "tidy" these numbers into flex — the
 * tilted chip cluster and the hero card crop depend on them.
 *
 * Status Bar and Home Indicator are deliberately NOT drawn: the Figma component
 * descriptions state they are mockups and the OS renders the real ones.
 */
import React, { useRef, useState } from 'react';
import { View, ScrollView, Pressable, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { Text } from '@/components/ui/Text';
import { Icon, type IconName } from '@/components/ui/Icon';
import { markOnboarded } from '@/lib/session';
import { usePartnerPharmacy } from '@/features/profile/store';
import { shortName, type Pharmacy } from '@/lib/pharmacies';
import { FREE_DELIVERY_OVER } from '@/features/cart/useCart';
import { cedis } from '@/lib/money';
import { PRODUCTS } from '@/lib/catalog';
import { ARTICLES } from '@/lib/articles';
import { programmeById } from '@/lib/wellness';
import { defineStrings, useT } from '@/i18n';

// Each headline is up to three pieces, the middle one highlighted. An empty
// piece is dropped, so a language can put the highlight last.
const S = defineStrings({
  en: {
    skip: 'Skip',
    skipA11y: 'Skip onboarding',
    next: 'Next',
    getStarted: 'Get started',
    s1HeadA: 'Upload your',
    s1HeadB: 'prescription',
    s1HeadC: '',
    s1Body:
      'Upload prescriptions instantly and connect directly with certified local pharmacies for doorstep fulfilment.',
    verifiedPartner: 'Verified partner',
    reviewed: 'Reviewed in 4 min',
    realPharmacist: 'Real pharmacist',
    kmAway: '{km} km away',
    rxApproved: 'Rx approved',
    readyDispatch: 'Ready to dispatch',
    s2HeadA: 'Everything the',
    s2HeadB: 'cabinet',
    s2HeadC: 'needs',
    s2Body:
      'Browse everyday medicines, vitamins, and healthcare essentials with secure checkout.',
    inStockToday: 'In stock today',
    priceInStock: '{price} · in stock',
    otc: 'Over the counter',
    priceOtc: '{price} · OTC',
    noRx: 'No prescription needed',
    items: '{count} items',
    fromPartner: 'From {name}',
    freeDelivery: 'Free delivery',
    ordersOver: 'Orders over {amount}',
    s3HeadA: 'Stay',
    s3HeadB: 'well',
    s3HeadC: 'between refills',
    s3Body:
      'Access expert health tips, nutrition advice, and structured workout routines to stay on top of your goals.',
    sessionPlan: '{count}-session plan',
    restingHr: 'Resting HR 64',
    steady: 'Steady this week',
    minRead: '{min} min read',
    heart: 'Heart',
  },
  fr: {
    skip: 'Passer',
    skipA11y: "Passer l'introduction",
    next: 'Suivant',
    getStarted: 'Commencer',
    s1HeadA: 'Envoyez votre',
    s1HeadB: 'ordonnance',
    s1HeadC: '',
    s1Body:
      'Envoyez vos ordonnances en un instant et échangez directement avec des pharmacies locales certifiées, pour une livraison à votre porte.',
    verifiedPartner: 'Partenaire vérifié',
    reviewed: 'Vérifiée en 4 min',
    realPharmacist: 'Un vrai pharmacien',
    kmAway: 'À {km} km',
    rxApproved: 'Ordonnance validée',
    readyDispatch: "Prête à l'envoi",
    s2HeadA: 'Tout pour votre',
    s2HeadB: 'armoire à pharmacie',
    s2HeadC: '',
    s2Body:
      'Parcourez médicaments du quotidien, vitamines et produits de santé essentiels, avec un paiement sécurisé.',
    inStockToday: "En stock aujourd'hui",
    priceInStock: '{price} · en stock',
    otc: 'Sans ordonnance',
    priceOtc: '{price} · sans ordonnance',
    noRx: 'Aucune ordonnance requise',
    items: '{count} articles',
    fromPartner: 'Chez {name}',
    freeDelivery: 'Livraison gratuite',
    ordersOver: 'Commandes de plus de {amount}',
    s3HeadA: 'Restez en',
    s3HeadB: 'forme',
    s3HeadC: 'entre deux renouvellements',
    s3Body:
      "Accédez à des conseils santé d'experts, des conseils en nutrition et des séances d'exercice structurées pour atteindre vos objectifs.",
    sessionPlan: 'Programme de {count} séances',
    restingHr: 'FC au repos 64',
    steady: 'Stable cette semaine',
    minRead: '{min} min de lecture',
    heart: 'Cœur',
  },
  tw: {
    skip: 'Twa mu',
    skipA11y: 'Twa nkyerɛkyerɛmu no mu',
    next: 'Deɛ ɛdi so',
    getStarted: 'Hyɛ ase',
    s1HeadA: 'Fa wo',
    s1HeadB: 'nnuro krataa',
    s1HeadC: 'to so',
    s1Body:
      'Fa wo nnuro nkrataa to so ntɛm na di nkitaho tẽẽ ne nnuro adetɔnfoɔ a wɔagye wɔn atom, na wɔde nnuro no abrɛ wo fie.',
    verifiedPartner: 'Ɔhokafoɔ a yɛagye no atom',
    reviewed: 'Yɛhwɛɛ mu wɔ simma 4 mu',
    realPharmacist: 'Oduruyɛfoɔ ankasa',
    kmAway: 'Ɛwɔ {km} km',
    rxApproved: 'Yɛapene Rx no so',
    readyDispatch: 'Ɛasiesie ama akɔ',
    s2HeadA: 'Biribiara a wo',
    s2HeadB: 'nnuro adaka',
    s2HeadC: 'hia',
    s2Body:
      'Hwehwɛ nnuro a wode di dwuma da biara, vitamin ne apɔmuden nneɛma, na tua ka wɔ ɛkwan a ahobammɔ wom so.',
    inStockToday: 'Ɛwɔ hɔ ɛnnɛ',
    priceInStock: '{price} · ɛwɔ hɔ',
    otc: 'Nnuro krataa nhia',
    priceOtc: '{price} · OTC',
    noRx: 'Nnuro krataa nhia',
    items: 'Nneɛma {count}',
    fromPartner: 'Efi {name}',
    freeDelivery: 'Yɛde bɛbrɛ wo kwa',
    ordersOver: 'Nneɛma a ɛboro {amount}',
    s3HeadA: 'Kɔ so nya',
    s3HeadB: 'apɔmuden',
    s3HeadC: 'bere biara',
    s3Body:
      'Nya apɔmuden ho afotuo fi abenfoɔ hɔ, aduane ho afotuo ne apɔw-mu-teɛteɛ nhyehyɛeɛ a ɛbɛboa wo.',
    sessionPlan: 'Nhyehyɛeɛ a ɛwɔ bere {count}',
    restingHr: 'Akoma bɔ 64',
    steady: 'Ɛyɛ pɛ nnawɔtwe yi',
    minRead: 'Simma {min} kenkan',
    heart: 'Akoma',
  },
  gaa: {
    skip: 'Fa nɔ',
    skipA11y: 'Fa shishitsɔɔmɔ lɛ nɔ',
    next: 'Nɔ ni nyiɛ sɛɛ',
    getStarted: 'Je shishi',
    s1HeadA: 'Kɛ o',
    s1HeadB: 'tsofa wolo',
    s1HeadC: 'ha wɔ',
    s1Body:
      'Kɛ o tsofa woloi ha wɔ oya nɔŋŋ ni okɛ tsofa shĩai ni ahe amɛ gbɛ ni bɛŋkɛ bo awie, ni amɛkɛ tsofai lɛ aba o shĩa.',
    verifiedPartner: 'Hefatalɔ ni ahe gbɛ',
    reviewed: 'Akwɛ mli yɛ minitii 4 mli',
    realPharmacist: 'Tsofatsɛ diɛŋtsɛ',
    kmAway: 'Eje {km} km',
    rxApproved: 'Akpɛlɛ Rx lɛ nɔ',
    readyDispatch: 'Esaa ni aha eya',
    s2HeadA: 'Nɔ fɛɛ nɔ ni o',
    s2HeadB: 'tsofa adeka',
    s2HeadC: 'he hiaa',
    s2Body:
      'Kwɛ tsofai ni otsuɔ nii daa, vitamin kɛ hewalɛ nibii, ni owo nyɔmɔ yɛ gbɛ ni hi nɔ.',
    inStockToday: 'Eyɛ ŋmɛnɛ',
    priceInStock: '{price} · eyɛ',
    otc: 'Tsofa wolo he ehiaaa',
    priceOtc: '{price} · OTC',
    noRx: 'Tsofa wolo he ehiaaa',
    items: 'Nibii {count}',
    fromPartner: 'Kɛjɛ {name}',
    freeDelivery: 'Wɔkɛbaa yaka',
    ordersOver: 'Nɔ ni ohe ni fe {amount}',
    s3HeadA: 'Hi',
    s3HeadB: 'hewalɛ mli',
    s3HeadC: 'daa',
    s3Body:
      'Na hewalɛ he ŋaawoo kɛjɛ nilelɔi aŋɔɔ, niyenii he ŋaawoo kɛ gbɔmɔtso he nitsumɔ ni aŋmɛ gbɛ, koni otsu o yiŋtoi anɔ nii.',
    sessionPlan: 'Nitsumɔ {count} gbɛjianɔtoo',
    restingHr: 'Tsui fɔ 64',
    steady: 'Etsɔ shi otsi nɛɛ',
    minRead: 'Minitii {min} kanemɔ',
    heart: 'Tsui',
  },
  ee: {
    skip: 'Dzo le eŋu',
    skipA11y: 'Dzo le ɖeɖefia la ŋu',
    next: 'Si kplɔe ɖo',
    getStarted: 'Dze egɔme',
    s1HeadA: 'Ɖo wò',
    s1HeadB: 'atikeŋɔŋlɔ',
    s1HeadC: 'ɖa',
    s1Body:
      'Ɖo wò atikeŋɔŋlɔwo ɖa enumake eye nàdo ka atikedzraƒe siwo woɖo kpe edzi le afi si nèle, woatsɔ atikeawo vɛ na wò le aƒeme.',
    verifiedPartner: 'Hadɔwɔla si woɖo kpe edzi',
    reviewed: 'Wodzrɔe me le aɖabaƒoƒo 4 me',
    realPharmacist: 'Atikedzraɖola vavã',
    kmAway: '{km} km didi',
    rxApproved: 'Wolɔ̃ ɖe Rx dzi',
    readyDispatch: 'Esɔ na ɖoɖo',
    s2HeadA: 'Nu sia nu si wò',
    s2HeadB: 'atikedaka',
    s2HeadC: 'hiã',
    s2Body:
      'Kpɔ gbesiagbe atikewo, vitamin kple lãmesẽ nuhiãwo eye nàxe fe le mɔ si le dedie dzi.',
    inStockToday: 'Eli egbe',
    priceInStock: '{price} · eli',
    otc: 'Mehiã atikeŋɔŋlɔ o',
    priceOtc: '{price} · OTC',
    noRx: 'Atikeŋɔŋlɔ mehiã o',
    items: 'Nu {count}',
    fromPartner: 'Tso {name}',
    freeDelivery: 'Nuɖoɖo femaxee',
    ordersOver: 'Nudodo siwo wu {amount}',
    s3HeadA: 'Nɔ',
    s3HeadB: 'lãmesẽ',
    s3HeadC: 'me ɣesiaɣi',
    s3Body:
      'Xɔ lãmesẽ ŋuti aɖaŋuɖoɖo tso nunyalawo gbɔ, nuɖuɖu ŋuti aɖaŋu kple kamedefefe ɖoɖowo be nàɖo wò taɖodzinuwo gbɔ.',
    sessionPlan: 'Ɖoɖo si me akpa {count} le',
    restingHr: 'Dzi ƒe ƒoƒo 64',
    steady: 'Eli ke kwasiɖa sia',
    minRead: 'Aɖabaƒoƒo {min} xexlẽ',
    heart: 'Dzi',
  },
  ha: {
    skip: 'Tsallake',
    skipA11y: 'Tsallake gabatarwa',
    next: 'Na gaba',
    getStarted: 'Fara',
    s1HeadA: 'Ɗora',
    s1HeadB: 'takardar maganinka',
    s1HeadC: '',
    s1Body:
      'Ɗora takardun magani nan take ka haɗu kai tsaye da kantunan magani na gida da aka tabbatar, don a kawo maka har ƙofa.',
    verifiedPartner: 'Abokin hulɗa da aka tabbatar',
    reviewed: 'An duba cikin minti 4',
    realPharmacist: 'Ainihin mai harhaɗa magani',
    kmAway: 'Nisan km {km}',
    rxApproved: 'An amince da Rx',
    readyDispatch: 'A shirye don aikawa',
    s2HeadA: 'Duk abin da',
    s2HeadB: 'akwatin magani',
    s2HeadC: 'ke buƙata',
    s2Body:
      'Duba magungunan yau da kullum, bitamin da kayayyakin lafiya masu muhimmanci, tare da biya mai tsaro.',
    inStockToday: 'Akwai yau',
    priceInStock: '{price} · akwai',
    otc: 'Ba sai da takarda ba',
    priceOtc: '{price} · OTC',
    noRx: 'Ba a buƙatar takardar magani',
    items: 'Kaya {count}',
    fromPartner: 'Daga {name}',
    freeDelivery: 'Kawowa kyauta',
    ordersOver: 'Oda sama da {amount}',
    s3HeadA: 'Kasance cikin',
    s3HeadB: 'ƙoshin lafiya',
    s3HeadC: 'koyaushe',
    s3Body:
      'Samu shawarwarin lafiya daga ƙwararru, shawarar abinci mai gina jiki da tsararrun motsa jiki don cimma burinka.',
    sessionPlan: 'Shirin zama {count}',
    restingHr: 'Bugun zuciya 64',
    steady: 'Daidai a wannan mako',
    minRead: 'Karatun minti {min}',
    heart: 'Zuciya',
  },
});

type Tr = (key: keyof (typeof S)['en'], vars?: Record<string, string | number>) => string;

type Chip = {
  /** Rotated bounding box from Figma, design-canvas units. */
  box: { left: number; top: number; width: number; height: number };
  rotate: number;
  surface: 'accentCream' | 'surface' | 'accentBlue' | 'accentGold' | 'accentPink';
  thumb: 'surface' | 'accentGold' | 'accentPink' | 'accentBlue';
  icon: IconName;
  title: string;
  sub: string;
};

type Slide = {
  card: 'brand' | 'accentCream' | 'accentGold';
  head: { text: string; highlight?: boolean }[];
  body: string;
  cta: string;
  chips: Chip[];
};

// Partner facts on the chips come from the partner record, not the copy deck.
/**
 * Two real products from the catalogue for the second slide's chips.
 *
 * These were invented ("Vitamin C ₵24", "Paracetamol ₵12") and matched nothing
 * a user would find after signing up — an onboarding screen advertising a price
 * the catalogue does not have is the first thing the app says and it was false.
 */
const samples = () => {
  const inStock = PRODUCTS.filter((x) => x.inStock && !x.requiresPrescription);
  return [inStock[0], inStock[Math.min(1, inStock.length - 1)]].filter(Boolean);
};

const slidesFor = (p: Pharmacy, tr: Tr): Slide[] => [
  {
    card: 'brand',
    head: [
      { text: tr('s1HeadA') },
      { text: tr('s1HeadB'), highlight: true },
      { text: tr('s1HeadC') },
    ].filter((w) => w.text),
    body: tr('s1Body'),
    cta: tr('next'),
    chips: [
      {
        box: { left: 15.19, top: 296, width: 151.998, height: 61.218 },
        rotate: 6,
        surface: 'accentCream',
        thumb: 'surface',
        icon: 'prescription',
        title: shortName(p),
        sub: tr('verifiedPartner'),
      },
      {
        box: { left: 176, top: 267.88, width: 165.393, height: 59.944 },
        rotate: -5,
        surface: 'surface',
        thumb: 'accentGold',
        icon: 'prescription',
        title: tr('reviewed'),
        sub: tr('realPharmacist'),
      },
      {
        box: { left: 36, top: 349.68, width: 129.899, height: 54.747 },
        rotate: -4,
        surface: 'accentBlue',
        thumb: 'surface',
        icon: 'prescription',
        title: p.locality,
        sub: tr('kmAway', { km: p.distanceKm }),
      },
      {
        box: { left: 164.79, top: 366, width: 165.812, height: 57.258 },
        rotate: 4,
        surface: 'surface',
        thumb: 'accentPink',
        icon: 'check',
        title: tr('rxApproved'),
        sub: tr('readyDispatch'),
      },
    ],
  },
  {
    card: 'accentCream',
    head: [
      { text: tr('s2HeadA') },
      { text: tr('s2HeadB'), highlight: true },
      { text: tr('s2HeadC') },
    ].filter((w) => w.text),
    body: tr('s2Body'),
    cta: tr('next'),
    chips: [
      {
        box: { left: 15.19, top: 296, width: 151.998, height: 61.218 },
        rotate: 6,
        surface: 'surface',
        thumb: 'accentBlue',
        icon: 'cart',
        title: samples()[0]?.name ?? tr('inStockToday'),
        sub: samples()[0]
          ? tr('priceInStock', { price: cedis(samples()[0].price) })
          : tr('readyDispatch'),
      },
      {
        box: { left: 176, top: 267.88, width: 165.393, height: 59.944 },
        rotate: -5,
        surface: 'accentBlue',
        thumb: 'surface',
        icon: 'catalog',
        title: samples()[1]?.name ?? tr('otc'),
        sub: samples()[1] ? tr('priceOtc', { price: cedis(samples()[1].price) }) : tr('noRx'),
      },
      {
        box: { left: 36, top: 349.68, width: 129.899, height: 54.747 },
        rotate: -4,
        surface: 'surface',
        thumb: 'accentPink',
        icon: 'cart',
        title: tr('items', { count: PRODUCTS.length }),
        sub: tr('fromPartner', { name: shortName(p) }),
      },
      {
        box: { left: 164.79, top: 366, width: 165.812, height: 57.258 },
        rotate: 4,
        surface: 'accentCream',
        thumb: 'surface',
        icon: 'send',
        title: tr('freeDelivery'),
        sub: tr('ordersOver', { amount: cedis(FREE_DELIVERY_OVER) }),
      },
    ],
  },
  {
    card: 'accentGold',
    head: [
      { text: tr('s3HeadA') },
      { text: tr('s3HeadB'), highlight: true },
      { text: tr('s3HeadC') },
    ].filter((w) => w.text),
    body: tr('s3Body'),
    cta: tr('getStarted'),
    chips: [
      {
        box: { left: 15.19, top: 296, width: 151.998, height: 61.218 },
        rotate: 6,
        surface: 'surface',
        thumb: 'accentGold',
        icon: 'award',
        title: tr('sessionPlan', { count: programmeById().sessionsTotal }),
        sub: programmeById().title,
      },
      {
        box: { left: 176, top: 267.88, width: 165.393, height: 59.944 },
        rotate: -5,
        surface: 'accentCream',
        thumb: 'surface',
        icon: 'heart',
        title: tr('restingHr'),
        sub: tr('steady'),
      },
      {
        box: { left: 36, top: 349.68, width: 129.899, height: 54.747 },
        rotate: -4,
        surface: 'accentBlue',
        thumb: 'surface',
        icon: 'wellness',
        title: ARTICLES[1].category,
        sub: tr('minRead', { min: ARTICLES[1].minutes }),
      },
      {
        box: { left: 164.79, top: 366, width: 165.812, height: 57.258 },
        rotate: 4,
        surface: 'surface',
        thumb: 'accentPink',
        icon: 'info',
        title: ARTICLES.find((a) => a.id === 'blood-pressure')?.category ?? tr('heart'),
        sub: tr('minRead', {
          min: ARTICLES.find((a) => a.id === 'blood-pressure')?.minutes ?? 6,
        }),
      },
    ],
  },
];

export default function Onboarding() {
  const tr = useT(S);
  const t = useTokens();
  const { d, width } = useDesignScale();
  const pharmacy = usePartnerPharmacy();
  const SLIDES = slidesFor(pharmacy, tr);
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const scroller = useRef<ScrollView>(null);

  const finish = async () => {
    await markOnboarded();
    router.replace('/welcome');
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      scroller.current?.scrollTo({ x: (index + 1) * width, animated: true });
      setIndex(index + 1);
    } else {
      finish();
    }
  };

  // Ink on every card tone is dark: brand, cream and gold are all light surfaces.
  const cardInk = t.colors.text.onBrand;

  const chipInk = (surface: Chip['surface']) => {
    if (surface === 'surface') return { title: t.colors.text.primary, sub: t.colors.text.tertiary };
    if (surface === 'accentBlue') return { title: t.colors.text.onSolid, sub: t.colors.text.onSolid };
    return { title: t.colors.text.onBrand, sub: t.colors.text.onBrand };
  };

  const thumbIconTone = (thumb: Chip['thumb']) =>
    thumb === 'surface' ? t.colors.icon.primary : t.colors.icon.onBrand;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        scrollEventThrottle={16}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={{ width }}>
            {/* Hero card — Figma: 358 x 500 at (16, 52), radius 36, clipped */}
            <View
              style={{
                position: 'absolute',
                left: d(16),
                top: insets.top + d(6),
                width: d(358),
                height: d(500),
                borderRadius: d(36),
                backgroundColor: t.colors.bg[s.card],
                overflow: 'hidden',
              }}
            >
              {/* Skip — Figma: (264, 20), 1.5 border, padL16 padR12 padY9 */}
              <Pressable
                onPress={finish}
                accessibilityRole="button"
                accessibilityLabel={tr('skipA11y')}
                style={{
                  position: 'absolute',
                  left: d(264),
                  top: d(20),
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: d(6),
                  paddingLeft: d(16),
                  paddingRight: d(12),
                  paddingVertical: d(9),
                  borderRadius: t.radius.full,
                  borderWidth: 1.5,
                  borderColor: cardInk,
                }}
              >
                <Text variant="labelS" color={cardInk}>
                  {tr('skip')}
                </Text>
                <Icon name="arrow-right" size={d(14)} color={cardInk} />
              </Pressable>

              {/* Headline — Figma: (28, 84), width 300, wrap gap 4 / 10 */}
              <View
                style={{
                  position: 'absolute',
                  left: d(28),
                  top: d(84),
                  width: d(300),
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  rowGap: d(4),
                  columnGap: d(10),
                }}
              >
                {s.head.map((w, k) =>
                  w.highlight ? (
                    <View
                      key={k}
                      style={{
                        backgroundColor: t.colors.bg.surface,
                        borderRadius: t.radius.full,
                        paddingHorizontal: d(16),
                        paddingTop: d(2),
                        paddingBottom: d(5),
                      }}
                    >
                      <Text variant="displayM" tone="primary" style={{ fontSize: d(34), lineHeight: d(38) }}>
                        {w.text}
                      </Text>
                    </View>
                  ) : (
                    <Text
                      key={k}
                      variant="displayM"
                      color={cardInk}
                      style={{ fontSize: d(34), lineHeight: d(38) }}
                    >
                      {w.text}
                    </Text>
                  ),
                )}
              </View>

              {/* Partner chips — exact rotated boxes from Figma */}
              {s.chips.map((c, k) => {
                const ink = chipInk(c.surface);
                return (
                  <View
                    key={k}
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      left: d(c.box.left),
                      top: d(c.box.top),
                      width: d(c.box.width),
                      height: d(c.box.height),
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <View
                      style={
                        {
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: d(8),
                          paddingLeft: d(7),
                          paddingRight: d(14),
                          paddingVertical: d(7),
                          borderRadius: t.radius.full,
                          backgroundColor: t.colors.bg[c.surface],
                          transform: [{ rotate: `${c.rotate}deg` }],
                          shadowColor: t.colors.shadow,
                          shadowOpacity: 0.18,
                          shadowRadius: d(12),
                          shadowOffset: { width: 0, height: d(4) },
                          elevation: 4,
                        } as ViewStyle
                      }
                    >
                      <View
                        style={{
                          width: d(30),
                          height: d(30),
                          borderRadius: t.radius.full,
                          backgroundColor: t.colors.bg[c.thumb],
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon name={c.icon} size={d(16)} color={thumbIconTone(c.thumb)} />
                      </View>
                      <View>
                        <Text variant="labelS" color={ink.title} style={{ fontSize: d(12), lineHeight: d(16) }}>
                          {c.title}
                        </Text>
                        <Text
                          variant="caption"
                          color={ink.sub}
                          style={{ fontSize: d(12), lineHeight: d(16), opacity: 0.75 }}
                        >
                          {c.sub}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Body — Figma: (24, 580), width 342 */}
            <Text
              variant="bodyL"
              tone="secondary"
              style={{
                position: 'absolute',
                left: d(24),
                top: insets.top + d(534),
                width: d(342),
                fontSize: d(16),
                lineHeight: d(24),
              }}
            >
              {s.body}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Pagination — Figma: (24, 672), gap 7, active 28x8 */}
      <View
        style={{
          position: 'absolute',
          left: d(24),
          top: insets.top + d(626),
          flexDirection: 'row',
          alignItems: 'center',
          gap: d(7),
        }}
      >
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={{
              width: i === index ? d(28) : d(8),
              height: d(8),
              borderRadius: t.radius.full,
              backgroundColor: i === index ? t.colors.bg.brand : t.colors.bg.surfaceRaised,
            }}
          />
        ))}
      </View>

      {/* CTA — Figma: (24, 708), 342 x 62, split pill with a 46pt dark arrow */}
      <Pressable
        onPress={next}
        accessibilityRole="button"
        accessibilityLabel={SLIDES[index].cta}
        style={{
          position: 'absolute',
          left: d(24),
          top: insets.top + d(662),
          width: d(342),
          height: d(62),
          borderRadius: t.radius.full,
          backgroundColor: t.colors.bg.brand,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: d(28),
          paddingRight: d(8),
        }}
      >
        <Text variant="labelL" color={t.colors.text.onBrand} style={{ fontSize: d(16), lineHeight: d(20) }}>
          {SLIDES[index].cta}
        </Text>
        <View
          style={{
            width: d(46),
            height: d(46),
            borderRadius: t.radius.full,
            backgroundColor: t.colors.bg.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="arrow-right" size={d(20)} color={t.colors.icon.primary} />
        </View>
      </Pressable>
    </View>
  );
}
