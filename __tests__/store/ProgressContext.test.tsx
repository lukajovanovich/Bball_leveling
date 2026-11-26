import React, { PropsWithChildren } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { samplePlayer } from '../../src/data/mockPlayer';
import { NETWORK_ERROR_MESSAGE } from '../../src/lib/authErrors';
import {
  getPendingSignupProfile,
  savePendingSignupProfile
} from '../../src/lib/pendingSignup';
import { calculateOvr, getLevelInfo } from '../../src/lib/progression';
import { AuthProvider, useAuth } from '../../src/store/AuthContext';
import { ProgressProvider, useProgress } from '../../src/store/ProgressContext';
import { ProgressState } from '../../src/types';
import { newPlayerState, signupProfile } from '../helpers/fixtures';
import {
  makeGoogleSession,
  makeSession,
  mockControls,
  supabase
} from '../helpers/supabaseMock';

jest.mock('../../src/lib/supabase', () => require('../helpers/supabaseMock'));

const Providers = ({ children }: PropsWithChildren) => (
  <AuthProvider>
    <ProgressProvider>{children}</ProgressProvider>
  </AuthProvider>
);

const renderProgress = async () => {
  const hook = await renderHook(
    () => ({ auth: useAuth(), progress: useProgress() }),
    { wrapper: Providers }
  );

  await waitFor(() => expect(hook.result.current.progress.isHydrating).toBe(false));

  return hook;
};

const savedState = (index = 0) =>
  mockControls.upsert.mock.calls[index][0].progress_state as ProgressState;

beforeEach(() => {
  mockControls.reset();
});

