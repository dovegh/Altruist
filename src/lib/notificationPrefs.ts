/**
 * Which notifications a person wants, and how they want them reached.
 *
 * Mirrors `public.notification_preferences` (0011) one to one. The database
 * owns the defaults; `DEFAULT_NOTIFICATION_PREFS` is only what the fixture
 * backend returns, and must match the column defaults there.
 *
 * Prescription verified/rejected is deliberately absent: it always sends.
 */
export type NotificationPrefs = {
  orderStatus: boolean;
  riderApproaching: boolean;
  refillReminders: boolean;
  wellnessNudges: boolean;
  /** Marketing — opt-in only (Act 843). */
  offers: boolean;
  /** Marketing — opt-in only (Act 843). */
  healthDigest: boolean;
  push: boolean;
  sms: boolean;
  email: boolean;
};

export type NotificationPrefKey = keyof NotificationPrefs;

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  orderStatus: true,
  riderApproaching: true,
  refillReminders: true,
  wellnessNudges: false,
  offers: false,
  healthDigest: false,
  push: true,
  sms: true,
  email: false,
};

/** App field → table column. */
export const NOTIFICATION_PREF_COLUMNS: Record<NotificationPrefKey, string> = {
  orderStatus: 'order_status',
  riderApproaching: 'rider_approaching',
  refillReminders: 'refill_reminders',
  wellnessNudges: 'wellness_nudges',
  offers: 'offers',
  healthDigest: 'health_digest',
  push: 'channel_push',
  sms: 'channel_sms',
  email: 'channel_email',
};
