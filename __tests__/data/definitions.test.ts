import { Ionicons } from '@expo/vector-icons';
import {
  ATTRIBUTE_CATEGORIES,
  ATTRIBUTE_NAME_BY_KEY
} from '../../src/data/attributes';
import { createZeroAttributes } from '../../src/data/mockPlayer';
import { PLAYER_ARCHETYPES, PLAYER_POSITIONS } from '../../src/data/playerOptions';
import { createInitialQuests } from '../../src/data/quests';
import { WORKOUTS } from '../../src/data/workouts';
import { INTENSITY_CONFIG } from '../../src/lib/progression';
import { colors } from '../../src/theme/theme';
import { AttributeKey, WorkoutType } from '../../src/types';
import { attributesWith } from '../helpers/fixtures';

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

const ALL_ATTRIBUTE_KEYS: AttributeKey[] = [
  'closeShot',
  'drivingLayup',
  'drivingDunk',
  'standingDunk',
  'postControl',
  'midRangeShot',
  'threePointShot',
  'freeThrow',
  'fadeaway',
  'passAccuracy',
  'ballHandle',
  'speedWithBall',
  'interiorDefense',
  'perimeterDefense',
  'steal',
  'block',
  'offensiveRebound',
  'defensiveRebound',
  'speed',
  'acceleration',
  'strength',
  'vertical',
  'stamina'
];

const ALL_WORKOUT_TYPES: WorkoutType[] = [
  'shooting',
  'ballHandling',
  'finishing',
  'defense',
  'rebounding',
  'athletic',
  'strength',
  'game'
];

describe('attribute categories', () => {
  const keys = ATTRIBUTE_CATEGORIES.flatMap((category) =>
    category.attributes.map((attribute) => attribute.key)
  );

  it('has the six expected categories', () => {
    expect(ATTRIBUTE_CATEGORIES.map((category) => category.id)).toEqual([
      'finishing',
      'shooting',
      'playmaking',
      'defense',
      'rebounding',
      'physical'
    ]);
  });

  it('covers every attribute exactly once', () => {
    expect(new Set(keys).size).toBe(keys.length);
    expect([...keys].sort()).toEqual([...ALL_ATTRIBUTE_KEYS].sort());
  });

  it('has a display name for every attribute', () => {
    ALL_ATTRIBUTE_KEYS.forEach((key) => {
      expect(ATTRIBUTE_NAME_BY_KEY[key]).toEqual(expect.any(String));
      expect(ATTRIBUTE_NAME_BY_KEY[key].trim().length).toBeGreaterThan(0);
    });
    expect(ATTRIBUTE_NAME_BY_KEY.threePointShot).toBe('Three-Point Shot');
  });

  it('uses unique display names', () => {
    const names = Object.values(ATTRIBUTE_NAME_BY_KEY);

    expect(new Set(names).size).toBe(names.length);
  });

  it('uses short titles that fit a stat cell on Home', () => {
    ATTRIBUTE_CATEGORIES.forEach((category) => {
      expect(category.title).toMatch(/^[A-Z][a-z]+$/);
    });
  });

  it('uses 6-digit hex colors so alpha suffixes can be appended', () => {
    ATTRIBUTE_CATEGORIES.forEach((category) => {
      expect(category.color).toMatch(HEX_COLOR);
    });
  });

  it('zero attributes include every key', () => {
    expect(Object.keys(createZeroAttributes()).sort()).toEqual(
      [...ALL_ATTRIBUTE_KEYS].sort()
    );
  });
});

