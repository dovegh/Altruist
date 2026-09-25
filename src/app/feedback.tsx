/**
 * Feedback — ported 1:1 from the four Figma frames on page "Feedback"
 * (Bad / Not bad / Good / Add note).
 *
 * Four frames, one screen. Bad, Not bad and Good are the same layout at three
 * slider positions, and "Add note" is that screen with the note field open —
 * building four routes would mean four copies of a full-bleed layout to keep in
 * sync.
 *
 * The whole canvas takes the rating's colour (coral / gold / mint) and the ink
 * is the 800 step of that same ramp. Those are deliberately NOT the semantic
 * danger/warning/success tokens: this is an expressive surface, and reusing the
 * status palette here would teach users that coral means "something is wrong"
 * on a screen where it only means "you tapped Bad".
 *
 * Motion: the canvas and the slider thumb cross-fade between ratings over
 * `motion.base`, and the thumb slides. This is the one screen where a bounce
 * would be fine tonally — but a full-canvas colour change is already a large
 * gesture, so it stays a fade. The face swaps geometry on the beat of that
 * change rather than morphing; a tweened frown-to-smile is more animation than
 * the moment can carry.
 *
 * Face geometry per rating, from the comps:
 *   Bad      — round 54pt eyes, mouth arcing down
 *   Not bad  — flat 62×20 eyes, straight mouth
 *   Good     — tall 62×82 eyes, mouth arcing up
 */
import React, { useEffect, useState } from 'react';
import { View, Pressable, TextInput } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDesignScale } from '@/theme/useDesignScale';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { primitives as p, motion, radius, fontFamily } from '@/theme/tokens';
import { defineStrings, useT } from '@/i18n';

const S = defineStrings({
  en: {
    bad: 'Bad',
    badWord: 'BAD',
    notBad: 'Not bad',
    notBadWord: 'NOT BAD',
    good: 'Good',
    goodWord: 'GOOD',
    close: 'Close feedback',
    howUsed: 'How feedback is used',
    question: 'How was your\npharmacy experience?',
    placeholder: 'Tell us what went wrong',
    noteA11y: 'Your feedback note',
    submitA11y: 'Submit feedback',
    submit: 'Submit',
    rating: 'Rating',
    addNoteA11y: 'Add a note',
    addNote: 'Add note',
  },
  fr: {
    bad: 'Mauvais',
    badWord: 'MAUVAIS',
    notBad: 'Pas mal',
    notBadWord: 'PAS MAL',
    good: 'Bien',
    goodWord: 'BIEN',
    close: "Fermer l'avis",
    howUsed: 'Comment votre avis est utilisé',
    question: "Comment s'est passée votre\nexpérience en pharmacie ?",
    placeholder: "Dites-nous ce qui n'a pas marché",
    noteA11y: 'Votre commentaire',
    submitA11y: 'Envoyer votre avis',
    submit: 'Envoyer',
    rating: 'Note',
    addNoteA11y: 'Ajouter un commentaire',
    addNote: 'Commenter',
  },
  tw: {
    bad: 'Ɛnyɛ',
    badWord: 'ƐNYƐ',
    notBad: 'Ɛnyɛ bɔne',
    notBadWord: 'ƐNYƐ BƆNE',
    good: 'Ɛyɛ',
    goodWord: 'ƐYƐ',
    close: 'To adwenkyerɛ no mu',
    howUsed: 'Sɛnea yɛde wo adwenkyerɛ di dwuma',
    question: 'Ɛyɛɛ wo dɛn wɔ\nnnuro adetɔnfoɔ hɔ?',
    placeholder: 'Ka deɛ ɛkɔɔ bɔne kyerɛ yɛn',
    noteA11y: 'Wo adwenkyerɛ',
    submitA11y: 'Fa wo adwenkyerɛ mena',
    submit: 'Mena',
    rating: 'Sɛnea ɛteɛ',
    addNoteA11y: 'Kyerɛw biribi ka ho',
    addNote: 'Kyerɛw nsɛm',
  },
  gaa: {
    bad: 'Ehiii',
    badWord: 'EHIII',
    notBad: 'Ehi fioo',
    notBadWord: 'EHI FIOO',
    good: 'Ehi',
    goodWord: 'EHI',
    close: 'Ŋmɛ susumɔ lɛ naa',
    howUsed: 'Bɔ ni wɔkɛ osusumɔ lɛ tsuɔ nii',
    question: 'Te tsofa hejɔɔ he lɛ\nfee bo tɛŋŋ?',
    placeholder: 'Gba wɔ nɔ ni tee shi lɛ',
    noteA11y: 'Osusumɔ lɛ',
    submitA11y: 'Kɛ osusumɔ lɛ tsu',
    submit: 'Tsu',
    rating: 'Bɔ ni eyɔɔ',
    addNoteA11y: 'Ŋma nɔ ko fata he',
    addNote: 'Ŋma nɔ ko',
  },
  ee: {
    bad: 'Menyo o',
    badWord: 'MENYO O',
    notBad: 'Enyo vie',
    notBadWord: 'ENYO VIE',
    good: 'Enyo',
    goodWord: 'ENYO',
    close: 'Tu susu ɖeɖefia la',
    howUsed: 'Alesi míezãa wò susu',
    question: 'Aleke nèkpɔe le\natikedzraƒea?',
    placeholder: 'Gblɔ nu si gblẽ na mí',
    noteA11y: 'Wò susu ɖeɖefia',
    submitA11y: 'Ɖo wò susu ɖa',
    submit: 'Ɖoe ɖa',
    rating: 'Ŋkuléle',
    addNoteA11y: 'Ŋlɔ nya aɖe kpe ɖe eŋu',
    addNote: 'Ŋlɔ nya',
  },
  ha: {
    bad: 'Mara kyau',
    badWord: 'MARA KYAU',
    notBad: 'Ba laifi',
    notBadWord: 'BA LAIFI',
    good: 'Mai kyau',
    goodWord: 'MAI KYAU',
    close: "Rufe ra'ayi",
    howUsed: "Yadda ake amfani da ra'ayinka",
    question: 'Yaya kwarewarka\na kantin magani?',
    placeholder: 'Faɗa mana abin da ya lalace',
    noteA11y: "Bayanin ra'ayinka",
    submitA11y: "Aika ra'ayi",
    submit: 'Aika',
    rating: 'Ƙima',
    addNoteA11y: 'Ƙara bayani',
    addNote: 'Ƙara bayani',
  },
});

