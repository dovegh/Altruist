/**
 * Payment Methods — ported 1:1 from Figma node 72:169.
 *
 * Scroll content: V gap16, pad 64/24/60/24. One card per method (r24, pad 16,
 * H gap14): a 46pt r14 icon tile, then a meta column carrying the name, the
 * masked identifier and the holder/expiry. Default methods take a 1.5pt brand
 * border.
 *
 * Nothing here is a real credential. The masked strings are all the app is ever
 * given: Paystack tokenises on capture and returns the last four digits and the
 * card type, so there is no code path in which a full number could reach this
 * screen.
 */
import React, { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen } from '@/components/ui/FormScreen';
import { TitleAppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Text } from '@/components/ui/Text';
import { Icon, type IconName } from '@/components/ui/Icon';
import { NetworkBadge } from '@/components/NetworkBadge';
import { useSavedMethods, useWalletStore } from '@/features/checkout/store';
import { deleteMethod, loadPaymentMethods, makeDefaultMethod } from '@/features/checkout/methods';
import { FormMessage, describeFailure } from '@/components/ui/FormMessage';
import { useProfile } from '@/features/profile/store';
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    title: 'Payment methods',
    expires: 'Expires {date}',
    default: 'Default',
    removeQ: 'Remove {name}?',
    removing: 'Removing…',
    yesRemove: 'Yes, remove',
    keep: 'Keep it',
    saving: 'Saving…',
    makeDefault: 'Make default',
    remove: 'Remove',
    none: 'No saved methods yet.',
    add: 'Add a payment method',
    pinTitle: 'Your PIN stays with you',
    pinBody: 'You approve each payment on your phone. Altruist never sees your MoMo PIN.',
  },
  fr: {
    title: 'Moyens de paiement',
    expires: 'Expire {date}',
    default: 'Par défaut',
    removeQ: 'Supprimer {name} ?',
    removing: 'Suppression…',
    yesRemove: 'Oui, supprimer',
    keep: 'Le garder',
    saving: 'Enregistrement…',
    makeDefault: 'Définir par défaut',
    remove: 'Supprimer',
    none: 'Aucun moyen enregistré pour le moment.',
    add: 'Ajouter un moyen de paiement',
    pinTitle: 'Votre PIN reste avec vous',
    pinBody:
      'Vous validez chaque paiement sur votre téléphone. Altruist ne voit jamais votre PIN MoMo.',
  },
  tw: {
    title: 'Akwan a wode tua ka',
    expires: 'Ɛbɛba awieeɛ {date}',
    default: 'Deɛ wode di kan',
    removeQ: 'Yi {name}?',
    removing: 'Ɛreyi…',
    yesRemove: 'Aane, yi',
    keep: 'Gyae hɔ',
    saving: 'Ɛrekora…',
    makeDefault: 'Fa di kan',
    remove: 'Yi',
    none: 'Wonkoraa biribiara ɛ.',
    add: 'Fa ɛkwan foforɔ a wode tua ka ka ho',
    pinTitle: 'Wo PIN tena wo nkyɛn',
    pinBody: 'Wo ara na wopene sika tua biara so wɔ wo fon so. Altruist nhunu wo MoMo PIN da.',
  },
  gaa: {
    title: 'Gbɛi ni okɛwoɔ nyɔmɔ',
    expires: 'Ebaa naagbee {date}',
    default: 'Klɛŋklɛŋ nɔ',
    removeQ: 'Jiemɔ {name}?',
    removing: 'Ejieɔ…',
    yesRemove: 'Hɛɛ, jiemɔ',
    keep: 'Ha ehi jɛmɛ',
    saving: 'Etoɔ…',
    makeDefault: 'Kɛ lɛ afee klɛŋklɛŋ',
    remove: 'Jiemɔ',
    none: 'Otooo nɔ ko kɛhã.',
    add: 'Kɛ nyɔmɔwoo gbɛ ko fata he',
    pinTitle: 'O PIN hiɔ o ŋɔɔ',
    pinBody: 'Bo diɛŋtsɛ okpɛlɛɔ nyɔmɔwoo fɛɛ nɔ yɛ o fon nɔ. Altruist naaa o MoMo PIN kɔkɔɔkɔ.',
  },
  ee: {
    title: 'Fexexemɔwo',
    expires: 'Ewua enu {date}',
    default: 'Gbãtɔ',
    removeQ: 'Ɖe {name} ɖa?',
    removing: 'Ele eɖem ɖa…',
    yesRemove: 'Ẽ, ɖee ɖa',
    keep: 'Gblẽe ɖi',
    saving: 'Ele edzram ɖo…',
    makeDefault: 'Wɔe gbãtɔ',
    remove: 'Ɖe ɖa',
    none: 'Mèdzra naneke ɖo haɖe o.',
    add: 'Tsɔ fexexemɔ aɖe kpe ɖe eŋu',
    pinTitle: 'Wò PIN nɔa gbɔwò',
    pinBody: 'Wò ŋutɔ èlɔ̃a ɖe fexexe ɖe sia ɖe dzi le wò fon dzi. Altruist mekpɔa wò MoMo PIN gbeɖe o.',
  },
  ha: {
    title: 'Hanyoyin biyan kuɗi',
    expires: 'Zai ƙare {date}',
    default: 'Na farko',
    removeQ: 'Cire {name}?',
    removing: 'Ana cirewa…',
    yesRemove: 'Eh, cire',
    keep: 'Bar shi',
    saving: 'Ana ajiyewa…',
    makeDefault: 'Mai da shi na farko',
    remove: 'Cire',
    none: 'Babu hanyar da aka ajiye tukuna.',
    add: 'Ƙara hanyar biyan kuɗi',
    pinTitle: 'PIN ɗinka yana wurinka',
    pinBody: 'Kai ne ke amincewa da kowane biya a wayarka. Altruist ba ya ganin PIN ɗin MoMo ɗinka.',
  },
});