describe('workouts', () => {
  it('defines each workout type exactly once', () => {
    expect(WORKOUTS.map((workout) => workout.type).sort()).toEqual(
      [...ALL_WORKOUT_TYPES].sort()
    );
  });

  it.each(WORKOUTS.map((workout) => [workout.type, workout] as const))(
    '%s is well formed',
    (_, workout) => {
      expect(workout.title.trim().length).toBeGreaterThan(0);
      expect(workout.description.trim().length).toBeGreaterThan(0);
      expect(workout.accentColor).toMatch(HEX_COLOR);
      expect(Ionicons.glyphMap).toHaveProperty(workout.icon);
      expect(workout.effects.length).toBeGreaterThan(0);

      const effectKeys = workout.effects.map((effect) => effect.attribute);

      expect(new Set(effectKeys).size).toBe(effectKeys.length);
      workout.effects.forEach((effect) => {
        expect(ALL_ATTRIBUTE_KEYS).toContain(effect.attribute);
        expect(effect.weight).toBeGreaterThan(0);
        expect(effect.weight).toBeLessThanOrEqual(1);
      });
    }
  );

  it('lets every attribute be trained by at least one workout', () => {
    const trainable = new Set(
      WORKOUTS.flatMap((workout) => workout.effects.map((effect) => effect.attribute))
    );

    ALL_ATTRIBUTE_KEYS.forEach((key) => {
      expect(trainable.has(key)).toBe(true);
    });
  });

  it('offers focus areas for every workout except the game', () => {
    WORKOUTS.forEach((workout) => {
      if (workout.type === 'game') {
        expect(workout.focusOptions).toEqual([]);
        expect(workout.spreadGains).toBeDefined();
      } else {
        expect(workout.focusOptions.length).toBeGreaterThanOrEqual(3);
        expect(workout.spreadGains).toBeUndefined();
      }
    });
  });

  it.each(
    WORKOUTS.filter((workout) => workout.focusOptions.length > 0).map(
      (workout) => [workout.type, workout] as const
    )
  )('%s focus areas only train attributes of that workout', (_, workout) => {
    const workoutKeys = workout.effects.map((effect) => effect.attribute);
    const ids = workout.focusOptions.map((option) => option.id);

    expect(new Set(ids).size).toBe(ids.length);
    workout.focusOptions.forEach((option) => {
      // sentence case, so it reads well inside "Shooting Workout: three-pointers"
      expect(option.label).toMatch(/^[A-Z][^A-Z]*$/);
      expect(option.effects.length).toBeGreaterThan(0);
      expect(option.effects.some((effect) => effect.weight === 1)).toBe(true);
      option.effects.forEach((effect) => {
        expect(workoutKeys).toContain(effect.attribute);
        expect(effect.weight).toBeGreaterThan(0);
        expect(effect.weight).toBeLessThanOrEqual(1);
      });
    });
  });

  it('lets shooting focus on shots off the dribble through Fadeaway', () => {
    const shooting = WORKOUTS.find((workout) => workout.type === 'shooting')!;
    const offDribble = shooting.focusOptions.find((option) => option.id === 'offDribble')!;

    expect(offDribble.label).toBe('Off the dribble / fadeaways');
    expect(offDribble.effects).toContainEqual({ attribute: 'fadeaway', weight: 1 });
    expect(ATTRIBUTE_NAME_BY_KEY.fadeaway).toBe('Fadeaway');
    expect(
      ATTRIBUTE_CATEGORIES.find((category) => category.id === 'shooting')!.attributes.map(
        (attribute) => attribute.key
      )
    ).toContain('fadeaway');
  });

  it('lets a game move every attribute', () => {
    const game = WORKOUTS.find((workout) => workout.type === 'game')!;

    expect(game.title).toBe('Pickup Game');
    expect(game.effects.map((effect) => effect.attribute).sort()).toEqual(
      [...ALL_ATTRIBUTE_KEYS].sort()
    );
  });

  it('has a primary (weight 1) attribute in every workout', () => {
    WORKOUTS.forEach((workout) => {
      expect(workout.effects.some((effect) => effect.weight === 1)).toBe(true);
    });
  });
});

describe('intensity config', () => {
  it('rewards harder workouts with more XP and bigger gains', () => {
    expect(INTENSITY_CONFIG.light.xp).toBeLessThan(INTENSITY_CONFIG.medium.xp);
    expect(INTENSITY_CONFIG.medium.xp).toBeLessThan(INTENSITY_CONFIG.hard.xp);
    expect(INTENSITY_CONFIG.light.gainBase).toBeLessThan(
      INTENSITY_CONFIG.medium.gainBase
    );
    expect(INTENSITY_CONFIG.medium.gainBase).toBeLessThan(
      INTENSITY_CONFIG.hard.gainBase
    );
  });

  it('has a label for each intensity', () => {
    expect(INTENSITY_CONFIG.light.label).toBe('Light');
    expect(INTENSITY_CONFIG.medium.label).toBe('Medium');
    expect(INTENSITY_CONFIG.hard.label).toBe('Hard');
  });
});

