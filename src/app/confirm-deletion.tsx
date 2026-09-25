/**
 * Confirm Deletion — ported 1:1 from Figma node 91:277.
 *
 * Scroll content: V gap16, pad 64/24/150/24. An optional reason (five radio
 * rows, r18, pad 14/16), the password field, a "type DELETE" field, and a coral
 * acknowledgement checkbox. Footer: Danger action + the 30-day line.
 *
 * The destructive button stays disabled until all three gates are satisfied —
 * password entered, the word DELETE typed exactly, and the acknowledgement
 * ticked. Figma draws the satisfied state; the gating is what makes that state
 * mean something.
 */
import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen, StickyFooter } from '@/components/ui/FormScreen';
import { TitleAppBar } from '@/components/ui/AppBar';
import { InputField } from '@/components/ui/Input';
import { Radio, Checkbox } from '@/components/ui/Form';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { DELETION_REASONS as REASONS } from '@/lib/forms';


const CONFIRM_WORD = 'DELETE';

export default function ConfirmDeletion() {
  const t = useTokens();
  const { d } = useDesignScale();
  const [reason, setReason] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [typed, setTyped] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);

  const canDelete =
    password.length > 0 && typed.trim() === CONFIRM_WORD && acknowledged;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      <FormScreen gap={16}>
        <TitleAppBar title="Confirm deletion" />

        <Text variant="headingXL" style={{ fontSize: d(24), lineHeight: d(30) }}>
          Why are you leaving?
        </Text>
        <Text variant="bodyM" tone="secondary" style={{ fontSize: d(14), lineHeight: d(21) }}>
          Optional, but it helps us fix what went wrong.
        </Text>

        {REASONS.map((r) => {
          const selected = reason === r;
          return (
            <Pressable
              key={r}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={r}
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
                {r}
              </Text>
            </Pressable>
          );
        })}

        <InputField
          label="Confirm your password"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••••"
          secureTextEntry
          autoComplete="password"
        />

        <InputField
          label={`Type ${CONFIRM_WORD} to confirm`}
          value={typed}
          onChangeText={setTyped}
          placeholder={CONFIRM_WORD}
          autoCapitalize="characters"
          autoCorrect={false}
        />

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: acknowledged }}
          accessibilityLabel="I understand my order history and prescription images will be permanently deleted, and that my partner pharmacy keeps its own dispensing record."
          onPress={() => setAcknowledged((v) => !v)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            gap: d(12),
            paddingVertical: d(14),
            paddingHorizontal: d(16),
            borderRadius: d(20),
            backgroundColor: t.colors.bg.dangerSubtle,
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <Checkbox checked={acknowledged} />
          <Text variant="bodyS" style={{ flex: 1, fontSize: d(13), lineHeight: d(19) }}>
            I understand my order history and prescription images will be permanently deleted, and
            that my partner pharmacy keeps its own dispensing record.
          </Text>
        </Pressable>
      </FormScreen>

      <StickyFooter>
        <Button
          label="Delete my account"
          variant="danger"
          size="large"
          iconLeading="trash"
          disabled={!canDelete}
          onPress={() => router.replace('/deletion-scheduled')}
        />
        <Text variant="caption" tone="tertiary" center style={{ fontSize: d(12), lineHeight: d(16) }}>
          You have 30 days to change your mind.
        </Text>
      </StickyFooter>
    </View>
  );
}
