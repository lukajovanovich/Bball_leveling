import { ATTRIBUTE_CATEGORIES, ATTRIBUTE_NAME_BY_KEY } from '../data/attributes';
import { WORKOUTS } from '../data/workouts';
import {
  AttributeCategory,
  AttributeKey,
  LevelUpFeedback,
  PlayerAttributes,
  ProgressState,
  ProgressUpdate,
  Quest,
  TrainingSession,
  WorkoutDefinition,
  WorkoutEffect,
  WorkoutIntensity,
  WorkoutType
} from '../types';
import { colors } from '../theme/theme';

export const ATTRIBUTE_MIN = 0;
export const ATTRIBUTE_MAX = 99;

export const INTENSITY_CONFIG: Record<
  WorkoutIntensity,
  { label: string; xp: number; gainBase: number; description: string }
> = {
  light: {
    label: 'Light',
    xp: 70,
    gainBase: 1,
    description: 'Skill touch-up'
  },
  medium: {
    label: 'Medium',
    xp: 120,
    gainBase: 2,
    description: 'Balanced work'
  },
  hard: {
    label: 'Hard',
    xp: 190,
    gainBase: 3,
    description: 'Max effort'
  }
};

let idSequence = 0;

// Date.now() alone repeats when two items are created in the same millisecond,
// which would give React duplicate list keys.
const createId = (prefix: string) => {
  idSequence += 1;

  return `${prefix}-${Date.now()}-${idSequence}`;
};

export const getWorkoutDefinition = (type: WorkoutType) => {
  const workout = WORKOUTS.find((item) => item.type === type);

  if (!workout) {
    throw new Error(`Unknown workout type: ${type}`);
  }

  return workout;
};

export const clampAttribute = (value: number) =>
  Math.max(ATTRIBUTE_MIN, Math.min(ATTRIBUTE_MAX, Math.round(value)));

export const getXpNeededForLevel = (level: number) => 180 + level * 70;

export const getLevelInfo = (totalXp: number) => {
  let level = 1;
  let remainingXp = Math.max(0, totalXp);
  let xpForNext = getXpNeededForLevel(level);

  while (remainingXp >= xpForNext) {
    remainingXp -= xpForNext;
    level += 1;
    xpForNext = getXpNeededForLevel(level);
  }

  return {
    level,
    currentXp: remainingXp,
    xpForNext,
    progress: xpForNext === 0 ? 0 : remainingXp / xpForNext
  };
};

export const getCategoryAverage = (
  attributes: PlayerAttributes,
  category: AttributeCategory
) => {
  const total = category.attributes.reduce(
    (sum, attribute) => sum + attributes[attribute.key],
    0
  );

  return Math.round(total / category.attributes.length);
};

export const calculateOvr = (attributes: PlayerAttributes) => {
  const categoryAverages = ATTRIBUTE_CATEGORIES.reduce(
    (averages, category) => {
      averages[category.id] = getCategoryAverage(attributes, category);
      return averages;
    },
    {} as Record<string, number>
  );

  const weighted =
    categoryAverages.finishing * 0.17 +
    categoryAverages.shooting * 0.22 +
    categoryAverages.playmaking * 0.2 +
    categoryAverages.defense * 0.17 +
    categoryAverages.rebounding * 0.07 +
    categoryAverages.physical * 0.17;

  const topSkillAverage =
    Object.values(attributes)
      .sort((a, b) => b - a)
      .slice(0, 5)
      .reduce((sum, value) => sum + value, 0) / 5;

  return clampAttribute(weighted * 0.94 + topSkillAverage * 0.06);
};

type AttributeGains = Partial<Record<AttributeKey, number>>;

// Focused sessions put more into each picked rating than a general session
// would (x1.5 per point of weight), but never more in total: see
// calculateWorkoutResult.
export const FOCUS_GAIN_MULTIPLIER = 1.5;

// Ratings get harder to raise near the top: -1 from 80, at most +1 from 88,
// and never past 99.
const limitGain = (gain: number, currentValue: number) => {
  let limited = gain;

  if (currentValue >= 88) {
    limited = Math.min(limited, 1);
  } else if (currentValue >= 80) {
    limited = Math.max(1, limited - 1);
  }

  return Math.min(limited, Math.max(0, ATTRIBUTE_MAX - currentValue));
};

