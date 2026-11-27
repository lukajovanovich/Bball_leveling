import {
  ActivityLogItem,
  AttributeKey,
  PlayerAttributes,
  PlayerProfile,
  ProgressState,
  QuestCycle,
  TrainingSession
} from '../types';
import { createInitialQuests } from './quests';
import {
  buildDailyQuests,
  buildWeeklyQuests,
  createQuestCycle
} from '../lib/quests';
import { colors } from '../theme/theme';
import { ATTRIBUTE_CATEGORIES } from './attributes';
import { PLAYER_ARCHETYPES, PLAYER_POSITIONS } from './playerOptions';
import {
  createDefaultMeasurements,
  inferLengthUnit,
  inferWeightUnit,
  normalizeLengthUnit,
  normalizeWeightUnit,
  parseLengthMeasurement,
  parseWeightMeasurement
} from '../lib/measurements';
import { clampAttribute } from '../lib/progression';

export interface NewPlayerProfileInput {
  name: string;
  heightCm: number;
  heightUnit: PlayerProfile['heightUnit'];
  wingspanCm: number;
  wingspanUnit: PlayerProfile['wingspanUnit'];
  weightKg: number;
  weightUnit: PlayerProfile['weightUnit'];
  position: string;
  mainGoal: string;
  archetype: string;
}

type LegacyPlayerProfile = Partial<PlayerProfile> & {
  height?: string;
  wingspan?: string;
  weight?: string;
  heightUnit?: string;
  wingspanUnit?: string;
  weightUnit?: string;
};

const createAttributeRecord = (
  initialValue: number
): PlayerAttributes =>
  ATTRIBUTE_CATEGORIES.reduce((attributes, category) => {
    category.attributes.forEach((attribute) => {
      attributes[attribute.key] = initialValue;
    });

    return attributes;
  }, {} as Record<AttributeKey, number>);

export const createZeroAttributes = () => createAttributeRecord(0);

const normalizeAttributes = (
  attributes?: Partial<Record<AttributeKey, number>>
): PlayerAttributes => {
  const normalizedAttributes = createZeroAttributes();

  if (!attributes) {
    return normalizedAttributes;
  }

  (Object.keys(normalizedAttributes) as AttributeKey[]).forEach((attributeKey) => {
    const value = attributes[attributeKey];

    if (typeof value === 'number' && Number.isFinite(value)) {
      normalizedAttributes[attributeKey] = clampAttribute(value);
    }
  });

  // Fadeaway was added after players already had ratings. Starting old players
  // at 0 would drop their Shooting average and OVR overnight, so a missing
  // fadeaway starts at the average of their other two jump shots instead.
  if (typeof attributes.fadeaway !== 'number' || !Number.isFinite(attributes.fadeaway)) {
    normalizedAttributes.fadeaway = clampAttribute(
      (normalizedAttributes.midRangeShot + normalizedAttributes.threePointShot) / 2
    );
  }

  return normalizedAttributes;
};

