/**
 * The Altruist wordmark — the brand asset itself, not type set to look like it.
 *
 * `assets/images/brand-wordmark.png` is byte-identical to the image Figma
 * serves for the wordmark layer on the Splash frames (node 233:5284), so the
 * launch screen shows the drawn mark rather than an approximation of it: the
 * mint letterforms, the cream "o" with its capsule, and the ™.
 *
 * Sized by width alone. The source is 460 × 89, and the height follows, so the
 * mark can never be stretched by a caller passing a mismatched pair.
 */
import React from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';

const SOURCE = require('../../assets/images/brand-wordmark.png');
const ASPECT = 460 / 89;

export function Wordmark({
  width,
  style,
}: {
  width: number;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={SOURCE}
      accessibilityRole="image"
      accessibilityLabel="Altruist"
      resizeMode="contain"
      style={[{ width, height: width / ASPECT }, style]}
    />
  );
}
