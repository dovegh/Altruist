/**
 * Promo Carousel — the advert banners on Home.
 *
 * A paged strip of advertiser artwork with a dot indicator. The banner IS the
 * creative: photography, headline and call to action all arrive as one image,
 * so this component's job is to present it honestly rather than to decorate it.
 *
 * **One slot, filled edge to edge.** A horizontal strip is only ever as tall as
 * its tallest child, so every card is the same fixed shape and the artwork
 * covers it completely — no letterbox, no blurred filler, no dead space.
 *
 * Covering means cropping, and the slot ratio decides *which way*. These
 * creatives run 1.67:1 to 2.84:1, and they are not symmetrical about it: they
 * put logos, headlines and "NEW!" flags hard against the left and right edges,
 * while their tops and bottoms are sky, gradient and floor. So a horizontal
 * crop eats the message and a vertical crop eats margin. Measured across the
 * set:
 *
 *     slot    worst horizontal loss    worst vertical loss
 *     2.0:1            30%                     17%
 *     2.5:1            12%                     33%
 *     2.8:1             2%                     40%
 *
 * 2.5:1 is the trade taken here — 6% off each side at worst, paid for with
 * vertical margin the art can spare. `focus` moves the crop per banner when a
 * creative needs an edge kept.
 *
 * **The whole card is one button.** Splitting the banner and a separate CTA
 * into two targets means a tap on the artwork does nothing, which on something
 * that plainly looks tappable reads as a broken screen. There is no drawn CTA
 * over the image either: these creatives already contain their own.
 *
 * **Accessibility.** Every word in a banner is pixels, so each card announces
 * its `alt`, its advertiser and its position in the strip. Without that, a
 * screen reader reaches the most prominent element on Home and says nothing.
 * The dots are decorative and hidden — they repeat what the cards already say.
 *
 * **The fallback is not scaffolding.** A promotion with no registered artwork,
 * or whose remote banner fails to load, composes a card from the same tokens
 * instead of leaving a hole. A bad connection is the normal case for this, not
 * an edge one.
 *
 * Auto-advance: every 5s, looping from the last banner back to the first.
 * WCAG 2.2.2 allows content that moves on its own only if it can be paused,
 * so it stops the moment a finger touches the strip and waits a full
 * interval after the last touch before moving again — nothing slides away
 * mid-read. It never runs with a screen reader or Reduce Motion on, on a
 * tab that is not showing, or with the app in the background.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  AppState,
  View,
  Pressable,
  ScrollView,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { useIsFocused } from 'expo-router';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { motion, radius } from '@/theme/tokens';
import { Text } from './Text';
import { Icon } from './Icon';
import type { Promotion } from '@/lib/promotions';
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: { cardA11y: '{alt} Offer from {advertiser}. {n} of {total}.' },
  fr: { cardA11y: '{alt} Offre de {advertiser}. {n} sur {total}.' },
  tw: { cardA11y: '{alt} Efi {advertiser} hɔ. {n} wɔ {total} mu.' },
  gaa: { cardA11y: '{alt} Kɛjɛ {advertiser} ŋɔɔ. {n} yɛ {total} mli.' },
  ee: { cardA11y: '{alt} Tso {advertiser} gbɔ. {n} le {total} me.' },
  ha: { cardA11y: '{alt} Tayi daga {advertiser}. {n} cikin {total}.' },
});

/** Gutter either side of the strip, matching the screen's 24pt padding. */
const GUTTER = 24;
/** How much of the next banner peeks, so the strip reads as scrollable at rest. */
const PEEK = 16;
/** Corner radius. Matches the Hero Action Card it sits above. */
const RADIUS = 28;
/** The ad slot's shape. Every card is this, whatever the artwork measures. */
const SLOT_RATIO = 2.5;
/**
 * Loss thresholds for the development warning, split by direction because the
 * two are not equally costly: a horizontal crop eats logos and headlines, a
 * vertical one eats sky and gradient. Warning on 33% of vertical margin would
 * cry wolf on every well-behaved banner in the set.
 */
const CROP_WARN = { horizontal: 0.15, vertical: 0.35 };

