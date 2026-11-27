import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { AppState } from 'react-native';
import {
  buildNewPlayerProfile,
  createInitialProgressState,
  createProgressStateFromPlayer
} from '../data/mockPlayer';
import { describeError } from '../lib/authErrors';
import {
  clearPendingSignupProfile,
  getPendingSignupProfile
} from '../lib/pendingSignup';
import {
  buildFallbackSignupProfile,
  needsPlayerSetupAfterSignIn
} from '../lib/playerIdentity';
import {
  fetchPlayerProgressState,
  upsertPlayerProgressState
} from '../lib/playerProfileStore';
import { cancelRestDay, refreshQuests, takeRestDay } from '../lib/quests';
import {
  applyWorkoutToProgress,
  calculateOvr,
  getDailyWorkoutStatus,
  getLevelInfo,
  getWorkoutAvailability
} from '../lib/progression';
import { PlayerProfile, ProgressState, ProgressUpdate, WorkoutIntensity, WorkoutType } from '../types';
import { useAuth } from './AuthContext';

type EditableProfileFields = Pick<
  PlayerProfile,
  | 'name'
  | 'heightCm'
  | 'heightUnit'
  | 'wingspanCm'
  | 'wingspanUnit'
  | 'weightKg'
  | 'weightUnit'
  | 'position'
  | 'mainGoal'
  | 'archetype'
>;

interface ProgressContextValue {
  state: ProgressState;
  player: PlayerProfile;
  ovr: number;
  levelInfo: ReturnType<typeof getLevelInfo>;
  isHydrating: boolean;
  syncError: string | null;
  /**
   * Signed in (e.g. with Google) but no player exists yet and none was entered
   * at sign-up. The app shows the player setup until createNewProfile runs.
   */
  needsPlayerSetup: boolean;
  /** Returns null, and changes nothing, when today's limit blocks this workout. */
  logWorkout: (
    workoutType: WorkoutType,
    intensity: WorkoutIntensity,
    /** Focus option ids; leave out for a general session. */
    focus?: readonly string[]
  ) => ProgressUpdate | null;
  /**
   * Logs several workouts in order as one change (one save). Each entry is
   * checked against the daily limit as it stands after the ones before it;
   * blocked entries are skipped and returned as null.
   */
  logWorkouts: (
    entries: ReadonlyArray<{
      workoutType: WorkoutType;
      intensity: WorkoutIntensity;
      focus?: readonly string[];
    }>
  ) => (ProgressUpdate | null)[];
  updateProfile: (profile: Partial<EditableProfileFields>) => void;
  /** Resolves with an error message when the save failed, else null. */
  createNewProfile: (profile: EditableProfileFields) => Promise<string | null>;
  dismissLevelUp: () => void;
  /** Takes today off with the weekly rest day; false when not allowed now. */
  takeRestDay: () => boolean;
  cancelRestDay: () => void;
}

const ProgressContext = createContext<ProgressContextValue | undefined>(undefined);

const missingConfigMessage =
  'Supabase is not configured yet. Add your Expo public Supabase env vars to enable cloud sync.';

