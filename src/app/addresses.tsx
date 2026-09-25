/**
 * Address Book — ported 1:1 from Figma node 72:3.
 *
 * Scroll content: V gap16, pad 64/24/60/24. One card per address (r24, pad
 * 16/18, gap 10): a head row with a 36pt brand-subtle pin, the label, and a
 * Default badge; the address; an optional note; then Edit / Delete chips
 * (32pt, r999, bg/surface-raised).
 *
 * Delete is coral-on-raised rather than a Danger button — it is one of several
 * row actions, not the screen's purpose, and a full red button per card would
 * make a list of saved addresses read like a list of warnings.
 *
 * Delete asks first. An address is three lines of typing to recreate and the
 * chip sits next to Edit, so a mis-tap that silently destroyed one would be a
 * bad trade for the tap it saves.
 */
import React, { useState } from 'react';
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
import { FormMessage, describeFailure } from '@/components/ui/FormMessage';
import { useAddresses, useWalletStore } from '@/features/checkout/store';
import { makeDefaultAddress, removeAddress } from '@/features/profile/addresses';

export default function Addresses() {
  const t = useTokens();
  const { d } = useDesignScale();

  const addresses = useAddresses();
  const defaultId = useWalletStore((s) => s.defaultAddressId);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Runs one server write for one card, with that card marked busy. */
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

  const chip = (icon: IconName, label: string, danger = false, onPress?: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={busy !== null}
      onPress={onPress}
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
      // 32pt visual, padded out to the 44pt minimum tap target.
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
    >
      <Icon
        name={icon}
        size={d(15)}
        color={danger ? t.colors.text.danger : t.colors.icon.secondary}
      />
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
      <TitleAppBar title="Delivery addresses" />

      {error ? <FormMessage>{error}</FormMessage> : null}

      {addresses.map((a) => {
        const isDefault = a.id === defaultId;
        return (
          <View
            key={a.id}
            style={{
              gap: d(10),
              paddingVertical: d(16),
              paddingHorizontal: d(18),
              borderRadius: d(24),
              backgroundColor: t.colors.bg.surface,
              borderWidth: t.size.border.medium,
              borderColor: isDefault ? t.colors.border.brand : 'transparent',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(10) }}>
              <View
                style={{
                  width: d(36),
                  height: d(36),
                  borderRadius: t.radius.full,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: t.colors.bg.brandSubtle,
                }}
              >
                <Icon name="location" size={d(18)} tone="brand" />
              </View>
              <Text variant="labelL" style={{ flex: 1, fontSize: d(16), lineHeight: d(20) }}>
                {a.title}
              </Text>
              {isDefault ? <Badge label="Default" tone="brand" /> : null}
            </View>

            <Text variant="bodyM" tone="secondary" style={{ fontSize: d(14), lineHeight: d(21) }}>
              {a.subtitle}
            </Text>

            {a.meta ? (
              <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
                {a.meta}
              </Text>
            ) : null}

            {confirming === a.id ? (
              <View style={{ gap: d(10) }}>
                <Text variant="labelM" tone="danger" style={{ fontSize: d(14), lineHeight: d(18) }}>
                  Delete “{a.title}”?
                </Text>
                <View style={{ flexDirection: 'row', gap: d(10) }}>
                  {chip('trash', busy === a.id ? 'Deleting…' : 'Yes, delete', true, () =>
                    run(a.id, async () => {
                      await removeAddress(a.id);
                      setConfirming(null);
                    }),
                  )}
                  {chip('close', 'Keep it', false, () => setConfirming(null))}
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: d(10) }}>
                {chip('edit', 'Edit', false, () => router.push(`/add-address?id=${a.id}`))}
                {chip('trash', 'Delete', true, () => setConfirming(a.id))}
                {isDefault
                  ? null
                  : chip('check', busy === a.id ? 'Saving…' : 'Make default', false, () =>
                      run(a.id, () => makeDefaultAddress(a.id)),
                    )}
              </View>
            )}
          </View>
        );
      })}

      {addresses.length === 0 ? (
        <Text variant="bodyM" tone="tertiary" style={{ fontSize: d(14), lineHeight: d(21) }}>
          No saved addresses yet. Add one and it becomes your default.
        </Text>
      ) : null}

      <Button
        label="Add a new address"
        variant="secondary"
        size="large"
        iconLeading="add"
        onPress={() => router.push('/add-address')}
      />
    </FormScreen>
  );
}