export default function PaymentMethods() {
  const tr = useT(S);
  const profile = useProfile();
  const saved = useSavedMethods();
  const defaultId = useWalletStore((s) => s.defaultMethodId);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPaymentMethods().catch(() => {});
  }, []);

  /** One server write for one card, with that card marked busy. */
  const run = async (id: string, action: () => Promise<void>) => {
    setError(null);
    setBusy(id);
    try {
      await action();
    } catch (e) {
      setError(describeFailure(e));
    } finally {
      setBusy(null);
    }
  };
  const t = useTokens();
  const { d } = useDesignScale();

  // A card is identified by when it expires, a wallet by whose it is.
  const METHODS = saved.map((m) => ({
    id: m.id,
    icon: m.icon,
    provider: m.provider,
    name: m.brand ?? m.title,
    masked: m.last4 ? `•••• •••• •••• ${m.last4}` : (m.wallet ?? m.subtitle),
    meta: m.expires ? tr('expires', { date: m.expires }) : profile.name,
    isDefault: m.id === defaultId,
  }));

  const chip = (icon: IconName, label: string, danger = false, onPress?: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={busy !== null}
      onPress={onPress}
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: d(6),
        height: d(32),
        paddingLeft: d(14),
        paddingRight: d(16),
        borderRadius: t.radius.full,
        backgroundColor: t.colors.bg.surfaceRaised,
        opacity: busy !== null ? 0.5 : pressed ? 0.85 : 1,
      })}
    >
      <Icon name={icon} size={d(15)} color={danger ? t.colors.text.danger : t.colors.icon.secondary} />
      <Text
        variant="labelS"
        tone={danger ? 'danger' : 'secondary'}
        style={{ fontSize: d(12), lineHeight: d(16) }}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <FormScreen gap={16} contentStyle={{ paddingBottom: d(60) }}>
      <TitleAppBar title={tr('title')} />

      {error ? <FormMessage>{error}</FormMessage> : null}

      {METHODS.map((m) => (
        <View
          key={m.id}
          style={{
            gap: d(12),
            padding: d(16),
            borderRadius: d(24),
            backgroundColor: t.colors.bg.surface,
            borderWidth: t.size.border.medium,
            borderColor: m.isDefault ? t.colors.border.brand : 'transparent',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(14) }}>
          <View
            style={{
              width: d(46),
              height: d(46),
              borderRadius: d(14),
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: t.colors.bg.surfaceRaised,
            }}
          >
            {m.provider ? (
              <NetworkBadge provider={m.provider} size={46} />
            ) : (
              <Icon name={m.icon} size={d(22)} tone="primary" />
            )}
          </View>

          <View style={{ flex: 1, gap: d(4) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(8) }}>
              <Text variant="labelL" style={{ flex: 1, fontSize: d(16), lineHeight: d(20) }}>
                {m.name}
              </Text>
              {m.isDefault ? <Badge label={tr('default')} tone="brand" /> : null}
            </View>
            <Text variant="bodyM" tone="secondary" style={{ fontSize: d(14), lineHeight: d(21) }}>
              {m.masked}
            </Text>
            <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
              {m.meta}
            </Text>
            </View>
          </View>

          {confirming === m.id ? (
            <View style={{ gap: d(10) }}>
              <Text variant="labelM" tone="danger" style={{ fontSize: d(14), lineHeight: d(18) }}>
                {tr('removeQ', { name: m.name })}
              </Text>
              <View style={{ flexDirection: 'row', gap: d(10) }}>
                {chip('trash', busy === m.id ? tr('removing') : tr('yesRemove'), true, () =>
                  run(m.id, async () => {
                    await deleteMethod(m.id);
                    setConfirming(null);
                  }),
                )}
                {chip('close', tr('keep'), false, () => setConfirming(null))}
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: d(10) }}>
              {m.isDefault
                ? null
                : chip('check', busy === m.id ? tr('saving') : tr('makeDefault'), false, () =>
                    run(m.id, () => makeDefaultMethod(m.id)),
                  )}
              {chip('trash', tr('remove'), true, () => setConfirming(m.id))}
            </View>
          )}
        </View>
      ))}

      {METHODS.length === 0 ? (
        <Text variant="bodyM" tone="tertiary" style={{ fontSize: d(14), lineHeight: d(21) }}>
          {tr('none')}
        </Text>
      ) : null}

      <Button
        label={tr('add')}
        variant="secondary"
        size="large"
        iconLeading="add"
        onPress={() => router.push('/add-payment-method')}
      />

      <View
        style={{
          flexDirection: 'row',
          gap: d(12),
          paddingVertical: d(14),
          paddingHorizontal: d(16),
          borderRadius: d(20),
          backgroundColor: t.colors.bg.infoSubtle,
        }}
      >
        <Icon name="shield-check" size={d(20)} tone="primary" />
        <View style={{ flex: 1, gap: d(4) }}>
          <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
            {tr('pinTitle')}
          </Text>
          <Text variant="bodyS" tone="secondary" style={{ fontSize: d(13), lineHeight: d(19) }}>
            {tr('pinBody')}
          </Text>
        </View>
      </View>
    </FormScreen>
  );
}
