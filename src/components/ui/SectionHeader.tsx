import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../../theme/theme';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  color?: string;
}

export const SectionHeader = ({
  title,
  subtitle,
  color = colors.gold
}: SectionHeaderProps) => (
  <View style={styles.container}>
    <View style={[styles.marker, { backgroundColor: color }]} />
    <View style={styles.copy}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md
  },
  marker: {
    width: 4,
    height: 28,
    borderRadius: 2
  },
  copy: {
    flex: 1,
    gap: 2
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900'
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18
  }
});
