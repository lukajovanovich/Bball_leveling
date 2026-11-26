import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radii, spacing } from '../../theme/theme';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  icon?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const PrimaryButton = ({
  label,
  onPress,
  icon,
  disabled,
  style
}: PrimaryButtonProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    disabled={disabled}
    onPress={onPress}
    style={({ pressed }) => [
      styles.button,
      disabled && styles.disabled,
      pressed && !disabled && styles.pressed,
      style
    ]}
  >
    {icon ? (
      <Ionicons
        name={icon as keyof typeof Ionicons.glyphMap}
        size={18}
        color={colors.black}
      />
    ) : null}
    <Text style={styles.label}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radii.md,
    backgroundColor: colors.court,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm
  },
  label: {
    color: colors.black,
    fontFamily: fonts.displayBold,
    fontSize: 19,
    letterSpacing: 0.3
  },
  disabled: {
    opacity: 0.4
  },
  pressed: {
    backgroundColor: '#C96A2D'
  }
});
