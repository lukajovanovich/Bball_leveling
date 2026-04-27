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
