/**
 * Request a Refund — ported 1:1 from Figma node 103:58.
 *
 * Scroll content: V gap16, pad 64/24/150/24. The chain-of-custody explainer,
 * the item list with prescription items LOCKED, the reason radios, and a photo
 * evidence row. Footer: selected count and amount beside Review.
 *
 * The lock is not a UI convenience — a dispensed prescription medicine cannot
 * re-enter pharmacy stock, so it can never be part of a return. Rendering the
 * item disabled with the reason attached is more honest than hiding it: the
 * user paid for it and needs to see why it is excluded, and where to go instead.
 */
import React, { useMemo, useState } from 'react';
import { View, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen, StickyFooter } from '@/components/ui/FormScreen';
import { TitleAppBar } from '@/components/ui/AppBar';
import { SectionLabel } from '@/components/ui/Checkout';
import { Radio, Checkbox } from '@/components/ui/Form';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { StatusScreen } from '@/components/ui/StatusScreen';
import { cedis } from '@/lib/money';
import { useOrderStore } from '@/features/orders/store';
import { REFUND_REASONS as REASONS } from '@/lib/forms';
import { defineStrings, useT } from '@/i18n';
import { formLabel } from '@/lib/formLabels';

const S = defineStrings({
  en: {
    metaRx: '× {qty} · dispensed',
    metaSealed: '× {qty} · sealed, unopened',
    lockReason: 'Prescription medicine — cannot be returned once dispensed',
    notFoundTitle: 'Order not found',
    notFoundBody: 'A refund can only be requested against an order on this device.',
    seeAll: 'See all orders',
    title: 'Request a refund',
    explTitle: 'Dispensed medicines cannot be returned',
    explBody: 'If one arrived damaged or wrong, contact the pharmacy.',
    which: 'WHICH ITEMS?',
    whatWrong: 'WHAT WENT WRONG?',
    photos: 'PHOTOS · HELPS THE PHARMACY DECIDE FASTER',
    removePhoto: 'Remove photo {n}',
    addPhoto: 'Add a photo',
    selectedOne: '{count} item selected',
    selectedMany: '{count} items selected',
    review: 'Review',
  },
  fr: {
    metaRx: '× {qty} · délivré',
    metaSealed: '× {qty} · scellé, non ouvert',
    lockReason: 'Médicament sur ordonnance — ne peut être retourné une fois délivré',
    notFoundTitle: 'Commande introuvable',
    notFoundBody:
      'Un remboursement ne peut être demandé que pour une commande présente sur cet appareil.',
    seeAll: 'Voir toutes les commandes',
    title: 'Demander un remboursement',
    explTitle: 'Les médicaments délivrés ne peuvent pas être retournés',
    explBody: 'Si l’un d’eux est arrivé endommagé ou erroné, contactez la pharmacie.',
    which: 'QUELS ARTICLES ?',
    whatWrong: 'QUEL EST LE PROBLÈME ?',
    photos: 'PHOTOS · AIDENT LA PHARMACIE À DÉCIDER PLUS VITE',
    removePhoto: 'Supprimer la photo {n}',
    addPhoto: 'Ajouter une photo',
    selectedOne: '{count} article sélectionné',
    selectedMany: '{count} articles sélectionnés',
    review: 'Vérifier',
  },
  tw: {
    metaRx: '× {qty} · wɔde ama',
    metaSealed: '× {qty} · wɔmmuee',
    lockReason: 'Nnuro a ɛhia krataa — sɛ wɔde ma wie a, wɔrentumi mfa nsan mma',
    notFoundTitle: 'Yɛanhu adetɔ no',
    notFoundBody: 'Adetɔ a ɛwɔ saa fon yi so nko ara na wobɛtumi abisa ne sika.',
    seeAll: 'Hwɛ nneɛma a woato nyinaa',
    title: 'Bisa wo sika',
    explTitle: 'Wɔrentumi mfa nnuro a wɔde ama nsan mma',
    explBody: 'Sɛ bi sɛeeɛ anaa ɛnyɛ deɛ wopɛ a, frɛ nnuro fie no.',
    which: 'NNEƐMA BƐN?',
    whatWrong: 'DEƐN NA ƐKƆƆ BƆNE?',
    photos: 'MFONINI · ƐBOA NNURO FIE NO MA ƐSI GYINAEƐ NTƐM',
    removePhoto: 'Yi mfonini {n}',
    addPhoto: 'Fa mfonini ka ho',
    selectedOne: 'Woapaw adeɛ {count}',
    selectedMany: 'Woapaw nneɛma {count}',
    review: 'Hwɛ bio',
  },
  gaa: {
    metaRx: '× {qty} · akɛhaa',
    metaSealed: '× {qty} · agbeleee',
    lockReason: 'Tsofa ni hiaa wolo — kɛ akɛhaa lɛ, anyɛŋ akɛku',
    notFoundTitle: 'Anaaa nɔ ni ohe lɛ',
    notFoundBody: 'Nɔ ni ohe ni yɔɔ fon nɛɛ nɔ pɛ obaanyɛ obi ehe shika.',
    seeAll: 'Kwɛmɔ nɔ ni ohe fɛɛ',
    title: 'Bi o shika',
    explTitle: 'Anyɛŋ akɛ tsofai ni akɛhaa aku',
    explBody: 'Kɛji ekome fite loo jeee nɔ ni osumɔɔ, tsɛ tsofa shĩa lɛ.',
    which: 'NIBII NƐGBƐ?',
    whatWrong: 'MƐNI JAAA?',
    photos: 'MFONIRII · EYEƆ ABUA TSOFA SHĨA LƐ NI EKPƐ EYITSO OYAYAYA',
    removePhoto: 'Jiemɔ mfoniri {n}',
    addPhoto: 'Kɛ mfoniri fata he',
    selectedOne: 'Ohala nɔ {count}',
    selectedMany: 'Ohala nibii {count}',
    review: 'Kwɛmɔ ekoŋŋ',
  },
  ee: {
    metaRx: '× {qty} · wona',
    metaSealed: '× {qty} · womeʋui o',
    lockReason: 'Atike si hiã ŋɔŋlɔ — ne wona vɔ la, womate ŋu atrɔe o',
    notFoundTitle: 'Míekpɔ nuƒeƒle la o',
    notFoundBody: 'Nuƒeƒle si le fon sia dzi ko ŋu nàte ŋu abia ga gbugbɔ ɖo.',
    seeAll: 'Kpɔ nu siwo nèƒle katã',
    title: 'Bia ga gbugbɔ',
    explTitle: 'Womate ŋu atrɔ atike siwo wona o',
    explBody: 'Ne ɖeka va gblẽe alo menye esi nèdi o la, yɔ atikeƒle la.',
    which: 'NU KAWOE?',
    whatWrong: 'NUKAE GBLẼ?',
    photos: 'FOTOWO · WOKPENA ƉE ATIKEƑLE LA ŊU BE WÒAWƆ NYAMETSOTSO KABA',
    removePhoto: 'Ɖe foto {n} ɖa',
    addPhoto: 'Tsɔ foto kpe ɖe eŋu',
    selectedOne: 'Nu {count} wotia',
    selectedMany: 'Nu {count} wotia',
    review: 'Gbugbɔ kpɔ',
  },
  ha: {
    metaRx: '× {qty} · an bayar',
    metaSealed: '× {qty} · a rufe, ba a buɗe ba',
    lockReason: 'Maganin takarda — ba za a iya mayar da shi ba bayan an bayar',
    notFoundTitle: 'Ba a sami oda ba',
    notFoundBody: 'Ana iya neman mayar da kuɗi ne kawai kan odar da ke wannan na’ura.',
    seeAll: 'Duba duk oda',
    title: 'Nemi mayar da kuɗi',
    explTitle: 'Ba za a iya mayar da magungunan da aka bayar ba',
    explBody: 'Idan ɗaya ya iso a lalace ko ba daidai ba, tuntuɓi kantin magani.',
    which: 'WAƊANNE KAYA?',
    whatWrong: 'ME YA FARU?',
    photos: 'HOTUNA · SUNA TAIMAKA WA KANTIN MAGANI YA YANKE HUKUNCI DA SAURI',
    removePhoto: 'Cire hoto {n}',
    addPhoto: 'Ƙara hoto',
    selectedOne: 'An zaɓi kaya {count}',
    selectedMany: 'An zaɓi kaya {count}',
    review: 'Duba',
  },
});


