/**
 * Add Payment Method — ported 1:1 from Figma node 171:286.
 *
 * Scroll content: V gap16, pad 64/24/140/24. A mint card preview (r26, pad 22,
 * V gap22) that mirrors what has been typed, the four fields, a default
 * checkbox, and the tokenisation notice. Footer pins Save card.
 *
 * The preview masks everything but the last four digits as you type. The comp
 * shows a full number in the fields because it is a static mock; here the
 * number never leaves the field it was typed into — the preview reads from a
 * masked derivation, not from the raw value.
 *
 * Mobile Money comes first — it is how most people pay in Ghana — and saves to
 * the account (payment_methods), so the wallet is there on any phone. The
 * network is read from the number's prefix and can be changed, because numbers
 * move between networks. Cards still stay on this phone until Paystack
 * tokenises them; the database does not accept a card from the app.
 */
import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen, StickyFooter } from '@/components/ui/FormScreen';
import { TitleAppBar } from '@/components/ui/AppBar';
import { InputField } from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Form';
import { Button } from '@/components/ui/Button';
import { cardBrand, useWalletStore } from '@/features/checkout/store';
import { saveMomoWallet } from '@/features/checkout/methods';
import { useProfile } from '@/features/profile/store';
import { FormMessage, describeFailure } from '@/components/ui/FormMessage';
import {
  MOMO_PROVIDERS,
  detectProvider,
  formatGhanaMobile,
  normalizeGhanaMobile,
  providerName,
  type MomoProvider,
} from '@/lib/momo';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { NetworkBadge } from '@/components/NetworkBadge';
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    walletError: 'Enter a 10-digit Ghana mobile number, like 024 400 1188.',
    chooseNetwork: 'Choose the network this number is on.',
    title: 'Add payment method',
    segMomo: 'Mobile Money',
    segCard: 'Card',
    mobileMoney: 'Mobile money',
    walletNumber: 'Wallet number',
    network: 'Network',
    newCard: 'New card',
    cardholderCaps: 'CARDHOLDER',
    expiresCaps: 'EXPIRES',
    cardNumber: 'Card number',
    cardholderName: 'Cardholder name',
    nameOnCard: 'Name on card',
    expiry: 'Expiry',
    cvv: 'CVV',
    useDefault: 'Use as my default payment method',
    pinTitle: 'Your PIN stays with you',
    cardTitle: 'Altruist never stores your card',
    pinBody: 'You approve each payment on your phone.',
    cardBody: 'We only keep the last four digits.',
    saveWallet: 'Save wallet',
    saveCard: 'Save card',
  },
  fr: {
    walletError: 'Saisissez un numéro mobile ghanéen à 10 chiffres, par exemple 024 400 1188.',
    chooseNetwork: 'Choisissez le réseau de ce numéro.',
    title: 'Ajouter un moyen de paiement',
    segMomo: 'Mobile Money',
    segCard: 'Carte',
    mobileMoney: 'Mobile Money',
    walletNumber: 'Numéro du portefeuille',
    network: 'Réseau',
    newCard: 'Nouvelle carte',
    cardholderCaps: 'TITULAIRE',
    expiresCaps: 'EXPIRE',
    cardNumber: 'Numéro de carte',
    cardholderName: 'Nom du titulaire',
    nameOnCard: 'Nom sur la carte',
    expiry: 'Expiration',
    cvv: 'CVV',
    useDefault: 'Utiliser comme moyen de paiement par défaut',
    pinTitle: 'Votre PIN reste avec vous',
    cardTitle: 'Altruist ne conserve jamais votre carte',
    pinBody: 'Vous validez chaque paiement sur votre téléphone.',
    cardBody: 'Nous ne gardons que les quatre derniers chiffres.',
    saveWallet: 'Enregistrer le portefeuille',
    saveCard: 'Enregistrer la carte',
  },
  tw: {
    walletError: 'Hyɛ Ghana fon nɔma a ɛyɛ nɔma 10, te sɛ 024 400 1188.',
    chooseNetwork: 'Paw network a saa nɔma yi wɔ so.',
    title: 'Fa ɛkwan a wode tua ka ka ho',
    segMomo: 'Mobile Money',
    segCard: 'Kaad',
    mobileMoney: 'Mobile money',
    walletNumber: 'Wallet nɔma',
    network: 'Network',
    newCard: 'Kaad foforɔ',
    cardholderCaps: 'KAAD WURA',
    expiresCaps: 'ƐBƐBA AWIEƐ',
    cardNumber: 'Kaad nɔma',
    cardholderName: 'Kaad wura din',
    nameOnCard: 'Din a ɛwɔ kaad no so',
    expiry: 'Ne awieeɛ',
    cvv: 'CVV',
    useDefault: 'Fa yei di kan bere biara a mɛtua ka',
    pinTitle: 'Wo PIN tena wo nkyɛn',
    cardTitle: 'Altruist nkora wo kaad da',
    pinBody: 'Wo ara na wopene sika tua biara so wɔ wo fon so.',
    cardBody: 'Nɔma anan a ɛtwa toɔ nko ara na yɛkora.',
    saveWallet: 'Kora wallet',
    saveCard: 'Kora kaad',
  },
  gaa: {
    walletError: 'Ŋma Ghana fon namba ni yɔɔ namba 10, tamɔ 024 400 1188.',
    chooseNetwork: 'Hala network ni namba nɛɛ yɔɔ nɔ.',
    title: 'Kɛ nyɔmɔwoo gbɛ fata he',
    segMomo: 'Mobile Money',
    segCard: 'Kaad',
    mobileMoney: 'Mobile money',
    walletNumber: 'Wallet namba',
    network: 'Network',
    newCard: 'Kaad hee',
    cardholderCaps: 'KAAD NÕ',
    expiresCaps: 'EBAA NAAGBEE',
    cardNumber: 'Kaad namba',
    cardholderName: 'Kaad nõ gbɛi',
    nameOnCard: 'Gbɛi ni yɔɔ kaad lɛ nɔ',
    expiry: 'Naagbee',
    cvv: 'CVV',
    useDefault: 'Kɛ enɛ afee mi klɛŋklɛŋ nyɔmɔwoo gbɛ',
    pinTitle: 'O PIN hiɔ o ŋɔɔ',
    cardTitle: 'Altruist toooo o kaad kɔkɔɔkɔ',
    pinBody: 'Bo diɛŋtsɛ okpɛlɛɔ nyɔmɔwoo fɛɛ nɔ yɛ o fon nɔ.',
    cardBody: 'Namba ejwɛ ni sɛɛ pɛ wɔtoɔ.',
    saveWallet: 'Toɔ wallet',
    saveCard: 'Toɔ kaad',
  },
  ee: {
    walletError: 'Ŋlɔ Ghana fon nɔmba si me nɔmba 10 le, abe 024 400 1188 ene.',
    chooseNetwork: 'Tia network si dzi nɔmba sia le.',
    title: 'Tsɔ fexexemɔ kpe ɖe eŋu',
    segMomo: 'Mobile Money',
    segCard: 'Kaad',
    mobileMoney: 'Mobile money',
    walletNumber: 'Wallet nɔmba',
    network: 'Network',
    newCard: 'Kaad yeye',
    cardholderCaps: 'KAAD TƆ',
    expiresCaps: 'EWUA ENU',
    cardNumber: 'Kaad nɔmba',
    cardholderName: 'Kaad tɔ ƒe ŋkɔ',
    nameOnCard: 'Ŋkɔ si le kaad dzi',
    expiry: 'Nuwuwu',
    cvv: 'CVV',
    useDefault: 'Zãe abe nye fexexemɔ gbãtɔ ene',
    pinTitle: 'Wò PIN nɔa gbɔwò',
    cardTitle: 'Altruist medzraa wò kaad ɖo gbeɖe o',
    pinBody: 'Wò ŋutɔ èlɔ̃a ɖe fexexe ɖe sia ɖe dzi le wò fon dzi.',
    cardBody: 'Nɔmba ene mamlɛtɔwo ko míedzraa ɖo.',
    saveWallet: 'Dzra wallet ɖo',
    saveCard: 'Dzra kaad ɖo',
  },
  ha: {
    walletError: 'Shigar da lambar wayar Ghana mai lamba 10, kamar 024 400 1188.',
    chooseNetwork: 'Zaɓi network ɗin da wannan lambar take.',
    title: 'Ƙara hanyar biyan kuɗi',
    segMomo: 'Mobile Money',
    segCard: 'Kati',
    mobileMoney: 'Mobile money',
    walletNumber: 'Lambar wallet',
    network: 'Network',
    newCard: 'Sabon kati',
    cardholderCaps: 'MAI KATI',
    expiresCaps: 'ZAI ƘARE',
    cardNumber: 'Lambar kati',
    cardholderName: 'Sunan mai kati',
    nameOnCard: 'Sunan da ke kan kati',
    expiry: 'Ƙarewa',
    cvv: 'CVV',
    useDefault: 'Yi amfani da wannan a matsayin hanyar biyana ta farko',
    pinTitle: 'PIN ɗinka yana wurinka',
    cardTitle: 'Altruist ba ya ajiye katinka',
    pinBody: 'Kai ne ke amincewa da kowane biya a wayarka.',
    cardBody: 'Lambobi huɗu na ƙarshe kawai muke ajiyewa.',
    saveWallet: 'Ajiye wallet',
    saveCard: 'Ajiye kati',
  },
});

