import React from 'react';
import { StyleSheet, View } from 'react-native';
import { QuestCard } from '../../src/components/player/QuestCard';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
import { StatPill } from '../../src/components/ui/StatPill';
import { getAllDailyBonusXp, getCurrentStreak } from '../../src/lib/quests';
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
  const streak = getCurrentStreak(state.questCycle);
  const dailyDone = daily.filter((quest) => quest.completed && quest.claimed).length;
  // The bonus counts today in the streak once today's first quest is done.
  const bonusStreak = dailyDone > 0 ? streak : streak + 1;

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Quests"
        subtitle="New daily quests every day and weekly quests every Monday. One done keeps your streak alive."
      />

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <StatPill label="Day streak" value={streak} color={colors.gold} />
          <StatPill label="Completed" value={`${completed}/${state.quests.length}`} />
        </View>
        <View style={styles.summaryRow}>
          <StatPill label="XP left to earn" value={availableXp} color={colors.gold} />
          <StatPill
            label="All 3 today"
            value={dailyDone === daily.length && daily.length > 0 ? 'Done' : `+${getAllDailyBonusXp(bonusStreak)} XP`}
            color={colors.gold}
          />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Daily"
          subtitle="Unfinished quests cost ratings at midnight."
        />
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
  summary: {
    gap: spacing.lg
  },
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
