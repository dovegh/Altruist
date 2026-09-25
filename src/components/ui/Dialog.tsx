/**
 * Dialog — the app's pop-up, in place of the system `Alert`.
 *
 * `Alert.alert` draws the platform's plain grey box with shouted uppercase
 * buttons on Android, which looked like it belonged to a different app. This
 * is a card in the middle of the screen, in the app's own surfaces: a tinted
 * icon, a centred title and line of text, and the buttons side by side — the
 * way out on the left, the action on the right. Labels too long to sit side by
 * side stack instead, action first.
 *
 * Call `showDialog()` from anywhere (a handler, an effect, a module). One
 * `DialogHost` at the root draws whatever is showing. Tapping the backdrop or
 * pressing Back dismisses it, the same as the cancel button.
 */
import React from 'react';
import { Modal, Pressable, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { create } from 'zustand';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { Text } from './Text';
import { Icon, type IconName } from './Icon';
import { Button, type ButtonVariant } from './Button';

export type DialogAction = {
  label: string;
  onPress?: () => void;
  /** `tertiary` reads as the way out; `danger` for anything destructive. */
  variant?: ButtonVariant;
  icon?: IconName;
};

export type DialogOptions = {
  title: string;
  message?: string;
  icon?: IconName;
  tone?: 'brand' | 'warning' | 'danger';
  actions: DialogAction[];
};

const useDialogStore = create<{ current: DialogOptions | null }>(() => ({ current: null }));

export function showDialog(options: DialogOptions): void {
  useDialogStore.setState({ current: options });
}

export function hideDialog(): void {
  useDialogStore.setState({ current: null });
}

/** Side by side only when every label is short enough not to wrap. */
const SIDE_BY_SIDE_MAX = 14;

/** Mount once, at the root, above every screen. */
export function DialogHost() {
  const t = useTokens();
  const { d } = useDesignScale();
  const { width } = useWindowDimensions();
  const dialog = useDialogStore((s) => s.current);

  const run = (action?: DialogAction) => {
    hideDialog();
    // After the close, so an action that opens something else (settings, a
    // second dialog) does not fight the one leaving.
    if (action?.onPress) setTimeout(action.onPress, 0);
  };

  const cancel = dialog?.actions.find((a) => a.variant === 'tertiary');
  const tone = dialog?.tone ?? 'brand';
  const tint =
    tone === 'danger'
      ? t.colors.bg.dangerSubtle
      : tone === 'warning'
        ? t.colors.bg.warningSubtle
        : t.colors.bg.brandSubtle;

  const actions = dialog?.actions ?? [];
  const sideBySide =
    actions.length === 2 && actions.every((a) => a.label.length <= SIDE_BY_SIDE_MAX);
  // Side by side, the way out goes left; stacked, the action goes first.
  const ordered = sideBySide
    ? [...actions].sort((a, b) => Number(b.variant === 'tertiary') - Number(a.variant === 'tertiary'))
    : [...actions].sort((a, b) => Number(a.variant === 'tertiary') - Number(b.variant === 'tertiary'));

  return (
    <Modal
      visible={dialog !== null}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => run(cancel)}
    >
      {dialog ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: d(24) }}>
          <Animated.View
            entering={FadeIn.duration(160)}
            exiting={FadeOut.duration(140)}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={() => run(cancel)}
              style={{ flex: 1, backgroundColor: t.colors.bg.overlay, opacity: 0.6 }}
            />
          </Animated.View>

          <Animated.View
            entering={ZoomIn.duration(180)}
            exiting={ZoomOut.duration(140)}
            accessibilityViewIsModal
            style={{
              width: Math.min(width - d(48), d(340)),
              alignItems: 'center',
              gap: d(16),
              paddingTop: d(28),
              paddingHorizontal: d(24),
              paddingBottom: d(24),
              borderRadius: d(28),
              backgroundColor: t.colors.bg.surface,
            }}
          >
            {dialog.icon ? (
              <View
                style={{
                  width: d(56),
                  height: d(56),
                  borderRadius: t.radius.full,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: tint,
                }}
              >
                <Icon
                  name={dialog.icon}
                  size={d(24)}
                  tone={tone === 'danger' ? 'danger' : tone === 'warning' ? 'warning' : 'brand'}
                />
              </View>
            ) : null}

            <View style={{ gap: d(6), alignSelf: 'stretch' }}>
              <Text
                accessibilityRole="header"
                variant="headingM"
                center
                style={{ fontSize: d(18), lineHeight: d(24) }}
              >
                {dialog.title}
              </Text>
              {dialog.message ? (
                <Text
                  variant="bodyM"
                  tone="secondary"
                  center
                  style={{ fontSize: d(14), lineHeight: d(21) }}
                >
                  {dialog.message}
                </Text>
              ) : null}
            </View>

            <View
              style={{
                alignSelf: 'stretch',
                flexDirection: sideBySide ? 'row' : 'column',
                gap: d(10),
                marginTop: d(4),
              }}
            >
              {ordered.map((action) => (
                <Button
                  key={action.label}
                  label={action.label}
                  // A text-only button beside a filled one reads as disabled;
                  // side by side, the way out is outlined instead.
                  variant={
                    action.variant === 'tertiary' && sideBySide
                      ? 'secondary'
                      : (action.variant ?? 'primary')
                  }
                  iconLeading={action.icon}
                  size="medium"
                  style={sideBySide ? { flex: 1 } : undefined}
                  onPress={() => run(action)}
                />
              ))}
            </View>
          </Animated.View>
        </View>
      ) : null}
    </Modal>
  );
}