const weightedGains = (
  effects: readonly WorkoutEffect[],
  gainBase: number,
  attributes: PlayerAttributes
) => {
  const gains: AttributeGains = {};

  effects.forEach((effect) => {
    const gain = limitGain(
      Math.max(1, Math.floor(gainBase * effect.weight)),
      attributes[effect.attribute]
    );

    if (gain > 0) {
      gains[effect.attribute] = gain;
    }
  });

  return gains;
};

const sumGains = (gains: AttributeGains) =>
  Object.values(gains).reduce((sum, gain) => sum + (gain ?? 0), 0);

/** Keeps only focus ids the workout defines, once each, in definition order. */
export const normalizeWorkoutFocus = (
  workout: WorkoutDefinition,
  focus: readonly string[] | undefined
) =>
  workout.focusOptions
    .filter((option) => focus?.includes(option.id))
    .map((option) => option.id);

// Several picked focus options can train the same rating; the strongest
// weight wins so picking more options never stacks the same attribute.
const combineFocusEffects = (workout: WorkoutDefinition, focus: readonly string[]) => {
  const weights = new Map<AttributeKey, number>();

  workout.focusOptions
    .filter((option) => focus.includes(option.id))
    .forEach((option) => {
      option.effects.forEach((effect) => {
        weights.set(
          effect.attribute,
          Math.max(weights.get(effect.attribute) ?? 0, effect.weight)
        );
      });
    });

  return Array.from(weights, ([attribute, weight]) => ({ attribute, weight }));
};

// Takes points away, one at a time, from the biggest gain (ties: the lowest
// weight) until the session total fits the budget. No gain drops below 1.
const trimToBudget = (
  gains: AttributeGains,
  effects: readonly WorkoutEffect[],
  budget: number
) => {
  const trimmed = { ...gains };
  let total = sumGains(trimmed);

  while (total > budget) {
    let pick: WorkoutEffect | undefined;

    for (const effect of effects) {
      const gain = trimmed[effect.attribute] ?? 0;
      const pickGain = pick ? trimmed[pick.attribute] ?? 0 : 0;

      if (
        gain > 1 &&
        (gain > pickGain || (pick && gain === pickGain && effect.weight < pick.weight))
      ) {
        pick = effect;
      }
    }

    if (!pick) {
      break;
    }

    trimmed[pick.attribute] = (trimmed[pick.attribute] ?? 0) - 1;
    total -= 1;
  }

  return trimmed;
};

// A game: one +1 to the lowest rating of every category, then the remaining
// points to the lowest ratings overall. Each rating moves at most +1.
const spreadGains = (count: number, attributes: PlayerAttributes) => {
  const gains: AttributeGains = {};
  const canGrow = (key: AttributeKey) =>
    gains[key] === undefined && limitGain(1, attributes[key]) > 0;
  const lowest = (keys: AttributeKey[]) =>
    keys
      .filter(canGrow)
      .reduce<AttributeKey | null>(
        (best, key) => (best === null || attributes[key] < attributes[best] ? key : best),
        null
      );
  let left = count;

  ATTRIBUTE_CATEGORIES.forEach((category) => {
    const key = lowest(category.attributes.map((attribute) => attribute.key));

    if (key && left > 0) {
      gains[key] = 1;
      left -= 1;
    }
  });

  const allKeys = ATTRIBUTE_CATEGORIES.flatMap((category) =>
    category.attributes.map((attribute) => attribute.key)
  );

  while (left > 0) {
    const key = lowest(allKeys);

    if (!key) {
      break;
    }

    gains[key] = 1;
    left -= 1;
  }

  return gains;
};

/**
 * With no focus picked, every attribute in the workout gets
 * max(1, floor(gainBase x weight)). With focus picked, only the focus
 * attributes move, at max(1, floor(gainBase x 1.5 x focus weight)), trimmed so
 * the total never exceeds what the general session would give this player.
 */
export const calculateWorkoutResult = (
  type: WorkoutType,
  intensity: WorkoutIntensity,
  attributes: PlayerAttributes,
  focus: readonly string[] = []
) => {
  const workout = getWorkoutDefinition(type);
  const config = INTENSITY_CONFIG[intensity];

  if (workout.spreadGains) {
    return {
      xpGained: config.xp,
      attributeGains: spreadGains(workout.spreadGains[intensity], attributes)
    };
  }

  const generalGains = weightedGains(workout.effects, config.gainBase, attributes);
  const pickedFocus = normalizeWorkoutFocus(workout, focus);

  if (pickedFocus.length === 0) {
    return { xpGained: config.xp, attributeGains: generalGains };
  }

  const focusEffects = combineFocusEffects(workout, pickedFocus);
  const focusGains = weightedGains(
    focusEffects,
    config.gainBase * FOCUS_GAIN_MULTIPLIER,
    attributes
  );

  return {
    xpGained: config.xp,
    attributeGains: trimToBudget(focusGains, focusEffects, sumGains(generalGains))
  };
};

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

