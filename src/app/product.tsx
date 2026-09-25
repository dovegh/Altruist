/**
 * Product Detail — ported 1:1 from Figma "Product Detail" (page 7:38).
 *
 * Image panel 390×348, bottom corners r40, with three 44pt circular controls
 * floating at y62. Content V gap18, pad 24/24/140/24. A fixed Add-to-cart bar
 * (bg/surface, H gap14, pad 16/24/44/24) sits at the bottom — hence the 140pt
 * bottom padding on the scroll content.
 *
 * The prescription notice is gold, not coral: needing a prescription is a normal
 * property of a medicine, not an error. Coral here would train users to read a
 * routine antibiotic as a problem.
 *
 * Opened as `/product?id=<productId>`. Without an id there is no honest screen
 * to draw — a detail page that falls back to "some product" will eventually put
 * one medicine's dosage under another medicine's name.
 */
import React, { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet, Share } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { Text } from '@/components/ui/Text';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { RxBadge } from '@/components/ui/Product';
import { QuantityStepper } from '@/components/ui/Form';
import { ListRow } from '@/components/ui/ListRow';
import { StatusScreen } from '@/components/ui/StatusScreen';
import { Shimmer, SkeletonBlock } from '@/components/ui/Skeleton';
import { cedis } from '@/lib/money';

