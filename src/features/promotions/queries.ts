/**
 * Promotions read.
 *
 * Campaigns turn over faster than a catalogue but far slower than an order
 * status, so this sits between the two stale times — long enough that the Home
 * tab does not refetch on every visit, short enough that a campaign ending does
 * not linger for a session.
 */
import { useQuery } from '@tanstack/react-query';
import { listPromotions } from '@/lib/api';

export const promotionKeys = { all: ['promotions'] as const };

export function usePromotions() {
  return useQuery({
    queryKey: promotionKeys.all,
    queryFn: listPromotions,
    staleTime: 2 * 60_000,
  });
}
