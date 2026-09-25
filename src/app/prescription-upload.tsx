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
import { leaveAppFor } from '@/lib/appLock';
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    title: 'Upload prescription',
    cameraOffTitle: 'Camera access is off',
    cameraOffMessage: 'Turn it on in Settings, or choose a photo from your gallery instead.',
    photosOffTitle: 'Photo access is off',
    photosOffMessage: 'Turn it on in Settings to attach a photo of your prescription.',
    openSettings: 'Open settings',
    notNow: 'Not now',
    retakeA11y: 'Retake the photo',
    takePhoto: 'Take a photo of your prescription',
    previewA11y: 'The prescription you are about to send',
    retake: 'Retake',
    tip: 'Lay it flat, fill the frame, and keep the dosage line readable.',
    gallery: 'Choose from gallery',
    reviewedBy: 'Reviewed by a licensed pharmacist',
    dispensedBy: 'Checked and dispensed by a licensed partner pharmacy.',
    send: 'Send to partner pharmacy',
  },
  fr: {
    title: "Envoyer l'ordonnance",
    cameraOffTitle: "L'accès à l'appareil photo est désactivé",
    cameraOffMessage: 'Activez-le dans les Réglages, ou choisissez plutôt une photo dans votre galerie.',
    photosOffTitle: "L'accès aux photos est désactivé",
    photosOffMessage: 'Activez-le dans les Réglages pour joindre une photo de votre ordonnance.',
    openSettings: 'Ouvrir les réglages',
    notNow: 'Plus tard',
    retakeA11y: 'Reprendre la photo',
    takePhoto: 'Photographiez votre ordonnance',
    previewA11y: "L'ordonnance que vous allez envoyer",
    retake: 'Reprendre',
    tip: 'Posez-la à plat, remplissez le cadre et gardez la ligne de posologie lisible.',
    gallery: 'Choisir dans la galerie',
    reviewedBy: 'Examinée par un pharmacien agréé',
    dispensedBy: 'Contrôlée et délivrée par une pharmacie partenaire agréée.',
    send: 'Envoyer à la pharmacie partenaire',
  },
  tw: {
    title: 'Fa nnuro krataa to so',
    cameraOffTitle: 'Kamera no ayɛ mum',
    cameraOffMessage: 'Bue wɔ Nhyehyɛeɛ mu, anaa yi mfonini fi wo mfonini korabea mu.',
    photosOffTitle: 'Mfonini kwan ayɛ mum',
    photosOffMessage: 'Bue wɔ Nhyehyɛeɛ mu na fa wo nnuro krataa mfonini ka ho.',
    openSettings: 'Bue nhyehyɛeɛ',
    notNow: 'Ɛnnɛ deɛ, daabi',
    retakeA11y: 'San twa mfonini no',
    takePhoto: 'Twa wo nnuro krataa mfonini',
    previewA11y: 'Nnuro krataa a wobɛsoma no',
    retake: 'San twa',
    tip: 'Fa to fam tamaa, ma ɛnyɛ ahwehwɛ no ma, na ma nnuro dodoɔ no nsɛm nna hɔ pefee.',
    gallery: 'Yi fi mfonini korabea',
    reviewedBy: 'Oduruyɛfoɔ a ɔwɔ tumi krataa na ɔhwɛ mu',
    dispensedBy: 'Nnuro adetɔnbea a ɔyɛ yɛn hokafoɔ a ɔwɔ tumi krataa na ɔhwɛ mu na ɔma wo nnuro no.',
    send: 'Soma kɔ nnuro adetɔnbea hokafoɔ',
  },
  gaa: {
    title: 'Kɛ tsofa wolo lɛ ya',
    cameraOffTitle: 'Kamera lɛ egbɔ',
    cameraOffMessage: 'Bue yɛ Toiŋjɔlɛmɔi mli, loo nɔ mfoniri ko kɛjɛ o mfonirii ateŋ.',
    photosOffTitle: 'Mfonirii gbɛ egbɔ',
    photosOffMessage: 'Bue yɛ Toiŋjɔlɛmɔi mli koni okɛ o tsofa wolo lɛ mfoniri afata he.',
    openSettings: 'Bue toiŋjɔlɛmɔi',
    notNow: 'Jeee amrɔ nɛɛ',
    retakeA11y: 'Ŋma mfoniri lɛ ekoŋŋ',
    takePhoto: 'Ŋma o tsofa wolo lɛ mfoniri',
    previewA11y: 'Tsofa wolo ni ooo kɛya lɛ',
    retake: 'Ŋma ekoŋŋ',
    tip: 'To lɛ shi tɛŋŋ, ha eyi fɛɛ, ni ha tsofa nɔmɔ gbɛ lɛ akane faŋŋ.',
    gallery: 'Nɔ kɛjɛ mfonirii ateŋ',
    reviewedBy: 'Tsofatsɛ ni yɔɔ ŋmɛnɛ krataa kwɛɔ mli',
    dispensedBy: 'Tsofa shĩa ni ji wɔ hefatalɔ ni yɔɔ ŋmɛnɛ krataa kwɛɔ mli ni ekɛ tsofa lɛ haa.',
    send: 'Kɛya tsofa shĩa hefatalɔ lɛ',
  },
  ee: {
    title: 'Ɖo atikeŋɔŋlɔ ɖa',
    cameraOffTitle: 'Wotu kamera la',
    cameraOffMessage: 'Ʋu eme le Ɖoɖowo me, alo tia foto aɖe tso wò fotowo me boŋ.',
    photosOffTitle: 'Wotu fotowo ƒe mɔ',
    photosOffMessage: 'Ʋu eme le Ɖoɖowo me be nàtsɔ wò atikeŋɔŋlɔ ƒe foto akpe ɖe eŋu.',
    openSettings: 'Ʋu ɖoɖowo',
    notNow: 'Menye fifia o',
    retakeA11y: 'Gaɖe foto la',
    takePhoto: 'Ɖe wò atikeŋɔŋlɔ ƒe foto',
    previewA11y: 'Atikeŋɔŋlɔ si nèle ɖoɖom',
    retake: 'Gaɖee',
    tip: 'Mlɔe ɖe anyi, na wòayɔ foto la me, eye na atike ƒe agbɔsɔsɔ ƒe fli la nadze nyuie.',
    gallery: 'Tiae tso fotowo me',
    reviewedBy: 'Atikedzrala si si mɔɖeɖe le la dzrɔ̃e me',
    dispensedBy: 'Atikedzraƒe si nye mía hati si si mɔɖeɖe le la dzrɔ̃nɛ me eye wòtsɔa atikea naa.',
    send: 'Ɖoe ɖe atikedzraƒe hati la',
  },
  ha: {
    title: 'Ɗora takardar magani',
    cameraOffTitle: 'An kashe damar kyamara',
    cameraOffMessage: 'Kunna shi a cikin Saituna, ko ka zaɓi hoto daga hotunanka.',
    photosOffTitle: 'An kashe damar hotuna',
    photosOffMessage: 'Kunna shi a cikin Saituna don haɗa hoton takardar maganinka.',
    openSettings: 'Buɗe saituna',
    notNow: 'Ba yanzu ba',
    retakeA11y: 'Sake ɗaukar hoton',
    takePhoto: 'Ɗauki hoton takardar maganinka',
    previewA11y: 'Takardar maganin da za ka aika',
    retake: 'Sake ɗauka',
    tip: 'Shimfiɗa ta, ta cika hoton, kuma layin yawan magani ya zama mai karantuwa.',
    gallery: 'Zaɓa daga hotuna',
    reviewedBy: 'Likitan magunguna mai lasisi ne ke dubawa',
    dispensedBy: 'Kantin magani abokin hulɗa mai lasisi ne ke dubawa kuma yake bayarwa.',
    send: 'Aika wa kantin magani abokin hulɗa',
  },
});

