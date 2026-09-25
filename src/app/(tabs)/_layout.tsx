/**
 * Five-tab shell — ported from Figma node 36:102 (Bottom Tab Bar).
 *
 * Component doc: "Floating 5-tab navigator. The active tab expands into a mint
 * pill with a visible label; inactive tabs are icon-only. That expansion is the
 * accessible part — the active tab is identified by shape AND label, not just
 * colour. Each tab slot is 52pt, above the 44pt minimum. Sits 24pt inside the
 * gutter, 28pt above the frame bottom."
 *
 * Figma places it at (24, 748) on an 844 canvas: 844 − 68 − 748 = 28pt clearance,
 * which is measured from the safe-area bottom on a real device.
 *
 * ---------------------------------------------------------------------------
 * WHY THE ANIMATION IS BUILT THIS WAY
 *
 * The obvious implementation — `layout={LinearTransition}` on the slots, mount
 * the label when focused, switch `backgroundColor` on a ternary — animates
 * exactly one of the four things that change, and the other three cut hard:
 *
 *   1. the pill fill (transparent → mint) was an instant swap;
 *   2. the icon ink (primary → on-brand) was an instant swap;
 *   3. the label MOUNTED, so the layout animation was chasing a target that
 *      changed size the moment the text measured — the jump you could see;
 *   4. the outgoing tab collapsed on a different schedule to the incoming one.
 *
 * So: every label is always mounted and never re-measured, one progress value
 * per slot drives width, padding, fill and ink together, and the two icon inks
 * are stacked and cross-faded. Nothing mounts or unmounts during the
 * transition, so there is no layout to chase — the widths are numbers
 * interpolated on the UI thread.
 *
 * WHO OWNS THE PROGRESS
 *
 * The bar owns ONE shared value: the index of the lit tab, written as a plain
 * number. Each slot derives its own 0→1 progress from that on the UI thread
 * (`useDerivedValue` + `withTiming`), so at most one slot can ever be lit.
 *
 * WHY REACT ALSO HOLDS THE RESTING STYLE
 *
 * A second lit pill kept appearing at rest after deep-link navigation, with
 * the slot's progress correctly at 0. The chain, from the library source:
 *
 *   1. `useAnimatedStyle` computes its JS-side "initial" style ONCE, at
 *      mount, and the animated component merges that snapshot into the plain
 *      style on every render. For a slot that mounted lit, the snapshot is
 *      the lit pill, forever.
 *   2. Reanimated 4 keeps animated props in a registry only while they are
 *      fresh (FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS drops settled entries
 *      after a cleanup window).
 *   3. The next React commit that touches the bar therefore hands the view
 *      the mount-time snapshot again. Taps hid this because the bar only
 *      re-commits at the start of the next animation; deep links (and
 *      anything else that commits while the bar is idle) exposed it.
 *
 *   4. On top of that, with FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS the
 *      animated component keeps a `settledProps` state, synced from the
 *      registry by a garbage collector on a timer and rendered LAST in the
 *      style array. When the JS thread is busy for seconds (deep-link
 *      navigation mounting a heavy screen) the sync misses the cleanup
 *      window: the registry drops the fresh entry before JS copies it, and
 *      `settledProps` keeps the PREVIOUS resting values — overriding any
 *      plain style the slot renders. Taps never hit this because JS is idle.
 *
 * So, three things:
 *   - the slot's PLAIN style carries the correct resting values, derived
 *     from `rest` (`focused` delayed by one animation);
 *   - the animated styles return nothing when evaluated on the JS thread, so
 *     the mount-time snapshot is empty and cannot be merged back in;
 *   - the animated Pressable is REMOUNTED when `rest` flips, so a fresh
 *     component instance with empty `settledProps` holds the new rest.
 *
 * (Two earlier designs — per-slot progress snapshotting `focused` at mount,
 * and five bar-owned values retargeted from a JS effect — failed for the
 * same underlying reason and were misdiagnosed as animation-state bugs.)
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Pressable, Platform, StyleSheet, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { Text } from '@/components/ui/Text';
import { Icon, type IconName } from '@/components/ui/Icon';
import { motion } from '@/theme/tokens';

/**
 * Routes that live under (tabs) so they keep the floating bar, but have no slot
 * of their own. Figma draws the bar on Search with Catalog lit — the value here
 * is which tab stays lit while that route is open.
 */
const NESTED: Record<string, string> = { search: 'catalog' };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'home', title: 'Home', icon: 'home' },
  { name: 'catalog', title: 'Catalog', icon: 'catalog' },
  { name: 'prescriptions', title: 'Scripts', icon: 'prescription' },
  { name: 'wellness', title: 'Wellness', icon: 'wellness' },
  { name: 'profile', title: 'Profile', icon: 'profile' },
];

/** Unfocused slot, from the component doc. Comfortably over the 44pt minimum. */
const SLOT = 52;
const ICON = 24;
/** Focused pill: 16pt inset, icon, 8pt gap, label, 16pt inset. */
const PAD_FOCUSED = 16;
const GAP = 8;
/** Centres the icon in an unfocused slot: (52 − 24) / 2. */
const PAD_IDLE = (SLOT - ICON) / 2;
/** Never let the row of slots touch, however long a label is. */
const MIN_GAP = 4;

