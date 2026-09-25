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


export default function PaymentMethods() {
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
    meta: m.expires ? `Expires ${m.expires}` : profile.name,
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
      <TitleAppBar title="Payment methods" />

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
              {m.isDefault ? <Badge label="Default" tone="brand" /> : null}
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
                Remove {m.name}?
              </Text>
              <View style={{ flexDirection: 'row', gap: d(10) }}>
                {chip('trash', busy === m.id ? 'Removing…' : 'Yes, remove', true, () =>
                  run(m.id, async () => {
                    await deleteMethod(m.id);
                    setConfirming(null);
                  }),
                )}
                {chip('close', 'Keep it', false, () => setConfirming(null))}
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: d(10) }}>
              {m.isDefault
                ? null
                : chip('check', busy === m.id ? 'Saving…' : 'Make default', false, () =>
                    run(m.id, () => makeDefaultMethod(m.id)),
                  )}
              {chip('trash', 'Remove', true, () => setConfirming(m.id))}
            </View>
          )}
        </View>
      ))}

      {METHODS.length === 0 ? (
        <Text variant="bodyM" tone="tertiary" style={{ fontSize: d(14), lineHeight: d(21) }}>
          No saved methods yet.
        </Text>
      ) : null}

      <Button
        label="Add a payment method"
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
            Your PIN stays with you
          </Text>
          <Text variant="bodyS" tone="secondary" style={{ fontSize: d(13), lineHeight: d(19) }}>
            You approve each payment on your phone. Altruist never sees your MoMo PIN.
          </Text>
        </View>
      </View>
    </FormScreen>
  );
}
