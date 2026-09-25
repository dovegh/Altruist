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
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    title: 'Confirm deletion',
    heading: 'Why are you leaving?',
    optional: 'Optional, but it helps us fix what went wrong.',
    reasonNoNeed: 'I no longer need it',
    reasonPrivacy: 'Privacy concerns',
    reasonSlow: 'Delivery was too slow',
    reasonOther: 'I use another pharmacy',
    reasonElse: 'Something else',
    password: 'Confirm your password',
    typeWord: 'Type {word} to confirm',
    acknowledge:
      'I understand my order history and prescription images will be permanently deleted, and that my partner pharmacy keeps its own dispensing record.',
    delete: 'Delete my account',
    grace: 'You have 30 days to change your mind.',
  },
  fr: {
    title: 'Confirmer la suppression',
    heading: 'Pourquoi partez-vous ?',
    optional: 'Facultatif, mais cela nous aide à corriger ce qui n’a pas marché.',
    reasonNoNeed: "Je n'en ai plus besoin",
    reasonPrivacy: 'Confidentialité',
    reasonSlow: 'La livraison était trop lente',
    reasonOther: "J'utilise une autre pharmacie",
    reasonElse: 'Autre chose',
    password: 'Confirmez votre mot de passe',
    typeWord: 'Tapez {word} pour confirmer',
    acknowledge:
      'Je comprends que mon historique de commandes et mes images d’ordonnances seront définitivement supprimés, et que ma pharmacie partenaire conserve son propre registre de délivrance.',
    delete: 'Supprimer mon compte',
    grace: "Vous avez 30 jours pour changer d'avis.",
  },
  tw: {
    title: 'Si yiye no so pi',
    heading: 'Adɛn nti na worekɔ?',
    optional: 'Ɛnyɛ dɛ ɛsɛ, nanso ɛboa yɛn ma yɛsiesie deɛ ankɔ yie.',
    reasonNoNeed: 'Menhia bio',
    reasonPrivacy: 'Kokoam nsɛm ho dadwene',
    reasonSlow: 'Nneɛma no ammra ntɛm',
    reasonOther: 'Mede nnuro adetɔnbea foforɔ di dwuma',
    reasonElse: 'Biribi foforɔ',
    password: 'Si wo password so pi',
    typeWord: 'Kyerɛw {word} de si so pi',
    acknowledge:
      'Mete aseɛ sɛ wɔbɛyi nneɛma a mato ho nsɛm ne me nnuro krataa mfonini afebɔɔ, na me nnuro adetɔnbea hokafoɔ bɛkora nnuro a ɔde maa me ho nsɛm.',
    delete: 'Yi me akontaa',
    grace: 'Wowɔ nna 30 a wobɛtumi asesa w’adwene.',
  },
  gaa: {
    title: 'Kpɛ jiemɔ lɛ nɔ',
    heading: 'Mɛni hewɔ ooojɛ?',
    optional: 'Jeee nɔ ni esa, shi eyeɔ ebuaa wɔ ni wɔdaa nɔ ni yaaa jogbaŋŋ.',
    reasonNoNeed: 'Mihiaaa ekoŋŋ',
    reasonPrivacy: 'Teemɔŋ saji he hiɛdɔɔ',
    reasonSlow: 'Nibii lɛ shɛɛɛ oya',
    reasonOther: 'Mikɛ tsofa shĩa kroko tsuɔ nii',
    reasonElse: 'Nɔ kroko',
    password: 'Kpɛ o password nɔ',
    typeWord: 'Ŋma {word} kɛkpɛ nɔ',
    acknowledge:
      'Minu shishi akɛ abaajie nɔ ni mihe he saji kɛ mi tsofa wolo mfonirii lɛ kɛya daa, ni mi tsofa shĩa hefatalɔ lɛ baahiɛ tsofai ni ekɛha mi lɛ he saji.',
    delete: 'Jie mi akɔŋt lɛ',
    grace: 'Oyɛ gbii 30 koni otsake o yiŋ.',
  },
  ee: {
    title: 'Ɖo kpe tutu la dzi',
    heading: 'Nu ka ta nèle dzodzom?',
    optional: 'Mehiã o, gake ekpena ɖe mía ŋu míeɖɔa nu si medze o ɖo.',
    reasonNoNeed: 'Nyemehiãe azɔ o',
    reasonPrivacy: 'Nyaɣaɣla ŋuti tamebubu',
    reasonSlow: 'Nudodo la tɔtɔ akpa',
    reasonOther: 'Mezãa atikedzraƒe bubu',
    reasonElse: 'Nu bubu',
    password: 'Ɖo kpe wò password dzi',
    typeWord: 'Ŋlɔ {word} tsɔ ɖo kpe edzi',
    acknowledge:
      'Mese egɔme be woatutu nye nudodowo ƒe ŋutinya kple nye atikeŋɔŋlɔ ƒe fotowo tegbee, eye be nye atikedzraƒe hati alé atike siwo wòna ƒe nuŋlɔɖi ɖe asi.',
    delete: 'Tutu nye akɔnta',
    grace: 'Ŋkeke 30 le asiwò be nàtrɔ susu.',
  },
  ha: {
    title: 'Tabbatar da gogewa',
    heading: 'Me yasa kake barin?',
    optional: 'Ba dole ba ne, amma yana taimaka mana gyara abin da bai yi kyau ba.',
    reasonNoNeed: 'Ba na buƙatarsa kuma',
    reasonPrivacy: 'Damuwa game da sirri',
    reasonSlow: 'Kawowa ya yi jinkiri sosai',
    reasonOther: 'Ina amfani da wani kantin magani',
    reasonElse: 'Wani abu dabam',
    password: 'Tabbatar da kalmar sirrinka',
    typeWord: 'Rubuta {word} don tabbatarwa',
    acknowledge:
      'Na fahimci cewa za a goge tarihin odata da hotunan takardun maganina har abada, kuma kantin magani abokin hulɗata yana riƙe da nasa rikodin bayar da magani.',
    delete: 'Goge asusuna',
    grace: 'Kana da kwana 30 don canja ra’ayinka.',
  },
});