describe('initial quests', () => {
  const quests = createInitialQuests(attributesWith());

  it('creates three daily and three weekly quests with unique ids', () => {
    const ids = quests.map((quest) => quest.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(quests.filter((quest) => quest.period === 'daily')).toHaveLength(3);
    expect(quests.filter((quest) => quest.period === 'weekly')).toHaveLength(3);
  });

  it('starts every quest unclaimed with a positive goal and reward', () => {
    quests.forEach((quest) => {
      expect(quest.claimed).toBe(false);
      expect(quest.goal).toBeGreaterThan(0);
      expect(quest.rewardXp).toBeGreaterThan(0);
      expect(quest.title.trim().length).toBeGreaterThan(0);
      expect(quest.description.trim().length).toBeGreaterThan(0);
    });
  });

  it('gives each quest the fields its kind needs', () => {
    quests.forEach((quest) => {
      if (quest.kind === 'complete_workout_type') {
        expect(ALL_WORKOUT_TYPES).toContain(quest.workoutType);
      }

      if (quest.kind === 'reach_attribute' || quest.kind === 'improve_attribute') {
        expect(ALL_ATTRIBUTE_KEYS).toContain(quest.attributeKey);
      }
    });
  });

  it('only asks for attributes that some workout can actually improve', () => {
    const trainable = new Set(
      WORKOUTS.flatMap((workout) => workout.effects.map((effect) => effect.attribute))
    );

    quests
      .filter((quest) => quest.attributeKey)
      .forEach((quest) => {
        expect(trainable.has(quest.attributeKey as AttributeKey)).toBe(true);
      });
  });

  it('never asks for a rating above the attribute cap', () => {
    quests
      .filter((quest) => quest.kind === 'reach_attribute')
      .forEach((quest) => {
        expect(quest.goal).toBeLessThanOrEqual(99);
      });
  });

  it('starts a brand new player with no progress and nothing completed', () => {
    quests.forEach((quest) => {
      expect(quest.progress).toBe(0);
      expect(quest.completed).toBe(false);
    });
  });

  it('seeds the reach quest from the current rating', () => {
    const below = createInitialQuests(attributesWith({ ballHandle: 71 }));
    const above = createInitialQuests(attributesWith({ ballHandle: 80 }));
    const find = (list: typeof quests) =>
      list.find((quest) => quest.id === 'weekly-ball-handle-75')!;

    expect(find(below)).toMatchObject({ progress: 71, completed: false });
    expect(find(above)).toMatchObject({ completed: true });
    expect(find(above).progress).toBeLessThanOrEqual(find(above).goal);
  });

  it('returns independent quest objects on every call', () => {
    const first = createInitialQuests(attributesWith());
    const second = createInitialQuests(attributesWith());

    first[0].progress = 99;

    expect(second[0].progress).toBe(0);
  });
});

describe('player options', () => {
  it('lists the five basketball positions', () => {
    expect([...PLAYER_POSITIONS]).toEqual([
      'Point Guard',
      'Shooting Guard',
      'Small Forward',
      'Power Forward',
      'Center'
    ]);
  });

  it('has unique, non-empty archetypes', () => {
    expect(PLAYER_ARCHETYPES.length).toBeGreaterThan(0);
    expect(new Set(PLAYER_ARCHETYPES).size).toBe(PLAYER_ARCHETYPES.length);
    PLAYER_ARCHETYPES.forEach((archetype) => {
      expect(archetype.trim()).toBe(archetype);
      expect(archetype.length).toBeGreaterThan(0);
    });
  });
});

describe('theme colors', () => {
  it('uses 6-digit hex for every accent that gets an alpha suffix', () => {
    [
      colors.gold,
      colors.court,
      colors.blue,
      colors.green,
      colors.orange,
      colors.red,
      colors.purple,
      colors.yellow,
      colors.success
    ].forEach((color) => {
      expect(color).toMatch(HEX_COLOR);
    });
  });
});
