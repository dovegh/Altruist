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

// Partner facts on the chips come from the partner record, not the copy deck.
const chipsFor = (p: Pharmacy): PartnerChipSpec[] => [
  {
    box: { left: 16.39, top: 300, width: 152.503, height: 63.694 },
    rotate: 7,
    surface: 'accentCream',
    thumb: 'surface',
    icon: 'shield-check',
    title: shortName(p),
    sub: 'Verified partner',
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
    title: 'PC licensed',
    sub: 'Pharmacy Council',
  },
  {
    box: { left: 163.99, top: 352, width: 141.484, height: 57.852 },
    rotate: 5,
    surface: 'accentPink',
    thumb: 'surface',
    icon: 'shield-check',
    title: 'Rx in 40 min',
    sub: 'Fastest today',
  },
  {
    box: { left: 37.59, top: 418, width: 136.224, height: 52.95 },
    rotate: 3,
    surface: 'surface',
    thumb: 'brand',
    icon: 'shield-check',
    title: 'Free delivery',
    sub: `Over ${cedis(FREE_DELIVERY_OVER)}`,
  },
  {
    box: { left: 196, top: 405.96, width: 138.607, height: 61.988 },
    rotate: -7,
    surface: 'surface',
    thumb: 'accentBlue',
    icon: 'shield-check',
    title: 'Same-day',
    sub: 'Across Accra',
  },
];

const HEAD = [
  { text: 'Your' },
  { text: 'pharmacy' },
  { text: 'starts' },
  { text: 'here.', highlight: true },
];

export default function Welcome() {
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
          ? 'Could not reach Altruist. Check your connection and try again.'
          : e instanceof DeclinedError
            ? e.message
            : 'Something went wrong on our side. Try again in a moment.',
      );
    }
  };
  const CHIPS = chipsFor(pharmacy);
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
          accessibilityLabel="Go back"
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
                  {w.text}
                </Text>
              </View>
            ) : (
              <Text
                key={i}
                variant="displayL"
                color={t.colors.text.onBrand}
                style={{ fontSize: d(40), lineHeight: d(44) }}
              >
                {w.text}
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
        label="Continue with Email"
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
        label="Continue with Apple"
        top={628}
        tone="surfaceRaised"
        bordered
        onPress={() => continueWith('apple')}
        leading={<AppleMark size={d(20)} tone={themeName === 'light' ? 'black' : 'white'} />}
      />

      <AuthButton
        label="Continue with Google"
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
        accessibilityLabel="Already have an account? Log in"
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
          Already have an account?
        </Text>
        <Text variant="labelM" tone="brand" style={{ fontSize: d(14), lineHeight: d(18) }}>
          Log in
        </Text>
      </Pressable>
    </View>
  );
}
