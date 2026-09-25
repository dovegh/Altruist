/**
 * SwipeRow — swipe a list item left to reveal its actions.
 *
 * Used by Prescriptions and Notifications for Archive and Delete. Swiping is
 * a shortcut, never the only way: every action here is also exposed to screen
 * readers through `accessibilityActions`, because a swipe is invisible to
 * someone who cannot see the row move.
 */
import React, { useRef } from 'react';
import { Pressable, View } from 'react-native';
import Swipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import * as Haptics from 'expo-haptics';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { Text } from './Text';
import { Icon, type IconName } from './Icon';

export type SwipeAction = {
  key: string;
  label: string;
  icon: IconName;
  tone: 'neutral' | 'danger';
  onPress: () => void;
};

export function SwipeRow({
  actions,
  children,
}: {
  actions: SwipeAction[];
  children: React.ReactNode;
}) {
  const t = useTokens();
  const { d } = useDesignScale();
  const ref = useRef<SwipeableMethods>(null);

  const run = (action: SwipeAction) => {
    ref.current?.close();
    Haptics.selectionAsync().catch(() => {});
    action.onPress();
  };

  const renderRightActions = () => (
    <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: d(8), paddingLeft: d(8) }}>
      {actions.map((a) => (
        <Pressable
          key={a.key}
          accessibilityRole="button"
          accessibilityLabel={a.label}
          onPress={() => run(a)}
          style={({ pressed }) => ({
            width: d(80),
            borderRadius: d(20),
            alignItems: 'center',
            justifyContent: 'center',
            gap: d(6),
            backgroundColor: a.tone === 'danger' ? t.colors.bg.danger : t.colors.bg.infoSubtle,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Icon
            name={a.icon}
            size={d(20)}
            color={a.tone === 'danger' ? t.colors.text.onSolid : t.colors.icon.primary}
          />
          <Text
            variant="labelS"
            color={a.tone === 'danger' ? t.colors.text.onSolid : t.colors.text.primary}
            style={{ fontSize: d(12), lineHeight: d(16) }}
          >
            {a.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <View
      accessible={false}
      accessibilityActions={actions.map((a) => ({ name: a.key, label: a.label }))}
      onAccessibilityAction={(e) => {
        const a = actions.find((x) => x.key === e.nativeEvent.actionName);
        if (a) a.onPress();
      }}
    >
      <Swipeable
        ref={ref}
        friction={2}
        rightThreshold={d(40)}
        overshootRight={false}
        renderRightActions={renderRightActions}
      >
        {children}
      </Swipeable>
    </View>
  );
}
