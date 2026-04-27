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

      const {
        data: { session: existingSession }
      } = await supabase.auth.getSession();

      if (active) {
        setSession(existingSession);
        setIsLoading(false);
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

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

      if (error) {
        return {
          success: false,
          message: error.message
        };
      }

      return { success: true };
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

      const {
        data: { session: nextSession, user },
        error
      } = await supabase.auth.signUp({
        email: normalizedEmail,
        password
      });

      if (error) {
        return {
          success: false,
          message: error.message
        };
      }

      savePendingSignupProfile(profile);

      if (!user) {
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

      const nextState = createProgressStateFromPlayer(buildNewPlayerProfile(profile));
      const { error: saveError } = await upsertPlayerProgressState(
        user.id,
        normalizedEmail,
        nextState
      );

      if (saveError) {
        return {
          success: false,
          message: saveError.message
        };
      }

      clearPendingSignupProfile();

      return { success: true };
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

    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        success: false,
        message: error.message
      };
    }

    return { success: true };
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