describe('guest mode', () => {
  it('shows the sample player without touching the database', async () => {
    const { result } = await renderProgress();

    expect(result.current.progress.player).toEqual(samplePlayer);
    expect(result.current.progress.syncError).toBeNull();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('derives OVR and level from the current player', async () => {
    const { result } = await renderProgress();

    expect(result.current.progress.ovr).toBe(calculateOvr(samplePlayer.attributes));
    expect(result.current.progress.levelInfo).toEqual(
      getLevelInfo(samplePlayer.totalXp)
    );
  });

  it('logs workouts locally and never saves them', async () => {
    const { result } = await renderProgress();
    const xpBefore = result.current.progress.player.totalXp;

    let update;
    await act(async () => {
      update = result.current.progress.logWorkout('shooting', 'medium');
    });

    expect(update).toMatchObject({ workoutXpGained: 120 });
    expect(result.current.progress.player.totalXp).toBeGreaterThan(xpBefore);
    expect(result.current.progress.state.trainingSessions).toHaveLength(1);
    expect(mockControls.upsert).not.toHaveBeenCalled();
  });

  it('refuses a workout past the daily limit and changes nothing', async () => {
    const { result } = await renderProgress();

    await act(async () => {
      result.current.progress.logWorkout('shooting', 'medium');
    });
    await act(async () => {
      result.current.progress.logWorkout('shooting', 'medium');
    });
    const before = result.current.progress.state;

    let update: unknown = 'not called';
    await act(async () => {
      update = result.current.progress.logWorkout('shooting', 'hard');
    });

    expect(update).toBeNull();
    expect(result.current.progress.state).toBe(before);
    expect(result.current.progress.state.trainingSessions).toHaveLength(2);
  });

  it('works when Supabase is not configured at all', async () => {
    mockControls.setConfigured(false);

    const { result } = await renderProgress();

    await act(async () => {
      result.current.progress.logWorkout('defense', 'hard');
    });

    expect(result.current.progress.player.name).toBe(samplePlayer.name);
    expect(result.current.progress.state.trainingSessions).toHaveLength(1);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('throws a clear error when used outside the provider', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await expect(renderHook(() => useProgress())).rejects.toThrow(
        'useProgress must be used inside ProgressProvider'
      );
    } finally {
      consoleError.mockRestore();
    }
  });
});

describe('loading a signed-in player', () => {
  it('loads the saved progress from the cloud', async () => {
    mockControls.startSignedIn(makeSession('user-1'));
    mockControls.setStoredProgress(newPlayerState({ speed: 33 }, 700));

    const { result } = await renderProgress();

    expect(mockControls.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(result.current.progress.player.name).toBe('Luka Tester');
    expect(result.current.progress.player.totalXp).toBe(700);
    expect(result.current.progress.player.attributes.speed).toBe(33);
    expect(result.current.progress.syncError).toBeNull();
    expect(mockControls.upsert).not.toHaveBeenCalled();
  });

  it('drops a leftover signup profile once a cloud save exists', async () => {
    savePendingSignupProfile(signupProfile);
    mockControls.startSignedIn();
    mockControls.setStoredProgress(newPlayerState());

    await renderProgress();

    expect(getPendingSignupProfile()).toBeNull();
  });

  it('creates the first save from the profile entered at signup', async () => {
    savePendingSignupProfile({ ...signupProfile, name: 'Confirmed Later' });
    mockControls.startSignedIn(makeSession('user-2', 'two@example.com'));
    mockControls.setStoredProgress(null);

    const { result } = await renderProgress();

    expect(result.current.progress.player.name).toBe('Confirmed Later');
    expect(result.current.progress.player.totalXp).toBe(0);
    expect(result.current.progress.ovr).toBe(0);
    expect(mockControls.upsert).toHaveBeenCalledTimes(1);
    expect(mockControls.upsert.mock.calls[0][0]).toMatchObject({
      user_id: 'user-2',
      email: 'two@example.com'
    });
    expect(savedState().player.name).toBe('Confirmed Later');
    expect(getPendingSignupProfile()).toBeNull();
  });

  it('builds a default profile from the email when nothing was entered', async () => {
    mockControls.startSignedIn(makeSession('user-3', 'jalen.novak@example.com'));
    mockControls.setStoredProgress(null);

    const { result } = await renderProgress();

    expect(result.current.progress.player.name).toBe('Jalen Novak');
    expect(savedState().player.name).toBe('Jalen Novak');
    expect(result.current.progress.state.quests).toHaveLength(6);
  });

  it('reports a sync issue when the first save cannot be written, and keeps the signup profile', async () => {
    savePendingSignupProfile(signupProfile);
    mockControls.startSignedIn();
    mockControls.setStoredProgress(null);
    mockControls.upsert.mockResolvedValue({ error: { message: 'insert blocked' } });

    const { result } = await renderProgress();

    expect(result.current.progress.syncError).toBe('insert blocked');
    expect(result.current.progress.player.name).toBe('Luka Tester');
    expect(getPendingSignupProfile()).toEqual(signupProfile);
  });

  it('reports a sync issue when the cloud cannot be reached', async () => {
    mockControls.startSignedIn();
    mockControls.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'TypeError: Failed to fetch' }
    });

    const { result } = await renderProgress();

    expect(result.current.progress.syncError).toBe(NETWORK_ERROR_MESSAGE);
    expect(result.current.progress.isHydrating).toBe(false);
  });

  it('does not hang on the loading screen if loading throws', async () => {
    mockControls.startSignedIn();
    mockControls.maybeSingle.mockRejectedValue(new TypeError('Failed to fetch'));

    const { result } = await renderProgress();

    expect(result.current.progress.syncError).toBe(NETWORK_ERROR_MESSAGE);
  });

  it('never overwrites the cloud save with placeholder data after a failed load', async () => {
    mockControls.startSignedIn();
    mockControls.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'Failed to fetch' }
    });

    const { result } = await renderProgress();

    await act(async () => {
      result.current.progress.logWorkout('shooting', 'hard');
    });
    await act(async () => {
      result.current.progress.updateProfile({ name: 'Wrong Player' });
    });

    expect(mockControls.upsert).not.toHaveBeenCalled();
    expect(result.current.progress.syncError).toBe(NETWORK_ERROR_MESSAGE);
  });
});

