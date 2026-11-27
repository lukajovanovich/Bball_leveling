import { PLAYER_ARCHETYPES } from '../../src/data/playerOptions';
import { normalizeProgressState } from '../../src/data/mockPlayer';
import {
  ALL_DAILY_BONUS,
  DAILY_QUEST_XP,
  MAX_PENALIZED_DAYS,
  MISSED_DAY_XP_PENALTY,
  QUEST_AREAS,
  REST_DAYS_PER_WEEK,
  cancelRestDay,
  getRestDayStatus,
  takeRestDay,
  addDays,
  buildDailyQuests,
  buildWeeklyQuests,
  createQuestCycle,
  describeQuestPenalty,
  getAllDailyBonusXp,
  getAreaAttributes,
  getCurrentStreak,
  getLocalWeekKey,
  refreshQuests
} from '../../src/lib/quests';
import {
  applyWorkoutToProgress,
  getLevelInfo,
  getLocalDayKey,
  getXpNeededForLevel
} from '../../src/lib/progression';
import { AttributeKey, ProgressState, Quest, WorkoutType } from '../../src/types';
import { attributesWith, deepFreeze, newPlayerState } from '../helpers/fixtures';

// Thursday 26 November 2026, local time, so the tests mean the same in every zone.
const at = (day: number, hour = 10, month = 10) => new Date(2026, month, day, hour);
const THURSDAY = at(26);

const player = (archetype = 'Glass Cleaner') => ({
  ...newPlayerState(attributesWith()).player,
  archetype
});

/** A rotating-quest state for `now`, with ratings at 50 and some XP inside level 3. */
const rotatingState = (now: Date, archetype = 'Glass Cleaner'): ProgressState => {
  const base = newPlayerState(attributesWith({}, 50), getXpNeededForLevel(1) + getXpNeededForLevel(2) + 150);
  const cycle = createQuestCycle(now);

  return {
    ...base,
    player: { ...base.player, archetype },
    quests: [
      ...buildDailyQuests({ ...base.player, archetype }, cycle.dayKey),
      ...buildWeeklyQuests({ ...base.player, archetype }, cycle.weekKey)
    ],
    questCycle: cycle
  };
};

const daily = (state: ProgressState) => state.quests.filter((quest) => quest.period === 'daily');
const byKind = (state: ProgressState, kind: Quest['kind']) =>
  daily(state).find((quest) => quest.kind === kind) as Quest;

/** Logs the workouts that complete the given daily quests (by kind). */
const complete = (
  state: ProgressState,
  kinds: Quest['kind'][],
  now: Date
): ProgressState => {
  let current = state;

  kinds.forEach((kind) => {
    const quest = byKind(current, kind);

    if (kind === 'complete_workouts') {
      current = applyWorkoutToProgress(current, 'game', 'light', [], now).state;
    }

    if (kind === 'complete_workout_type') {
      current = applyWorkoutToProgress(
        current,
        quest.workoutType as WorkoutType,
        'light',
        [],
        now
      ).state;
    }

    if (kind === 'complete_focus') {
      current = applyWorkoutToProgress(
        current,
        quest.workoutType as WorkoutType,
        'light',
        [quest.focusId as string],
        now
      ).state;
    }
  });

  return current;
};