const TIMING = {
  duration: motion.duration.base,
  easing: Easing.bezier(...motion.easing.standard),
  reduceMotion: ReduceMotion.System,
};

const TabSlot = React.memo(function TabSlot({
  meta,
  slot,
  lit,
  focused,
  labelWidth,
  maxWidth,
  routeKey,
  navigation,
}: {
  meta: (typeof TABS)[number];
  /** This slot's index in TABS. */
  slot: number;
  /** Index of the lit tab — the bar's single source of truth (see file header). */
  lit: SharedValue<number>;
  focused: boolean;
  labelWidth: number;
  maxWidth: number;
  routeKey: string;
  navigation: any;
}) {
  const t = useTokens();
  const { d } = useDesignScale();

  const onPress = () => {
    const event = navigation.emit({ type: 'tabPress', target: routeKey, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(meta.name);
  };

  // 0 = idle, 1 = lit. Re-evaluated on the UI thread whenever `lit` changes,
  // and animated from wherever it currently is — a tap that lands mid-animation
  // continues rather than snapping. The first evaluation resolves the timing
  // to its target immediately, so the first frame is correct without a fade.
  const p = useDerivedValue(() => withTiming(lit.value === slot ? 1 : 0, TIMING));

  // The resting state React commits. It trails `focused` by one animation so
  // the commit lands AFTER the frames Reanimated pushed, never before them —
  // committing the new resting width first would flash it for a frame before
  // the animation started from the old one.
  const [rest, setRest] = useState(focused);
  useEffect(() => {
    if (rest === focused) return;
    const id = setTimeout(() => setRest(focused), motion.duration.base + 80);
    return () => clearTimeout(id);
  }, [focused, rest]);

  // Every dimension is resolved to a NUMBER out here, before the worklet.
  //
  // `d()` is an ordinary JS function closed over by `useDesignScale`. A worklet
  // body runs on the UI runtime, where calling one throws
  // "[Worklets] Tried to synchronously call a Remote Function" — so the worklet
  // below may only read plain values, never call anything from React scope.
  const slotW = d(SLOT);
  const padIdle = d(PAD_IDLE);
  const padFocused = d(PAD_FOCUSED);
  const idleFill = t.colors.bg.surfaceRaised;
  const activeFill = t.colors.bg.brand;

  // Width is a number, not a layout result: the label is already measured, so
  // there is nothing left to lay out mid-animation.
  const expanded = Math.min(d(PAD_FOCUSED * 2 + ICON + GAP) + labelWidth, maxWidth);

  // `_WORKLET` is false when Reanimated evaluates the updater on the JS thread
  // to build the snapshot it merges into the plain style (see file header).
  // Returning nothing there is the whole point: React's own values must win.
  const pill = useAnimatedStyle(() => {
    if (!_WORKLET) return {};
    return {
      width: interpolate(p.value, [0, 1], [slotW, expanded]),
      paddingLeft: interpolate(p.value, [0, 1], [padIdle, padFocused]),
    };
  });
  // The fill is a mint layer fading in over the bar's own colour, not an
  // interpolated backgroundColor: interpolateColor blends in linear light
  // (gamma 2.2) by default, which keeps the brighter colour dominant for most
  // of the fade — in dark mode the outgoing pill had collapsed to a circle
  // while its fill was still a bright teal disc. Compositing opacity is plain
  // sRGB. (The `gamma: 1` escape hatch is broken in reanimated 4.5: it emits
  // "rgba(3.8e-7, …)", which the native colour parser rejects with a red box.)
  const fill = useAnimatedStyle(() => (_WORKLET ? { opacity: p.value } : {}));
  const inkIdle = useAnimatedStyle(() => (_WORKLET ? { opacity: 1 - p.value } : {}));
  const inkActive = useAnimatedStyle(() => (_WORKLET ? { opacity: p.value } : {}));
  // The label trails the pill slightly, so it reads as being revealed by the
  // expansion rather than appearing on top of it.
  const label = useAnimatedStyle(() =>
    _WORKLET ? { opacity: interpolate(p.value, [0.35, 1], [0, 1], 'clamp') } : {},
  );

  return (
    <AnimatedPressable
      // Remounted whenever the resting state changes — i.e. once, AFTER each
      // animation this slot took part in. This is the part that actually
      // closes the bug: Reanimated 4's animated component keeps a
      // `settledProps` state it syncs from the native registry on a timer and
      // renders LAST in the style array, and under deep-link churn (JS busy
      // for seconds) that sync can miss the registry's cleanup window, leaving
      // the component holding the PREVIOUS resting values on top of everything
      // React says. A fresh instance holds nothing. Remounting at rest costs a
      // view with identical props and no visible change.
      key={`${routeKey}:${rest ? 'lit' : 'idle'}`}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={meta.title}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          height: d(SLOT),
          width: rest ? expanded : slotW,
          paddingLeft: rest ? padFocused : padIdle,
          borderRadius: t.radius.full,
          backgroundColor: idleFill,
          // The label is clipped by the pill as it closes, rather than being
          // unmounted — that is what removes the jump.
          overflow: 'hidden',
        },
        pill,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: activeFill, opacity: rest ? 1 : 0 },
          fill,
        ]}
      />
      <View style={{ width: d(ICON), height: d(ICON) }}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: rest ? 0 : 1 }, inkIdle]}>
          <Icon name={meta.icon} size={d(ICON)} color={t.colors.icon.primary} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: rest ? 1 : 0 }, inkActive]}>
          <Icon name={meta.icon} size={d(ICON)} color={t.colors.icon.onBrand} />
        </Animated.View>
      </View>

      <Animated.View style={[{ marginLeft: d(GAP), opacity: rest ? 1 : 0 }, label]}>
        <Text
          variant="labelS"
          color={t.colors.text.onBrand}
          numberOfLines={1}
          style={{ fontSize: d(12), lineHeight: d(16) }}
        >
          {meta.title}
        </Text>
      </Animated.View>
    </AnimatedPressable>
  );
});

