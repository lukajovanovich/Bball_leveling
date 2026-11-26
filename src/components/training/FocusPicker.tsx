import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WorkoutFocusOption } from '../../types';
import { colors, fonts, radii, spacing } from '../../theme/theme';

interface FocusPickerProps {
  options: WorkoutFocusOption[];
  selected: readonly string[];
  onToggle: (id: string) => void;
}

export const FocusPicker = ({ options, selected, onToggle }: FocusPickerProps) => (
  <View style={styles.container}>
    <Text style={styles.hint}>
      {selected.length === 0
        ? 'Pick what you focused on, or leave it empty for a full session.'
        : 'Gains go to what you picked.'}
    </Text>
    <View style={styles.chips}>
      {options.map((option) => {
        const checked = selected.includes(option.id);

        return (
          <Pressable
            key={option.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            accessibilityLabel={option.label}
            onPress={() => onToggle(option.id)}
            style={({ pressed }) => [
              styles.chip,
              checked && styles.chipChecked,
              pressed && styles.chipPressed
            ]}
          >
            {checked ? (
              <Ionicons name="checkmark" size={14} color={colors.court} />
            ) : null}
            <Text style={[styles.chipLabel, checked && styles.chipLabelChecked]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm
  },
  hint: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 36,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.md
  },
  chipChecked: {
    borderColor: colors.court,
    backgroundColor: colors.panelElevated
  },
  chipPressed: {
    backgroundColor: colors.panelHighlight
  },
  chipLabel: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 13
  },
  chipLabelChecked: {
    color: colors.text
  }
});