export const ProgressProvider = ({ children }: PropsWithChildren) => {
  const { user, isLoading: isAuthLoading, isConfigured } = useAuth();
  const [state, setState] = useState<ProgressState>(() => createInitialProgressState());
  const [isHydrating, setIsHydrating] = useState(true);
  // Whose data the state holds. A new sign-in counts as loading from its very
  // first render, before the effect below has started the fetch; otherwise
  // the sign-in screen would see "signed in, not loading" and leave too early.
  const [hydratedUserId, setHydratedUserId] = useState<string | null | undefined>(
    undefined
  );
  const [syncError, setSyncError] = useState<string | null>(null);
  const [needsPlayerSetup, setNeedsPlayerSetup] = useState(false);
  // While setup is pending local state is placeholder data, so nothing but
  // the setup itself may be saved.
  const needsPlayerSetupRef = useRef(false);
  // Set only after this user's cloud save was read (or found to not exist).
  // Until then local state is not theirs, and saving it would overwrite their
  // real progress in the database.
  const cloudReadyUserIdRef = useRef<string | null>(null);
  // Loading follows the account id, not the session object: a token refresh
  // hands out a new user object for the same player, and reloading then would
  // drop a workout whose save is still on its way.
  const userId = user?.id ?? null;
  const userRef = useRef(user);
  userRef.current = user;

  const persistProgressState = useCallback(
    async (nextState: ProgressState): Promise<string | null> => {
      if (!user || !isConfigured) {
        return null;
      }

      if (cloudReadyUserIdRef.current !== user.id || needsPlayerSetupRef.current) {
        return null;
      }

      let message: string | null;

      try {
        const { error } = await upsertPlayerProgressState(
          user.id,
          user.email ?? null,
          nextState
        );

        message = error ? describeError(error) : null;
      } catch (error) {
        message = describeError(error);
      }

      setSyncError(message);
      return message;
    },
    [isConfigured, user]
  );

  useEffect(() => {
    let active = true;

    const user = userRef.current;

    const finishHydrating = () => {
      setIsHydrating(false);
      setHydratedUserId(user?.id ?? null);
    };

    const hydrate = async () => {
      if (isAuthLoading) {
        return;
      }

      if (!user) {
        cloudReadyUserIdRef.current = null;
        needsPlayerSetupRef.current = false;
        setNeedsPlayerSetup(false);

        if (active) {
          setState(createInitialProgressState());
          setSyncError(null);
          finishHydrating();
        }

        return;
      }

      if (!isConfigured) {
        if (active) {
          setSyncError(missingConfigMessage);
          finishHydrating();
        }

        return;
      }

      cloudReadyUserIdRef.current = null;
      // A setup still open for the previous account is not this one's.
      needsPlayerSetupRef.current = false;
      setNeedsPlayerSetup(false);

      if (active) {
        setIsHydrating(true);
      }

      let data: ProgressState | null = null;

      try {
        const result = await fetchPlayerProgressState(user.id);

        if (!active) {
          return;
        }

        if (result.error) {
          setSyncError(describeError(result.error));
          finishHydrating();
          return;
        }

        data = result.data;
      } catch (error) {
        if (active) {
          setSyncError(describeError(error));
          finishHydrating();
        }

        return;
      }

      cloudReadyUserIdRef.current = user.id;
      needsPlayerSetupRef.current = false;
      setNeedsPlayerSetup(false);

      // Only a profile typed for this account is used (and then removed).
      const pendingProfile = getPendingSignupProfile(user.email ?? null);

      if (data) {
        if (pendingProfile) {
          clearPendingSignupProfile();
        }

        // Days that passed since the last visit settle their quests now; the
        // row was just read, so saving the result is safe.
        const refreshed = refreshQuests(data);
        setState(refreshed);
        setSyncError(null);
        finishHydrating();

        if (refreshed !== data) {
          try {
            const { error } = await upsertPlayerProgressState(
              user.id,
              user.email ?? null,
              refreshed
            );

            if (active && error) {
              setSyncError(describeError(error));
            }
          } catch (error) {
            if (active) {
              setSyncError(describeError(error));
            }
          }
        }

        return;
      }

      // The row is known to be missing, so creating it is safe, but only the
      // player can say how tall they are: wait for the setup form.
      if (!pendingProfile && needsPlayerSetupAfterSignIn(user)) {
        needsPlayerSetupRef.current = true;
        setNeedsPlayerSetup(true);
        setState(createInitialProgressState());
        setSyncError(null);
        finishHydrating();
        return;
      }

      const fallbackProfile =
        pendingProfile ?? buildFallbackSignupProfile(user.email);
      const nextState = createProgressStateFromPlayer(
        buildNewPlayerProfile(fallbackProfile)
      );

      setState(nextState);

      let createErrorMessage: string | null = null;

      try {
        const { error: createError } = await upsertPlayerProgressState(
          user.id,
          user.email ?? null,
          nextState
        );

        createErrorMessage = createError ? describeError(createError) : null;
      } catch (error) {
        createErrorMessage = describeError(error);
      }

      if (!active) {
        return;
      }

      if (createErrorMessage) {
        setSyncError(createErrorMessage);
      } else {
        if (pendingProfile) {
          clearPendingSignupProfile();
        }

        setSyncError(null);
      }

      finishHydrating();
    };

    hydrate();

    return () => {
      active = false;
    };
  }, [isAuthLoading, isConfigured, userId]);

  const stateRef = useRef(state);
  stateRef.current = state;

  // Midnight can pass while the app stays open: check every minute and when
  // the app comes back to the foreground.
  useEffect(() => {
    if (isHydrating || needsPlayerSetup) {
      return;
    }

    const rollOver = () => {
      const current = stateRef.current;
      const refreshed = refreshQuests(current);

      if (refreshed !== current) {
        setState(refreshed);
        void persistProgressState(refreshed);
      }
    };

    const intervalId = setInterval(rollOver, 60 * 1000);
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        rollOver();
      }
    });

    return () => {
      clearInterval(intervalId);
      subscription.remove();
    };
  }, [isHydrating, needsPlayerSetup, persistProgressState]);

  const takeTodayOff = useCallback(() => {
    const current = refreshQuests(stateRef.current);
    const next = takeRestDay(current);

    if (next === current) {
      return false;
    }

    setState(next);
    void persistProgressState(next);
    return true;
  }, [persistProgressState]);

  const cancelTodayOff = useCallback(() => {
    const current = refreshQuests(stateRef.current);
    const next = cancelRestDay(current);

    if (next !== current) {
      setState(next);
      void persistProgressState(next);
    }
  }, [persistProgressState]);

  const logWorkout = useCallback(
    (workoutType: WorkoutType, intensity: WorkoutIntensity, focus?: readonly string[]) => {
      const status = getDailyWorkoutStatus(state.trainingSessions);

      if (getWorkoutAvailability(status, workoutType) === 'locked') {
        return null;
      }

      // A workout logged just after midnight belongs to the new day's quests.
      const current = refreshQuests(state);
      const update = applyWorkoutToProgress(current, workoutType, intensity, focus);
      setState(update.state);
      void persistProgressState(update.state);
      return update;
    },
    [persistProgressState, state]
  );

  const logWorkouts = useCallback<ProgressContextValue['logWorkouts']>(
    (entries) => {
      let current = refreshQuests(stateRef.current);
      const updates = entries.map((entry) => {
        const status = getDailyWorkoutStatus(current.trainingSessions);

        if (getWorkoutAvailability(status, entry.workoutType) === 'locked') {
          return null;
        }

        const update = applyWorkoutToProgress(
          current,
          entry.workoutType,
          entry.intensity,
          entry.focus
        );
        current = update.state;
        return update;
      });

      // Each workout sets lastLevelUp for itself only; keep one popup that
      // spans the whole batch, from the first level to the last.
      const levelUps = updates.flatMap((update) => (update?.levelUp ? [update.levelUp] : []));

      if (levelUps.length > 0) {
        current = {
          ...current,
          lastLevelUp: {
            previousLevel: levelUps[0].previousLevel,
            level: levelUps[levelUps.length - 1].level
          }
        };
      }

      if (updates.some(Boolean)) {
        setState(current);
        void persistProgressState(current);
      }

      return updates;
    },
    [persistProgressState]
  );

  const updateProfile = useCallback(
    (profile: Partial<EditableProfileFields>) => {
      const nextState: ProgressState = {
        ...state,
        player: {
          ...state.player,
          ...profile,
          // A blank name or goal would show up as an empty card on Home.
          name: profile.name?.trim() || state.player.name,
          mainGoal: profile.mainGoal?.trim() || state.player.mainGoal
        }
      };

      setState(nextState);
      void persistProgressState(nextState);
    },
    [persistProgressState, state]
  );

  const createNewProfile = useCallback(
    async (profile: EditableProfileFields) => {
      const nextPlayer = buildNewPlayerProfile(profile);
      const nextState = createProgressStateFromPlayer(nextPlayer);
      const finishesSetup = needsPlayerSetupRef.current;

      needsPlayerSetupRef.current = false;
      setState(nextState);

      const saveError = await persistProgressState(nextState);

      if (finishesSetup && saveError) {
        // No row exists yet: keep the setup open so the player can retry
        // instead of playing on a profile that was never saved.
        needsPlayerSetupRef.current = true;
      } else if (finishesSetup) {
        setNeedsPlayerSetup(false);
      }

      return saveError;
    },
    [persistProgressState]
  );

  const dismissLevelUp = useCallback(() => {
    setState((current) => ({
      ...current,
      lastLevelUp: null
    }));
  }, []);

  const value = useMemo(
    () => ({
      state,
      player: state.player,
      ovr: calculateOvr(state.player.attributes),
      levelInfo: getLevelInfo(state.player.totalXp),
      isHydrating: isHydrating || hydratedUserId !== (user?.id ?? null),
      syncError,
      needsPlayerSetup,
      logWorkout,
      logWorkouts,
      updateProfile,
      createNewProfile,
      dismissLevelUp,
      takeRestDay: takeTodayOff,
      cancelRestDay: cancelTodayOff
    }),
    [
      cancelTodayOff,
      createNewProfile,
      dismissLevelUp,
      hydratedUserId,
      isHydrating,
      logWorkout,
      logWorkouts,
      needsPlayerSetup,
      state,
      syncError,
      takeTodayOff,
      updateProfile,
      user
    ]
  );

  return (
    <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
  );
};

export const useProgress = () => {
  const context = useContext(ProgressContext);

  if (!context) {
    throw new Error('useProgress must be used inside ProgressProvider');
  }

  return context;
};
