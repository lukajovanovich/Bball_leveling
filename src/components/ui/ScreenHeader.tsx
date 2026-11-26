import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '../../theme/theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
}

export const ScreenHeader = ({ title, subtitle }: ScreenHeaderProps) => (
  <View style={styles.container}>
    <Text accessibilityRole="header" style={styles.title}>
      {title}
    </Text>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs
  },
  title: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 38,
    lineHeight: 42
  },
  subtitle: {
    maxWidth: 520,
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22
  }
});
