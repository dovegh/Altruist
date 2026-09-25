/**
 * Add Address — ported 1:1 from Figma node 72:90.
 *
 * Scroll content: V gap16, pad 64/24/60/24. A 150pt map preview (r24, a 48pt
 * brand pin centred), five fields, a "Set as default" row with a Toggle, then
 * Save.
 *
 * The map opens the picker (/pick-location). Once pinned it shows the real
 * spot, and the pin is saved with the address so the rider goes to the gate,
 * not to the middle of the street name. If the street fields are still empty,
 * the picker's address fills them.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { View, Pressable } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen } from '@/components/ui/FormScreen';
import { TitleAppBar } from '@/components/ui/AppBar';
import { InputField } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/ListRow';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { FormMessage, describeFailure } from '@/components/ui/FormMessage';
import { useWalletStore } from '@/features/checkout/store';
import { saveAddress } from '@/features/profile/addresses';
import { openPickerAt, takePickedLocation } from '@/features/profile/locationPick';
import type { LatLng } from '@/lib/api';
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    editTitle: 'Edit address',
    addTitle: 'Add address',
    pinnedA11y: 'Location pinned. Change it on the map.',
    pinA11y: 'Pin the location on a map',
    pinOnMap: 'Pin on map',
    changePin: 'Change pin',
    label: 'Address label',
    labelPlaceholder: 'Home',
    street: 'Street address',
    area: 'Area / city',
    areaPlaceholder: 'Area, city',
    landmark: 'Landmark (optional)',
    landmarkPlaceholder: 'Opposite Sweet Sensation',
    note: 'Delivery note (optional)',
    notePlaceholder: 'Gate code 4471 · call on arrival',
    setDefault: 'Set as default',
    setDefaultSub: 'Used for every new order',
    setDefaultA11y: 'Set as default address',
    save: 'Save address',
  },
  fr: {
    editTitle: "Modifier l'adresse",
    addTitle: 'Ajouter une adresse',
    pinnedA11y: 'Emplacement épinglé. Modifiez-le sur la carte.',
    pinA11y: "Épingler l'emplacement sur une carte",
    pinOnMap: 'Épingler sur la carte',
    changePin: "Modifier l'épingle",
    label: "Nom de l'adresse",
    labelPlaceholder: 'Maison',
    street: 'Adresse',
    area: 'Quartier / ville',
    areaPlaceholder: 'Quartier, ville',
    landmark: 'Point de repère (facultatif)',
    landmarkPlaceholder: 'En face de Sweet Sensation',
    note: 'Note pour la livraison (facultatif)',
    notePlaceholder: "Code du portail 4471 · appeler à l'arrivée",
    setDefault: 'Définir par défaut',
    setDefaultSub: 'Utilisée pour chaque nouvelle commande',
    setDefaultA11y: 'Définir comme adresse par défaut',
    save: "Enregistrer l'adresse",
  },
  tw: {
    editTitle: 'Sesa address',
    addTitle: 'Fa address ka ho',
    pinnedA11y: 'Wɔahyɛ beaeɛ no agyiraeɛ. Sesa wɔ map no so.',
    pinA11y: 'Hyɛ beaeɛ no agyiraeɛ wɔ map so',
    pinOnMap: 'Hyɛ agyiraeɛ wɔ map so',
    changePin: 'Sesa agyiraeɛ',
    label: 'Address din',
    labelPlaceholder: 'Fie',
    street: 'Abɔnten address',
    area: 'Mpɔtam / kuropɔn',
    areaPlaceholder: 'Mpɔtam, kuropɔn',
    landmark: 'Agyiraeɛ a ɛbɛn hɔ (wopɛ a)',
    landmarkPlaceholder: 'Sweet Sensation anim',
    note: 'Nkyerɛkyerɛ ma deɛ ɔde bɛba (wopɛ a)',
    notePlaceholder: 'Ɛpono nɔma 4471 · frɛ me sɛ woduru a',
    setDefault: 'Ma ɛnyɛ deɛ ɛdi kan',
    setDefaultSub: 'Yɛde bɛyɛ oda foforɔ biara',
    setDefaultA11y: 'Ma ɛnyɛ address a ɛdi kan',
    save: 'Kora address',
  },
  gaa: {
    editTitle: 'Tsake address',
    addTitle: 'Kɛ address fata he',
    pinnedA11y: 'Akɛ okadi ewo he lɛ. Tsake yɛ map lɛ nɔ.',
    pinA11y: 'Kɛ okadi wo he lɛ yɛ map nɔ',
    pinOnMap: 'Kɛ okadi wo map nɔ',
    changePin: 'Tsake okadi lɛ',
    label: 'Address gbɛi',
    labelPlaceholder: 'Shĩa',
    street: 'Gbɛjegbɛ address',
    area: 'Hei / maŋ',
    areaPlaceholder: 'Hei, maŋ',
    landmark: 'Okadi ni bɛŋkɛ (kɛ osumɔ)',
    landmarkPlaceholder: 'Sweet Sensation hiɛ',
    note: 'Wiemɔ kɛha mɔ ni kɛbaa (kɛ osumɔ)',
    notePlaceholder: 'Agbo nɔmba 4471 · tsɛ mi kɛ oshɛ',
    setDefault: 'Ha efee klɛŋklɛŋ nɔ',
    setDefaultSub: 'Akɛtsuɔ nii yɛ nɔ hee fɛɛ nɔ',
    setDefaultA11y: 'Ha efee klɛŋklɛŋ address',
    save: 'To address lɛ',
  },
  ee: {
    editTitle: 'Trɔ adrɛs',
    addTitle: 'Tsɔ adrɛs kpe ɖe eŋu',
    pinnedA11y: 'Woɖo dzesi teƒe la. Trɔe le map la dzi.',
    pinA11y: 'Ɖo dzesi teƒe la le map dzi',
    pinOnMap: 'Ɖo dzesi le map dzi',
    changePin: 'Trɔ dzesi la',
    label: 'Adrɛs ƒe ŋkɔ',
    labelPlaceholder: 'Aƒeme',
    street: 'Mɔ ƒe adrɛs',
    area: 'Nutome / du',
    areaPlaceholder: 'Nutome, du',
    landmark: 'Dzesi si te ɖe eŋu (ne èdi)',
    landmarkPlaceholder: 'Sweet Sensation ŋgɔ',
    note: 'Nya na nukplɔla (ne èdi)',
    notePlaceholder: 'Agbo ƒe xexlẽdzesi 4471 · ƒo ka nam ne èva ɖo',
    setDefault: 'Wɔe gbãtɔ',
    setDefaultSub: 'Wozãnɛ na nudodo yeye ɖesiaɖe',
    setDefaultA11y: 'Wɔe adrɛs gbãtɔ',
    save: 'Dzra adrɛs ɖo',
  },
  ha: {
    editTitle: 'Gyara adireshi',
    addTitle: 'Ƙara adireshi',
    pinnedA11y: 'An sanya alamar wuri. Canja shi a taswira.',
    pinA11y: 'Sanya alamar wurin a taswira',
    pinOnMap: 'Sanya alama a taswira',
    changePin: 'Canja alama',
    label: 'Sunan adireshi',
    labelPlaceholder: 'Gida',
    street: 'Adireshin titi',
    area: 'Unguwa / gari',
    areaPlaceholder: 'Unguwa, gari',
    landmark: 'Alamar wuri (zaɓi)',
    landmarkPlaceholder: 'Gaban Sweet Sensation',
    note: 'Bayani don kawowa (zaɓi)',
    notePlaceholder: 'Lambar ƙofa 4471 · kira idan ka iso',
    setDefault: 'Mai da shi na asali',
    setDefaultSub: 'Ana amfani da shi a kowace sabuwar oda',
    setDefaultA11y: 'Mai da shi adireshin asali',
    save: 'Ajiye adireshi',
  },
});

export default function AddAddress() {
  const tr = useT(S);
  const t = useTokens();
  const { d } = useDesignScale();
  // Same screen for both jobs: an `id` means edit, its absence means add.
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useWalletStore((s) => s.addresses.find((a) => a.id === id));
  const isDefaultAlready = useWalletStore((s) => s.defaultAddressId === id);

  // `subtitle` is stored as one line; split it back for the two fields so an
  // edit round-trips instead of collapsing the address into the street box.
  const parts = useMemo(() => {
    const [street = '', ...rest] = (existing?.subtitle ?? '').split(',');
    return { street: street.trim(), area: rest.join(',').trim() };
  }, [existing?.subtitle]);

  const [label, setLabel] = useState(existing?.title ?? '');
  const [street, setStreet] = useState(parts.street);
  const [area, setArea] = useState(parts.area);
  const [landmark, setLandmark] = useState('');
  const [note, setNote] = useState(existing?.meta ?? '');
  const [isDefault, setIsDefault] = useState(existing ? isDefaultAlready : true);
  const [pin, setPin] = useState<LatLng | undefined>(existing?.pin);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Back from the picker: adopt the pin, and its address if the fields are empty.
  useFocusEffect(
    useCallback(() => {
      const picked = takePickedLocation();
      if (!picked) return;
      setPin(picked.pin);
      if (!street.trim() && !area.trim() && picked.line) {
        const [first = '', ...rest] = picked.line.split(',');
        // One part is an area with no street ("Accra"): the street is theirs to type.
        if (rest.length) setStreet(first.trim());
        setArea(rest.length ? rest.join(',').trim() : first.trim());
      }
    }, [street, area]),
  );

  const openPicker = () => {
    openPickerAt(pin ?? null);
    router.push('/pick-location');
  };

  // Street and area are the address; everything else is helpful detail.
  const canSave = street.trim().length > 0 && area.trim().length > 0;

  const save = async () => {
    const draft = {
      pin,
      title: label.trim() || 'Address',
      subtitle: [street.trim(), area.trim()].filter(Boolean).join(', '),
      // The landmark is a delivery aid, so it rides with the note the rider reads.
      meta: [note.trim(), landmark.trim()].filter(Boolean).join(' · '),
    };
    setError(null);
    setSaving(true);
    try {
      // To the server first, then back. A form that closed on a failed save
      // would send the next order to the old address without a word.
      await saveAddress(draft, isDefault, existing?.id);
      router.back();
    } catch (e) {
      setError(describeFailure(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormScreen gap={16} contentStyle={{ paddingBottom: d(60) }}>
      <TitleAppBar title={existing ? tr('editTitle') : tr('addTitle')} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={pin ? tr('pinnedA11y') : tr('pinA11y')}
        onPress={openPicker}
        style={({ pressed }) => ({
          height: d(150),
          borderRadius: d(24),
          overflow: 'hidden',
          backgroundColor: t.colors.bg.surfaceRaised,
          opacity: pressed ? 0.9 : 1,
        })}
      >
        {pin ? (
          <MapView
            provider={PROVIDER_GOOGLE}
            liteMode
            pointerEvents="none"
            style={{ flex: 1 }}
            region={{
              latitude: pin.lat,
              longitude: pin.lng,
              latitudeDelta: 0.004,
              longitudeDelta: 0.004,
            }}
          >
            <Marker coordinate={{ latitude: pin.lat, longitude: pin.lng }} />
          </MapView>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: d(10) }}>
            <View
              style={{
                width: d(48),
                height: d(48),
                borderRadius: t.radius.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: t.colors.bg.brand,
              }}
            >
              <Icon name="location" size={d(22)} color={t.colors.icon.onBrand} />
            </View>
            <Text variant="labelM" tone="brand" style={{ fontSize: d(14), lineHeight: d(18) }}>
              {tr('pinOnMap')}
            </Text>
          </View>
        )}
        {pin ? (
          <View
            style={{
              position: 'absolute',
              right: d(12),
              bottom: d(12),
              paddingVertical: d(6),
              paddingHorizontal: d(12),
              borderRadius: t.radius.full,
              backgroundColor: t.colors.bg.surface,
            }}
          >
            <Text variant="labelS" style={{ fontSize: d(12), lineHeight: d(16) }}>
              {tr('changePin')}
            </Text>
          </View>
        ) : null}
      </Pressable>

      <InputField
        label={tr('label')}
        value={label}
        onChangeText={setLabel}
        placeholder={tr('labelPlaceholder')}
      />
      <InputField
        label={tr('street')}
        value={street}
        onChangeText={setStreet}
        placeholder="14B Oduduwa Crescent"
      />
      <InputField
        label={tr('area')}
        value={area}
        onChangeText={setArea}
        placeholder={tr('areaPlaceholder')}
      />
      <InputField
        label={tr('landmark')}
        value={landmark}
        onChangeText={setLandmark}
        placeholder={tr('landmarkPlaceholder')}
      />
      <InputField
        label={tr('note')}
        value={note}
        onChangeText={setNote}
        placeholder={tr('notePlaceholder')}
      />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: d(12),
          paddingVertical: d(14),
          paddingLeft: d(18),
          paddingRight: d(14),
          borderRadius: d(20),
          backgroundColor: t.colors.bg.surface,
        }}
      >
        <View style={{ flex: 1, gap: d(3) }}>
          <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
            {tr('setDefault')}
          </Text>
          <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
            {tr('setDefaultSub')}
          </Text>
        </View>
        <Toggle value={isDefault} onValueChange={setIsDefault} label={tr('setDefaultA11y')} />
      </View>

      {error ? <FormMessage>{error}</FormMessage> : null}

      <Button
        label={tr('save')}
        size="large"
        loading={saving}
        disabled={!canSave || saving}
        onPress={save}
      />
    </FormScreen>
  );
}
