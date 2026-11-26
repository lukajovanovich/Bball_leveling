import React, { PropsWithChildren, useEffect, useState } from 'react';
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
import {
  PlayerSetupDraft,
  PlayerSetupFields,
  createPlayerSetupDraft,
  isPlayerSetupComplete
} from '../src/components/player/PlayerSetupFields';
import { PrimaryButton } from '../src/components/ui/PrimaryButton';
import { formatNameFromEmail, suggestPlayerName } from '../src/lib/playerIdentity';
import { useAuth } from '../src/store/AuthContext';
import { useProgress } from '../src/store/ProgressContext';
import { colors, fonts, radii, spacing } from '../src/theme/theme';

type AuthMode = 'signin' | 'signup';

const ScreenShell = ({ children }: PropsWithChildren) => (
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
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </View>
);

const ErrorNotice = ({ message }: { message: string }) => (
  <View style={[styles.notice, styles.errorNotice]}>
    <Ionicons name="alert-circle" size={18} color={colors.red} />
    <Text style={styles.noticeText}>{message}</Text>
  </View>
);

// Shown after a first Google sign-in: the account exists but the player does
// not, because Google skips the sign-up form.
const FinishPlayerSetup = () => {
  const { user, signOut } = useAuth();
  const { createNewProfile } = useProgress();
  const [draft, setDraft] = useState<PlayerSetupDraft>(() =>
    createPlayerSetupDraft(user ? suggestPlayerName(user) : '')
  );
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const canCreate = isPlayerSetupComplete(draft);

  const handleCreate = async () => {
    if (!canCreate) {
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    const saveError = await createNewProfile(draft);

    if (saveError) {
      setErrorMessage(saveError);
    }

    setSaving(false);
  };

  return (
    <ScreenShell>
      <View style={styles.intro}>
        <Text accessibilityRole="header" style={styles.title}>
          Set up your player
        </Text>
        <Text style={styles.introText}>
          {user?.email ? `Signed in as ${user.email}. ` : ''}
          Every rating starts at 0 and can reach 99. Log real workouts to raise
          them.
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.setup}>
          <Text style={styles.setupSubtitle}>
            You can change your measurements later in Profile.
          </Text>
          <PlayerSetupFields draft={draft} onChange={setDraft} />
        </View>

        {errorMessage ? <ErrorNotice message={errorMessage} /> : null}

        <PrimaryButton
          disabled={saving || !canCreate}
          label={saving ? 'Creating player...' : 'Create player'}
          onPress={() => {
            void handleCreate();
          }}
        />

        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={() => {
            void signOut();
          }}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.secondaryButtonPressed
          ]}
        >
          <Text style={styles.secondaryButtonText}>Use another account</Text>
        </Pressable>
      </View>
    </ScreenShell>
  );
};

export default function LoginScreen() {
  const {
    session,
    isConfigured,
    isLoading: isAuthLoading,
    signIn,
    signUp,
    signInWithGoogle,
    redirectError,
    clearRedirectError
  } = useAuth();
  const { isHydrating, needsPlayerSetup } = useProgress();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupDraft, setSignupDraft] = useState<PlayerSetupDraft>(() =>
    createPlayerSetupDraft()
  );
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const canCreateAccount =
    email.trim().length > 0 &&
    password.trim().length > 0 &&
    isPlayerSetupComplete(signupDraft);
  const isBusy =
    submitting ||
    googleSubmitting ||
    isAuthLoading ||
    (Boolean(session) && isHydrating);
  const googleDisabled = !isConfigured || isBusy;
  const googleLabel = googleSubmitting ? 'Opening Google...' : 'Continue with Google';
  const shownError = errorMessage ?? redirectError;

  useEffect(() => {
    if (session && !isAuthLoading && !isHydrating && !needsPlayerSetup) {
      router.replace('/home');
    }
  }, [isAuthLoading, isHydrating, needsPlayerSetup, session]);

  const clearMessages = () => {
    setErrorMessage(null);
    setStatusMessage(null);
    clearRedirectError();
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    clearMessages();

    if (nextMode === 'signup') {
      const suggestedName = formatNameFromEmail(email);

      if (suggestedName && !signupDraft.name.trim()) {
        setSignupDraft((current) => ({ ...current, name: suggestedName }));
      }
    }
  };

  const handleGoogle = async () => {
    setGoogleSubmitting(true);
    clearMessages();

    const result = await signInWithGoogle();

    if (result.redirecting) {
      // The page is on its way to Google; stay busy until it leaves.
      return;
    }

    if (!result.success) {
      if (!result.cancelled) {
        setErrorMessage(result.message ?? 'Unable to sign in with Google right now.');
      }

      setGoogleSubmitting(false);
      return;
    }

    setStatusMessage('Signed in with Google. Loading your player...');
    setGoogleSubmitting(false);
  };

  const handlePrimaryAction = async () => {
    setSubmitting(true);
    clearMessages();

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

  if (session && needsPlayerSetup) {
    return <FinishPlayerSetup />;
  }

  return (
    <ScreenShell>
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
                style={[styles.modeButtonText, selected && styles.modeButtonTextActive]}
              >
                {option === 'signin' ? 'Sign in' : 'Sign up'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.form}>
        <View style={styles.field}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={googleLabel}
            disabled={googleDisabled}
            onPress={() => {
              void handleGoogle();
            }}
            style={({ pressed }) => [
              styles.googleButton,
              googleDisabled && styles.googleButtonDisabled,
              pressed && !googleDisabled && styles.googleButtonPressed
            ]}
          >
            <Ionicons name="logo-google" size={18} color={colors.text} />
            <Text style={styles.googleButtonText}>{googleLabel}</Text>
          </Pressable>
          <Text style={styles.googleNote}>
            {isConfigured
              ? 'New to Bball Leveling? You set up your player right after.'
              : 'Google sign-in needs accounts to be set up first.'}
          </Text>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerRule} />
          <Text style={styles.dividerText}>or use email</Text>
          <View style={styles.dividerRule} />
        </View>

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
            placeholder={mode === 'signin' ? 'Your password' : 'Choose a password'}
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

            <PlayerSetupFields draft={signupDraft} onChange={setSignupDraft} />
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
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            )}
            <Text style={styles.noticeText}>{statusMessage}</Text>
          </View>
        ) : null}

        {shownError ? <ErrorNotice message={shownError} /> : null}

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
    </ScreenShell>
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
  googleButton: {
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.panel,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm
  },
  googleButtonDisabled: {
    opacity: 0.4
  },
  googleButtonPressed: {
    backgroundColor: colors.panelHighlight
  },
  googleButtonText: {
    color: colors.text,
    fontFamily: fonts.bodySemiBold,
    fontSize: 16
  },
  googleNote: {
    color: colors.textSubtle,
    fontFamily: fonts.body,
    fontSize: 13,
    textAlign: 'center'
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md
  },
  dividerRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderStrong
  },
  dividerText: {
    color: colors.textSubtle,
    fontFamily: fonts.body,
    fontSize: 13
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
