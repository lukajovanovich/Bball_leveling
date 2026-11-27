import { ATTRIBUTE_NAME_BY_KEY } from '../data/attributes';
import { colors } from '../theme/theme';
import {
  ActivityLogItem,
  AttributeKey,
  PlayerAttributes,
  PlayerProfile,
  ProgressState,
  Quest,
  QuestCycle,
  WorkoutDefinition,
  WorkoutType
} from '../types';
import {
  clampAttribute,
  getLevelInfo,
  getLocalDayKey,
  getWorkoutDefinition
} from './progression';

// ---------------------------------------------------------------------------
// Balance numbers for rotating quests. Keep them here, not in screens.
// ---------------------------------------------------------------------------

export const DAILY_QUEST_XP = { anyWorkout: 80, area: 100, focus: 90 };
export const WEEKLY_QUEST_XP = { area: 220, improve: 200, total: 180 };
export const WEEKLY_GOALS = { areaWorkouts: 3, improvePoints: 3, totalWorkouts: 5 };

/** Bonus for finishing all three daily quests: base + per streak day, capped. */
export const ALL_DAILY_BONUS = { base: 50, perStreakDay: 10, maxStreakDays: 10 };

/** XP lost on a day with no quest done; never takes away a level. */
export const MISSED_DAY_XP_PENALTY = 100;
/** Rating lost per attribute for a missed area or focus quest. */
export const MISSED_QUEST_ATTRIBUTE_PENALTY = 1;
/** Coming back after a long break only settles this many missed days. */
export const MAX_PENALIZED_DAYS = 3;

/** The seven training areas; the Pickup Game is not an area. */
export const QUEST_AREAS: WorkoutType[] = [
  'shooting',
  'ballHandling',
  'finishing',
  'defense',
  'rebounding',
  'athletic',
  'strength'
];

type AreaWeights = Record<string, number>;

// How often each area comes up for an archetype. Every area keeps some weight
// so nothing disappears from the rotation; unknown archetypes get even odds.
export const ARCHETYPE_AREA_WEIGHTS: Record<string, AreaWeights> = {
  'Raw Prospect': {},
  'Floor General': {
    ballHandling: 3,
    shooting: 2,
    defense: 1.5,
    rebounding: 0.5,
    strength: 0.5
  },
  'Shot-Creating Guard': {
    shooting: 3,
    ballHandling: 2.5,
    finishing: 1.5,
    rebounding: 0.5,
    strength: 0.5
  },
  '3-and-D Wing': {
    shooting: 3,
    defense: 3,
    finishing: 0.5,
    rebounding: 0.75,
    strength: 0.75
  },
  'Slashing Finisher': {
    finishing: 3,
    athletic: 2.5,
    ballHandling: 1.5,
    rebounding: 0.5
  },
  'Stretch Big': {
    shooting: 2.5,
    rebounding: 2,
    defense: 1.5,
    strength: 1.5,
    athletic: 0.75,
    ballHandling: 0.5
  },
  'Glass Cleaner': {
    rebounding: 3,
    defense: 2.5,
    strength: 2,
    shooting: 0.5,
    ballHandling: 0.5
  },
  'Two-Way Playmaker': {
    ballHandling: 2.5,
    defense: 2.5,
    shooting: 1.5,
    rebounding: 0.75,
    strength: 0.75
  }
};

export const getAreaWeight = (archetype: string, area: WorkoutType) =>
  ARCHETYPE_AREA_WEIGHTS[archetype]?.[area] ?? 1;

// ---------------------------------------------------------------------------
// Days, weeks and a seeded random pick, so a player's quests for a given day
// are the same on every device and every reload.
// ---------------------------------------------------------------------------

const parseDayKey = (dayKey: string) => {
  const [year, month, day] = dayKey.split('-').map(Number);

  return new Date(year, month - 1, day);
};

export const addDays = (dayKey: string, days: number) => {
  const date = parseDayKey(dayKey);
  date.setDate(date.getDate() + days);

  return getLocalDayKey(date);
};

/** The local Monday of the week that contains `date`. */
export const getLocalWeekKey = (date: Date) => {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceMonday = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - daysSinceMonday);

  return getLocalDayKey(monday);
};

const hashString = (value: string) => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