describe('saving a signed-in player', () => {
  const signedIn = async (state: ProgressState = newPlayerState()) => {
    mockControls.startSignedIn(makeSession('user-1', 'one@example.com'));
    mockControls.setStoredProgress(state);

    return renderProgress();
  };

  it('saves the focus areas of a logged workout', async () => {
    const { result } = await signedIn();

    await act(async () => {
      result.current.progress.logWorkout('defense', 'hard', ['perimeter']);
    });

    await waitFor(() => expect(mockControls.upsert).toHaveBeenCalledTimes(1));
    const saved = savedState();

    expect(saved.trainingSessions[0].focus).toEqual(['perimeter']);
    expect(saved.player.attributes.perimeterDefense).toBe(4);
    expect(saved.player.attributes.interiorDefense).toBe(0);
  });

  it('saves every logged workout', async () => {
    const { result } = await signedIn();

    await act(async () => {
      result.current.progress.logWorkout('athletic', 'hard');
    });

    expect(mockControls.upsert).toHaveBeenCalledTimes(1);
    expect(mockControls.upsert.mock.calls[0][0]).toMatchObject({
      user_id: 'user-1',
      email: 'one@example.com'
    });
    expect(savedState().player.totalXp).toBe(result.current.progress.player.totalXp);
    expect(savedState().trainingSessions).toHaveLength(1);
    expect(savedState().player.attributes.stamina).toBe(3);
  });

  it('returns the workout result and updates OVR and level', async () => {
    const { result } = await signedIn();

    let update: ReturnType<typeof result.current.progress.logWorkout> | undefined;
    await act(async () => {
      update = result.current.progress.logWorkout('rebounding', 'hard');
    });

    expect(update?.levelUp).toEqual({ previousLevel: 1, level: 2 });
    expect(result.current.progress.levelInfo.level).toBe(2);
    expect(result.current.progress.state.lastLevelUp).toEqual({
      previousLevel: 1,
      level: 2
    });
    expect(result.current.progress.ovr).toBe(
      calculateOvr(result.current.progress.player.attributes)
    );
  });

  it('builds each workout on top of the previous one', async () => {
    const { result } = await signedIn();

    await act(async () => {
      result.current.progress.logWorkout('strength', 'light');
    });
    await act(async () => {
      result.current.progress.logWorkout('strength', 'light');
    });

    expect(result.current.progress.player.attributes.strength).toBe(2);
    expect(result.current.progress.state.trainingSessions).toHaveLength(2);
    expect(savedState(1).player.attributes.strength).toBe(2);
  });

  it('closes the level-up popup without saving again', async () => {
    const { result } = await signedIn();

    await act(async () => {
      result.current.progress.logWorkout('rebounding', 'hard');
    });
    await act(async () => {
      result.current.progress.dismissLevelUp();
    });

    expect(result.current.progress.state.lastLevelUp).toBeNull();
    expect(result.current.progress.levelInfo.level).toBe(2);
    expect(mockControls.upsert).toHaveBeenCalledTimes(1);
  });

  it('saves profile edits and keeps XP and attributes', async () => {
    const { result } = await signedIn(newPlayerState({ speed: 20 }, 400));

    await act(async () => {
      result.current.progress.updateProfile({
        name: 'New Name',
        position: 'Center',
        heightCm: 210,
        heightUnit: 'in'
      });
    });

    expect(result.current.progress.player).toMatchObject({
      name: 'New Name',
      position: 'Center',
      heightCm: 210,
      heightUnit: 'in',
      totalXp: 400
    });
    expect(result.current.progress.player.attributes.speed).toBe(20);
    expect(mockControls.upsert).toHaveBeenCalledTimes(1);
    expect(savedState().player.name).toBe('New Name');
  });

  it('trims the name and goal and refuses to blank them out', async () => {
    const { result } = await signedIn();

    await act(async () => {
      result.current.progress.updateProfile({ name: '   ', mainGoal: '' });
    });

    expect(result.current.progress.player.name).toBe('Luka Tester');
    expect(result.current.progress.player.mainGoal).toBe('Run the offense');

    await act(async () => {
      result.current.progress.updateProfile({ name: '  Trimmed  ', mainGoal: ' Win ' });
    });

    expect(result.current.progress.player.name).toBe('Trimmed');
    expect(result.current.progress.player.mainGoal).toBe('Win');
  });

  it('leaves untouched fields alone on a partial profile update', async () => {
    const { result } = await signedIn();

    await act(async () => {
      result.current.progress.updateProfile({ weightKg: 95 });
    });

    expect(result.current.progress.player.weightKg).toBe(95);
    expect(result.current.progress.player.name).toBe('Luka Tester');
    expect(result.current.progress.player.archetype).toBe('Floor General');
  });

  it('starts over with a brand new profile', async () => {
    const { result } = await signedIn(newPlayerState({ speed: 80 }, 5000));

    await act(async () => {
      result.current.progress.createNewProfile({ ...signupProfile, name: 'Fresh Start' });
    });

    expect(result.current.progress.player.name).toBe('Fresh Start');
    expect(result.current.progress.player.totalXp).toBe(0);
    expect(result.current.progress.ovr).toBe(0);
    expect(result.current.progress.state.trainingSessions).toEqual([]);
    expect(savedState().player.name).toBe('Fresh Start');
  });

  it('flags a sync issue when a save fails and clears it when the next one works', async () => {
    const { result } = await signedIn();

    mockControls.upsert.mockResolvedValueOnce({ error: { message: 'Failed to fetch' } });
    await act(async () => {
      result.current.progress.logWorkout('defense', 'light');
    });

    await waitFor(() =>
      expect(result.current.progress.syncError).toBe(NETWORK_ERROR_MESSAGE)
    );
    // progress is still kept on the device
    expect(result.current.progress.state.trainingSessions).toHaveLength(1);

    await act(async () => {
      result.current.progress.logWorkout('defense', 'light');
    });

    await waitFor(() => expect(result.current.progress.syncError).toBeNull());
    expect(savedState(1).trainingSessions).toHaveLength(2);
  });

  it('does not crash when a save throws', async () => {
    const { result } = await signedIn();

    mockControls.upsert.mockRejectedValueOnce(new TypeError('Network request failed'));
    await act(async () => {
      result.current.progress.logWorkout('defense', 'light');
    });

    await waitFor(() =>
      expect(result.current.progress.syncError).toBe(NETWORK_ERROR_MESSAGE)
    );
  });
});

