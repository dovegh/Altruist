/**
 * Welcome / sign-in options — ported 1:1 from Figma node 63:61.
 *
 * Coordinates are transcribed verbatim from the design canvas and scaled by
 * useDesignScale(). Do not convert to flex.
 *
 * The headline is dark ink on mint because mint/500 is a LIGHT surface —
 * white on it measures 1.8:1 and fails AA outright.
 *
 * Apple and Google marks are the only components exempt from the token system:
 * theming must never recolour another company's logo. Both are stand-ins for
 * layout — ship the official assets before release, and note that App Store
 * Review Guideline 4.8 makes Sign in with Apple mandatory once Google is offered.
 */
import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { PartnerChip, type PartnerChipSpec } from '@/components/PartnerChip';
import { GoogleMark, AppleMark } from '@/components/BrandMarks';
import { usePartnerPharmacy } from '@/features/profile/store';
import { shortName, type Pharmacy } from '@/lib/pharmacies';
import { FREE_DELIVERY_OVER } from '@/features/cart/useCart';
import { cedis } from '@/lib/money';
import { DeclinedError, NetworkError, signInWithProvider, type OAuthProvider } from '@/lib/api';
import { setSession } from '@/lib/session';
import { defineStrings, useT } from '@/i18n';

// "Pharmacy Council" is the regulator's name and stays as it is.
const S = defineStrings({
  en: {
    verifiedPartner: 'Verified partner',
    pcLicensed: 'PC licensed',
    rxIn40: 'Rx in 40 min',
    fastestToday: 'Fastest today',
    freeDelivery: 'Free delivery',
    overAmount: 'Over {amount}',
    sameDay: 'Same-day',
    acrossAccra: 'Across Accra',
    headYour: 'Your',
    headPharmacy: 'pharmacy',
    headStarts: 'starts',
    headHere: 'here.',
    networkError: 'Could not reach Altruist. Check your connection and try again.',
    serverError: 'Something went wrong on our side. Try again in a moment.',
    goBack: 'Go back',
    continueEmail: 'Continue with Email',
    continueApple: 'Continue with Apple',
    continueGoogle: 'Continue with Google',
    loginA11y: 'Already have an account? Log in',
    haveAccount: 'Already have an account?',
    logIn: 'Log in',
  },
  fr: {
    verifiedPartner: 'Partenaire vérifié',
    pcLicensed: 'Agréé PC',
    rxIn40: 'Ordonnance en 40 min',
    fastestToday: "Le plus rapide aujourd'hui",
    freeDelivery: 'Livraison gratuite',
    overAmount: 'Dès {amount}',
    sameDay: 'Le jour même',
    acrossAccra: 'Dans tout Accra',
    headYour: 'Votre',
    headPharmacy: 'pharmacie',
    headStarts: 'commence',
    headHere: 'ici.',
    networkError: 'Impossible de joindre Altruist. Vérifiez votre connexion et réessayez.',
    serverError: 'Un problème est survenu de notre côté. Réessayez dans un instant.',
    goBack: 'Retour',
    continueEmail: 'Continuer avec un e-mail',
    continueApple: 'Continuer avec Apple',
    continueGoogle: 'Continuer avec Google',
    loginA11y: 'Vous avez déjà un compte ? Se connecter',
    haveAccount: 'Vous avez déjà un compte ?',
    logIn: 'Se connecter',
  },
  tw: {
    verifiedPartner: 'Ɔhokafoɔ a yɛagye no atom',
    pcLicensed: 'PC ama no krataa',
    rxIn40: 'Rx wɔ simma 40 mu',
    fastestToday: 'Ɛyɛ ntɛm sen biara ɛnnɛ',
    freeDelivery: 'Yɛde bɛbrɛ wo kwa',
    overAmount: 'Ɛboro {amount}',
    sameDay: 'Da no ara',
    acrossAccra: 'Accra nyinaa',
    headYour: 'Wo',
    headPharmacy: 'nnuro tɔnbea',
    headStarts: 'hyɛ ase',
    headHere: 'ha.',
    networkError: 'Yɛantumi anka Altruist. Hwɛ wo intanɛt na san sɔ hwɛ.',
    serverError: 'Biribi ankɔ yie wɔ yɛn fam. San sɔ hwɛ nkyɛ kakra.',
    goBack: 'San kɔ akyi',
    continueEmail: 'Kɔ so wɔ Email so',
    continueApple: 'Kɔ so wɔ Apple so',
    continueGoogle: 'Kɔ so wɔ Google so',
    loginA11y: 'Wowɔ akontaa dada? Kɔ mu',
    haveAccount: 'Wowɔ akontaa dada?',
    logIn: 'Kɔ mu',
  },
  gaa: {
    verifiedPartner: 'Hefatalɔ ni ahe gbɛ',
    pcLicensed: 'PC eha gbɛ',
    rxIn40: 'Rx yɛ minitii 40 mli',
    fastestToday: 'Eyaa oya fe fɛɛ ŋmɛnɛ',
    freeDelivery: 'Wɔkɛbaa yaka',
    overAmount: 'Ni fe {amount}',
    sameDay: 'Nakai gbi lɛ nɔŋŋ',
    acrossAccra: 'Accra fɛɛ',
    headYour: 'O',
    headPharmacy: 'tsofa shĩa',
    headStarts: 'je shishi',
    headHere: 'biɛ.',
    networkError: 'Ashɛɛɛ Altruist nɔ. Kwɛ o intanɛt ni oka ekoŋŋ.',
    serverError: 'Nɔko tɔ̃ yɛ wɔ gbɛfaŋ. Ka ekoŋŋ yɛ be fioo sɛɛ.',
    goBack: 'Kua sɛɛ',
    continueEmail: 'Ya nɔ kɛ Email',
    continueApple: 'Ya nɔ kɛ Apple',
    continueGoogle: 'Ya nɔ kɛ Google',
    loginA11y: 'Oyɛ akɔŋt momo? Bote mli',
    haveAccount: 'Oyɛ akɔŋt momo?',
    logIn: 'Bote mli',
  },
  ee: {
    verifiedPartner: 'Hadɔwɔla si woɖo kpe edzi',
    pcLicensed: 'PC ɖe mɔ nɛ',
    rxIn40: 'Rx le aɖabaƒoƒo 40 me',
    fastestToday: 'Esi ƒo kabakaba wu egbe',
    freeDelivery: 'Nuɖoɖo femaxee',
    overAmount: 'Si wu {amount}',
    sameDay: 'Ŋkeke ma ke dzi',
    acrossAccra: 'Accra katã',
    headYour: 'Wò',
    headPharmacy: 'atikedzraƒe',
    headStarts: 'dze egɔme',
    headHere: 'afii.',
    networkError: 'Míete ŋu ɖo Altruist gbɔ o. Kpɔ wò intanɛt eye nàgate kpɔ.',
    serverError: 'Nane gblẽ le mía gbɔ. Gate kpɔ le ɣeyiɣi kpui aɖe megbe.',
    goBack: 'Trɔ yi megbe',
    continueEmail: 'Yi edzi kple Email',
    continueApple: 'Yi edzi kple Apple',
    continueGoogle: 'Yi edzi kple Google',
    loginA11y: 'Akɔnta le asiwò xoxo? Ge ɖe eme',
    haveAccount: 'Akɔnta le asiwò xoxo?',
    logIn: 'Ge ɖe eme',
  },
  ha: {
    verifiedPartner: 'Abokin hulɗa da aka tabbatar',
    pcLicensed: 'Lasisin PC',
    rxIn40: 'Rx cikin minti 40',
    fastestToday: 'Mafi sauri yau',
    freeDelivery: 'Kawowa kyauta',
    overAmount: 'Sama da {amount}',
    sameDay: 'A rana ɗaya',
    acrossAccra: 'Duk faɗin Accra',
    headYour: 'Kantin',
    headPharmacy: 'maganinka',
    headStarts: 'ya fara',
    headHere: 'a nan.',
    networkError: 'Ba a iya kaiwa ga Altruist ba. Duba haɗin intanet ɗinka ka sake gwadawa.',
    serverError: 'Wani abu ya faru a ɓangarenmu. Sake gwadawa nan da ɗan lokaci.',
    goBack: 'Koma baya',
    continueEmail: 'Ci gaba da Imel',
    continueApple: 'Ci gaba da Apple',
    continueGoogle: 'Ci gaba da Google',
    loginA11y: 'Kana da asusu? Shiga',
    haveAccount: 'Kana da asusu?',
    logIn: 'Shiga',
  },
});