export const createSeededRandom = (seed: string) => {
  let state = hashString(seed) || 1;

  return () => {
    // mulberry32
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const pickWeighted = <T>(items: T[], weightOf: (item: T) => number, random: () => number) => {
  const total = items.reduce((sum, item) => sum + weightOf(item), 0);
  let roll = random() * total;

  for (const item of items) {
    roll -= weightOf(item);

    if (roll < 0) {
      return item;
    }
  }

  return items[items.length - 1];
};

const pickArea = (
  archetype: string,
  random: () => number,
  exclude: WorkoutType[] = []
) =>
  pickWeighted(
    QUEST_AREAS.filter((area) => !exclude.includes(area)),
    (area) => getAreaWeight(archetype, area),
    random
  );

/** The ratings an area quest protects: every attribute a focus of it trains at full weight. */
export const getAreaAttributes = (area: WorkoutType): AttributeKey[] => {
  const workout = getWorkoutDefinition(area);
  const keys = workout.focusOptions.flatMap((option) =>
    option.effects.filter((effect) => effect.weight >= 1).map((effect) => effect.attribute)
  );

  return Array.from(new Set(keys));
};

const primaryAttribute = (workout: WorkoutDefinition, focusId: string) => {
  const option = workout.focusOptions.find((item) => item.id === focusId);
  const effects = [...(option?.effects ?? [])].sort((a, b) => b.weight - a.weight);

  return effects[0]?.attribute;
};

const lowerFirst = (value: string) => value.charAt(0).toLowerCase() + value.slice(1);

// ---------------------------------------------------------------------------
// Building quests
// ---------------------------------------------------------------------------

const questSeed = (player: PlayerProfile, key: string) => `${player.id}|${key}`;

export const buildDailyQuests = (player: PlayerProfile, dayKey: string): Quest[] => {
  const random = createSeededRandom(questSeed(player, `day|${dayKey}`));
  const area = pickArea(player.archetype, random);
  const focusArea = pickArea(player.archetype, random, [area]);
  const areaWorkout = getWorkoutDefinition(area);
  const focusWorkout = getWorkoutDefinition(focusArea);
  const focusOption =
    focusWorkout.focusOptions[Math.floor(random() * focusWorkout.focusOptions.length)];

  return [
    {
      id: `daily-${dayKey}-any`,
      title: 'Complete 1 workout',
      description: 'Any session counts, a pickup game too.',
      period: 'daily',
      kind: 'complete_workouts',
      rewardXp: DAILY_QUEST_XP.anyWorkout,
      progress: 0,
      goal: 1,
      completed: false,
      claimed: false
    },
    {
      id: `daily-${dayKey}-area-${area}`,
      title: `Complete 1 ${areaWorkout.title}`,
      description: 'Today\'s area. Any focus counts.',
      period: 'daily',
      kind: 'complete_workout_type',
      workoutType: area,
      rewardXp: DAILY_QUEST_XP.area,
      progress: 0,
      goal: 1,
      completed: false,
      claimed: false
    },
    {
      id: `daily-${dayKey}-focus-${focusArea}-${focusOption.id}`,
      title: `${focusOption.label} session`,
      description: `Log a ${lowerFirst(focusWorkout.title)} with "${lowerFirst(
        focusOption.label
      )}" picked as a focus.`,
      period: 'daily',
      kind: 'complete_focus',
      workoutType: focusArea,
      focusId: focusOption.id,
      attributeKey: primaryAttribute(focusWorkout, focusOption.id),
      rewardXp: DAILY_QUEST_XP.focus,
      progress: 0,
      goal: 1,
      completed: false,
      claimed: false
    }
  ];
};

export const buildWeeklyQuests = (
  player: PlayerProfile,
  weekKey: string,
  attributes: PlayerAttributes = player.attributes
): Quest[] => {
  const random = createSeededRandom(questSeed(player, `week|${weekKey}`));
  const area = pickArea(player.archetype, random);
  const improveArea = pickArea(player.archetype, random, [area]);
  const candidates = getAreaAttributes(improveArea).filter(
    (key) => attributes[key] < 99
  );
  const improveKey =
    candidates[Math.floor(random() * candidates.length)] ??
    getAreaAttributes(improveArea)[0];
  const areaWorkout = getWorkoutDefinition(area);

  return [
    {
      id: `weekly-${weekKey}-area-${area}`,
      title: `Complete ${WEEKLY_GOALS.areaWorkouts} ${areaWorkout.title}s`,
      description: 'This week\'s main area.',
      period: 'weekly',
      kind: 'complete_workout_type',
      workoutType: area,
      rewardXp: WEEKLY_QUEST_XP.area,
      progress: 0,
      goal: WEEKLY_GOALS.areaWorkouts,
      completed: false,
      claimed: false
    },
    {
      id: `weekly-${weekKey}-improve-${improveKey}`,
      title: `Raise ${ATTRIBUTE_NAME_BY_KEY[improveKey]} by ${WEEKLY_GOALS.improvePoints}`,
      description: 'Focused sessions move it fastest.',
      period: 'weekly',
      kind: 'improve_attribute',
      attributeKey: improveKey,
      rewardXp: WEEKLY_QUEST_XP.improve,
      progress: 0,
      goal: WEEKLY_GOALS.improvePoints,
      completed: false,
      claimed: false
    },
    {
      id: `weekly-${weekKey}-total`,
      title: `Complete ${WEEKLY_GOALS.totalWorkouts} workouts`,
      description: 'Any sessions this week, games included.',
      period: 'weekly',
      kind: 'complete_workouts',
      rewardXp: WEEKLY_QUEST_XP.total,
      progress: 0,
      goal: WEEKLY_GOALS.totalWorkouts,
      completed: false,
      claimed: false
    }
  ];
};

export const createQuestCycle = (now: Date): QuestCycle => ({
  dayKey: getLocalDayKey(now),
  weekKey: getLocalWeekKey(now),
  streak: 0,
  lastActiveDay: null
});

// ---------------------------------------------------------------------------
// Quest progress, streak and the all-three bonus (used when a workout is logged)
// ---------------------------------------------------------------------------

export const isQuestDone = (quest: Quest) => quest.completed && quest.claimed;

/** What a daily quest costs if it is not done by midnight; null for weekly quests. */
export const describeQuestPenalty = (quest: Quest): string | null => {
  if (quest.period !== 'daily') {
    return null;
  }

  if (quest.kind === 'complete_workout_type' && quest.workoutType) {
    return `Miss it: ${getWorkoutDefinition(quest.workoutType).title.replace(
      ' Workout',
      ''
    )} ratings -${MISSED_QUEST_ATTRIBUTE_PENALTY}`;
  }

  if (quest.kind === 'complete_focus' && quest.attributeKey) {
    return `Miss it: ${ATTRIBUTE_NAME_BY_KEY[quest.attributeKey]} -${MISSED_QUEST_ATTRIBUTE_PENALTY}`;
  }

  if (quest.kind === 'complete_workouts') {
    return `Skip the day: -${MISSED_DAY_XP_PENALTY} XP`;
  }

  return null;
};

/** The streak as it stands today: it only counts if today or yesterday was active. */
export const getCurrentStreak = (cycle: QuestCycle | undefined, now: Date = new Date()) => {
  if (!cycle?.lastActiveDay) {
    return 0;
  }

  const today = getLocalDayKey(now);

  return cycle.lastActiveDay === today || cycle.lastActiveDay === addDays(today, -1)
    ? cycle.streak
    : 0;
};

export const getAllDailyBonusXp = (streak: number) =>
  ALL_DAILY_BONUS.base +
  ALL_DAILY_BONUS.perStreakDay * Math.min(Math.max(streak, 0), ALL_DAILY_BONUS.maxStreakDays);

/**
 * Called after a workout updated the quests: moves the streak forward on the
 * first daily quest of the day, and pays the bonus once all daily quests are done.
 */
export const applyDailyQuestOutcome = (
  cycle: QuestCycle,
  questsBefore: Quest[],
  questsAfter: Quest[],
  now: Date
) => {
  const today = getLocalDayKey(now);
  const dailyBefore = questsBefore.filter((quest) => quest.period === 'daily');
  const dailyAfter = questsAfter.filter((quest) => quest.period === 'daily');
  const doneBefore = dailyBefore.filter(isQuestDone).length;
  const doneAfter = dailyAfter.filter(isQuestDone).length;
  let nextCycle = cycle;

  if (doneAfter > 0 && cycle.lastActiveDay !== today) {
    const continues = cycle.lastActiveDay === addDays(today, -1);
    nextCycle = {
      ...cycle,
      streak: continues ? cycle.streak + 1 : 1,
      lastActiveDay: today
    };
  }

  const allDone =
    dailyAfter.length > 0 && doneAfter === dailyAfter.length && doneBefore < dailyAfter.length;

  return {
    cycle: nextCycle,
    bonusXp: allDone ? getAllDailyBonusXp(nextCycle.streak) : 0
  };
};

/** Whether a logged session moves a `complete_focus` quest. */
export const sessionMatchesFocusQuest = (
  quest: Quest,
  workoutType: WorkoutType,
  focus: readonly string[]
) =>
  quest.kind === 'complete_focus' &&
  quest.workoutType === workoutType &&
  Boolean(quest.focusId) &&
  focus.includes(quest.focusId as string);

// ---------------------------------------------------------------------------
// Rolling over to a new day or week (run on load, on a timer and before logging)
// ---------------------------------------------------------------------------

interface MissedDay {
  dayKey: string;
  quests: Quest[];
}

const formatDay = (dayKey: string) =>
  parseDayKey(dayKey).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const penalizeDay = (
  attributes: PlayerAttributes,
  totalXp: number,
  day: MissedDay
) => {
  const nextAttributes = { ...attributes };
  const losses: Partial<Record<AttributeKey, number>> = {};
  const lose = (key: AttributeKey) => {
    const before = nextAttributes[key];
    const after = clampAttribute(before - MISSED_QUEST_ATTRIBUTE_PENALTY);

    if (after < before) {
      nextAttributes[key] = after;
      losses[key] = (losses[key] ?? 0) + (before - after);
    }
  };

  day.quests
    .filter((quest) => quest.period === 'daily' && !isQuestDone(quest))
    .forEach((quest) => {
      if (quest.kind === 'complete_workout_type' && quest.workoutType) {
        getAreaAttributes(quest.workoutType).forEach(lose);
      }

      if (quest.kind === 'complete_focus' && quest.attributeKey) {
        lose(quest.attributeKey);
      }
    });

  const dailyQuests = day.quests.filter((quest) => quest.period === 'daily');
  const nothingDone = dailyQuests.length > 0 && !dailyQuests.some(isQuestDone);
  // An idle day costs XP, but never more than the progress inside the current
  // level, so a level is never taken away.
  const xpIntoLevel = getLevelInfo(totalXp).currentXp;
  const xpLost = nothingDone ? Math.min(MISSED_DAY_XP_PENALTY, xpIntoLevel) : 0;

  return {
    attributes: nextAttributes,
    totalXp: totalXp - xpLost,
    losses,
    xpLost,
    nothingDone
  };
};

let rolloverSequence = 0;

const activityId = (prefix: string) => {
  rolloverSequence += 1;

  return `${prefix}-${Date.now()}-${rolloverSequence}`;
};

/**
 * Brings quests up to date for `now`. Unfinished daily quests of past days are
 * settled (rating and XP penalties, streak reset), at most MAX_PENALIZED_DAYS of
 * them; then today's daily quests and this week's weekly quests are created.
 * Returns the same state object when nothing changed.
 */
export const refreshQuests = (state: ProgressState, now: Date = new Date()): ProgressState => {
  const today = getLocalDayKey(now);
  const thisWeek = getLocalWeekKey(now);
  const { player } = state;

  // Rows saved before rotating quests: start fresh today, nothing to settle.
  if (!state.questCycle) {
    return {
      ...state,
      quests: [
        ...buildDailyQuests(player, today),
        ...buildWeeklyQuests(player, thisWeek)
      ],
      questCycle: createQuestCycle(now)
    };
  }

  const cycle = state.questCycle;

  if (cycle.dayKey === today && cycle.weekKey === thisWeek) {
    return state;
  }

  // A clock that went backwards: keep what is there rather than punish.
  if (cycle.dayKey > today) {
    return state;
  }

  let attributes = player.attributes;
  let totalXp = player.totalXp;
  let streak = cycle.streak;
  const newActivities: ActivityLogItem[] = [];

  if (cycle.dayKey < today) {
    // Only the most recent missed days count after a long break. The stored
    // quests belong to cycle.dayKey; whole days after it had no app open, so
    // none of their (rebuilt) quests got done.
    const firstDay =
      cycle.dayKey < addDays(today, -MAX_PENALIZED_DAYS)
        ? addDays(today, -MAX_PENALIZED_DAYS)
        : cycle.dayKey;
    const missedDays: MissedDay[] = [];

    for (let day = firstDay; day < today; day = addDays(day, 1)) {
      missedDays.push({
        dayKey: day,
        quests: day === cycle.dayKey ? state.quests : buildDailyQuests(player, day)
      });
    }

    missedDays.forEach((day) => {
      const result = penalizeDay(attributes, totalXp, day);
      attributes = result.attributes;
      totalXp = result.totalXp;

      const lossText = (Object.entries(result.losses) as [AttributeKey, number][])
        .map(([key, amount]) => `${ATTRIBUTE_NAME_BY_KEY[key]} -${amount}`)
        .concat(result.xpLost > 0 ? [`-${result.xpLost} XP`] : [])
        .join(', ');

      if (lossText) {
        newActivities.push({
          id: activityId('activity-missed'),
          type: 'penalty',
          title: `Missed quests on ${formatDay(day.dayKey)}`,
          description: `${lossText}.`,
          createdAt: now.toISOString(),
          accentColor: colors.red
        });
      }
    });

    // The streak survives only if yesterday had a quest done.
    if (cycle.lastActiveDay !== addDays(today, -1)) {
      streak = 0;
    }
  }

  const keepWeekly = cycle.weekKey === thisWeek;
  const weeklyQuests = keepWeekly
    ? state.quests.filter((quest) => quest.period === 'weekly')
    : buildWeeklyQuests(player, thisWeek, attributes);
  const dailyQuests =
    cycle.dayKey === today
      ? state.quests.filter((quest) => quest.period === 'daily')
      : buildDailyQuests(player, today);

  return {
    ...state,
    player: { ...player, attributes, totalXp },
    quests: [...dailyQuests, ...weeklyQuests],
    // newest first, like the rest of the log
    activityLog: [...newActivities.reverse(), ...state.activityLog].slice(0, 40),
    questCycle: { ...cycle, dayKey: today, weekKey: thisWeek, streak }
  };
};
