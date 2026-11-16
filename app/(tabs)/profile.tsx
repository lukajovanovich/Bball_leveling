import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { MeasurementPicker } from '../../src/components/ui/MeasurementPicker';
import { PrimaryButton } from '../../src/components/ui/PrimaryButton';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
import { StatPill } from '../../src/components/ui/StatPill';
import {
  PLAYER_ARCHETYPES,
  PLAYER_POSITIONS
} from '../../src/data/playerOptions';
import {
  HEIGHT_RANGE_CM,
  LENGTH_UNIT_OPTIONS,
  WEIGHT_RANGE_KG,
  WEIGHT_UNIT_OPTIONS,
  WINGSPAN_RANGE_CM,
  buildLengthOptions,
  buildWeightOptions,
  formatLengthMeasurement,
  formatWeightMeasurement
} from '../../src/lib/measurements';
import { useAuth } from '../../src/store/AuthContext';
import { useProgress } from '../../src/store/ProgressContext';
import { colors, radii, spacing } from '../../src/theme/theme';
import { LengthUnit, WeightUnit } from '../../src/types';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { player, updateProfile, ovr, levelInfo, syncError } = useProgress();
  const [saved, setSaved] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [draft, setDraft] = useState({
    name: player.name,
    heightCm: player.heightCm,
    heightUnit: player.heightUnit,
    wingspanCm: player.wingspanCm,
    wingspanUnit: player.wingspanUnit,
    weightKg: player.weightKg,
    weightUnit: player.weightUnit,
    position: player.position,
    mainGoal: player.mainGoal,
    archetype: player.archetype
  });
  const heightOptions = buildLengthOptions(draft.heightUnit, HEIGHT_RANGE_CM);
  const wingspanOptions = buildLengthOptions(draft.wingspanUnit, WINGSPAN_RANGE_CM);
  const weightOptions = buildWeightOptions(draft.weightUnit, WEIGHT_RANGE_KG);

  useEffect(() => {
    setDraft({
      name: player.name,
      heightCm: player.heightCm,
      heightUnit: player.heightUnit,
      wingspanCm: player.wingspanCm,
      wingspanUnit: player.wingspanUnit,
      weightKg: player.weightKg,
      weightUnit: player.weightUnit,
      position: player.position,
      mainGoal: player.mainGoal,
      archetype: player.archetype
    });
  }, [
    player.archetype,
    player.heightCm,
    player.heightUnit,
    player.mainGoal,
    player.name,
    player.position,
    player.weightKg,
    player.weightUnit,
    player.wingspanCm,
    player.wingspanUnit
  ]);

  const handleSave = () => {
    // Blank text fields fall back to the saved value instead of being stored empty.
    const nextDraft = {
      ...draft,
      name: draft.name.trim() || player.name,
      mainGoal: draft.mainGoal.trim() || player.mainGoal
    };

    setDraft(nextDraft);
    updateProfile(nextDraft);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Profile</Text>
        <Text style={styles.title}>Shape your player identity</Text>
        <Text style={styles.subtitle}>
          Profile edits update your current player build, and signed-in users can
          sync that data through Supabase. Height, weight, and wingspan stay
          editable any time.
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <StatPill label="OVR" value={ovr} color={colors.gold} />
        <StatPill label="Level" value={levelInfo.level} color={colors.green} />
      </View>

      <View style={styles.formCard}>
        <SectionHeader title="Player details" color={colors.blue} />

        <View style={styles.field}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            value={draft.name}
            onChangeText={(name) => setDraft((current) => ({ ...current, name }))}
            placeholder="Player name"
            placeholderTextColor={colors.textSubtle}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <MeasurementPicker
            helperText="Open the menu, scroll up or down, and save the height that fits now."
            label="Height"
            onUnitChange={(heightUnit) =>
              setDraft((current) => ({
                ...current,
                heightUnit: heightUnit as LengthUnit
              }))
            }
            onValueChange={(heightCm) =>
              setDraft((current) => ({ ...current, heightCm }))
            }
            options={heightOptions}
            selectedUnit={draft.heightUnit}
            selectedValue={draft.heightCm}
            unitOptions={LENGTH_UNIT_OPTIONS}
            valueLabel={formatLengthMeasurement(draft.heightCm, draft.heightUnit)}
          />
        </View>

        <View style={styles.field}>
          <MeasurementPicker
            helperText="Adjust reach whenever your build changes."
            label="Wingspan"
            onUnitChange={(wingspanUnit) =>
              setDraft((current) => ({
                ...current,
                wingspanUnit: wingspanUnit as LengthUnit
              }))
            }
            onValueChange={(wingspanCm) =>
              setDraft((current) => ({ ...current, wingspanCm }))
            }
            options={wingspanOptions}
            selectedUnit={draft.wingspanUnit}
            selectedValue={draft.wingspanCm}
            unitOptions={LENGTH_UNIT_OPTIONS}
            valueLabel={formatLengthMeasurement(
              draft.wingspanCm,
              draft.wingspanUnit
            )}
          />
        </View>

        <View style={styles.field}>
          <MeasurementPicker
            helperText="Update weight anytime if the player gets bigger or leaner."
            label="Weight"
            onUnitChange={(weightUnit) =>
              setDraft((current) => ({
                ...current,
                weightUnit: weightUnit as WeightUnit
              }))
            }
            onValueChange={(weightKg) =>
              setDraft((current) => ({ ...current, weightKg }))
            }
            options={weightOptions}
            selectedUnit={draft.weightUnit}
            selectedValue={draft.weightKg}
            unitOptions={WEIGHT_UNIT_OPTIONS}
            valueLabel={formatWeightMeasurement(draft.weightKg, draft.weightUnit)}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Position</Text>
          <View style={styles.positionWrap}>
            {PLAYER_POSITIONS.map((position) => {
              const selected = draft.position === position;

              return (
                <Pressable
                  key={position}
                  accessibilityRole="button"
                  onPress={() => setDraft((current) => ({ ...current, position }))}
                  style={[
                    styles.positionChip,
                    selected && styles.positionChipSelected
                  ]}
                >
                  <Text
                    style={[
                      styles.positionText,
                      selected && styles.positionTextSelected
                    ]}
                  >
                    {position}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Archetype</Text>
          <View style={styles.positionWrap}>
            {PLAYER_ARCHETYPES.map((archetype) => {
              const selected = draft.archetype === archetype;

              return (
                <Pressable
                  key={archetype}
                  accessibilityRole="button"
                  onPress={() =>
                    setDraft((current) => ({ ...current, archetype }))
                  }
                  style={[
                    styles.positionChip,
                    selected && styles.positionChipSelected
                  ]}
                >
                  <Text
                    style={[
                      styles.positionText,
                      selected && styles.positionTextSelected
                    ]}
                  >
                    {archetype}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Main Goal</Text>
          <TextInput
            value={draft.mainGoal}
            onChangeText={(mainGoal) =>
              setDraft((current) => ({ ...current, mainGoal }))
            }
            placeholder="Main basketball goal"
            placeholderTextColor={colors.textSubtle}
            multiline
            style={[styles.input, styles.goalInput]}
          />
        </View>

        <PrimaryButton
          label={saved ? 'Saved' : 'Save Profile'}
          icon={saved ? 'checkmark-circle' : 'save'}
          onPress={handleSave}
        />
      </View>

      <View style={styles.settingsCard}>
        <SectionHeader title="Settings" color={colors.purple} />
        {[
          'Training reminders',
          'Season goals',
          'Coach sharing'
        ].map((setting) => (
          <View key={setting} style={styles.settingRow}>
            <Text style={styles.settingTitle}>{setting}</Text>
            <Text style={styles.settingStatus}>Soon</Text>
          </View>
        ))}
        <View style={styles.settingRow}>
          <Text style={styles.settingTitle}>Cloud sync</Text>
          <Text
            style={[
              styles.settingStatus,
              user && !syncError ? styles.settingStatusLive : styles.settingStatusOff
            ]}
          >
            {user ? (syncError ? 'Issue' : 'Connected') : 'Guest'}
          </Text>
        </View>
        {user ? (
          <PrimaryButton
            disabled={signingOut}
            label={signingOut ? 'Signing Out...' : 'Sign Out'}
            icon="log-out"
            onPress={() => {
              setSigningOut(true);
              void signOut().then((result) => {
                setSigningOut(false);

                if (result.success) {
                  router.replace('/');
                }
              });
            }}
          />
        ) : null}
        {syncError ? (
          <Text style={styles.syncError}>
            Sync issue: {syncError}
          </Text>
        ) : null}
      </View>
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
  formCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    padding: spacing.lg,
    gap: spacing.lg
  },
  field: {
    gap: spacing.sm
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900'
  },
  input: {
    minHeight: 50,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    fontWeight: '700'
  },
  goalInput: {
    minHeight: 96,
    textAlignVertical: 'top'
  },
  positionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  positionChip: {
    minHeight: 40,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  positionChipSelected: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(248,214,109,0.12)'
  },
  positionText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '900'
  },
  positionTextSelected: {
    color: colors.gold
  },
  settingsCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    padding: spacing.lg,
    gap: spacing.md
  },
  settingRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  settingTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800'
  },
  settingStatus: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  settingStatusLive: {
    color: colors.success
  },
  settingStatusOff: {
    color: colors.textSubtle
  },
  syncError: {
    color: colors.red,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700'
  }
});
