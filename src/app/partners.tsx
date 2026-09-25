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
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    title: 'Partner pharmacies',
    intro:
      'Every Altruist order in Accra is filled by {name}. They hold the licence, they dispense, and they are the seller of record on your receipt.',
    licence: 'Pharmacy Council premises licence',
    superintendent: 'Superintendent',
    ordersForYou: 'Orders for you',
    oneOrder: '1 order',
    manyOrders: '{count} orders',
    primary: 'Primary',
    call: 'Call',
    directions: 'Directions',
    independence:
      '{name} is independently owned and licensed by the Pharmacy Council of Ghana. Altruist does not employ its pharmacists and does not dispense medicine. More partner pharmacies are being onboarded across Accra.',
  },
  fr: {
    title: 'Pharmacies partenaires',
    intro:
      "Toutes les commandes Altruist à Accra sont préparées par {name}. Elle détient la licence, délivre les médicaments et figure comme vendeur sur votre reçu.",
    licence: "Licence d'établissement du Pharmacy Council",
    superintendent: 'Pharmacien responsable',
    ordersForYou: 'Vos commandes',
    oneOrder: '1 commande',
    manyOrders: '{count} commandes',
    primary: 'Principale',
    call: 'Appeler',
    directions: 'Itinéraire',
    independence:
      "{name} est une pharmacie indépendante, agréée par le Pharmacy Council of Ghana. Altruist n'emploie pas ses pharmaciens et ne délivre pas de médicaments. D'autres pharmacies partenaires rejoignent bientôt Altruist à Accra.",
  },
  tw: {
    title: 'Nnuro adetɔnfoɔ a yɛne wɔn yɛ adwuma',
    intro:
      '{name} na wɔyɛ Altruist nneɛma a wɔtɔ wɔ Accra nyinaa. Wɔn na wɔkura tumi krataa no, wɔn na wɔma nnuro, na wɔn din na ɛda wo rehyeete so sɛ wɔn na wɔtɔn.',
    licence: 'Pharmacy Council tumi krataa',
    superintendent: 'Nnuro ho panin',
    ordersForYou: 'Nneɛma a woato',
    oneOrder: 'Oda 1',
    manyOrders: 'Oda {count}',
    primary: 'Titiriw',
    call: 'Frɛ',
    directions: 'Kwan',
    independence:
      '{name} yɛ ankorankoro dea, na Pharmacy Council of Ghana ama wɔn tumi. Altruist mfa wɔn nnuro ho abenfoɔ nyɛ adwuma na ɛnnma nnuro. Nnuro adetɔnfoɔ foforɔ reba Accra baabiara.',
  },
  gaa: {
    title: 'Tsofa hejɔɔ he ni wɔkɛtsuɔ nii',
    intro:
      '{name} ji mɛi ni fee Altruist nibii ni ahe yɛ Accra fɛɛ. Amɛhiɛ lisɛns lɛ, amɛhaa tsofai lɛ, ni amɛgbɛi yɛ orisiiti lɛ nɔ akɛ amɛji mɛi ni hɔɔ.',
    licence: 'Pharmacy Council lisɛns',
    superintendent: 'Tsofatsɛ onukpa',
    ordersForYou: 'Nibii ni ohe',
    oneOrder: 'Oda 1',
    manyOrders: 'Oda {count}',
    primary: 'Klɛŋklɛŋ',
    call: 'Tswa',
    directions: 'Gbɛ',
    independence:
      '{name} ji mɛi diɛŋtsɛ anɔ, ni Pharmacy Council of Ghana eha amɛ lisɛns. Altruist kɛ ehe tsofatsɛmɛi lɛ tsuuu nii, ni ehaaa tsofai. Tsofa hejɔɔ hei krokomɛi baaba Accra fɛɛ.',
  },
  ee: {
    title: 'Atikedzraƒe siwo míewɔa dɔ kpli',
    intro:
      '{name} ye wɔa Altruist nuƒleƒle siwo katã le Accra. Woawoe lé mɔɖeɖegbalẽa, woawoe naa atikewo, eye woƒe ŋkɔ le wò xexeɖigbalẽ dzi abe dzrala ene.',
    licence: 'Pharmacy Council ƒe mɔɖeɖegbalẽ',
    superintendent: 'Atikewɔla gã',
    ordersForYou: 'Wò nuƒleƒlewo',
    oneOrder: 'Ɖoɖo 1',
    manyOrders: 'Ɖoɖo {count}',
    primary: 'Gãtɔ',
    call: 'Yɔ',
    directions: 'Mɔfiame',
    independence:
      '{name} nye ame ŋutɔ tɔ, eye Pharmacy Council of Ghana na mɔɖeɖe wo. Altruist mexɔ eƒe atikewɔlawo ɖe dɔ me o eye menaa atikewo o. Atikedzraƒe bubuwo gale gɔme dzem le Accra.',
  },
  ha: {
    title: 'Kantunan magani abokan hulɗa',
    intro:
      '{name} ne ke cika duk odar Altruist a Accra. Su ne ke da lasisi, su ke ba da magani, kuma sunansu ne a matsayin mai sayarwa a rasiƙinka.',
    licence: 'Lasisin wurin Pharmacy Council',
    superintendent: 'Babban likitan magunguna',
    ordersForYou: 'Odar da ka yi',
    oneOrder: 'Oda 1',
    manyOrders: 'Oda {count}',
    primary: 'Na farko',
    call: 'Kira',
    directions: 'Hanya',
    independence:
      '{name} mallakin kansa ne kuma Pharmacy Council of Ghana ta ba shi lasisi. Altruist ba ya ɗaukar likitocin magungunansa aiki kuma ba ya ba da magani. Ana ƙara wasu kantunan magani a faɗin Accra.',
  },
});

type Tr = (key: keyof typeof S.en, vars?: Record<string, string | number>) => string;

/** A list of one today; the second partner is a second record, not a rewrite. */
const partnersFor = (p: Pharmacy, orderCount: number, tr: Tr) => [
  {
    id: p.id,
    name: p.name,
    meta: `${p.distanceKm} km · ${p.locality} · ${p.hours}`,
    primary: true,
    phone: p.phone.replace(/\s+/g, ''),
    licence: [
      [tr('licence'), p.licence],
      [tr('superintendent'), `${p.superintendent.name} · ${p.superintendent.registration}`],
      [
        tr('ordersForYou'),
        orderCount === 1 ? tr('oneOrder') : tr('manyOrders', { count: orderCount }),
      ],
    ] as [string, string][],
  },
];

export default function Partners() {
  const t = useTokens();
  const { d } = useDesignScale();
  const pharmacy = usePartnerPharmacy();
  // How many orders this person has actually placed with them.
  const orderCount = useOrderStore((st) => st.items.length);
  const tr = useT(S);
  const PARTNERS = partnersFor(pharmacy, orderCount, tr);

  return (
    <FormScreen gap={16} contentStyle={{ paddingBottom: d(60) }}>
      <TitleAppBar title={tr('title')} />

      <Text variant="bodyM" tone="secondary" style={{ fontSize: d(14), lineHeight: d(21) }}>
        {tr('intro', { name: pharmacy.name })}
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
            {p.primary ? <Badge label={tr('primary')} tone="brand" /> : null}
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
              label={tr('call')}
              variant="secondary"
              size="small"
              iconLeading="call"
              style={{ flex: 1 }}
              onPress={() => Linking.openURL(`tel:${p.phone}`)}
            />
            <Button
              label={tr('directions')}
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
          {tr('independence', { name: pharmacy.name })}
        </Text>
      </View>
    </FormScreen>
  );
}
