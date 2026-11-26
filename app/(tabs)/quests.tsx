import React from 'react';
import { StyleSheet, View } from 'react-native';
import { QuestCard } from '../../src/components/player/QuestCard';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
import { StatPill } from '../../src/components/ui/StatPill';
import { useProgress } from '../../src/store/ProgressContext';
import { colors, spacing } from '../../src/theme/theme';

export default function QuestsScreen() {
  const { state } = useProgress();
  const daily = state.quests.filter((quest) => quest.period === 'daily');
  const weekly = state.quests.filter((quest) => quest.period === 'weekly');
  const completed = state.quests.filter((quest) => quest.completed).length;
  // XP already paid out is no longer available to earn.
  const availableXp = state.quests
    .filter((quest) => !quest.claimed)
    .reduce((sum, quest) => sum + quest.rewardXp, 0);

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Quests"
        subtitle="Finish workouts and raise key ratings to earn bonus XP."
      />

      <View style={styles.summaryRow}>
        <StatPill label="Completed" value={`${completed}/${state.quests.length}`} />
        <StatPill label="XP left to earn" value={availableXp} color={colors.gold} />
      </View>

      <View style={styles.section}>
        <SectionHeader title="Daily" />
        <View style={styles.stack}>
          {daily.map((quest) => (
            <QuestCard key={quest.id} quest={quest} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Weekly" subtitle="Bigger goals that take a few sessions." />
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
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg
  },
  section: {
    gap: spacing.md
  },
  stack: {
    gap: spacing.sm
  }
});