export default function PrescriptionUpload() {
  const tr = useT(S);
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
        title: tr('cameraOffTitle'),
        message: tr('cameraOffMessage'),
        actions: [
          { label: tr('openSettings'), onPress: () => void leaveAppFor(() => Linking.openSettings()) },
          { label: tr('notNow'), variant: 'tertiary' },
        ],
      });
      return;
    }
    handle(await leaveAppFor(() => ImagePicker.launchCameraAsync({ quality: 0.8 })));
  };

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showDialog({
        icon: 'image',
        tone: 'warning',
        title: tr('photosOffTitle'),
        message: tr('photosOffMessage'),
        actions: [
          { label: tr('openSettings'), onPress: () => void leaveAppFor(() => Linking.openSettings()) },
          { label: tr('notNow'), variant: 'tertiary' },
        ],
      });
      return;
    }
    handle(
      await leaveAppFor(() => ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      })),
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
      <TitleAppBar title={tr('title')} />

      {/* Capture zone — dashed brand border until there is a photo in it. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={uri ? tr('retakeA11y') : tr('takePhoto')}
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
              accessibilityLabel={tr('previewA11y')}
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
                {tr('retake')}
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
              {tr('takePhoto')}
            </Text>
            <Text variant="bodyS" tone="secondary" center style={{ fontSize: d(13), lineHeight: d(19) }}>
              {tr('tip')}
            </Text>
          </>
        )}
      </Pressable>

      <Button
        label={tr('gallery')}
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
            {tr('reviewedBy')}
          </Text>
          <Text variant="bodyS" tone="secondary" style={{ fontSize: d(13), lineHeight: d(19) }}>
            {tr('dispensedBy')}
          </Text>
        </View>
      </View>

      <Button
        label={tr('send')}
        size="large"
        // Nothing to send without a photo. Sending anyway would put an empty
        // record in the pharmacist's queue for them to reject.
        disabled={!uri}
        onPress={send}
      />
    </FormScreen>
  );
}