function Dot({
  active,
  activeColor,
  idleColor,
  size,
}: {
  active: boolean;
  activeColor: string;
  idleColor: string;
  size: number;
}) {
  const p = useSharedValue(active ? 1 : 0);
  React.useEffect(() => {
    p.value = withTiming(active ? 1 : 0, {
      duration: motion.duration.fast,
      easing: Easing.bezier(...motion.easing.standard),
      reduceMotion: ReduceMotion.System,
    });
  }, [active, p]);

  // Resolved out here: a worklet may not call back into React scope.
  const wide = size * 3;
  const style = useAnimatedStyle(() => ({
    width: size + (wide - size) * p.value,
    opacity: 0.4 + 0.6 * p.value,
  }));

  return (
    <Animated.View
      style={[
        { height: size, borderRadius: radius.full, backgroundColor: active ? activeColor : idleColor },
        style,
      ]}
    />
  );
}

/** Composed card, for a promotion with no usable artwork. */
function ComposedBanner({ promo, width }: { promo: Promotion; width: number }) {
  const t = useTokens();
  const { d } = useDesignScale();
  // Every fallback tone is a light surface, so ink is always text/on-brand.
  const ink = t.colors.text.onBrand;

  return (
    <View
      style={{
        width,
        gap: d(10),
        padding: d(22),
        borderRadius: d(RADIUS),
        backgroundColor: t.colors.bg[promo.tone],
      }}
    >
      <Text variant="labelXS" color={ink} style={{ opacity: 0.7, fontSize: d(11), lineHeight: d(14) }}>
        {promo.eyebrow}
      </Text>
      <Text variant="headingL" color={ink} style={{ fontSize: d(20), lineHeight: d(26) }}>
        {promo.title}
      </Text>
      <Text
        variant="bodyS"
        color={ink}
        numberOfLines={2}
        style={{ opacity: 0.78, fontSize: d(13), lineHeight: d(19) }}
      >
        {promo.body}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(10) }}>
        {/* Drawn, not pressable — the card is the target. */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: d(6),
            paddingLeft: d(16),
            paddingRight: d(12),
            paddingVertical: d(9),
            borderRadius: t.radius.full,
            backgroundColor: t.colors.bg.surface,
          }}
        >
          <Text variant="labelS" tone="primary" style={{ fontSize: d(12), lineHeight: d(16) }}>
            {promo.cta}
          </Text>
          <Icon name="arrow-right" size={d(14)} tone="primary" />
        </View>
        <Text
          variant="caption"
          color={ink}
          numberOfLines={1}
          style={{ flex: 1, opacity: 0.6, fontSize: d(11), lineHeight: d(14) }}
        >
          {promo.advertiser}
        </Text>
      </View>
    </View>
  );
}

/** How long each banner stays before the strip moves on. */
const AUTO_ADVANCE_MS = 5000;