describe('switching accounts', () => {
  it('loads the player after signing in from guest mode', async () => {
    const { result } = await renderProgress();

    expect(result.current.progress.player.name).toBe(samplePlayer.name);

    mockControls.setStoredProgress(newPlayerState({}, 600));
    await act(async () => {
      mockControls.emitAuthChange('SIGNED_IN', makeSession('user-5'));
    });
    await waitFor(() =>
      expect(result.current.progress.player.name).toBe('Luka Tester')
    );

    expect(result.current.progress.player.totalXp).toBe(600);
    expect(result.current.progress.isHydrating).toBe(false);
  });

  it('goes back to the sample player after signing out', async () => {
    mockControls.startSignedIn();
    mockControls.setStoredProgress(newPlayerState({}, 600));
    const { result } = await renderProgress();

    await act(async () => {
      mockControls.emitAuthChange('SIGNED_OUT', null);
    });
    await waitFor(() =>
      expect(result.current.progress.player.name).toBe(samplePlayer.name)
    );

    expect(result.current.progress.syncError).toBeNull();
  });

  it('stops saving once signed out', async () => {
    mockControls.startSignedIn();
    mockControls.setStoredProgress(newPlayerState());
    const { result } = await renderProgress();

    await act(async () => {
      mockControls.emitAuthChange('SIGNED_OUT', null);
    });
    await waitFor(() =>
      expect(result.current.progress.player.name).toBe(samplePlayer.name)
    );
    await act(async () => {
      result.current.progress.logWorkout('shooting', 'light');
    });

    expect(mockControls.upsert).not.toHaveBeenCalled();
  });

  it('loads the second account and saves under its id', async () => {
    mockControls.startSignedIn(makeSession('user-a', 'a@example.com'));
    mockControls.setStoredProgress(newPlayerState({}, 100));
    const { result } = await renderProgress();

    mockControls.setStoredProgress({
      ...newPlayerState({}, 900),
      player: { ...newPlayerState({}, 900).player, name: 'Second Account' }
    });
    await act(async () => {
      mockControls.emitAuthChange('SIGNED_IN', makeSession('user-b', 'b@example.com'));
    });
    await waitFor(() =>
      expect(result.current.progress.player.name).toBe('Second Account')
    );

    await act(async () => {
      result.current.progress.logWorkout('shooting', 'light');
    });

    expect(mockControls.upsert).toHaveBeenCalledTimes(1);
    expect(mockControls.upsert.mock.calls[0][0]).toMatchObject({
      user_id: 'user-b',
      email: 'b@example.com'
    });
    expect(savedState().player.name).toBe('Second Account');
  });
});

