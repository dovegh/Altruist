/**
 * Wellness reminders — the "Wellness plan nudges" switch, made real.
 *
 * Scheduled on the phone (expo-notifications, local, daily repeating), so they
 * need no server and arrive offline:
 *   07:00               today's plan
 *   10:00 13:00 16:00 19:00   a glass of water
 *
 * Driven by one saved setting, `wellnessNudges` in notification_preferences
 * (0011), which both Notification Settings and Settings now flip. Turning it
 * off cancels every reminder this module scheduled — and only those; nothing
 * else the app schedules is touched.
 *
 * Asking for notification permission happens the first time the switch is on,
 * not at launch: the question makes sense only once someone has asked for
 * reminders.
 */
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import type * as NotificationsModule from 'expo-notifications';
import { router } from 'expo-router';
import { useNotificationPrefsStore } from '@/features/notifications/preferences';
import { defineStrings, translate, useLanguage } from '@/i18n';

// Expo Go on Android throws when expo-notifications loads; real builds can load it.
const UNSUPPORTED = Platform.OS === 'android' && isRunningInExpoGo();
const Notifications: typeof NotificationsModule | null = UNSUPPORTED
  ? null
  : require('expo-notifications');

const S = defineStrings({
  en: {
    channel: 'Wellness reminders',
    planTitle: 'Your wellness plan for today',
    planBody: 'A few minutes of movement is ready when you are.',
    waterTitle: 'Time for a glass of water',
    waterBody: 'Tap to log it.',
  },
  fr: {
    channel: 'Rappels bien-être',
    planTitle: 'Votre programme bien-être du jour',
    planBody: 'Quelques minutes de mouvement vous attendent quand vous voulez.',
    waterTitle: "C'est l'heure d'un verre d'eau",
    waterBody: 'Touchez pour le noter.',
  },
  tw: {
    channel: 'Apɔmuden nkaeɛ',
    planTitle: 'Wo apɔmuden nhyehyɛeɛ ma ɛnnɛ',
    planBody: 'Apɔmuhyɛ simma kakra retwɛn wo.',
    waterTitle: 'Bere aso sɛ wonom nsuo kuruwa baako',
    waterBody: 'Mia so na kyerɛw.',
  },
  gaa: {
    channel: 'Hewalɛ he kaimɔi',
    planTitle: 'Bo hewalɛ he toiŋjɔlɛmɔ ha ŋmɛnɛ',
    planBody: 'Gbɔmɔtsoŋ kpaa minitii fioo miimɛ bo.',
    waterTitle: 'Be ni obaanu nu kɔpu kome eshɛ',
    waterBody: 'Nɔ nɔ koni oŋma.',
  },
  ee: {
    channel: 'Lãmesẽ ŋkuɖodzinyawo',
    planTitle: 'Wò lãmesẽ ɖoɖo na egbe',
    planBody: 'Ŋutilãkatsaɖaŋu miniti ʋɛ aɖewo le lalam na wò.',
    waterTitle: 'Ɣeyiɣi ɖo be nàno tsi kplu ɖeka',
    waterBody: 'Zi edzi nàŋlɔe ɖi.',
  },
  ha: {
    channel: 'Tunatarwar lafiya',
    planTitle: 'Tsarin lafiyarka na yau',
    planBody: 'Motsa jiki na ɗan mintuna yana jiranka.',
    waterTitle: 'Lokacin shan kofin ruwa ya yi',
    waterBody: 'Taɓa don yin rikodi.',
  },
});

const PREFIX = 'wellness-';
const CHANNEL = 'wellness';
const WATER_HOURS = [10, 13, 16, 19];

// Show reminders even while the app is open.
Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function permitted(Notifications: typeof NotificationsModule): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

async function cancelOurs(Notifications: typeof NotificationsModule): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/** Schedules or clears the reminders to match `enabled`. Never throws. */
export async function syncWellnessReminders(enabled: boolean): Promise<void> {
  if (!Notifications) return;
  try {
    await cancelOurs(Notifications);
    if (!enabled || !(await permitted(Notifications))) return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: translate(S, 'channel'),
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const daily = (hour: number) => ({
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute: 0,
      channelId: CHANNEL,
    } as const);

    await Notifications.scheduleNotificationAsync({
      identifier: `${PREFIX}plan`,
      content: {
        title: translate(S, 'planTitle'),
        body: translate(S, 'planBody'),
        data: { url: '/wellness' },
      },
      trigger: daily(7),
    });

    await Promise.all(
      WATER_HOURS.map((hour) =>
        Notifications.scheduleNotificationAsync({
          identifier: `${PREFIX}water-${hour}`,
          content: {
            title: translate(S, 'waterTitle'),
            body: translate(S, 'waterBody'),
            data: { url: '/wellness' },
          },
          trigger: daily(hour),
        }),
      ),
    );
  } catch {
    // A reminder that fails to schedule is not worth an error on screen.
  }
}

/**
 * Keeps the reminders in step with the saved setting, and opens the right
 * screen when one is tapped. Mount once, at the root.
 */
export function useWellnessReminders(): void {
  const enabled = useNotificationPrefsStore((s) => s.prefs?.wellnessNudges);
  // Scheduled reminders carry their text, so a language change reschedules them.
  const lang = useLanguage();

  useEffect(() => {
    if (enabled === undefined) return; // not loaded yet — leave things as they are
    void syncWellnessReminders(enabled);
  }, [enabled, lang]);

  useEffect(() => {
    if (!Notifications) return;
    const open = (response: NotificationsModule.NotificationResponse | null) => {
      const url = response?.notification.request.content.data?.url;
      if (typeof url === 'string' && url.startsWith('/')) router.push(url as never);
    };
    // Opened from a reminder while the app was closed.
    open(Notifications.getLastNotificationResponse());
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, []);

  // A person who turned reminders on, then denied permission in Settings and
  // came back, gets them rescheduled once permission is granted again.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const on = useNotificationPrefsStore.getState().prefs?.wellnessNudges;
      if (state === 'active' && on) void syncWellnessReminders(true);
    });
    return () => sub.remove();
  }, []);
}
