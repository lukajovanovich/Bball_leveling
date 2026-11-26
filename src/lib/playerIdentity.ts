import { PLAYER_ARCHETYPES, PLAYER_POSITIONS } from '../data/playerOptions';
import { createDefaultMeasurements } from './measurements';
import { PendingSignupProfile } from './pendingSignup';

export const formatNameFromEmail = (value: string) => {
  const identity = value.split('@')[0]?.trim();

  if (!identity) {
    return '';
  }

  return identity
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

export const buildFallbackSignupProfile = (
  email?: string | null
): PendingSignupProfile => {
  const defaultMeasurements = createDefaultMeasurements();

  return {
    name: formatNameFromEmail(email ?? '') || 'MyPlayer',
    ...defaultMeasurements,
    position: PLAYER_POSITIONS[0],
    archetype: PLAYER_ARCHETYPES[0],
    mainGoal: 'Build my player from the ground up'
  };
};

interface AccountIdentity {
  email?: string | null;
  app_metadata?: { provider?: unknown } | null;
  user_metadata?: Record<string, unknown> | null;
}

/**
 * Email sign-up collects the player setup before the account exists. Google
 * (or any other provider) skips that form, so the player fills it in after
 * their first sign-in instead of getting a made-up default profile.
 */
export const needsPlayerSetupAfterSignIn = (account: AccountIdentity) => {
  const provider = account.app_metadata?.provider;

  return typeof provider === 'string' && provider !== 'email';
};

const readText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

/** The name Google shared, else one built from the email. */
export const suggestPlayerName = (account: AccountIdentity) =>
  readText(account.user_metadata?.full_name) ||
  readText(account.user_metadata?.name) ||
  formatNameFromEmail(account.email ?? '');