describe('first Google sign-in', () => {
  const googleNewcomer = async () => {
    mockControls.startSignedIn(makeGoogleSession('google-1', 'jordan@gmail.com'));
    mockControls.setStoredProgress(null);

    return renderProgress();
  };

  it('asks for the player setup instead of saving a made-up profile', async () => {
    const { result } = await googleNewcomer();

    expect(mockControls.eq).toHaveBeenCalledWith('user_id', 'google-1');
    expect(result.current.progress.needsPlayerSetup).toBe(true);
    expect(result.current.progress.syncError).toBeNull();
    expect(mockControls.upsert).not.toHaveBeenCalled();
  });

  it('saves nothing but the setup while it is pending', async () => {
    const { result } = await googleNewcomer();

    await act(async () => {
      result.current.progress.logWorkout('shooting', 'hard');
    });
    await act(async () => {
      result.current.progress.updateProfile({ name: 'Placeholder' });
    });

    expect(mockControls.upsert).not.toHaveBeenCalled();
  });

  it('creates the first save from the setup and finishes it', async () => {
    const { result } = await googleNewcomer();
    let saveError: string | null | undefined;

    await act(async () => {
      saveError = await result.current.progress.createNewProfile({
        ...signupProfile,
        name: 'Jordan Miles'
      });
    });

    expect(saveError).toBeNull();
    expect(result.current.progress.needsPlayerSetup).toBe(false);
    expect(result.current.progress.player.name).toBe('Jordan Miles');
    expect(mockControls.upsert).toHaveBeenCalledTimes(1);
    expect(mockControls.upsert.mock.calls[0][0]).toMatchObject({
      user_id: 'google-1',
      email: 'jordan@gmail.com'
    });
    expect(savedState().player).toMatchObject({
      name: 'Jordan Miles',
      position: signupProfile.position,
      totalXp: 0
    });
  });

  it('keeps the setup open when the first save fails', async () => {
    const { result } = await googleNewcomer();
    mockControls.upsert.mockResolvedValueOnce({ error: { message: 'insert blocked' } });
    let saveError: string | null | undefined;

    await act(async () => {
      saveError = await result.current.progress.createNewProfile(signupProfile);
    });

    expect(saveError).toBe('insert blocked');
    expect(result.current.progress.needsPlayerSetup).toBe(true);

    await act(async () => {
      saveError = await result.current.progress.createNewProfile(signupProfile);
    });

    expect(saveError).toBeNull();
    expect(result.current.progress.needsPlayerSetup).toBe(false);
    expect(mockControls.upsert).toHaveBeenCalledTimes(2);
  });

  it('uses a profile entered at email sign-up on this device', async () => {
    savePendingSignupProfile({ ...signupProfile, name: 'Typed Earlier' });

    const { result } = await googleNewcomer();

    expect(result.current.progress.needsPlayerSetup).toBe(false);
    expect(savedState().player.name).toBe('Typed Earlier');
  });

  it('loads a returning Google player without asking again', async () => {
    mockControls.startSignedIn(makeGoogleSession('google-1'));
    mockControls.setStoredProgress(newPlayerState({ speed: 40 }, 800));

    const { result } = await renderProgress();

    expect(result.current.progress.needsPlayerSetup).toBe(false);
    expect(result.current.progress.player.attributes.speed).toBe(40);
    expect(mockControls.upsert).not.toHaveBeenCalled();
  });

  it('drops the pending setup on sign out', async () => {
    const { result } = await googleNewcomer();

    await act(async () => {
      mockControls.emitAuthChange('SIGNED_OUT', null);
    });

    await waitFor(() => expect(result.current.progress.needsPlayerSetup).toBe(false));
    expect(result.current.progress.player).toEqual(samplePlayer);
  });
});

