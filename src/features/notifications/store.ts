/**
 * Which notifications this person has read, archived or deleted.
 *
 * ONLY those id sets. The feed itself is server data and comes from React Query
 * (`features/notifications/queries.ts`) — an earlier version fetched into this
 * store and raced AsyncStorage rehydration, which left the screen empty.
 *
 * Read state has to survive a restart: a badge that resets to "3 unread" on
 * every cold start trains people to ignore it. Only ids are stored, so a
 * notification that drops out of the feed costs nothing.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Notification } from '@/lib/notifications';
import { useNotificationFeed } from './queries';

type State = {
  /** Ids the user has opened or marked read. */
  read: string[];
  /** Swiped to "Archived": out of the main list, still one tap away. */
  archived: string[];
  /** Swiped away for good. */
  deleted: string[];
  markRead: (id: string) => void;
  markAllRead: (ids: string[]) => void;
  archive: (id: string) => void;
  unarchive: (id: string) => void;
  remove: (id: string) => void;
};

export const useNotificationStore = create<State>()(
  persist(
    (set, get) => ({
      read: [],
      archived: [],
      deleted: [],
      markRead: (id) => {
        const read = get().read;
        if (read.includes(id)) return;
        set({ read: [...read, id] });
      },
      markAllRead: (ids) => {
        const read = get().read;
        const next = ids.filter((id) => !read.includes(id));
        if (!next.length) return;
        set({ read: [...read, ...next] });
      },
      // Archiving or deleting counts as having seen it: neither should leave
      // a badge behind for something no longer on the list.
      archive: (id) => {
        const { archived, read } = get();
        set({
          archived: archived.includes(id) ? archived : [...archived, id],
          read: read.includes(id) ? read : [...read, id],
        });
      },
      unarchive: (id) => set({ archived: get().archived.filter((x) => x !== id) }),
      remove: (id) => {
        const { deleted, read, archived } = get();
        set({
          deleted: deleted.includes(id) ? deleted : [...deleted, id],
          read: read.includes(id) ? read : [...read, id],
          archived: archived.filter((x) => x !== id),
        });
      },
    }),
    {
      name: 'altruist.notifications',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/**
 * The feed with local state applied: deleted ones gone, archived ones split
 * out, read ones marked. The badge counts only the main list.
 */
export function useNotifications(): {
  items: Notification[];
  archived: Notification[];
  unreadCount: number;
  isPending: boolean;
} {
  const { data, isPending } = useNotificationFeed();
  const read = useNotificationStore((s) => s.read);
  const archivedIds = useNotificationStore((s) => s.archived);
  const deleted = useNotificationStore((s) => s.deleted);

  const all = (data ?? [])
    .filter((n) => !deleted.includes(n.id))
    .map((n) => ({ ...n, unread: n.unread && !read.includes(n.id) }));
  const items = all.filter((n) => !archivedIds.includes(n.id));
  const archived = all.filter((n) => archivedIds.includes(n.id));
  return { items, archived, unreadCount: items.filter((n) => n.unread).length, isPending };
}
