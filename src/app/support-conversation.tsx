/**
 * Support Conversation — ported 1:1 from Figma node on page "Support &
 * Disputes".
 *
 * A bg/surface header (pad 60/24/14/24) with back, a 32pt avatar, the name and
 * reply time, and a mint call button; an order-context strip; the thread
 * (V gap12, bubbles max 262 wide with a squared corner on the sender's side);
 * and a composer (bg/surface, pad 14/24/44/24).
 *
 * The order-context strip stays pinned above the thread because almost every
 * message here is about one order, and a pharmacist answering a dosage question
 * needs to know which dispensing record is being discussed.
 */
import React, { useState } from 'react';
import { View, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { useProfile, usePartnerPharmacy } from '@/features/profile/store';
import { firstName, initialsOf } from '@/lib/profile';
import { fixtureMessages, messageTime, type Message } from '@/lib/support';
import { Linking } from 'react-native';



export default function SupportConversation() {
  const t = useTokens();
  const { d } = useDesignScale();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');
  const profile = useProfile();
  const pharmacy = usePartnerPharmacy();
  const [messages, setMessages] = useState<Message[]>(() => fixtureMessages(firstName(profile.name)));

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((m) => [
      ...m,
      { id: String(m.length + 1), from: 'you' as const, text, at: Date.now() },
    ]);
    setDraft('');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.colors.bg.canvas }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: d(12),
          backgroundColor: t.colors.bg.surface,
          paddingTop: insets.top + d(14),
          paddingHorizontal: d(24),
          paddingBottom: d(14),
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: d(40),
            height: d(40),
            borderRadius: t.radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: t.colors.bg.surfaceRaised,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Icon name="arrow-left" size={d(18)} tone="primary" />
        </Pressable>

        <Avatar initials={initialsOf(pharmacy.name)} size={32} label={pharmacy.name} />

        <View style={{ flex: 1, gap: d(2) }}>
          <Text variant="labelM" style={{ fontSize: d(14), lineHeight: d(18) }}>
            {pharmacy.name}
          </Text>
          <Text variant="caption" tone="brand" style={{ fontSize: d(12), lineHeight: d(16) }}>
            {pharmacy.superintendent.short} · usually replies in 10 min
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Call the pharmacy"
          onPress={() => Linking.openURL(`tel:${pharmacy.phone.replace(/\s+/g, '')}`)}
          style={({ pressed }) => ({
            width: d(40),
            height: d(40),
            borderRadius: t.radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: t.colors.bg.brand,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Icon name="call" size={d(18)} color={t.colors.icon.onBrand} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: d(12), padding: d(24) }}
      >
        {/* Order context */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="About order CJ4901TUZ0. Amoxicillin 500mg, delivered 23 August."
          onPress={() => router.push('/order-tracking')}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: d(12),
            paddingVertical: d(11),
            paddingHorizontal: d(14),
            borderRadius: d(18),
            backgroundColor: t.colors.bg.surfaceRaised,
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <Icon name="prescription" size={d(18)} tone="primary" />
          <View style={{ flex: 1, gap: d(2) }}>
            <Text variant="labelS" style={{ fontSize: d(12), lineHeight: d(16) }}>
              About order CJ4901TUZ0
            </Text>
            <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
              Amoxicillin 500mg · delivered 23 Aug
            </Text>
          </View>
          <Icon name="chevron-right" size={d(16)} tone="tertiary" />
        </Pressable>

        {messages.map((m) => {
          const mine = m.from === 'you';
          return (
            <View key={m.id} style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
              <View
                accessibilityRole="text"
                accessibilityLabel={`${mine ? 'You' : pharmacy.name}: ${m.text}. ${messageTime(m.at)}`}
                style={{
                  maxWidth: d(262),
                  gap: d(6),
                  paddingVertical: d(11),
                  paddingHorizontal: d(14),
                  borderRadius: d(20),
                  borderBottomRightRadius: mine ? d(6) : d(20),
                  borderBottomLeftRadius: mine ? d(20) : d(6),
                  backgroundColor: mine ? t.colors.bg.brand : t.colors.bg.surface,
                }}
              >
                <Text
                  variant="bodyM"
                  color={mine ? t.colors.text.onBrand : t.colors.text.primary}
                  style={{ fontSize: d(14), lineHeight: d(21) }}
                >
                  {m.text}
                </Text>
                <Text
                  variant="caption"
                  color={mine ? t.colors.text.onBrand : t.colors.text.tertiary}
                  style={{ textAlign: 'right', fontSize: d(12), lineHeight: d(16) }}
                >
                  {messageTime(m.at)}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Composer */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: d(10),
          backgroundColor: t.colors.bg.surface,
          paddingTop: d(14),
          paddingHorizontal: d(24),
          paddingBottom: Math.max(insets.bottom, d(20)) + d(24),
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Attach a photo"
          // The camera flow already exists for prescriptions; a photo of a
          // label or a damaged box is the same capture, so it reuses it.
          onPress={() => router.push('/prescription-upload')}
          style={({ pressed }) => ({
            width: d(46),
            height: d(46),
            borderRadius: t.radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: t.colors.bg.surfaceRaised,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Icon name="camera" size={d(19)} tone="primary" />
        </Pressable>

        <View
          style={{
            flex: 1,
            height: d(46),
            justifyContent: 'center',
            paddingHorizontal: d(16),
            borderRadius: t.radius.full,
            backgroundColor: t.colors.bg.surfaceRaised,
          }}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Write a message"
            placeholderTextColor={t.colors.text.tertiary}
            accessibilityLabel="Write a message"
            onSubmitEditing={send}
            returnKeyType="send"
            style={{
              padding: 0,
              fontFamily: t.typography.bodyM.fontFamily,
              fontSize: d(14),
              lineHeight: d(21),
              color: t.colors.text.primary,
            }}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: !draft.trim() }}
          disabled={!draft.trim()}
          onPress={send}
          style={({ pressed }) => ({
            width: d(46),
            height: d(46),
            borderRadius: t.radius.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: t.colors.bg.brand,
            opacity: !draft.trim() ? 0.5 : pressed ? 0.85 : 1,
          })}
        >
          <Icon name="send" size={d(19)} color={t.colors.icon.onBrand} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