type Key = keyof (typeof S)['en'];
type Tr = (key: Key, vars?: Record<string, string | number>) => string;

// Partner facts on the chips come from the partner record, not the copy deck.
const chipsFor = (p: Pharmacy, tr: Tr): PartnerChipSpec[] => [
  {
    box: { left: 16.39, top: 300, width: 152.503, height: 63.694 },
    rotate: 7,
    surface: 'accentCream',
    thumb: 'surface',
    icon: 'shield-check',
    title: shortName(p),
    sub: tr('verifiedPartner'),
  },
  {
    box: { left: 178, top: 270.01, width: 147.025, height: 60.696 },
    rotate: -6,
    surface: 'surface',
    thumb: 'accentGold',
    icon: 'shield-check',
    title: p.hours,
    sub: p.locality,
  },
  {
    box: { left: 10, top: 345.68, width: 165.812, height: 57.258 },
    rotate: -4,
    surface: 'accentBlue',
    thumb: 'surface',
    icon: 'shield-check',
    title: tr('pcLicensed'),
    sub: 'Pharmacy Council',
  },
  {
    box: { left: 163.99, top: 352, width: 141.484, height: 57.852 },
    rotate: 5,
    surface: 'accentPink',
    thumb: 'surface',
    icon: 'shield-check',
    title: tr('rxIn40'),
    sub: tr('fastestToday'),
  },
  {
    box: { left: 37.59, top: 418, width: 136.224, height: 52.95 },
    rotate: 3,
    surface: 'surface',
    thumb: 'brand',
    icon: 'shield-check',
    title: tr('freeDelivery'),
    sub: tr('overAmount', { amount: cedis(FREE_DELIVERY_OVER) }),
  },
  {
    box: { left: 196, top: 405.96, width: 138.607, height: 61.988 },
    rotate: -7,
    surface: 'surface',
    thumb: 'accentBlue',
    icon: 'shield-check',
    title: tr('sameDay'),
    sub: tr('acrossAccra'),
  },
];

