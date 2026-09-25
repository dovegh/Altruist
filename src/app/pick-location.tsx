/**
 * Pick Location — where the rider should actually go.
 *
 * A full-screen map with a pin fixed in the middle: the person moves the map
 * under the pin rather than chasing a marker with a finger. Starts on the
 * address's existing pin, else the phone's position, else central Accra.
 *
 * Search and the address line use the phone's own geocoder (expo-location), so
 * this works without a maps key. When a Places key is added, search can move
 * to Google Places autocomplete behind an Edge Function without changing how
 * the result comes back.
 *
 * The result goes back through `features/profile/locationPick`.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, TextInput, ActivityIndicator, Linking } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { showDialog } from '@/components/ui/Dialog';
import { useLocationPick } from '@/features/profile/locationPick';
import type { LatLng } from '@/lib/api';

/** Independence Square, Accra — where the map opens when nothing better is known. */
const ACCRA: LatLng = { lat: 5.5486, lng: -0.1937 };
const STREET_ZOOM = { latitudeDelta: 0.004, longitudeDelta: 0.004 };

const toRegion = (p: LatLng): Region => ({ latitude: p.lat, longitude: p.lng, ...STREET_ZOOM });

/** A Google Plus Code ("GRX4+9R6"): what the geocoder names a spot with no street. */
const PLUS_CODE = /^[2-9CFGHJMPQRVWX]{2,8}\+[2-9CFGHJMPQRVWX]{0,3}$/i;

/**
 * "12 Oxford St, Osu, Accra" from whatever parts the geocoder returned. Plus
 * Codes and the country are dropped: accurate, but nobody reads them as an
 * address, and the pin already carries the exact spot.
 */
function describe(a: Location.LocationGeocodedAddress | undefined): string {
  if (!a) return '';
  const street = [a.streetNumber, a.street].filter(Boolean).join(' ');
  const parts = a.formattedAddress
    ? a.formattedAddress.split(',')
    : [street || a.name || '', a.district || '', a.city ?? a.subregion ?? ''];
  return parts
    .map((part) => part.trim())
    .filter((part) => part && !PLUS_CODE.test(part) && part !== 'Ghana')
    .join(', ');
}

