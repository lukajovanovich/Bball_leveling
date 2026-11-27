import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '../src/components/ui/PrimaryButton';
import { ScreenContainer } from '../src/components/ui/ScreenContainer';
import { ScreenHeader } from '../src/components/ui/ScreenHeader';
import { readTrainingDescription } from '../src/lib/aiTraining';
import {
  INTENSITY_CONFIG,
  formatWorkoutName,
  getDailyWorkoutStatus,
  getWorkoutAvailability
} from '../src/lib/progression';
import { MAX_TRAINING_TEXT_LENGTH, ParsedWorkout } from '../src/lib/trainingParser';
import { usePlan } from '../src/store/PlanContext';
import { useProgress } from '../src/store/ProgressContext';
import { colors, fonts, radii, spacing } from '../src/theme/theme';
import { WorkoutIntensity } from '../src/types';

const INTENSITIES: WorkoutIntensity[] = ['light', 'medium', 'hard'];

export default function DescribeTrainingScreen() {
  const { isPremium, isLoadingPlan } = usePlan();
  const { state, logWorkouts } = useProgress();
  const [text, setText] = useState('');
  const [reading, setReading] = useState(false);
  const [workouts, setWorkouts] = useState<ParsedWorkout[] | null>(null);
  const [demo, setDemo] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const daily = getDailyWorkoutStatus(state.trainingSessions);

  const read = async () => {
    setReading(true);
    setError(null);
    setMessage(null);
    const result = await readTrainingDescription(text);
    setReading(false);

    if (!result.ok) {
      setError(result.message);
      setWorkouts(null);
      return;
    }

    setWorkouts(result.workouts);
    setDemo(result.demo);
  };

  const update = (index: number, change: Partial<ParsedWorkout> | null) => {
    setWorkouts((current) =>
      (current ?? []).flatMap((item, itemIndex) =>
        itemIndex !== index ? [item] : change === null ? [] : [{ ...item, ...change }]
      )
    );
  };

  const logAll = () => {
    if (!workouts?.length) {
      return;
    }

    const results = logWorkouts(workouts);
    const logged = results.filter(Boolean).length;
    const skipped = workouts.filter((_, index) => !results[index]);

    setMessage(
      [
        `Logged ${logged} workout${logged === 1 ? '' : 's'}.`,
        skipped.length > 0
          ? `Skipped for today's limit: ${skipped
              .map((item) => formatWorkoutName(item.workoutType, item.focus))
              .join('; ')}.`
          : ''
      ]
        .filter(Boolean)
        .join(' ')
    );
    setWorkouts(null);
    setText('');
  };

  return (
    <ScreenContainer>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={() => router.back()}
        style={styles.back}
      >
        <Ionicons name="chevron-back" size={20} color={colors.textMuted} />
        <Text style={styles.backText}>Train</Text>
      </Pressable>

      <ScreenHeader
        title="Describe your training"
        subtitle="Write it like you'd tell your coach. You check everything before it's logged."
      />

      {!isPremium ? (
        <View style={styles.locked}>
          <Text style={styles.lockedTitle}>
            {isLoadingPlan ? 'Checking your plan...' : 'Part of Premium'}
          </Text>
          <Text style={styles.lockedText}>
            Tell the app what you did in your own words, like "100 mid-range shots, 50
            threes, then three games to 21", and it fills in the workouts for you.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.field}>
            <TextInput
              accessibilityLabel="What did you train today?"
              multiline
              maxLength={MAX_TRAINING_TEXT_LENGTH}
              onChangeText={setText}
              placeholder="Today I shot 100 mid-range and 50 threes, then played 3 games to 21. I was best on defense."
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
              textAlignVertical="top"
              value={text}
            />
            <Text style={styles.counter}>
              {text.length} / {MAX_TRAINING_TEXT_LENGTH}
            </Text>
          </View>

          <PrimaryButton
            label={reading ? 'Reading...' : 'Read my training'}
            disabled={reading || !text.trim()}
            onPress={() => {
              void read();
            }}
          />
        </>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}

      {workouts ? (
        <View style={styles.results}>
          <Text style={styles.resultsTitle}>
            {workouts.length > 0 ? "Here's what I understood" : 'No workouts found'}
          </Text>
          {demo ? (
            <Text style={styles.demo}>
              Demo reading: simple keyword matching until the AI is switched on.
            </Text>
          ) : null}
          {workouts.length === 0 ? (
            <Text style={styles.lockedText}>
              Try naming what you worked on, like shooting, defense or a pickup game.
            </Text>
          ) : null}

          {workouts.map((workout, index) => {
            const locked = getWorkoutAvailability(daily, workout.workoutType) === 'locked';

            return (
              <View key={workout.workoutType} style={styles.entry}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>
                    {formatWorkoutName(workout.workoutType, workout.focus)}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${formatWorkoutName(
                      workout.workoutType,
                      workout.focus
                    )}`}
                    onPress={() => update(index, null)}
                    hitSlop={8}
                  >
                    <Ionicons name="close" size={18} color={colors.textMuted} />
                  </Pressable>
                </View>
                {workout.note ? <Text style={styles.entryNote}>{workout.note}</Text> : null}
                {locked ? (
                  <Text style={styles.entryLocked}>Already done today, will be skipped</Text>
                ) : null}
                <View style={styles.segmented}>
                  {INTENSITIES.map((intensity) => {
                    const selected = workout.intensity === intensity;

                    return (
                      <Pressable
                        key={intensity}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => update(index, { intensity })}
                        style={[styles.segment, selected && styles.segmentSelected]}
                      >
                        <Text
                          style={[styles.segmentText, selected && styles.segmentTextSelected]}
                        >
                          {INTENSITY_CONFIG[intensity].label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}

          {workouts.length > 0 ? (
            <PrimaryButton
              label={`Log ${workouts.length} workout${workouts.length === 1 ? '' : 's'}`}
              onPress={logAll}
            />
          ) : null}
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
    marginBottom: -spacing.md
  },
  backText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 15
  },
  locked: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs
  },
  lockedTitle: {
    color: colors.gold,
    fontFamily: fonts.display,
    fontSize: 22
  },
  lockedText: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20
  },
  field: {
    gap: spacing.xs
  },
  input: {
    minHeight: 140,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    color: colors.text,
    padding: spacing.md,
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 22
  },
  counter: {
    alignSelf: 'flex-end',
    color: colors.textSubtle,
    fontFamily: fonts.body,
    fontSize: 12
  },
  error: {
    color: colors.red,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 20
  },
  message: {
    color: colors.success,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 20
  },
  results: {
    gap: spacing.md
  },
  resultsTitle: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 24
  },
  demo: {
    color: colors.textSubtle,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18
  },
  entry: {
    borderRadius: radii.lg,
    backgroundColor: colors.panel,
    padding: spacing.lg,
    gap: spacing.sm
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md
  },
  entryTitle: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    lineHeight: 20
  },
  entryNote: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18
  },
  entryLocked: {
    color: colors.textSubtle,
    fontFamily: fonts.bodyMedium,
    fontSize: 12
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: radii.md,
    backgroundColor: colors.backgroundSoft,
    padding: spacing.xs,
    gap: spacing.xs
  },
  segment: {
    flex: 1,
    minHeight: 36,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center'
  },
  segmentSelected: {
    backgroundColor: colors.panelHighlight
  },
  segmentText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 13
  },
  segmentTextSelected: {
    color: colors.text
  }
});
