import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import DescribeTrainingScreen from '../../app/describe';
import TrainScreen from '../../app/(tabs)/train';
import ProfileScreen from '../../app/(tabs)/profile';
import { LevelUpModal } from '../../src/components/player/LevelUpModal';
import { usePlan } from '../../src/store/PlanContext';
import { useProgress } from '../../src/store/ProgressContext';
import { newPlayerState } from '../helpers/fixtures';
import { readProbe, renderApp } from '../helpers/renderApp';
import { makeSession, mockControls } from '../helpers/supabaseMock';
import { Text } from 'react-native';

jest.mock('../../src/lib/supabase', () => require('../helpers/supabaseMock'));

const signInWith = (plan: string | null, state = newPlayerState()) => {
  mockControls.startSignedIn(makeSession('user-1', 'one@example.com'));
  mockControls.setStoredProgress(state);
  mockControls.setPlan(plan);
};

const lastSavedState = () => {
  const calls = mockControls.upsert.mock.calls;

  return calls[calls.length - 1][0].progress_state;
};

const PlanProbe = () => {
  const { plan, isPremium, isLoadingPlan } = usePlan();

  return <Text testID="plan-probe">{JSON.stringify({ plan, isPremium, isLoadingPlan })}</Text>;
};

const readPlan = () =>
  JSON.parse(screen.getByTestId('plan-probe').props.children as string) as {
    plan: string;
    isPremium: boolean;
    isLoadingPlan: boolean;
  };

beforeEach(() => {
  mockControls.reset();
  jest.mocked(router.push).mockClear();
});

describe('plans', () => {
  it('reads premium from user_plans for the signed-in player', async () => {
    signInWith('premium');
    await renderApp(<PlanProbe />);

    await waitFor(() => expect(readPlan()).toMatchObject({ plan: 'premium', isPremium: true }));
    expect(mockControls.planSelect).toHaveBeenCalledWith('plan');
  });

  it('treats a missing row, an unknown value or a failed read as free', async () => {
    signInWith(null);
    await renderApp(<PlanProbe />);
    await waitFor(() => expect(readPlan().isLoadingPlan).toBe(false));
    expect(readPlan()).toMatchObject({ plan: 'free', isPremium: false });
  });

  it('keeps guests on free without asking the server', async () => {
    await renderApp(<PlanProbe />);

    expect(readPlan()).toMatchObject({ plan: 'free', isPremium: false });
    expect(mockControls.planSelect).not.toHaveBeenCalled();
  });
});

