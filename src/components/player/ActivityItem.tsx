import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActivityLogItem } from '../../types';
import { colors, radii, spacing } from '../../theme/theme';

const iconByType: Record<ActivityLogItem['type'], keyof typeof Ionicons.glyphMap> = {
  workout: 'flame',
  quest: 'flag',
  attribute: 'trending-up',
  level: 'star'
};

interface ActivityItemProps {
  item: ActivityLogItem;
}

export const ActivityItem = ({ item }: ActivityItemProps) => {
  const date = new Date(item.createdAt);
  const dateLabel = Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <View style={styles.item}>
      <View style={[styles.iconShell, { backgroundColor: `${item.accentColor}20` }]}>
        <Ionicons name={iconByType[item.type]} size={17} color={item.accentColor} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
      <Text style={styles.date}>{dateLabel}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  item: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    padding: spacing.md
  },
  iconShell: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  copy: {
    flex: 1,
    gap: 3
  },
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900'
  },
  description: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600'
  },
  date: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: '800'
  }
});
