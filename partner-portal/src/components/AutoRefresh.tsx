'use client';

/**
 * Re-reads the page's server data on an interval, so a new prescription shows
 * up in the queue without the pharmacist reloading. Paused while the tab is
 * hidden; refreshes at once when it comes back.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') router.refresh();
    };
    const id = window.setInterval(tick, seconds * 1000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [router, seconds]);
  return null;
}
