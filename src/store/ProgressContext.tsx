import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState
} from 'react';
import { createInitialProgressState } from '../data/mockPlayer';
import {
  PlayerProfile,
  ProgressState,
  ProgressUpdate,
  WorkoutIntensity,
  WorkoutType
} from '../types';
import {
  applyWorkoutToProgress,
  calculateOvr,
  getLevelInfo
} from '../lib/progression';

interface ProgressContextValue {
  state: ProgressState;
  player: PlayerProfile;
  ovr: number;
  levelInfo: ReturnType<typeof getLevelInfo>;
  logWorkout: (
    workoutType: WorkoutType,
    intensity: WorkoutIntensity
  ) => ProgressUpdate;
  updateProfile: (
    profile: Partial<Pick<PlayerProfile, 'name' | 'height' | 'position' | 'mainGoal'>>
  ) => void;
  dismissLevelUp: () => void;
}

const ProgressContext = createContext<ProgressContextValue | undefined>(undefined);

export const ProgressProvider = ({ children }: PropsWithChildren) => {
  const [state, setState] = useState<ProgressState>(() => createInitialProgressState());

  const logWorkout = useCallback(
    (workoutType: WorkoutType, intensity: WorkoutIntensity) => {
      const update = applyWorkoutToProgress(state, workoutType, intensity);
      setState(update.state);
      return update;
    },
    [state]
  );

  const updateProfile = useCallback(
    (
      profile: Partial<
        Pick<PlayerProfile, 'name' | 'height' | 'position' | 'mainGoal'>
      >
    ) => {
      setState((current) => ({
        ...current,
        player: {
          ...current.player,
          ...profile
        }
      }));
    },
    []
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
      logWorkout,
      updateProfile,
      dismissLevelUp
    }),
    [dismissLevelUp, logWorkout, state, updateProfile]
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
