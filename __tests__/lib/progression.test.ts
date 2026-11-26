import { ATTRIBUTE_CATEGORIES } from '../../src/data/attributes';
import { samplePlayer } from '../../src/data/mockPlayer';
import { WORKOUTS } from '../../src/data/workouts';
import {
  ATTRIBUTE_MAX,
  ATTRIBUTE_MIN,
  DAILY_BONUS_WORKOUTS,
  INTENSITY_CONFIG,
  applyWorkoutToProgress,
  calculateOvr,
  calculateWorkoutResult,
  clampAttribute,
  describeWorkoutFocus,
  formatWorkoutName,
  getCategoryAverage,
  getDailyWorkoutStatus,
  getLevelInfo,
  getLocalDayKey,
  getQuestProgressLabel,
  getWorkoutAvailability,
  getWorkoutDefinition,
  getXpNeededForLevel
} from '../../src/lib/progression';
import {
  AttributeKey,
  ProgressState,
  TrainingSession,
  WorkoutIntensity,
  WorkoutType
} from '../../src/types';
import {
  attributesWith,
  deepFreeze,
  findQuest,
  newPlayerState
} from '../helpers/fixtures';

const INTENSITIES: WorkoutIntensity[] = ['light', 'medium', 'hard'];
const WORKOUT_TYPES = WORKOUTS.map((workout) => workout.type);

describe('clampAttribute', () => {
  it('keeps values inside the 0-99 range', () => {
    expect(clampAttribute(-10)).toBe(ATTRIBUTE_MIN);
    expect(clampAttribute(0)).toBe(0);
    expect(clampAttribute(50)).toBe(50);
    expect(clampAttribute(99)).toBe(ATTRIBUTE_MAX);
    expect(clampAttribute(250)).toBe(ATTRIBUTE_MAX);
  });

  it('rounds to whole numbers', () => {
    expect(clampAttribute(49.4)).toBe(49);
    expect(clampAttribute(49.5)).toBe(50);
    expect(clampAttribute(98.9)).toBe(99);
  });
});

describe('getXpNeededForLevel', () => {
  it('grows by 70 XP per level starting at 250', () => {
    expect(getXpNeededForLevel(1)).toBe(250);
    expect(getXpNeededForLevel(2)).toBe(320);
    expect(getXpNeededForLevel(10)).toBe(880);
  });
});

describe('getLevelInfo', () => {
  it('starts at level 1 with no progress', () => {
    expect(getLevelInfo(0)).toEqual({
      level: 1,
      currentXp: 0,
      xpForNext: 250,
      progress: 0
    });
  });

  it('stays on the level until the exact threshold is reached', () => {
    expect(getLevelInfo(249).level).toBe(1);
    expect(getLevelInfo(249).currentXp).toBe(249);
    expect(getLevelInfo(250)).toEqual({
      level: 2,
      currentXp: 0,
      xpForNext: 320,
      progress: 0
    });
  });

  it('carries leftover XP across several levels', () => {
    // 250 (L1) + 320 (L2) = 570 to reach level 3
    expect(getLevelInfo(570).level).toBe(3);
    expect(getLevelInfo(840)).toMatchObject({
      level: 3,
      currentXp: 270,
      xpForNext: 390
    });
  });

  it('treats negative XP as zero', () => {
    expect(getLevelInfo(-500)).toMatchObject({ level: 1, currentXp: 0 });
  });

  it('never loses or invents XP and keeps progress below 1', () => {
    for (let totalXp = 0; totalXp <= 20000; totalXp += 37) {
      const info = getLevelInfo(totalXp);
      let spent = 0;

      for (let level = 1; level < info.level; level += 1) {
        spent += getXpNeededForLevel(level);
      }

      expect(spent + info.currentXp).toBe(totalXp);
      expect(info.currentXp).toBeLessThan(info.xpForNext);
      expect(info.progress).toBeGreaterThanOrEqual(0);
      expect(info.progress).toBeLessThan(1);
    }
  });

  it('never goes down a level when XP increases', () => {
    let previousLevel = 1;

    for (let totalXp = 0; totalXp <= 10000; totalXp += 10) {
      const { level } = getLevelInfo(totalXp);
      expect(level).toBeGreaterThanOrEqual(previousLevel);
      previousLevel = level;
    }
  });
});

