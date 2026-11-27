import {
  buildNewPlayerProfile,
  createProgressStateFromPlayer,
  createZeroAttributes
} from '../../src/data/mockPlayer';
import { createInitialQuests } from '../../src/data/quests';
import { createDefaultMeasurements } from '../../src/lib/measurements';
import { PendingSignupProfile } from '../../src/lib/pendingSignup';
import { AttributeKey, PlayerAttributes, ProgressState } from '../../src/types';

export const signupProfile: PendingSignupProfile = {
  name: 'Luka Tester',
  ...createDefaultMeasurements(),
  position: 'Point Guard',
  archetype: 'Floor General',
  mainGoal: 'Run the offense'
};

export const attributesWith = (
  overrides: Partial<Record<AttributeKey, number>> = {},
  base = 0
): PlayerAttributes => {
  const attributes = createZeroAttributes();

  (Object.keys(attributes) as AttributeKey[]).forEach((key) => {
    attributes[key] = base;
  });

  return { ...attributes, ...overrides };
};

export const newPlayerState = (
  attributeOverrides: Partial<Record<AttributeKey, number>> = {},
  totalXp = 0
): ProgressState => {
  const player = {
    ...buildNewPlayerProfile(signupProfile),
    id: 'player-test',
    totalXp,
    attributes: attributesWith(attributeOverrides)
  };

  // The fixed classic quests keep the quest-mechanics tests readable; rotating
  // quests are covered in __tests__/lib/quests.test.ts.
  return {
    ...createProgressStateFromPlayer(player),
    quests: createInitialQuests(player.attributes)
  };
};

export const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
  }

  return value;
};

export const findQuest = (state: ProgressState, id: string) => {
  const quest = state.quests.find((item) => item.id === id);

  if (!quest) {
    throw new Error(`Quest not found in fixture: ${id}`);
  }

  return quest;
};
