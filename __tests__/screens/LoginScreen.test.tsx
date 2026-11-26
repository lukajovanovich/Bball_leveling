import React from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import LoginScreen from '../../app/index';
import { NETWORK_ERROR_MESSAGE } from '../../src/lib/authErrors';
import {
  DEFAULT_HEIGHT_CM,
  DEFAULT_WEIGHT_KG,
  DEFAULT_WINGSPAN_CM
} from '../../src/lib/measurements';
import { resetWebAuthRedirectForTests } from '../../src/lib/oauth';
import { SIGN_IN_INCOMPLETE_MESSAGE } from '../../src/store/AuthContext';
import { newPlayerState } from '../helpers/fixtures';
import { readProbe, renderApp } from '../helpers/renderApp';
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

const EMAIL = 'you@example.com';
const GOAL = 'What kind of player do you want to become?';

const emailInput = () => screen.getByPlaceholderText(EMAIL);
const primaryButton = (name: string | RegExp) => {
  const buttons = screen.getAllByRole('button', { name });

  // "Sign in" is both a mode tab and the submit button; submit comes last.
  return buttons[buttons.length - 1];
};

const fillSignIn = async (email = 'me@example.com', password = 'hunter22') => {
  await fireEvent.changeText(emailInput(), email);
  await fireEvent.changeText(screen.getByPlaceholderText('Your password'), password);
};

const openSignUp = async () => {
  await fireEvent.press(screen.getByRole('button', { name: 'Sign up' }));
};

beforeEach(() => {
  mockControls.reset();
  jest.mocked(router.replace).mockClear();
  jest.mocked(router.push).mockClear();
  openAuthSession.mockReset();
  openAuthSession.mockResolvedValue({
    type: 'success',
    url: 'bballleveling:///?code=google-code'
  });
});

describe('sign in', () => {
  it('opens on the sign-in form', async () => {
    await renderApp(<LoginScreen />);

    expect(screen.getByText('Sign in to your build')).toBeOnTheScreen();
    expect(screen.queryByText(/Add your Supabase URL/)).not.toBeOnTheScreen();
    expect(emailInput()).toBeOnTheScreen();
    expect(screen.getByPlaceholderText('Your password')).toBeOnTheScreen();
    expect(screen.queryByText('Player setup')).not.toBeOnTheScreen();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('hides the password while typing', async () => {
    await renderApp(<LoginScreen />);

    expect(screen.getByPlaceholderText('Your password')).toHaveProp(
      'secureTextEntry',
      true
    );
  });

  it('signs in with what the user typed and confirms it', async () => {
    await renderApp(<LoginScreen />);
    await fillSignIn('  Me@Example.com ', 'hunter22');

    await fireEvent.press(primaryButton('Sign in'));

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'me@example.com',
      password: 'hunter22'
    });
    expect(
      await screen.findByText('Signed in. Loading your saved player build...')
    ).toBeOnTheScreen();
  });

  it('shows the server message for wrong credentials and lets the user retry', async () => {
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: {},
      error: { message: 'Invalid login credentials' }
    });
    await renderApp(<LoginScreen />);
    await fillSignIn();

    await fireEvent.press(primaryButton('Sign in'));

    expect(await screen.findByText('Invalid login credentials')).toBeOnTheScreen();
    expect(primaryButton('Sign in')).toBeEnabled();

    await fireEvent.press(primaryButton('Sign in'));

    expect(
      await screen.findByText('Signed in. Loading your saved player build...')
    ).toBeOnTheScreen();
    expect(screen.queryByText('Invalid login credentials')).not.toBeOnTheScreen();
  });

  it('explains an unreachable server instead of showing "Failed to fetch"', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: {},
      error: { name: 'AuthRetryableFetchError', message: 'Failed to fetch' }
    });
    await renderApp(<LoginScreen />);
    await fillSignIn();

    await fireEvent.press(primaryButton('Sign in'));

    expect(await screen.findByText(NETWORK_ERROR_MESSAGE)).toBeOnTheScreen();
    expect(screen.queryByText(/failed to fetch/i)).not.toBeOnTheScreen();
  });

  it('recovers when the request throws instead of staying on "Connecting..."', async () => {
    supabase.auth.signInWithPassword.mockRejectedValue(new TypeError('Failed to fetch'));
    await renderApp(<LoginScreen />);
    await fillSignIn();

    await fireEvent.press(primaryButton('Sign in'));

    expect(await screen.findByText(NETWORK_ERROR_MESSAGE)).toBeOnTheScreen();
    expect(primaryButton('Sign in')).toBeEnabled();
  });

  it('shows "Connecting..." and blocks double submits while waiting', async () => {
    let finish: (value: unknown) => void = () => {};
    supabase.auth.signInWithPassword.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    await renderApp(<LoginScreen />);
    await fillSignIn();

    await fireEvent.press(primaryButton('Sign in'));

    const busyButton = await screen.findByRole('button', { name: 'Connecting...' });
    expect(busyButton).toBeDisabled();

    await fireEvent.press(busyButton);
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledTimes(1);

    await act(async () => {
      finish({ data: {}, error: null });
    });

    expect(primaryButton('Sign in')).toBeEnabled();
  });

  it('goes to Home once the session and the player are loaded', async () => {
    mockControls.setStoredProgress(newPlayerState());
    await renderApp(<LoginScreen />);

    await act(async () => {
      mockControls.emitAuthChange('SIGNED_IN', makeSession());
    });

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/home'));
  });

  it('skips the form for a returning signed-in user', async () => {
    mockControls.startSignedIn();
    mockControls.setStoredProgress(newPlayerState());

    await renderApp(<LoginScreen />);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/home'));
  });
});

