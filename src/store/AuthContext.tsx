import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { Session, User } from '@supabase/supabase-js';
import {
  buildNewPlayerProfile,
  createProgressStateFromPlayer
} from '../data/mockPlayer';
import {
  clearPendingSignupProfile,
  PendingSignupProfile,
  savePendingSignupProfile
} from '../lib/pendingSignup';
import { describeError } from '../lib/authErrors';
import { upsertPlayerProgressState } from '../lib/playerProfileStore';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

interface AuthActionResult {
  success: boolean;
  message?: string;
}

interface SignUpActionResult extends AuthActionResult {
  needsEmailConfirmation?: boolean;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signUp: (
    email: string,
    password: string,
    profile: PendingSignupProfile
  ) => Promise<SignUpActionResult>;
  signOut: () => Promise<AuthActionResult>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const missingConfigMessage =
  'Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to use Supabase auth.';

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadSession = async () => {
      if (!isSupabaseConfigured) {
        if (active) {
          setSession(null);
          setIsLoading(false);
        }

        return;
      }

      try {
        const {
          data: { session: existingSession }
        } = await supabase.auth.getSession();

        if (active) {
          setSession(existingSession);
        }
      } catch {
        // A broken stored session must not leave the app on a loading spinner.
        if (active) {
          setSession(null);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) {
        return;
      }

      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthActionResult> => {
      if (!isSupabaseConfigured) {
        return {
          success: false,
          message: missingConfigMessage
        };
      }

      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password
        });

        if (error) {
          return {
            success: false,
            message: describeError(error)
          };
        }

        return { success: true };
      } catch (error) {
        return {
          success: false,
          message: describeError(error)
        };
      }
    },
    []
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      profile: PendingSignupProfile
    ): Promise<SignUpActionResult> => {
      if (!isSupabaseConfigured) {
        return {
          success: false,
          message: missingConfigMessage
        };
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Saved before the request: signing up fires the auth listener, and the
      // progress loader that reacts to it must already find this profile.
      savePendingSignupProfile(profile);

      try {
        const {
          data: { session: nextSession, user },
          error
        } = await supabase.auth.signUp({
          email: normalizedEmail,
          password
        });

        if (error) {
          clearPendingSignupProfile();

          return {
            success: false,
            message: describeError(error)
          };
        }

        if (!user) {
          clearPendingSignupProfile();

          return {
            success: false,
            message: 'Supabase did not return a user for this signup request.'
          };
        }

        if (!nextSession) {
          return {
            success: true,
            needsEmailConfirmation: true,
            message:
              'Account created. Confirm your email, then sign in to finish loading your player.'
          };
        }

        const nextState = createProgressStateFromPlayer(
          buildNewPlayerProfile(profile)
        );
        const { error: saveError } = await upsertPlayerProgressState(
          user.id,
          normalizedEmail,
          nextState
        );

        if (saveError) {
          return {
            success: false,
            message: describeError(saveError)
          };
        }

        clearPendingSignupProfile();

        return { success: true };
      } catch (error) {
        clearPendingSignupProfile();

        return {
          success: false,
          message: describeError(error)
        };
      }
    },
    []
  );

  const signOut = useCallback(async (): Promise<AuthActionResult> => {
    if (!isSupabaseConfigured) {
      return {
        success: false,
        message: missingConfigMessage
      };
    }

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return {
          success: false,
          message: describeError(error)
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: describeError(error)
      };
    }
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      isConfigured: isSupabaseConfigured,
      signIn,
      signUp,
      signOut
    }),
    [isLoading, session, signIn, signOut, signUp]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
};
