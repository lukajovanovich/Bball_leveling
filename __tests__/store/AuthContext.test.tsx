import React, { PropsWithChildren } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { NETWORK_ERROR_MESSAGE } from '../../src/lib/authErrors';
import { resetWebAuthRedirectForTests } from '../../src/lib/oauth';
import { getPendingSignupProfile } from '../../src/lib/pendingSignup';
import {
  AuthProvider,
  SIGN_IN_INCOMPLETE_MESSAGE,
  GoogleSignInResult,
  useAuth
} from '../../src/store/AuthContext';
import { signupProfile } from '../helpers/fixtures';
import {
  GOOGLE_AUTH_URL,
  makeGoogleSession,
  makeSession,
  mockControls,
  supabase
} from '../helpers/supabaseMock';

jest.mock('../../src/lib/supabase', () => require('../helpers/supabaseMock'));
jest.mock('expo-web-browser', () => ({ openAuthSessionAsync: jest.fn() }));
jest.mock('expo-linking', () => ({ createURL: jest.fn(() => 'bballleveling:///') }));

const openAuthSession = jest.mocked(WebBrowser.openAuthSessionAsync);

const Providers = ({ children }: PropsWithChildren) => (
  <AuthProvider>{children}</AuthProvider>
);

const renderAuth = async () => {
  const hook = await renderHook(() => useAuth(), { wrapper: Providers });

  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));

  return hook;
};

beforeEach(() => {
  mockControls.reset();
  openAuthSession.mockReset();
  openAuthSession.mockResolvedValue({
    type: 'success',
    url: 'bballleveling:///?code=google-code'
  });
});

describe('AuthProvider startup', () => {
  it('starts signed out when no session is stored', async () => {
    const { result } = await renderAuth();

    expect(result.current.session).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.isConfigured).toBe(true);
  });

  it('restores a stored session', async () => {
    mockControls.startSignedIn(makeSession('user-7', 'seven@example.com'));

    const { result } = await renderAuth();

    expect(result.current.user).toMatchObject({
      id: 'user-7',
      email: 'seven@example.com'
    });
  });

  it('does not stay on the loading screen if reading the session throws', async () => {
    supabase.auth.getSession.mockRejectedValue(new Error('storage is broken'));

    const { result } = await renderAuth();

    expect(result.current.session).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('skips Supabase entirely when it is not configured', async () => {
    mockControls.setConfigured(false);

    const { result } = await renderAuth();

    expect(result.current.isConfigured).toBe(false);
    expect(result.current.session).toBeNull();
    expect(supabase.auth.getSession).not.toHaveBeenCalled();
  });

  it('follows session changes pushed by Supabase', async () => {
    const { result } = await renderAuth();

    await act(async () => {
      mockControls.emitAuthChange('SIGNED_IN', makeSession('user-3'));
    });
    expect(result.current.user?.id).toBe('user-3');

    await act(async () => {
      mockControls.emitAuthChange('SIGNED_OUT', null);
    });
    expect(result.current.user).toBeNull();
  });

  it('stops listening when the app unmounts', async () => {
    const { unmount } = await renderAuth();

    expect(mockControls.listenerCount()).toBe(1);

    await unmount();

    expect(mockControls.listenerCount()).toBe(0);
    expect(mockControls.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('throws a clear error when used outside the provider', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await expect(renderHook(() => useAuth())).rejects.toThrow(
        'useAuth must be used inside AuthProvider'
      );
    } finally {
      consoleError.mockRestore();
    }
  });
});

describe('signIn', () => {
  it('sends a trimmed, lower-cased email and the exact password', async () => {
    const { result } = await renderAuth();

    let outcome;
    await act(async () => {
      outcome = await result.current.signIn('  Player@Example.COM ', ' pa55 word ');
    });

    expect(outcome).toEqual({ success: true });
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'player@example.com',
      password: ' pa55 word '
    });
  });

  it('returns the server message for wrong credentials', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: {},
      error: { message: 'Invalid login credentials' }
    });
    const { result } = await renderAuth();

    let outcome;
    await act(async () => {
      outcome = await result.current.signIn('a@b.co', 'wrong');
    });

    expect(outcome).toEqual({
      success: false,
      message: 'Invalid login credentials'
    });
  });

  it('explains an unreachable server instead of saying "Failed to fetch"', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: {},
      error: { name: 'AuthRetryableFetchError', message: 'Failed to fetch' }
    });
    const { result } = await renderAuth();

    let outcome;
    await act(async () => {
      outcome = await result.current.signIn('a@b.co', 'pw');
    });

    expect(outcome).toEqual({ success: false, message: NETWORK_ERROR_MESSAGE });
  });

  it('fails cleanly when the request throws', async () => {
    supabase.auth.signInWithPassword.mockRejectedValue(
      new TypeError('Failed to fetch')
    );
    const { result } = await renderAuth();

    let outcome;
    await act(async () => {
      outcome = await result.current.signIn('a@b.co', 'pw');
    });

    expect(outcome).toEqual({ success: false, message: NETWORK_ERROR_MESSAGE });
  });

  it('asks for configuration instead of calling Supabase when env vars are missing', async () => {
    mockControls.setConfigured(false);
    const { result } = await renderAuth();

    let outcome: { success: boolean; message?: string } | undefined;
    await act(async () => {
      outcome = await result.current.signIn('a@b.co', 'pw');
    });

    expect(outcome?.success).toBe(false);
    expect(outcome?.message).toMatch(/EXPO_PUBLIC_SUPABASE_URL/);
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });
});

