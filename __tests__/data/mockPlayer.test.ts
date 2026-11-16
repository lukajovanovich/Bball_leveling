import {
  buildNewPlayerProfile,
  createInitialProgressState,
  createProgressStateFromPlayer,
  createZeroAttributes,
  initialActivityLog,
  normalizePlayerProfile,
  normalizeProgressState,
  samplePlayer
} from '../../src/data/mockPlayer';
import { PLAYER_ARCHETYPES, PLAYER_POSITIONS } from '../../src/data/playerOptions';
import {
  DEFAULT_HEIGHT_CM,
  DEFAULT_WEIGHT_KG,
  DEFAULT_WINGSPAN_CM
} from '../../src/lib/measurements';
import { calculateOvr, getLevelInfo } from '../../src/lib/progression';
import { PlayerProfile, ProgressState } from '../../src/types';
import { signupProfile } from '../helpers/fixtures';

type LooseProfile = Parameters<typeof normalizePlayerProfile>[0];

describe('createZeroAttributes', () => {
  it('starts all 22 attributes at zero', () => {
    const attributes = createZeroAttributes();

    expect(Object.keys(attributes)).toHaveLength(22);
    Object.values(attributes).forEach((value) => expect(value).toBe(0));
  });

  it('returns a new object every time', () => {
    const first = createZeroAttributes();
    first.speed = 50;

    expect(createZeroAttributes().speed).toBe(0);
  });
});

describe('normalizePlayerProfile', () => {
  it('fills an empty profile with safe defaults', () => {
    const player = normalizePlayerProfile({});

    expect(player).toMatchObject({
      name: 'MyPlayer',
      heightCm: DEFAULT_HEIGHT_CM,
      heightUnit: 'cm',
      wingspanCm: DEFAULT_WINGSPAN_CM,
      wingspanUnit: 'cm',
      weightKg: DEFAULT_WEIGHT_KG,
      weightUnit: 'kg',
      position: PLAYER_POSITIONS[0],
      archetype: PLAYER_ARCHETYPES[0],
      mainGoal: 'Build my player from the ground up',
      totalXp: 0
    });
    expect(player.id).toMatch(/^player-\d+$/);
    expect(player.attributes).toEqual(createZeroAttributes());
  });

  it('keeps a valid modern profile unchanged', () => {
    expect(normalizePlayerProfile(samplePlayer)).toEqual(samplePlayer);
  });

  it('trims text fields and replaces blank ones', () => {
    const player = normalizePlayerProfile({
      id: '  player-7  ',
      name: '  Luka  ',
      position: '   ',
      archetype: '',
      mainGoal: '  Win  '
    });

    expect(player.id).toBe('player-7');
    expect(player.name).toBe('Luka');
    expect(player.position).toBe(PLAYER_POSITIONS[0]);
    expect(player.archetype).toBe(PLAYER_ARCHETYPES[0]);
    expect(player.mainGoal).toBe('Win');
  });

  it('migrates legacy imperial text measurements', () => {
    const player = normalizePlayerProfile({
      height: '6\'3"',
      wingspan: '6\'7"',
      weight: '195 lbs'
    } as LooseProfile);

    expect(player.heightCm).toBe(190.5);
    expect(player.heightUnit).toBe('in');
    expect(player.wingspanCm).toBe(200.66);
    expect(player.wingspanUnit).toBe('in');
    expect(player.weightKg).toBe(88.45);
    expect(player.weightUnit).toBe('lb');
  });

  it('migrates legacy metric text measurements', () => {
    const player = normalizePlayerProfile({
      height: '191 cm',
      wingspan: '201 cm',
      weight: '88 kg'
    } as LooseProfile);

    expect(player).toMatchObject({
      heightCm: 191,
      heightUnit: 'cm',
      wingspanCm: 201,
      wingspanUnit: 'cm',
      weightKg: 88,
      weightUnit: 'kg'
    });
  });

  it('prefers numeric fields over legacy text when both exist', () => {
    const player = normalizePlayerProfile({
      heightCm: 200,
      height: '6\'0"',
      weightKg: 100,
      weight: '150 lbs'
    } as LooseProfile);

    expect(player.heightCm).toBe(200);
    expect(player.weightKg).toBe(100);
  });

  it('never makes the default wingspan shorter than a tall player', () => {
    const player = normalizePlayerProfile({ heightCm: 220 });

    expect(player.wingspanCm).toBe(220);
  });

  it('replaces broken numbers with defaults', () => {
    const player = normalizePlayerProfile({
      heightCm: Number.NaN,
      wingspanCm: Number.POSITIVE_INFINITY,
      weightKg: 'heavy' as unknown as number,
      totalXp: Number.NaN
    });

    expect(player.heightCm).toBe(DEFAULT_HEIGHT_CM);
    expect(player.wingspanCm).toBe(DEFAULT_WINGSPAN_CM);
    expect(player.weightKg).toBe(DEFAULT_WEIGHT_KG);
    expect(player.totalXp).toBe(0);
  });

  it('never keeps negative XP', () => {
    expect(normalizePlayerProfile({ totalXp: -250 }).totalXp).toBe(0);
  });

  it('normalizes unknown units to metric', () => {
    const player = normalizePlayerProfile({
      heightUnit: 'ft',
      wingspanUnit: 'meters',
      weightUnit: 'stone'
    } as LooseProfile);

    expect(player.heightUnit).toBe('cm');
    expect(player.wingspanUnit).toBe('cm');
    expect(player.weightUnit).toBe('kg');
  });

  it('fills missing attributes with zero and drops unknown ones', () => {
    const player = normalizePlayerProfile({
      attributes: {
        speed: 70,
        dunkPower: 99,
        steal: 'high'
      } as unknown as PlayerProfile['attributes']
    });

    expect(player.attributes.speed).toBe(70);
    expect(player.attributes.steal).toBe(0);
    expect(player.attributes.closeShot).toBe(0);
    expect(player.attributes).not.toHaveProperty('dunkPower');
    expect(Object.keys(player.attributes)).toHaveLength(22);
  });

  it('clamps stored attributes into the 0-99 range', () => {
    const player = normalizePlayerProfile({
      attributes: {
        ...createZeroAttributes(),
        speed: 150,
        steal: -20,
        block: 45.6
      }
    });

    expect(player.attributes.speed).toBe(99);
    expect(player.attributes.steal).toBe(0);
    expect(player.attributes.block).toBe(46);
  });

  it('always produces values the rest of the app can calculate with', () => {
    const player = normalizePlayerProfile({
      attributes: null as unknown as PlayerProfile['attributes'],
      totalXp: undefined
    });

    expect(calculateOvr(player.attributes)).toBe(0);
    expect(getLevelInfo(player.totalXp).level).toBe(1);
  });
});