const focusLabels = (type: WorkoutType, focus: readonly string[] | undefined) =>
  getWorkoutDefinition(type)
    .focusOptions.filter((option) => focus?.includes(option.id))
    .map((option) => option.label);

/** "Three-pointers, off the dribble / fadeaways", or '' for a general session. */
export const describeWorkoutFocus = (
  type: WorkoutType,
  focus: readonly string[] | undefined
) =>
  focusLabels(type, focus)
    .map((label, index) => (index === 0 ? label : lowerFirst(label)))
    .join(', ');

/** "Shooting Workout: three-pointers, free throws", or just the title with no focus. */
export const formatWorkoutName = (
  type: WorkoutType,
  focus: readonly string[] | undefined
) => {
  const title = getWorkoutDefinition(type).title;
  const labels = focusLabels(type, focus).map(lowerFirst);

  return labels.length > 0 ? `${title}: ${labels.join(', ')}` : title;
};

const applyAttributeGains = (
  attributes: PlayerAttributes,
  gains: Partial<Record<AttributeKey, number>>
) => {
  const nextAttributes = { ...attributes };

  Object.entries(gains).forEach(([key, gain]) => {
    nextAttributes[key as AttributeKey] = clampAttribute(
      nextAttributes[key as AttributeKey] + gain
    );
  });

  return nextAttributes;
};

const updateQuestProgress = (
  quest: Quest,
  workoutType: WorkoutType,
  nextAttributes: PlayerAttributes,
  gains: Partial<Record<AttributeKey, number>>
) => {
  if (quest.completed && quest.claimed) {
    return quest;
  }

  let progress = quest.progress;

  if (quest.kind === 'complete_workouts') {
    progress += 1;
  }

  if (quest.kind === 'complete_workout_type' && quest.workoutType === workoutType) {
    progress += 1;
  }

  if (quest.kind === 'reach_attribute' && quest.attributeKey) {
    progress = nextAttributes[quest.attributeKey];
  }

  if (quest.kind === 'improve_attribute' && quest.attributeKey) {
    progress += gains[quest.attributeKey] ?? 0;
  }

  const completed = progress >= quest.goal;

  return {
    ...quest,
    progress: Math.min(progress, quest.goal),
    completed
  };
};

const describeGains = (gains: Partial<Record<AttributeKey, number>>) => {
  const entries = Object.entries(gains) as [AttributeKey, number][];

  if (entries.length === 0) {
    return 'No attributes changed because the focused ratings are already capped.';
  }

  return entries
    .slice(0, 3)
    .map(([key, gain]) => `${ATTRIBUTE_NAME_BY_KEY[key]} +${gain}`)
    .join(', ');
};

