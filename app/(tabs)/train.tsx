import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ATTRIBUTE_NAME_BY_KEY } from '../../src/data/attributes';
import { WORKOUTS } from '../../src/data/workouts';
import { TrainingTypeCard } from '../../src/components/training/TrainingTypeCard';
import { PrimaryButton } from '../../src/components/ui/PrimaryButton';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
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
import { colors, radii, shadows, spacing } from '../../src/theme/theme';

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
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Training log</Text>
        <Text style={styles.title}>Turn today's workout into XP</Text>
        <Text style={styles.subtitle}>
          Pick the real session you completed, choose intensity, and your build
          updates instantly.
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <StatPill label="Current OVR" value={ovr} color={colors.gold} />
        <StatPill label="Level" value={levelInfo.level} color={colors.green} />
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Workout type"
          subtitle="Each session targets a different part of the build."
          color={selectedWorkout.accentColor}
        />
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
        <SectionHeader title="Intensity" color={colors.gold} />
        <View style={styles.intensityRow}>
          {intensityOptions.map((option) => {
            const selected = option === intensity;
            const config = INTENSITY_CONFIG[option];

            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                onPress={() => setIntensity(option)}
                style={[
                  styles.intensityButton,
                  selected && {
                    borderColor: selectedWorkout.accentColor,
                    backgroundColor: `${selectedWorkout.accentColor}18`
                  }
                ]}
              >
                <Text
                  style={[
                    styles.intensityLabel,
                    selected && { color: selectedWorkout.accentColor }
                  ]}
                >
                  {config.label}
                </Text>
                <Text style={styles.intensityMeta}>+{config.xp} XP</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <PrimaryButton
        label={`Log ${INTENSITY_CONFIG[intensity].label} Workout`}
        icon="add-circle"
        onPress={handleLogWorkout}
      />

      {lastResult ? (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultKicker}>Progress gained</Text>
            <Text style={styles.resultXp}>
              +{lastResult.workoutXpGained + lastResult.questXpGained} XP
            </Text>
          </View>
          <View style={styles.resultStats}>
            <StatPill
              label="Workout XP"
              value={`+${lastResult.workoutXpGained}`}
              color={resultColor}
            />
            <StatPill
              label="Quest XP"
              value={`+${lastResult.questXpGained}`}
              color={colors.gold}
            />
          </View>
          <View style={styles.gainWrap}>
            {gainEntries.map(([key, gain]) => (
              <View key={key} style={styles.gainPill}>
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
                <Text key={quest.id} style={styles.questResultText}>
                  {quest.title} · +{quest.rewardXp} XP
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
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
  },
  intensityRow: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  intensityButton: {
    flex: 1,
    minHeight: 72,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm
  },
  intensityLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900'
  },
  intensityMeta: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800'
  },
  resultCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.panelElevated,
    padding: spacing.xl,
    gap: spacing.lg,
    ...shadows.card
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg
  },
  resultKicker: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  resultXp: {
    color: colors.gold,
    fontSize: 28,
    fontWeight: '900'
  },
  resultStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md
  },
  gainWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  gainPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md
  },
  gainLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800'
  },
  gainValue: {
    fontSize: 12,
    fontWeight: '900'
  },
  questResult: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.lg,
    gap: spacing.xs
  },
  questResultTitle: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  questResultText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700'
  }
});
