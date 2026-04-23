import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { QuestCard } from '../../src/components/player/QuestCard';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
import { StatPill } from '../../src/components/ui/StatPill';
import { useProgress } from '../../src/store/ProgressContext';
import { colors, spacing } from '../../src/theme/theme';

export default function QuestsScreen() {
  const { state } = useProgress();
  const daily = state.quests.filter((quest) => quest.period === 'daily');
  const weekly = state.quests.filter((quest) => quest.period === 'weekly');
  const completed = state.quests.filter((quest) => quest.completed).length;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Quest board</Text>
        <Text style={styles.title}>Stack XP with focused goals</Text>
        <Text style={styles.subtitle}>
          Quests reward useful behavior: completing workouts, improving key
          ratings, and pushing your build toward the next tier.
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <StatPill label="Completed" value={`${completed}/${state.quests.length}`} color={colors.success} />
        <StatPill label="Available XP" value={state.quests.reduce((sum, quest) => sum + quest.rewardXp, 0)} color={colors.gold} />
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Daily quests"
          subtitle="Short-term XP targets for today's training."
          color={colors.gold}
        />
        <View style={styles.stack}>
          {daily.map((quest) => (
            <QuestCard key={quest.id} quest={quest} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Weekly quests"
          subtitle="Bigger build goals that take a few sessions."
          color={colors.purple}
        />
        <View style={styles.stack}>
          {weekly.map((quest) => (
            <QuestCard key={quest.id} quest={quest} />
          ))}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm
  },
  eyebrow: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  title: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 35,
    fontWeight: '900'
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600'
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md
  },
  section: {
    gap: spacing.md
  },
  stack: {
    gap: spacing.md
  }
});
