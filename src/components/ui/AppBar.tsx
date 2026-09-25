/**
 * Top App Bar — Figma node 36:138.
 *
 * Component doc: "Profile = Home header (avatar + greeting + actions).
 * Title = inner screens with back. Title + Action adds a single overflow action.
 * Height 56, sits directly below the status bar inside the 24pt screen gutter."
 */
import React from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { Text } from './Text';
import { Icon, type IconName } from './Icon';

export function RoundAction({
  icon,
  label,
  onPress,
  badge,
}: {
  icon: IconName;
  label: string;
  onPress?: () => void;
  /** Count for the corner dot. Zero and undefined both hide it. */
  badge?: number;
}) {
  const t = useTokens();
  const { d } = useDesignScale();
  const count = badge && badge > 0 ? badge : 0;
  return (
    <Pressable
      accessibilityRole="button"
      // The count belongs in the label, not only in the dot — a screen reader
      // gets nothing from a 18pt mint circle.
      accessibilityLabel={count ? `${label}, ${count} item${count === 1 ? '' : 's'}` : label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: d(44),
        height: d(44),
        borderRadius: t.radius.full,
        backgroundColor: t.colors.bg.surfaceRaised,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Icon name={icon} size={d(20)} tone="primary" />
      {count ? (
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
            // A hairline of the bar's own ground, so the dot reads as sitting
            // on top of the button rather than punched out of it.
            borderWidth: d(2),
            borderColor: t.colors.bg.canvas,
          }}
        >
          <Text
            variant="labelXS"
            color={t.colors.text.onBrand}
            style={{ fontSize: d(10), lineHeight: d(13) }}
          >
            {count > 9 ? '9+' : count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

type Common = {
  actions?: { icon: IconName; label: string; onPress?: () => void; badge?: number }[];
};

/** Home header: avatar + greeting + actions. */
export function ProfileAppBar({
  greeting,
  name,
  onAvatarPress,
  actions = [],
}: Common & { greeting: string; name: string; onAvatarPress?: () => void }) {
  const t = useTokens();
  const { d } = useDesignScale();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(12), height: d(56) }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Your profile"
        onPress={onAvatarPress}
        style={{
          width: d(44),
          height: d(44),
          borderRadius: t.radius.full,
          backgroundColor: t.colors.bg.surfaceRaised,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="profile" size={d(20)} tone="primary" />
      </Pressable>
      <View style={{ flex: 1, gap: d(2) }}>
        <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
          {greeting}
        </Text>
        <Text variant="headingM" numberOfLines={1} style={{ fontSize: d(18), lineHeight: d(24) }}>
          {name}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: d(8) }}>
        {actions.map((a) => (
          <RoundAction key={a.label} {...a} />
        ))}
      </View>
    </View>
  );
}

/**
 * Inner-screen header: back + title, with an optional overflow action.
 *
 * `showBack` mirrors the Figma "Back" boolean on Top App Bar (36:138), same
 * default. Turn it off on the five tab roots — a tab root has nothing to go
 * back to, so the button would either do nothing or drop the user out of the
 * tab. Every screen reached by a push keeps it.
 */
export function TitleAppBar({
  title,
  onBack,
  actions = [],
  showBack = true,
}: Common & { title: string; onBack?: () => void; showBack?: boolean }) {
  const { d } = useDesignScale();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(12), height: d(56) }}>
      {showBack ? (
        <RoundAction icon="arrow-left" label="Go back" onPress={onBack ?? (() => router.back())} />
      ) : null}
      <Text variant="headingL" numberOfLines={1} style={{ flex: 1, fontSize: d(20), lineHeight: d(26) }}>
        {title}
      </Text>
      {actions.map((a) => (
        <RoundAction key={a.label} {...a} />
      ))}
    </View>
  );
}

/** Section Header — title plus an optional "View all" pill. */
export function SectionHeader({
  title,
  action = 'View all',
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const t = useTokens();
  const { d } = useDesignScale();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(12), height: d(40) }}>
      <Text variant="headingL" style={{ flex: 1, fontSize: d(20), lineHeight: d(26) }}>
        {title}
      </Text>
      {onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${action} ${title}`}
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
            {action}
          </Text>
          <Icon name="chevron-right" size={d(16)} tone="secondary" />
        </Pressable>
      ) : null}
    </View>
  );
}
