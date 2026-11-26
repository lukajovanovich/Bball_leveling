import React, { Dispatch, SetStateAction } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MeasurementPicker } from '../ui/MeasurementPicker';
import { PLAYER_ARCHETYPES, PLAYER_POSITIONS } from '../../data/playerOptions';
import {
  HEIGHT_RANGE_CM,
  LENGTH_UNIT_OPTIONS,
  WEIGHT_RANGE_KG,
  WEIGHT_UNIT_OPTIONS,
  WINGSPAN_RANGE_CM,
  buildLengthOptions,
  buildWeightOptions,
  createDefaultMeasurements,
  formatLengthMeasurement,
  formatWeightMeasurement,
  unitsForSystemOf
} from '../../lib/measurements';
import { PendingSignupProfile } from '../../lib/pendingSignup';
import { colors, fonts, radii, spacing } from '../../theme/theme';
import { LengthUnit, WeightUnit } from '../../types';

export type PlayerSetupDraft = PendingSignupProfile;

export const createPlayerSetupDraft = (name = ''): PlayerSetupDraft => ({
  name,
  ...createDefaultMeasurements(),
  position: PLAYER_POSITIONS[0],
  archetype: PLAYER_ARCHETYPES[0],
  mainGoal: ''
});

export const isPlayerSetupComplete = (draft: PlayerSetupDraft) =>
  draft.name.trim().length > 0 &&
  draft.heightCm > 0 &&
  draft.wingspanCm > 0 &&
  draft.weightKg > 0 &&
  draft.mainGoal.trim().length > 0;

interface PlayerSetupFieldsProps {
  draft: PlayerSetupDraft;
  /** A state setter: updates are applied to the latest draft. */
  onChange: Dispatch<SetStateAction<PlayerSetupDraft>>;
}

/** Name, measurements, position, archetype and goal for a new player. */
export const PlayerSetupFields = ({ draft, onChange }: PlayerSetupFieldsProps) => {
  const setField = <Key extends keyof PlayerSetupDraft>(
    key: Key,
    value: PlayerSetupDraft[Key]
  ) => {
    onChange((current) => ({ ...current, [key]: value }));
  };

  const setUnitSystem = (unit: LengthUnit | WeightUnit) => {
    onChange((current) => ({ ...current, ...unitsForSystemOf(unit) }));
  };

  const chips = (
    options: readonly string[],
    selectedValue: string,
    onSelect: (value: string) => void
  ) => (
    <View style={styles.chipWrap}>
      {options.map((option) => {
        const selected = selectedValue === option;

        return (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onSelect(option)}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <>
      <View style={styles.field}>
        <Text style={styles.label}>Player name</Text>
        <TextInput
          onChangeText={(value) => setField('name', value)}
          placeholder="Name on your jersey"
          placeholderTextColor={colors.textSubtle}
          style={styles.input}
          value={draft.name}
        />
      </View>

      <MeasurementPicker
        helperText="Switch units, then scroll to your height."
        label="Height"
        onUnitChange={(value) => setUnitSystem(value as LengthUnit)}
        onValueChange={(value) => setField('heightCm', value)}
        options={buildLengthOptions(draft.heightUnit, HEIGHT_RANGE_CM)}
        selectedUnit={draft.heightUnit}
        selectedValue={draft.heightCm}
        unitOptions={LENGTH_UNIT_OPTIONS}
        valueLabel={formatLengthMeasurement(draft.heightCm, draft.heightUnit)}
      />

      <MeasurementPicker
        helperText="Fingertip to fingertip with your arms out."
        label="Wingspan"
        onUnitChange={(value) => setUnitSystem(value as LengthUnit)}
        onValueChange={(value) => setField('wingspanCm', value)}
        options={buildLengthOptions(draft.wingspanUnit, WINGSPAN_RANGE_CM)}
        selectedUnit={draft.wingspanUnit}
        selectedValue={draft.wingspanCm}
        unitOptions={LENGTH_UNIT_OPTIONS}
        valueLabel={formatLengthMeasurement(draft.wingspanCm, draft.wingspanUnit)}
      />

      <MeasurementPicker
        helperText="Your current body weight."
        label="Weight"
        onUnitChange={(value) => setUnitSystem(value as WeightUnit)}
        onValueChange={(value) => setField('weightKg', value)}
        options={buildWeightOptions(draft.weightUnit, WEIGHT_RANGE_KG)}
        selectedUnit={draft.weightUnit}
        selectedValue={draft.weightKg}
        unitOptions={WEIGHT_UNIT_OPTIONS}
        valueLabel={formatWeightMeasurement(draft.weightKg, draft.weightUnit)}
      />

      <View style={styles.field}>
        <Text style={styles.label}>Position</Text>
        {chips(PLAYER_POSITIONS, draft.position, (value) => setField('position', value))}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Archetype</Text>
        {chips(PLAYER_ARCHETYPES, draft.archetype, (value) =>
          setField('archetype', value)
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Main goal</Text>
        <TextInput
          multiline
          onChangeText={(value) => setField('mainGoal', value)}
          placeholder="What kind of player do you want to become?"
          placeholderTextColor={colors.textSubtle}
          style={[styles.input, styles.goalInput]}
          textAlignVertical="top"
          value={draft.mainGoal}
        />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  field: {
    gap: spacing.sm
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 14
  },
  input: {
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.bodyMedium,
    fontSize: 16
  },
  goalInput: {
    minHeight: 96,
    paddingTop: spacing.md,
    paddingBottom: spacing.md
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  chip: {
    minHeight: 38,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  chipSelected: {
    borderColor: colors.court,
    backgroundColor: 'rgba(224,123,57,0.12)'
  },
  chipText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 14
  },
  chipTextSelected: {
    color: colors.text
  }
});