function FloatingTabBar({ state, navigation }: any) {
  const t = useTokens();
  const { d, width } = useDesignScale();
  const insets = useSafeAreaInsets();

  // Explicit width, not left/right insets: React Navigation supplies its own
  // container styles for the tabBar slot, and relying on insets let the row
  // overflow the screen.
  const barWidth = width - d(48);

  /**
   * Label widths, measured once from a hidden copy of the same text.
   *
   * They have to be known as numbers before the pill can be animated to a
   * number. Measuring the real label instead would mean measuring something
   * that is mid-transition.
   */
  const [labels, setLabels] = useState<Record<string, number>>({});
  const measure = useCallback(
    (name: string) => (e: LayoutChangeEvent) => {
      const w = Math.ceil(e.nativeEvent.layout.width);
      setLabels((prev) => (prev[name] === w ? prev : { ...prev, [name]: w }));
    },
    [],
  );

  // The widest a pill may grow without squeezing the other four below MIN_GAP.
  const maxWidth = barWidth - d(16) - 4 * d(SLOT) - 4 * d(MIN_GAP);

  const current = state.routes[state.index]?.name;
  const litTab = TABS.some((x) => x.name === current) ? current : NESTED[current];
  const litIndex = Math.max(0, TABS.findIndex((x) => x.name === litTab));

  // The single source of truth for the animation. A plain number, written on
  // every change; see the file header for why it is not five animations.
  const lit = useSharedValue(litIndex);
  useEffect(() => {
    lit.value = litIndex;
  }, [litIndex, lit]);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: Math.max(insets.bottom, d(12)) + d(28),
        alignItems: 'center',
      }}
    >
      <View
        style={{
          width: barWidth,
          flexDirection: 'row',
          alignItems: 'center',
          // Fixed 52pt slots spaced apart, rather than `flex: 1` fill: flex
          // distribution races the label's text measurement on the first pass
          // and collapsed two slots to 1pt while two others overflowed the bar.
          // Even spacing puts the icon centres in the same places without the
          // race. `overflow` is the backstop — nothing may escape the pill.
          justifyContent: 'space-between',
          overflow: 'hidden',
          height: d(68),
          paddingHorizontal: d(8),
          borderRadius: t.radius.full,
          backgroundColor: t.colors.bg.surfaceRaised,
          borderWidth: 1,
          borderColor: t.colors.border.subtle,
          ...Platform.select({
            ios: {
              shadowColor: t.colors.shadow,
              shadowOpacity: 0.32,
              shadowRadius: d(20),
              shadowOffset: { width: 0, height: d(16) },
            },
            android: { elevation: 14 },
          }),
        }}
      >
        {/* Measuring layer. Never visible, never touchable, laid out once. */}
        <View
          pointerEvents="none"
          style={{ position: 'absolute', opacity: 0, flexDirection: 'row' }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {TABS.map((tab) => (
            <Text
              key={tab.name}
              variant="labelS"
              onLayout={measure(tab.name)}
              style={{ fontSize: d(12), lineHeight: d(16) }}
            >
              {tab.title}
            </Text>
          ))}
        </View>

        {state.routes.map((route: any) => {
          const slot = TABS.findIndex((x) => x.name === route.name);
          if (slot < 0) return null;
          const meta = TABS[slot];
          const focused = slot === litIndex;

          return (
            <TabSlot
              key={route.key}
              meta={meta}
              slot={slot}
              lit={lit}
              focused={focused}
              // Until the measuring pass lands every pill is slot-sized, which
              // is the correct idle state — nothing flashes at full width.
              labelWidth={labels[meta.name] ?? 0}
              maxWidth={maxWidth}
              routeKey={route.key}
              navigation={navigation}
            />
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      // Tab switching is instant by default, which is already not a slide. The
      // bar animates itself; the screens do not need to.
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      {TABS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title }} />
      ))}
      {Object.keys(NESTED).map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}
