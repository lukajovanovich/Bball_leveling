import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActivityLogItem } from '../../types';
import { colors, fonts, spacing } from '../../theme/theme';

const iconByType: Record<ActivityLogItem['type'], keyof typeof Ionicons.glyphMap> = {
  workout: 'basketball-outline',
  quest: 'flag-outline',
  attribute: 'trending-up',
  level: 'star-outline',
  penalty: 'trending-down'
};

// Colored by kind of entry rather than by the color stored on old log items,
// so the feed stays on the app's two accents.
const colorByType: Record<ActivityLogItem['type'], string> = {
  workout: colors.court,
  quest: colors.gold,
  attribute: colors.textMuted,
  level: colors.gold,
  penalty: colors.red
};

interface ActivityItemProps {
  item: ActivityLogItem;
  /** Draws a hairline above the row when it follows another entry. */
  divided?: boolean;
}

export const ActivityItem = ({ item, divided = false }: ActivityItemProps) => {
  const date = new Date(item.createdAt);
  const dateLabel = Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <View style={[styles.item, divided && styles.divided]}>
      <Ionicons
        name={iconByType[item.type]}
        size={18}
        color={colorByType[item.type]}
        style={styles.icon}
      />
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md
  },
  divided: {
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  icon: {
    marginTop: 1
  },
  copy: {
    flex: 1,
    gap: 2
  },
  title: {
    color: colors.text,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    lineHeight: 19
  },
  description: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18
  },
  date: {
    color: colors.textSubtle,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 19
  }
});
