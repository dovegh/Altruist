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
 *
 * Swipe a row left to archive or delete it. Both are this phone's view only;
 * archived rows sit under ARCHIVED at the bottom and can come back.
 */
import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen } from '@/components/ui/FormScreen';
import { TitleAppBar } from '@/components/ui/AppBar';
import { Stagger } from '@/components/ui/Motion';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { SwipeRow } from '@/components/ui/SwipeRow';
import { isToday, relativeTime, type Notification, type NotificationTone } from '@/lib/notifications';
import { useNotificationStore, useNotifications } from '@/features/notifications/store';
import { defineStrings, useT } from '@/i18n';

// Notification titles and bodies come from the feed and are never translated here.
const S = defineStrings({
  en: {
    title: 'Notifications',
    unread: '{count} unread',
    markAllRead: 'Mark all read',
    today: 'TODAY',
    earlier: 'EARLIER',
    archivedHeader: 'ARCHIVED ({count})',
    hide: 'Hide',
    show: 'Show',
    empty: 'Nothing yet. Order updates and prescription decisions arrive here.',
    archive: 'Archive',
    unarchive: 'Unarchive',
    delete: 'Delete',
    rowA11y: '{title}. {body}. {time}',
    rowUnreadA11y: 'Unread. {title}. {body}. {time}',
  },
  fr: {
    title: 'Notifications',
    unread: 'Non lues : {count}',
    markAllRead: 'Tout marquer comme lu',
    today: "AUJOURD'HUI",
    earlier: 'PLUS TÔT',
    archivedHeader: 'ARCHIVÉES ({count})',
    hide: 'Masquer',
    show: 'Afficher',
    empty:
      'Rien pour le moment. Les suivis de commande et les décisions sur vos ordonnances arrivent ici.',
    archive: 'Archiver',
    unarchive: 'Désarchiver',
    delete: 'Supprimer',
    rowA11y: '{title}. {body}. {time}',
    rowUnreadA11y: 'Non lue. {title}. {body}. {time}',
  },
  tw: {
    title: 'Nkaeɛ',
    unread: 'Wonkanee {count}',
    markAllRead: 'Hyɛ ne nyinaa sɛ woakan',
    today: 'NNƐ',
    earlier: 'KAN NO',
    archivedHeader: 'DEƐ WƆAKORA ({count})',
    hide: 'Fa sie',
    show: 'Kyerɛ',
    empty:
      'Biribiara nni hɔ ɛ. Nneɛma a woato ho nsɛm ne nnuro krataa ho gyinaeɛ bɛba ha.',
    archive: 'Kora',
    unarchive: 'San fa bra',
    delete: 'Popa',
    rowA11y: '{title}. {body}. {time}',
    rowUnreadA11y: 'Wonkanee. {title}. {body}. {time}',
  },
  gaa: {
    title: 'Kaimɔi',
    unread: 'Okaneko {count}',
    markAllRead: 'Kɛɛ akɛ okane fɛɛ',
    today: 'ŊMƐNƐ',
    earlier: 'DANŊ',
    archivedHeader: 'NI ATO ({count})',
    hide: 'Tee',
    show: 'Tsɔɔ',
    empty: 'Nɔ ko bɛ kɛbashi bianɛ. Nɔ ni ohe he saji kɛ tsofa wolo he yiŋkpɔi baa biɛ.',
    archive: 'To lɛ',
    unarchive: 'Kɛ lɛ ku sɛɛ',
    delete: 'Hiɛ lɛ',
    rowA11y: '{title}. {body}. {time}',
    rowUnreadA11y: 'Okaneko. {title}. {body}. {time}',
  },
  ee: {
    title: 'Nyanyuiwo',
    unread: 'Mèxlẽ o: {count}',
    markAllRead: 'Tsɔe katã be èxlẽe',
    today: 'EGBE',
    earlier: 'DO ŊGƆ',
    archivedHeader: 'ESIWO WODZRA ƉO ({count})',
    hide: 'Ɣlae',
    show: 'Ɖee fia',
    empty:
      'Naneke meli haɖe o. Nudodo ŋuti nyanyuiwo kple atikeŋɔŋlɔ ŋuti nyametsotsowo aɖo afii.',
    archive: 'Dzrae ɖo',
    unarchive: 'Ɖee go',
    delete: 'Tutui',
    rowA11y: '{title}. {body}. {time}',
    rowUnreadA11y: 'Mèxlẽe o. {title}. {body}. {time}',
  },
  ha: {
    title: 'Sanarwa',
    unread: 'Ba a karanta ba: {count}',
    markAllRead: 'Yi wa duka alamar an karanta',
    today: 'YAU',
    earlier: 'A BAYA',
    archivedHeader: 'ADANANNU ({count})',
    hide: 'Ɓoye',
    show: 'Nuna',
    empty:
      'Babu komai tukuna. Sabuntawar oda da hukuncin takardun magani suna zuwa nan.',
    archive: 'Adana',
    unarchive: 'Fitar da shi',
    delete: 'Goge',
    rowA11y: '{title}. {body}. {time}',
    rowUnreadA11y: 'Ba a karanta ba. {title}. {body}. {time}',
  },
});