describe('signUp', () => {
  const user = { id: 'new-user', email: 'new@example.com' };

  it('creates the account and the first cloud save when signup logs in directly', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { user, session: makeSession(user.id, user.email) },
      error: null
    });
    const { result } = await renderAuth();

    let outcome;
    await act(async () => {
      outcome = await result.current.signUp(' New@Example.com ', 'secret1', signupProfile);
    });

    expect(outcome).toEqual({ success: true });
    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'secret1'
    });

    const [payload, options] = mockControls.upsert.mock.calls[0];

    expect(options).toEqual({ onConflict: 'user_id' });
    expect(payload).toMatchObject({ user_id: 'new-user', email: 'new@example.com' });
    expect(payload.progress_state.player).toMatchObject({
      name: 'Luka Tester',
      position: 'Point Guard',
      archetype: 'Floor General',
      mainGoal: 'Run the offense',
      totalXp: 0
    });
    expect(
      Object.values(payload.progress_state.player.attributes).every(
        (value) => value === 0
      )
    ).toBe(true);
    expect(getPendingSignupProfile()).toBeNull();
  });

  it('has the profile stored before Supabase announces the new session', async () => {
    let pendingWhenSessionArrived: unknown = 'not checked';

    supabase.auth.signUp.mockImplementation(async () => {
      // Supabase notifies listeners before signUp() resolves.
      pendingWhenSessionArrived = getPendingSignupProfile();

      return {
        data: { user, session: makeSession(user.id, user.email) },
        error: null
      };
    });
    const { result } = await renderAuth();

    await act(async () => {
      await result.current.signUp(user.email, 'secret1', signupProfile);
    });

    expect(pendingWhenSessionArrived).toEqual(signupProfile);
  });

  it('keeps the profile for later when the email must be confirmed first', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { user, session: null },
      error: null
    });
    const { result } = await renderAuth();

    let outcome: { success: boolean; needsEmailConfirmation?: boolean; message?: string } | undefined;
    await act(async () => {
      outcome = await result.current.signUp(user.email, 'secret1', signupProfile);
    });

    expect(outcome?.success).toBe(true);
    expect(outcome?.needsEmailConfirmation).toBe(true);
    expect(outcome?.message).toMatch(/confirm your email/i);
    expect(mockControls.upsert).not.toHaveBeenCalled();
    expect(getPendingSignupProfile()).toEqual(signupProfile);
  });

  it('returns the server message and forgets the profile when signup is rejected', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'User already registered' }
    });
    const { result } = await renderAuth();

    let outcome;
    await act(async () => {
      outcome = await result.current.signUp(user.email, 'secret1', signupProfile);
    });

    expect(outcome).toEqual({ success: false, message: 'User already registered' });
    expect(mockControls.upsert).not.toHaveBeenCalled();
    expect(getPendingSignupProfile()).toBeNull();
  });

  it('fails when Supabase returns no user', async () => {
    const { result } = await renderAuth();

    let outcome: { success: boolean; message?: string } | undefined;
    await act(async () => {
      outcome = await result.current.signUp(user.email, 'secret1', signupProfile);
    });

    expect(outcome?.success).toBe(false);
    expect(outcome?.message).toMatch(/did not return a user/);
    expect(getPendingSignupProfile()).toBeNull();
  });

  it('reports a failed first save but keeps the profile so it can be retried on sign in', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { user, session: makeSession(user.id, user.email) },
      error: null
    });
    mockControls.upsert.mockResolvedValue({
      error: { message: 'relation "player_profiles" does not exist' }
    });
    const { result } = await renderAuth();

    let outcome;
    await act(async () => {
      outcome = await result.current.signUp(user.email, 'secret1', signupProfile);
    });

    expect(outcome).toEqual({
      success: false,
      message: 'relation "player_profiles" does not exist'
    });
    expect(getPendingSignupProfile()).toEqual(signupProfile);
  });

  it('explains an unreachable server', async () => {
    supabase.auth.signUp.mockRejectedValue(new TypeError('Network request failed'));
    const { result } = await renderAuth();

    let outcome;
    await act(async () => {
      outcome = await result.current.signUp(user.email, 'secret1', signupProfile);
    });

    expect(outcome).toEqual({ success: false, message: NETWORK_ERROR_MESSAGE });
    expect(getPendingSignupProfile()).toBeNull();
  });

  it('does nothing when Supabase is not configured', async () => {
    mockControls.setConfigured(false);
    const { result } = await renderAuth();

    let outcome: { success: boolean } | undefined;
    await act(async () => {
      outcome = await result.current.signUp(user.email, 'secret1', signupProfile);
    });

    expect(outcome?.success).toBe(false);
    expect(supabase.auth.signUp).not.toHaveBeenCalled();
    expect(getPendingSignupProfile()).toBeNull();
  });
});

