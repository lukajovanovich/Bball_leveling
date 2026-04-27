import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Player overview</Text>
        <Text style={styles.title}>Tonight's build check</Text>
      </View>

      <OVRCard
        archetype={player.archetype}
        level={levelInfo.level}
        name={player.name}
        ovr={ovr}
        position={player.position}
      />

      <View style={styles.progressPanel}>
        <XPBar
          current={levelInfo.currentXp}
          target={levelInfo.xpForNext}
          label={`Level ${levelInfo.level} progress`}
        />
        <View style={styles.statGrid}>
          <StatPill
            label="Height"
            value={formatLengthMeasurement(player.heightCm, player.heightUnit)}
            color={colors.blue}
          />
          <StatPill
            label="Wingspan"
            value={formatLengthMeasurement(player.wingspanCm, player.wingspanUnit)}
            color={colors.purple}
          />
          <StatPill
            label="Weight"
            value={formatWeightMeasurement(player.weightKg, player.weightUnit)}
            color={colors.orange}
          />
          <StatPill label="Position" value={player.position} color={colors.green} />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Attribute pulse"
          subtitle="Category averages from your current player build."
          color={colors.purple}
        />
        <View style={styles.statGrid}>
          {ATTRIBUTE_CATEGORIES.map((category) => (
            <StatPill
              key={category.id}
              label={category.title.replace(' attributes', '')}
              value={getCategoryAverage(player.attributes, category)}
              color={category.color}
            />
          ))}
        </View>
      </View>

      <PrimaryButton
        label="Train Now"
        icon="flash"
        onPress={() => router.push('/train')}
      />

      <View style={styles.section}>
        <SectionHeader
          title="Daily quests"
          subtitle="Quick XP rewards that push the loop forward."
          color={colors.gold}
        />
        <View style={styles.stack}>
          {dailyQuests.map((quest) => (
            <QuestCard key={quest.id} quest={quest} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Recent activity"
          subtitle="Every logged action becomes part of your build history."
          color={colors.court}
        />
        <View style={styles.stack}>
          {state.activityLog.slice(0, 5).map((item) => (
            <ActivityItem key={item.id} item={item} />
          ))}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs
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
  progressPanel: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    padding: spacing.lg,
    gap: spacing.lg
  },
  statGrid: {
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