/** Groups of four, masked except the last group. */
function maskCard(raw: string) {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '•••• •••• •••• ••••';
  const last = digits.slice(-4);
  return `•••• •••• •••• ${last.padEnd(4, '•')}`;
}

type Kind = 'momo' | 'card';

export default function AddPaymentMethod() {
  const tr = useT(S);
  const t = useTokens();
  const { d } = useDesignScale();
  const profile = useProfile();
  const [kind, setKind] = useState<Kind>('momo');

  // --- Mobile money ---------------------------------------------------------
  const ownNumber = normalizeGhanaMobile(profile.phone);
  const [wallet, setWallet] = useState(ownNumber ? formatGhanaMobile(ownNumber) : '');
  // The network follows the number (first three digits) unless the person
  // picked one; derived, so an empty field never shows a stale network.
  const [chosen, setChosen] = useState<MomoProvider | null>(null);
  const provider = chosen ?? detectProvider(wallet);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | undefined>();
  const walletDigits = normalizeGhanaMobile(wallet);

  const onWalletChange = (text: string) => {
    setWallet(text);
    setWalletError(undefined);
  };

  const saveWallet = async () => {
    if (!walletDigits) {
      setWalletError(tr('walletError'));
      return;
    }
    if (!provider) {
      setError(tr('chooseNetwork'));
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await saveMomoWallet({ phone: walletDigits, provider }, isDefault);
      router.back();
    } catch (e) {
      setError(describeFailure(e));
    } finally {
      setSaving(false);
    }
  };

  // --- Card -----------------------------------------------------------------
  const [number, setNumber] = useState('');
  const [holder, setHolder] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [isDefault, setIsDefault] = useState(true);
  const addCard = useWalletStore((s) => s.addCard);

  // Enough to build the summary Paystack would return. The number and CVV are
  // never stored — `addCard` keeps only brand, last four and expiry.
  const digits = number.replace(/\D/g, '');
  const canSave = digits.length >= 13 && expiry.trim().length >= 4 && cvv.trim().length >= 3;

  const save = () => {
    addCard({ number: digits, holder: holder.trim(), expiry: expiry.trim() }, isDefault);
    router.back();
  };

  const ink = t.colors.text.onBrand;

  const segment = (value: Kind, label: string) => {
    const on = kind === value;
    return (
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: on }}
        onPress={() => {
          setKind(value);
          setError(null);
        }}
        style={{
          flex: 1,
          height: d(40),
          borderRadius: t.radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: on ? t.colors.bg.brand : 'transparent',
        }}
      >
        <Text
          variant="labelM"
          color={on ? t.colors.text.onBrand : t.colors.text.secondary}
          style={{ fontSize: d(14), lineHeight: d(18) }}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  const networkChip = (id: MomoProvider, label: string) => {
    const on = provider === id;
    return (
      <Pressable
        key={id}
        accessibilityRole="radio"
        accessibilityState={{ selected: on }}
        accessibilityLabel={label}
        onPress={() => {
          setChosen(id);
          setError(null);
        }}
        style={({ pressed }) => ({
          flex: 1,
          minHeight: d(48),
          paddingHorizontal: d(8),
          borderRadius: d(16),
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: on ? 2 : 1,
          borderColor: on ? t.colors.border.brand : t.colors.border.default,
          backgroundColor: on ? t.colors.bg.brandSubtle : t.colors.bg.surface,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <View style={{ alignItems: 'center', gap: d(6), paddingVertical: d(10) }}>
          <NetworkBadge provider={id} size={32} />
          <Text variant="labelS" center style={{ fontSize: d(12), lineHeight: d(16) }}>
            {label}
          </Text>
        </View>
      </Pressable>
    );
  };

  const previewMeta = (label: string, value: string) => (
    <View style={{ gap: d(3) }}>
      <Text
        variant="labelXS"
        color={ink}
        style={{ opacity: 0.6, fontSize: d(11), lineHeight: d(14) }}
      >
        {label}
      </Text>
      <Text variant="labelM" color={ink} style={{ fontSize: d(14), lineHeight: d(18) }}>
        {value}
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      <FormScreen gap={16}>
        <TitleAppBar title={tr('title')} />

        <View
          accessibilityRole="tablist"
          style={{
            flexDirection: 'row',
            padding: d(4),
            borderRadius: t.radius.full,
            backgroundColor: t.colors.bg.surfaceRaised,
          }}
        >
          {segment('momo', tr('segMomo'))}
          {segment('card', tr('segCard'))}
        </View>

        {kind === 'momo' ? (
          <>
            {/* Wallet preview — the same mint card as the card preview */}
            <View
              style={{
                gap: d(22),
                padding: d(22),
                borderRadius: d(26),
                backgroundColor: t.colors.bg.brand,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(10) }}>
                {provider ? (
                  <NetworkBadge provider={provider} size={36} />
                ) : (
                  <Icon name="wallet" size={d(24)} color={ink} />
                )}
                <Text
                  variant="labelM"
                  color={ink}
                  style={{ flex: 1, opacity: 0.8, fontSize: d(14), lineHeight: d(18) }}
                >
                  {provider ? providerName(provider) : tr('mobileMoney')}
                </Text>
              </View>
              <Text variant="numericL" color={ink} style={{ fontSize: d(28), lineHeight: d(32) }}>
                {walletDigits ? formatGhanaMobile(walletDigits) : '0•• ••• ••••'}
              </Text>
            </View>

            <InputField
              label={tr('walletNumber')}
              value={wallet}
              onChangeText={onWalletChange}
              placeholder="024 400 1188"
              keyboardType="phone-pad"
              autoComplete="tel"
              maxLength={16}
              error={walletError}
              leading={provider ? <NetworkBadge provider={provider} size={28} /> : undefined}
            />

            <View style={{ gap: d(8) }}>
              <Text variant="labelM" tone="secondary" style={{ fontSize: d(14), lineHeight: d(18) }}>
                {tr('network')}
              </Text>
              <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: d(8) }}>
                {MOMO_PROVIDERS.map((p) => networkChip(p.id, p.name))}
              </View>
            </View>
          </>
        ) : null}

        {kind === 'card' ? (
          <>
        {/* Card preview — mint, r26, pad 22, gap 22 */}
        <View
          style={{
            gap: d(22),
            padding: d(22),
            borderRadius: d(26),
            backgroundColor: t.colors.bg.brand,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(10) }}>
            <Icon name="card" size={d(24)} color={ink} />
            <Text
              variant="labelM"
              color={ink}
              style={{ flex: 1, opacity: 0.8, fontSize: d(14), lineHeight: d(18) }}
            >
              {tr('newCard')}
            </Text>
          </View>

          <Text variant="numericL" color={ink} style={{ fontSize: d(28), lineHeight: d(32) }}>
            {maskCard(number)}
          </Text>

          <View style={{ flexDirection: 'row', gap: d(24) }}>
            {previewMeta(tr('cardholderCaps'), holder ? holder.toUpperCase() : '—')}
            {previewMeta(tr('expiresCaps'), expiry || '—')}
          </View>
        </View>

        <InputField
          label={tr('cardNumber')}
          value={number}
          onChangeText={setNumber}
          placeholder="5399 8300 0000 4471"
          keyboardType="number-pad"
          autoComplete="cc-number"
          maxLength={19}
        />
        <InputField
          label={tr('cardholderName')}
          value={holder}
          onChangeText={setHolder}
          placeholder={tr('nameOnCard')}
          autoComplete="cc-name"
        />

        <View style={{ flexDirection: 'row', gap: d(12) }}>
          <View style={{ flex: 1 }}>
            <InputField
              label={tr('expiry')}
              value={expiry}
              onChangeText={setExpiry}
              placeholder="09 / 29"
              keyboardType="number-pad"
              maxLength={7}
            />
          </View>
          <View style={{ flex: 1 }}>
            <InputField
              label={tr('cvv')}
              value={cvv}
              onChangeText={setCvv}
              placeholder="•••"
              keyboardType="number-pad"
              secureTextEntry
              revealable={false}
              maxLength={4}
            />
          </View>
        </View>
          </>
        ) : null}

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isDefault }}
          accessibilityLabel={tr('useDefault')}
          onPress={() => setIsDefault((v) => !v)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: d(12),
            paddingVertical: d(14),
            paddingHorizontal: d(16),
            borderRadius: d(18),
            backgroundColor: t.colors.bg.surface,
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <Checkbox checked={isDefault} />
          <Text variant="bodyM" style={{ flex: 1, fontSize: d(14), lineHeight: d(21) }}>
            {tr('useDefault')}
          </Text>
        </Pressable>

        <View
          style={{
            flexDirection: 'row',
            gap: d(12),
            paddingVertical: d(14),
            paddingHorizontal: d(16),
            borderRadius: d(20),
            backgroundColor: t.colors.bg.successSubtle,
          }}
        >
          <Icon name="shield-check" size={d(20)} tone="brand" />
          <View style={{ flex: 1, gap: d(4) }}>
            <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
              {kind === 'momo' ? tr('pinTitle') : tr('cardTitle')}
            </Text>
            <Text variant="bodyS" tone="secondary" style={{ fontSize: d(13), lineHeight: d(19) }}>
              {kind === 'momo' ? tr('pinBody') : tr('cardBody')}
            </Text>
          </View>
        </View>

        {error ? <FormMessage>{error}</FormMessage> : null}
      </FormScreen>

      <StickyFooter>
        {kind === 'momo' ? (
          <Button
            label={tr('saveWallet')}
            size="large"
            iconLeading="wallet"
            loading={saving}
            disabled={saving || !wallet.trim()}
            onPress={saveWallet}
          />
        ) : (
          <Button
            label={tr('saveCard')}
            size="large"
            iconLeading="shield-check"
            disabled={!canSave}
            onPress={save}
          />
        )}
      </StickyFooter>
    </View>
  );
}
