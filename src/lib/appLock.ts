/**
 * App lock — the trigger behind the App Lock screen.
 *
 * Rule: if biometric unlock is on and the app has been in the background for
 * longer than the grace period, the next foreground shows the lock screen.
 *
 * The grace period matters. Locking on every backgrounding punishes the normal
 * act of checking a text message mid-order, and users respond by turning the
 * feature off — which is strictly worse for the thing it protects. Thirty
 * seconds covers app-switching without covering "I put my phone on the table".
 *
 * What this protects is specific: prescription images are health data under the
 * Data Protection Act 2012 (Act 843), and the phone's own lock screen is not a
 * control Altruist can attest to.
 */
import { Linking, Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_KEY = 'altruist.biometricUnlock';
const GRACE_MS = 30_000;

let backgroundedAt: number | null = null;

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
        await Linking.sendIntent(action);
        return;
      } catch {
        // Not on this Android version; try the next one.
      }
    }
  }
  await Linking.openSettings().catch(() => {});
}

export function markBackgrounded(): void {
  backgroundedAt = Date.now();
}

/** Call on foreground. True when the lock screen should be shown. */
export async function shouldLock(): Promise<boolean> {
  if (backgroundedAt === null) return false;
  const away = Date.now() - backgroundedAt;
  backgroundedAt = null;
  if (away < GRACE_MS) return false;
  return (await isBiometricEnabled()) && (await canUseBiometrics());
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