export default function PickLocation() {
  const t = useTokens();
  const { d } = useDesignScale();
  const insets = useSafeAreaInsets();
  const map = useRef<MapView>(null);
  const initial = useLocationPick((s) => s.initial);

  const [center, setCenter] = useState<LatLng>(initial ?? ACCRA);
  const [line, setLine] = useState('');
  const [resolving, setResolving] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchMiss, setSearchMiss] = useState(false);
  const [locating, setLocating] = useState(false);
  const lookup = useRef(0);

  const moveTo = (p: LatLng) => map.current?.animateToRegion(toRegion(p), 450);

  const goToMyLocation = async (quiet = false) => {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        if (!quiet) {
          showDialog({
            icon: 'location',
            tone: 'warning',
            title: 'Location is off',
            message: 'Turn it on in Settings, or move the map to your address.',
            actions: [
              { label: 'Settings', onPress: () => void Linking.openSettings() },
              { label: 'Not now', variant: 'tertiary' },
            ],
          });
        }
        return;
      }
      const here =
        (await Location.getLastKnownPositionAsync()) ??
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      moveTo({ lat: here.coords.latitude, lng: here.coords.longitude });
    } catch {
      // No fix (GPS off, indoors). The map stays where it is.
    } finally {
      setLocating(false);
    }
  };

  // Open on the phone's position when there is no saved pin to start from.
  useEffect(() => {
    if (!initial) void goToMyLocation(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Name whatever is under the pin. Newest request wins.
  useEffect(() => {
    const ticket = ++lookup.current;
    setResolving(true);
    const timer = setTimeout(async () => {
      try {
        const [first] = await Location.reverseGeocodeAsync({
          latitude: center.lat,
          longitude: center.lng,
        });
        if (ticket === lookup.current) setLine(describe(first));
      } catch {
        if (ticket === lookup.current) setLine('');
      } finally {
        if (ticket === lookup.current) setResolving(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [center]);

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSearchMiss(false);
    try {
      const [hit] = await Location.geocodeAsync(/ghana/i.test(q) ? q : `${q}, Ghana`);
      if (hit) moveTo({ lat: hit.latitude, lng: hit.longitude });
      else setSearchMiss(true);
    } catch {
      setSearchMiss(true);
    } finally {
      setSearching(false);
    }
  };

  const confirm = () => {
    useLocationPick.setState({ picked: { pin: center, line } });
    if (router.canGoBack()) router.back();
    else router.replace('/add-address');
  };

  const round = (icon: 'arrow-left' | 'location', label: string, onPress: () => void, busy = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: d(48),
        height: d(48),
        borderRadius: t.radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: t.colors.bg.surface,
        opacity: pressed ? 0.85 : 1,
        shadowColor: t.colors.shadow,
        shadowOpacity: 0.18,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
      })}
    >
      {busy ? (
        <ActivityIndicator color={t.colors.icon.brand} />
      ) : (
        <Icon name={icon} size={d(20)} tone={icon === 'location' ? 'brand' : 'primary'} />
      )}
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      <MapView
        ref={map}
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        initialRegion={toRegion(initial ?? ACCRA)}
        onRegionChangeComplete={(r) => setCenter({ lat: r.latitude, lng: r.longitude })}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
        accessibilityLabel="Map. Move it to put the pin on your address."
      />

      {/* The pin: fixed at the centre, its point on the exact spot. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View style={{ alignItems: 'center', marginBottom: d(44) }}>
          <View
            style={{
              width: d(40),
              height: d(40),
              borderRadius: t.radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: t.colors.bg.brand,
              borderWidth: 3,
              borderColor: t.colors.bg.surface,
            }}
          >
            <Icon name="location" size={d(20)} color={t.colors.icon.onBrand} />
          </View>
          <View style={{ width: 3, height: d(12), backgroundColor: t.colors.bg.brand }} />
          <View
            style={{
              width: d(10),
              height: d(4),
              borderRadius: t.radius.full,
              backgroundColor: t.colors.shadow,
              opacity: 0.3,
            }}
          />
        </View>
      </View>

      {/* Top: back + search */}
      <View
        style={{
          position: 'absolute',
          top: insets.top + d(12),
          left: d(16),
          right: d(16),
          flexDirection: 'row',
          gap: d(10),
          alignItems: 'center',
        }}
      >
        {round('arrow-left', 'Go back', () =>
          router.canGoBack() ? router.back() : router.replace('/add-address'),
        )}
        <View
          style={{
            flex: 1,
            height: d(48),
            flexDirection: 'row',
            alignItems: 'center',
            gap: d(8),
            paddingHorizontal: d(16),
            borderRadius: t.radius.full,
            backgroundColor: t.colors.bg.surface,
            shadowColor: t.colors.shadow,
            shadowOpacity: 0.18,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 4,
          }}
        >
          <Icon name="search" size={d(18)} tone="secondary" />
          <TextInput
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              setSearchMiss(false);
            }}
            onSubmitEditing={search}
            placeholder="Search a street or place"
            placeholderTextColor={t.colors.text.placeholder}
            returnKeyType="search"
            accessibilityLabel="Search a street or place"
            style={{
              flex: 1,
              fontFamily: t.typography.bodyM.fontFamily,
              fontSize: d(15),
              color: t.colors.text.primary,
              paddingVertical: 0,
            }}
          />
          {searching ? <ActivityIndicator size="small" color={t.colors.icon.brand} /> : null}
        </View>
      </View>

      {/* Bottom: my location + the address under the pin */}
      <View style={{ position: 'absolute', left: d(16), right: d(16), bottom: insets.bottom + d(16), gap: d(12) }}>
        <View style={{ alignSelf: 'flex-end' }}>
          {round('location', 'Use my location', () => void goToMyLocation(), locating)}
        </View>

        <View
          style={{
            gap: d(14),
            padding: d(18),
            borderRadius: d(24),
            backgroundColor: t.colors.bg.surface,
            shadowColor: t.colors.shadow,
            shadowOpacity: 0.18,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
          }}
        >
          <View style={{ flexDirection: 'row', gap: d(12), alignItems: 'center' }}>
            <Icon name="location" size={d(20)} tone="brand" />
            <View style={{ flex: 1, gap: d(2) }}>
              <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
                {searchMiss ? 'No match — move the map instead' : 'Delivery location'}
              </Text>
              <Text
                variant="labelL"
                numberOfLines={2}
                style={{ fontSize: d(16), lineHeight: d(21) }}
              >
                {resolving && !line ? 'Finding the address…' : line || 'Pinned location'}
              </Text>
            </View>
          </View>
          <Button label="Use this location" size="large" onPress={confirm} />
        </View>
      </View>
    </View>
  );
}
