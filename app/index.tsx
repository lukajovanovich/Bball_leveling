import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { MeasurementPicker } from '../src/components/ui/MeasurementPicker';
import { PrimaryButton } from '../src/components/ui/PrimaryButton';
import {
  PLAYER_ARCHETYPES,
  PLAYER_POSITIONS
} from '../src/data/playerOptions';
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
  formatWeightMeasurement
} from '../src/lib/measurements';
import { formatNameFromEmail } from '../src/lib/playerIdentity';
import { useAuth } from '../src/store/AuthContext';
import { useProgress } from '../src/store/ProgressContext';
import { colors, fonts, radii, spacing } from '../src/theme/theme';
import { LengthUnit, WeightUnit } from '../src/types';

type AuthMode = 'signin' | 'signup';
type SignupDraft = {
  name: string;
  heightCm: number;
  heightUnit: LengthUnit;
  wingspanCm: number;
  wingspanUnit: LengthUnit;
  weightKg: number;
  weightUnit: WeightUnit;
  position: string;
  archetype: string;
  mainGoal: string;
};

const defaultSignupDraft: SignupDraft = {
  name: '',
  ...createDefaultMeasurements(),
  position: PLAYER_POSITIONS[0],
  archetype: PLAYER_ARCHETYPES[0],
  mainGoal: ''
};

