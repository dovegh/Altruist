/**
 * Input Field — Figma node 36:? (Input & Form / Input Field), 5 states.
 *
 * Figma models state as a variant; in code the state is *derived*, because a
 * text field's state is a fact about the runtime (focused? has value? failed
 * validation?) and not something a screen should have to assert. The mapping:
 *
 *   disabled            → bg/disabled,       border/subtle 1,   text/disabled
 *   error               → bg/surface-raised,  border/danger 1.5, helper danger
 *   focused             → bg/surface-raised,  border/focus 2
 *   value.length > 0    → bg/surface-raised,  border/default 1,  text/primary
 *   empty               → bg/surface-raised,  border/default 1,  text/placeholder
 *
 * Error beats focus deliberately: while you are correcting a rejected field the
 * red border is the information you need, not the focus ring.
 *
 * The border is drawn on a wrapper rather than the TextInput itself, so the
 * 2pt focus ring cannot shift the text baseline as it thickens.
 */
import React, { useState } from 'react';
import { View, TextInput, Pressable, type TextInputProps, type ViewStyle } from 'react-native';
import { useTokens } from '@/theme/ThemeProvider';
import { useDesignScale } from '@/theme/useDesignScale';
import { Text } from './Text';
import { Icon, type IconName } from './Icon';

export type InputFieldProps = Omit<TextInputProps, 'style' | 'editable'> & {
  label?: string;
  helper?: string;
  /** Truthy switches the field to the error state and recolours the helper. */
  error?: string | boolean;
  disabled?: boolean;
  trailingIcon?: IconName;
  onTrailingPress?: () => void;
  /** Drawn inside the box, before the text (e.g. the mobile money network). */
  leading?: React.ReactNode;
  style?: ViewStyle;
};

export function InputField({
  label,
  helper,
  error,
  disabled = false,
  trailingIcon,
  onTrailingPress,
  leading,
  value,
  onFocus,
  onBlur,
  style,
  ...rest
}: InputFieldProps) {
  const t = useTokens();
  const { d } = useDesignScale();
  const [focused, setFocused] = useState(false);

  const hasError = !!error;
  const helperText = typeof error === 'string' && error ? error : helper;

  const boxFill = disabled ? t.colors.bg.disabled : t.colors.bg.surfaceRaised;
  const borderColor = disabled
    ? t.colors.border.subtle
    : hasError
      ? t.colors.border.danger
      : focused
        ? t.colors.border.focus
        : t.colors.border.default;
  const borderWidth = disabled ? 1 : hasError ? 1.5 : focused ? 2 : 1;

  const inkTone = disabled ? 'disabled' : 'primary';

  return (
    <View style={[{ gap: d(8) }, style]}>
      {label ? (
        <Text
          variant="labelM"
          tone={disabled ? 'disabled' : 'secondary'}
          style={{ fontSize: d(14), lineHeight: d(18) }}
        >
          {label}
        </Text>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: d(12),
          height: d(56),
          paddingHorizontal: d(16),
          borderRadius: d(14),
          backgroundColor: boxFill,
          borderWidth,
          borderColor,
        }}
      >
        {leading}
        <TextInput
          {...rest}
          value={value}
          editable={!disabled}
          placeholderTextColor={t.colors.text.placeholder}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          // Android adds its own vertical padding to TextInput; zero it or the
          // 24pt line box no longer centres inside the 56pt control.
          style={{
            flex: 1,
            padding: 0,
            fontFamily: t.typography.bodyL.fontFamily,
            fontSize: d(16),
            lineHeight: d(24),
            color: t.colors.text[inkTone],
          }}
        />
        {trailingIcon ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={10}
            disabled={disabled}
            onPress={onTrailingPress}
          >
            <Icon name={trailingIcon} size={d(20)} tone={disabled ? 'tertiary' : 'secondary'} />
          </Pressable>
        ) : null}
      </View>

      {helperText ? (
        <Text
          variant="bodyS"
          tone={disabled ? 'disabled' : hasError ? 'danger' : 'tertiary'}
          style={{ fontSize: d(13), lineHeight: d(19) }}
        >
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

export default InputField;
