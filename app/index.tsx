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
import { LinearGradient } from 'expo-linear-gradient';
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
import { colors, radii, shadows, spacing } from '../src/theme/theme';
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

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#06070C', '#0B0D18', '#05070D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.topGlow} />
      <View style={styles.bottomGlow} />

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
              <LinearGradient
                colors={['rgba(20,25,40,0.96)', 'rgba(13,17,28,0.98)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.authCard,
                  mode === 'signup' && styles.authCardExpanded
                ]}
              >
                <View style={styles.brandRow}>
                  <View style={styles.brandIcon}>
                    <Ionicons name="basketball" size={22} color={colors.black} />
                  </View>
                  <View style={styles.brandTextWrap}>
                    <Text style={styles.brand}>Bball Leveling</Text>
                    <Text style={styles.brandSubcopy}>Supabase auth enabled</Text>
                  </View>
                </View>

                <View style={styles.authHeader}>
                  <View style={styles.authHeaderCopy}>
                    <Text style={styles.authEyebrow}>
                      {mode === 'signin' ? 'Welcome back' : 'Create your access'}
                    </Text>
                    <Text style={styles.authTitle}>
                      {mode === 'signin'
                        ? 'Sign in to your build'
                        : 'Create account and setup your player'}
                    </Text>
                  </View>
                  <View style={styles.demoBadge}>
                    <Text style={styles.demoBadgeText}>
                      {isConfigured ? 'Cloud ready' : 'Setup needed'}
                    </Text>
                  </View>
                </View>

                <View style={styles.modeSwitch}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => switchMode('signin')}
                    style={[
                      styles.modeButton,
                      mode === 'signin' && styles.modeButtonActive
                    ]}
                  >
                    <Text
                      style={[
                        styles.modeButtonText,
                        mode === 'signin' && styles.modeButtonTextActive
                      ]}
                    >
                      Sign in
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() => switchMode('signup')}
                    style={[
                      styles.modeButton,
                      mode === 'signup' && styles.modeButtonActive
                    ]}
                  >
                    <Text
                      style={[
                        styles.modeButtonText,
                        mode === 'signup' && styles.modeButtonTextActive
                      ]}
                    >
                      Sign up
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.form}>
                  <View style={styles.field}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      onChangeText={setEmail}
                      placeholder="player@bballleveling.com"
                      placeholderTextColor={colors.textSubtle}
                      style={styles.input}
                      textContentType="emailAddress"
                      value={email}
                    />
                  </View>

                  <View style={styles.field}>
                    <View style={styles.labelRow}>
                      <Text style={styles.label}>Password</Text>
                      <Text style={styles.helperText}>Supabase auth</Text>
                    </View>
                    <TextInput
                      autoCapitalize="none"
                      autoCorrect={false}
                      onChangeText={setPassword}
                      placeholder={
                        mode === 'signin'
                          ? 'Enter your password'
                          : 'Create a password'
                      }
                      placeholderTextColor={colors.textSubtle}
                      secureTextEntry
                      style={styles.input}
                      textContentType={
                        mode === 'signin' ? 'password' : 'newPassword'
                      }
                      value={password}
                    />
                  </View>

                  {mode === 'signup' ? (
                    <View style={styles.setupCard}>
                      <View style={styles.setupHeader}>
                        <Text style={styles.setupTitle}>Player setup</Text>
                        <Text style={styles.setupSubtitle}>
                          New accounts begin with every attribute at 0 and can
                          grow up to 99. Height, wingspan, and weight can be
                          updated later from Profile.
                        </Text>
                      </View>

                      <View style={styles.field}>
                        <Text style={styles.label}>Player Name</Text>
                        <TextInput
                          onChangeText={(value) => setSignupField('name', value)}
                          placeholder="MyPlayer name"
                          placeholderTextColor={colors.textSubtle}
                          style={styles.input}
                          value={signupDraft.name}
                        />
                      </View>

                      <View style={styles.field}>
                        <MeasurementPicker
                          helperText="Switch units, then scroll up or down to choose your height."
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
                      </View>

                      <View style={styles.field}>
                        <MeasurementPicker
                          helperText="Open the menu and scroll to the reach you want."
                          label="Wingspan"
                          onUnitChange={(value) =>
                            setSignupField('wingspanUnit', value as LengthUnit)
                          }
                          onValueChange={(value) =>
                            setSignupField('wingspanCm', value)
                          }
                          options={wingspanOptions}
                          selectedUnit={signupDraft.wingspanUnit}
                          selectedValue={signupDraft.wingspanCm}
                          unitOptions={LENGTH_UNIT_OPTIONS}
                          valueLabel={formatLengthMeasurement(
                            signupDraft.wingspanCm,
                            signupDraft.wingspanUnit
                          )}
                        />
                      </View>

                      <View style={styles.field}>
                        <MeasurementPicker
                          helperText="Pick the body weight you want to start from."
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
                      </View>

                      <View style={styles.field}>
                        <Text style={styles.label}>Position</Text>
                        <View style={styles.chipWrap}>
                          {PLAYER_POSITIONS.map((position) => {
                            const selected = signupDraft.position === position;

                            return (
                              <Pressable
                                key={position}
                                accessibilityRole="button"
                                onPress={() => setSignupField('position', position)}
                                style={[
                                  styles.chip,
                                  selected && styles.chipSelected
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.chipText,
                                    selected && styles.chipTextSelected
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
                        <View style={styles.chipWrap}>
                          {PLAYER_ARCHETYPES.map((archetype) => {
                            const selected = signupDraft.archetype === archetype;

                            return (
                              <Pressable
                                key={archetype}
                                accessibilityRole="button"
                                onPress={() => setSignupField('archetype', archetype)}
                                style={[
                                  styles.chip,
                                  selected && styles.chipSelected
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.chipText,
                                    selected && styles.chipTextSelected
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
                    <View style={[styles.noticeStrip, styles.warningStrip]}>
                      <Ionicons
                        name="construct"
                        size={18}
                        color={colors.gold}
                      />
                      <Text style={styles.noticeText}>
                        Add your Supabase URL and publishable key in `.env` before
                        auth can work. Guest mode still opens the app locally.
                      </Text>
                    </View>
                  ) : null}

                  {statusMessage ? (
                    <View style={[styles.noticeStrip, styles.successStrip]}>
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
                    <View style={[styles.noticeStrip, styles.errorStrip]}>
                      <Ionicons
                        name="alert-circle"
                        size={18}
                        color={colors.red}
                      />
                      <Text style={styles.noticeText}>{errorMessage}</Text>
                    </View>
                  ) : null}

                  <PrimaryButton
                    disabled={
                      isBusy || (mode === 'signup' ? !canCreateAccount : false)
                    }
                    icon={mode === 'signin' ? 'log-in' : 'arrow-forward-circle'}
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
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color={colors.text}
                    />
                  </Pressable>
                </View>

                <View style={styles.footerCopy}>
                  <Text style={styles.footerTitle}>
                    {mode === 'signin' ? 'Returning player' : 'Persistent profile'}
                  </Text>
                  <Text style={styles.footerText}>
                    {mode === 'signin'
                      ? 'Sign in loads your saved progress, attributes, quests, and activity history from Supabase.'
                      : 'New accounts create a player profile that can keep progressing after you close and reopen the app.'}
                  </Text>
                  <Text style={styles.footerNote}>
                    Ratings stay capped at 99, but now the build can persist across sessions.
                  </Text>
                </View>
              </LinearGradient>
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
    maxWidth: 620,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md
  },
  brandIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold
  },
  brandTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2
  },
  brand: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900'
  },
  brandSubcopy: {
    color: colors.textSubtle,
    fontSize: 13,
    fontWeight: '700'
  },
  authCard: {
    width: '100%',
    minHeight: 680,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.xl,
    gap: spacing.xl,
    ...shadows.card
  },
  authCardExpanded: {
    minHeight: 780
  },
  authHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  // Lets the title wrap instead of pushing the status badge off the card; on
  // narrow phones the badge drops to its own line so the title keeps its width.
  authHeaderCopy: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 160,
    minWidth: 0
  },
  authEyebrow: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  authTitle: {
    marginTop: spacing.sm,
    color: colors.text,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900'
  },
  demoBadge: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(248,214,109,0.24)',
    backgroundColor: 'rgba(248,214,109,0.12)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexShrink: 0
  },
  demoBadgeText: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  modeSwitch: {
    flexDirection: 'row',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: spacing.xs
  },
  modeButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modeButtonActive: {
    backgroundColor: colors.panelHighlight
  },
  modeButtonText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '900'
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900'
  },
  helperText: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '700'
  },
  input: {
    minHeight: 56,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(5,9,18,0.84)',
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    fontWeight: '700'
  },
  setupCard: {
    gap: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: spacing.lg
  },
  setupHeader: {
    gap: spacing.xs
  },
  setupTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900'
  },
  setupSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600'
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  chip: {
    minHeight: 40,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  chipSelected: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(248,214,109,0.12)'
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '900'
  },
  chipTextSelected: {
    color: colors.gold
  },
  goalInput: {
    minHeight: 96,
    paddingTop: spacing.md,
    paddingBottom: spacing.md
  },
  noticeStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md
  },
  warningStrip: {
    borderColor: 'rgba(248,214,109,0.2)',
    backgroundColor: 'rgba(248,214,109,0.08)'
  },
  successStrip: {
    borderColor: 'rgba(88,230,166,0.22)',
    backgroundColor: 'rgba(88,230,166,0.08)'
  },
  errorStrip: {
    borderColor: 'rgba(255,90,103,0.22)',
    backgroundColor: 'rgba(255,90,103,0.08)'
  },
  noticeText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700'
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.02)',
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm
  },
  secondaryButtonPressed: {
    transform: [{ scale: 0.98 }]
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800'
  },
  footerCopy: {
    marginTop: 'auto',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.lg
  },
  footerTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600'
  },
  footerNote: {
    color: colors.gold,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800'
  },
  topGlow: {
    position: 'absolute',
    top: -120,
    right: -60,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(248,214,109,0.12)'
  },
  bottomGlow: {
    position: 'absolute',
    bottom: -120,
    left: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(77,163,255,0.12)'
  }
});
