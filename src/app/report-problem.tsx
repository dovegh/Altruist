/**
 * Report a Problem — ported 1:1 from Figma node on page "Support & Disputes".
 *
 * Scroll content: V gap16, pad 64/24/140/24. Five two-line problem radios, an
 * order picker, the description field, optional photos, and the routing note.
 *
 * The routing note explains something the user should not have to work out:
 * wrong-item and damage reports go to the dispensing pharmacy because only they
 * can confirm what was supplied; payment and delivery problems come to Altruist.
 * The app decides the destination from the selected problem — the user picks
 * what happened, not who to blame.
 */
import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen, StickyFooter } from '@/components/ui/FormScreen';
import { TitleAppBar } from '@/components/ui/AppBar';
import { SectionLabel } from '@/components/ui/Checkout';
import { InputField } from '@/components/ui/Input';
import { Radio } from '@/components/ui/Form';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { cedis } from '@/lib/money';
import { useOrderStore } from '@/features/orders/store';
import { PROBLEM_TYPES as PROBLEMS } from '@/lib/forms';
import { defineStrings, useLocale, useT } from '@/i18n';
import { formLabel } from '@/lib/formLabels';

const S = defineStrings({
  en: {
    title: 'Report a problem',
    whatWrong: 'WHAT WENT WRONG?',
    whichOrder: 'WHICH ORDER?',
    orderA11y: 'Order {id}, {placed}, {pharmacy}, {total}. Change order.',
    choose: 'Choose an order',
    noOrders: 'No orders on this device yet',
    tellUs: 'Tell us what happened',
    helper: 'The pharmacy sees this message and can respond directly.',
    placeholder: 'I ordered Amoxicillin 500mg but received 250mg.',
    addPhotos: 'ADD PHOTOS (OPTIONAL)',
    addPhoto: 'Add a photo',
    attachedPhoto: 'Attached photo {n}',
    routing: 'We will send this to the pharmacy or our team, depending on the problem.',
    send: 'Send report',
  },
  fr: {
    title: 'Signaler un problème',
    whatWrong: 'QUEL EST LE PROBLÈME ?',
    whichOrder: 'QUELLE COMMANDE ?',
    orderA11y: 'Commande {id}, {placed}, {pharmacy}, {total}. Changer de commande.',
    choose: 'Choisir une commande',
    noOrders: 'Aucune commande sur cet appareil pour le moment',
    tellUs: 'Dites-nous ce qui s’est passé',
    helper: 'La pharmacie voit ce message et peut vous répondre directement.',
    placeholder: 'J’ai commandé de l’Amoxicillin 500mg mais j’ai reçu du 250mg.',
    addPhotos: 'AJOUTER DES PHOTOS (FACULTATIF)',
    addPhoto: 'Ajouter une photo',
    attachedPhoto: 'Photo jointe {n}',
    routing: 'Nous transmettrons ceci à la pharmacie ou à notre équipe, selon le problème.',
    send: 'Envoyer le signalement',
  },
  tw: {
    title: 'Ka ɔhaw bi ho asɛm',
    whatWrong: 'DEƐN NA ƐKƆƆ BƆNE?',
    whichOrder: 'ADETƆ BƐN?',
    orderA11y: 'Adetɔ {id}, {placed}, {pharmacy}, {total}. Sesa adetɔ.',
    choose: 'Paw adetɔ bi',
    noOrders: 'Adetɔ biara nni saa fon yi so ɛ',
    tellUs: 'Ka deɛ ɛsiiɛ kyerɛ yɛn',
    helper: 'Nnuro fie no bɛhunu saa nkra yi na wɔbɛtumi abua wo tẽẽ.',
    placeholder: 'Metɔɔ Amoxicillin 500mg nanso wɔde 250mg brɛɛ me.',
    addPhotos: 'FA MFONINI KA HO (SƐ WOPƐ A)',
    addPhoto: 'Fa mfonini ka ho',
    attachedPhoto: 'Mfonini {n} a ɛka ho',
    routing: 'Yɛde yei bɛkɔma nnuro fie no anaa yɛn kuo no, gyina ɔhaw no so.',
    send: 'Fa amanneɛ no kɔ',
  },
  gaa: {
    title: 'Bɔ naagba ko he amaniɛ',
    whatWrong: 'MƐNI JAAA?',
    whichOrder: 'NƆ NI OHE NƐGBƐ?',
    orderA11y: 'Nɔ ni ohe {id}, {placed}, {pharmacy}, {total}. Tsake nɔ ni ohe.',
    choose: 'Hala nɔ ni ohe ko',
    noOrders: 'Nɔ ni ohe ko bɛ fon nɛɛ nɔ kɛhã',
    tellUs: 'Gba wɔ nɔ ni ba',
    helper: 'Tsofa shĩa lɛ naa sane nɛɛ ni amɛbaanyɛ amɛhã bo hetoo tɛɛ.',
    placeholder: 'Mihe Amoxicillin 500mg shi amɛkɛ 250mg ba.',
    addPhotos: 'KƐ MFONIRII FATA HE (KƐJI OSUMƆ)',
    addPhoto: 'Kɛ mfoniri fata he',
    attachedPhoto: 'Mfoniri {n} ni fata he',
    routing: 'Wɔbaakɛ enɛ aya tsofa shĩa lɛ loo wɔ kuu lɛ, yɛ naagba lɛ naa.',
    send: 'Kɛ amaniɛbɔɔ lɛ ya',
  },
  ee: {
    title: 'Ka nya ɖe kuxi aɖe ŋu',
    whatWrong: 'NUKAE GBLẼ?',
    whichOrder: 'NUƑEƑLE KA?',
    orderA11y: 'Nuƒeƒle {id}, {placed}, {pharmacy}, {total}. Trɔ nuƒeƒle.',
    choose: 'Tia nuƒeƒle aɖe',
    noOrders: 'Nuƒeƒle aɖeke mele fon sia dzi haɖe o',
    tellUs: 'Gblɔ nu si dzɔ na mí',
    helper: 'Atikeƒle la akpɔ gbedasi sia eye wòate ŋu aɖo eŋu na wò tẽ.',
    placeholder: 'Meƒle Amoxicillin 500mg gake wona 250mg m.',
    addPhotos: 'TSƆ FOTOWO KPE ƉE EŊU (NE ÈDI)',
    addPhoto: 'Tsɔ foto kpe ɖe eŋu',
    attachedPhoto: 'Foto {n} si kpe ɖe eŋu',
    routing: 'Míaɖo esia ɖe atikeƒle la alo míaƒe ha, le kuxi la nu.',
    send: 'Ɖo nyatakaka la ɖa',
  },
  ha: {
    title: 'Kai rahoton matsala',
    whatWrong: 'ME YA FARU?',
    whichOrder: 'WACCE ODA?',
    orderA11y: 'Oda {id}, {placed}, {pharmacy}, {total}. Canza oda.',
    choose: 'Zaɓi oda',
    noOrders: 'Babu oda a wannan na’ura tukuna',
    tellUs: 'Faɗa mana abin da ya faru',
    helper: 'Kantin magani zai ga wannan saƙo kuma zai iya amsa maka kai tsaye.',
    placeholder: 'Na yi odar Amoxicillin 500mg amma aka kawo min 250mg.',
    addPhotos: 'ƘARA HOTUNA (IN KANA SO)',
    addPhoto: 'Ƙara hoto',
    attachedPhoto: 'Hoton da aka haɗa {n}',
    routing: 'Za mu aika wannan ga kantin magani ko ƙungiyarmu, gwargwadon matsalar.',
    send: 'Aika rahoto',
  },
});


