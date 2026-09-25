/**
 * Checkout building blocks — Figma "Checkout — Delivery" (77:279) and
 * "Checkout — Payment" (78:312).
 *
 * `CheckoutSteps` is the two-step indicator: a 26pt numbered circle per step
 * with a 40×2 connector. A completed step swaps its number for a check and its
 * connector goes brand.
 *
 * `OptionCard` is the selectable row used for addresses, delivery speeds and
 * payment methods: 24pt Radio, 38pt icon circle, then a copy column. Selection
 * is carried by a 1.5pt brand border, not by fill — the card must stay legible
 * as a surface whether or not it is chosen.
 *
 * `tint` is an explicit prop rather than being derived from `selected` because
 * Figma tints some unselected rows brand-subtle and others surface-raised. The
 * screen states which, so the code does not have to guess at a rule that the
 * design does not actually follow.
 */
import React from 'react';
import { View, Pressable } from 'react-native';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { Text } from './Text';
import { Icon, type IconName } from './Icon';
import { Radio } from './Form';
import { Badge } from './Badge';

export function SectionLabel({ children }: { children: string }) {
  const { d } = useDesignScale();
  return (
    <Text variant="labelXS" tone="tertiary" style={{ fontSize: d(11), lineHeight: d(14) }}>
      {children}
    </Text>
  );
}

export function CheckoutSteps({ step }: { step: 1 | 2 }) {
  const t = useTokens();
  const { d } = useDesignScale();

  const bubble = (index: 1 | 2, label: string) => {
    const done = step > index;
    const active = step === index;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(8) }}>
        <View
          style={{
            width: d(26),
            height: d(26),
            borderRadius: t.radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: done || active ? t.colors.bg.brand : t.colors.bg.surfaceRaised,
          }}
        >
          {done ? (
            <Icon name="check" size={d(14)} color={t.colors.icon.onBrand} />
          ) : (
            <Text
              variant="labelS"
              color={active ? t.colors.text.onBrand : t.colors.text.tertiary}
              style={{ fontSize: d(12), lineHeight: d(16) }}
            >
              {index}
            </Text>
          )}
        </View>
        <Text
          variant="labelM"
          tone={done || active ? 'primary' : 'tertiary'}
          style={{ fontSize: d(14), lineHeight: d(18) }}
        >
          {label}
        </Text>
      </View>
    );
  };

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Checkout step ${step} of 2`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: d(10), height: d(26) }}
    >
      {bubble(1, 'Delivery')}
      <View
        style={{
          width: d(40),
          height: d(2),
          borderRadius: d(2),
          backgroundColor: step > 1 ? t.colors.border.brand : t.colors.border.subtle,
        }}
      />
      {bubble(2, 'Payment')}
    </View>
  );
}

export function OptionCard({
  selected,
  disabled = false,
  icon,
  tint = 'raised',
  title,
  badge,
  subtitle,
  meta,
  metaTone = 'tertiary',
  onPress,
}: {
  selected: boolean;
  disabled?: boolean;
  icon: IconName;
  tint?: 'brand' | 'raised';
  title: string;
  badge?: string;
  subtitle: string;
  meta?: string;
  metaTone?: 'tertiary' | 'warning';
  onPress?: () => void;
}) {
  const t = useTokens();
  const { d } = useDesignScale();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={[title, subtitle, meta].filter(Boolean).join('. ')}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: d(14),
        padding: d(16),
        borderRadius: d(20),
        backgroundColor: t.colors.bg.surface,
        borderWidth: 1.5,
        borderColor: selected ? t.colors.border.brand : 'transparent',
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <Radio selected={selected} disabled={disabled} />

      <View
        style={{
          width: d(38),
          height: d(38),
          borderRadius: t.radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor:
            tint === 'brand' ? t.colors.bg.brandSubtle : t.colors.bg.surfaceRaised,
        }}
      >
        <Icon name={icon} size={d(18)} tone={disabled ? 'tertiary' : 'primary'} />
      </View>

      <View style={{ flex: 1, gap: d(4) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: d(8) }}>
          <Text
            variant="labelL"
            tone={disabled ? 'disabled' : 'primary'}
            style={{ flex: 1, fontSize: d(16), lineHeight: d(20) }}
          >
            {title}
          </Text>
          {badge ? <Badge label={badge} tone="brand" /> : null}
        </View>
        <Text
          variant="bodyS"
          tone={disabled ? 'disabled' : 'secondary'}
          style={{ fontSize: d(13), lineHeight: d(19) }}
        >
          {subtitle}
        </Text>
        {meta ? (
          <Text
            variant="caption"
            tone={disabled && metaTone !== 'warning' ? 'disabled' : metaTone}
            style={{ fontSize: d(12), lineHeight: d(16) }}
          >
            {meta}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/** The Total + action bar shared by Cart, Delivery and Product Detail. */
export function CheckoutFooter({ children }: { children: React.ReactNode }) {
  const t = useTokens();
  const { d } = useDesignScale();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: d(14),
        backgroundColor: t.colors.bg.surface,
        paddingTop: d(16),
        paddingHorizontal: d(24),
      }}
    >
      {children}
    </View>
  );
}