export const normalizePlayerProfile = (
  input?: LegacyPlayerProfile | null
): PlayerProfile => {
  const player: LegacyPlayerProfile = input ?? {};
  const defaultMeasurements = createDefaultMeasurements();
  const legacyHeight =
    typeof player.height === 'string' ? player.height : undefined;
  const legacyWingspan =
    typeof player.wingspan === 'string' ? player.wingspan : undefined;
  const legacyWeight =
    typeof player.weight === 'string' ? player.weight : undefined;
  const heightCm =
    typeof player.heightCm === 'number' && Number.isFinite(player.heightCm)
      ? player.heightCm
      : parseLengthMeasurement(legacyHeight, defaultMeasurements.heightCm);
  const heightUnit = normalizeLengthUnit(
    typeof player.heightUnit === 'string'
      ? player.heightUnit
      : inferLengthUnit(legacyHeight)
  );
  const wingspanCm =
    typeof player.wingspanCm === 'number' && Number.isFinite(player.wingspanCm)
      ? player.wingspanCm
      : parseLengthMeasurement(
          legacyWingspan,
          Math.max(heightCm, defaultMeasurements.wingspanCm)
        );
  const wingspanUnit = normalizeLengthUnit(
    typeof player.wingspanUnit === 'string'
      ? player.wingspanUnit
      : inferLengthUnit(legacyWingspan ?? legacyHeight)
  );
  const weightKg =
    typeof player.weightKg === 'number' && Number.isFinite(player.weightKg)
      ? player.weightKg
      : parseWeightMeasurement(legacyWeight, defaultMeasurements.weightKg);
  const weightUnit = normalizeWeightUnit(
    typeof player.weightUnit === 'string'
      ? player.weightUnit
      : inferWeightUnit(legacyWeight)
  );

  return {
    id: player.id?.trim() || `player-${Date.now()}`,
    name: player.name?.trim() || 'MyPlayer',
    heightCm,
    heightUnit,
    wingspanCm,
    wingspanUnit,
    weightKg,
    weightUnit,
    position: player.position?.trim() || PLAYER_POSITIONS[0],
    mainGoal: player.mainGoal?.trim() || 'Build my player from the ground up',
    archetype: player.archetype?.trim() || PLAYER_ARCHETYPES[0],
    totalXp:
      typeof player.totalXp === 'number' && Number.isFinite(player.totalXp)
        ? Math.max(0, player.totalXp)
        : 0,
    attributes: normalizeAttributes(player.attributes)
  };
};

export const samplePlayer: PlayerProfile = normalizePlayerProfile({
  id: 'player-1',
  name: 'Jalen Novak',
  heightCm: 190.5,
  heightUnit: 'in',
  wingspanCm: 198.12,
  wingspanUnit: 'in',
  weightKg: 88.45,
  weightUnit: 'lb',
  position: 'Shooting Guard',
  mainGoal: 'Become a reliable two-way shot creator',
  archetype: 'Shot-Creating Guard',
  totalXp: 840,
  attributes: {
    closeShot: 68,
    drivingLayup: 72,
    drivingDunk: 59,
    standingDunk: 45,
    postControl: 52,
    midRangeShot: 70,
    threePointShot: 66,
    freeThrow: 74,
    fadeaway: 68,
    passAccuracy: 63,
    ballHandle: 71,
    speedWithBall: 68,
    interiorDefense: 48,
    perimeterDefense: 64,
    steal: 58,
    block: 44,
    offensiveRebound: 42,
    defensiveRebound: 55,
    speed: 73,
    acceleration: 71,
    strength: 57,
    vertical: 65,
    stamina: 69
  }
});

export const buildNewPlayerProfile = ({
  name,
  heightCm,
  heightUnit,
  wingspanCm,
  wingspanUnit,
  weightKg,
  weightUnit,
  position,
  mainGoal,
  archetype
}: NewPlayerProfileInput): PlayerProfile =>
  normalizePlayerProfile({
    id: `player-${Date.now()}`,
    name: name.trim(),
    heightCm,
    heightUnit,
    wingspanCm,
    wingspanUnit,
    weightKg,
    weightUnit,
    position: position.trim(),
    mainGoal: mainGoal.trim(),
    archetype: archetype.trim(),
    totalXp: 0,
    attributes: createZeroAttributes()
  });

export const initialActivityLog: ActivityLogItem[] = [
  {
    id: 'activity-seed-1',
    type: 'workout',
    title: 'Shooting Workout logged',
    description: '+120 XP and better touch from mid-range.',
    createdAt: '2026-04-22T18:30:00.000Z',
    accentColor: colors.green
  },
  {
    id: 'activity-seed-2',
    type: 'attribute',
    title: 'Ball Handle improved',
    description: 'Control is trending toward the next badge tier.',
    createdAt: '2026-04-21T17:15:00.000Z',
    accentColor: colors.orange
  },
  {
    id: 'activity-seed-3',
    type: 'quest',
    title: 'Daily quest completed',
    description: 'Workout streak XP added to your build.',
    createdAt: '2026-04-20T19:10:00.000Z',
    accentColor: colors.gold
  }
];

