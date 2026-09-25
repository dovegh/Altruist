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
import { leaveAppFor } from '@/lib/appLock';
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    locationOffTitle: 'Location is off',
    locationOffMessage: 'Turn it on in Settings, or move the map to your address.',
    settings: 'Settings',
    notNow: 'Not now',
    mapA11y: 'Map. Move it to put the pin on your address.',
    back: 'Go back',
    search: 'Search a street or place',
    myLocation: 'Use my location',
    noMatch: 'No match — move the map instead',
    deliveryLocation: 'Delivery location',
    finding: 'Finding the address…',
    pinned: 'Pinned location',
    useThis: 'Use this location',
  },
  fr: {
    locationOffTitle: 'La localisation est désactivée',
    locationOffMessage: "Activez-la dans les Réglages, ou déplacez la carte jusqu'à votre adresse.",
    settings: 'Réglages',
    notNow: 'Plus tard',
    mapA11y: "Carte. Déplacez-la pour placer l'épingle sur votre adresse.",
    back: 'Retour',
    search: 'Rechercher une rue ou un lieu',
    myLocation: 'Utiliser ma position',
    noMatch: 'Aucun résultat — déplacez plutôt la carte',
    deliveryLocation: 'Lieu de livraison',
    finding: "Recherche de l'adresse…",
    pinned: 'Emplacement épinglé',
    useThis: 'Utiliser cet emplacement',
  },
  tw: {
    locationOffTitle: 'Beaeɛ kwan ayɛ mum',
    locationOffMessage: 'Bue wɔ Nhyehyɛeɛ mu, anaa twe map no kɔ wo address so.',
    settings: 'Nhyehyɛeɛ',
    notNow: 'Ɛnnɛ deɛ, daabi',
    mapA11y: 'Map. Twe no na agyiraeɛ no nkɔ wo address so.',
    back: 'San w’akyi',
    search: 'Hwehwɛ abɔnten anaa beaeɛ',
    myLocation: 'Fa me beaeɛ',
    noMatch: 'Yɛanhu — twe map no mmom',
    deliveryLocation: 'Beaeɛ a yɛde bɛbrɛ wo',
    finding: 'Ɛrehwehwɛ address no…',
    pinned: 'Beaeɛ a wɔahyɛ agyiraeɛ',
    useThis: 'Fa beaeɛ yi',
  },
  gaa: {
    locationOffTitle: 'He ni oyɔɔ lɛ egbɔ',
    locationOffMessage: 'Bue yɛ Toiŋjɔlɛmɔi mli, loo gbala map lɛ kɛya o address nɔ.',
    settings: 'Toiŋjɔlɛmɔi',
    notNow: 'Jeee amrɔ nɛɛ',
    mapA11y: 'Map. Gbala lɛ koni okadi lɛ ahi o address nɔ.',
    back: 'Kuku sɛɛ',
    search: 'Taomɔ gbɛjegbɛ loo he ko',
    myLocation: 'Kɛ he ni miyɔɔ tsu nii',
    noMatch: 'Anaaa — gbala map lɛ moŋ',
    deliveryLocation: 'He ni wɔkɛbaa',
    finding: 'Ataoɔ address lɛ…',
    pinned: 'He ni akɛ okadi wo',
    useThis: 'Kɛ he nɛɛ tsu nii',
  },
  ee: {
    locationOffTitle: 'Wotu teƒekpɔkpɔ',
    locationOffMessage: 'Ʋu eme le Ɖoɖowo me, alo ʋu map la yi wò adrɛs dzi.',
    settings: 'Ɖoɖowo',
    notNow: 'Menye fifia o',
    mapA11y: 'Map. Ʋui be dzesi la nanɔ wò adrɛs dzi.',
    back: 'Trɔ yi megbe',
    search: 'Di mɔ alo teƒe',
    myLocation: 'Zã nye teƒe',
    noMatch: 'Míekpɔe o — ʋu map la boŋ',
    deliveryLocation: 'Nudodo teƒe',
    finding: 'Le adrɛs la dim…',
    pinned: 'Teƒe si woɖo dzesi',
    useThis: 'Zã teƒe sia',
  },
  ha: {
    locationOffTitle: 'An kashe wuri',
    locationOffMessage: 'Kunna shi a cikin Saituna, ko ka matsar da taswira zuwa adireshinka.',
    settings: 'Saituna',
    notNow: 'Ba yanzu ba',
    mapA11y: 'Taswira. Matsar da ita don sanya alamar a kan adireshinka.',
    back: 'Koma baya',
    search: 'Nemi titi ko wuri',
    myLocation: 'Yi amfani da wurina',
    noMatch: 'Ba a samu ba — matsar da taswira maimakon haka',
    deliveryLocation: 'Wurin kawowa',
    finding: 'Ana neman adireshin…',
    pinned: 'Wurin da aka sanya alama',
    useThis: 'Yi amfani da wannan wuri',
  },
});

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
  const tr = useT(S);
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
            title: tr('locationOffTitle'),
            message: tr('locationOffMessage'),
            actions: [
              { label: tr('settings'), onPress: () => void leaveAppFor(() => Linking.openSettings()) },
              { label: tr('notNow'), variant: 'tertiary' },
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
        accessibilityLabel={tr('mapA11y')}
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
        {round('arrow-left', tr('back'), () =>
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
            placeholder={tr('search')}
            placeholderTextColor={t.colors.text.placeholder}
            returnKeyType="search"
            accessibilityLabel={tr('search')}
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
          {round('location', tr('myLocation'), () => void goToMyLocation(), locating)}
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
                {searchMiss ? tr('noMatch') : tr('deliveryLocation')}
              </Text>
              <Text
                variant="labelL"
                numberOfLines={2}
                style={{ fontSize: d(16), lineHeight: d(21) }}
              >
                {resolving && !line ? tr('finding') : line || tr('pinned')}
              </Text>
            </View>
          </View>
          <Button label={tr('useThis')} size="large" onPress={confirm} />
        </View>
      </View>
    </View>
  );
}
