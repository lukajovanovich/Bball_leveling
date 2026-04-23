import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WorkoutDefinition } from '../../types';
import { colors, radii, spacing } from '../../theme/theme';

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
    onPress={onPress}
    style={({ pressed }) => [
      styles.card,
      selected && {
        borderColor: workout.accentColor,
        backgroundColor: 'rgba(255,255,255,0.07)'
      },
      pressed && styles.pressed
    ]}
  >
    <View style={[styles.iconShell, { backgroundColor: `${workout.accentColor}20` }]}>
      <Ionicons
        name={workout.icon as keyof typeof Ionicons.glyphMap}
        size={22}
        color={workout.accentColor}
      />
    </View>
    <View style={styles.copy}>
      <Text style={styles.title}>{workout.title}</Text>
      <Text style={styles.description}>{workout.description}</Text>
    </View>
    {selected ? (
      <Ionicons name="checkmark-circle" size={22} color={workout.accentColor} />
    ) : null}
  </Pressable>
);

const styles = StyleSheet.create({
  card: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    padding: spacing.lg
  },
  pressed: {
    transform: [{ scale: 0.99 }]
  },
  iconShell: {
    width: 46,
    height: 46,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  copy: {
    flex: 1,
    gap: 4
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900'
  },
  description: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600'
  }
});