// The reasons are stored in English (see lib/forms); only their labels translate.
const REASON_KEYS: Record<string, keyof typeof S.en> = {
  'I no longer need it': 'reasonNoNeed',
  'Privacy concerns': 'reasonPrivacy',
  'Delivery was too slow': 'reasonSlow',
  'I use another pharmacy': 'reasonOther',
  'Something else': 'reasonElse',
};

const CONFIRM_WORD = 'DELETE';

export default function ConfirmDeletion() {
  const tr = useT(S);
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
        <TitleAppBar title={tr('title')} />

        <Text variant="headingXL" style={{ fontSize: d(24), lineHeight: d(30) }}>
          {tr('heading')}
        </Text>
        <Text variant="bodyM" tone="secondary" style={{ fontSize: d(14), lineHeight: d(21) }}>
          {tr('optional')}
        </Text>

        {REASONS.map((r) => {
          const selected = reason === r;
          const label = REASON_KEYS[r] ? tr(REASON_KEYS[r]) : r;
          return (
            <Pressable
              key={r}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={label}
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
                {label}
              </Text>
            </Pressable>
          );
        })}

        <InputField
          label={tr('password')}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••••"
          secureTextEntry
          autoComplete="password"
        />

        <InputField
          label={tr('typeWord', { word: CONFIRM_WORD })}
          value={typed}
          onChangeText={setTyped}
          placeholder={CONFIRM_WORD}
          autoCapitalize="characters"
          autoCorrect={false}
        />

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: acknowledged }}
          accessibilityLabel={tr('acknowledge')}
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
            {tr('acknowledge')}
          </Text>
        </Pressable>
      </FormScreen>

      <StickyFooter>
        <Button
          label={tr('delete')}
          variant="danger"
          size="large"
          iconLeading="trash"
          disabled={!canDelete}
          onPress={() => router.replace('/deletion-scheduled')}
        />
        <Text variant="caption" tone="tertiary" center style={{ fontSize: d(12), lineHeight: d(16) }}>
          {tr('grace')}
        </Text>
      </StickyFooter>
    </View>
  );
}