describe('samplePlayer', () => {
  it('is a complete, valid guest profile', () => {
    expect(samplePlayer.name).toBe('Jalen Novak');
    expect(samplePlayer.totalXp).toBe(840);
    expect(Object.keys(samplePlayer.attributes)).toHaveLength(22);
    Object.values(samplePlayer.attributes).forEach((value) => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(99);
    });
    expect(PLAYER_POSITIONS).toContain(samplePlayer.position);
    expect(PLAYER_ARCHETYPES).toContain(samplePlayer.archetype);
  });
});

describe('buildNewPlayerProfile', () => {
  it('creates a zero-rated level 1 player from signup input', () => {
    const player = buildNewPlayerProfile(signupProfile);

    expect(player).toMatchObject({
      name: 'Luka Tester',
      position: 'Point Guard',
      archetype: 'Floor General',
      mainGoal: 'Run the offense',
      totalXp: 0,
      heightCm: signupProfile.heightCm,
      wingspanCm: signupProfile.wingspanCm,
      weightKg: signupProfile.weightKg
    });
    expect(player.attributes).toEqual(createZeroAttributes());
    expect(calculateOvr(player.attributes)).toBe(0);
  });

  it('trims the text the user typed', () => {
    const player = buildNewPlayerProfile({
      ...signupProfile,
      name: '  Spaced Out  ',
      mainGoal: '  Dunk  '
    });

    expect(player.name).toBe('Spaced Out');
    expect(player.mainGoal).toBe('Dunk');
  });

  it('keeps the units the user picked', () => {
    const player = buildNewPlayerProfile({
      ...signupProfile,
      heightUnit: 'in',
      wingspanUnit: 'in',
      weightUnit: 'lb'
    });

    expect(player.heightUnit).toBe('in');
    expect(player.wingspanUnit).toBe('in');
    expect(player.weightUnit).toBe('lb');
  });
});

