import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ATTRIBUTE_CATEGORIES } from '../../src/data/attributes';
import { AttributeCategoryCard } from '../../src/components/player/AttributeCategoryCard';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { XPBar } from '../../src/components/ui/XPBar';
import { useProgress } from '../../src/store/ProgressContext';
import { colors, fonts, radii, spacing } from '../../src/theme/theme';

export default function AttributesScreen() {
  const { player, ovr, levelInfo } = useProgress();

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Your build"
        subtitle="Ratings run from 0 to 99. Every workout moves them, and your OVR follows."
      />

      <View style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <View>
            <Text style={styles.summaryLabel}>Current OVR</Text>
            <Text style={styles.ovr}>{ovr}</Text>
          </View>
          <View style={styles.summaryMeta}>
            <Text style={styles.summaryLabel}>Level</Text>
            <Text style={styles.levelValue}>{levelInfo.level}</Text>
          </View>
        </View>
        <Text style={styles.archetype}>{player.archetype}</Text>
        <XPBar current={levelInfo.currentXp} target={levelInfo.xpForNext} />
      </View>

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
  summaryCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.panel,
    padding: spacing.xl,
    gap: spacing.md
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.lg
  },
  summaryLabel: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 13
  },
  ovr: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 72,
    lineHeight: 76
  },
  summaryMeta: {
    alignItems: 'flex-end'
  },
  levelValue: {
    color: colors.gold,
    fontFamily: fonts.displayBold,
    fontSize: 40,
    lineHeight: 44
  },
  archetype: {
    color: colors.text,
    fontFamily: fonts.bodySemiBold,
    fontSize: 15
  }
});