export function PromoCarousel({
  promotions,
  onPress,
}: {
  promotions: Promotion[];
  onPress: (promo: Promotion) => void;
}) {
  const t = useTokens();
  const { d, width } = useDesignScale();
  const tr = useT(S);
  const [index, setIndex] = useState(0);
  /** Ids whose artwork failed to load — they fall back rather than blank out. */
  const [broken, setBroken] = useState<Record<string, true>>({});
  const scroller = useRef<ScrollView>(null);

  const cardWidth = width - d(GUTTER) * 2 - d(PEEK);
  const step = cardWidth + d(12);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(e.nativeEvent.contentOffset.x / step);
      setIndex((prev) => (prev === next ? prev : next));
    },
    [step],
  );

  // --- Auto-advance -----------------------------------------------------
  const focused = useIsFocused();
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [stillOnly, setStillOnly] = useState(false);
  const [touching, setTouching] = useState(false);
  /** Bumped on every touch, so the timer restarts a full interval later. */
  const [lastTouch, setLastTouch] = useState(0);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setAppActive(s === 'active'));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      const [reader, reduce] = await Promise.all([
        AccessibilityInfo.isScreenReaderEnabled(),
        AccessibilityInfo.isReduceMotionEnabled(),
      ]);
      if (alive) setStillOnly(reader || reduce);
    };
    void check();
    const a = AccessibilityInfo.addEventListener('screenReaderChanged', check);
    const b = AccessibilityInfo.addEventListener('reduceMotionChanged', check);
    return () => {
      alive = false;
      a.remove();
      b.remove();
    };
  }, []);

  const autoplay =
    promotions.length > 1 && focused && appActive && !stillOnly && !touching;

  useEffect(() => {
    if (!autoplay) return;
    const timer = setInterval(() => {
      setIndex((current) => {
        const next = (current + 1) % promotions.length;
        scroller.current?.scrollTo({ x: next * step, animated: true });
        return next;
      });
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [autoplay, promotions.length, step, lastTouch]);

  const holdStill = useCallback(() => {
    setTouching(true);
    setLastTouch(Date.now());
  }, []);
  const letGo = useCallback(() => {
    setTouching(false);
    setLastTouch(Date.now());
  }, []);

  // Development only: a creative losing more than a quarter of itself to the
  // crop is almost certainly the wrong shape for this slot, and the person who
  // added it is the only one who can fix that. Silence would just ship it.
  if (__DEV__) {
    for (const promo of promotions) {
      if (!promo.image) continue;
      const horizontal = promo.aspectRatio > SLOT_RATIO;
      const loss = horizontal
        ? (promo.aspectRatio - SLOT_RATIO) / promo.aspectRatio
        : (SLOT_RATIO - promo.aspectRatio) / SLOT_RATIO;
      if (loss > (horizontal ? CROP_WARN.horizontal : CROP_WARN.vertical)) {
        console.warn(
          `[PromoCarousel] "${promo.id}" is ${promo.aspectRatio.toFixed(2)}:1 in a ` +
            `${SLOT_RATIO}:1 slot — ${Math.round(loss * 100)}% of it is cropped ` +
            `${horizontal ? 'horizontally' : 'vertically'}. ` +
            `Supply art nearer ${SLOT_RATIO}:1, or set \`focus\` to choose the edge kept.`,
        );
      }
    }
  }

  if (!promotions.length) return null;

  return (
    <View style={{ gap: d(12) }}>
      <ScrollView
        ref={scroller}
        horizontal
        showsHorizontalScrollIndicator={false}
        // Snap to the card pitch rather than the screen width: the strip is
        // inset and the next banner peeks, so a full-width page would land off.
        snapToInterval={step}
        decelerationRate="fast"
        disableIntervalMomentum
        onMomentumScrollEnd={onScroll}
        onScrollBeginDrag={holdStill}
        onScrollEndDrag={(e) => {
          onScroll(e);
          letGo();
        }}
        onTouchStart={holdStill}
        onTouchEnd={letGo}
        onTouchCancel={letGo}
        contentContainerStyle={{ gap: d(12), paddingRight: d(GUTTER) }}
      >
        {promotions.map((promo, i) => {
          const art = promo.image && !broken[promo.id] ? promo.image : null;
          return (
            <Pressable
              key={promo.id}
              accessibilityRole="button"
              // The banner's words are pixels. This is the only thing a screen
              // reader gets, so it carries the message, the advertiser and the
              // position in the strip.
              accessibilityLabel={tr('cardA11y', {
                alt: promo.alt,
                advertiser: promo.advertiser,
                n: i + 1,
                total: promotions.length,
              })}
              onPress={() => onPress(promo)}
              style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
            >
              {art ? (
                <Image
                  source={art}
                  // Fills the slot. `contentPosition` decides which edge is
                  // sacrificed — centred unless the creative says otherwise.
                  contentFit="cover"
                  contentPosition={promo.focus ?? 'center'}
                  transition={motion.duration.fast}
                  onError={() => setBroken((prev) => ({ ...prev, [promo.id]: true }))}
                  style={{
                    width: cardWidth,
                    aspectRatio: SLOT_RATIO,
                    borderRadius: d(RADIUS),
                    backgroundColor: t.colors.bg.surface,
                  }}
                />
              ) : (
                <ComposedBanner promo={promo} width={cardWidth} />
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {promotions.length > 1 ? (
        <View
          // Decorative: the cards already announce "N of M".
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ flexDirection: 'row', alignItems: 'center', gap: d(6), paddingLeft: d(4) }}
        >
          {promotions.map((promo, i) => (
            <Dot
              key={promo.id}
              active={i === index}
              size={d(6)}
              activeColor={t.colors.bg.brand}
              idleColor={t.colors.border.strong}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default PromoCarousel;