import { useProduct } from '@/features/catalog/queries';
import { useCartStore } from '@/features/cart/store';
import { useIsSaved, useSavedStore } from '@/features/catalog/saved';
import { packLine } from '@/lib/catalog';
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    notFoundTitle: 'Product not found',
    notFoundBody:
      'This medicine is no longer listed by any partner pharmacy. It may have been withdrawn or renamed.',
    browse: 'Browse the catalogue',
    goBack: 'Go back',
    factForm: 'Form',
    factDosage: 'Dosage',
    factPack: 'Pack',
    factShips: 'Ships',
    factCategory: 'Category',
    removeSaved: 'Remove from saved',
    save: 'Save this product',
    share: 'Share this product',
    shareMessage: '{name} · {pack} · {price} — dispensed by {pharmacy} on Altruist',
    reviewOne: '{rating} · {count} review',
    reviewMany: '{rating} · {count} reviews',
    noReviews: 'No reviews yet',
    supplement: 'Supplement',
    rxTitle: 'Prescription required',
    rxBody:
      'A licensed partner pharmacist must verify your prescription before this item can be dispensed.',
    aboutMedicine: 'About this medicine',
    aboutProduct: 'About this product',
    aboutFallback:
      '{pharmacy} lists this as {name} ({pack}). Ask the pharmacy for full product details before use.',
    dispensedBy: 'Dispensed by {pharmacy}',
    total: 'Total',
    addToCart: 'Add to cart',
    outOfStock: 'Out of stock',
  },
  fr: {
    notFoundTitle: 'Produit introuvable',
    notFoundBody:
      "Ce médicament n'est plus proposé par aucune pharmacie partenaire. Il a peut-être été retiré ou renommé.",
    browse: 'Parcourir le catalogue',
    goBack: 'Retour',
    factForm: 'Forme',
    factDosage: 'Posologie',
    factPack: 'Conditionnement',
    factShips: 'Expédition',
    factCategory: 'Catégorie',
    removeSaved: 'Retirer des favoris',
    save: 'Enregistrer ce produit',
    share: 'Partager ce produit',
    shareMessage: '{name} · {pack} · {price} — délivré par {pharmacy} sur Altruist',
    reviewOne: '{rating} · {count} avis',
    reviewMany: '{rating} · {count} avis',
    noReviews: "Pas encore d'avis",
    supplement: 'Complément',
    rxTitle: 'Ordonnance requise',
    rxBody:
      'Un pharmacien partenaire agréé doit vérifier votre ordonnance avant que ce produit puisse être délivré.',
    aboutMedicine: 'À propos de ce médicament',
    aboutProduct: 'À propos de ce produit',
    aboutFallback:
      '{pharmacy} le référence sous le nom {name} ({pack}). Demandez tous les détails du produit à la pharmacie avant utilisation.',
    dispensedBy: 'Délivré par {pharmacy}',
    total: 'Total',
    addToCart: 'Ajouter au panier',
    outOfStock: 'En rupture de stock',
  },
  tw: {
    notFoundTitle: 'Yɛanhu adeɛ no',
    notFoundBody:
      'Nnuro fie biara nni saa nnuro yi bio. Ebia wɔayi afiri hɔ anaa wɔasesa ne din.',
    browse: 'Hwɛ nneɛma a ɛwɔ hɔ',
    goBack: 'San w’akyi',
    factForm: 'Ne sɛbea',
    factDosage: 'Dodoɔ a wobɛnom',
    factPack: 'Kotoku',
    factShips: 'Wɔde ba',
    factCategory: 'Ne kuo',
    removeSaved: 'Yi firi deɛ woakora mu',
    save: 'Kora saa adeɛ yi',
    share: 'Kyɛ saa adeɛ yi',
    shareMessage: '{name} · {pack} · {price} — {pharmacy} na ɛtɔn wɔ Altruist so',
    reviewOne: '{rating} · adwene {count}',
    reviewMany: '{rating} · adwene {count}',
    noReviews: 'Obiara nkaa ho asɛm ɛ',
    supplement: 'Aduan ho mmoa',
    rxTitle: 'Ɛhia nnuro krataa',
    rxBody:
      'Nnuroyɛfoɔ a wɔama no tumi bɛhwɛ wo nnuro krataa ansa na wɔde saa adeɛ yi ama wo.',
    aboutMedicine: 'Saa nnuro yi ho asɛm',
    aboutProduct: 'Saa adeɛ yi ho asɛm',
    aboutFallback:
      '{pharmacy} frɛ yei {name} ({pack}). Bisa nnuro fie no ne ho nsɛm nyinaa ansa na woade adi dwuma.',
    dispensedBy: '{pharmacy} na ɛde ma',
    total: 'Ne nyinaa',
    addToCart: 'Fa gu kɛntɛn mu',
    outOfStock: 'Asa',
  },
  gaa: {
    notFoundTitle: 'Anaaa nɔ lɛ',
    notFoundBody:
      'Tsofa shĩa ko bɛ ni hiɛ tsofa nɛɛ dɔŋŋ. Ekolɛ ajie kɛjɛ jɛmɛ loo atsake egbɛi.',
    browse: 'Kwɛmɔ nibii ni yɔɔ',
    goBack: 'Kua sɛɛ',
    factForm: 'Bɔ ni eyɔɔ',
    factDosage: 'Enɛ ni oonu',
    factPack: 'Adeka',
    factShips: 'Kɛbaa',
    factCategory: 'Kuu',
    removeSaved: 'Jiemɔ kɛjɛ nɔ ni okɔ mli',
    save: 'Toɔ nɔ nɛɛ',
    share: 'Ŋmɛɛ nɔ nɛɛ',
    shareMessage: '{name} · {pack} · {price} — {pharmacy} kɛhaa yɛ Altruist nɔ',
    reviewOne: '{rating} · susumɔ {count}',
    reviewMany: '{rating} · susumɔi {count}',
    noReviews: 'Susumɔ ko bɛ kɛhã',
    supplement: 'Niyenii he buamɔ',
    rxTitle: 'Tsofa wolo he miihia',
    rxBody:
      'Tsofatsɛ ni ahã lɛ hewalɛ lɛ esa akwɛ o tsofa wolo lɛ dani akɛ nɔ nɛɛ aaahã bo.',
    aboutMedicine: 'Tsofa nɛɛ he sane',
    aboutProduct: 'Nɔ nɛɛ he sane',
    aboutFallback:
      '{pharmacy} tsɛɔ enɛ {name} ({pack}). Bi tsofa shĩa lɛ ehe saji fɛɛ dani okɛtsu nii.',
    dispensedBy: '{pharmacy} kɛhaa',
    total: 'Fɛɛ',
    addToCart: 'Kɛwo kɛntɛŋ mli',
    outOfStock: 'Egbe naa',
  },
  ee: {
    notFoundTitle: 'Míekpɔ nua o',
    notFoundBody:
      'Atikeƒle aɖeke megale atike sia dzram o. Ɖewohĩ woɖe ɖa alo wotrɔ eŋkɔ.',
    browse: 'Kpɔ nuawo katã',
    goBack: 'Trɔ yi megbe',
    factForm: 'Eƒe nɔnɔme',
    factDosage: 'Agbɔsɔsɔ',
    factPack: 'Agba',
    factShips: 'Woɖoe ɖa',
    factCategory: 'Hatsotso',
    removeSaved: 'Ɖe ɖa le nu siwo nèdzra ɖo me',
    save: 'Dzra nu sia ɖo',
    share: 'Mã nu sia',
    shareMessage: '{name} · {pack} · {price} — {pharmacy} ye naa le Altruist dzi',
    reviewOne: '{rating} · susu {count}',
    reviewMany: '{rating} · susu {count}',
    noReviews: 'Susu aɖeke meli haɖe o',
    supplement: 'Nuɖuɖu kpekpeɖeŋu',
    rxTitle: 'Atike ŋɔŋlɔ hiã',
    rxBody:
      'Ele be atikewɔla si ŋu mɔɖeɖe le nakpɔ wò atike ŋɔŋlɔ hafi woana nu sia wò.',
    aboutMedicine: 'Atike sia ŋuti',
    aboutProduct: 'Nu sia ŋuti',
    aboutFallback:
      '{pharmacy} yɔe be {name} ({pack}). Bia atikeƒea le eŋu nyawo katã hafi nàzãe.',
    dispensedBy: '{pharmacy} ye naa',
    total: 'Katã',
    addToCart: 'Tsɔe de kusi me',
    outOfStock: 'Ewu enu',
  },
  ha: {
    notFoundTitle: 'Ba a sami kaya ba',
    notFoundBody:
      'Babu kantin magani abokin hulɗa da ke sayar da wannan magani yanzu. Wataƙila an cire shi ko an canza sunansa.',
    browse: 'Duba kayayyaki',
    goBack: 'Koma baya',
    factForm: 'Siffa',
    factDosage: 'Adadin sha',
    factPack: 'Kunshi',
    factShips: 'Isarwa',
    factCategory: 'Rukuni',
    removeSaved: 'Cire daga ajiyayyu',
    save: 'Ajiye wannan kaya',
    share: 'Raba wannan kaya',
    shareMessage: '{name} · {pack} · {price} — {pharmacy} ne ke bayarwa a Altruist',
    reviewOne: '{rating} · sharhi {count}',
    reviewMany: '{rating} · sharhi {count}',
    noReviews: 'Babu sharhi tukuna',
    supplement: 'Ƙarin abinci',
    rxTitle: 'Ana buƙatar takardar magani',
    rxBody:
      'Dole mai harhaɗa magani mai lasisi ya tabbatar da takardar maganinka kafin a ba da wannan kaya.',
    aboutMedicine: 'Game da wannan magani',
    aboutProduct: 'Game da wannan kaya',
    aboutFallback:
      '{pharmacy} ya sa wannan a matsayin {name} ({pack}). Tambayi kantin magani cikakken bayani kafin amfani.',
    dispensedBy: '{pharmacy} ne ke bayarwa',
    total: 'Jimla',
    addToCart: 'Saka a kwando',
    outOfStock: 'Ya ƙare',
  },
});

