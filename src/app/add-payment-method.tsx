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

/** Groups of four, masked except the last group. */
function maskCard(raw: string) {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '•••• •••• •••• ••••';
  const last = digits.slice(-4);
  return `•••• •••• •••• ${last.padEnd(4, '•')}`;
}

type Kind = 'momo' | 'card';

export default function AddPaymentMethod() {
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
      setWalletError('Enter a 10-digit Ghana mobile number, like 024 400 1188.');
      return;
    }
    if (!provider) {
      setError('Choose the network this number is on.');
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
        <TitleAppBar title="Add payment method" />

        <View
          accessibilityRole="tablist"
          style={{
            flexDirection: 'row',
            padding: d(4),
            borderRadius: t.radius.full,
            backgroundColor: t.colors.bg.surfaceRaised,
          }}
        >
          {segment('momo', 'Mobile Money')}
          {segment('card', 'Card')}
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
                  {provider ? providerName(provider) : 'Mobile money'}
                </Text>
              </View>
              <Text variant="numericL" color={ink} style={{ fontSize: d(28), lineHeight: d(32) }}>
                {walletDigits ? formatGhanaMobile(walletDigits) : '0•• ••• ••••'}
              </Text>
            </View>

            <InputField
              label="Wallet number"
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
                Network
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
              New card
            </Text>
          </View>

          <Text variant="numericL" color={ink} style={{ fontSize: d(28), lineHeight: d(32) }}>
            {maskCard(number)}
          </Text>

          <View style={{ flexDirection: 'row', gap: d(24) }}>
            {previewMeta('CARDHOLDER', holder ? holder.toUpperCase() : '—')}
            {previewMeta('EXPIRES', expiry || '—')}
          </View>
        </View>

        <InputField
          label="Card number"
          value={number}
          onChangeText={setNumber}
          placeholder="5399 8300 0000 4471"
          keyboardType="number-pad"
          autoComplete="cc-number"
          maxLength={19}
        />
        <InputField
          label="Cardholder name"
          value={holder}
          onChangeText={setHolder}
          placeholder="Name on card"
          autoComplete="cc-name"
        />

        <View style={{ flexDirection: 'row', gap: d(12) }}>
          <View style={{ flex: 1 }}>
            <InputField
              label="Expiry"
              value={expiry}
              onChangeText={setExpiry}
              placeholder="09 / 29"
              keyboardType="number-pad"
              maxLength={7}
            />
          </View>
          <View style={{ flex: 1 }}>
            <InputField
              label="CVV"
              value={cvv}
              onChangeText={setCvv}
              placeholder="•••"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
            />
          </View>
        </View>
          </>
        ) : null}

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isDefault }}
          accessibilityLabel="Use as my default payment method"
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
            Use as my default payment method
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
              {kind === 'momo' ? 'Your PIN stays with you' : 'Altruist never stores your card'}
            </Text>
            <Text variant="bodyS" tone="secondary" style={{ fontSize: d(13), lineHeight: d(19) }}>
              {kind === 'momo'
                ? 'You approve each payment on your phone.'
                : 'We only keep the last four digits.'}
            </Text>
          </View>
        </View>

        {error ? <FormMessage>{error}</FormMessage> : null}
      </FormScreen>

      <StickyFooter>
        {kind === 'momo' ? (
          <Button
            label="Save wallet"
            size="large"
            iconLeading="wallet"
            loading={saving}
            disabled={saving || !wallet.trim()}
            onPress={saveWallet}
          />
        ) : (
          <Button
            label="Save card"
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
