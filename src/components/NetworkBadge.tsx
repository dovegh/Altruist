/**
 * NetworkBadge — which mobile money network a wallet is on.
 *
 * MTN is the real logo: MTN_2022_logo.svg from Wikimedia Commons (public
 * domain as a simple mark; still MTN's trademark), kept in
 * assets/images/networks/mtn.svg and drawn from its one path, black on MTN
 * yellow as the brand uses it.
 *
 * Telecel and AT show a stand-in — the name on the brand colour — until their
 * official files arrive. It is deliberately not a drawn copy of their logos:
 * an approximate mark looks counterfeit on a payment screen. To use official
 * files, put them at assets/images/networks/telecel.png and at.png (square,
 * at least 96×96) and uncomment the lines in `LOGOS`. Nothing else changes.
 *
 * Like BrandMarks, this is exempt from the token system: a network's colours
 * are its own, in both themes.
 */
import React from 'react';
import { Image, View, type ImageSourcePropType } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useDesignScale } from '@/theme/useDesignScale';
import { Text } from '@/components/ui/Text';
import { providerName, type MomoProvider } from '@/lib/momo';

/** The MTN mark (oval + letters), viewBox 0 0 1280 640 — from assets/images/networks/mtn.svg. */
const MTN_MARK = 'M640,0C286.5,0,0,143.3,0,320s286.5,320,640,320s640-143.3,640-320S993.5,0,640,0z M640,589.5 C314.4,589.5,50.5,468.8,50.5,320S314.4,50.5,640,50.5s589.5,120.7,589.5,269.5S965.6,589.5,640,589.5z M559.3,263.9v-50.5h180.5 v50.5h-65v162.8h-50.5V263.9H559.3z M957.8,213.3v213.3h-50.5l-91.6-127v127h-50.5V213.3h50.5l91.6,127v-127L957.8,213.3z M320.7,426.7V213.3h50.5l56.1,86.3l56.1-86.3H534v213.3h-50.5V306l-38.3,58.9h-35.6L371.2,306v120.7H320.7z';

const MTN_YELLOW = '#FFCB05';

const LOGOS: Partial<Record<MomoProvider, ImageSourcePropType>> = {
  // vod: require('../../assets/images/networks/telecel.png'),
  // atl: require('../../assets/images/networks/at.png'),
};

/** Brand colour and a short name for the stand-in. Check against each brand kit. */
const STAND_IN: Record<MomoProvider, { bg: string; ink: string; mark: string }> = {
  mtn: { bg: MTN_YELLOW, ink: '#000000', mark: 'MTN' },
  vod: { bg: '#E60000', ink: '#FFFFFF', mark: 'telecel' },
  atl: { bg: '#004F9F', ink: '#FFFFFF', mark: 'AT' },
};

export function NetworkBadge({
  provider,
  size = 32,
}: {
  provider: MomoProvider;
  size?: number;
}) {
  const { d } = useDesignScale();
  const px = d(size);
  const logo = LOGOS[provider];
  const brand = STAND_IN[provider];
  const radius = px * 0.28;

  if (provider === 'mtn') {
    return (
      <View
        accessibilityRole="image"
        accessibilityLabel={providerName(provider)}
        style={{
          width: px,
          height: px,
          borderRadius: radius,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: MTN_YELLOW,
        }}
      >
        <Svg width={px * 0.8} height={px * 0.4} viewBox="0 0 1280 640">
          <Path d={MTN_MARK} fill="#000000" />
        </Svg>
      </View>
    );
  }

  if (logo) {
    return (
      <Image
        source={logo}
        accessibilityLabel={providerName(provider)}
        resizeMode="contain"
        style={{ width: px, height: px, borderRadius: radius }}
      />
    );
  }

  // Short marks read big; longer ones shrink to stay on one line.
  const fontSize = px * (brand.mark.length <= 2 ? 0.42 : brand.mark.length <= 4 ? 0.3 : 0.22);
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={providerName(provider)}
      style={{
        width: px,
        height: px,
        borderRadius: radius,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: brand.bg,
      }}
    >
      <Text
        variant="labelS"
        color={brand.ink}
        numberOfLines={1}
        style={{ fontSize, lineHeight: fontSize * 1.15, fontWeight: '800', letterSpacing: -0.2 }}
      >
        {brand.mark}
      </Text>
    </View>
  );
}
