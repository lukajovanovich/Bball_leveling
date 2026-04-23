import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../../theme/theme';

interface StatPillProps {
  label: string;
  value: string | number;
  color?: string;
}

export const StatPill = ({ label, value, color = colors.gold }: StatPillProps) => (
  <View style={styles.container}>
    <View style={[styles.dot, { backgroundColor: color }]} />
    <View style={styles.copy}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    minHeight: 58,
    flex: 1,
    minWidth: 136,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5
  },
  copy: {
    flex: 1,
    gap: 2
  },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  value: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900'
  }
});
