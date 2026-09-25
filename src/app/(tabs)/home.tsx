/**
 * Home — ported 1:1 from Figma node 38:2 (SRS §4.B Tab 1).
 *
 * Figma lays this out as a vertical auto-layout scroll frame, so this is flex
 * rather than absolute — but every gap, padding, size and radius is transcribed
 * from the design and scaled by useDesignScale().
 *
 * Hero Action Card rule from the component docs: "THE loud card. One per screen,
 * never two. All ink is text/on-brand because every tone is a light,
 * high-chroma surface. Never put white text on these."
 */
import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { Text } from '@/components/ui/Text';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PrescriptionCard } from '@/components/ui/PrescriptionCard';
import { PromoCarousel } from '@/components/ui/PromoCarousel';
import { Shimmer, SkeletonBlock } from '@/components/ui/Skeleton';
import { usePromotions } from '@/features/promotions/queries';
import { usePrescriptionStore } from '@/features/prescriptions/store';
import { useCartCount } from '@/features/cart/useCart';
import { useProfile } from '@/features/profile/store';
import { firstName, greetingFor, initialsOf } from '@/lib/profile';
import { Avatar } from '@/components/ui/Avatar';
import { homeCategories } from '@/lib/catalog';
import { useProducts } from '@/features/catalog/queries';
import { defineStrings, translate, useLocale, useT } from '@/i18n';

