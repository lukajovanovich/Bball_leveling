import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '../../theme/theme';

interface StatPillProps {
  label: string;
  value: string | number;
  /** Tints the value; leave unset for plain white numbers. */
  color?: string;
}

// A box-score cell: small label over a condensed number, separated from its
// neighbours by a hairline instead of sitting in its own card.
export const StatPill = ({ label, value, color = colors.text }: StatPillProps) => (
  <View style={styles.container}>
    <Text style={styles.label}>{label}</Text>
    <Text style={[styles.value, { color }]} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 96,
    borderTopWidth: 1,
    borderTopColor: colors.borderStrong,
    paddingTop: spacing.sm,
    gap: 2
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 13
  },
  value: {
    fontFamily: fonts.display,
    fontSize: 24,
    lineHeight: 28
  }
});