describe('signOut', () => {
  it('signs out through Supabase', async () => {
    mockControls.startSignedIn();
    const { result } = await renderAuth();

    let outcome;
    await act(async () => {
      outcome = await result.current.signOut();
    });

    expect(outcome).toEqual({ success: true });
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it('reports a sign-out error', async () => {
    supabase.auth.signOut.mockResolvedValue({ error: { message: 'Session expired' } });
    const { result } = await renderAuth();

    let outcome;
    await act(async () => {
      outcome = await result.current.signOut();
    });

    expect(outcome).toEqual({ success: false, message: 'Session expired' });
  });

  it('fails cleanly when the request throws', async () => {
    supabase.auth.signOut.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = await renderAuth();

    let outcome;
    await act(async () => {
      outcome = await result.current.signOut();
    });

    expect(outcome).toEqual({ success: false, message: NETWORK_ERROR_MESSAGE });
  });

  it('is refused when Supabase is not configured', async () => {
    mockControls.setConfigured(false);
    const { result } = await renderAuth();

    let outcome: { success: boolean } | undefined;
    await act(async () => {
      outcome = await result.current.signOut();
    });

    expect(outcome?.success).toBe(false);
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
  });
});

describe('signInWithGoogle on native', () => {
  const signInWithGoogle = async () => {
    const { result } = await renderAuth();
    let outcome: GoogleSignInResult | undefined;

    await act(async () => {
      outcome = await result.current.signInWithGoogle();
    });

    return outcome as GoogleSignInResult;
  };

  it('asks Supabase for the Google URL and opens it in an auth browser', async () => {
    const outcome = await signInWithGoogle();

    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'bballleveling:///', skipBrowserRedirect: true }
    });
    expect(openAuthSession).toHaveBeenCalledWith(GOOGLE_AUTH_URL, 'bballleveling:///');
    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('google-code');
    expect(outcome).toEqual({ success: true });
  });

  it('signs the player in with the session from the code', async () => {
    const googleSession = makeGoogleSession();
    supabase.auth.exchangeCodeForSession.mockImplementation(async () => {
      mockControls.emitAuthChange('SIGNED_IN', googleSession);
      return { data: googleSession, error: null };
    });
    const { result } = await renderAuth();

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(result.current.user).toMatchObject({ id: 'google-user' });
  });

  it.each(['cancel', 'dismiss'])(
    'reports a %s of the browser as cancelled, not as an error',
    async (type) => {
      openAuthSession.mockResolvedValue({ type } as never);

      const outcome = await signInWithGoogle();

      expect(outcome).toEqual({ success: false, cancelled: true });
      expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
    }
  );

  it('treats a declined consent screen as cancelled', async () => {
    openAuthSession.mockResolvedValue({
      type: 'success',
      url: 'bballleveling:///?error=access_denied&error_description=denied'
    });

    expect(await signInWithGoogle()).toEqual({ success: false, cancelled: true });
  });

  it('shows the reason Supabase sent back', async () => {
    openAuthSession.mockResolvedValue({
      type: 'success',
      url: 'bballleveling:///#error=validation_failed&error_description=Unsupported+provider%3A+provider+is+not+enabled'
    });

    expect(await signInWithGoogle()).toEqual({
      success: false,
      message: 'Unsupported provider: provider is not enabled'
    });
  });

  it('fails cleanly when the return link has no code', async () => {
    openAuthSession.mockResolvedValue({ type: 'success', url: 'bballleveling:///' });

    expect(await signInWithGoogle()).toEqual({
      success: false,
      message: SIGN_IN_INCOMPLETE_MESSAGE
    });
  });

  it('hides a raw code exchange error behind a plain message', async () => {
    supabase.auth.exchangeCodeForSession.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'invalid flow state, no valid flow state found' }
    });

    expect(await signInWithGoogle()).toEqual({
      success: false,
      message: SIGN_IN_INCOMPLETE_MESSAGE
    });
  });

  it('explains an unreachable server during the exchange', async () => {
    supabase.auth.exchangeCodeForSession.mockRejectedValue(
      new TypeError('Network request failed')
    );

    expect(await signInWithGoogle()).toEqual({
      success: false,
      message: NETWORK_ERROR_MESSAGE
    });
  });

  it('returns the error when Supabase cannot build the Google URL', async () => {
    supabase.auth.signInWithOAuth.mockResolvedValue({
      data: { provider: 'google', url: null },
      error: { message: 'Failed to fetch' }
    });

    expect(await signInWithGoogle()).toEqual({
      success: false,
      message: NETWORK_ERROR_MESSAGE
    });
    expect(openAuthSession).not.toHaveBeenCalled();
  });

  it('fails cleanly when the browser cannot open', async () => {
    openAuthSession.mockRejectedValue(new Error('Another web browser is already open'));

    expect(await signInWithGoogle()).toEqual({
      success: false,
      message: 'Another web browser is already open'
    });
  });

  it('asks for configuration instead of calling Supabase when env vars are missing', async () => {
    mockControls.setConfigured(false);

    const outcome = await signInWithGoogle();

    expect(outcome.success).toBe(false);
    expect(outcome.message).toMatch(/EXPO_PUBLIC_SUPABASE_URL/);
    expect(supabase.auth.signInWithOAuth).not.toHaveBeenCalled();
    expect(openAuthSession).not.toHaveBeenCalled();
  });
});