const S = defineStrings({
  en: {
    greetMorning: 'Good morning',
    greetAfternoon: 'Good afternoon',
    greetEvening: 'Good evening',
    yourProfile: 'Your profile',
    yourAvatar: 'Your avatar',
    notifications: 'Notifications',
    cart: 'Cart',
    badgeOne: '{label}, {count} item',
    badgeMany: '{label}, {count} items',
    viewAll: 'View all',
    viewAllA11y: 'View all {title}',
    eyebrow: 'FASTEST WAY TO ORDER',
    heroTitle: 'Upload a prescription',
    heroBody: 'Snap it, send it. A licensed partner pharmacist reviews and fulfils it for you.',
    uploadNow: 'Upload now',
    shopByCategory: 'Shop by category',
    recent: 'Recent prescriptions',
    stampVerified: 'Verified {date} · {time}',
    stampReviewed: 'Reviewed {date} · {time}',
    stampUploaded: 'Uploaded {date} · {time}',
    catPrescriptions: 'Prescriptions',
    catOtc: 'Over the counter',
    catVitamins: 'Vitamins',
    catFitness: 'Fitness',
    subUploadTrack: 'Upload & track',
    subBrowse: 'Browse',
    subItemsOne: '{count} item',
    subItemsMany: '{count} items',
    subPlans: '{count} plans',
  },
  fr: {
    greetMorning: 'Bonjour',
    greetAfternoon: 'Bon après-midi',
    greetEvening: 'Bonsoir',
    yourProfile: 'Votre profil',
    yourAvatar: 'Votre avatar',
    notifications: 'Notifications',
    cart: 'Panier',
    badgeOne: '{label}, {count} article',
    badgeMany: '{label}, {count} articles',
    viewAll: 'Tout voir',
    viewAllA11y: 'Tout voir : {title}',
    eyebrow: 'LE PLUS RAPIDE POUR COMMANDER',
    heroTitle: 'Envoyer une ordonnance',
    heroBody:
      'Prenez-la en photo, envoyez-la. Un pharmacien partenaire agréé la vérifie et la prépare pour vous.',
    uploadNow: 'Envoyer',
    shopByCategory: 'Acheter par catégorie',
    recent: 'Ordonnances récentes',
    stampVerified: 'Vérifiée le {date} · {time}',
    stampReviewed: 'Examinée le {date} · {time}',
    stampUploaded: 'Envoyée le {date} · {time}',
    catPrescriptions: 'Ordonnances',
    catOtc: 'Sans ordonnance',
    catVitamins: 'Vitamines',
    catFitness: 'Forme',
    subUploadTrack: 'Envoyer et suivre',
    subBrowse: 'Parcourir',
    subItemsOne: '{count} article',
    subItemsMany: '{count} articles',
    subPlans: '{count} programmes',
  },
  tw: {
    greetMorning: 'Maakye',
    greetAfternoon: 'Maaha',
    greetEvening: 'Maadwo',
    yourProfile: 'Wo ho nsɛm',
    yourAvatar: 'Wo mfonini',
    notifications: 'Nkaeɛ',
    cart: 'Kɛntɛn',
    badgeOne: '{label}, adeɛ {count}',
    badgeMany: '{label}, nneɛma {count}',
    viewAll: 'Hwɛ ne nyinaa',
    viewAllA11y: 'Hwɛ {title} nyinaa',
    eyebrow: 'ƐKWAN A ƐYƐ NTƐM PAA',
    heroTitle: 'Fa nnuro krataa to so',
    heroBody:
      'Twa ne mfonini, fa kɔ. Nnuro ho ɔbenfoɔ a ɔwɔ tumi bɛhwɛ so na wasiesie ama wo.',
    uploadNow: 'Fa to so seesei',
    shopByCategory: 'Tɔ nneɛma wɔ akuo mu',
    recent: 'Nnuro krataa a ɛbaa nnansa yi',
    stampVerified: 'Wɔagye atom {date} · {time}',
    stampReviewed: 'Wɔahwɛ mu {date} · {time}',
    stampUploaded: 'Wɔde too so {date} · {time}',
    catPrescriptions: 'Nnuro krataa',
    catOtc: 'Nnuro a wɔtɔ ara kwa',
    catVitamins: 'Vitamin',
    catFitness: 'Apɔw-mu-tenten',
    subUploadTrack: 'Fa to so na di akyi',
    subBrowse: 'Hwehwɛ mu',
    subItemsOne: 'adeɛ {count}',
    subItemsMany: 'nneɛma {count}',
    subPlans: 'nhyehyɛeɛ {count}',
  },
  gaa: {
    greetMorning: 'Leebi kpakpa',
    greetAfternoon: 'Shwane kpakpa',
    greetEvening: 'Gbɛkɛ kpakpa',
    yourProfile: 'Bo he saji',
    yourAvatar: 'Bo mfoniri',
    notifications: 'Kaimɔi',
    cart: 'Kɛntɛŋ',
    badgeOne: '{label}, nɔ {count}',
    badgeMany: '{label}, nibii {count}',
    viewAll: 'Kwɛ fɛɛ',
    viewAllA11y: 'Kwɛ {title} fɛɛ',
    eyebrow: 'GBƐ NI YAA OYA FE FƐƐ',
    heroTitle: 'Kɛ tsofa wolo wo mli',
    heroBody: 'Fɔ mfoniri, ni okɛmaje. Tsofatsɛ ni ahe lɛ gbɛ baakwɛ nɔ ni esaa ha bo.',
    uploadNow: 'Kɛwo mli bianɛ',
    shopByCategory: 'He nibii yɛ akuu naa',
    recent: 'Tsofa woloi ni ba nyɛ',
    stampVerified: 'Aye lɛ odase {date} · {time}',
    stampReviewed: 'Akwɛ lɛ {date} · {time}',
    stampUploaded: 'Akɛwo mli {date} · {time}',
    catPrescriptions: 'Tsofa woloi',
    catOtc: 'Tsofai ni ahɔɔ',
    catVitamins: 'Vitamin',
    catFitness: 'Gbɔmɔtso hewalɛ',
    subUploadTrack: 'Kɛwo mli ni oti sɛɛ',
    subBrowse: 'Kwɛmɔ',
    subItemsOne: 'nɔ {count}',
    subItemsMany: 'nibii {count}',
    subPlans: 'gbɛjianɔtoi {count}',
  },
  ee: {
    greetMorning: 'Ŋdi na wò',
    greetAfternoon: 'Ŋdɔ na wò',
    greetEvening: 'Fiẽ na wò',
    yourProfile: 'Wò ŋutinyawo',
    yourAvatar: 'Wò foto',
    notifications: 'Nyanyuiwo',
    cart: 'Kusi',
    badgeOne: '{label}, nu {count}',
    badgeMany: '{label}, nu {count}',
    viewAll: 'Kpɔ wo katã',
    viewAllA11y: 'Kpɔ {title} katã',
    eyebrow: 'MƆ SI LE KABA WU',
    heroTitle: 'Ɖo atikeŋɔŋlɔ ɖa',
    heroBody:
      'Ɖe foto, ɖoe ɖa. Atikewɔla si woɖo kpe edzi alé ŋku ɖe eŋu eye wòawɔe na wò.',
    uploadNow: 'Ɖoe ɖa fifia',
    shopByCategory: 'Ƒle nu le hatsotsowo nu',
    recent: 'Atikeŋɔŋlɔ yeyewo',
    stampVerified: 'Woɖo kpe edzi {date} · {time}',
    stampReviewed: 'Wodzro eme {date} · {time}',
    stampUploaded: 'Woɖoe ɖa {date} · {time}',
    catPrescriptions: 'Atikeŋɔŋlɔwo',
    catOtc: 'Atike siwo woƒlena bɔbɔe',
    catVitamins: 'Vitamin',
    catFitness: 'Ŋutilãkamedede',
    subUploadTrack: 'Ɖoe ɖa eye nàkpɔ eŋu',
    subBrowse: 'Kpɔ nuwo',
    subItemsOne: 'nu {count}',
    subItemsMany: 'nu {count}',
    subPlans: 'ɖoɖo {count}',
  },
  ha: {
    greetMorning: 'Ina kwana',
    greetAfternoon: 'Ina wuni',
    greetEvening: 'Barka da yamma',
    yourProfile: 'Bayananka',
    yourAvatar: 'Hotonka',
    notifications: 'Sanarwa',
    cart: 'Kwando',
    badgeOne: '{label}, abu {count}',
    badgeMany: '{label}, abubuwa {count}',
    viewAll: 'Duba duka',
    viewAllA11y: 'Duba duka {title}',
    eyebrow: 'HANYA MAFI SAURI TA YIN ODA',
    heroTitle: 'Ɗora takardar magani',
    heroBody:
      'Ɗauki hotonta, ka aika. Mai harhaɗa magani abokin hulɗa mai lasisi zai duba ya shirya maka.',
    uploadNow: 'Ɗora yanzu',
    shopByCategory: 'Saya bisa rukuni',
    recent: 'Takardun magani na baya-bayan nan',
    stampVerified: 'An tabbatar {date} · {time}',
    stampReviewed: 'An duba {date} · {time}',
    stampUploaded: 'An ɗora {date} · {time}',
    catPrescriptions: 'Takardun magani',
    catOtc: 'Ba sai da takarda ba',
    catVitamins: 'Bitamin',
    catFitness: 'Motsa jiki',
    subUploadTrack: 'Ɗora ka bibiya',
    subBrowse: 'Duba',
    subItemsOne: 'abu {count}',
    subItemsMany: 'abubuwa {count}',
    subPlans: 'shirye-shirye {count}',
  },
});

