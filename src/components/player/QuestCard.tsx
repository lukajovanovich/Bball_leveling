import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getQuestProgressLabel } from '../../lib/progression';
import { Quest } from '../../types';
import { colors, fonts, radii, spacing } from '../../theme/theme';
import { XPBar } from '../ui/XPBar';

interface QuestCardProps {
  quest: Quest;
}

export const QuestCard = ({ quest }: QuestCardProps) => {
  const isComplete = quest.completed && quest.claimed;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.copy}>
          <View style={styles.titleRow}>
            {isComplete ? (
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            ) : null}
            <Text style={[styles.title, isComplete && styles.titleComplete]}>
              {quest.title}
            </Text>
          </View>
          <Text style={styles.description}>{quest.description}</Text>
        </View>
        <Text style={styles.reward}>
          +{quest.rewardXp}
          <Text style={styles.rewardUnit}> XP</Text>
        </Text>
      </View>
      <XPBar
        color={isComplete ? colors.success : colors.gold}
        current={quest.progress}
        target={quest.goal}
        label={isComplete ? 'Completed' : getQuestProgressLabel(quest)}
        showValue={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    backgroundColor: colors.panel,
    padding: spacing.lg,
    gap: spacing.md
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md
  },
  copy: {
    flex: 1,
    gap: 2
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs
  },
  title: {
    flexShrink: 1,
    color: colors.text,
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    lineHeight: 20
  },
  titleComplete: {
    color: colors.textMuted
  },
  description: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18
  },
  reward: {
    color: colors.gold,
    fontFamily: fonts.displayBold,
    fontSize: 22,
    lineHeight: 24
  },
  rewardUnit: {
    fontFamily: fonts.display,
    fontSize: 14
  }
});
