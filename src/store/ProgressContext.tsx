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
import { buildFallbackSignupProfile } from '../lib/playerIdentity';
import {
  fetchPlayerProgressState,
  upsertPlayerProgressState
} from '../lib/playerProfileStore';
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
  /** Returns null, and changes nothing, when today's limit blocks this workout. */
  logWorkout: (
    workoutType: WorkoutType,
    intensity: WorkoutIntensity,
    /** Focus option ids; leave out for a general session. */
    focus?: readonly string[]
  ) => ProgressUpdate | null;
  updateProfile: (profile: Partial<EditableProfileFields>) => void;
  createNewProfile: (profile: EditableProfileFields) => void;
  dismissLevelUp: () => void;
}

const ProgressContext = createContext<ProgressContextValue | undefined>(undefined);

const missingConfigMessage =
  'Supabase is not configured yet. Add your Expo public Supabase env vars to enable cloud sync.';

export const ProgressProvider = ({ children }: PropsWithChildren) => {
  const { user, isLoading: isAuthLoading, isConfigured } = useAuth();
  const [state, setState] = useState<ProgressState>(() => createInitialProgressState());
  const [isHydrating, setIsHydrating] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  // Set only after this user's cloud save was read (or found to not exist).
  // Until then local state is not theirs, and saving it would overwrite their
  // real progress in the database.
  const cloudReadyUserIdRef = useRef<string | null>(null);

  const persistProgressState = useCallback(
    async (nextState: ProgressState) => {
      if (!user || !isConfigured) {
        return;
      }

      if (cloudReadyUserIdRef.current !== user.id) {
        return;
      }

      try {
        const { error } = await upsertPlayerProgressState(
          user.id,
          user.email ?? null,
          nextState
        );

        setSyncError(error ? describeError(error) : null);
      } catch (error) {
        setSyncError(describeError(error));
      }
    },
    [isConfigured, user]
  );

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      if (isAuthLoading) {
        return;
      }

      if (!user) {
        cloudReadyUserIdRef.current = null;

        if (active) {
          setState(createInitialProgressState());
          setSyncError(null);
          setIsHydrating(false);
        }

        return;
      }

      if (!isConfigured) {
        if (active) {
          setSyncError(missingConfigMessage);
          setIsHydrating(false);
        }

        return;
      }

      cloudReadyUserIdRef.current = null;

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
          setIsHydrating(false);
          return;
        }

        data = result.data;
      } catch (error) {
        if (active) {
          setSyncError(describeError(error));
          setIsHydrating(false);
        }

        return;
      }

      cloudReadyUserIdRef.current = user.id;

      if (data) {
        clearPendingSignupProfile();
        setState(data);
        setSyncError(null);
        setIsHydrating(false);
        return;
      }

      const fallbackProfile =
        getPendingSignupProfile() ?? buildFallbackSignupProfile(user.email);
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
        clearPendingSignupProfile();
        setSyncError(null);
      }

      setIsHydrating(false);
    };

    hydrate();

    return () => {
      active = false;
    };
  }, [isAuthLoading, isConfigured, user]);

  const logWorkout = useCallback(
    (workoutType: WorkoutType, intensity: WorkoutIntensity, focus?: readonly string[]) => {
      const status = getDailyWorkoutStatus(state.trainingSessions);

      if (getWorkoutAvailability(status, workoutType) === 'locked') {
        return null;
      }

      const update = applyWorkoutToProgress(state, workoutType, intensity, focus);
      setState(update.state);
      void persistProgressState(update.state);
      return update;
    },
    [persistProgressState, state]
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
    (profile: EditableProfileFields) => {
      const nextPlayer = buildNewPlayerProfile(profile);
      const nextState = createProgressStateFromPlayer(nextPlayer);

      setState(nextState);
      void persistProgressState(nextState);
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
      isHydrating,
      syncError,
      logWorkout,
      updateProfile,
      createNewProfile,
      dismissLevelUp
    }),
    [
      createNewProfile,
      dismissLevelUp,
      isHydrating,
      logWorkout,
      state,
      syncError,
      updateProfile
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