describe('getCategoryAverage', () => {
  const shooting = ATTRIBUTE_CATEGORIES.find((item) => item.id === 'shooting')!;

  it('averages only the attributes of that category', () => {
    const attributes = attributesWith(
      { midRangeShot: 60, threePointShot: 70, freeThrow: 80, fadeaway: 70 },
      10
    );

    expect(getCategoryAverage(attributes, shooting)).toBe(70);
  });

  it('rounds the average', () => {
    const attributes = attributesWith({
      midRangeShot: 1,
      threePointShot: 1,
      freeThrow: 0,
      fadeaway: 1
    });

    // 3 / 4 = 0.75 -> 1
    expect(getCategoryAverage(attributes, shooting)).toBe(1);
  });
});

describe('calculateOvr', () => {
  it('is 0 for a brand new player and 99 for a maxed player', () => {
    expect(calculateOvr(attributesWith({}, 0))).toBe(0);
    expect(calculateOvr(attributesWith({}, 99))).toBe(99);
  });

  it('equals the shared value when every attribute is the same', () => {
    [1, 25, 50, 75, 98].forEach((value) => {
      expect(calculateOvr(attributesWith({}, value))).toBe(value);
    });
  });

  it('stays an integer between 0 and 99 for the sample player', () => {
    const ovr = calculateOvr(samplePlayer.attributes);

    expect(Number.isInteger(ovr)).toBe(true);
    expect(ovr).toBeGreaterThan(0);
    expect(ovr).toBeLessThanOrEqual(99);
    expect(ovr).toBe(63);
  });

  it('never drops when a single attribute improves', () => {
    const base = samplePlayer.attributes;
    const baseOvr = calculateOvr(base);

    (Object.keys(base) as AttributeKey[]).forEach((key) => {
      expect(calculateOvr({ ...base, [key]: 99 })).toBeGreaterThanOrEqual(baseOvr);
    });
  });

  it('does not reorder or change the attributes it reads', () => {
    const attributes = deepFreeze({ ...samplePlayer.attributes });

    expect(() => calculateOvr(attributes)).not.toThrow();
  });
});

describe('getWorkoutDefinition', () => {
  it('returns the definition for every workout type', () => {
    WORKOUT_TYPES.forEach((type) => {
      expect(getWorkoutDefinition(type).type).toBe(type);
    });
  });

  it('throws for an unknown workout type', () => {
    expect(() => getWorkoutDefinition('yoga' as WorkoutType)).toThrow(
      'Unknown workout type: yoga'
    );
  });
});

describe('calculateWorkoutResult', () => {
  it('awards XP by intensity regardless of workout type', () => {
    WORKOUT_TYPES.forEach((type) => {
      expect(calculateWorkoutResult(type, 'light', attributesWith()).xpGained).toBe(70);
      expect(calculateWorkoutResult(type, 'medium', attributesWith()).xpGained).toBe(120);
      expect(calculateWorkoutResult(type, 'hard', attributesWith()).xpGained).toBe(190);
    });
  });

  it('gives +1 to every targeted attribute on a light workout', () => {
    WORKOUTS.filter((workout) => !workout.spreadGains).forEach((workout) => {
      const { attributeGains } = calculateWorkoutResult(
        workout.type,
        'light',
        attributesWith()
      );

      expect(Object.keys(attributeGains).sort()).toEqual(
        workout.effects.map((effect) => effect.attribute).sort()
      );
      Object.values(attributeGains).forEach((gain) => expect(gain).toBe(1));
    });
  });

  it('scales gains with effect weight on a hard shooting workout', () => {
    const { attributeGains } = calculateWorkoutResult(
      'shooting',
      'hard',
      attributesWith()
    );

    expect(attributeGains).toEqual({
      midRangeShot: 3,
      threePointShot: 3,
      freeThrow: 2,
      fadeaway: 1,
      closeShot: 1
    });
  });

  it('only changes attributes the workout targets', () => {
    WORKOUTS.forEach((workout) => {
      INTENSITIES.forEach((intensity) => {
        const targeted = workout.effects.map((effect) => effect.attribute);
        const { attributeGains } = calculateWorkoutResult(
          workout.type,
          intensity,
          attributesWith({}, 40)
        );

        Object.keys(attributeGains).forEach((key) => {
          expect(targeted).toContain(key);
        });
      });
    });
  });

  it('slows gains down from 80 and limits them to +1 from 88', () => {
    const at79 = calculateWorkoutResult(
      'shooting',
      'hard',
      attributesWith({ midRangeShot: 79 })
    );
    const at80 = calculateWorkoutResult(
      'shooting',
      'hard',
      attributesWith({ midRangeShot: 80 })
    );
    const at88 = calculateWorkoutResult(
      'shooting',
      'hard',
      attributesWith({ midRangeShot: 88 })
    );

    expect(at79.attributeGains.midRangeShot).toBe(3);
    expect(at80.attributeGains.midRangeShot).toBe(2);
    expect(at88.attributeGains.midRangeShot).toBe(1);
  });

  it('still gives at least +1 between 80 and 87 on a light workout', () => {
    const { attributeGains } = calculateWorkoutResult(
      'shooting',
      'light',
      attributesWith({ midRangeShot: 85 })
    );

    expect(attributeGains.midRangeShot).toBe(1);
  });

  it('never pushes an attribute past 99', () => {
    const at98 = calculateWorkoutResult(
      'shooting',
      'hard',
      attributesWith({ midRangeShot: 98 })
    );
    const at99 = calculateWorkoutResult(
      'shooting',
      'hard',
      attributesWith({ midRangeShot: 99 })
    );

    expect(at98.attributeGains.midRangeShot).toBe(1);
    expect(at99.attributeGains).not.toHaveProperty('midRangeShot');
  });

  it('returns no gains at all when every attribute is maxed', () => {
    WORKOUT_TYPES.forEach((type) => {
      expect(
        calculateWorkoutResult(type, 'hard', attributesWith({}, 99)).attributeGains
      ).toEqual({});
    });
  });

  it('does not mutate the attributes passed in', () => {
    const attributes = deepFreeze(attributesWith({}, 50));

    expect(() => calculateWorkoutResult('defense', 'hard', attributes)).not.toThrow();
  });
});

