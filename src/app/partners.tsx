/**
 * Partner Pharmacies — ported 1:1 from Figma node 218:750.
 *
 * Scroll content: V gap16, pad 64/24/60/24. An explanatory paragraph, one
 * partner card (r24, brand border, V gap14, pad 18) carrying the licence block,
 * then the independence note.
 *
 * This screen is the platform's liability position made concrete, per SRS §1.
 * It names the licence holder, the superintendent pharmacist and their Pharmacy
 * Council numbers — the details a user needs to verify the pharmacy themselves
 * or take a complaint to the regulator.
 *
 * The list is a list even though it has one entry: Accra launches with
 * Healthview alone, and the layout has to survive the second partner without
 * being rebuilt.
 */
import React from 'react';
import { View, Linking } from 'react-native';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen } from '@/components/ui/FormScreen';
import { TitleAppBar } from '@/components/ui/AppBar';
import { IconTile } from '@/components/ui/ListRow';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { usePartnerPharmacy } from '@/features/profile/store';
import type { Pharmacy } from '@/lib/pharmacies';
import { useOrderStore } from '@/features/orders/store';

/** A list of one today; the second partner is a second record, not a rewrite. */
const partnersFor = (p: Pharmacy, orderCount: number) => [
  {
    id: p.id,
    name: p.name,
    meta: `${p.distanceKm} km · ${p.locality} · ${p.hours}`,
    primary: true,
    phone: p.phone.replace(/\s+/g, ''),
    licence: [
      ['Pharmacy Council premises licence', p.licence],
      ['Superintendent', `${p.superintendent.name} · ${p.superintendent.registration}`],
      ['Orders for you', `${orderCount} ${orderCount === 1 ? 'order' : 'orders'}`],
    ] as [string, string][],
  },
];

export default function Partners() {
  const t = useTokens();
  const { d } = useDesignScale();
  const pharmacy = usePartnerPharmacy();
  // How many orders this person has actually placed with them.
  const orderCount = useOrderStore((st) => st.items.length);
  const PARTNERS = partnersFor(pharmacy, orderCount);

  return (
    <FormScreen gap={16} contentStyle={{ paddingBottom: d(60) }}>
      <TitleAppBar title="Partner pharmacies" />

      <Text variant="bodyM" tone="secondary" style={{ fontSize: d(14), lineHeight: d(21) }}>
        Every Altruist order in Accra is filled by {pharmacy.name}. They hold the licence, they
        dispense, and they are the seller of record on your receipt.
      </Text>

      {PARTNERS.map((p) => (
        <View
          key={p.id}
          style={{
            gap: d(14),
            padding: d(18),
            borderRadius: d(24),
            backgroundColor: t.colors.bg.surface,
            borderWidth: 1.5,
            borderColor: p.primary ? t.colors.border.brand : 'transparent',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(12) }}>
            <IconTile name="shield-check" hue="mint" size={44} />
            <View style={{ flex: 1, gap: d(3) }}>
              <Text variant="labelL" style={{ fontSize: d(16), lineHeight: d(20) }}>
                {p.name}
              </Text>
              <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
                {p.meta}
              </Text>
            </View>
            {p.primary ? <Badge label="Primary" tone="brand" /> : null}
          </View>

          {/* Licence block */}
          <View
            style={{
              gap: d(8),
              paddingVertical: d(12),
              paddingHorizontal: d(14),
              borderRadius: d(16),
              backgroundColor: t.colors.bg.surfaceRaised,
            }}
          >
            {p.licence.map(([label, value]) => (
              <View key={label} style={{ flexDirection: 'row', gap: d(12) }}>
                <Text
                  variant="caption"
                  tone="tertiary"
                  style={{ flex: 1, fontSize: d(12), lineHeight: d(16) }}
                >
                  {label}
                </Text>
                <Text variant="labelS" tone="secondary" style={{ fontSize: d(12), lineHeight: d(16) }}>
                  {value}
                </Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: d(10) }}>
            <Button
              label="Call"
              variant="secondary"
              size="small"
              iconLeading="call"
              style={{ flex: 1 }}
              onPress={() => Linking.openURL(`tel:${p.phone}`)}
            />
            <Button
              label="Directions"
              variant="secondary"
              size="small"
              iconLeading="location"
              style={{ flex: 1 }}
              // Hands off to whichever maps app the phone has, searched by the
              // pharmacy's registered address rather than a coordinate we would
              // have to keep in step with it.
              onPress={() =>
                Linking.openURL(
                  `geo:0,0?q=${encodeURIComponent(`${pharmacy.name}, ${pharmacy.address}`)}`,
                ).catch(() =>
                  Linking.openURL(
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${pharmacy.name}, ${pharmacy.address}`,
                    )}`,
                  ),
                )
              }
            />
          </View>
        </View>
      ))}

      <View
        style={{
          flexDirection: 'row',
          gap: d(12),
          paddingVertical: d(14),
          paddingHorizontal: d(16),
          borderRadius: d(20),
          backgroundColor: t.colors.bg.surfaceRaised,
        }}
      >
        <Icon name="info" size={d(18)} tone="tertiary" />
        <Text
          variant="caption"
          tone="tertiary"
          style={{ flex: 1, fontSize: d(12), lineHeight: d(16) }}
        >
          {pharmacy.name} is independently owned and licensed by the Pharmacy Council of Ghana.
          Altruist does not employ its pharmacists and does not dispense medicine. More partner
          pharmacies are being onboarded across Accra.
        </Text>
      </View>
    </FormScreen>
  );
}
