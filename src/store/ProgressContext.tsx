import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import {
  buildNewPlayerProfile,
  createInitialProgressState,
  createProgressStateFromPlayer
} from '../data/mockPlayer';
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
  getLevelInfo
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
  logWorkout: (
    workoutType: WorkoutType,
    intensity: WorkoutIntensity
  ) => ProgressUpdate;
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

  const persistProgressState = useCallback(
    async (nextState: ProgressState) => {
      if (!user || !isConfigured) {
        return;
      }

      const { error } = await upsertPlayerProgressState(
        user.id,
        user.email ?? null,
        nextState
      );

      if (error) {
        setSyncError(error.message);
        return;
      }

      setSyncError(null);
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

      if (active) {
        setIsHydrating(true);
      }

      const { data, error } = await fetchPlayerProgressState(user.id);

      if (!active) {
        return;
      }

      if (error) {
        setSyncError(error.message);
        setIsHydrating(false);
        return;
      }

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

      const { error: createError } = await upsertPlayerProgressState(
        user.id,
        user.email ?? null,
        nextState
      );

      if (!active) {
        return;
      }

      if (createError) {
        setSyncError(createError.message);
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
    (workoutType: WorkoutType, intensity: WorkoutIntensity) => {
      const update = applyWorkoutToProgress(state, workoutType, intensity);
      setState(update.state);
      void persistProgressState(update.state);
      return update;
    },
    [persistProgressState, state]
  );

  const updateProfile = useCallback(
    (profile: Partial<EditableProfileFields>) => {
      setState((current) => {
        const nextState = {
          ...current,
          player: {
            ...current.player,
            ...profile
          }
        };

        void persistProgressState(nextState);
        return nextState;
      });
    },
    [persistProgressState]
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