export default function RequestRefund() {
  const tr = useT(S);
  const t = useTokens();
  const { d } = useDesignScale();
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [reason, setReason] = useState<string | null>(null);
  const [photos, setPhotos] = useState<number[]>([1, 2]);
  const { id } = useLocalSearchParams<{ id?: string }>();

  const order = useOrderStore((s) => s.items.find((o) => o.id === (id ?? s.lastOrderId)));
  const hydrated = useOrderStore((s) => s.hydrated);

  /**
   * A dispensed prescription medicine cannot re-enter pharmacy stock, so it can
   * never be part of a return. The lock is a regulatory fact about the item,
   * not a UI convenience — which is why it is derived from the order line
   * rather than set per fixture.
   */
  const items = (order?.lines ?? []).map((l) => ({
    id: l.productId,
    name: l.name,
    meta: l.requiresPrescription
      ? tr('metaRx', { qty: l.qty })
      : tr('metaSealed', { qty: l.qty }),
    price: l.unitPrice * l.qty,
    locked: l.requiresPrescription,
    lockReason: tr('lockReason'),
  }));

  const { count, amount } = useMemo(() => {
    const chosen = items.filter((i) => !i.locked && picked[i.id]);
    return { count: chosen.length, amount: chosen.reduce((s, i) => s + i.price, 0) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, order]);

  if (!order) {
    if (!hydrated) return <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }} />;
    return (
      <StatusScreen
        icon="danger"
        tone="danger"
        title={tr('notFoundTitle')}
        body={tr('notFoundBody')}
        actions={
          <Button label={tr('seeAll')} size="large" onPress={() => router.replace('/order-history')} />
        }
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      <FormScreen gap={16}>
        <TitleAppBar title={tr('title')} />

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
          <Icon name="shield-check" size={d(20)} tone="primary" />
          <View style={{ flex: 1, gap: d(4) }}>
            <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
              {tr('explTitle')}
            </Text>
            <Text variant="bodyS" tone="secondary" style={{ fontSize: d(13), lineHeight: d(19) }}>
              {tr('explBody')}
            </Text>
          </View>
        </View>

        <SectionLabel>{tr('which')}</SectionLabel>

        {items.map((i) => {
          const on = !i.locked && !!picked[i.id];
          return (
            <Pressable
              key={i.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on, disabled: i.locked }}
              accessibilityLabel={`${i.name}. ${i.meta}. ${cedis(i.price)}.${
                i.locked ? ` ${i.lockReason}` : ''
              }`}
              disabled={i.locked}
              onPress={() => setPicked((p) => ({ ...p, [i.id]: !p[i.id] }))}
              style={({ pressed }) => ({
                gap: d(10),
                paddingVertical: d(14),
                paddingHorizontal: d(16),
                borderRadius: d(20),
                backgroundColor: t.colors.bg.surface,
                borderWidth: 1.5,
                borderColor: on ? t.colors.border.brand : 'transparent',
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(12) }}>
                <Checkbox checked={on} disabled={i.locked} />
                <View style={{ flex: 1, gap: d(3) }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(8) }}>
                    <Text
                      variant="labelM"
                      tone={i.locked ? 'disabled' : 'primary'}
                      style={{ fontSize: d(14), lineHeight: d(18) }}
                    >
                      {i.name}
                    </Text>
                    {i.locked ? <Badge label="Rx" tone="warning" /> : null}
                  </View>
                  <Text
                    variant="caption"
                    tone={i.locked ? 'disabled' : 'tertiary'}
                    style={{ fontSize: d(12), lineHeight: d(16) }}
                  >
                    {i.meta}
                  </Text>
                </View>
                <Text
                  variant="labelM"
                  tone={i.locked ? 'disabled' : 'primary'}
                  style={{ fontSize: d(14), lineHeight: d(18) }}
                >
                  {cedis(i.price)}
                </Text>
              </View>

              {i.locked ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: d(8),
                    paddingVertical: d(8),
                    paddingHorizontal: d(10),
                    borderRadius: d(12),
                    backgroundColor: t.colors.bg.warningSubtle,
                  }}
                >
                  <Icon name="shield-check" size={d(14)} tone="warning" />
                  <Text
                    variant="caption"
                    tone="warning"
                    style={{ flex: 1, fontSize: d(12), lineHeight: d(16) }}
                  >
                    {i.lockReason}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}

        <SectionLabel>{tr('whatWrong')}</SectionLabel>

        {REASONS.map((r) => {
          const selected = reason === r;
          return (
            <Pressable
              key={r}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={formLabel(r)}
              onPress={() => setReason(r)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: d(12),
                paddingVertical: d(14),
                paddingHorizontal: d(16),
                borderRadius: d(18),
                backgroundColor: t.colors.bg.surface,
                borderWidth: 1.5,
                borderColor: selected ? t.colors.border.brand : 'transparent',
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Radio selected={selected} />
              <Text variant="labelM" style={{ flex: 1, fontSize: d(14), lineHeight: d(18) }}>
                {formLabel(r)}
              </Text>
            </Pressable>
          );
        })}

        <SectionLabel>{tr('photos')}</SectionLabel>

        <View style={{ flexDirection: 'row', gap: d(10) }}>
          {photos.map((p) => (
            <View
              key={p}
              style={{
                flex: 1,
                height: d(106),
                borderRadius: d(18),
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: t.colors.bg.surfaceRaised,
              }}
            >
              <Icon name="image" size={d(26)} tone="tertiary" />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={tr('removePhoto', { n: p })}
                hitSlop={8}
                onPress={() => setPhotos((list) => list.filter((x) => x !== p))}
                style={{
                  position: 'absolute',
                  right: d(8),
                  top: d(8),
                  width: d(24),
                  height: d(24),
                  borderRadius: t.radius.full,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: t.colors.bg.danger,
                }}
              >
                <Icon name="close" size={d(12)} color={t.colors.text.onSolid} />
              </Pressable>
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr('addPhoto')}
            onPress={() => setPhotos((list) => [...list, (list[list.length - 1] ?? 0) + 1])}
            style={({ pressed }) => ({
              flex: 1,
              height: d(106),
              borderRadius: d(18),
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1.5,
              borderColor: t.colors.border.default,
              borderStyle: 'dashed',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Icon name="camera" size={d(24)} tone="tertiary" />
          </Pressable>
        </View>
      </FormScreen>

      <StickyFooter>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(14) }}>
          <View style={{ gap: d(1) }}>
            <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
              {tr(count === 1 ? 'selectedOne' : 'selectedMany', { count })}
            </Text>
            <Text variant="numericM" style={{ fontSize: d(20), lineHeight: d(26) }}>
              {cedis(amount)}
            </Text>
          </View>
          <Button
            label={tr('review')}
            size="large"
            iconTrailing="arrow-right"
            style={{ flex: 1 }}
            disabled={count === 0 || !reason}
            onPress={() =>
              router.push(
                `/refund-review?id=${order.id}&amount=${amount}&items=${count}&reason=${encodeURIComponent(
                  reason ?? '',
                )}`,
              )
            }
          />
        </View>
      </StickyFooter>
    </View>
  );
}
