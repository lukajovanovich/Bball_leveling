import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ATTRIBUTE_CATEGORIES } from '../../src/data/attributes';
import { AttributeCategoryCard } from '../../src/components/player/AttributeCategoryCard';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
import { StatPill } from '../../src/components/ui/StatPill';
import { XPBar } from '../../src/components/ui/XPBar';
import { useProgress } from '../../src/store/ProgressContext';
import { colors, radii, spacing } from '../../src/theme/theme';

export default function AttributesScreen() {
  const { player, ovr, levelInfo } = useProgress();

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Progress dashboard</Text>
        <Text style={styles.title}>Player build attributes</Text>
        <Text style={styles.subtitle}>
          Every attribute moves between 25 and 99. Your OVR is recalculated from
          the full build after each workout.
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <View>
            <Text style={styles.summaryLabel}>Current OVR</Text>
            <Text style={styles.ovr}>{ovr}</Text>
          </View>
          <View style={styles.levelBox}>
            <Text style={styles.levelLabel}>Level</Text>
            <Text style={styles.levelValue}>{levelInfo.level}</Text>
          </View>
        </View>
        <XPBar current={levelInfo.currentXp} target={levelInfo.xpForNext} />
        <View style={styles.statGrid}>
          <StatPill label="Archetype" value={player.archetype} color={colors.gold} />
          <StatPill label="Goal" value="OVR climb" color={colors.green} />
        </View>
      </View>

      <SectionHeader
        title="Full attribute map"
        subtitle="Category colors match the progression focus for each skill group."
        color={colors.blue}
      />

      {ATTRIBUTE_CATEGORIES.map((category) => (
        <AttributeCategoryCard
          key={category.id}
          category={category}
          attributes={player.attributes}
        />
      ))}
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
  summaryCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.panelElevated,
    padding: spacing.xl,
    gap: spacing.lg
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  ovr: {
    color: colors.text,
    fontSize: 54,
    lineHeight: 58,
    fontWeight: '900'
  },
  levelBox: {
    width: 78,
    height: 78,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(248,214,109,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248,214,109,0.28)'
  },
  levelLabel: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  levelValue: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900'
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md
  }
});