export default function LoginScreen() {
  const {
    session,
    isConfigured,
    isLoading: isAuthLoading,
    signIn,
    signUp
  } = useAuth();
  const { isHydrating } = useProgress();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupDraft, setSignupDraft] = useState<SignupDraft>(defaultSignupDraft);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const canCreateAccount =
    email.trim().length > 0 &&
    password.trim().length > 0 &&
    signupDraft.name.trim().length > 0 &&
    signupDraft.heightCm > 0 &&
    signupDraft.wingspanCm > 0 &&
    signupDraft.weightKg > 0 &&
    signupDraft.mainGoal.trim().length > 0;
  const isBusy = submitting || isAuthLoading || (Boolean(session) && isHydrating);
  const heightOptions = buildLengthOptions(signupDraft.heightUnit, HEIGHT_RANGE_CM);
  const wingspanOptions = buildLengthOptions(
    signupDraft.wingspanUnit,
    WINGSPAN_RANGE_CM
  );
  const weightOptions = buildWeightOptions(signupDraft.weightUnit, WEIGHT_RANGE_KG);

  useEffect(() => {
    if (session && !isAuthLoading && !isHydrating) {
      router.replace('/home');
    }
  }, [isAuthLoading, isHydrating, session]);

  const setSignupField = <Key extends keyof SignupDraft>(
    key: Key,
    value: SignupDraft[Key]
  ) => {
    setSignupDraft((current) => ({
      ...current,
      [key]: value
    }));
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setErrorMessage(null);
    setStatusMessage(null);

    if (nextMode === 'signup') {
      const suggestedName = formatNameFromEmail(email);

      if (suggestedName && !signupDraft.name.trim()) {
        setSignupField('name', suggestedName);
      }
    }
  };

  const handlePrimaryAction = async () => {
    setSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    if (mode === 'signup') {
      if (!canCreateAccount) {
        setSubmitting(false);
        return;
      }

      const result = await signUp(email, password, signupDraft);

      if (!result.success) {
        setErrorMessage(result.message ?? 'Unable to create this account right now.');
        setSubmitting(false);
        return;
      }

      setStatusMessage(
        result.message ?? 'Account created. Loading your player build...'
      );
      setSubmitting(false);
      return;
    }

    const result = await signIn(email, password);

    if (!result.success) {
      setErrorMessage(result.message ?? 'Unable to sign in right now.');
      setSubmitting(false);
      return;
    }

    setStatusMessage('Signed in. Loading your saved player build...');
    setSubmitting(false);
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
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardArea}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>
              <View style={styles.brandRow}>
                <Ionicons name="basketball" size={30} color={colors.court} />
                <Text style={styles.brand}>Bball Leveling</Text>
              </View>

              <View style={styles.intro}>
                <Text accessibilityRole="header" style={styles.title}>
                  {mode === 'signin' ? 'Sign in to your build' : 'Create your player'}
                </Text>
                <Text style={styles.introText}>
                  {mode === 'signin'
                    ? 'Your ratings, quests and training history load right where you left them.'
                    : 'Every rating starts at 0 and can reach 99. Log real workouts to raise them.'}
                </Text>
              </View>

              <View style={styles.modeSwitch}>
                {(['signin', 'signup'] as const).map((option) => {
                  const selected = mode === option;

                  return (
                    <Pressable
                      key={option}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => switchMode(option)}
                      style={[styles.modeButton, selected && styles.modeButtonActive]}
                    >
                      <Text
                        style={[
                          styles.modeButtonText,
                          selected && styles.modeButtonTextActive
                        ]}
                      >
                        {option === 'signin' ? 'Sign in' : 'Sign up'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.form}>
                <View style={styles.field}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.textSubtle}
                    style={styles.input}
                    textContentType="emailAddress"
                    value={email}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Password</Text>
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={setPassword}
                    placeholder={
                      mode === 'signin' ? 'Your password' : 'Choose a password'
                    }
                    placeholderTextColor={colors.textSubtle}
                    secureTextEntry
                    style={styles.input}
                    textContentType={mode === 'signin' ? 'password' : 'newPassword'}
                    value={password}
                  />
                </View>

                {mode === 'signup' ? (
                  <View style={styles.setup}>
                    <View style={styles.setupHeader}>
                      <Text style={styles.setupTitle}>Player setup</Text>
                      <Text style={styles.setupSubtitle}>
                        You can change your measurements later in Profile.
                      </Text>
                    </View>

                    <View style={styles.field}>
                      <Text style={styles.label}>Player name</Text>
                      <TextInput
                        onChangeText={(value) => setSignupField('name', value)}
                        placeholder="Name on your jersey"
                        placeholderTextColor={colors.textSubtle}
                        style={styles.input}
                        value={signupDraft.name}
                      />
                    </View>

                    <MeasurementPicker
                      helperText="Switch units, then scroll to your height."
                      label="Height"
                      onUnitChange={(value) =>
                        setSignupField('heightUnit', value as LengthUnit)
                      }
                      onValueChange={(value) => setSignupField('heightCm', value)}
                      options={heightOptions}
                      selectedUnit={signupDraft.heightUnit}
                      selectedValue={signupDraft.heightCm}
                      unitOptions={LENGTH_UNIT_OPTIONS}
                      valueLabel={formatLengthMeasurement(
                        signupDraft.heightCm,
                        signupDraft.heightUnit
                      )}
                    />

                    <MeasurementPicker
                      helperText="Fingertip to fingertip with your arms out."
                      label="Wingspan"
                      onUnitChange={(value) =>
                        setSignupField('wingspanUnit', value as LengthUnit)
                      }
                      onValueChange={(value) => setSignupField('wingspanCm', value)}
                      options={wingspanOptions}
                      selectedUnit={signupDraft.wingspanUnit}
                      selectedValue={signupDraft.wingspanCm}
                      unitOptions={LENGTH_UNIT_OPTIONS}
                      valueLabel={formatLengthMeasurement(
                        signupDraft.wingspanCm,
                        signupDraft.wingspanUnit
                      )}
                    />

                    <MeasurementPicker
                      helperText="Your current body weight."
                      label="Weight"
                      onUnitChange={(value) =>
                        setSignupField('weightUnit', value as WeightUnit)
                      }
                      onValueChange={(value) => setSignupField('weightKg', value)}
                      options={weightOptions}
                      selectedUnit={signupDraft.weightUnit}
                      selectedValue={signupDraft.weightKg}
                      unitOptions={WEIGHT_UNIT_OPTIONS}
                      valueLabel={formatWeightMeasurement(
                        signupDraft.weightKg,
                        signupDraft.weightUnit
                      )}
                    />

                    <View style={styles.field}>
                      <Text style={styles.label}>Position</Text>
                      {chips(PLAYER_POSITIONS, signupDraft.position, (value) =>
                        setSignupField('position', value)
                      )}
                    </View>

                    <View style={styles.field}>
                      <Text style={styles.label}>Archetype</Text>
                      {chips(PLAYER_ARCHETYPES, signupDraft.archetype, (value) =>
                        setSignupField('archetype', value)
                      )}
                    </View>

                    <View style={styles.field}>
                      <Text style={styles.label}>Main goal</Text>
                      <TextInput
                        multiline
                        onChangeText={(value) => setSignupField('mainGoal', value)}
                        placeholder="What kind of player do you want to become?"
                        placeholderTextColor={colors.textSubtle}
                        style={[styles.input, styles.goalInput]}
                        textAlignVertical="top"
                        value={signupDraft.mainGoal}
                      />
                    </View>
                  </View>
                ) : null}

                {!isConfigured ? (
                  <View style={[styles.notice, styles.warningNotice]}>
                    <Ionicons name="construct-outline" size={18} color={colors.gold} />
                    <Text style={styles.noticeText}>
                      Add your Supabase URL and publishable key in `.env` before
                      accounts can work. Guest mode still opens the app locally.
                    </Text>
                  </View>
                ) : null}

                {statusMessage ? (
                  <View style={[styles.notice, styles.successNotice]}>
                    {isBusy ? (
                      <ActivityIndicator size="small" color={colors.success} />
                    ) : (
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={colors.success}
                      />
                    )}
                    <Text style={styles.noticeText}>{statusMessage}</Text>
                  </View>
                ) : null}

                {errorMessage ? (
                  <View style={[styles.notice, styles.errorNotice]}>
                    <Ionicons name="alert-circle" size={18} color={colors.red} />
                    <Text style={styles.noticeText}>{errorMessage}</Text>
                  </View>
                ) : null}

                <PrimaryButton
                  disabled={isBusy || (mode === 'signup' ? !canCreateAccount : false)}
                  label={
                    isBusy
                      ? 'Connecting...'
                      : mode === 'signin'
                        ? 'Sign in'
                        : 'Create account and continue'
                  }
                  onPress={() => {
                    void handlePrimaryAction();
                  }}
                />

                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.replace('/home')}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.secondaryButtonPressed
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>Continue as guest</Text>
                </Pressable>
                <Text style={styles.guestNote}>
                  Guest progress is not saved after you close the app.
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background
  },
  safeArea: {
    flex: 1
  },
  keyboardArea: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center'
  },
  content: {
    width: '100%',
    alignSelf: 'center',
    maxWidth: 460,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
    gap: spacing.xl
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  brand: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 26,
    letterSpacing: 0.2
  },
  intro: {
    gap: spacing.sm
  },
  title: {
    color: colors.text,
    fontFamily: fonts.displayBold,
    fontSize: 42,
    lineHeight: 44
  },
  introText: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 23
  },
  modeSwitch: {
    flexDirection: 'row',
    borderRadius: radii.lg,
    backgroundColor: colors.panel,
    padding: spacing.xs,
    gap: spacing.xs
  },
  modeButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modeButtonActive: {
    backgroundColor: colors.panelHighlight
  },
  modeButtonText: {
    color: colors.textMuted,
    fontFamily: fonts.bodySemiBold,
    fontSize: 15
  },
  modeButtonTextActive: {
    color: colors.text
  },
  form: {
    gap: spacing.lg
  },
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
  setup: {
    gap: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.lg
  },
  setupHeader: {
    gap: 2
  },
  setupTitle: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 24
  },
  setupSubtitle: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20
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
  },
  goalInput: {
    minHeight: 96,
    paddingTop: spacing.md,
    paddingBottom: spacing.md
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radii.md,
    borderLeftWidth: 3,
    backgroundColor: colors.panel,
    padding: spacing.md
  },
  warningNotice: {
    borderLeftColor: colors.gold
  },
  successNotice: {
    borderLeftColor: colors.success
  },
  errorNotice: {
    borderLeftColor: colors.red
  },
  noticeText: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center'
  },
  secondaryButtonPressed: {
    backgroundColor: colors.panel
  },
  secondaryButtonText: {
    color: colors.text,
    fontFamily: fonts.bodySemiBold,
    fontSize: 15
  },
  guestNote: {
    marginTop: -spacing.sm,
    color: colors.textSubtle,
    fontFamily: fonts.body,
    fontSize: 13,
    textAlign: 'center'
  }
});
