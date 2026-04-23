import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getQuestProgressLabel } from '../../lib/progression';
import { Quest } from '../../types';
import { colors, radii, spacing } from '../../theme/theme';
import { XPBar } from '../ui/XPBar';

interface QuestCardProps {
  quest: Quest;
}

export const QuestCard = ({ quest }: QuestCardProps) => {
  const isComplete = quest.completed && quest.claimed;

  return (
    <View style={[styles.card, isComplete && styles.completedCard]}>
      <View style={styles.header}>
        <View style={[styles.iconShell, isComplete && styles.completedIconShell]}>
          <Ionicons
            name={isComplete ? 'checkmark' : 'flag'}
            size={18}
            color={isComplete ? colors.black : colors.gold}
          />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{quest.title}</Text>
          <Text style={styles.description}>{quest.description}</Text>
        </View>
        <View style={styles.reward}>
          <Text style={styles.rewardValue}>+{quest.rewardXp}</Text>
          <Text style={styles.rewardLabel}>XP</Text>
        </View>
      </View>
      <XPBar
        color={isComplete ? colors.success : colors.gold}
        current={quest.progress}
        target={quest.goal}
        label={isComplete ? 'Completed' : getQuestProgressLabel(quest)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    padding: spacing.lg,
    gap: spacing.lg
  },
  completedCard: {
    borderColor: 'rgba(88,230,166,0.28)'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md
  },
  iconShell: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(248,214,109,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248,214,109,0.22)'
  },
  completedIconShell: {
    backgroundColor: colors.success,
    borderColor: colors.success
  },
  copy: {
    flex: 1,
    gap: 3
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900'
  },
  description: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600'
  },
  reward: {
    alignItems: 'flex-end'
  },
  rewardValue: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: '900'
  },
  rewardLabel: {
    color: colors.textSubtle,
    fontSize: 10,
    fontWeight: '900'
  }
});