describe('guest mode and setup', () => {
  it('lets the user continue as guest', async () => {
    await renderApp(<LoginScreen />);

    await fireEvent.press(screen.getByRole('button', { name: /Continue as guest/ }));

    expect(router.replace).toHaveBeenCalledWith('/home');
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('warns when Supabase is not configured', async () => {
    mockControls.setConfigured(false);
    await renderApp(<LoginScreen />);

    expect(screen.getByText(/Add your Supabase URL and publishable key/)).toBeOnTheScreen();
  });

  it('tells the user what is missing when signing in without configuration', async () => {
    mockControls.setConfigured(false);
    await renderApp(<LoginScreen />);
    await fillSignIn();

    await fireEvent.press(primaryButton('Sign in'));

    expect(await screen.findByText(/EXPO_PUBLIC_SUPABASE_URL/)).toBeOnTheScreen();
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });
});

describe('sign up', () => {
  const user = { id: 'new-user', email: 'rookie@example.com' };

  const fillSignUp = async () => {
    await fireEvent.changeText(emailInput(), 'rookie@example.com');
    await openSignUp();
    await fireEvent.changeText(screen.getByPlaceholderText('Choose a password'), 'secret1');
    await fireEvent.changeText(screen.getByPlaceholderText(GOAL), 'Become a starter');
  };

  it('switches to the signup form with player setup', async () => {
    await renderApp(<LoginScreen />);
    await openSignUp();

    expect(screen.getByText('Create your player')).toBeOnTheScreen();
    expect(screen.getByText('Player setup')).toBeOnTheScreen();
    expect(screen.getByPlaceholderText('Choose a password')).toBeOnTheScreen();
    expect(screen.getByText('Height')).toBeOnTheScreen();
    expect(screen.getByText('Wingspan')).toBeOnTheScreen();
    expect(screen.getByText('Weight')).toBeOnTheScreen();
    expect(screen.getByText('183 cm')).toBeOnTheScreen();
    expect(screen.getByText('193 cm')).toBeOnTheScreen();
    expect(screen.getByText('84 kg')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Center' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Glass Cleaner' })).toBeOnTheScreen();
  });

  it('suggests a player name from the email', async () => {
    await renderApp(<LoginScreen />);
    await fireEvent.changeText(emailInput(), 'jalen.novak@example.com');
    await openSignUp();

    expect(screen.getByPlaceholderText('Name on your jersey')).toHaveDisplayValue('Jalen Novak');
  });

  it('does not overwrite a name the user already typed', async () => {
    await renderApp(<LoginScreen />);
    await openSignUp();
    await fireEvent.changeText(screen.getByPlaceholderText('Name on your jersey'), 'Custom Name');
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    await fireEvent.changeText(emailInput(), 'someone.else@example.com');
    await openSignUp();

    expect(screen.getByPlaceholderText('Name on your jersey')).toHaveDisplayValue('Custom Name');
  });

  it('keeps the create button disabled until every required field is filled', async () => {
    await renderApp(<LoginScreen />);
    await openSignUp();
    const createButton = () =>
      screen.getByRole('button', { name: 'Create account and continue' });

    expect(createButton()).toBeDisabled();

    await fireEvent.changeText(emailInput(), 'rookie@example.com');
    expect(createButton()).toBeDisabled();

    await fireEvent.changeText(screen.getByPlaceholderText('Choose a password'), 'secret1');
    expect(createButton()).toBeDisabled();

    await fireEvent.changeText(screen.getByPlaceholderText('Name on your jersey'), 'Rookie');
    expect(createButton()).toBeDisabled();

    await fireEvent.changeText(screen.getByPlaceholderText(GOAL), '   ');
    expect(createButton()).toBeDisabled();

    await fireEvent.changeText(screen.getByPlaceholderText(GOAL), 'Become a starter');
    expect(createButton()).toBeEnabled();

    await fireEvent.press(createButton());
    expect(supabase.auth.signUp).toHaveBeenCalledTimes(1);
  });

  it('creates the account with the chosen player setup', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { user, session: makeSession(user.id, user.email) },
      error: null
    });
    await renderApp(<LoginScreen />);
    await fillSignUp();
    await fireEvent.press(screen.getByRole('button', { name: 'Center' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Glass Cleaner' }));

    await fireEvent.press(
      screen.getByRole('button', { name: 'Create account and continue' })
    );

    await waitFor(() => expect(mockControls.upsert).toHaveBeenCalled());

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'rookie@example.com',
      password: 'secret1'
    });
    expect(mockControls.upsert.mock.calls[0][0]).toMatchObject({
      user_id: 'new-user',
      email: 'rookie@example.com'
    });
    expect(mockControls.upsert.mock.calls[0][0].progress_state.player).toMatchObject({
      name: 'Rookie',
      position: 'Center',
      archetype: 'Glass Cleaner',
      mainGoal: 'Become a starter',
      heightCm: DEFAULT_HEIGHT_CM,
      wingspanCm: DEFAULT_WINGSPAN_CM,
      weightKg: DEFAULT_WEIGHT_KG,
      totalXp: 0
    });
    expect(
      await screen.findByText('Account created. Loading your player build...')
    ).toBeOnTheScreen();
  });

  it('creates the account with measurements picked in the wheels', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { user, session: makeSession(user.id, user.email) },
      error: null
    });
    await renderApp(<LoginScreen />);
    await fillSignUp();

    // switching height to ft/in moves wingspan and weight to imperial too
    await fireEvent.press(screen.getAllByText('Tap to edit')[0]);
    await fireEvent.press(screen.getByText('ft/in'));
    await fireEvent.press(screen.getByText('5\'5"'));
    await fireEvent.press(screen.getAllByText('Tap to edit')[1]);
    await fireEvent.press(screen.getByText('5\'6"'));
    await fireEvent.press(screen.getAllByText('Tap to edit')[2]);
    await fireEvent.press(screen.getByText('125 lb'));

    expect(screen.getByText('5\'5"')).toBeOnTheScreen();
    expect(screen.getByText('5\'6"')).toBeOnTheScreen();
    expect(screen.getByText('125 lb')).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Create account and continue' })
    );
    await waitFor(() => expect(mockControls.upsert).toHaveBeenCalled());

    expect(mockControls.upsert.mock.calls[0][0].progress_state.player).toMatchObject({
      heightCm: 165.1,
      heightUnit: 'in',
      wingspanCm: 167.64,
      wingspanUnit: 'in',
      weightKg: 56.7,
      weightUnit: 'lb'
    });
  });

  it('switches all three measurements back to metric from any one of them', async () => {
    await renderApp(<LoginScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Sign up' }));

    // weight to lb: height and wingspan follow into ft/in
    await fireEvent.press(screen.getAllByText('Tap to edit')[2]);
    await fireEvent.press(screen.getByText('lb'));
    await fireEvent.press(screen.getByText('Done'));
    expect(screen.getByText('6\'0"')).toBeOnTheScreen();
    expect(screen.getByText('6\'4"')).toBeOnTheScreen();
    expect(screen.getByText('185 lb')).toBeOnTheScreen();

    // wingspan to cm: height and weight follow into metric
    await fireEvent.press(screen.getAllByText('Tap to edit')[1]);
    await fireEvent.press(screen.getByText('cm'));
    await fireEvent.press(screen.getByText('Done'));
    expect(screen.getByText('183 cm')).toBeOnTheScreen();
    expect(screen.getByText('193 cm')).toBeOnTheScreen();
    expect(screen.getByText('84 kg')).toBeOnTheScreen();
  });

  it('tells the user to confirm their email when that is required', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { user, session: null },
      error: null
    });
    await renderApp(<LoginScreen />);
    await fillSignUp();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Create account and continue' })
    );

    expect(await screen.findByText(/Confirm your email, then sign in/)).toBeOnTheScreen();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('shows why signup was rejected', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Password should be at least 6 characters.' }
    });
    await renderApp(<LoginScreen />);
    await fillSignUp();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Create account and continue' })
    );

    expect(
      await screen.findByText('Password should be at least 6 characters.')
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Create account and continue' })
    ).toBeEnabled();
  });

  it('clears old messages when switching between sign in and sign up', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: {},
      error: { message: 'Invalid login credentials' }
    });
    await renderApp(<LoginScreen />);
    await fillSignIn();
    await fireEvent.press(primaryButton('Sign in'));
    expect(await screen.findByText('Invalid login credentials')).toBeOnTheScreen();

    await openSignUp();

    expect(screen.queryByText('Invalid login credentials')).not.toBeOnTheScreen();
  });

  it('keeps the typed email when switching modes', async () => {
    await renderApp(<LoginScreen />);
    await fireEvent.changeText(emailInput(), 'keep@example.com');
    await openSignUp();

    expect(emailInput()).toHaveDisplayValue('keep@example.com');
  });
});