const createNewPlayerActivityLog = (playerName: string): ActivityLogItem[] => [
  {
    id: `activity-new-player-${Date.now()}`,
    type: 'attribute',
    title: 'New MyPlayer created',
    description: `${playerName} starts from 0 in every attribute. Train to climb toward 99.`,
    createdAt: new Date().toISOString(),
    accentColor: colors.blue
  }
];

export const createProgressStateFromPlayer = (
  player: PlayerProfile,
  now: Date = new Date()
): ProgressState => {
  const normalizedPlayer = normalizePlayerProfile(player);
  const questCycle = createQuestCycle(now);

  return {
    player: normalizedPlayer,
    quests: [
      ...buildDailyQuests(normalizedPlayer, questCycle.dayKey),
      ...buildWeeklyQuests(normalizedPlayer, questCycle.weekKey)
    ],
    trainingSessions: [],
    activityLog: createNewPlayerActivityLog(normalizedPlayer.name),
    lastLevelUp: null,
    questCycle
  };
};

const isDayKey = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

// A cycle that is not readable is dropped; the next quest refresh then starts
// a fresh one without settling (punishing) anything.
const normalizeQuestCycle = (cycle: unknown): QuestCycle | undefined => {
  const value = cycle as Partial<QuestCycle> | null | undefined;

  if (!value || !isDayKey(value.dayKey) || !isDayKey(value.weekKey)) {
    return undefined;
  }

  return {
    dayKey: value.dayKey,
    weekKey: value.weekKey,
    streak:
      typeof value.streak === 'number' && Number.isFinite(value.streak)
        ? Math.max(0, Math.floor(value.streak))
        : 0,
    lastActiveDay: isDayKey(value.lastActiveDay) ? value.lastActiveDay : null
  };
};

// Sessions saved before focus areas existed have no `focus`; that still means
// a general session. A focus that is not a list of ids is dropped.
const normalizeTrainingSession = (session: TrainingSession): TrainingSession => {
  if (session?.focus === undefined) {
    return session;
  }

  const { focus, ...rest } = session;
  const ids = Array.isArray(focus)
    ? focus.filter((id): id is string => typeof id === 'string')
    : [];

  return ids.length > 0 ? { ...rest, focus: ids } : rest;
};

// Rows saved by older versions of the app (or edited by hand) can be missing
// whole sections, so every part of the state is rebuilt with safe defaults.
export const normalizeProgressState = (
  state?: Partial<ProgressState> | null
): ProgressState => {
  const player = normalizePlayerProfile(state?.player);

  return {
    ...state,
    player,
    quests: Array.isArray(state?.quests)
      ? state.quests
      : createInitialQuests(player.attributes),
    trainingSessions: Array.isArray(state?.trainingSessions)
      ? state.trainingSessions
          // A broken entry would crash the daily limit check on Train.
          .filter((session) => Boolean(session) && typeof session === 'object')
          .map(normalizeTrainingSession)
      : [],
    activityLog: Array.isArray(state?.activityLog) ? state.activityLog : [],
    lastLevelUp: state?.lastLevelUp ?? null,
    questCycle: normalizeQuestCycle(state?.questCycle)
  };
};

// The guest sample keeps its fixed showcase quests for today; they rotate
// like everyone else's from the next day on.
export const createInitialProgressState = (now: Date = new Date()): ProgressState => ({
  player: samplePlayer,
  quests: createInitialQuests(samplePlayer.attributes),
  trainingSessions: [],
  activityLog: initialActivityLog,
  lastLevelUp: null,
  questCycle: createQuestCycle(now)
});
