import { PlayerProfile } from '../types';

export type PendingSignupProfile = Pick<
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

const PENDING_SIGNUP_PROFILE_KEY = 'bball-leveling.pending-signup-profile';

export const savePendingSignupProfile = (profile: PendingSignupProfile) => {
  localStorage.setItem(PENDING_SIGNUP_PROFILE_KEY, JSON.stringify(profile));
};

export const getPendingSignupProfile = (): PendingSignupProfile | null => {
  const value = localStorage.getItem(PENDING_SIGNUP_PROFILE_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as PendingSignupProfile;
  } catch {
    return null;
  }
};

export const clearPendingSignupProfile = () => {
  localStorage.removeItem(PENDING_SIGNUP_PROFILE_KEY);
};