type Rating = 0 | 1 | 2;
type Key = keyof typeof S.en;

const RATINGS: { key: Rating; label: Key; word: Key; bg: string; ink: string }[] = [
  { key: 0, label: 'bad', word: 'badWord', bg: p.coral[500], ink: p.coral[800] },
  { key: 1, label: 'notBad', word: 'notBadWord', bg: p.gold[500], ink: p.gold[800] },
  { key: 2, label: 'good', word: 'goodWord', bg: p.mint[500], ink: p.mint[800] },
];

const NOTE_LIMIT = 280;

export default function Feedback() {
  const { d } = useDesignScale();
  const insets = useSafeAreaInsets();
  const tr = useT(S);
  const [rating, setRating] = useState<Rating>(0);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');

  const r = RATINGS[rating];
  const ink = r.ink;

  const pos = useSharedValue(rating);
  useEffect(() => {
    pos.value = withTiming(rating, {
      duration: motion.duration.base,
      easing: Easing.bezier(...motion.easing.standard),
      reduceMotion: ReduceMotion.System,
    });
  }, [rating, pos]);

  const canvas = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      pos.value,
      [0, 1, 2],
      [RATINGS[0].bg, RATINGS[1].bg, RATINGS[2].bg],
    ),
  }));

  const thumb = useAnimatedStyle(() => ({
    left: `${(pos.value / 2) * 100}%`,
    backgroundColor: interpolateColor(
      pos.value,
      [0, 1, 2],
      [RATINGS[0].ink, RATINGS[1].ink, RATINGS[2].ink],
    ),
  }));

  const roundControl = (icon: 'close' | 'info', label: string, onPress?: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: d(44),
        height: d(44),
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: ink,
        opacity: pressed ? 0.4 : 0.6,
      })}
    >
      <Icon name={icon} size={d(20)} color={ink} />
    </Pressable>
  );

  /** Eyes and mouth, sized per rating. `scale` shrinks the whole face in note mode. */
  const face = (scale: number) => {
    const eyeW = rating === 0 ? 54 : 62;
    const eyeH = rating === 0 ? 54 : rating === 1 ? 20 : 82;
    const eyeR = rating === 1 ? 10 : 999;
    const mouthW = 90;
    const mouthH = rating === 1 ? 8 : 19;

    return (
      <View style={{ alignItems: 'center', gap: d(28 * scale) }}>
        <View style={{ flexDirection: 'row', gap: d(46 * scale) }}>
          {[0, 1].map((i) => (
            <View
              key={i}
              style={{
                width: d(eyeW * scale),
                height: d(eyeH * scale),
                borderRadius: d(eyeR === 999 ? 999 : eyeR * scale),
                backgroundColor: ink,
              }}
            />
          ))}
        </View>

        {/* Mouth: an arc drawn as a thick top/bottom border on a wide box. */}
        {rating === 1 ? (
          <View
            style={{
              width: d(mouthW * scale),
              height: d(mouthH * scale),
              borderRadius: radius.full,
              backgroundColor: ink,
            }}
          />
        ) : (
          <View
            style={{
              width: d(mouthW * scale),
              height: d(mouthH * scale * 2),
              borderColor: ink,
              borderWidth: 0,
              ...(rating === 2
                ? {
                    borderBottomWidth: d(14 * scale),
                    borderBottomLeftRadius: d(mouthW * scale),
                    borderBottomRightRadius: d(mouthW * scale),
                  }
                : {
                    borderTopWidth: d(14 * scale),
                    borderTopLeftRadius: d(mouthW * scale),
                    borderTopRightRadius: d(mouthW * scale),
                  }),
            }}
          />
        )}
      </View>
    );
  };

  const submit = () => router.back();

  return (
    <Animated.View style={[{ flex: 1 }, canvas]}>
      {/* Top controls at design y=60 */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingTop: insets.top + d(14),
          paddingHorizontal: d(24),
        }}
      >
        {roundControl('close', tr('close'), () => router.back())}
        {roundControl('info', tr('howUsed'))}
      </View>

      <Text
        variant="headingXL"
        color={p.teal[900]}
        style={{
          marginTop: d(28),
          marginHorizontal: d(24),
          fontSize: d(24),
          lineHeight: d(30),
        }}
      >
        {tr('question')}
      </Text>

      {noteOpen ? (
        <>
          <View style={{ alignItems: 'center', marginTop: d(4) }}>{face(0.7)}</View>

          <View
            style={{
              marginTop: d(16),
              marginHorizontal: d(24),
              minHeight: d(108),
              paddingVertical: d(18),
              paddingHorizontal: d(20),
              borderRadius: d(24),
              borderWidth: 1.5,
              borderColor: ink,
            }}
          >
            <TextInput
              value={note}
              onChangeText={(v) => setNote(v.slice(0, NOTE_LIMIT))}
              multiline
              autoFocus
              maxLength={NOTE_LIMIT}
              placeholder={tr('placeholder')}
              placeholderTextColor={p.teal[700]}
              accessibilityLabel={tr('noteA11y')}
              style={{
                flex: 1,
                padding: 0,
                textAlignVertical: 'top',
                fontSize: d(14),
                lineHeight: d(21),
                color: p.teal[900],
              }}
            />
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: d(12),
              marginHorizontal: d(24),
            }}
          >
            <Text
              variant="caption"
              color={p.teal[900]}
              style={{ flex: 1, opacity: 0.5, fontSize: d(12), lineHeight: d(16) }}
            >
              {note.length} / {NOTE_LIMIT}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tr('submitA11y')}
              onPress={submit}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: d(10),
                width: d(150),
                height: d(56),
                borderRadius: radius.full,
                backgroundColor: ink,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text variant="labelL" color={p.teal[950]} style={{ fontSize: d(16), lineHeight: d(20) }}>
                {tr('submit')}
              </Text>
              <Icon name="arrow-right" size={d(18)} color={p.teal[950]} />
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <View style={{ alignItems: 'center', marginTop: d(76) }}>{face(1)}</View>

          <Text
            center
            color={ink}
            style={{
              marginTop: d(28),
              opacity: 0.9,
              fontFamily: fontFamily.display.extrabold,
              fontSize: d(72),
              lineHeight: d(76),
              letterSpacing: -1.4,
            }}
          >
            {tr(r.word)}
          </Text>

          {/* Slider — three stops */}
          <View style={{ marginTop: d(48), marginHorizontal: d(24) }}>
            <View
              accessibilityRole="adjustable"
              accessibilityLabel={tr('rating')}
              accessibilityValue={{ text: tr(r.label) }}
              style={{
                height: d(6),
                borderRadius: radius.full,
                backgroundColor: ink,
                opacity: 0.3,
              }}
            />
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  marginLeft: rating === 0 ? 0 : rating === 1 ? d(-17) : d(-34),
                  top: d(-14),
                  width: d(34),
                  height: d(34),
                  borderRadius: radius.full,
                },
                thumb,
              ]}
            />

            <View style={{ flexDirection: 'row', marginTop: d(28) }}>
              {RATINGS.map((x, i) => (
                <Pressable
                  key={x.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: rating === x.key }}
                  accessibilityLabel={tr(x.label)}
                  onPress={() => setRating(x.key)}
                  hitSlop={{ top: 24, bottom: 12 }}
                  style={{ flex: 1, alignItems: i === 0 ? 'flex-start' : i === 1 ? 'center' : 'flex-end' }}
                >
                  <Text
                    variant="labelS"
                    color={p.teal[900]}
                    style={{
                      opacity: rating === x.key ? 1 : 0.4,
                      fontSize: d(12),
                      lineHeight: d(16),
                    }}
                  >
                    {tr(x.label)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Actions at design y=730 */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: 'auto',
              marginHorizontal: d(24),
              marginBottom: Math.max(insets.bottom, d(20)) + d(38),
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tr('addNoteA11y')}
              onPress={() => setNoteOpen(true)}
              style={({ pressed }) => ({
                alignItems: 'center',
                justifyContent: 'center',
                width: d(150),
                height: d(56),
                borderRadius: radius.full,
                borderWidth: 1.5,
                borderColor: ink,
                opacity: pressed ? 0.6 : 0.8,
              })}
            >
              <Text variant="labelL" color={p.teal[900]} style={{ fontSize: d(16), lineHeight: d(20) }}>
                {tr('addNote')}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tr('submitA11y')}
              onPress={submit}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: d(10),
                width: d(150),
                height: d(56),
                borderRadius: radius.full,
                backgroundColor: ink,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text variant="labelL" color={p.teal[950]} style={{ fontSize: d(16), lineHeight: d(20) }}>
                {tr('submit')}
              </Text>
              <Icon name="arrow-right" size={d(18)} color={p.teal[950]} />
            </Pressable>
          </View>
        </>
      )}
    </Animated.View>
  );
}
