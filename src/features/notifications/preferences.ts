/**
 * Notification preferences — the server's copy, kept on the device.
 *
 * The last saved values are persisted so the switches draw correctly the next
 * time the screen opens, offline included; `null` means "never loaded for this
 * person" and the screen shows the switches inert until the first load lands.
 *
 * A flip is optimistic: the switch moves at once and the write follows. Writes
 * go out one at a time, in the order they were made, so two quick flips of the
 * same switch cannot land in reverse. If a write fails the switch goes back —
 * but only if nobody has flipped it again since, which would have been a newer
 * decision.
 *
 * Emptied by `clearUserData` with everything else that belongs to a person.
 */
import { useEffect } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getNotificationPrefs, saveNotificationPref } from '@/lib/api';
import type { NotificationPrefKey, NotificationPrefs } from '@/lib/notificationPrefs';

type State = { prefs: NotificationPrefs | null };

export const useNotificationPrefsStore = create<State>()(
  persist(() => ({ prefs: null as NotificationPrefs | null }), {
    name: 'altruist.notification-prefs',
    storage: createJSONStorage(() => AsyncStorage),
  }),
);

let loading: Promise<void> | null = null;

/** Fetches from the server. Keeps the stored copy if the fetch fails. Never throws. */
export function loadNotificationPrefs(): Promise<void> {
  if (!loading) {
    loading = getNotificationPrefs()
      .then((prefs) => {
        useNotificationPrefsStore.setState({ prefs });
      })
      .catch(() => {})
      .finally(() => {
        loading = null;
      });
  }
  return loading;
}

let writes: Promise<unknown> = Promise.resolve();

/** Flips one switch now and saves it. Rejects if the save failed (and reverts). */
export function setNotificationPref(key: NotificationPrefKey, value: boolean): Promise<void> {
  const current = useNotificationPrefsStore.getState().prefs;
  if (!current) return Promise.resolve();
  const previous = current[key];
  useNotificationPrefsStore.setState({ prefs: { ...current, [key]: value } });

  const write = writes.then(() => saveNotificationPref(key, value));
  writes = write.catch(() => {});
  return write.catch((e) => {
    const now = useNotificationPrefsStore.getState().prefs;
    if (now && now[key] === value) {
      useNotificationPrefsStore.setState({ prefs: { ...now, [key]: previous } });
    }
    throw e;
  });
}

/** The preferences, fetched fresh whenever a screen showing them mounts. */
export function useNotificationPrefs(): NotificationPrefs | null {
  const prefs = useNotificationPrefsStore((s) => s.prefs);
  useEffect(() => {
    void loadNotificationPrefs();
  }, []);
  return prefs;
}