type Key = keyof typeof S.en;

export default function ProductDetail() {
  const tr = useT(S);
  const t = useTokens();
  const { d } = useDesignScale();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [qty, setQty] = useState(1);
  const saved = useIsSaved(id);
  const toggleSaved = useSavedStore((s) => s.toggle);

  const { data: product, isPending, isError } = useProduct(id);
  const add = useCartStore((s) => s.add);

  const round = (icon: IconName, label: string, onPress?: () => void, active?: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      style={({ pressed }) => ({
        width: d(44),
        height: d(44),
        borderRadius: t.radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: t.colors.bg.surface,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Icon name={icon} size={d(20)} color={active ? t.colors.icon.brand : t.colors.icon.primary} />
    </Pressable>
  );

  if (isError || (!id && !isPending)) {
    return (
      <StatusScreen
        icon="danger"
        tone="danger"
        title={tr('notFoundTitle')}
        body={tr('notFoundBody')}
        actions={
          <>
            <Button label={tr('browse')} size="large" onPress={() => router.replace('/catalog')} />
            <Button label={tr('goBack')} variant="tertiary" size="large" onPress={() => router.back()} />
          </>
        }
      />
    );
  }

  if (isPending || !product) {
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
        <Shimmer style={{ gap: d(18) }}>
          <SkeletonBlock width="100%" height={348} radius={0} />
          <View style={{ paddingHorizontal: d(24), gap: d(18) }}>
            <SkeletonBlock width={140} height={26} radius={999} />
            <SkeletonBlock width="90%" height={32} radius={12} />
            <SkeletonBlock width="60%" height={21} radius={10} />
            <SkeletonBlock width="45%" height={44} radius={14} />
            <SkeletonBlock width="100%" height={88} radius={20} />
          </View>
        </Shimmer>
      </View>
    );
  }

  /**
   * Key facts, filtered to the ones this product actually has.
   *
   * The VAFY import carries no `form` or `dosage` — those are pharmacist-
   * entered fields on medicinal lines, and the OTC slice has none. Rendering
   * the cards anyway produced three panels with a label and an empty value,
   * which reads as a loading failure. Pack and category are always present, so
   * they fill the row for a product that has nothing clinical to state.
   */
  const candidateFacts: { icon: IconName; label: Key; value: string }[] = [
    { icon: 'prescription', label: 'factForm', value: product.form },
    { icon: 'clock', label: 'factDosage', value: product.dosage },
    { icon: 'catalog', label: 'factPack', value: product.pack },
    { icon: 'cart', label: 'factShips', value: product.ships },
    { icon: 'shield-check', label: 'factCategory', value: product.category },
  ];
  const facts = candidateFacts.filter((f) => f.value.trim().length > 0).slice(0, 3);

  const onAdd = () => {
    add(product.id, qty);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.push('/cart');
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      {/* Figma sets Status Bar Ink=Dark here — the cream image panel runs full
          bleed under it, and light glyphs would vanish on cream. */}
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: d(140) + insets.bottom }}
      >
        {/* Image panel — full bleed, bottom corners 40 */}
        <View
          style={{
            height: d(348),
            borderBottomLeftRadius: d(40),
            borderBottomRightRadius: d(40),
            backgroundColor: t.colors.bg.accentCream,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <View style={{ opacity: 0.2 }}>
            <Icon name="prescription" size={d(140)} color={t.colors.text.onBrand} />
          </View>
          {product.imageUrl ? (
            <Image
              source={{ uri: product.imageUrl }}
              contentFit="cover"
              transition={180}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
        </View>

        {/* Floating controls at design y=62 */}
        <View
          style={{
            position: 'absolute',
            left: d(24),
            right: d(24),
            top: insets.top + d(16),
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          {round('arrow-left', tr('goBack'), () => router.back())}
          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: 'row', gap: d(10) }}>
            {round(
              'heart',
              saved ? tr('removeSaved') : tr('save'),
              () => id && toggleSaved(id),
              saved,
            )}
            {round('send', tr('share'), () =>
              Share.share({
                title: product.name,
                // No public product URL exists yet, so this shares what a person
                // can actually act on: the name, the pack and who dispenses it.
                message: tr('shareMessage', {
                  name: product.name,
                  pack: product.pack,
                  price: cedis(product.price),
                  pharmacy: product.pharmacy,
                }),
              }),
            )}
          </View>
        </View>

        {/* Content */}
        <View style={{ paddingTop: d(24), paddingHorizontal: d(24), gap: d(18) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(8) }}>
            <RxBadge requiresPrescription={product.requiresPrescription} size="full" />
            {/* A star beside "0 · 0 reviews" reads as a one-star product. Shown
                only once there is a rating to show. */}
            {product.reviews > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(5) }}>
                <Icon name="star" size={d(14)} tone="warning" />
                <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
                  {tr(product.reviews === 1 ? 'reviewOne' : 'reviewMany', {
                    rating: product.rating,
                    count: product.reviews,
                  })}
                </Text>
              </View>
            ) : (
              <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
                {tr('noReviews')}
              </Text>
            )}
          </View>

          <Text variant="displayS" style={{ fontSize: d(28), lineHeight: d(32) }}>
            {product.name}
          </Text>
          <Text variant="bodyM" tone="secondary" style={{ fontSize: d(14), lineHeight: d(21) }}>
            {[
              packLine(product),
              product.category === 'Vitamins' ? tr('supplement') : product.form,
            ]
              .filter((part) => part && part.trim().length > 0)
              .join(' · ')}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(12) }}>
            <View style={{ flex: 1, gap: d(2) }}>
              <Text variant="numericXL" style={{ fontSize: d(40), lineHeight: d(44) }}>
                {cedis(product.price)}
              </Text>
              {product.unitNote ? (
                <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
                  {product.unitNote}
                </Text>
              ) : null}
            </View>
            {product.inStock ? <QuantityStepper value={qty} onChange={setQty} /> : null}
          </View>

          {/* Prescription notice — gold. Only for the medicines that need one. */}
          {product.requiresPrescription ? (
            <View
              style={{
                flexDirection: 'row',
                gap: d(12),
                paddingVertical: d(14),
                paddingHorizontal: d(16),
                borderRadius: d(20),
                backgroundColor: t.colors.bg.warningSubtle,
              }}
            >
              <Icon name="shield-check" size={d(20)} tone="warning" />
              <View style={{ flex: 1, gap: d(4) }}>
                <Text variant="labelM" tone="warning" style={{ fontSize: d(14), lineHeight: d(18) }}>
                  {tr('rxTitle')}
                </Text>
                <Text variant="bodyS" tone="secondary" style={{ fontSize: d(13), lineHeight: d(19) }}>
                  {tr('rxBody')}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Key facts — three equal cards */}
          <View style={{ flexDirection: 'row', gap: d(10) }}>
            {facts.map((f) => (
              <View
                key={f.label}
                style={{
                  flex: 1,
                  gap: d(8),
                  padding: d(14),
                  borderRadius: d(20),
                  backgroundColor: t.colors.bg.surface,
                }}
              >
                <Icon name={f.icon} size={d(18)} tone="primary" />
                <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
                  {tr(f.label)}
                </Text>
                <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
                  {f.value}
                </Text>
              </View>
            ))}
          </View>

          <Text variant="headingM" style={{ fontSize: d(18), lineHeight: d(24) }}>
            {product.requiresPrescription ? tr('aboutMedicine') : tr('aboutProduct')}
          </Text>
          <Text variant="bodyM" tone="secondary" style={{ fontSize: d(14), lineHeight: d(21) }}>
            {product.description?.trim()
              ? product.description
              : /* Better an honest pointer than an empty heading: the pharmacy
                   holds the pack details this import does not carry. */
                tr('aboutFallback', {
                  pharmacy: product.pharmacy,
                  name: product.name,
                  pack: product.pack,
                })}
          </Text>

          <ListRow
            title={tr('dispensedBy', { pharmacy: product.pharmacy })}
            subtitle={product.pharmacyMeta}
            chevron
            onPress={() => router.push('/partners')}
          />
        </View>
      </ScrollView>

      {/* Add to cart bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: d(14),
          backgroundColor: t.colors.bg.surface,
          paddingTop: d(16),
          paddingHorizontal: d(24),
          paddingBottom: Math.max(insets.bottom, d(20)) + d(24),
        }}
      >
        <View style={{ gap: d(1) }}>
          <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
            {tr('total')}
          </Text>
          <Text variant="numericL" style={{ fontSize: d(28), lineHeight: d(32) }}>
            {cedis(product.price * qty)}
          </Text>
        </View>
        <Button
          label={product.inStock ? tr('addToCart') : tr('outOfStock')}
          size="large"
          iconLeading="cart"
          disabled={!product.inStock}
          style={{ flex: 1 }}
          onPress={onAdd}
        />
      </View>
    </View>
  );
}
