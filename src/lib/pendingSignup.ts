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
// The account the profile was typed for. Another account signing in on the
// same device (e.g. with Google) must neither use nor delete it.
const PENDING_SIGNUP_EMAIL_KEY = 'bball-leveling.pending-signup-email';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const savePendingSignupProfile = (
  profile: PendingSignupProfile,
  email?: string
) => {
  localStorage.setItem(PENDING_SIGNUP_PROFILE_KEY, JSON.stringify(profile));

  if (email?.trim()) {
    localStorage.setItem(PENDING_SIGNUP_EMAIL_KEY, normalizeEmail(email));
  } else {
    localStorage.removeItem(PENDING_SIGNUP_EMAIL_KEY);
  }
};

/**
 * With `accountEmail`, returns the profile only when it was saved for that
 * account (or for no account in particular, as older versions saved it).
 */
export const getPendingSignupProfile = (
  accountEmail?: string | null
): PendingSignupProfile | null => {
  const value = localStorage.getItem(PENDING_SIGNUP_PROFILE_KEY);

  if (!value) {
    return null;
  }

  const owner = localStorage.getItem(PENDING_SIGNUP_EMAIL_KEY);

  if (accountEmail !== undefined && owner && owner !== normalizeEmail(accountEmail ?? '')) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    return parsed as PendingSignupProfile;
  } catch {
    return null;
  }
};

export const clearPendingSignupProfile = () => {
  localStorage.removeItem(PENDING_SIGNUP_PROFILE_KEY);
  localStorage.removeItem(PENDING_SIGNUP_EMAIL_KEY);
};
