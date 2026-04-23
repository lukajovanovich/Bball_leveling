import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { PrimaryButton } from '../../src/components/ui/PrimaryButton';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
import { StatPill } from '../../src/components/ui/StatPill';
import { useProgress } from '../../src/store/ProgressContext';
import { colors, radii, spacing } from '../../src/theme/theme';

const positions = ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center'];

export default function ProfileScreen() {
  const { player, updateProfile, ovr, levelInfo } = useProgress();
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState({
    name: player.name,
    height: player.height,
    position: player.position,
    mainGoal: player.mainGoal
  });

  useEffect(() => {
    setDraft({
      name: player.name,
      height: player.height,
      position: player.position,
      mainGoal: player.mainGoal
    });
  }, [player.height, player.mainGoal, player.name, player.position]);

  const handleSave = () => {
    updateProfile(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Profile</Text>
        <Text style={styles.title}>Shape your player identity</Text>
        <Text style={styles.subtitle}>
          This is mock local profile data for the MVP. It is structured so the
          same fields can later be saved to a user table.
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
          <Text style={styles.label}>Height</Text>
          <TextInput
            value={draft.height}
            onChangeText={(height) => setDraft((current) => ({ ...current, height }))}
            placeholder="6'3&quot;"
            placeholderTextColor={colors.textSubtle}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Position</Text>
          <View style={styles.positionWrap}>
            {positions.map((position) => {
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
          'Unit preferences',
          'Cloud sync',
          'Coach sharing'
        ].map((setting) => (
          <View key={setting} style={styles.settingRow}>
            <Text style={styles.settingTitle}>{setting}</Text>
            <Text style={styles.settingStatus}>Soon</Text>
          </View>
        ))}
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
  }
});