type Key = keyof (typeof S)['en'];

// `greetingFor` and `homeCategories` live in lib and return English; these map
// their output to keys here. Anything unrecognised is shown as it came.
const GREETINGS: Record<string, Key> = {
  'Good morning': 'greetMorning',
  'Good afternoon': 'greetAfternoon',
  'Good evening': 'greetEvening',
};
const CATEGORY_TITLES: Record<string, Key> = {
  Prescriptions: 'catPrescriptions',
  'Over the counter': 'catOtc',
  Vitamins: 'catVitamins',
  Fitness: 'catFitness',
};

/** Category tiles bind to `colors.tile.*` — see IconTile in ListRow.tsx. */
type TileHue = 'mint' | 'blue' | 'gold' | 'pink';

// Icons come from the Category Tile's `Icon` instance-swap property in Figma
// (added 2026-08-24 — the component previously had no icon property at all, so
// every tile inherited the master's camera glyph).

/** "Verified 23 Aug 2026 · 05:41 PM" — the card's third line. */
function stamp(
  p: { status: string; uploadedAt: number; reviewedAt?: number },
  locale: string,
): string {
  const key: Key =
    p.status === 'VERIFIED'
      ? 'stampVerified'
      : p.status === 'REJECTED'
        ? 'stampReviewed'
        : 'stampUploaded';
  const at = new Date(p.reviewedAt ?? p.uploadedAt);
  const date = at.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  const time = at
    .toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: true })
    .toUpperCase();
  return translate(S, key, { date, time });
}

