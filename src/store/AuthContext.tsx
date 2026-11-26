import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
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
import { describeError, NETWORK_ERROR_MESSAGE } from '../lib/authErrors';
import {
  AuthRedirectParams,
  getOAuthRedirectUrl,
  isCancelledAuthRedirect,
  parseAuthRedirectUrl,
  takeWebAuthRedirect
} from '../lib/oauth';
import { upsertPlayerProgressState } from '../lib/playerProfileStore';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

interface AuthActionResult {
  success: boolean;
  message?: string;
}

interface SignUpActionResult extends AuthActionResult {
  needsEmailConfirmation?: boolean;
}

export interface GoogleSignInResult extends AuthActionResult {
  /** The player closed Google without signing in. Nothing to show. */
  cancelled?: boolean;
  /** Web only: the page is leaving for Google and comes back signed in. */
  redirecting?: boolean;
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
  signInWithGoogle: () => Promise<GoogleSignInResult>;
  signOut: () => Promise<AuthActionResult>;
  /** Why the return from Google on web could not sign the player in. */
  redirectError: string | null;
  clearRedirectError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const missingConfigMessage =
  'Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to use Supabase auth.';

// With PKCE an email confirmation link also comes back with a code, which
// only the device that signed up can redeem, so this does not blame Google.
export const SIGN_IN_INCOMPLETE_MESSAGE =
  "Sign-in didn't finish on this device. Try again, or sign in with your email and password.";

// Turns what Google and Supabase sent back into a session on this device.
const redeemAuthRedirect = async (
  params: AuthRedirectParams
): Promise<GoogleSignInResult> => {
  if (isCancelledAuthRedirect(params)) {
    return { success: false, cancelled: true };
  }

  if (params.error) {
    return {
      success: false,
      message: describeError({ message: params.errorDescription ?? params.error })
    };
  }

  if (!params.code) {
    return { success: false, message: SIGN_IN_INCOMPLETE_MESSAGE };
  }

  try {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);

    if (error) {
      // A raw "code verifier" error means nothing to a player; only an
      // unreachable server gets its own explanation.
      const message = describeError(error);

      return {
        success: false,
        message: message === NETWORK_ERROR_MESSAGE ? message : SIGN_IN_INCOMPLETE_MESSAGE
      };
    }

    return { success: true };
  } catch (error) {
    const message = describeError(error);

    return {
      success: false,
      message: message === NETWORK_ERROR_MESSAGE ? message : SIGN_IN_INCOMPLETE_MESSAGE
    };
  }
};

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [redirectError, setRedirectError] = useState<string | null>(null);

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
        // Back from Google on web: redeem the code before reading the session,
        // so the first session the app sees is already the signed-in one.
        const redirect = takeWebAuthRedirect();

        if (redirect) {
          const result = await redeemAuthRedirect(redirect);

          if (active && !result.success && !result.cancelled) {
            setRedirectError(result.message ?? SIGN_IN_INCOMPLETE_MESSAGE);
          }
        }

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
      savePendingSignupProfile(profile, normalizedEmail);

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

  const signInWithGoogle = useCallback(async (): Promise<GoogleSignInResult> => {
    if (!isSupabaseConfigured) {
      return {
        success: false,
        message: missingConfigMessage
      };
    }

    setRedirectError(null);

    try {
      const redirectTo = getOAuthRedirectUrl();
      const isWeb = Platform.OS === 'web';
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          // On web Supabase sends the whole page to Google and back. On
          // native the URL is opened in an auth browser sheet instead.
          skipBrowserRedirect: !isWeb
        }
      });

      if (error) {
        return {
          success: false,
          message: describeError(error)
        };
      }

      if (isWeb) {
        return { success: true, redirecting: true };
      }

      if (!data?.url) {
        return { success: false, message: SIGN_IN_INCOMPLETE_MESSAGE };
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type !== 'success') {
        return { success: false, cancelled: true };
      }

      return redeemAuthRedirect(parseAuthRedirectUrl(result.url));
    } catch (error) {
      return {
        success: false,
        message: describeError(error)
      };
    }
  }, []);

  const clearRedirectError = useCallback(() => {
    setRedirectError(null);
  }, []);

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
      signInWithGoogle,
      signOut,
      redirectError,
      clearRedirectError
    }),
    [
      clearRedirectError,
      isLoading,
      redirectError,
      session,
      signIn,
      signInWithGoogle,
      signOut,
      signUp
    ]
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