describe('continue with Google', () => {
  const googleButton = () => screen.getByRole('button', { name: 'Continue with Google' });

  it('signs in through Google with the Google provider', async () => {
    await renderApp(<LoginScreen />);

    await fireEvent.press(googleButton());

    await waitFor(() =>
      expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('google-code')
    );
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'google' })
    );
    expect(openAuthSession).toHaveBeenCalledWith(GOOGLE_AUTH_URL, 'bballleveling:///');
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('is offered in sign up too', async () => {
    await renderApp(<LoginScreen />);
    await openSignUp();

    expect(googleButton()).toBeEnabled();
  });

  it('shows why Google sign-in failed and lets the player retry', async () => {
    openAuthSession.mockResolvedValueOnce({
      type: 'success',
      url: 'bballleveling:///?error=server_error&error_description=Unable+to+exchange+external+code'
    });
    await renderApp(<LoginScreen />);

    await fireEvent.press(googleButton());

    expect(await screen.findByText('Unable to exchange external code')).toBeOnTheScreen();
    expect(googleButton()).toBeEnabled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('explains an unreachable server', async () => {
    supabase.auth.exchangeCodeForSession.mockRejectedValue(new TypeError('Failed to fetch'));
    await renderApp(<LoginScreen />);

    await fireEvent.press(googleButton());

    expect(await screen.findByText(NETWORK_ERROR_MESSAGE)).toBeOnTheScreen();
  });

  it('shows nothing when the player closes Google', async () => {
    openAuthSession.mockResolvedValue({ type: 'cancel' } as never);
    await renderApp(<LoginScreen />);

    await fireEvent.press(googleButton());

    await waitFor(() => expect(googleButton()).toBeEnabled());
    expect(openAuthSession).toHaveBeenCalledTimes(1);
    expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(screen.queryByText(SIGN_IN_INCOMPLETE_MESSAGE)).not.toBeOnTheScreen();
    expect(screen.queryByText(/Signed in/)).not.toBeOnTheScreen();
    expect(screen.queryByText(/went wrong/)).not.toBeOnTheScreen();
  });

  it('shows "Opening Google..." and blocks a second tap while the browser is open', async () => {
    let close: (value: never) => void = () => {};
    openAuthSession.mockReturnValue(
      new Promise((resolve) => {
        close = resolve;
      })
    );
    await renderApp(<LoginScreen />);

    await fireEvent.press(googleButton());

    const busy = await screen.findByRole('button', { name: 'Opening Google...' });
    expect(busy).toBeDisabled();
    await fireEvent.press(busy);
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledTimes(1);

    await act(async () => {
      close({ type: 'cancel' } as never);
    });

    expect(googleButton()).toBeEnabled();
  });

  it('is disabled with a reason when accounts are not configured', async () => {
    mockControls.setConfigured(false);
    await renderApp(<LoginScreen />);

    expect(googleButton()).toBeDisabled();
    expect(
      screen.getByText('Google sign-in needs accounts to be set up first.')
    ).toBeOnTheScreen();

    await fireEvent.press(googleButton());

    expect(supabase.auth.signInWithOAuth).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: /Continue as guest/ })
    ).toBeEnabled();
  });
});

