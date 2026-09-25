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
import { defineStrings, useLocale, useT } from '@/i18n';

const S = defineStrings({
  en: {
    goBack: 'Go back',
    replies: '{name} · usually replies in 10 min',
    call: 'Call the pharmacy',
    orderA11y: 'About order {id}. {item}, delivered {date}.',
    aboutOrder: 'About order {id}',
    orderMeta: '{item} · delivered {date}',
    bubbleA11y: '{who}: {text}. {time}',
    you: 'You',
    attach: 'Attach a photo',
    placeholder: 'Write a message',
    send: 'Send message',
  },
  fr: {
    goBack: 'Retour',
    replies: '{name} · répond généralement en 10 min',
    call: 'Appeler la pharmacie',
    orderA11y: 'À propos de la commande {id}. {item}, livrée le {date}.',
    aboutOrder: 'À propos de la commande {id}',
    orderMeta: '{item} · livrée le {date}',
    bubbleA11y: '{who} : {text}. {time}',
    you: 'Vous',
    attach: 'Joindre une photo',
    placeholder: 'Écrire un message',
    send: 'Envoyer le message',
  },
  tw: {
    goBack: 'San kɔ akyi',
    replies: '{name} · taa bua wɔ simma 10 mu',
    call: 'Frɛ nnuro adetɔnfoɔ no',
    orderA11y: 'Ɛfa oda {id} ho. {item}, wɔde baa {date}.',
    aboutOrder: 'Ɛfa oda {id} ho',
    orderMeta: '{item} · wɔde baa {date}',
    bubbleA11y: '{who}: {text}. {time}',
    you: 'Wo',
    attach: 'Fa mfonini ka ho',
    placeholder: 'Kyerɛw nkra',
    send: 'Fa nkra no kɔ',
  },
  gaa: {
    goBack: 'Ku sɛɛ',
    replies: '{name} · haa hetoo yɛ minitii 10 mli',
    call: 'Tswa tsofa hejɔɔ he lɛ',
    orderA11y: 'Kɔɔ oda {id} he. {item}, akɛba {date}.',
    aboutOrder: 'Kɔɔ oda {id} he',
    orderMeta: '{item} · akɛba {date}',
    bubbleA11y: '{who}: {text}. {time}',
    you: 'Bo',
    attach: 'Fɔ mfoniri he',
    placeholder: 'Ŋma sane',
    send: 'Tsu sane lɛ',
  },
  ee: {
    goBack: 'Trɔ yi megbe',
    replies: '{name} · ɖoa eŋu le miniti 10 me zi geɖe',
    call: 'Yɔ atikedzraƒea',
    orderA11y: 'Ku ɖe ɖoɖo {id} ŋu. {item}, wova ɖee {date}.',
    aboutOrder: 'Ku ɖe ɖoɖo {id} ŋu',
    orderMeta: '{item} · wova ɖee {date}',
    bubbleA11y: '{who}: {text}. {time}',
    you: 'Wò',
    attach: 'Tsɔ foto kpee',
    placeholder: 'Ŋlɔ gbedasi',
    send: 'Ɖo gbedasia ɖa',
  },
  ha: {
    goBack: 'Koma baya',
    replies: '{name} · yakan amsa cikin minti 10',
    call: 'Kira kantin maganin',
    orderA11y: 'Game da oda {id}. {item}, an kawo {date}.',
    aboutOrder: 'Game da oda {id}',
    orderMeta: '{item} · an kawo {date}',
    bubbleA11y: '{who}: {text}. {time}',
    you: 'Kai',
    attach: 'Haɗa hoto',
    placeholder: 'Rubuta saƙo',
    send: 'Aika saƙo',
  },
});

// The order this thread is about (fixture).
const ORDER = { id: 'CJ4901TUZ0', item: 'Amoxicillin 500mg', delivered: new Date(2026, 7, 23) };



export default function SupportConversation() {
  const t = useTokens();
  const { d } = useDesignScale();
  const insets = useSafeAreaInsets();
  const tr = useT(S);
  const locale = useLocale();
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
          accessibilityLabel={tr('goBack')}
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
            {tr('replies', { name: pharmacy.superintendent.short })}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('call')}
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
          accessibilityLabel={tr('orderA11y', {
            id: ORDER.id,
            item: ORDER.item,
            date: ORDER.delivered.toLocaleDateString(locale, { day: 'numeric', month: 'long' }),
          })}
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
              {tr('aboutOrder', { id: ORDER.id })}
            </Text>
            <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
              {tr('orderMeta', {
                item: ORDER.item,
                date: ORDER.delivered.toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
              })}
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
                accessibilityLabel={tr('bubbleA11y', {
                  who: mine ? tr('you') : pharmacy.name,
                  text: m.text,
                  time: messageTime(m.at),
                })}
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
          accessibilityLabel={tr('attach')}
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
            placeholder={tr('placeholder')}
            placeholderTextColor={t.colors.text.tertiary}
            accessibilityLabel={tr('placeholder')}
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
          accessibilityLabel={tr('send')}
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