function NotificationRow({ n, archived = false }: { n: Notification; archived?: boolean }) {
  const t = useTokens();
  const tr = useT(S);
  const { d } = useDesignScale();
  const markRead = useNotificationStore((s) => s.markRead);
  const archive = useNotificationStore((s) => s.archive);
  const unarchive = useNotificationStore((s) => s.unarchive);
  const remove = useNotificationStore((s) => s.remove);

  const circleFill: Record<NotificationTone, string> = {
    brand: t.colors.bg.brandSubtle,
    info: t.colors.bg.infoSubtle,
    danger: t.colors.bg.dangerSubtle,
    warning: t.colors.bg.warningSubtle,
    neutral: t.colors.bg.surfaceRaised,
  };

  return (
    <SwipeRow
      actions={[
        archived
          ? {
              key: 'unarchive',
              label: tr('unarchive'),
              icon: 'archive',
              tone: 'neutral',
              onPress: () => unarchive(n.id),
            }
          : {
              key: 'archive',
              label: tr('archive'),
              icon: 'archive',
              tone: 'neutral',
              onPress: () => archive(n.id),
            },
        {
          key: 'delete',
          label: tr('delete'),
          icon: 'trash',
          tone: 'danger',
          onPress: () => remove(n.id),
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tr(n.unread ? 'rowUnreadA11y' : 'rowA11y', {
          title: n.title,
          body: n.body,
          time: relativeTime(n.at),
        })}
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
    </SwipeRow>
  );
}

export default function Notifications() {
  const t = useTokens();
  const tr = useT(S);
  const { d } = useDesignScale();
  const { items, archived, unreadCount, isPending } = useNotifications();
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const [showArchived, setShowArchived] = useState(false);

  const groups: { key: string; label: string; rows: Notification[] }[] = [
    { key: 'today', label: tr('today'), rows: items.filter((n) => isToday(n.at)) },
    { key: 'earlier', label: tr('earlier'), rows: items.filter((n) => !isToday(n.at)) },
  ];

  return (
    <FormScreen gap={14} contentStyle={{ paddingBottom: d(60) }}>
      <TitleAppBar title={tr('title')} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(8) }}>
        <Text
          variant="bodyS"
          tone="tertiary"
          style={{ flex: 1, fontSize: d(13), lineHeight: d(19) }}
        >
          {tr('unread', { count: unreadCount })}
        </Text>
        {unreadCount > 0 ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => markAllRead(items.map((n) => n.id))}
          >
            <Text variant="labelS" tone="brand" style={{ fontSize: d(12), lineHeight: d(16) }}>
              {tr('markAllRead')}
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
                <NotificationRow key={n.id} n={n} />
              ))}
            </Stagger>
          </React.Fragment>
        ))}

      {archived.length ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showArchived }}
            onPress={() => setShowArchived((v) => !v)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: d(8), paddingVertical: d(4) }}
          >
            <Text variant="labelXS" tone="tertiary" style={{ flex: 1, fontSize: d(11), lineHeight: d(14) }}>
              {tr('archivedHeader', { count: archived.length })}
            </Text>
            <Text variant="labelS" tone="brand" style={{ fontSize: d(12), lineHeight: d(16) }}>
              {showArchived ? tr('hide') : tr('show')}
            </Text>
          </Pressable>
          {showArchived
            ? archived.map((n) => <NotificationRow key={n.id} n={n} archived />)
            : null}
        </>
      ) : null}

      {/* "Nothing yet" is only true once the feed has actually answered. */}
      {!isPending && items.length === 0 && archived.length === 0 ? (
        <Text variant="bodyM" tone="tertiary" center style={{ fontSize: d(14), lineHeight: d(21) }}>
          {tr('empty')}
        </Text>
      ) : null}
    </FormScreen>
  );
}