describe('createProgressStateFromPlayer', () => {
  it('starts a fresh save with quests, no sessions and a welcome entry', () => {
    const state = createProgressStateFromPlayer(buildNewPlayerProfile(signupProfile));

    expect(state.player.name).toBe('Luka Tester');
    expect(state.quests).toHaveLength(6);
    expect(state.trainingSessions).toEqual([]);
    expect(state.lastLevelUp).toBeNull();
    expect(state.activityLog).toHaveLength(1);
    expect(state.activityLog[0]).toMatchObject({
      type: 'attribute',
      title: 'New MyPlayer created'
    });
    expect(state.activityLog[0].description).toContain('Luka Tester');
  });

  it('can be saved to the database as JSON without losing anything', () => {
    const state = createProgressStateFromPlayer(buildNewPlayerProfile(signupProfile));

    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
});

describe('normalizeProgressState', () => {
  it('keeps a valid state unchanged', () => {
    const state = createProgressStateFromPlayer(buildNewPlayerProfile(signupProfile));

    expect(normalizeProgressState(state)).toEqual(state);
  });

  it('repairs the player inside the state', () => {
    const state = createProgressStateFromPlayer(buildNewPlayerProfile(signupProfile));
    const broken = {
      ...state,
      player: { ...state.player, name: '', totalXp: Number.NaN }
    };

    const normalized = normalizeProgressState(broken);

    expect(normalized.player.name).toBe('MyPlayer');
    expect(normalized.player.totalXp).toBe(0);
  });

  it('survives a stored row that is missing its lists', () => {
    const partial = {
      player: { name: 'Old Save', totalXp: 500 }
    } as unknown as ProgressState;

    const normalized = normalizeProgressState(partial);

    expect(normalized.player.name).toBe('Old Save');
    expect(normalized.quests).toHaveLength(6);
    expect(normalized.trainingSessions).toEqual([]);
    expect(normalized.activityLog).toEqual([]);
    expect(normalized.lastLevelUp).toBeNull();
  });

  it('survives a stored row with no player at all', () => {
    const normalized = normalizeProgressState({} as unknown as ProgressState);

    expect(normalized.player.name).toBe('MyPlayer');
    expect(normalized.quests).toHaveLength(6);
  });

  it('keeps existing quest progress', () => {
    const state = createProgressStateFromPlayer(buildNewPlayerProfile(signupProfile));
    state.quests[0] = { ...state.quests[0], progress: 1, completed: true, claimed: true };

    expect(normalizeProgressState(state).quests[0]).toMatchObject({
      progress: 1,
      completed: true,
      claimed: true
    });
  });
});

describe('createInitialProgressState', () => {
  it('gives guests the sample player with seeded activity', () => {
    const state = createInitialProgressState();

    expect(state.player).toEqual(samplePlayer);
    expect(state.quests).toHaveLength(6);
    expect(state.activityLog).toEqual(initialActivityLog);
    expect(state.trainingSessions).toEqual([]);
    expect(state.lastLevelUp).toBeNull();
  });

  it('seeds the ball handle quest from the sample rating', () => {
    const quest = createInitialProgressState().quests.find(
      (item) => item.id === 'weekly-ball-handle-75'
    );

    expect(quest).toMatchObject({ progress: 71, completed: false });
  });

  it('returns quests that are independent between calls', () => {
    const first = createInitialProgressState();
    first.quests[0].progress = 1;

    expect(createInitialProgressState().quests[0].progress).toBe(0);
  });

  it('uses valid dates and unique ids in the seeded activity', () => {
    const ids = initialActivityLog.map((item) => item.id);

    expect(new Set(ids).size).toBe(ids.length);
    initialActivityLog.forEach((item) => {
      expect(Number.isNaN(new Date(item.createdAt).getTime())).toBe(false);
    });
  });
});
