/**
 * Notification feed read.
 *
 * The feed is server data, so it goes through React Query like the catalogue
 * and promotions do — not through the persisted store. That split matters:
 * the store's earlier attempt to fetch into itself raced AsyncStorage
 * rehydration and the screen settled on an empty list.
 *
 * Short stale time: a delivery moving or a prescription being verified is
 * exactly the kind of thing someone opens this screen to check.
 */
import { useQuery } from '@tanstack/react-query';
import { listNotifications } from '@/lib/api';

export const notificationKeys = { all: ['notifications'] as const };

export function useNotificationFeed() {
  return useQuery({
    queryKey: notificationKeys.all,
    queryFn: listNotifications,
    staleTime: 30_000,
  });
}