describe('signInWithGoogle on web', () => {
  const originalLocation = Object.getOwnPropertyDescriptor(globalThis, 'location');
  const originalHistory = Object.getOwnPropertyDescriptor(globalThis, 'history');
  let replaceState: jest.Mock;

  const openAt = (url: string) => {
    const parsed = new URL(url);

    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: {
        href: parsed.href,
        origin: parsed.origin,
        pathname: parsed.pathname,
        search: parsed.search,
        hash: parsed.hash
      }
    });
    Object.defineProperty(globalThis, 'history', {
      configurable: true,
      value: { state: null, replaceState }
    });
  };

  const restore = (name: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Object.defineProperty(globalThis, name, descriptor);
    } else {
      delete (globalThis as Record<string, unknown>)[name];
    }
  };

  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'web');
    replaceState = jest.fn();
    resetWebAuthRedirectForTests();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    restore('location', originalLocation);
    restore('history', originalHistory);
    resetWebAuthRedirectForTests();
  });

  it('sends the page to Google and back to this site', async () => {
    openAt('https://bballleveling.vercel.app/');
    const { result } = await renderAuth();
    let outcome: GoogleSignInResult | undefined;

    await act(async () => {
      outcome = await result.current.signInWithGoogle();
    });

    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'https://bballleveling.vercel.app/',
        skipBrowserRedirect: false
      }
    });
    expect(outcome).toEqual({ success: true, redirecting: true });
    expect(openAuthSession).not.toHaveBeenCalled();
  });

  it('redeems the code on return, before reading the session, and cleans the URL', async () => {
    openAt('https://bballleveling.vercel.app/?code=web-code');
    const googleSession = makeGoogleSession();
    supabase.auth.exchangeCodeForSession.mockResolvedValue({
      data: googleSession,
      error: null
    });
    supabase.auth.getSession.mockImplementation(async () => ({
      data: {
        session: supabase.auth.exchangeCodeForSession.mock.calls.length
          ? googleSession
          : null
      },
      error: null
    }));

    const { result } = await renderAuth();

    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('web-code');
    expect(replaceState).toHaveBeenCalledWith(null, '', '/');
    expect(result.current.user).toMatchObject({ id: 'google-user' });
    expect(result.current.redirectError).toBeNull();
  });

  it('reports a code that cannot be redeemed and can clear it', async () => {
    openAt('https://bballleveling.vercel.app/?code=used-code');
    supabase.auth.exchangeCodeForSession.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'code verifier not found' }
    });

    const { result } = await renderAuth();

    expect(result.current.redirectError).toBe(SIGN_IN_INCOMPLETE_MESSAGE);
    expect(result.current.session).toBeNull();

    await act(async () => {
      result.current.clearRedirectError();
    });

    expect(result.current.redirectError).toBeNull();
  });

  it('shows nothing when the player declined on Google', async () => {
    openAt('https://bballleveling.vercel.app/?error=access_denied&error_description=denied');

    const { result } = await renderAuth();

    expect(result.current.redirectError).toBeNull();
    expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(replaceState).toHaveBeenCalledWith(null, '', '/');
  });

  it('does not touch an ordinary page load', async () => {
    openAt('https://bballleveling.vercel.app/home');

    await renderAuth();

    expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(replaceState).not.toHaveBeenCalled();
  });
});
