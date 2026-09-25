/**
 * Choose Avatar — pick an illustration, or upload a photo instead.
 *
 * Reached from Edit Profile's avatar. The preview at the top shows the choice
 * at the size people will see it before anything is saved; Save writes it.
 *
 * A photo, when there is one, is the first tile and starts selected. Picking an
 * illustration and saving replaces it — `setAvatarPreset` clears the photo,
 * because a photo would otherwise keep outranking the illustration everywhere
 * and the choice would appear to do nothing.
 */
import React, { useState } from 'react';
import { View, Pressable, Linking } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen, StickyFooter } from '@/components/ui/FormScreen';
import { TitleAppBar } from '@/components/ui/AppBar';
import { SectionLabel } from '@/components/ui/Checkout';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { showDialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { FormMessage, describeFailure } from '@/components/ui/FormMessage';
import {
  AVATAR_PRESETS,
  avatarPresetLabel,
  isAvatarPreset,
  type AvatarPreset,
} from '@/components/avatars';
import { setAvatarPreset, uploadAvatar } from '@/lib/api';
import { initialsOf } from '@/lib/profile';
import { useProfile, useProfileStore } from '@/features/profile/store';

type Choice = 'photo' | AvatarPreset;

/** Back to wherever it was opened from; Edit Profile when opened directly by a link. */
function leave() {
  if (router.canGoBack()) router.back();
  else router.replace('/edit-profile');
}

/** 4 across a 342pt column: (342 − 3 × 16) / 4 ≈ 73. */
const TILE = 72;

export default function ChooseAvatar() {
  const t = useTokens();
  const { d } = useDesignScale();
  const profile = useProfile();
  const initials = initialsOf(profile.name) || '?';

  const current: Choice | null = profile.avatarUrl
    ? 'photo'
    : isAvatarPreset(profile.avatarPreset)
      ? profile.avatarPreset
      : null;
  const [selected, setSelected] = useState<Choice | null>(current);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = saving || uploading;

  const save = async () => {
    if (!selected || selected === 'photo' || selected === current) {
      leave();
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await setAvatarPreset(selected);
      useProfileStore.getState().set({ avatarPreset: selected, avatarUrl: undefined });
      leave();
    } catch (e) {
      setError(describeFailure(e));
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showDialog({
        icon: 'image',
        tone: 'warning',
        title: 'Photo access is off',
        message: 'Turn it on in Settings to use a photo as your avatar.',
        actions: [
          { label: 'Open settings', onPress: () => void Linking.openSettings() },
          { label: 'Not now', variant: 'tertiary' },
        ],
      });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      // A profile picture is shown at 72pt at most. Anything sharper is upload
      // time on a phone network for pixels nobody sees.
      quality: 0.5,
    });
    const uri = result.canceled ? undefined : result.assets?.[0]?.uri;
    if (!uri) return;

    setError(null);
    setUploading(true);
    try {
      const avatarUrl = await uploadAvatar(uri);
      useProfileStore.getState().set({ avatarUrl });
      leave();
    } catch (e) {
      setError(describeFailure(e));
    } finally {
      setUploading(false);
    }
  };

  const tile = (choice: Choice, label: string, art: React.ReactNode) => {
    const isSelected = selected === choice;
    return (
      <Pressable
        key={choice}
        accessibilityRole="radio"
        accessibilityLabel={label}
        accessibilityState={{ selected: isSelected, disabled: busy }}
        disabled={busy}
        onPress={() => setSelected(choice)}
        style={({ pressed }) => ({
          width: d(TILE),
          height: d(TILE),
          borderRadius: t.radius.full,
          padding: d(3),
          borderWidth: 3,
          borderColor: isSelected ? t.colors.border.brand : 'transparent',
          opacity: pressed ? 0.85 : 1,
        })}
      >
        {art}
        {isSelected ? (
          <View
            style={{
              position: 'absolute',
              right: -d(2),
              bottom: -d(2),
              width: d(24),
              height: d(24),
              borderRadius: t.radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: t.colors.bg.brand,
              borderWidth: 2,
              borderColor: t.colors.bg.canvas,
            }}
          >
            <Icon name="check" size={d(12)} color={t.colors.icon.onBrand} />
          </View>
        ) : null}
      </Pressable>
    );
  };

  const inner = TILE - 12;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      <FormScreen gap={20}>
        <TitleAppBar title="Choose an avatar" />

        {/* Preview — the choice at profile size, before it is saved. */}
        <View style={{ alignItems: 'center', gap: d(12), paddingVertical: d(8) }}>
          <Avatar
            initials={initials}
            uri={selected === 'photo' ? profile.avatarUrl : undefined}
            preset={selected && selected !== 'photo' ? selected : undefined}
            size={112}
            label={
              selected === 'photo'
                ? 'Preview: your photo'
                : selected
                  ? `Preview: ${avatarPresetLabel(selected)}`
                  : 'Preview: no avatar chosen'
            }
          />
        </View>

        {([
          ['people', 'PEOPLE'],
          ['fruit', 'FRUITY'],
        ] as const).map(([group, heading]) => (
          <React.Fragment key={group}>
            <SectionLabel>{heading}</SectionLabel>
            <View
              accessibilityRole="radiogroup"
              style={{ flexDirection: 'row', flexWrap: 'wrap', gap: d(16) }}
            >
              {group === 'people' && profile.avatarUrl
                ? tile(
                    'photo',
                    'Your photo',
                    <Avatar initials={initials} uri={profile.avatarUrl} size={inner} label="Your photo" />,
                  )
                : null}
              {AVATAR_PRESETS.filter((a) => a.group === group).map((a) =>
                tile(a.id, a.label, <Avatar initials={initials} preset={a.id} size={inner} label={a.label} />),
              )}
            </View>
          </React.Fragment>
        ))}

        <SectionLabel>YOUR OWN PHOTO</SectionLabel>

        <Button
          label={uploading ? 'Uploading…' : profile.avatarUrl ? 'Upload a different photo' : 'Upload a photo'}
          variant="secondary"
          size="large"
          iconLeading="image"
          loading={uploading}
          disabled={busy}
          onPress={uploadPhoto}
        />

        {error ? <FormMessage>{error}</FormMessage> : null}
      </FormScreen>

      <StickyFooter>
        <Button
          label="Save avatar"
          size="large"
          loading={saving}
          disabled={busy || !selected || selected === current}
          onPress={save}
        />
      </StickyFooter>
    </View>
  );
}