const HEAD: { key: Key; highlight?: boolean }[] = [
  { key: 'headYour' },
  { key: 'headPharmacy' },
  { key: 'headStarts' },
  { key: 'headHere', highlight: true },
];

export default function Welcome() {
  const tr = useT(S);
  const t = useTokens();
  const { name: themeName } = useTheme();
  const { d } = useDesignScale();
  const pharmacy = usePartnerPharmacy();
  const [authError, setAuthError] = useState<string | null>(null);

  /**
   * The provider buttons used to drop straight into Home without signing
   * anybody in. They now run the real flow and report what actually happened —
   * including "this provider is not enabled", which is the truth until one is
   * configured on the Supabase project.
   */
  const continueWith = async (provider: OAuthProvider) => {
    setAuthError(null);
    try {
      const session = await signInWithProvider(provider);
      await setSession(session.userId);
      router.replace('/home');
    } catch (e) {
      setAuthError(
        e instanceof NetworkError
          ? tr('networkError')
          : e instanceof DeclinedError
            ? e.message
            : tr('serverError'),
      );
    }
  };
  const CHIPS = chipsFor(pharmacy, tr);
  const insets = useSafeAreaInsets();

  // Figma's canvas puts y=0 at the screen top, above a 46pt status area.
  // Offset by the real inset so the card clears the notch identically.
  const y = (designY: number) => insets.top + d(designY - 46);

  const AuthButton = ({
    label,
    top,
    tone,
    bordered,
    leading,
    onPress,
  }: {
    label: string;
    top: number;
    tone: 'surface' | 'surfaceRaised';
    bordered?: boolean;
    leading: React.ReactNode;
    onPress: () => void;
  }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        position: 'absolute',
        left: d(24),
        top: y(top),
        width: d(342),
        height: d(56),
        borderRadius: t.radius.full,
        backgroundColor: t.colors.bg[tone],
        borderWidth: bordered ? 1 : 0,
        borderColor: t.colors.border.default,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: d(10),
        opacity: pressed ? 0.9 : 1,
      })}
    >
      {leading}
      <Text variant="labelL" tone="primary" style={{ fontSize: d(16), lineHeight: d(20) }}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      {/* Hero card — Figma: 358 x 491 at (16, 52), radius 36, clipped */}
      <View
        style={{
          position: 'absolute',
          left: d(16),
          top: y(52),
          width: d(358),
          height: d(491),
          borderRadius: d(36),
          backgroundColor: t.colors.bg.brand,
          overflow: 'hidden',
        }}
      >
        {/* Back — 44pt circle at (20, 20) on bg/brand-pressed */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('goBack')}
          onPress={() => router.back()}
          style={{
            position: 'absolute',
            left: d(20),
            top: d(20),
            width: d(44),
            height: d(44),
            borderRadius: t.radius.full,
            backgroundColor: t.colors.bg.brandPressed,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="arrow-left" size={d(20)} color={t.colors.icon.onBrand} />
        </Pressable>

        {/* Headline — (28, 88), width 298, Display/L, wrap gap 4 / 11 */}
        <View
          style={{
            position: 'absolute',
            left: d(28),
            top: d(88),
            width: d(298),
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            rowGap: d(4),
            columnGap: d(11),
          }}
        >
          {HEAD.map((w, i) =>
            w.highlight ? (
              <View
                key={i}
                style={{
                  backgroundColor: t.colors.bg.surface,
                  borderRadius: t.radius.full,
                  paddingHorizontal: d(18),
                  paddingTop: d(2),
                  paddingBottom: d(6),
                }}
              >
                <Text variant="displayL" tone="primary" style={{ fontSize: d(40), lineHeight: d(44) }}>
                  {tr(w.key)}
                </Text>
              </View>
            ) : (
              <Text
                key={i}
                variant="displayL"
                color={t.colors.text.onBrand}
                style={{ fontSize: d(40), lineHeight: d(44) }}
              >
                {tr(w.key)}
              </Text>
            ),
          )}
        </View>

        {CHIPS.map((c, i) => (
          <PartnerChip key={i} spec={c} />
        ))}
      </View>

      {/* Continue with Email — (24, 560), bg/surface, 22pt icon well */}
      <AuthButton
        label={tr('continueEmail')}
        top={560}
        tone="surface"
        onPress={() => router.push('/register')}
        leading={
          <View
            style={{
              width: d(22),
              height: d(22),
              borderRadius: t.radius.full,
              backgroundColor: t.colors.bg.surfaceRaised,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="profile" size={d(15)} tone="primary" />
          </View>
        }
      />

      {/* Sign in with Apple — HIG permits black or white only, never brand mint.
          The button is a surface, light in light mode, so the mark follows the
          theme: black on light, white on dark. It was always white, which drew
          a white apple on a white button. */}
      <AuthButton
        label={tr('continueApple')}
        top={628}
        tone="surfaceRaised"
        bordered
        onPress={() => continueWith('apple')}
        leading={<AppleMark size={d(20)} tone={themeName === 'light' ? 'black' : 'white'} />}
      />

      <AuthButton
        label={tr('continueGoogle')}
        top={696}
        tone="surfaceRaised"
        bordered
        onPress={() => continueWith('google')}
        leading={<GoogleMark size={d(20)} />}
      />

      {authError ? (
        <Text
          accessibilityLiveRegion="polite"
          variant="bodyS"
          tone="danger"
          center
          style={{
            position: 'absolute',
            left: d(24),
            right: d(24),
            top: y(798),
            fontSize: d(13),
            lineHeight: d(19),
          }}
          numberOfLines={2}
        >
          {authError}
        </Text>
      ) : null}

      {/* Log in — (24, 766), height 24 */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tr('loginA11y')}
        onPress={() => router.push('/login')}
        style={{
          position: 'absolute',
          left: d(24),
          top: y(766),
          width: d(342),
          height: d(24),
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: d(6),
        }}
      >
        <Text variant="bodyM" tone="secondary" style={{ fontSize: d(14), lineHeight: d(21) }}>
          {tr('haveAccount')}
        </Text>
        <Text variant="labelM" tone="brand" style={{ fontSize: d(14), lineHeight: d(18) }}>
          {tr('logIn')}
        </Text>
      </Pressable>
    </View>
  );
}
