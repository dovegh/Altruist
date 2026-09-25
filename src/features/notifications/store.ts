/**
 * Which notifications this person has read.
 *
 * ONLY the read set. The feed itself is server data and comes from React Query
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
  markRead: (id: string) => void;
  markAllRead: (ids: string[]) => void;
};

export const useNotificationStore = create<State>()(
  persist(
    (set, get) => ({
      read: [],
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
    }),
    {
      name: 'altruist.notifications',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/** The feed with local read state applied, plus the badge count. */
export function useNotifications(): {
  items: Notification[];
  unreadCount: number;
  isPending: boolean;
} {
  const { data, isPending } = useNotificationFeed();
  const read = useNotificationStore((s) => s.read);

  const items = (data ?? []).map((n) => ({ ...n, unread: n.unread && !read.includes(n.id) }));
  return { items, unreadCount: items.filter((n) => n.unread).length, isPending };
}
