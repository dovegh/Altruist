/**
 * Session + first-run state.
 *
 * SRS §4.A: Splash reads the auth token from secure storage. Token present →
 * Home. Absent → Onboarding.
 *
 * The auth token goes in SecureStore (Keychain / Keystore), never AsyncStorage.
 * The "has seen onboarding" flag is not sensitive, so AsyncStorage is fine and
 * avoids a Keychain round-trip on every cold start.
 */
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'altruist.auth-token';
const REFRESH_KEY = 'altruist.refresh-token';
const ONBOARDED_KEY = 'altruist.has-onboarded';

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    // A locked or unavailable keychain must read as "signed out", never as a crash.
    return null;
  }
}

export async function setSession(token: string, refresh?: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  if (refresh) {
    await SecureStore.setItemAsync(REFRESH_KEY, refresh, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }
}

export async function clearSession(): Promise<void> {
  await Promise.allSettled([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
  ]);
}

export async function hasOnboarded(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDED_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function markOnboarded(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDED_KEY, '1').catch(() => {});
}

/** Dev helper — wipes first-run state so the onboarding flow can be re-tested. */
export async function resetFirstRun(): Promise<void> {
  await Promise.allSettled([clearSession(), AsyncStorage.removeItem(ONBOARDED_KEY)]);
}
