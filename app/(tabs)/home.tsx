import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ATTRIBUTE_CATEGORIES } from '../../src/data/attributes';
import { ActivityItem } from '../../src/components/player/ActivityItem';
import { OVRCard } from '../../src/components/player/OVRCard';
import { QuestCard } from '../../src/components/player/QuestCard';
import { PrimaryButton } from '../../src/components/ui/PrimaryButton';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
import { StatPill } from '../../src/components/ui/StatPill';
import { XPBar } from '../../src/components/ui/XPBar';
import {
  formatLengthMeasurement,
  formatWeightMeasurement
} from '../../src/lib/measurements';
import { getCategoryAverage } from '../../src/lib/progression';
import { useProgress } from '../../src/store/ProgressContext';
import { colors, radii, spacing } from '../../src/theme/theme';

export default function HomeScreen() {
  const { player, ovr, levelInfo, state } = useProgress();
  const dailyQuests = state.quests.filter((quest) => quest.period === 'daily');

  return (
    <ScreenContainer>
      <View style={styles.hero}>
        <OVRCard
          archetype={player.archetype}
          level={levelInfo.level}
          name={player.name}
          ovr={ovr}
          position={player.position}
        />
        <XPBar
          current={levelInfo.currentXp}
          target={levelInfo.xpForNext}
          label={`Level ${levelInfo.level} progress`}
        />
      </View>

      <View style={styles.statGrid}>
        <StatPill
          label="Height"
          value={formatLengthMeasurement(player.heightCm, player.heightUnit)}
        />
        <StatPill
          label="Wingspan"
          value={formatLengthMeasurement(player.wingspanCm, player.wingspanUnit)}
        />
        <StatPill
          label="Weight"
          value={formatWeightMeasurement(player.weightKg, player.weightUnit)}
        />
      </View>

      <PrimaryButton label="Log a workout" onPress={() => router.push('/train')} />

      <View style={styles.section}>
        <SectionHeader title="Ratings by category" />
        <View style={styles.statGrid}>
          {ATTRIBUTE_CATEGORIES.map((category) => (
            <StatPill
              key={category.id}
              label={category.title}
              value={getCategoryAverage(player.attributes, category)}
              color={category.color}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Today's quests" />
        <View style={styles.stack}>
          {dailyQuests.map((quest) => (
            <QuestCard key={quest.id} quest={quest} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Recent activity" />
        <View style={styles.feed}>
          {state.activityLog.slice(0, 5).map((item, index) => (
            <ActivityItem key={item.id} item={item} divided={index > 0} />
          ))}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.lg
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.lg,
    rowGap: spacing.lg
  },
  section: {
    gap: spacing.md
  },
  stack: {
    gap: spacing.sm
  },
  feed: {
    borderRadius: radii.lg,
    backgroundColor: colors.panel,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs
  }
});
