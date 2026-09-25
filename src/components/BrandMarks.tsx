/**
 * BrandMarks — Google and Apple sign-in logos for React Native.
 *
 * Requires: react-native-svg
 *
 * These are third-party trademarks. Three rules that are not stylistic:
 *
 * 1. Never recolour the Google G. Its four brand colours are fixed and must not
 * be themed. That is why they are literals here and not Altruist tokens.
 * 2. Apple's mark is black or white only, and never sits on a brand-coloured
 * button. Apple HIG permits black, white, or white-with-outline buttons.
 * 3. App Store Review Guideline 4.8: an iOS app offering ANY third-party
 * sign-in must also offer Sign in with Apple. Shipping Google alone fails.
 *
 * Verify against the vendor pages before release — they do change:
 * Google — https://developers.google.com/identity/branding-guidelines
 * Apple — https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple
 */

import React from 'react';
import Svg, { Path } from 'react-native-svg';

type MarkProps = {
 /** Rendered square size in dp. Default 20. */
 size?: number;
};

/**
 * Google "G". Colours are fixed — there is deliberately no colour prop.
 */
export function GoogleMark({ size = 20 }: MarkProps) {
 return (
 <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityLabel="Google">
 <Path
 d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
 fill="#4285F4"
 />
 <Path
 d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
 fill="#34A853"
 />
 <Path
 d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
 fill="#FBBC05"
 />
 <Path
 d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
 fill="#EA4335"
 />
 </Svg>
 );
}

type AppleMarkProps = MarkProps & {
 /**
 * Apple permits the mark in black or white only.
 * Use 'white' on the dark Altruist button, 'black' on a white button.
 */
 tone?: 'white' | 'black';
};

export function AppleMark({ size = 20, tone = 'white' }: AppleMarkProps) {
 return (
 <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityLabel="Apple">
 <Path
 d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
 fill={tone === 'white' ? '#FFFFFF' : '#000000'}
 />
 </Svg>
 );
}
