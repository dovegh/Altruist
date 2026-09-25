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

export default function AddAddress() {
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
      <TitleAppBar title={existing ? 'Edit address' : 'Add address'} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={pin ? 'Location pinned. Change it on the map.' : 'Pin the location on a map'}
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
              Pin on map
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
              Change pin
            </Text>
          </View>
        ) : null}
      </Pressable>

      <InputField label="Address label" value={label} onChangeText={setLabel} placeholder="Home" />
      <InputField
        label="Street address"
        value={street}
        onChangeText={setStreet}
        placeholder="14B Oduduwa Crescent"
      />
      <InputField
        label="Area / city"
        value={area}
        onChangeText={setArea}
        placeholder="Area, city"
      />
      <InputField
        label="Landmark (optional)"
        value={landmark}
        onChangeText={setLandmark}
        placeholder="Opposite Sweet Sensation"
      />
      <InputField
        label="Delivery note (optional)"
        value={note}
        onChangeText={setNote}
        placeholder="Gate code 4471 · call on arrival"
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
            Set as default
          </Text>
          <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
            Used for every new order
          </Text>
        </View>
        <Toggle value={isDefault} onValueChange={setIsDefault} label="Set as default address" />
      </View>

      {error ? <FormMessage>{error}</FormMessage> : null}

      <Button
        label="Save address"
        size="large"
        loading={saving}
        disabled={!canSave || saving}
        onPress={save}
      />
    </FormScreen>
  );
}
