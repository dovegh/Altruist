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


export default function ReportProblem() {
  const t = useTokens();
  const { d } = useDesignScale();
  // The order most likely being complained about. Tapping the strip opens the
  // history so a different one can be picked.
  const order = useOrderStore((st) => st.items.find((o) => o.id === st.lastOrderId) ?? st.items[0]);
  const placed = order
    ? new Date(order.placedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : '';
  const [problem, setProblem] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<number[]>([1, 2]);

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}>
      <FormScreen gap={16}>
        <TitleAppBar title="Report a problem" />

        <SectionLabel>WHAT WENT WRONG?</SectionLabel>

        {PROBLEMS.map((p) => {
          const selected = problem === p.id;
          return (
            <Pressable
              key={p.id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${p.title}. ${p.meta}`}
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
                  {p.title}
                </Text>
                <Text
                  variant="caption"
                  tone="tertiary"
                  style={{ fontSize: d(12), lineHeight: d(16) }}
                >
                  {p.meta}
                </Text>
              </View>
            </Pressable>
          );
        })}

        <SectionLabel>WHICH ORDER?</SectionLabel>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            order
              ? `Order ${order.id}, ${placed}, ${order.pharmacy}, ${cedis(order.total)}. Change order.`
              : 'Choose an order'
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
              {order ? `${order.id} · ${placed}` : 'Choose an order'}
            </Text>
            <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
              {order ? `${order.pharmacy} · ${cedis(order.total)}` : 'No orders on this device yet'}
            </Text>
          </View>
          <Icon name="chevron-right" size={d(18)} tone="tertiary" />
        </Pressable>

        <InputField
          label="Tell us what happened"
          helper="The pharmacy sees this message and can respond directly."
          value={description}
          onChangeText={setDescription}
          placeholder="I ordered Amoxicillin 500mg but received 250mg."
          multiline
        />

        <SectionLabel>ADD PHOTOS (OPTIONAL)</SectionLabel>

        <View style={{ flexDirection: 'row', gap: d(10) }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add a photo"
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
              accessibilityLabel={`Attached photo ${p}`}
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
            We will send this to the pharmacy or our team, depending on the problem.
          </Text>
        </View>
      </FormScreen>

      <StickyFooter>
        <Button
          label="Send report"
          size="large"
          disabled={!problem || description.trim().length === 0}
          onPress={() => router.replace('/support-conversation')}
        />
      </StickyFooter>
    </View>
  );
}