describe('a signup profile typed for another account', () => {
  it('is not given to a Google newcomer with a different email, and is kept', async () => {
    savePendingSignupProfile({ ...signupProfile, name: 'Email Signup' }, 'sam@example.com');
    mockControls.startSignedIn(makeGoogleSession('google-1', 'jordan@gmail.com'));
    mockControls.setStoredProgress(null);

    const { result } = await renderProgress();

    expect(result.current.progress.needsPlayerSetup).toBe(true);
    expect(mockControls.upsert).not.toHaveBeenCalled();
    expect(getPendingSignupProfile('sam@example.com')?.name).toBe('Email Signup');
  });

  it('is used when Google signs in the same email that signed up', async () => {
    savePendingSignupProfile({ ...signupProfile, name: 'Email Signup' }, 'jordan@gmail.com');
    mockControls.startSignedIn(makeGoogleSession('google-1', 'Jordan@Gmail.com'));
    mockControls.setStoredProgress(null);

    const { result } = await renderProgress();

    expect(result.current.progress.needsPlayerSetup).toBe(false);
    expect(savedState().player.name).toBe('Email Signup');
    expect(getPendingSignupProfile()).toBeNull();
  });

  it('is not used for the default profile of another email account', async () => {
    savePendingSignupProfile({ ...signupProfile, name: 'Email Signup' }, 'sam@example.com');
    mockControls.startSignedIn(makeSession('user-3', 'jalen.novak@example.com'));
    mockControls.setStoredProgress(null);

    await renderProgress();

    expect(savedState().player.name).toBe('Jalen Novak');
    expect(getPendingSignupProfile('sam@example.com')?.name).toBe('Email Signup');
  });

  it('is not deleted when another account with a cloud save signs in', async () => {
    savePendingSignupProfile(signupProfile, 'sam@example.com');
    mockControls.startSignedIn(makeSession('user-1', 'other@example.com'));
    mockControls.setStoredProgress(newPlayerState());

    await renderProgress();

    expect(getPendingSignupProfile('sam@example.com')).toEqual(signupProfile);
  });
});

describe('session refreshes', () => {
  it('does not reload the player when the token refreshes', async () => {
    mockControls.startSignedIn(makeSession('user-1', 'one@example.com'));
    mockControls.setStoredProgress(newPlayerState());
    const { result } = await renderProgress();

    await act(async () => {
      result.current.progress.logWorkout('shooting', 'hard');
    });
    await act(async () => {
      mockControls.emitAuthChange(
        'TOKEN_REFRESHED',
        makeSession('user-1', 'one@example.com')
      );
    });

    expect(mockControls.maybeSingle).toHaveBeenCalledTimes(1);
    expect(result.current.progress.isHydrating).toBe(false);
    expect(result.current.progress.state.trainingSessions).toHaveLength(1);
  });

  it('keeps an open player setup able to save through a token refresh', async () => {
    mockControls.startSignedIn(makeGoogleSession('google-1', 'jordan@gmail.com'));
    mockControls.setStoredProgress(null);
    const { result } = await renderProgress();
    // A reload now would fail and leave the setup unable to save.
    mockControls.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'Failed to fetch' }
    });

    await act(async () => {
      mockControls.emitAuthChange(
        'TOKEN_REFRESHED',
        makeGoogleSession('google-1', 'jordan@gmail.com')
      );
    });

    let saveError: string | null | undefined;

    await act(async () => {
      saveError = await result.current.progress.createNewProfile(signupProfile);
    });

    expect(saveError).toBeNull();
    expect(mockControls.upsert).toHaveBeenCalledTimes(1);
    expect(mockControls.upsert.mock.calls[0][0]).toMatchObject({ user_id: 'google-1' });
  });
});

describe('switching accounts during the player setup', () => {
  it('does not show the setup to the next account when its load fails', async () => {
    mockControls.startSignedIn(makeGoogleSession('google-1', 'jordan@gmail.com'));
    mockControls.setStoredProgress(null);
    const { result } = await renderProgress();

    expect(result.current.progress.needsPlayerSetup).toBe(true);

    mockControls.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'Failed to fetch' }
    });
    await act(async () => {
      mockControls.emitAuthChange('SIGNED_IN', makeSession('user-b', 'b@example.com'));
    });
    await waitFor(() => expect(result.current.progress.isHydrating).toBe(false));

    expect(result.current.progress.needsPlayerSetup).toBe(false);
    expect(result.current.progress.syncError).toBe(NETWORK_ERROR_MESSAGE);

    await act(async () => {
      await result.current.progress.createNewProfile(signupProfile);
    });

    expect(mockControls.upsert).not.toHaveBeenCalled();
  });
});
