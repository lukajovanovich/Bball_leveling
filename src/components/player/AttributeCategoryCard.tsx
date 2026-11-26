import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AttributeCategory, PlayerAttributes } from '../../types';
import { getCategoryAverage } from '../../lib/progression';
import { colors, fonts, radii, spacing } from '../../theme/theme';
import { AttributeBar } from './AttributeBar';

interface AttributeCategoryCardProps {
  category: AttributeCategory;
  attributes: PlayerAttributes;
}

export const AttributeCategoryCard = ({
  category,
  attributes
}: AttributeCategoryCardProps) => (
  <View style={styles.card}>
    <View style={[styles.header, { borderBottomColor: category.color }]}>
      <Text style={styles.title}>{category.title}</Text>
      <View style={styles.average}>
        <Text style={styles.averageLabel}>Avg</Text>
        <Text style={[styles.averageValue, { color: category.color }]}>
          {getCategoryAverage(attributes, category)}
        </Text>
      </View>
    </View>
    <View style={styles.list}>
      {category.attributes.map((attribute) => (
        <AttributeBar
          key={attribute.key}
          color={category.color}
          name={attribute.name}
          value={attributes[attribute.key]}
        />
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    backgroundColor: colors.panel,
    padding: spacing.lg,
    gap: spacing.lg
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 2
  },
  title: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 24,
    lineHeight: 28
  },
  average: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs
  },
  averageLabel: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 13
  },
  averageValue: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    lineHeight: 30
  },
  list: {
    gap: spacing.md
  }
});
