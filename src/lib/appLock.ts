/**
 * App lock — the trigger behind the App Lock screen.
 *
 * Rule: if biometric unlock is on, coming back to the app after it went to the
 * background — for any length of time — shows the lock screen. (The owner
 * chose this over a grace period.) Only a real trip to the background counts:
 * pulling down Control Centre or a notification makes the app `inactive`, not
 * `background`, and does not lock.
 *
 * Trips the app itself sends you on — the photo picker, camera, share sheet,
 * provider sign-in, Settings, a phone or mail link — are wrapped in
 * `leaveAppFor`, so finishing one does not land on a lock screen halfway
 * through uploading a prescription.
 *
 * What this protects is specific: prescription images are health data under the
 * Data Protection Act 2012 (Act 843), and the phone's own lock screen is not a
 * control Altruist can attest to.
 */
import { Linking, Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_KEY = 'altruist.biometricUnlock';
let backgroundedAt: number | null = null;
/** Whether the lock screen is up, so a second trip away does not stack another. */
let lockShowing = false;
export const setLockShowing = (showing: boolean) => {
  lockShowing = showing;
};
export const isLockShowing = () => lockShowing;
/** Set while the app has sent the person elsewhere on purpose. */
let expectingReturnUntil = 0;

export async function isBiometricEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(BIOMETRIC_KEY)) === 'true';
  } catch {
    // A failed read must not lock the user out of their own app.
    return false;
  }
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(BIOMETRIC_KEY, enabled ? 'true' : 'false');
  } catch {
    // Non-fatal: the preference simply does not persist.
  }
}

/**
 * Whether this phone can do a biometric check right now.
 *
 * `not-enrolled` is the common one: the sensor is there but no fingerprint or
 * face has been added. That is fixable in the phone's settings, so the switch
 * stays tappable and offers to take the person there — a greyed-out switch
 * gave no way forward and read as broken.
 */
export type BiometricStatus = 'ready' | 'not-enrolled' | 'unsupported';

export async function biometricStatus(): Promise<BiometricStatus> {
  try {
    if (!(await LocalAuthentication.hasHardwareAsync())) return 'unsupported';
    return (await LocalAuthentication.isEnrolledAsync()) ? 'ready' : 'not-enrolled';
  } catch {
    return 'unsupported';
  }
}

/** True when the device can actually perform a biometric check. */
export async function canUseBiometrics(): Promise<boolean> {
  return (await biometricStatus()) === 'ready';
}

/**
 * Opens the phone's settings where a fingerprint or face can be added. Android
 * has a direct enrolment screen (API 30+); older versions and iOS get the
 * closest page there is.
 */
export async function openBiometricSettings(): Promise<void> {
  if (Platform.OS === 'android') {
    for (const action of ['android.settings.BIOMETRIC_ENROLL', 'android.settings.SECURITY_SETTINGS']) {
      try {
        await leaveAppFor(() => Linking.sendIntent(action));
        return;
      } catch {
        // Not on this Android version; try the next one.
      }
    }
  }
  await leaveAppFor(() => Linking.openSettings()).catch(() => {});
}

export function markBackgrounded(): void {
  backgroundedAt = Date.now();
}

/** Call on foreground. True when the lock screen should be shown. */
export async function shouldLock(): Promise<boolean> {
  if (backgroundedAt === null) return false;
  backgroundedAt = null;
  if (Date.now() < expectingReturnUntil) {
    expectingReturnUntil = 0;
    return false;
  }
  return (await isBiometricEnabled()) && (await canUseBiometrics());
}

/** True when a cold start should open on the lock screen. */
export async function shouldLockOnLaunch(): Promise<boolean> {
  return (await isBiometricEnabled()) && (await canUseBiometrics());
}

/**
 * Runs something that takes the person out of the app (picker, camera, share
 * sheet, browser, Settings, a phone call) without locking them out when they
 * come back from it. The allowance lasts ten minutes and one return.
 */
export async function leaveAppFor<T>(run: () => Promise<T> | T): Promise<T> {
  expectingReturnUntil = Date.now() + 10 * 60_000;
  return await run();
}

/** Runs the OS prompt. Returns true when the user is through. */
export async function authenticate(promptMessage = 'Unlock Altruist'): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Use password instead',
    });
    return result.success;
  } catch {
    return false;
  }
}
