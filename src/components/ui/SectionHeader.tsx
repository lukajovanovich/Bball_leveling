import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../../theme/theme';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}

export const SectionHeader = ({ title, subtitle }: SectionHeaderProps) => (
  <View style={styles.container}>
    <Text accessibilityRole="header" style={styles.title}>
      {title}
    </Text>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    gap: 2
  },
  title: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 24,
    lineHeight: 28
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20
  }
});
