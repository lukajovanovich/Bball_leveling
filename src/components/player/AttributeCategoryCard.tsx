import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AttributeCategory, PlayerAttributes } from '../../types';
import { getCategoryAverage } from '../../lib/progression';
import { colors, radii, shadows, spacing } from '../../theme/theme';
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
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <View style={[styles.marker, { backgroundColor: category.color }]} />
        <Text style={styles.title}>{category.title}</Text>
      </View>
      <View style={[styles.averagePill, { borderColor: category.color }]}>
        <Text style={[styles.averageText, { color: category.color }]}>
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
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    padding: spacing.lg,
    gap: spacing.lg,
    ...shadows.card
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  marker: {
    width: 8,
    height: 30,
    borderRadius: 4
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: '900'
  },
  averagePill: {
    minWidth: 44,
    height: 36,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)'
  },
  averageText: {
    fontSize: 16,
    fontWeight: '900'
  },
  list: {
    gap: spacing.lg
  }
});