describe('player setup after a first Google sign-in', () => {
  const nameInput = () => screen.getByPlaceholderText('Name on your jersey');
  const createButton = () => screen.getByRole('button', { name: 'Create player' });

  it('shows the setup with the Google name filled in when no player exists', async () => {
    mockControls.startSignedIn(makeGoogleSession('google-1', 'jm@gmail.com'));
    mockControls.setStoredProgress(null);

    await renderApp(<LoginScreen />);

    expect(await screen.findByText('Set up your player')).toBeOnTheScreen();
    expect(screen.getByText(/Signed in as jm@gmail.com/)).toBeOnTheScreen();
    expect(nameInput()).toHaveDisplayValue('Jordan Miles');
    expect(screen.getByText('Height')).toBeOnTheScreen();
    expect(screen.getByText('Wingspan')).toBeOnTheScreen();
    expect(screen.getByText('Weight')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Center' })).toBeOnTheScreen();
    expect(screen.queryByPlaceholderText('Your password')).not.toBeOnTheScreen();
    expect(router.replace).not.toHaveBeenCalled();
    expect(mockControls.upsert).not.toHaveBeenCalled();
  });

  it('falls back to the name Google calls "name"', async () => {
    mockControls.startSignedIn(
      makeGoogleSession('google-1', 'jm@gmail.com', { name: 'J. Miles' })
    );
    mockControls.setStoredProgress(null);

    await renderApp(<LoginScreen />);

    expect(nameInput()).toHaveDisplayValue('J. Miles');
  });

  it('creates the player from the setup, saves the row and opens Home', async () => {
    mockControls.startSignedIn(makeGoogleSession('google-1', 'jm@gmail.com'));
    mockControls.setStoredProgress(null);
    await renderApp(<LoginScreen />);

    expect(createButton()).toBeDisabled();

    await fireEvent.press(screen.getByRole('button', { name: 'Small Forward' }));
    await fireEvent.press(screen.getByRole('button', { name: '3-and-D Wing' }));
    await fireEvent.changeText(screen.getByPlaceholderText(GOAL), 'Make varsity');
    await fireEvent.press(createButton());

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/home'));
    expect(mockControls.upsert).toHaveBeenCalledTimes(1);
    expect(mockControls.upsert.mock.calls[0][0]).toMatchObject({
      user_id: 'google-1',
      email: 'jm@gmail.com'
    });
    expect(mockControls.upsert.mock.calls[0][0].progress_state.player).toMatchObject({
      name: 'Jordan Miles',
      position: 'Small Forward',
      archetype: '3-and-D Wing',
      mainGoal: 'Make varsity',
      heightCm: DEFAULT_HEIGHT_CM,
      wingspanCm: DEFAULT_WINGSPAN_CM,
      weightKg: DEFAULT_WEIGHT_KG,
      totalXp: 0
    });
    expect(readProbe().name).toBe('Jordan Miles');
  });

  it('keeps the setup open and shows the error when saving fails', async () => {
    mockControls.startSignedIn(makeGoogleSession());
    mockControls.setStoredProgress(null);
    mockControls.upsert.mockResolvedValueOnce({ error: { message: 'Failed to fetch' } });
    await renderApp(<LoginScreen />);

    await fireEvent.changeText(screen.getByPlaceholderText(GOAL), 'Make varsity');
    await fireEvent.press(createButton());

    expect(await screen.findByText(NETWORK_ERROR_MESSAGE)).toBeOnTheScreen();
    expect(screen.getByText('Set up your player')).toBeOnTheScreen();
    expect(router.replace).not.toHaveBeenCalled();

    await fireEvent.press(createButton());

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/home'));
  });

  it('shows the setup right after Google sign-in from the form', async () => {
    mockControls.setStoredProgress(null);
    supabase.auth.exchangeCodeForSession.mockImplementation(async () => {
      mockControls.emitAuthChange('SIGNED_IN', makeGoogleSession());
      return { data: makeGoogleSession(), error: null };
    });
    await renderApp(<LoginScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));

    expect(await screen.findByText('Set up your player')).toBeOnTheScreen();
    expect(nameInput()).toHaveDisplayValue('Jordan Miles');
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('lets the player switch to another account', async () => {
    mockControls.startSignedIn(makeGoogleSession());
    mockControls.setStoredProgress(null);
    supabase.auth.signOut.mockImplementation(async () => {
      mockControls.emitAuthChange('SIGNED_OUT', null);
      return { error: null };
    });
    await renderApp(<LoginScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Use another account' }));

    expect(await screen.findByText('Sign in to your build')).toBeOnTheScreen();
    expect(mockControls.upsert).not.toHaveBeenCalled();
  });

  it('sends a returning Google player straight to Home', async () => {
    mockControls.startSignedIn(makeGoogleSession());
    mockControls.setStoredProgress(newPlayerState({}, 500));

    await renderApp(<LoginScreen />);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/home'));
    expect(screen.queryByText('Set up your player')).not.toBeOnTheScreen();
    expect(mockControls.upsert).not.toHaveBeenCalled();
  });
});

describe('coming back from Google on web', () => {
  const originalLocation = Object.getOwnPropertyDescriptor(globalThis, 'location');
  const originalHistory = Object.getOwnPropertyDescriptor(globalThis, 'history');

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
      value: { state: null, replaceState: jest.fn() }
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
    resetWebAuthRedirectForTests();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    restore('location', originalLocation);
    restore('history', originalHistory);
    resetWebAuthRedirectForTests();
  });

  it('shows why the return trip could not sign the player in', async () => {
    openAt('https://bballleveling.vercel.app/?code=stale');
    supabase.auth.exchangeCodeForSession.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'code verifier not found' }
    });

    await renderApp(<LoginScreen />);

    expect(await screen.findByText(SIGN_IN_INCOMPLETE_MESSAGE)).toBeOnTheScreen();

    await openSignUp();

    expect(screen.queryByText(SIGN_IN_INCOMPLETE_MESSAGE)).not.toBeOnTheScreen();
  });

  it('keeps the button busy while the page leaves for Google', async () => {
    openAt('https://bballleveling.vercel.app/');
    await renderApp(<LoginScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));

    expect(await screen.findByRole('button', { name: 'Opening Google...' })).toBeDisabled();
    expect(openAuthSession).not.toHaveBeenCalled();
  });
});
