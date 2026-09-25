/**
 * Prescription Upload — ported from Figma node 40:117.
 *
 * Scroll content: V gap18, pad 64/24/120/24. Capture zone is 342×250, r28,
 * bg/surface with a 1.5pt DASHED border/brand — the dash is what says "drop a
 * photo here" rather than "this is a card". Once a photo is chosen the zone
 * shows it: the dash has done its job and the user's next question is whether
 * the dosage line is readable, which only the photo can answer.
 *
 * The blue liability panel is not optional copy. SRS §1: Altruist is a
 * technology bridge, and this is the screen where a user is most likely to
 * believe they are handing a prescription to a pharmacy rather than to a
 * platform that routes it to one.
 *
 * Opened as `/prescription-upload?for=id,id` from the Cart's gate, so the
 * pharmacist reviews the script against the items it is meant to cover. Opened
 * bare from the Prescriptions tab, where there is no cart context yet.
 */
import React, { useState } from 'react';
import { View, Pressable, Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen } from '@/components/ui/FormScreen';
import { TitleAppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { showDialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';

export default function PrescriptionUpload() {
  const t = useTokens();
  const { d } = useDesignScale();
  const { for: forParam } = useLocalSearchParams<{ for?: string }>();
  const [uri, setUri] = useState<string | null>(null);

  const productIds = (forParam ?? '').split(',').filter(Boolean);

  const handle = async (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled) return;
    setUri(result.assets[0]?.uri ?? null);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      // A denied permission is a decision, not an error — say what it cost and
      // leave the gallery route open rather than nagging.
      showDialog({
        icon: 'camera',
        tone: 'warning',
        title: 'Camera access is off',
        message: 'Turn it on in Settings, or choose a photo from your gallery instead.',
        actions: [
          { label: 'Open settings', onPress: () => void Linking.openSettings() },
          { label: 'Not now', variant: 'tertiary' },
        ],
      });
      return;
    }
    handle(await ImagePicker.launchCameraAsync({ quality: 0.8 }));
  };

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showDialog({
        icon: 'image',
        tone: 'warning',
        title: 'Photo access is off',
        message: 'Turn it on in Settings to attach a photo of your prescription.',
        actions: [
          { label: 'Open settings', onPress: () => void Linking.openSettings() },
          { label: 'Not now', variant: 'tertiary' },
        ],
      });
      return;
    }
    handle(
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      }),
    );
  };

  const send = () => {
    router.replace({
      pathname: '/processing',
      params: { uri: uri ?? '', for: productIds.join(',') },
    });
  };

  return (
    <FormScreen gap={18}>
      <TitleAppBar title="Upload prescription" />

      {/* Capture zone — dashed brand border until there is a photo in it. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={uri ? 'Retake the photo' : 'Take a photo of your prescription'}
        onPress={takePhoto}
        style={({ pressed }) => ({
          height: d(250),
          borderRadius: d(28),
          overflow: 'hidden',
          backgroundColor: t.colors.bg.surface,
          borderWidth: 1.5,
          borderColor: t.colors.border.brand,
          borderStyle: uri ? 'solid' : 'dashed',
          alignItems: 'center',
          justifyContent: 'center',
          gap: d(14),
          paddingHorizontal: uri ? 0 : d(32),
          opacity: pressed ? 0.9 : 1,
        })}
      >
        {uri ? (
          <>
            <Image
              source={{ uri }}
              contentFit="cover"
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              accessibilityLabel="The prescription you are about to send"
            />
            <View
              style={{
                position: 'absolute',
                bottom: d(14),
                flexDirection: 'row',
                alignItems: 'center',
                gap: d(8),
                paddingLeft: d(14),
                paddingRight: d(16),
                paddingVertical: d(9),
                borderRadius: t.radius.full,
                backgroundColor: t.colors.bg.surface,
              }}
            >
              <Icon name="camera" size={d(16)} tone="primary" />
              <Text variant="labelS" style={{ fontSize: d(12), lineHeight: d(16) }}>
                Retake
              </Text>
            </View>
          </>
        ) : (
          <>
            <View
              style={{
                width: d(72),
                height: d(72),
                borderRadius: t.radius.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: t.colors.bg.brand,
              }}
            >
              <Icon name="camera" size={d(32)} color={t.colors.icon.onBrand} />
            </View>
            <Text variant="headingM" center style={{ fontSize: d(18), lineHeight: d(24) }}>
              Take a photo of your prescription
            </Text>
            <Text variant="bodyS" tone="secondary" center style={{ fontSize: d(13), lineHeight: d(19) }}>
              Lay it flat, fill the frame, and keep the dosage line readable.
            </Text>
          </>
        )}
      </Pressable>

      <Button
        label="Choose from gallery"
        variant="secondary"
        size="large"
        iconLeading="image"
        onPress={pickFromGallery}
      />

      {/* Liability notice — blue, informational */}
      <View
        style={{
          flexDirection: 'row',
          gap: d(12),
          padding: d(16),
          borderRadius: d(20),
          backgroundColor: t.colors.bg.infoSubtle,
        }}
      >
        <Icon name="shield-check" size={d(20)} tone="primary" />
        <View style={{ flex: 1, gap: d(4) }}>
          <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
            Reviewed by a licensed pharmacist
          </Text>
          <Text variant="bodyS" tone="secondary" style={{ fontSize: d(13), lineHeight: d(19) }}>
            Checked and dispensed by a licensed partner pharmacy.
          </Text>
        </View>
      </View>

      <Button
        label="Send to partner pharmacy"
        size="large"
        // Nothing to send without a photo. Sending anyway would put an empty
        // record in the pharmacist's queue for them to reject.
        disabled={!uri}
        onPress={send}
      />
    </FormScreen>
  );
}
