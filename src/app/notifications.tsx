/**
 * Notifications — ported from Figma node 121:184.
 *
 * Scroll content: V gap14, pad 64/24/60/24. An unread count with "Mark all
 * read", then TODAY and EARLIER groups of 40pt-tile rows.
 *
 * Unread is the whole design: the tile fill carries the notification's tone
 * only while it is unread, and drops to the neutral raised surface once it has
 * been opened. So the screen reads as a queue that empties rather than a log
 * that grows, and the colour means "look at this", not "this was a delivery".
 *
 * The feed and the read state come from different places on purpose — see
 * features/notifications/store.ts. Grouping and the "12 min ago" stamps are
 * computed from each item's timestamp at render, so nothing is stale.
 */
import React from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen } from '@/components/ui/FormScreen';
import { TitleAppBar } from '@/components/ui/AppBar';
import { Stagger } from '@/components/ui/Motion';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { isToday, relativeTime, type Notification, type NotificationTone } from '@/lib/notifications';
import { useNotificationStore, useNotifications } from '@/features/notifications/store';

export default function Notifications() {
  const t = useTokens();
  const { d } = useDesignScale();
  const { items, unreadCount, isPending } = useNotifications();
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);

  const circleFill: Record<NotificationTone, string> = {
    brand: t.colors.bg.brandSubtle,
    info: t.colors.bg.infoSubtle,
    danger: t.colors.bg.dangerSubtle,
    warning: t.colors.bg.warningSubtle,
    neutral: t.colors.bg.surfaceRaised,
  };

  const groups: { key: string; label: string; rows: Notification[] }[] = [
    { key: 'today', label: 'TODAY', rows: items.filter((n) => isToday(n.at)) },
    { key: 'earlier', label: 'EARLIER', rows: items.filter((n) => !isToday(n.at)) },
  ];

  return (
    <FormScreen gap={14} contentStyle={{ paddingBottom: d(60) }}>
      <TitleAppBar title="Notifications" />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(8) }}>
        <Text
          variant="bodyS"
          tone="tertiary"
          style={{ flex: 1, fontSize: d(13), lineHeight: d(19) }}
        >
          {unreadCount} unread
        </Text>
        {unreadCount > 0 ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => markAllRead(items.map((n) => n.id))}
          >
            <Text variant="labelS" tone="brand" style={{ fontSize: d(12), lineHeight: d(16) }}>
              Mark all read
            </Text>
          </Pressable>
        ) : null}
      </View>

      {groups
        .filter((g) => g.rows.length > 0)
        .map((g) => (
          <React.Fragment key={g.key}>
            <Text variant="labelXS" tone="tertiary" style={{ fontSize: d(11), lineHeight: d(14) }}>
              {g.label}
            </Text>
            <Stagger step={55}>
              {g.rows.map((n) => (
                <Pressable
                  key={n.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${n.unread ? 'Unread. ' : ''}${n.title}. ${n.body}. ${relativeTime(n.at)}`}
                  onPress={() => {
                    markRead(n.id);
                    if (n.href) router.push(n.href as never);
                  }}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    gap: d(14),
                    paddingVertical: d(14),
                    paddingHorizontal: d(16),
                    borderRadius: d(20),
                    backgroundColor: t.colors.bg.surface,
                    opacity: pressed ? 0.9 : 1,
                  })}
                >
                  <View
                    style={{
                      width: d(40),
                      height: d(40),
                      borderRadius: t.radius.full,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: n.unread ? circleFill[n.tone] : t.colors.bg.surfaceRaised,
                    }}
                  >
                    <Icon name={n.icon} size={d(19)} tone={n.unread ? 'primary' : 'tertiary'} />
                  </View>

                  <View style={{ flex: 1, gap: d(4) }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(8) }}>
                      <Text
                        variant="labelM"
                        tone={n.unread ? 'primary' : 'secondary'}
                        style={{ flex: 1, fontSize: d(14), lineHeight: d(18) }}
                      >
                        {n.title}
                      </Text>
                      {n.unread ? (
                        <View
                          style={{
                            width: d(8),
                            height: d(8),
                            borderRadius: t.radius.full,
                            backgroundColor: t.colors.bg.brand,
                          }}
                        />
                      ) : null}
                    </View>
                    <Text
                      variant="bodyS"
                      tone="tertiary"
                      style={{ fontSize: d(13), lineHeight: d(19) }}
                    >
                      {n.body}
                    </Text>
                    <Text
                      variant="caption"
                      tone="tertiary"
                      style={{ fontSize: d(12), lineHeight: d(16) }}
                    >
                      {relativeTime(n.at)}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </Stagger>
          </React.Fragment>
        ))}

      {/* "Nothing yet" is only true once the feed has actually answered. */}
      {!isPending && items.length === 0 ? (
        <Text variant="bodyM" tone="tertiary" center style={{ fontSize: d(14), lineHeight: d(21) }}>
          Nothing yet. Order updates and prescription decisions arrive here.
        </Text>
      ) : null}
    </FormScreen>
  );
}