describe('Describe your training', () => {
  it('shows free players what Premium does, without the text box', async () => {
    signInWith(null);
    await renderApp(<DescribeTrainingScreen />);

    await waitFor(() => expect(screen.getByText('Part of Premium')).toBeOnTheScreen());
    expect(screen.queryByLabelText('What did you train today?')).not.toBeOnTheScreen();
  });

  it('opens from the Train screen, marked Premium for free players', async () => {
    signInWith(null);
    await renderApp(<TrainScreen />);

    expect(screen.getByText('Premium')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Describe your training' }));
    expect(router.push).toHaveBeenCalledWith('/describe');
  });

  it('reads the description, lets the player adjust it, then logs everything at once', async () => {
    signInWith('premium');
    mockControls.invoke.mockResolvedValue({
      data: {
        status: 'ok',
        workouts: [
          {
            workoutType: 'shooting',
            intensity: 'hard',
            focus: ['midRange', 'threePointers'],
            note: '100 mid-range, 50 threes'
          },
          { workoutType: 'game', intensity: 'medium', focus: [], note: '3 games to 21' },
          { workoutType: 'defense', intensity: 'light', focus: [], note: 'some defense' }
        ]
      },
      error: null
    });
    await renderApp(<DescribeTrainingScreen />);

    await waitFor(() =>
      expect(screen.getByLabelText('What did you train today?')).toBeOnTheScreen()
    );
    await fireEvent.changeText(
      screen.getByLabelText('What did you train today?'),
      '100 mid-range, 50 threes, 3 games to 21'
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Read my training' }));

    expect(await screen.findByText("Here's what I understood")).toBeOnTheScreen();
    expect(screen.getByText('Shooting Workout: mid-range, three-pointers')).toBeOnTheScreen();
    expect(screen.getByText('100 mid-range, 50 threes')).toBeOnTheScreen();

    // drop the defense entry the player did not really do
    await fireEvent.press(screen.getByRole('button', { name: 'Remove Defense Workout' }));
    expect(screen.queryByText('Defense Workout')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Log 2 workouts' }));

    expect(screen.getByText('Logged 2 workouts.')).toBeOnTheScreen();
    expect(readProbe().sessions).toBe(2);
    await waitFor(() => expect(mockControls.upsert).toHaveBeenCalledTimes(1));
    expect(
      lastSavedState().trainingSessions.map((session: { workoutType: string }) => session.workoutType)
    ).toEqual(['game', 'shooting']);
  });

  it('applies a changed intensity and skips a workout already done today', async () => {
    const state = newPlayerState();
    // shooting twice today: done and the bonus is used
    const today = new Date().toISOString();
    const session = (id: string) => ({
      id,
      workoutType: 'shooting' as const,
      intensity: 'medium' as const,
      xpGained: 120,
      questXpGained: 0,
      attributeGains: {},
      completedAt: today
    });
    signInWith('premium', { ...state, trainingSessions: [session('s1'), session('s2')] });
    mockControls.invoke.mockResolvedValue({
      data: {
        status: 'ok',
        workouts: [
          { workoutType: 'shooting', intensity: 'medium', focus: [], note: '' },
          { workoutType: 'defense', intensity: 'medium', focus: [], note: '' }
        ]
      },
      error: null
    });
    await renderApp(<DescribeTrainingScreen />);

    await waitFor(() =>
      expect(screen.getByLabelText('What did you train today?')).toBeOnTheScreen()
    );
    await fireEvent.changeText(screen.getByLabelText('What did you train today?'), 'x');
    await fireEvent.press(screen.getByRole('button', { name: 'Read my training' }));

    expect(await screen.findByText('Already done today, will be skipped')).toBeOnTheScreen();
    // pick Hard for the defense entry (second set of intensity buttons)
    await fireEvent.press(screen.getAllByRole('button', { name: 'Hard' })[1]);
    await fireEvent.press(screen.getByRole('button', { name: 'Log 2 workouts' }));

    expect(
      screen.getByText("Logged 1 workout. Skipped for today's limit: Shooting Workout.")
    ).toBeOnTheScreen();
    await waitFor(() => expect(mockControls.upsert).toHaveBeenCalledTimes(1));
    expect(lastSavedState().trainingSessions[0]).toMatchObject({
      workoutType: 'defense',
      intensity: 'hard'
    });
  });

  it('marks the demo reading while the AI is not set up', async () => {
    signInWith('premium');
    await renderApp(<DescribeTrainingScreen />);

    await waitFor(() =>
      expect(screen.getByLabelText('What did you train today?')).toBeOnTheScreen()
    );
    await fireEvent.changeText(screen.getByLabelText('What did you train today?'), 'shooting');
    await fireEvent.press(screen.getByRole('button', { name: 'Read my training' }));

    expect(
      await screen.findByText("Demo reading: the AI isn't available yet, so this uses simple keyword matching.")
    ).toBeOnTheScreen();
  });

  it('shows the server message when the read fails', async () => {
    signInWith('premium');
    mockControls.invoke.mockResolvedValue({
      data: { status: 'limit_reached', limit: 10 },
      error: null
    });
    await renderApp(<DescribeTrainingScreen />);

    await waitFor(() =>
      expect(screen.getByLabelText('What did you train today?')).toBeOnTheScreen()
    );
    await fireEvent.changeText(screen.getByLabelText('What did you train today?'), 'shooting');
    await fireEvent.press(screen.getByRole('button', { name: 'Read my training' }));

    expect(
      await screen.findByText("You've used all 10 training reads for today. More tomorrow.")
    ).toBeOnTheScreen();
  });
});

describe('logWorkouts', () => {
  let logWorkouts: ReturnType<typeof useProgress>['logWorkouts'];

  const Capture = () => {
    logWorkouts = useProgress().logWorkouts;
    return null;
  };

  it('applies the daily limit inside the batch and saves once', async () => {
    signInWith('premium');
    await renderApp(<Capture />);

    let results: unknown[] = [];
    await waitFor(() => expect(logWorkouts).toBeDefined());
    await act(async () => {
      results = logWorkouts([
        { workoutType: 'shooting', intensity: 'medium' },
        { workoutType: 'shooting', intensity: 'medium' },
        { workoutType: 'shooting', intensity: 'medium' },
        { workoutType: 'defense', intensity: 'light' }
      ]);
    });

    // first time, then the bonus repeat, then locked; defense still once
    expect(results.map(Boolean)).toEqual([true, true, false, true]);
    expect(readProbe().sessions).toBe(3);
    await waitFor(() => expect(mockControls.upsert).toHaveBeenCalledTimes(1));
  });

  it('shows one level-up popup for the whole batch', async () => {
    // 840 XP: level 3 needs 390 more for level 4
    signInWith('premium', newPlayerState({}, 840));
    await renderApp(
      <>
        <Capture />
        <LevelUpModal />
      </>
    );

    await act(async () => {
      logWorkouts([
        { workoutType: 'shooting', intensity: 'hard' },
        { workoutType: 'defense', intensity: 'hard' },
        { workoutType: 'rebounding', intensity: 'light' }
      ]);
    });

    expect(screen.getByText('Level up')).toBeOnTheScreen();
    expect(screen.getByText(/Up from level\s+3/)).toBeOnTheScreen();
  });
});

describe('Profile premium card (test mode)', () => {
  // The database function writes the plan; the mock does the same so the
  // read-back after the switch sees it.
  const rpcSetsPlan = () =>
    mockControls.rpc.mockImplementation(async (_name: string, args: { new_plan: string }) => {
      mockControls.setPlan(args.new_plan);
      return { data: args.new_plan, error: null };
    });

  it('upgrades a free player to premium and back', async () => {
    signInWith(null);
    rpcSetsPlan();
    await renderApp(<ProfileScreen />);

    expect(await screen.findByText('$5 a month')).toBeOnTheScreen();
    expect(screen.getByText('Test mode: no payment is taken yet.')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Upgrade to Premium' }));

    expect(mockControls.rpc).toHaveBeenCalledWith('set_test_plan', { new_plan: 'premium' });
    expect(await screen.findByText("You're on Premium")).toBeOnTheScreen();
    expect(screen.queryByText('$5 a month')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Cancel Premium' }));

    expect(mockControls.rpc).toHaveBeenLastCalledWith('set_test_plan', { new_plan: 'free' });
    expect(await screen.findByRole('button', { name: 'Upgrade to Premium' })).toBeOnTheScreen();
  });

  it('says when test upgrades are turned off', async () => {
    signInWith(null);
    mockControls.rpc.mockResolvedValue({
      data: null,
      error: { code: 'P0001', message: 'test_upgrades_disabled' }
    });
    await renderApp(<ProfileScreen />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Upgrade to Premium' }));

    expect(await screen.findByText('Upgrades are not open yet.')).toBeOnTheScreen();
    expect(screen.queryByText("You're on Premium")).not.toBeOnTheScreen();
  });

  it('says when the database function is not added yet', async () => {
    signInWith(null);
    mockControls.rpc.mockResolvedValue({
      data: null,
      error: { code: 'PGRST202', message: 'Could not find the function' }
    });
    await renderApp(<ProfileScreen />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Upgrade to Premium' }));

    expect(await screen.findByText('Upgrades are not set up yet.')).toBeOnTheScreen();
  });

  it('asks guests to sign in instead of offering the upgrade', async () => {
    await renderApp(<ProfileScreen />);

    expect(screen.getByText('Sign in to get Premium.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Upgrade to Premium' })).not.toBeOnTheScreen();
    expect(mockControls.rpc).not.toHaveBeenCalled();
  });
});
