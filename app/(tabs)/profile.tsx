import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { MeasurementPicker } from '../../src/components/ui/MeasurementPicker';
import { PrimaryButton } from '../../src/components/ui/PrimaryButton';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
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
  formatWeightMeasurement,
  unitsForSystemOf
} from '../../src/lib/measurements';
import { PREMIUM_PRICE_LABEL } from '../../src/lib/planStore';
import { useAuth } from '../../src/store/AuthContext';
import { usePlan } from '../../src/store/PlanContext';
import { useProgress } from '../../src/store/ProgressContext';
import { colors, fonts, radii, spacing } from '../../src/theme/theme';
import { LengthUnit, WeightUnit } from '../../src/types';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { player, updateProfile, ovr, levelInfo, syncError } = useProgress();
  const { isPremium, isLoadingPlan, changeTestPlan } = usePlan();
  const [planBusy, setPlanBusy] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const switchPlan = async (next: 'free' | 'premium') => {
    setPlanBusy(true);
    setPlanError(null);
    const error = await changeTestPlan(next);
    setPlanError(error);
    setPlanBusy(false);
  };
  const [saved, setSaved] = useState(false);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const setUnitSystem = (unit: LengthUnit | WeightUnit) => {
    setDraft((current) => ({ ...current, ...unitsForSystemOf(unit) }));
  };

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

    // A second save restarts the moment instead of ending it early.
    if (savedTimeoutRef.current) {
      clearTimeout(savedTimeoutRef.current);
    }

    savedTimeoutRef.current = setTimeout(() => {
      savedTimeoutRef.current = null;
      setSaved(false);
    }, 1600);
  };

  // Leaving the screen must not leave the timer running.
  useEffect(
    () => () => {
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
    },
    []
  );

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Profile"
        subtitle="Update your measurements whenever they change. Signed-in players sync to the cloud."
      />

      <View style={styles.summaryRow}>
        <StatPill label="OVR" value={ovr} />
        <StatPill label="Level" value={levelInfo.level} color={colors.gold} />
      </View>

      <View style={[styles.premiumCard, isPremium && styles.premiumCardActive]}>
        <View style={styles.premiumHeader}>
          <Text style={styles.premiumTitle}>
            {isPremium ? "You're on Premium" : 'Premium'}
          </Text>
          {isPremium ? null : <Text style={styles.premiumPrice}>{PREMIUM_PRICE_LABEL}</Text>}
        </View>
        <Text style={styles.premiumText}>
          Describe your training in your own words and the workouts get filled in for you.
        </Text>
        {!user ? (
          <Text style={styles.premiumNote}>Sign in to get Premium.</Text>
        ) : isPremium ? (
          <Pressable
            accessibilityRole="button"
            disabled={planBusy}
            onPress={() => {
              void switchPlan('free');
            }}
            style={({ pressed }) => [styles.planSecondary, pressed && styles.planSecondaryPressed]}
          >
            <Text style={styles.planSecondaryText}>
              {planBusy ? 'Cancelling...' : 'Cancel Premium'}
            </Text>
          </Pressable>
        ) : (
          <PrimaryButton
            label={planBusy ? 'Upgrading...' : 'Upgrade to Premium'}
            disabled={planBusy || isLoadingPlan}
            onPress={() => {
              void switchPlan('premium');
            }}
          />
        )}
        {user ? (
          <Text style={styles.premiumNote}>Test mode: no payment is taken yet.</Text>
        ) : null}
        {planError ? <Text style={styles.syncError}>{planError}</Text> : null}
      </View>

      <View style={styles.formCard}>
        <SectionHeader title="Player details" />

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
            onUnitChange={(unit) => setUnitSystem(unit as LengthUnit)}
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
            onUnitChange={(unit) => setUnitSystem(unit as LengthUnit)}
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
            onUnitChange={(unit) => setUnitSystem(unit as WeightUnit)}
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
          <Text style={styles.label}>Main goal</Text>
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
          label={saved ? 'Saved' : 'Save profile'}
          icon={saved ? 'checkmark' : undefined}
          onPress={handleSave}
        />
      </View>

      <View style={styles.settingsCard}>
        <SectionHeader title="Settings" />
        {[
          'Training reminders',
          'Season goals',
          'Coach sharing'
        ].map((setting) => (
          <View key={setting} style={styles.settingRow}>
            <Text style={styles.settingTitle}>{setting}</Text>
            <Text style={styles.settingStatus}>Coming soon</Text>
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
            label={signingOut ? 'Signing out...' : 'Sign out'}
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
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg
  },
  premiumCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(242,207,107,0.35)',
    padding: spacing.lg,
    gap: spacing.md
  },
  premiumCardActive: {
    borderColor: colors.border
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  premiumTitle: {
    color: colors.gold,
    fontFamily: fonts.displayBold,
    fontSize: 26
  },
  premiumPrice: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 20
  },
  premiumText: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20
  },
  premiumNote: {
    color: colors.textSubtle,
    fontFamily: fonts.body,
    fontSize: 12
  },
  planSecondary: {
    minHeight: 46,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center'
  },
  planSecondaryPressed: {
    backgroundColor: colors.panel
  },
  planSecondaryText: {
    color: colors.text,
    fontFamily: fonts.bodySemiBold,
    fontSize: 15
  },
  formCard: {
    borderRadius: radii.xl,
    backgroundColor: colors.panel,
    padding: spacing.lg,
    gap: spacing.lg
  },
  field: {
    gap: spacing.sm
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 13
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
    fontFamily: fonts.bodyMedium,
    fontSize: 16
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
    minHeight: 38,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  positionChipSelected: {
    borderColor: colors.court,
    backgroundColor: 'rgba(224,123,57,0.12)'
  },
  positionText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyMedium,
    fontSize: 14
  },
  positionTextSelected: {
    color: colors.text
  },
  settingsCard: {
    borderRadius: radii.xl,
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
    fontFamily: fonts.body,
    fontSize: 15
  },
  settingStatus: {
    color: colors.textSubtle,
    fontFamily: fonts.bodyMedium,
    fontSize: 14
  },
  settingStatusLive: {
    color: colors.success
  },
  settingStatusOff: {
    color: colors.textSubtle
  },
  syncError: {
    color: colors.red,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18
  }
});
