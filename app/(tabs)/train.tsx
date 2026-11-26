import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ATTRIBUTE_NAME_BY_KEY } from '../../src/data/attributes';
import { WORKOUTS } from '../../src/data/workouts';
import { TrainingTypeCard } from '../../src/components/training/TrainingTypeCard';
import { PrimaryButton } from '../../src/components/ui/PrimaryButton';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
import { StatPill } from '../../src/components/ui/StatPill';
import {
  INTENSITY_CONFIG,
  getWorkoutDefinition
} from '../../src/lib/progression';
import { useProgress } from '../../src/store/ProgressContext';
import {
  AttributeKey,
  ProgressUpdate,
  WorkoutIntensity,
  WorkoutType
} from '../../src/types';
import { colors, fonts, radii, spacing } from '../../src/theme/theme';

const intensityOptions: WorkoutIntensity[] = ['light', 'medium', 'hard'];

export default function TrainScreen() {
  const { logWorkout, ovr, levelInfo } = useProgress();
  const [selectedType, setSelectedType] = useState<WorkoutType>('shooting');
  const [intensity, setIntensity] = useState<WorkoutIntensity>('medium');
  const [lastResult, setLastResult] = useState<ProgressUpdate | null>(null);

  const selectedWorkout = useMemo(
    () => WORKOUTS.find((workout) => workout.type === selectedType) ?? WORKOUTS[0],
    [selectedType]
  );

  // The result card describes the workout that was logged, which may no longer
  // be the one selected above.
  const resultColor = lastResult
    ? getWorkoutDefinition(lastResult.session.workoutType).accentColor
    : selectedWorkout.accentColor;

  const gainEntries = lastResult
    ? (Object.entries(lastResult.attributeGains) as [AttributeKey, number][])
    : [];

  const handleLogWorkout = () => {
    const update = logWorkout(selectedType, intensity);
    setLastResult(update);
  };

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Log a workout"
        subtitle="Pick what you trained and how hard. Your ratings update right away."
      />

      <View style={styles.summaryRow}>
        <StatPill label="Current OVR" value={ovr} />
        <StatPill label="Level" value={levelInfo.level} color={colors.gold} />
      </View>

      <View style={styles.section}>
        <SectionHeader title="What did you work on?" />
        <View style={styles.stack}>
          {WORKOUTS.map((workout) => (
            <TrainingTypeCard
              key={workout.type}
              workout={workout}
              selected={workout.type === selectedType}
              onPress={() => setSelectedType(workout.type)}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Intensity" />
        <View style={styles.segmented}>
          {intensityOptions.map((option) => {
            const selected = option === intensity;
            const config = INTENSITY_CONFIG[option];

            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setIntensity(option)}
                style={[styles.segment, selected && styles.segmentSelected]}
              >
                <Text
                  style={[
                    styles.segmentLabel,
                    selected && styles.segmentLabelSelected
                  ]}
                >
                  {config.label}
                </Text>
                <Text style={styles.segmentMeta}>+{config.xp} XP</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <PrimaryButton
        label={`Log ${INTENSITY_CONFIG[intensity].label.toLowerCase()} workout`}
        onPress={handleLogWorkout}
      />

      {lastResult ? (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>Progress gained</Text>
            <Text style={styles.resultXp}>
              +{lastResult.workoutXpGained + lastResult.questXpGained} XP
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <StatPill
              label="Workout XP"
              value={`+${lastResult.workoutXpGained}`}
            />
            <StatPill
              label="Quest XP"
              value={`+${lastResult.questXpGained}`}
              color={colors.gold}
            />
          </View>
          <View style={styles.gainList}>
            {gainEntries.map(([key, gain]) => (
              <View key={key} style={styles.gainRow}>
                <Text style={styles.gainLabel}>{ATTRIBUTE_NAME_BY_KEY[key]}</Text>
                <Text style={[styles.gainValue, { color: resultColor }]}>
                  +{gain}
                </Text>
              </View>
            ))}
          </View>
          {lastResult.completedQuests.length > 0 ? (
            <View style={styles.questResult}>
              <Text style={styles.questResultTitle}>Quest completed</Text>
              {lastResult.completedQuests.map((quest) => (
                <View key={quest.id} style={styles.gainRow}>
                  <Text style={styles.gainLabel}>{quest.title}</Text>
                  <Text style={[styles.gainValue, styles.questXp]}>
                    +{quest.rewardXp} XP
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
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
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: radii.lg,
    backgroundColor: colors.panel,
    padding: spacing.xs,
    gap: spacing.xs
  },
  segment: {
    flex: 1,
    minHeight: 60,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2
  },
  segmentSelected: {
    backgroundColor: colors.panelHighlight
  },
  segmentLabel: {
    color: colors.textMuted,
    fontFamily: fonts.display,
    fontSize: 20
  },
  segmentLabelSelected: {
    color: colors.text
  },
  segmentMeta: {
    color: colors.textSubtle,
    fontFamily: fonts.bodyMedium,
    fontSize: 12
  },
  resultCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.panel,
    padding: spacing.xl,
    gap: spacing.lg
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.lg
  },
  resultTitle: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 22
  },
  resultXp: {
    color: colors.gold,
    fontFamily: fonts.displayBold,
    fontSize: 36,
    lineHeight: 40
  },
  gainList: {
    gap: spacing.xs
  },
  gainRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  gainLabel: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20
  },
  gainValue: {
    fontFamily: fonts.displayBold,
    fontSize: 18
  },
  questXp: {
    color: colors.gold
  },
  questResult: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.xs
  },
  questResultTitle: {
    color: colors.gold,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    marginBottom: spacing.xs
  }
});