export const applyWorkoutToProgress = (
  state: ProgressState,
  workoutType: WorkoutType,
  intensity: WorkoutIntensity,
  focus: readonly string[] = []
): ProgressUpdate => {
  const workout = getWorkoutDefinition(workoutType);
  const pickedFocus = normalizeWorkoutFocus(workout, focus);
  const beforeLevel = getLevelInfo(state.player.totalXp).level;
  const result = calculateWorkoutResult(
    workoutType,
    intensity,
    state.player.attributes,
    pickedFocus
  );
  const nextAttributes = applyAttributeGains(
    state.player.attributes,
    result.attributeGains
  );

  let questXpGained = 0;
  const completedQuests: Quest[] = [];

  const quests = state.quests.map((quest) => {
    const updatedQuest = updateQuestProgress(
      quest,
      workoutType,
      nextAttributes,
      result.attributeGains
    );

    // Also covers quests that were already complete when they were created
    // (e.g. a rating that started above the goal) and so were never paid out.
    if (updatedQuest.completed && !updatedQuest.claimed) {
      questXpGained += updatedQuest.rewardXp;
      completedQuests.push({ ...updatedQuest, claimed: true });
      return { ...updatedQuest, claimed: true };
    }

    return updatedQuest;
  });

  const totalXpGained = result.xpGained + questXpGained;
  const nextTotalXp = state.player.totalXp + totalXpGained;
  const afterLevel = getLevelInfo(nextTotalXp).level;
  const levelUp: LevelUpFeedback | null =
    afterLevel > beforeLevel
      ? {
          previousLevel: beforeLevel,
          level: afterLevel
        }
      : null;

  const completedAt = new Date().toISOString();
  const session: TrainingSession = {
    id: createId('session'),
    workoutType,
    intensity,
    xpGained: result.xpGained,
    questXpGained,
    attributeGains: result.attributeGains,
    completedAt,
    // Left out for a general session so those rows look the same as before.
    ...(pickedFocus.length > 0 ? { focus: pickedFocus } : {})
  };

  const questActivity = completedQuests.map((quest) => ({
    id: createId(`activity-${quest.id}`),
    type: 'quest' as const,
    title: `${quest.period === 'daily' ? 'Daily' : 'Weekly'} quest completed`,
    description: `${quest.title} paid out +${quest.rewardXp} XP.`,
    createdAt: completedAt,
    accentColor: colors.gold
  }));

  const newActivities = [
    ...(levelUp
      ? [
          {
            id: createId('activity-level'),
            type: 'level' as const,
            title: `Level ${levelUp.level} reached`,
            description: `Your build climbed from Level ${levelUp.previousLevel}.`,
            createdAt: completedAt,
            accentColor: colors.gold
          }
        ]
      : []),
    ...questActivity,
    {
      id: createId('activity-attribute'),
      type: 'attribute' as const,
      title: 'Attributes improved',
      description: describeGains(result.attributeGains),
      createdAt: completedAt,
      accentColor: workout.accentColor
    },
    {
      id: createId('activity-workout'),
      type: 'workout' as const,
      title: `${workout.title} completed`,
      description: `${
        pickedFocus.length > 0 ? `${describeWorkoutFocus(workoutType, pickedFocus)}. ` : ''
      }${INTENSITY_CONFIG[intensity].label} session earned +${result.xpGained} XP.`,
      createdAt: completedAt,
      accentColor: workout.accentColor
    }
  ];

  const nextState: ProgressState = {
    ...state,
    player: {
      ...state.player,
      attributes: nextAttributes,
      totalXp: nextTotalXp
    },
    quests,
    trainingSessions: [session, ...state.trainingSessions].slice(0, 30),
    activityLog: [...newActivities, ...state.activityLog].slice(0, 40),
    lastLevelUp: levelUp
  };

  return {
    state: nextState,
    session,
    workoutXpGained: result.xpGained,
    questXpGained,
    attributeGains: result.attributeGains,
    completedQuests,
    levelUp
  };
};

// Free plan: each workout type once per day, plus this many repeats of any type.
export const DAILY_BONUS_WORKOUTS = 1;

/** The player's local calendar day, e.g. "2026-11-26"; limits reset at local midnight. */
export const getLocalDayKey = (date: Date) => {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
};

export interface DailyWorkoutStatus {
  /** Workout types already logged today. */
  loggedTypes: WorkoutType[];
  sessionsToday: number;
  bonusLeft: number;
}

export const getDailyWorkoutStatus = (
  sessions: readonly TrainingSession[],
  now: Date = new Date()
): DailyWorkoutStatus => {
  const today = getLocalDayKey(now);
  const todaysSessions = sessions.filter((session) => {
    const completedAt = new Date(session.completedAt);

    return (
      !Number.isNaN(completedAt.getTime()) && getLocalDayKey(completedAt) === today
    );
  });
  const loggedTypes = Array.from(
    new Set(todaysSessions.map((session) => session.workoutType))
  );
  // Every session past the first of its type used up a bonus.
  const bonusUsed = todaysSessions.length - loggedTypes.length;

  return {
    loggedTypes,
    sessionsToday: todaysSessions.length,
    bonusLeft: Math.max(0, DAILY_BONUS_WORKOUTS - bonusUsed)
  };
};

export type WorkoutAvailability = 'available' | 'bonus' | 'locked';

/**
 * 'available': first time this type is logged today.
 * 'bonus': already logged today, but a bonus repeat is left.
 * 'locked': already logged today and the bonus is used up.
 */
export const getWorkoutAvailability = (
  status: DailyWorkoutStatus,
  workoutType: WorkoutType
): WorkoutAvailability => {
  if (!status.loggedTypes.includes(workoutType)) {
    return 'available';
  }

  return status.bonusLeft > 0 ? 'bonus' : 'locked';
};

export const getQuestProgressLabel = (quest: Quest) => {
  if (quest.kind === 'reach_attribute' && quest.attributeKey) {
    return `${Math.round(quest.progress)} / ${quest.goal}`;
  }

  return `${Math.round(quest.progress)} / ${quest.goal}`;
};
