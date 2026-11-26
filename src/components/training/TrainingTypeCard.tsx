import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WorkoutDefinition } from '../../types';
import { colors, fonts, radii, spacing } from '../../theme/theme';

interface TrainingTypeCardProps {
  workout: WorkoutDefinition;
  selected: boolean;
  onPress: () => void;
}

export const TrainingTypeCard = ({
  workout,
  selected,
  onPress
}: TrainingTypeCardProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ selected }}
    onPress={onPress}
    style={({ pressed }) => [
      styles.card,
      selected && {
        borderColor: workout.accentColor,
        backgroundColor: colors.panelElevated
      },
      pressed && styles.pressed
    ]}
  >
    <Ionicons
      name={workout.icon as keyof typeof Ionicons.glyphMap}
      size={22}
      color={selected ? workout.accentColor : colors.textMuted}
    />
    <View style={styles.copy}>
      <Text style={styles.title}>{workout.title}</Text>
      <Text style={styles.description}>{workout.description}</Text>
    </View>
    <View
      style={[
        styles.radio,
        selected && { borderColor: workout.accentColor }
      ]}
    >
      {selected ? (
        <View style={[styles.radioDot, { backgroundColor: workout.accentColor }]} />
      ) : null}
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.panel,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg
  },
  pressed: {
    backgroundColor: colors.panelElevated
  },
  copy: {
    flex: 1,
    gap: 2
  },
  title: {
    color: colors.text,
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    lineHeight: 20
  },
  description: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center'
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5
  }
});
