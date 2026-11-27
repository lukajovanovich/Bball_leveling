import React, { PropsWithChildren } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { NETWORK_ERROR_MESSAGE } from '../../src/lib/authErrors';
import {
  MISSED_DAY_XP_PENALTY,
  buildDailyQuests,
  buildWeeklyQuests,
  createQuestCycle
} from '../../src/lib/quests';
import { AuthProvider } from '../../src/store/AuthContext';
import { ProgressProvider, useProgress } from '../../src/store/ProgressContext';
import { ProgressState } from '../../src/types';
import { attributesWith, newPlayerState } from '../helpers/fixtures';
import { makeSession, mockControls } from '../helpers/supabaseMock';

jest.mock('../../src/lib/supabase', () => require('../helpers/supabaseMock'));

const Providers = ({ children }: PropsWithChildren) => (
  <AuthProvider>
    <ProgressProvider>{children}</ProgressProvider>
  </AuthProvider>
);

// Local times, so "midnight" means the same in every time zone.
const LATE_THURSDAY = new Date(2026, 10, 26, 23, 59, 0);
const EARLY_FRIDAY = new Date(2026, 10, 27, 0, 0, 30);

const rotatingState = (now: Date): ProgressState => {
  const base = newPlayerState(attributesWith({}, 50), 700);
  const cycle = createQuestCycle(now);

  return {
    ...base,
    quests: [
      ...buildDailyQuests(base.player, cycle.dayKey),
      ...buildWeeklyQuests(base.player, cycle.weekKey)
    ],
    questCycle: cycle
  };
};

const lastSaved = () => {
  const calls = mockControls.upsert.mock.calls;

  return calls[calls.length - 1][0].progress_state as ProgressState;
};

const renderSignedIn = async (state: ProgressState) => {
  mockControls.startSignedIn(makeSession('user-1'));
  mockControls.setStoredProgress(state);

  const hook = await renderHook(() => useProgress(), { wrapper: Providers });
  await waitFor(() => expect(hook.result.current.isHydrating).toBe(false));

  return hook;
};

// Only "now" is faked, by hand: Jest's fake timers would also make the
// testing library wait on timers that never run.
const RealDate = Date;
let fakeNow: number | null = null;

class ClockDate extends RealDate {
  constructor(...args: unknown[]) {
    if (args.length === 0 && fakeNow !== null) {
      super(fakeNow);
    } else {
      // @ts-expect-error forwarding Date's overloads
      super(...args);
    }
  }

  static now() {
    return fakeNow ?? RealDate.now();
  }
}

const fakeClock = (now: Date) => {
  fakeNow = now.getTime();
  global.Date = ClockDate as DateConstructor;
};

const setClock = (now: Date) => {
  fakeNow = now.getTime();
};

/** Captures the once-a-minute check the provider schedules. */
const captureMinuteCheck = () => {
  const checks: (() => void)[] = [];
  const realSetInterval = global.setInterval;
  jest.spyOn(global, 'setInterval').mockImplementation(((
    callback: () => void,
    delay?: number
  ) => {
    if (delay === 60 * 1000) {
      checks.push(callback);
    }

    return realSetInterval(callback, delay);
  }) as typeof setInterval);

  return () => checks[checks.length - 1]?.();
};

beforeEach(() => {
  mockControls.reset();
});

afterEach(() => {
  fakeNow = null;
  global.Date = RealDate;
  jest.restoreAllMocks();
});

describe('quests roll over while the app stays open', () => {
  it('settles the day and saves when midnight passes, checked every minute', async () => {
    fakeClock(LATE_THURSDAY);
    const runMinuteCheck = captureMinuteCheck();
    const { result } = await renderSignedIn(rotatingState(LATE_THURSDAY));

    expect(mockControls.upsert).not.toHaveBeenCalled();
    const focusKey = result.current.state.quests[2].attributeKey!;

    await act(async () => {
      setClock(EARLY_FRIDAY);
      runMinuteCheck();
    });

    expect(result.current.state.questCycle?.dayKey).toBe('2026-11-27');
    expect(result.current.player.totalXp).toBe(700 - MISSED_DAY_XP_PENALTY);
    expect(result.current.player.attributes[focusKey]).toBe(49);
    await waitFor(() => expect(mockControls.upsert).toHaveBeenCalledTimes(1));
    expect(lastSaved().questCycle?.dayKey).toBe('2026-11-27');
  });

  it('checks again when the app comes back to the foreground', async () => {
    let onChange: ((state: AppStateStatus) => void) | undefined;
    // AppState is already a mock in jest-expo, so this only records the listener.
    jest.spyOn(AppState, 'addEventListener').mockImplementation((type, listener) => {
      if (type === 'change') {
        onChange = listener as (state: AppStateStatus) => void;
      }

      return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
    fakeClock(LATE_THURSDAY);
    const { result } = await renderSignedIn(rotatingState(LATE_THURSDAY));

    await act(async () => {
      setClock(EARLY_FRIDAY);
      onChange?.('background');
    });
    expect(result.current.state.questCycle?.dayKey).toBe('2026-11-26');

    await act(async () => {
      onChange?.('active');
    });

    expect(result.current.state.questCycle?.dayKey).toBe('2026-11-27');
    await waitFor(() => expect(mockControls.upsert).toHaveBeenCalledTimes(1));
  });

  it('changes and saves nothing while the day is the same', async () => {
    fakeClock(new Date(2026, 10, 26, 10, 0, 0));
    const runMinuteCheck = captureMinuteCheck();
    const { result } = await renderSignedIn(rotatingState(new Date(2026, 10, 26, 10, 0, 0)));
    const before = result.current.state;

    await act(async () => {
      setClock(new Date(2026, 10, 26, 10, 5, 0));
      runMinuteCheck();
    });

    expect(result.current.state).toBe(before);
    expect(mockControls.upsert).not.toHaveBeenCalled();
  });
});

describe('settling on load', () => {
  it('shows a sync issue when saving the settled day fails, but keeps the result', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    mockControls.upsert.mockRejectedValue(new TypeError('Failed to fetch'));

    const { result } = await renderSignedIn(rotatingState(yesterday));

    await waitFor(() => expect(result.current.syncError).toBe(NETWORK_ERROR_MESSAGE));
    expect(result.current.player.totalXp).toBe(700 - MISSED_DAY_XP_PENALTY);
  });

  it('reports a rest day that is not allowed', async () => {
    const { result } = await renderSignedIn(rotatingState(new Date()));
    let first = false;
    let second = true;

    await act(async () => {
      first = result.current.takeRestDay();
    });
    await act(async () => {
      // one rest day a week
      second = result.current.takeRestDay();
    });

    expect(first).toBe(true);
    expect(second).toBe(false);
  });
});