export default function Home() {
  const profile = useProfile();
  const t = useTokens();
  const tr = useT(S);
  const locale = useLocale();
  const { d } = useDesignScale();
  const insets = useSafeAreaInsets();
  const cartCount = useCartCount();
  // The newest script, whatever state it is in. Showing only VERIFIED ones
  // would hide the rejection the user most needs to see.
  const recent = usePrescriptionStore((s) => s.items.find((p) => !p.hidden && !p.archived));
  const { data: promotions, isPending: promosPending } = usePromotions();
  // Category counts come from the catalogue itself — see `homeCategories`.
  const { data: products } = useProducts();
  const CATEGORIES = homeCategories(products);

  const greeting = greetingFor();
  const categoryTitle = (title: string) => {
    const key = CATEGORY_TITLES[title];
    return key ? tr(key) : title;
  };
  const categorySub = (sub: string) => {
    if (sub === 'Upload & track') return tr('subUploadTrack');
    if (sub === 'Browse') return tr('subBrowse');
    const m = /^(\d+) (item|items|plans)$/.exec(sub);
    if (!m) return sub;
    const count = Number(m[1]);
    if (m[2] === 'plans') return tr('subPlans', { count });
    return tr(count === 1 ? 'subItemsOne' : 'subItemsMany', { count });
  };

  const RoundAction = ({
    icon,
    label,
    onPress,
    badge = 0,
  }: {
    icon: IconName;
    label: string;
    onPress?: () => void;
    badge?: number;
  }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        badge ? tr(badge === 1 ? 'badgeOne' : 'badgeMany', { label, count: badge }) : label
      }
      onPress={onPress}
      style={{
        width: d(44),
        height: d(44),
        borderRadius: t.radius.full,
        backgroundColor: t.colors.bg.surfaceRaised,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={d(20)} tone="primary" />
      {badge ? (
        <View
          style={{
            position: 'absolute',
            top: d(1),
            right: d(1),
            minWidth: d(18),
            height: d(18),
            paddingHorizontal: d(5),
            borderRadius: t.radius.full,
            backgroundColor: t.colors.bg.brand,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: d(2),
            borderColor: t.colors.bg.canvas,
          }}
        >
          <Text
            variant="labelXS"
            color={t.colors.text.onBrand}
            style={{ fontSize: d(10), lineHeight: d(13) }}
          >
            {badge > 9 ? '9+' : badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );

  const SectionHeader = ({ title, onAction }: { title: string; onAction?: () => void }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(12), height: d(40) }}>
      <Text variant="headingL" style={{ flex: 1, fontSize: d(20), lineHeight: d(26) }}>
        {title}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tr('viewAllA11y', { title })}
        onPress={onAction}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: d(4),
          paddingLeft: d(14),
          paddingRight: d(10),
          paddingVertical: d(7),
          borderRadius: t.radius.full,
          backgroundColor: t.colors.bg.surfaceRaised,
        }}
      >
        <Text variant="labelS" tone="secondary" style={{ fontSize: d(12), lineHeight: d(16) }}>
          {tr('viewAll')}
        </Text>
        <Icon name="chevron-right" size={d(16)} tone="secondary" />
      </Pressable>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + d(18),
          paddingHorizontal: d(24),
          paddingBottom: d(120) + insets.bottom,
          gap: d(20),
        }}
      >
        {/* Top App Bar — 56 high: avatar + greeting + two actions */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(12), height: d(56) }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr('yourProfile')}
            onPress={() => router.push('/profile')}
            hitSlop={4}
          >
            <Avatar
              initials={initialsOf(profile.name) || '?'}
              uri={profile.avatarUrl}
              preset={profile.avatarPreset}
              size={44}
              label={tr('yourAvatar')}
            />
          </Pressable>
          <View style={{ flex: 1, gap: d(2) }}>
            <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
              {GREETINGS[greeting] ? tr(GREETINGS[greeting]) : greeting}
            </Text>
            {/* First name only: a greeting, not a form. "Good evening, Samuel",
                not the full name with its bracketed middle name. */}
            <Text variant="headingM" numberOfLines={1} style={{ fontSize: d(18), lineHeight: d(24) }}>
              {firstName(profile.name)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: d(8) }}>
            <RoundAction
              icon="notification"
              label={tr('notifications')}
              onPress={() => router.push('/notifications')}
            />
            {/* Figma draws an overflow "more" in this slot with nothing behind
                it. The cart had no entry point on any tab root, so it takes the
                slot rather than adding a sixth control to a 56pt bar. */}
            <RoundAction
              icon="cart"
              label={tr('cart')}
              badge={cartCount}
              onPress={() => router.push('/cart')}
            />
          </View>
        </View>

        {/* Promo carousel. Replaces the search field that used to sit here —
            that field was not a search box, it pushed straight to /catalog, and
            the Catalog tab plus the category grid below both still go there. */}
        {promosPending ? (
          <Shimmer>
            {/* Same shape as the ad slot, so the layout does not jump. */}
            <SkeletonBlock width="100%" height={164} radius={28} />
          </Shimmer>
        ) : (
          <PromoCarousel
            promotions={promotions ?? []}
            onPress={(promo) => router.push(promo.href as never)}
          />
        )}

        {/* Hero Action Card — one per screen, all ink text/on-brand */}
        <View
          style={{
            backgroundColor: t.colors.bg.brand,
            borderRadius: d(36),
            padding: d(24),
            gap: d(16),
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(12) }}>
            <Text
              variant="labelXS"
              color={t.colors.text.onBrand}
              style={{ flex: 1, opacity: 0.7, fontSize: d(11), lineHeight: d(14) }}
            >
              {tr('eyebrow')}
            </Text>
            <View
              style={{
                width: d(44),
                height: d(44),
                borderRadius: t.radius.full,
                backgroundColor: t.colors.bg.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="camera" size={d(22)} tone="primary" />
            </View>
          </View>

          <Text
            variant="headingXL"
            color={t.colors.text.onBrand}
            style={{ fontSize: d(24), lineHeight: d(30) }}
          >
            {tr('heroTitle')}
          </Text>
          <Text
            variant="bodyM"
            color={t.colors.text.onBrand}
            style={{ opacity: 0.78, fontSize: d(14), lineHeight: d(21) }}
          >
            {tr('heroBody')}
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr('uploadNow')}
            onPress={() => router.push('/prescriptions')}
            style={{
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: d(8),
              paddingHorizontal: d(22),
              paddingVertical: d(13),
              borderRadius: t.radius.full,
              backgroundColor: t.colors.bg.surface,
            }}
          >
            <Text variant="labelM" tone="primary" style={{ fontSize: d(14), lineHeight: d(18) }}>
              {tr('uploadNow')}
            </Text>
            <Icon name="prescription" size={d(18)} tone="primary" />
          </Pressable>
        </View>

        <SectionHeader title={tr('shopByCategory')} onAction={() => router.push('/catalog')} />

        {/* Category grid — 2 x 2, gap 14, tiles radius 28 padding 18 */}
        <View style={{ gap: d(14) }}>
          {[CATEGORIES.slice(0, 2), CATEGORIES.slice(2, 4)].map((row, r) => (
            <View key={r} style={{ flexDirection: 'row', gap: d(14) }}>
              {row.map((c) => (
                <Pressable
                  key={c.title}
                  accessibilityRole="button"
                  accessibilityLabel={`${categoryTitle(c.title)}. ${categorySub(c.sub)}`}
                  onPress={() => router.push(c.href as never)}
                  style={({ pressed }) => ({
                    flex: 1,
                    backgroundColor: t.colors.bg.surfaceRaised,
                    borderRadius: d(28),
                    padding: d(18),
                    gap: d(14),
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <View
                    style={{
                      width: d(40),
                      height: d(40),
                      borderRadius: d(13),
                      backgroundColor: t.colors.tile[`${c.hue}Bg`],
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name={c.icon} size={d(20)} color={t.colors.tile[`${c.hue}Icon`]} />
                  </View>
                  <Text
                    variant="labelL"
                    numberOfLines={2}
                    style={{ fontSize: d(16), lineHeight: d(20) }}
                  >
                    {categoryTitle(c.title)}
                  </Text>
                  {/* Pinned to the bottom of the tile. Tiles in a row stretch to
                      the taller one, so this keeps the counts on a single
                      baseline if a title ever wraps — without the dead gap that
                      reserving a second title line leaves when it does not. */}
                  <Text
                    variant="caption"
                    tone="primary"
                    numberOfLines={1}
                    style={{
                      marginTop: 'auto',
                      opacity: 0.7,
                      fontSize: d(12),
                      lineHeight: d(16),
                    }}
                  >
                    {categorySub(c.sub)}
                  </Text>
                </Pressable>
              ))}
            </View>
          ))}
        </View>

        {recent ? (
          <>
            <SectionHeader
              title={tr('recent')}
              onAction={() => router.push('/prescriptions')}
            />
            <PrescriptionCard
              title={`TrxID ${recent.id}`}
              note={recent.note}
              timestamp={stamp(recent, locale)}
              status={recent.status}
              onPress={() =>
                router.push(
                  recent.status === 'REJECTED'
                    ? `/prescription-rejected?id=${recent.id}`
                    : `/prescription-viewer?id=${recent.id}`,
                )
              }
            />
          </>
        ) : null}

      </ScrollView>
    </View>
  );
}
