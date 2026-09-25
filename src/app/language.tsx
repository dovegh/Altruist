/**
 * Language — pick one of the six the app speaks.
 *
 * The change is immediate and needs no restart: every screen reads its
 * strings through `useT`, which re-renders on the new language.
 *
 * Twi, Ga, Ewe and Hausa carry a "draft" note until a native speaker has
 * checked them. Pharmacist notes, medicine names and legal documents stay as
 * written whatever the setting, and the footer says so.
 */
import React from 'react';
import { View, Pressable } from 'react-native';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { FormScreen } from '@/components/ui/FormScreen';
import { TitleAppBar } from '@/components/ui/AppBar';
import { Radio } from '@/components/ui/Form';
import { Text } from '@/components/ui/Text';
import { LANGUAGES, defineStrings, setLanguage, useLanguage, useT } from '@/i18n';

const S = defineStrings({
  en: {
    title: 'Language',
    draft: 'Draft translation',
    footer: 'Medicine names, pharmacist notes and legal documents stay in English.',
  },
  fr: {
    title: 'Langue',
    draft: 'Traduction provisoire',
    footer:
      'Les noms des médicaments, les notes du pharmacien et les documents juridiques restent en anglais.',
  },
  tw: {
    title: 'Kasa',
    draft: 'Nkyerɛaseɛ a ɛnnwiee',
    footer: 'Nnuro din, oduruyɛfoɔ nsɛm ne mmara nkrataa no bɛkɔ so ayɛ Borɔfo kasa.',
  },
  gaa: {
    title: 'Wiemɔ',
    draft: 'Shishitsɔɔmɔ ni egbeee naa',
    footer: 'Tsofai agbɛii, tsofatsɛ wiemɔi kɛ mlai awoloi lɛ hiɛ Blɔfo wiemɔ mli.',
  },
  ee: {
    title: 'Gbe',
    draft: 'Gɔmeɖeɖe si mewu enu o',
    footer: 'Atikewo ŋkɔ, atikedzraɖola ƒe nyawo kple se agbalẽwo anɔ Eŋlisigbe me.',
  },
  ha: {
    title: 'Harshe',
    draft: 'Fassarar gwaji',
    footer: 'Sunayen magunguna, bayanan mai harhaɗa magani da takardun doka za su kasance da Turanci.',
  },
});

export default function Language() {
  const t = useTokens();
  const { d } = useDesignScale();
  const tr = useT(S);
  const current = useLanguage();

  return (
    <FormScreen gap={16} contentStyle={{ paddingBottom: d(60) }}>
      <TitleAppBar title={tr('title')} />

      <View
        style={{
          gap: d(2),
          padding: d(6),
          borderRadius: d(22),
          backgroundColor: t.colors.bg.surface,
        }}
      >
        {LANGUAGES.map((l) => {
          const on = current === l.code;
          return (
            <Pressable
              key={l.code}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={l.draft ? `${l.native}. ${tr('draft')}` : l.native}
              onPress={() => setLanguage(l.code)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: d(12),
                paddingVertical: d(14),
                paddingHorizontal: d(12),
                borderRadius: d(16),
                backgroundColor: on ? t.colors.bg.surfaceRaised : 'transparent',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Radio selected={on} />
              <View style={{ flex: 1, gap: d(2) }}>
                <Text variant="labelM" style={{ fontSize: d(15), lineHeight: d(20) }}>
                  {l.native}
                </Text>
                {l.native !== l.name || l.draft ? (
                  <Text
                    variant="caption"
                    tone="tertiary"
                    style={{ fontSize: d(12), lineHeight: d(16) }}
                  >
                    {[l.native !== l.name ? l.name : null, l.draft ? tr('draft') : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text variant="caption" tone="tertiary" style={{ fontSize: d(12), lineHeight: d(16) }}>
        {tr('footer')}
      </Text>
    </FormScreen>
  );
}