describe('days and weeks', () => {
  it('finds the local Monday of the week', () => {
    expect(getLocalWeekKey(at(26))).toBe('2026-11-23');
    expect(getLocalWeekKey(at(23, 0))).toBe('2026-11-23');
    expect(getLocalWeekKey(at(29, 23))).toBe('2026-11-23');
    expect(getLocalWeekKey(at(30))).toBe('2026-11-30');
  });

  it('adds days across month and year ends', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('daily quests', () => {
  it('gives three quests: any workout, the area of the day, and a focus session', () => {
    const quests = buildDailyQuests(player(), '2026-11-26');

    expect(quests.map((quest) => quest.kind)).toEqual([
      'complete_workouts',
      'complete_workout_type',
      'complete_focus'
    ]);
    expect(quests.map((quest) => quest.rewardXp)).toEqual([
      DAILY_QUEST_XP.anyWorkout,
      DAILY_QUEST_XP.area,
      DAILY_QUEST_XP.focus
    ]);
    quests.forEach((quest) => expect(quest.period).toBe('daily'));
  });

  it('is the same for a player on the same day and changes from day to day', () => {
    expect(buildDailyQuests(player(), '2026-11-26')).toEqual(
      buildDailyQuests(player(), '2026-11-26')
    );

    const ids = new Set(
      Array.from({ length: 14 }, (_, index) =>
        buildDailyQuests(player(), addDays('2026-11-26', index))
          .map((quest) => quest.id)
          .join()
      )
    );
    expect(ids.size).toBeGreaterThan(7);
  });

  it('never picks the focus session from the area of the day', () => {
    for (let index = 0; index < 120; index += 1) {
      const [, area, focus] = buildDailyQuests(player('3-and-D Wing'), addDays('2026-01-01', index));

      expect(focus.workoutType).not.toBe(area.workoutType);
      expect(focus.focusId).toBeTruthy();
      expect(focus.attributeKey).toBeTruthy();
    }
  });

  it.each(PLAYER_ARCHETYPES.map((archetype) => [archetype]))(
    'still rotates through every area for a %s',
    (archetype) => {
      const seen = new Set<string>();

      for (let index = 0; index < 365; index += 1) {
        seen.add(
          buildDailyQuests(player(archetype), addDays('2026-01-01', index))[1]
            .workoutType as string
        );
      }

      expect(seen).toEqual(new Set(QUEST_AREAS));
    }
  );

  it('leans toward the areas that fit the archetype', () => {
    const countAreas = (archetype: string) => {
      const counts: Record<string, number> = {};

      for (let index = 0; index < 365; index += 1) {
        const area = buildDailyQuests(player(archetype), addDays('2026-01-01', index))[1]
          .workoutType as string;
        counts[area] = (counts[area] ?? 0) + 1;
      }

      return counts;
    };

    const glass = countAreas('Glass Cleaner');
    expect(glass.rebounding).toBeGreaterThan(2 * glass.shooting);
    expect(glass.defense).toBeGreaterThan(2 * glass.ballHandling);

    const shooter = countAreas('Shot-Creating Guard');
    expect(shooter.shooting).toBeGreaterThan(2 * shooter.rebounding);
    expect(shooter.ballHandling).toBeGreaterThan(2 * shooter.strength);
  });

  it('describes what each daily quest costs when it is missed', () => {
    const [any, area, focus] = buildDailyQuests(player(), '2026-11-26');

    expect(describeQuestPenalty(any)).toBe(`Skip the day: -${MISSED_DAY_XP_PENALTY} XP`);
    expect(describeQuestPenalty(area)).toMatch(/^Miss it: .+ ratings -1$/);
    expect(describeQuestPenalty(focus)).toMatch(/^Miss it: .+ -1$/);
    expect(describeQuestPenalty(buildWeeklyQuests(player(), '2026-11-23')[0])).toBeNull();
  });
});

describe('weekly quests', () => {
  it('gives three bigger quests for the week, the same all week', () => {
    const quests = buildWeeklyQuests(player(), '2026-11-23');

    expect(quests).toHaveLength(3);
    quests.forEach((quest) => expect(quest.period).toBe('weekly'));
    expect(quests.map((quest) => quest.kind)).toEqual([
      'complete_workout_type',
      'improve_attribute',
      'complete_workouts'
    ]);
    expect(buildWeeklyQuests(player(), '2026-11-23')).toEqual(quests);
  });

  it('does not ask to raise a rating that is already maxed', () => {
    for (let index = 0; index < 60; index += 1) {
      const weekKey = addDays('2026-01-05', index * 7);
      const improve = buildWeeklyQuests(player(), weekKey)[1];
      const area = QUEST_AREAS.find((item) =>
        getAreaAttributes(item).includes(improve.attributeKey as AttributeKey)
      ) as WorkoutType;
      const maxed = attributesWith({ [improve.attributeKey as AttributeKey]: 99 });
      const again = buildWeeklyQuests({ ...player(), attributes: maxed }, weekKey)[1];

      if (getAreaAttributes(area).length > 1) {
        expect(again.attributeKey).not.toBe(improve.attributeKey);
      }
    }
  });
});

describe('streak and the all-three bonus', () => {
  it('grows the bonus with the streak up to a cap', () => {
    expect(getAllDailyBonusXp(1)).toBe(ALL_DAILY_BONUS.base + ALL_DAILY_BONUS.perStreakDay);
    expect(getAllDailyBonusXp(50)).toBe(
      ALL_DAILY_BONUS.base + ALL_DAILY_BONUS.perStreakDay * ALL_DAILY_BONUS.maxStreakDays
    );
  });

  it('starts a streak on the first quest of the day and pays the bonus once all three are done', () => {
    const state = rotatingState(THURSDAY);
    const afterOne = complete(state, ['complete_workouts'], THURSDAY);

    expect(afterOne.questCycle).toMatchObject({ streak: 1, lastActiveDay: '2026-11-26' });

    const xpBefore = afterOne.player.totalXp;
    const update = applyWorkoutToProgress(
      afterOne,
      byKind(afterOne, 'complete_workout_type').workoutType as WorkoutType,
      'light',
      [],
      THURSDAY
    );
    expect(update.state.questCycle?.streak).toBe(1);

    const focusQuest = byKind(update.state, 'complete_focus');
    const final = applyWorkoutToProgress(
      update.state,
      focusQuest.workoutType as WorkoutType,
      'light',
      [focusQuest.focusId as string],
      THURSDAY
    );

    expect(daily(final.state).every((quest) => quest.completed && quest.claimed)).toBe(true);
    expect(final.questXpGained).toBe(DAILY_QUEST_XP.focus + getAllDailyBonusXp(1));
    expect(final.state.activityLog[0].title).toBe('All daily quests done');
    expect(xpBefore).toBeLessThan(final.state.player.totalXp);

    // a fourth workout the same day pays no second bonus
    const extra = applyWorkoutToProgress(final.state, 'game', 'light', [], THURSDAY);
    expect(extra.state.activityLog.some((item) => item.title === 'All daily quests done' && item.createdAt !== final.state.activityLog[0].createdAt)).toBe(false);
  });

  it('continues the streak from yesterday and resets it after a missed day', () => {
    const wednesday = at(25);
    const yesterday = complete(rotatingState(wednesday), ['complete_workouts'], wednesday);
    const today = complete(refreshQuests(yesterday, THURSDAY), ['complete_workouts'], THURSDAY);

    expect(today.questCycle?.streak).toBe(2);

    const skippedFriday = refreshQuests(today, at(28));
    expect(skippedFriday.questCycle?.streak).toBe(0);
    expect(getCurrentStreak(today.questCycle, at(28))).toBe(0);
    expect(getCurrentStreak(today.questCycle, at(27))).toBe(2);
  });

  it('counts a focus quest only for that workout with that focus picked', () => {
    const state = rotatingState(THURSDAY);
    const focusQuest = byKind(state, 'complete_focus');
    const workout = focusQuest.workoutType as WorkoutType;

    const general = applyWorkoutToProgress(state, workout, 'light', [], THURSDAY);
    expect(byKind(general.state, 'complete_focus').completed).toBe(false);

    const focused = applyWorkoutToProgress(state, workout, 'light', [focusQuest.focusId as string], THURSDAY);
    expect(byKind(focused.state, 'complete_focus').completed).toBe(true);
  });

  it('does not let a pickup game finish the area or focus quest', () => {
    const update = applyWorkoutToProgress(rotatingState(THURSDAY), 'game', 'hard', [], THURSDAY);

    expect(byKind(update.state, 'complete_workouts').completed).toBe(true);
    expect(byKind(update.state, 'complete_workout_type').completed).toBe(false);
    expect(byKind(update.state, 'complete_focus').completed).toBe(false);
  });
});

describe('refreshQuests', () => {
  it('returns the same state on the same day', () => {
    const state = rotatingState(THURSDAY);

    expect(refreshQuests(state, at(26, 23))).toBe(state);
  });

  it('starts rotating quests for rows saved before them, without any penalty', () => {
    const { questCycle, ...old } = newPlayerState(attributesWith(), 500);
    const refreshed = refreshQuests(old as ProgressState, THURSDAY);

    expect(questCycle).toBeDefined();
    expect(refreshed.questCycle).toMatchObject({ dayKey: '2026-11-26', weekKey: '2026-11-23', streak: 0 });
    expect(daily(refreshed).map((quest) => quest.kind)).toEqual([
      'complete_workouts',
      'complete_workout_type',
      'complete_focus'
    ]);
    expect(refreshed.player).toEqual(old.player);
  });

  it('takes a point from every rating of a missed area and the missed focus rating, plus XP when nothing was done', () => {
    const state = deepFreeze(rotatingState(at(25)));
    const area = byKind(state, 'complete_workout_type').workoutType as WorkoutType;
    const focusKey = byKind(state, 'complete_focus').attributeKey as AttributeKey;
    const refreshed = refreshQuests(state, THURSDAY);

    getAreaAttributes(area).forEach((key) => {
      expect(refreshed.player.attributes[key]).toBe(49);
    });
    expect(refreshed.player.attributes[focusKey]).toBe(49);
    expect(refreshed.player.totalXp).toBe(state.player.totalXp - MISSED_DAY_XP_PENALTY);
    expect(refreshed.questCycle?.dayKey).toBe('2026-11-26');
    expect(refreshed.activityLog[0]).toMatchObject({ type: 'penalty' });
    expect(refreshed.activityLog[0].description).toMatch(/-100 XP/);
    expect(daily(refreshed)[0].id).toContain('2026-11-26');
  });

  it('only takes the missed rating when the area quest was done, and no XP', () => {
    const wednesday = at(25);
    const state = complete(rotatingState(wednesday), ['complete_workout_type'], wednesday);
    const area = byKind(state, 'complete_workout_type').workoutType as WorkoutType;
    const focusKey = byKind(state, 'complete_focus').attributeKey as AttributeKey;
    const refreshed = refreshQuests(state, THURSDAY);

    expect(refreshed.player.totalXp).toBe(state.player.totalXp);
    expect(refreshed.player.attributes[focusKey]).toBe(state.player.attributes[focusKey] - 1);
    getAreaAttributes(area)
      .filter((key) => key !== focusKey)
      .forEach((key) => {
        expect(refreshed.player.attributes[key]).toBe(state.player.attributes[key]);
      });
  });

  it('takes nothing when all three were done', () => {
    const wednesday = at(25);
    const state = complete(
      rotatingState(wednesday),
      ['complete_workouts', 'complete_workout_type', 'complete_focus'],
      wednesday
    );
    const refreshed = refreshQuests(state, THURSDAY);

    expect(refreshed.player.attributes).toEqual(state.player.attributes);
    expect(refreshed.player.totalXp).toBe(state.player.totalXp);
    expect(refreshed.activityLog.filter((item) => item.type === 'penalty')).toHaveLength(0);
  });

  it(`settles at most ${MAX_PENALIZED_DAYS} missed days after a long break`, () => {
    const state = rotatingState(at(1));
    const refreshed = refreshQuests(state, THURSDAY);

    const penalties = refreshed.activityLog.filter((item) => item.type === 'penalty');
    expect(penalties).toHaveLength(MAX_PENALIZED_DAYS);
    // the most recent days: 23, 24 and 25 November (newest first in the log)
    expect(penalties.map((item) => item.title)).toEqual(
      [23, 24, 25].reverse().map((day) => `Missed quests on ${at(day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`)
    );
    const lowest = Math.min(...Object.values(refreshed.player.attributes));
    expect(lowest).toBeGreaterThanOrEqual(50 - 2 * MAX_PENALIZED_DAYS);
  });

  it('never takes a level away or a rating below 0', () => {
    const base = rotatingState(at(25));
    const startOfLevel3 = getXpNeededForLevel(1) + getXpNeededForLevel(2);
    const state: ProgressState = {
      ...base,
      player: { ...base.player, totalXp: startOfLevel3 + 30 }
    };
    const zero = Object.fromEntries(
      Object.keys(state.player.attributes).map((key) => [key, 0])
    ) as typeof state.player.attributes;
    const refreshed = refreshQuests(
      { ...state, player: { ...state.player, attributes: zero } },
      THURSDAY
    );

    expect(getLevelInfo(refreshed.player.totalXp).level).toBe(3);
    expect(refreshed.player.totalXp).toBe(startOfLevel3);
    Object.values(refreshed.player.attributes).forEach((value) => expect(value).toBe(0));
  });

  it('does nothing when the clock goes backwards', () => {
    const state = rotatingState(THURSDAY);

    expect(refreshQuests(state, at(24))).toBe(state);
  });

  it('keeps weekly quests within the week and replaces them on Monday without a penalty', () => {
    const wednesday = at(25);
    const state = complete(
      rotatingState(wednesday),
      ['complete_workouts', 'complete_workout_type', 'complete_focus'],
      wednesday
    );
    const weekly = state.quests.filter((quest) => quest.period === 'weekly');

    expect(refreshQuests(state, THURSDAY).quests.filter((quest) => quest.period === 'weekly')).toEqual(weekly);

    const sunday = complete(refreshQuests(state, at(29)), ['complete_workouts', 'complete_workout_type', 'complete_focus'], at(29));
    const monday = refreshQuests(sunday, at(30));
    const newWeekly = monday.quests.filter((quest) => quest.period === 'weekly');

    expect(monday.questCycle?.weekKey).toBe('2026-11-30');
    expect(newWeekly.every((quest) => quest.id.includes('2026-11-30'))).toBe(true);
    expect(monday.player.attributes).toEqual(sunday.player.attributes);
  });
});

describe('saved quest cycles', () => {
  it('keeps a valid cycle and drops a broken one', () => {
    const state = rotatingState(THURSDAY);

    expect(normalizeProgressState(state).questCycle).toEqual(state.questCycle);
    expect(
      normalizeProgressState({ ...state, questCycle: { dayKey: 'yesterday' } as never }).questCycle
    ).toBeUndefined();
    expect(
      normalizeProgressState({
        ...state,
        questCycle: { ...state.questCycle!, streak: -4, lastActiveDay: 7 as never }
      }).questCycle
    ).toMatchObject({ streak: 0, lastActiveDay: null });
  });

  it('uses the local day for the cycle', () => {
    expect(createQuestCycle(THURSDAY).dayKey).toBe(getLocalDayKey(THURSDAY));
  });
});

describe('weekly rest day', () => {
  it('allows one rest day a week', () => {
    expect(REST_DAYS_PER_WEEK).toBe(1);
  });

  it('costs nothing and keeps the streak without growing it', () => {
    const wednesday = at(25);
    const active = complete(rotatingState(wednesday), ['complete_workouts'], wednesday);
    const thursday = refreshQuests(active, THURSDAY);

    expect(getRestDayStatus(thursday, THURSDAY).canRest).toBe(true);
    const resting = takeRestDay(thursday, THURSDAY);
    expect(getRestDayStatus(resting, THURSDAY)).toMatchObject({ restingToday: true, canRest: false });

    const friday = refreshQuests(resting, at(27));
    expect(friday.player.attributes).toEqual(resting.player.attributes);
    expect(friday.player.totalXp).toBe(resting.player.totalXp);
    // nothing new since Thursday (Wednesday's own misses were settled then)
    expect(friday.activityLog).toEqual(resting.activityLog);
    expect(getCurrentStreak(friday.questCycle, at(27))).toBe(1);

    const fridayDone = complete(friday, ['complete_workouts'], at(27));
    expect(fridayDone.questCycle?.streak).toBe(2);
  });

  it('allows only one per week, and a new one from Monday', () => {
    const resting = takeRestDay(rotatingState(at(24)), at(24));
    const nextDay = refreshQuests(resting, at(25));

    expect(getRestDayStatus(nextDay, at(25))).toMatchObject({ usedThisWeek: 1, canRest: false });
    expect(takeRestDay(nextDay, at(25))).toBe(nextDay);

    const monday = refreshQuests(nextDay, at(30));
    expect(getRestDayStatus(monday, at(30)).canRest).toBe(true);
  });

  it('is not offered once a daily quest is done today', () => {
    const state = complete(rotatingState(THURSDAY), ['complete_workouts'], THURSDAY);

    expect(getRestDayStatus(state, THURSDAY).canRest).toBe(false);
    expect(takeRestDay(state, THURSDAY)).toBe(state);
  });

  it('gives the rest day back when the player trains or cancels it', () => {
    const resting = takeRestDay(rotatingState(THURSDAY), THURSDAY);

    expect(getRestDayStatus(cancelRestDay(resting, THURSDAY), THURSDAY)).toMatchObject({
      restingToday: false,
      usedThisWeek: 0,
      canRest: true
    });

    const trained = applyWorkoutToProgress(resting, 'game', 'light', [], THURSDAY).state;
    expect(getRestDayStatus(trained, THURSDAY)).toMatchObject({ restingToday: false, usedThisWeek: 0 });
    expect(trained.questCycle?.streak).toBe(1);
  });

  it('does not protect a missed day that was not taken as rest', () => {
    const wednesday = at(25);
    const active = complete(rotatingState(wednesday), ['complete_workouts'], wednesday);
    // Thursday rest, Friday simply missed
    const resting = takeRestDay(refreshQuests(active, THURSDAY), THURSDAY);
    const friday = refreshQuests(resting, at(27));
    const saturday = refreshQuests(friday, at(28));

    expect(saturday.questCycle?.streak).toBe(0);
    expect(saturday.activityLog.length - friday.activityLog.length).toBe(1);
    expect(saturday.activityLog[0].title).toMatch(/Nov 27|27/);
  });
});