describe('applyWorkoutToProgress', () => {
  it('adds workout XP and attribute gains to the player', () => {
    const state = newPlayerState();
    const update = applyWorkoutToProgress(state, 'rebounding', 'medium');

    expect(update.workoutXpGained).toBe(120);
    expect(update.attributeGains).toEqual({
      offensiveRebound: 2,
      defensiveRebound: 2,
      strength: 1
    });
    expect(update.state.player.attributes.offensiveRebound).toBe(2);
    expect(update.state.player.attributes.defensiveRebound).toBe(2);
    expect(update.state.player.attributes.strength).toBe(1);
    expect(update.state.player.attributes.speed).toBe(0);
  });

  it('adds quest XP on top of workout XP in the player total', () => {
    const state = newPlayerState({}, 1000);
    const update = applyWorkoutToProgress(state, 'rebounding', 'light');

    // "Complete 1 workout" pays 80 XP
    expect(update.questXpGained).toBe(80);
    expect(update.state.player.totalXp).toBe(1000 + 70 + 80);
  });

  it('does not mutate the previous state', () => {
    const state = deepFreeze(newPlayerState());

    expect(() => applyWorkoutToProgress(state, 'shooting', 'hard')).not.toThrow();
    expect(state.player.totalXp).toBe(0);
    expect(state.trainingSessions).toHaveLength(0);
  });

  it('keeps profile fields untouched', () => {
    const state = newPlayerState();
    const { player } = applyWorkoutToProgress(state, 'shooting', 'hard').state;

    expect(player.name).toBe(state.player.name);
    expect(player.id).toBe(state.player.id);
    expect(player.heightCm).toBe(state.player.heightCm);
    expect(player.position).toBe(state.player.position);
  });

  it('records the session at the front of the history', () => {
    const first = applyWorkoutToProgress(newPlayerState(), 'shooting', 'light');
    const second = applyWorkoutToProgress(first.state, 'defense', 'hard');

    expect(second.state.trainingSessions).toHaveLength(2);
    expect(second.state.trainingSessions[0]).toBe(second.session);
    expect(second.session).toMatchObject({
      workoutType: 'defense',
      intensity: 'hard',
      xpGained: 190
    });
    expect(new Date(second.session.completedAt).toISOString()).toBe(
      second.session.completedAt
    );
  });

  it('keeps at most 30 sessions and 40 activity items', () => {
    let state = newPlayerState();

    for (let index = 0; index < 45; index += 1) {
      state = applyWorkoutToProgress(state, 'athletic', 'light').state;
    }

    expect(state.trainingSessions).toHaveLength(30);
    expect(state.activityLog).toHaveLength(40);
  });

  it('gives every session and activity item a unique id, even in the same millisecond', () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1750000000000);

    try {
      let state = newPlayerState();

      for (let index = 0; index < 5; index += 1) {
        state = applyWorkoutToProgress(state, 'athletic', 'light').state;
      }

      const sessionIds = state.trainingSessions.map((session) => session.id);
      const activityIds = state.activityLog.map((item) => item.id);

      expect(new Set(sessionIds).size).toBe(sessionIds.length);
      expect(new Set(activityIds).size).toBe(activityIds.length);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('logs workout and attribute activity with the workout color', () => {
    const state = newPlayerState({}, 5000);
    const update = applyWorkoutToProgress(state, 'strength', 'medium');
    const workout = getWorkoutDefinition('strength');
    const added = update.state.activityLog.slice(
      0,
      update.state.activityLog.length - state.activityLog.length
    );

    const workoutItem = added.find((item) => item.type === 'workout');
    const attributeItem = added.find((item) => item.type === 'attribute');

    expect(workoutItem).toMatchObject({
      title: 'Strength Workout completed',
      description: 'Medium session earned +120 XP.',
      accentColor: workout.accentColor
    });
    expect(attributeItem?.title).toBe('Attributes improved');
    expect(attributeItem?.description).toContain('Strength +2');
  });

  it('explains when nothing can improve because ratings are capped', () => {
    const state = newPlayerState();
    state.player.attributes = attributesWith({}, 99);

    const update = applyWorkoutToProgress(state, 'shooting', 'hard');
    const attributeItem = update.state.activityLog.find(
      (item) => item.type === 'attribute'
    );

    expect(update.attributeGains).toEqual({});
    expect(attributeItem?.description).toMatch(/already capped/);
    expect(update.state.player.totalXp).toBeGreaterThan(0);
  });

  describe('level ups', () => {
    it('reports a level up when XP crosses the threshold', () => {
      // 190 workout + 80 quest = 270 >= 250
      const update = applyWorkoutToProgress(newPlayerState(), 'rebounding', 'hard');

      expect(update.levelUp).toEqual({ previousLevel: 1, level: 2 });
      expect(update.state.lastLevelUp).toEqual({ previousLevel: 1, level: 2 });
      expect(
        update.state.activityLog.some(
          (item) => item.type === 'level' && item.title === 'Level 2 reached'
        )
      ).toBe(true);
    });

    it('reports nothing when the level stays the same', () => {
      const state = newPlayerState({}, 0);
      state.quests = state.quests.map((quest) => ({
        ...quest,
        completed: true,
        claimed: true
      }));

      const update = applyWorkoutToProgress(state, 'rebounding', 'light');

      expect(update.levelUp).toBeNull();
      expect(update.state.lastLevelUp).toBeNull();
      expect(update.state.activityLog.some((item) => item.type === 'level')).toBe(false);
    });

    it('can jump more than one level at once', () => {
      const state = newPlayerState({}, 240);
      state.quests = state.quests.map((quest) => ({ ...quest, rewardXp: 1000 }));

      const update = applyWorkoutToProgress(state, 'defense', 'hard');

      expect(update.levelUp?.previousLevel).toBe(1);
      expect(update.levelUp?.level).toBeGreaterThan(2);
      expect(update.levelUp?.level).toBe(
        getLevelInfo(update.state.player.totalXp).level
      );
    });
  });

  describe('quests', () => {
    it('completes "Complete 1 workout" on the first workout of any type', () => {
      WORKOUT_TYPES.forEach((type) => {
        const update = applyWorkoutToProgress(newPlayerState(), type, 'light');
        const quest = findQuest(update.state, 'daily-complete-workout');

        expect(quest).toMatchObject({ progress: 1, completed: true, claimed: true });
        expect(update.completedQuests.map((item) => item.id)).toContain(
          'daily-complete-workout'
        );
      });
    });

    it('only counts the matching workout type for type quests', () => {
      const shooting = applyWorkoutToProgress(newPlayerState(), 'shooting', 'light');
      const defense = applyWorkoutToProgress(newPlayerState(), 'defense', 'light');

      expect(findQuest(shooting.state, 'daily-defense-workout')).toMatchObject({
        progress: 0,
        completed: false
      });
      expect(findQuest(defense.state, 'daily-defense-workout')).toMatchObject({
        progress: 1,
        completed: true,
        claimed: true
      });
    });

    it('needs two finishing workouts for the weekly finishing quest', () => {
      const first = applyWorkoutToProgress(newPlayerState(), 'finishing', 'light');

      expect(findQuest(first.state, 'weekly-finishing-two')).toMatchObject({
        progress: 1,
        completed: false,
        claimed: false
      });

      const second = applyWorkoutToProgress(first.state, 'finishing', 'light');

      expect(findQuest(second.state, 'weekly-finishing-two')).toMatchObject({
        progress: 2,
        completed: true,
        claimed: true
      });
      expect(second.questXpGained).toBe(220);
    });

    it('completes improve-attribute quests by the amount gained', () => {
      const light = applyWorkoutToProgress(newPlayerState(), 'athletic', 'light');

      expect(findQuest(light.state, 'weekly-stamina-up')).toMatchObject({
        progress: 1,
        completed: false
      });

      const hard = applyWorkoutToProgress(newPlayerState(), 'athletic', 'hard');

      expect(findQuest(hard.state, 'weekly-stamina-up')).toMatchObject({
        progress: 2,
        completed: true,
        claimed: true
      });
    });

    it('does not progress improve-attribute quests when the attribute is maxed', () => {
      const update = applyWorkoutToProgress(
        newPlayerState({ threePointShot: 99 }),
        'shooting',
        'hard'
      );

      expect(findQuest(update.state, 'daily-improve-three')).toMatchObject({
        progress: 0,
        completed: false
      });
    });

    it('tracks the current rating for reach-attribute quests', () => {
      const update = applyWorkoutToProgress(
        newPlayerState({ ballHandle: 40 }),
        'ballHandling',
        'hard'
      );

      expect(findQuest(update.state, 'weekly-ball-handle-75')).toMatchObject({
        progress: 43,
        completed: false
      });
    });

    it('completes reach-attribute quests when the rating gets there', () => {
      const update = applyWorkoutToProgress(
        newPlayerState({ ballHandle: 74 }),
        'ballHandling',
        'light'
      );

      expect(findQuest(update.state, 'weekly-ball-handle-75')).toMatchObject({
        progress: 75,
        completed: true,
        claimed: true
      });
      expect(update.completedQuests.map((quest) => quest.id)).toContain(
        'weekly-ball-handle-75'
      );
    });

    it('never shows quest progress above the goal', () => {
      const update = applyWorkoutToProgress(
        newPlayerState({ ballHandle: 70 }),
        'ballHandling',
        'hard'
      );
      const next = applyWorkoutToProgress(update.state, 'ballHandling', 'hard');

      next.state.quests.forEach((quest) => {
        expect(quest.progress).toBeLessThanOrEqual(quest.goal);
      });
    });

    it('pays each quest reward exactly once', () => {
      const first = applyWorkoutToProgress(newPlayerState(), 'defense', 'light');
      const second = applyWorkoutToProgress(first.state, 'defense', 'light');

      // first: "Complete 1 workout" (80) + "Complete 1 Defense Workout" (100)
      expect(first.questXpGained).toBe(180);
      expect(second.questXpGained).toBe(0);
      expect(second.completedQuests).toHaveLength(0);
      expect(second.state.player.totalXp).toBe(70 + 180 + 70);
    });

    it('reports quest XP equal to the sum of completed quest rewards', () => {
      WORKOUT_TYPES.forEach((type) => {
        INTENSITIES.forEach((intensity) => {
          const update = applyWorkoutToProgress(newPlayerState(), type, intensity);
          const rewardTotal = update.completedQuests.reduce(
            (sum, quest) => sum + quest.rewardXp,
            0
          );

          expect(update.questXpGained).toBe(rewardTotal);
          expect(update.session.questXpGained).toBe(rewardTotal);
          expect(update.state.player.totalXp).toBe(
            INTENSITY_CONFIG[intensity].xp + rewardTotal
          );
        });
      });
    });

    it('pays out a quest that was already complete but never claimed', () => {
      // A profile created with Ball Handle already at 75+ starts with the
      // reach quest completed and unclaimed.
      const state = newPlayerState({ ballHandle: 80 });
      const before = findQuest(state, 'weekly-ball-handle-75');

      expect(before).toMatchObject({ completed: true, claimed: false });

      const update = applyWorkoutToProgress(state, 'rebounding', 'light');

      expect(findQuest(update.state, 'weekly-ball-handle-75')).toMatchObject({
        completed: true,
        claimed: true
      });
      expect(update.completedQuests.map((quest) => quest.id)).toContain(
        'weekly-ball-handle-75'
      );
      expect(update.questXpGained).toBe(80 + 260);
    });

    it('adds a quest activity entry for each completed quest', () => {
      const update = applyWorkoutToProgress(newPlayerState(), 'finishing', 'light');
      const questItems = update.state.activityLog.filter(
        (item) => item.type === 'quest'
      );

      expect(questItems).toHaveLength(update.completedQuests.length);
      expect(questItems[0]).toMatchObject({
        title: 'Daily quest completed',
        description: 'Complete 1 workout paid out +80 XP.'
      });
    });
  });

  it('survives a long season without breaking any invariant', () => {
    let state: ProgressState = newPlayerState();
    let expectedXp = 0;

    for (let index = 0; index < 800; index += 1) {
      const type = WORKOUT_TYPES[index % WORKOUT_TYPES.length];
      const intensity = INTENSITIES[index % INTENSITIES.length];
      const update = applyWorkoutToProgress(state, type, intensity);

      expectedXp += update.workoutXpGained + update.questXpGained;
      state = update.state;
    }

    expect(state.player.totalXp).toBe(expectedXp);
    Object.values(state.player.attributes).forEach((value) => {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(ATTRIBUTE_MIN);
      expect(value).toBeLessThanOrEqual(ATTRIBUTE_MAX);
    });
    // 800 workouts is enough to max every attribute
    expect(calculateOvr(state.player.attributes)).toBe(99);
    expect(state.quests.every((quest) => quest.completed && quest.claimed)).toBe(true);
  });
});

describe('getQuestProgressLabel', () => {
  it('shows rounded progress against the goal', () => {
    const state = newPlayerState({ ballHandle: 41 });

    expect(getQuestProgressLabel(findQuest(state, 'weekly-ball-handle-75'))).toBe(
      '41 / 75'
    );
    expect(getQuestProgressLabel(findQuest(state, 'weekly-finishing-two'))).toBe(
      '0 / 2'
    );
  });
});

describe('daily workout limit', () => {
  // Local time, so the tests mean the same day in every time zone.
  const at = (day: number, hour: number, minute = 0) =>
    new Date(2026, 10, day, hour, minute);

  const session = (workoutType: WorkoutType, completedAt: Date): TrainingSession => ({
    id: `session-${workoutType}-${completedAt.getTime()}`,
    workoutType,
    intensity: 'medium',
    xpGained: 120,
    questXpGained: 0,
    attributeGains: {},
    completedAt: completedAt.toISOString()
  });

  it('gives one bonus repeat a day', () => {
    expect(DAILY_BONUS_WORKOUTS).toBe(1);
  });

  it('formats the local calendar day', () => {
    expect(getLocalDayKey(at(5, 0, 0))).toBe('2026-11-05');
    expect(getLocalDayKey(at(5, 23, 59))).toBe('2026-11-05');
  });

  it('starts each day with every workout and the bonus available', () => {
    const status = getDailyWorkoutStatus([], at(26, 9));

    expect(status).toEqual({ loggedTypes: [], sessionsToday: 0, bonusLeft: 1 });
    WORKOUTS.forEach((workout) => {
      expect(getWorkoutAvailability(status, workout.type)).toBe('available');
    });
  });

  it('allows every type once a day even after the bonus is used', () => {
    const now = at(26, 20);
    const sessions = [
      session('shooting', at(26, 8)),
      session('shooting', at(26, 9)),
      ...WORKOUTS.filter((workout) => workout.type !== 'shooting').map((workout, index) =>
        session(workout.type, at(26, 10 + index))
      )
    ];
    const status = getDailyWorkoutStatus(sessions, now);

    // 8 types once each plus the one bonus repeat
    expect(status.sessionsToday).toBe(9);
    expect(status.bonusLeft).toBe(0);
    WORKOUTS.forEach((workout) => {
      expect(getWorkoutAvailability(status, workout.type)).toBe('locked');
    });
  });

  it('offers the bonus to repeat a type logged today, then locks it', () => {
    const now = at(26, 18);
    const once = getDailyWorkoutStatus([session('shooting', at(26, 7))], now);

    expect(getWorkoutAvailability(once, 'shooting')).toBe('bonus');
    expect(getWorkoutAvailability(once, 'defense')).toBe('available');

    const twice = getDailyWorkoutStatus(
      [session('shooting', at(26, 17)), session('shooting', at(26, 7))],
      now
    );

    expect(twice.bonusLeft).toBe(0);
    expect(getWorkoutAvailability(twice, 'shooting')).toBe('locked');
    // the bonus is shared: no second repeat of another type either
    const withDefense = getDailyWorkoutStatus(
      [
        session('defense', at(26, 12)),
        session('shooting', at(26, 17)),
        session('shooting', at(26, 7))
      ],
      now
    );
    expect(getWorkoutAvailability(withDefense, 'defense')).toBe('locked');
  });

  it('resets at local midnight', () => {
    const sessions = [session('shooting', at(25, 22)), session('shooting', at(25, 23, 59))];

    const lateNight = getDailyWorkoutStatus(sessions, at(25, 23, 59));
    expect(getWorkoutAvailability(lateNight, 'shooting')).toBe('locked');

    const nextDay = getDailyWorkoutStatus(sessions, at(26, 0, 0));
    expect(nextDay).toEqual({ loggedTypes: [], sessionsToday: 0, bonusLeft: 1 });
  });

  it('ignores sessions with a broken timestamp', () => {
    const broken = { ...session('shooting', at(26, 8)), completedAt: 'not a date' };

    expect(getDailyWorkoutStatus([broken], at(26, 9)).sessionsToday).toBe(0);
  });
});

describe('focus areas', () => {
  const total = (gains: Partial<Record<AttributeKey, number>>) =>
    Object.values(gains).reduce((sum, gain) => sum + (gain ?? 0), 0);

  // Every non-empty combination of a workout's focus ids.
  const focusCombinations = (ids: string[]) =>
    Array.from({ length: 2 ** ids.length - 1 }, (_, index) =>
      ids.filter((__, bit) => (index + 1) & (1 << bit))
    );

  it('only raises perimeter defense when that is all the player worked on', () => {
    const { attributeGains } = calculateWorkoutResult(
      'defense',
      'hard',
      attributesWith(),
      ['perimeter']
    );

    expect(attributeGains).toEqual({ perimeterDefense: 4 });
    expect(attributeGains).not.toHaveProperty('interiorDefense');
    expect(attributeGains).not.toHaveProperty('block');
    expect(attributeGains).not.toHaveProperty('steal');
  });

  it('puts more into a focused rating than a general session does', () => {
    const general = calculateWorkoutResult('defense', 'hard', attributesWith());
    const focused = calculateWorkoutResult('defense', 'hard', attributesWith(), [
      'perimeter'
    ]);

    expect(focused.attributeGains.perimeterDefense).toBeGreaterThan(
      general.attributeGains.perimeterDefense!
    );
  });

  it('keeps the general session unchanged when no focus is picked', () => {
    const general = calculateWorkoutResult('defense', 'hard', attributesWith());

    expect(general.attributeGains).toEqual({
      interiorDefense: 2,
      perimeterDefense: 3,
      steal: 2,
      block: 1
    });
    expect(
      calculateWorkoutResult('defense', 'hard', attributesWith(), []).attributeGains
    ).toEqual(general.attributeGains);
    // ids that belong to another workout (or to nothing) are ignored
    expect(
      calculateWorkoutResult('defense', 'hard', attributesWith(), ['threePointers', 'x'])
        .attributeGains
    ).toEqual(general.attributeGains);
  });

  it('splits gains across several picked focus areas', () => {
    const { attributeGains } = calculateWorkoutResult(
      'shooting',
      'medium',
      attributesWith(),
      ['threePointers', 'offDribble']
    );

    expect(attributeGains).toEqual({
      threePointShot: 3,
      fadeaway: 3,
      midRangeShot: 1
    });
  });

  it('never gives more in total than the general session, and only to focus ratings', () => {
    WORKOUTS.filter((workout) => workout.focusOptions.length > 0).forEach((workout) => {
      const combos = focusCombinations(workout.focusOptions.map((option) => option.id));

      [0, 40, 79, 82, 90, 98].forEach((base) => {
        const attributes = attributesWith({}, base);

        INTENSITIES.forEach((intensity) => {
          const general = calculateWorkoutResult(workout.type, intensity, attributes);

          combos.forEach((focus) => {
            const focusKeys = workout.focusOptions
              .filter((option) => focus.includes(option.id))
              .flatMap((option) => option.effects.map((effect) => effect.attribute));
            const { attributeGains } = calculateWorkoutResult(
              workout.type,
              intensity,
              attributes,
              focus
            );

            expect(total(attributeGains)).toBeLessThanOrEqual(
              total(general.attributeGains)
            );
            expect(total(attributeGains)).toBeGreaterThan(0);
            Object.keys(attributeGains).forEach((key) => {
              expect(focusKeys).toContain(key);
            });
          });
        });
      });
    });
  });

  it('trims a session with every focus picked down to the general total', () => {
    const { attributeGains } = calculateWorkoutResult(
      'shooting',
      'hard',
      attributesWith(),
      ['midRange', 'threePointers', 'freeThrows', 'catchAndShoot', 'offDribble']
    );

    // the general hard shooting session gives 3 + 3 + 2 + 1 + 1
    expect(total(attributeGains)).toBe(10);
    (['midRangeShot', 'threePointShot', 'freeThrow', 'fadeaway'] as AttributeKey[]).forEach(
      (key) => {
        expect(attributeGains[key]).toBeGreaterThan(0);
      }
    );
  });

  it('still slows focused gains down near the cap', () => {
    const { attributeGains } = calculateWorkoutResult(
      'defense',
      'hard',
      attributesWith({ perimeterDefense: 90 }),
      ['perimeter']
    );

    expect(attributeGains).toEqual({ perimeterDefense: 1 });
  });

  it('stores the picked focus on the session in definition order', () => {
    const update = applyWorkoutToProgress(newPlayerState(), 'shooting', 'medium', [
      'offDribble',
      'unknown',
      'threePointers'
    ]);

    expect(update.session.focus).toEqual(['threePointers', 'offDribble']);
    expect(update.state.trainingSessions[0].focus).toEqual([
      'threePointers',
      'offDribble'
    ]);
  });

  it('leaves focus out of a general session', () => {
    const update = applyWorkoutToProgress(newPlayerState(), 'shooting', 'medium');

    expect(update.session).not.toHaveProperty('focus');
  });

  it('names the focus in the activity log', () => {
    const update = applyWorkoutToProgress(newPlayerState(), 'shooting', 'medium', [
      'threePointers',
      'offDribble'
    ]);
    const workoutItem = update.state.activityLog.find((item) => item.type === 'workout');

    expect(workoutItem).toMatchObject({
      title: 'Shooting Workout completed',
      description:
        'Three-pointers, off the dribble / fadeaways. Medium session earned +120 XP.'
    });
  });

  it('formats a workout name with its focus', () => {
    expect(formatWorkoutName('shooting', ['threePointers', 'offDribble'])).toBe(
      'Shooting Workout: three-pointers, off the dribble / fadeaways'
    );
    expect(formatWorkoutName('defense', undefined)).toBe('Defense Workout');
    expect(formatWorkoutName('defense', [])).toBe('Defense Workout');
    expect(describeWorkoutFocus('defense', ['perimeter'])).toBe('Perimeter defense');
  });
});

describe('pickup game', () => {
  const game = getWorkoutDefinition('game');
  const categoryOf = (key: string) =>
    ATTRIBUTE_CATEGORIES.find((category) =>
      category.attributes.some((attribute) => attribute.key === key)
    )!.id;

  it('raises at least one rating in every category at every intensity', () => {
    INTENSITIES.forEach((intensity) => {
      const { attributeGains } = calculateWorkoutResult(
        'game',
        intensity,
        samplePlayer.attributes
      );
      const touched = new Set(Object.keys(attributeGains).map(categoryOf));

      expect([...touched].sort()).toEqual(
        ATTRIBUTE_CATEGORIES.map((category) => category.id).sort()
      );
      expect(Object.keys(attributeGains)).toHaveLength(game.spreadGains![intensity]);
    });
  });

  it('moves each rating by only +1', () => {
    INTENSITIES.forEach((intensity) => {
      const { attributeGains } = calculateWorkoutResult(
        'game',
        intensity,
        attributesWith()
      );

      Object.values(attributeGains).forEach((gain) => expect(gain).toBe(1));
    });
  });

  it('hands out 6, 8 and 10 points by intensity', () => {
    expect(game.spreadGains).toEqual({ light: 6, medium: 8, hard: 10 });
  });

  it('works on the weakest rating in each category first', () => {
    const { attributeGains } = calculateWorkoutResult(
      'game',
      'light',
      attributesWith({ block: 10, offensiveRebound: 12 }, 50)
    );

    expect(attributeGains.block).toBe(1);
    expect(attributeGains.offensiveRebound).toBe(1);
    expect(attributeGains).not.toHaveProperty('steal');
  });

  it('skips capped ratings and gives nothing when everything is 99', () => {
    const { attributeGains } = calculateWorkoutResult(
      'game',
      'hard',
      attributesWith({ speed: 99 }, 98)
    );

    expect(attributeGains).not.toHaveProperty('speed');
    expect(
      calculateWorkoutResult('game', 'hard', attributesWith({}, 99)).attributeGains
    ).toEqual({});
  });

  it('counts toward the daily limit like any workout', () => {
    const first = applyWorkoutToProgress(newPlayerState(), 'game', 'medium');
    const once = getDailyWorkoutStatus(first.state.trainingSessions);

    expect(once.loggedTypes).toEqual(['game']);
    expect(getWorkoutAvailability(once, 'game')).toBe('bonus');
    expect(getWorkoutAvailability(once, 'shooting')).toBe('available');

    const second = applyWorkoutToProgress(first.state, 'game', 'medium');
    const twice = getDailyWorkoutStatus(second.state.trainingSessions);

    expect(twice.bonusLeft).toBe(0);
    expect(getWorkoutAvailability(twice, 'game')).toBe('locked');
  });
});
