/**
 * Edit Profile — ported 1:1 from Figma node 213:366.
 *
 * Scroll content: V gap16, pad 64/24/140/24. A 72pt avatar with a 34pt camera
 * badge, YOUR DETAILS (four fields), then SECURITY (two rows).
 *
 * The phone field is Disabled, not editable in place: the number is the
 * account's recovery channel and the line a pharmacist calls before dispensing,
 * so changing it has to go back through verification. Migration 0009 enforces
 * the same rule in the database — the app cannot write that column.
 *
 * Everything on this screen is now true. Before, the avatar read "AM" for
 * everyone, the date of birth was a hardcoded "14 March 1994", the phone
 * carried a "Verified" badge whether or not anyone had verified it, and "Change
 * photo" opened the PRESCRIPTION uploader — a selfie taken there would have gone
 * to a pharmacist for review. Save wrote to the device only.
 */
import React, { useEffect, useState } from 'react';
import { View, Pressable, AppState } from 'react-native';
import { router } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen, StickyFooter } from '@/components/ui/FormScreen';
import { TitleAppBar } from '@/components/ui/AppBar';
import { SectionLabel } from '@/components/ui/Checkout';
import { InputField } from '@/components/ui/Input';
import { IconTile, Toggle } from '@/components/ui/ListRow';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { showDialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { FormMessage, describeFailure } from '@/components/ui/FormMessage';
import {
  authenticate,
  biometricStatus,
  isBiometricEnabled,
  openBiometricSettings,
  setBiometricEnabled,
  type BiometricStatus,
} from '@/lib/appLock';
import { changeEmail, updateProfile } from '@/lib/api';
import {
  dateOfBirthInput,
  initialsOf,
  parseDateOfBirth,
  type ProfilePatch,
} from '@/lib/profile';
import { useProfile, useProfileStore } from '@/features/profile/store';

/** Loose on purpose: the server is the judge; this only catches typos. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EditProfile() {
  const t = useTokens();
  const { d } = useDesignScale();
  const profile = useProfile();

  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [dob, setDob] = useState(dateOfBirthInput(profile.dateOfBirth));
  const [biometric, setBiometric] = useState(false);
  const [bioStatus, setBioStatus] = useState<BiometricStatus>('ready');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; dob?: string }>({});

  useEffect(() => {
    isBiometricEnabled().then(setBiometric);
    biometricStatus().then(setBioStatus);
    // Check again on return from the phone's settings, where a fingerprint
    // may just have been added.
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') biometricStatus().then(setBioStatus);
    });
    return () => sub.remove();
  }, []);

  const toggleBiometric = async (next: boolean) => {
    if (next) {
      if (bioStatus === 'not-enrolled') {
        showDialog({
          icon: 'shield-check',
          title: 'Add a fingerprint or face first',
          message: 'Set one up in your phone settings, then come back and turn this on.',
          actions: [
            { label: 'Open settings', onPress: () => void openBiometricSettings() },
            { label: 'Not now', variant: 'tertiary' },
          ],
        });
        return;
      }
      // Prove it works before relying on it, or the next lock is a lockout.
      if (!(await authenticate('Turn on biometric unlock'))) return;
    }
    setBiometric(next);
    await setBiometricEnabled(next);
  };

  // Illustrations and photo upload both live on Choose Avatar.
  const chooseAvatar = () => router.push('/choose-avatar');

  const save = async () => {
    setError(null);
    setNotice(null);

    // Validate everything before sending anything, so a bad date does not
    // leave a half-saved profile behind.
    const errors: typeof fieldErrors = {};
    const nextName = name.trim();
    if (!nextName) errors.name = 'Your name is how the pharmacy identifies your order.';

    const nextEmail = email.trim();
    if (!EMAIL.test(nextEmail)) errors.email = 'Enter a valid email address.';

    let nextDob: string | null | undefined;
    if (dob.trim()) {
      const parsed = parseDateOfBirth(dob);
      if ('error' in parsed) errors.dob = parsed.error;
      else nextDob = parsed.iso;
    } else {
      nextDob = null;
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    const patch: ProfilePatch = {};
    if (nextName !== profile.name) patch.name = nextName;
    if ((nextDob ?? undefined) !== profile.dateOfBirth) patch.dateOfBirth = nextDob ?? null;
    const emailChanged = nextEmail.toLowerCase() !== profile.email.toLowerCase();

    if (!Object.keys(patch).length && !emailChanged) {
      router.back();
      return;
    }

    setSaving(true);
    try {
      if (Object.keys(patch).length) {
        const saved = await updateProfile(patch);
        useProfileStore.getState().set(saved);
      }
      if (emailChanged) {
        const outcome = await changeEmail(nextEmail);
        if (outcome === 'pending') {
          // Stay on the screen: the person needs to know the change is not done.
          useProfileStore.getState().set({ pendingEmail: nextEmail });
          setEmail(profile.email);
          setNotice(
            `Check ${nextEmail} for a confirmation link. Until then, sign in with ${profile.email}.`,
          );
          return;
        }
        useProfileStore.getState().set({ email: nextEmail, pendingEmail: undefined });
      }
      router.back();
    } catch (e) {
      setError(describeFailure(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      <FormScreen gap={16}>
        <TitleAppBar title="Edit profile" />

        {/* Avatar block */}
        <View style={{ gap: d(12), alignItems: 'flex-start' }}>
          <View style={{ width: d(96), height: d(96) }}>
            <Avatar
              initials={initialsOf(profile.name) || '?'}
              uri={profile.avatarUrl}
              preset={profile.avatarPreset}
              size={72}
              label={profile.avatarUrl ? 'Your profile picture' : 'Your avatar'}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change profile picture"
              onPress={chooseAvatar}
              hitSlop={8}
              style={{
                position: 'absolute',
                left: d(52),
                top: d(52),
                width: d(34),
                height: d(34),
                borderRadius: t.radius.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: t.colors.bg.brand,
                borderWidth: 3,
                borderColor: t.colors.bg.canvas,
              }}
            >
              <Icon name="camera" size={d(16)} color={t.colors.icon.onBrand} />
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change profile picture"
            hitSlop={8}
            onPress={chooseAvatar}
          >
            <Text variant="labelM" tone="brand" style={{ fontSize: d(14), lineHeight: d(18) }}>
              Change avatar
            </Text>
          </Pressable>
        </View>

        <SectionLabel>YOUR DETAILS</SectionLabel>

        <InputField
          label="Full name"
          value={name}
          onChangeText={setName}
          autoComplete="name"
          error={fieldErrors.name}
        />

        <View style={{ gap: d(8) }}>
          <InputField label="Phone number" value={profile.phone} disabled />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              profile.phoneVerified
                ? 'Change your phone number. This re-verifies your account.'
                : 'Your phone number is not verified. Verify it now.'
            }
            onPress={() => router.push('/verify')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: d(8) }}
          >
            {profile.phoneVerified ? (
              <Badge label="Verified" tone="success" />
            ) : (
              <Badge label="Not verified" tone="warning" />
            )}
            <Text
              variant="caption"
              tone="tertiary"
              style={{ flex: 1, fontSize: d(12), lineHeight: d(16) }}
            >
              {profile.phoneVerified
                ? 'Tap to change'
                : 'Tap to verify'}
            </Text>
          </Pressable>
        </View>

        <InputField
          label="Email address"
          helper={
            profile.pendingEmail
              ? `Confirm ${profile.pendingEmail} from your inbox`
              : 'Receipts and prescription updates are sent here.'
          }
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          error={fieldErrors.email}
        />

        <InputField
          label="Date of birth"
          helper="DD/MM/YYYY"
          placeholder="DD/MM/YYYY"
          value={dob}
          onChangeText={setDob}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
          error={fieldErrors.dob}
        />

        <SectionLabel>SECURITY</SectionLabel>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change password"
          onPress={() => router.push('/set-password')}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: d(14),
            paddingVertical: d(12),
            paddingLeft: d(14),
            paddingRight: d(16),
            borderRadius: d(18),
            backgroundColor: t.colors.bg.surface,
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <IconTile name="shield-check" hue="mint" size={40} />
          <View style={{ flex: 1, gap: d(3) }}>
            <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
              Change password
            </Text>
            <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
              Update the password you sign in with
            </Text>
          </View>
          <Icon name="chevron-right" size={d(18)} tone="tertiary" />
        </Pressable>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: d(14),
            paddingVertical: d(12),
            paddingLeft: d(14),
            paddingRight: d(16),
            borderRadius: d(18),
            backgroundColor: t.colors.bg.surface,
          }}
        >
          <IconTile name="profile" hue="blue" size={40} />
          <View style={{ flex: 1, gap: d(3) }}>
            <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
              Biometric unlock
            </Text>
            <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
              {bioStatus === 'ready'
                ? 'Use your fingerprint or face to open the app'
                : bioStatus === 'not-enrolled'
                  ? 'Add a fingerprint or face on your phone first'
                  : 'Not available on this phone'}
            </Text>
          </View>
          <Toggle
            value={biometric && bioStatus === 'ready'}
            onValueChange={toggleBiometric}
            disabled={bioStatus === 'unsupported'}
            label="Biometric unlock"
          />
        </View>

        {notice ? <FormMessage tone="success">{notice}</FormMessage> : null}
        {error ? <FormMessage>{error}</FormMessage> : null}
      </FormScreen>

      <StickyFooter>
        <Button
          label="Save changes"
          size="large"
          loading={saving}
          disabled={saving}
          onPress={save}
        />
      </StickyFooter>
    </View>
  );
}