export default function ReportProblem() {
  const tr = useT(S);
  const locale = useLocale();
  const t = useTokens();
  const { d } = useDesignScale();
  // The order most likely being complained about. Tapping the strip opens the
  // history so a different one can be picked.
  const order = useOrderStore((st) => st.items.find((o) => o.id === st.lastOrderId) ?? st.items[0]);
  const placed = order
    ? new Date(order.placedAt).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
    : '';
  const [problem, setProblem] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<number[]>([1, 2]);

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      <FormScreen gap={16}>
        <TitleAppBar title={tr('title')} />

        <SectionLabel>{tr('whatWrong')}</SectionLabel>

        {PROBLEMS.map((p) => {
          const selected = problem === p.id;
          return (
            <Pressable
              key={p.id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${formLabel(p.title)}. ${formLabel(p.meta)}`}
              onPress={() => setProblem(p.id)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: d(12),
                paddingVertical: d(13),
                paddingHorizontal: d(16),
                borderRadius: d(18),
                backgroundColor: t.colors.bg.surface,
                borderWidth: 1.5,
                borderColor: selected ? t.colors.border.brand : 'transparent',
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Radio selected={selected} />
              <View style={{ flex: 1, gap: d(3) }}>
                <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
                  {formLabel(p.title)}
                </Text>
                <Text
                  variant="caption"
                  tone="tertiary"
                  style={{ fontSize: d(12), lineHeight: d(16) }}
                >
                  {formLabel(p.meta)}
                </Text>
              </View>
            </Pressable>
          );
        })}

        <SectionLabel>{tr('whichOrder')}</SectionLabel>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            order
              ? tr('orderA11y', {
                  id: order.id,
                  placed,
                  pharmacy: order.pharmacy,
                  total: cedis(order.total),
                })
              : tr('choose')
          }
          onPress={() => router.push('/order-history')}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: d(12),
            paddingVertical: d(12),
            paddingHorizontal: d(14),
            borderRadius: d(18),
            backgroundColor: t.colors.bg.surface,
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <Icon name="cart" size={d(20)} tone="primary" />
          <View style={{ flex: 1, gap: d(3) }}>
            <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
              {order ? `${order.id} · ${placed}` : tr('choose')}
            </Text>
            <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
              {order ? `${order.pharmacy} · ${cedis(order.total)}` : tr('noOrders')}
            </Text>
          </View>
          <Icon name="chevron-right" size={d(18)} tone="tertiary" />
        </Pressable>

        <InputField
          label={tr('tellUs')}
          helper={tr('helper')}
          value={description}
          onChangeText={setDescription}
          placeholder={tr('placeholder')}
          multiline
        />

        <SectionLabel>{tr('addPhotos')}</SectionLabel>

        <View style={{ flexDirection: 'row', gap: d(10) }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr('addPhoto')}
            onPress={() => setPhotos((list) => [...list, (list[list.length - 1] ?? 0) + 1])}
            style={({ pressed }) => ({
              flex: 1,
              height: d(100),
              borderRadius: d(18),
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: t.colors.bg.surface,
              borderWidth: 1.5,
              borderColor: t.colors.border.default,
              borderStyle: 'dashed',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Icon name="add" size={d(22)} tone="tertiary" />
          </Pressable>

          {photos.map((p) => (
            <View
              key={p}
              accessibilityRole="image"
              accessibilityLabel={tr('attachedPhoto', { n: p })}
              style={{
                flex: 1,
                height: d(100),
                borderRadius: d(18),
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: t.colors.bg.surfaceRaised,
              }}
            >
              <Icon name="image" size={d(22)} tone="tertiary" />
            </View>
          ))}
        </View>

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
            {tr('routing')}
          </Text>
        </View>
      </FormScreen>

      <StickyFooter>
        <Button
          label={tr('send')}
          size="large"
          disabled={!problem || description.trim().length === 0}
          onPress={() => router.replace('/support-conversation')}
        />
      </StickyFooter>
    </View>
  );
}
