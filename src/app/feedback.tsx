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

type Rating = 0 | 1 | 2;

const RATINGS: { key: Rating; label: string; word: string; bg: string; ink: string }[] = [
  { key: 0, label: 'Bad', word: 'BAD', bg: p.coral[500], ink: p.coral[800] },
  { key: 1, label: 'Not bad', word: 'NOT BAD', bg: p.gold[500], ink: p.gold[800] },
  { key: 2, label: 'Good', word: 'GOOD', bg: p.mint[500], ink: p.mint[800] },
];

const NOTE_LIMIT = 280;

export default function Feedback() {
  const { d } = useDesignScale();
  const insets = useSafeAreaInsets();
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
        {roundControl('close', 'Close feedback', () => router.back())}
        {roundControl('info', 'How feedback is used')}
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
        {'How was your\npharmacy experience?'}
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
              placeholder="Tell us what went wrong"
              placeholderTextColor={p.teal[700]}
              accessibilityLabel="Your feedback note"
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
              accessibilityLabel="Submit feedback"
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
                Submit
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
            {r.word}
          </Text>

          {/* Slider — three stops */}
          <View style={{ marginTop: d(48), marginHorizontal: d(24) }}>
            <View
              accessibilityRole="adjustable"
              accessibilityLabel="Rating"
              accessibilityValue={{ text: r.label }}
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
                  accessibilityLabel={x.label}
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
                    {x.label}
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
              accessibilityLabel="Add a note"
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
                Add note
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Submit feedback"
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
                Submit
              </Text>
              <Icon name="arrow-right" size={d(18)} color={p.teal[950]} />
            </Pressable>
          </View>
        </>
      )}
    </Animated.View>
  );
}
