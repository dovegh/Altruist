/**
 * Motion primitives — built on the `motion` tokens in the design system.
 *
 * Durations and easings come from `03-Design-Tokens.md §8`:
 *   instant 100 · fast 180 · base 260 · slow 420
 *   standard cubic-bezier(0.2, 0, 0, 1) · decelerate (0.3, 0, 0, 1)
 *
 * The one rule that governs everything here, quoted from that doc:
 *
 *   "Prescription status transitions use `base` with a colour cross-fade only.
 *    No spring, no bounce — a rejected prescription must not feel playful."
 *
 * So the API splits deliberately. `Celebrate` springs; `Appear` does not. A
 * screen that reports a rejection, a decline or a scheduled deletion uses
 * `Appear`. Only a genuine success gets the spring. Getting this backwards is
 * how an app ends up bouncing cheerfully at someone whose medicine was refused.
 *
 * Every animation honours the OS "reduce motion" setting through Reanimated's
 * `ReduceMotion.System`, which degrades to an instant state change rather than
 * a shorter animation.
 */
import React from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { motion, radius } from '@/theme/tokens';

const EASE_STANDARD = Easing.bezier(...motion.easing.standard);
const EASE_DECELERATE = Easing.bezier(...motion.easing.decelerate);

/** Fade + rise. The default entrance for anything that is not a celebration. */
export function Appear({
  children,
  delay = 0,
  distance = 12,
  duration = motion.duration.base,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  duration?: number;
  style?: ViewStyle;
}) {
  return (
    <Animated.View
      style={style}
      entering={FadeInDown.duration(duration)
        .delay(delay)
        .easing(EASE_DECELERATE)
        .withInitialValues({ transform: [{ translateY: distance }] })
        .reduceMotion(ReduceMotion.System)}
    >
      {children}
    </Animated.View>
  );
}

/**
 * Applies an incrementing delay to each child so a list arrives in sequence.
 * `step` is deliberately small — 50ms reads as "the list settled", 150ms reads
 * as "the app is slow".
 */
export function Stagger({
  children,
  delay = 0,
  step = 50,
  distance = 12,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  step?: number;
  distance?: number;
  style?: ViewStyle;
}) {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <>
      {items.map((child, i) => (
        <Appear key={i} delay={delay + i * step} distance={distance} style={style}>
          {child}
        </Appear>
      ))}
    </>
  );
}

/**
 * Scale-in with a soft spring. SUCCESS ONLY — see the file header. Pass
 * `calm` for any outcome that is not good news and it degrades to a fade.
 */
export function Celebrate({
  children,
  calm = false,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  calm?: boolean;
  delay?: number;
  style?: ViewStyle;
}) {
  const scale = useSharedValue(calm ? 1 : 0.72);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: motion.duration.base, easing: EASE_STANDARD }),
    );
    if (!calm) {
      scale.value = withDelay(
        delay,
        withSpring(1, { damping: 12, stiffness: 160, mass: 0.7, reduceMotion: ReduceMotion.System }),
      );
    }
  }, [calm, delay, opacity, scale]);

  const animated = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/**
 * A slow breathing pulse for the one step in a timeline that is happening now.
 * Opacity only — nothing moves, so it reads as "live" rather than "loading".
 */
export function Pulse({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const opacity = useSharedValue(1);

  React.useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.45, { duration: motion.duration.slow, easing: EASE_STANDARD }),
        withTiming(1, { duration: motion.duration.slow, easing: EASE_STANDARD }),
      ),
      -1,
      false,
      undefined,
      ReduceMotion.System,
    );
  }, [opacity]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/** A progress bar that animates to its value instead of jumping. */
export function ProgressBar({
  value,
  height = 8,
  track,
  fill,
  duration = motion.duration.slow,
}: {
  /** 0–1 */
  value: number;
  height?: number;
  track: string;
  fill: string;
  duration?: number;
}) {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withTiming(Math.max(0, Math.min(1, value)), {
      duration,
      easing: EASE_DECELERATE,
      reduceMotion: ReduceMotion.System,
    });
  }, [value, duration, progress]);

  const animated = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View
      style={{ height, borderRadius: radius.full, backgroundColor: track, overflow: 'hidden' }}
    >
      <Animated.View style={[{ height: '100%', borderRadius: radius.full, backgroundColor: fill }, animated]} />
    </View>
  );
}

/**
 * Cross-fades between colours rather than cutting. This is the transition the
 * token doc mandates for status changes.
 */
export function useColourFade(colour: string, duration = motion.duration.base) {
  const previous = React.useRef(colour);
  const t = useSharedValue(1);

  React.useEffect(() => {
    if (previous.current === colour) return;
    t.value = 0;
    t.value = withTiming(1, { duration, easing: EASE_STANDARD, reduceMotion: ReduceMotion.System });
    previous.current = colour;
  }, [colour, duration, t]);

  return { from: previous.current, progress: t };
}

export { FadeIn, FadeInDown, Animated };
