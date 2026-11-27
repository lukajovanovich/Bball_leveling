export type AttributeCategoryId =
  | 'finishing'
  | 'shooting'
  | 'playmaking'
  | 'defense'
  | 'rebounding'
  | 'physical';

export type AttributeKey =
  | 'closeShot'
  | 'drivingLayup'
  | 'drivingDunk'
  | 'standingDunk'
  | 'postControl'
  | 'midRangeShot'
  | 'threePointShot'
  | 'freeThrow'
  | 'fadeaway'
  | 'passAccuracy'
  | 'ballHandle'
  | 'speedWithBall'
  | 'interiorDefense'
  | 'perimeterDefense'
  | 'steal'
  | 'block'
  | 'offensiveRebound'
  | 'defensiveRebound'
  | 'speed'
  | 'acceleration'
  | 'strength'
  | 'vertical'
  | 'stamina';

export interface AttributeDefinition {
  key: AttributeKey;
  name: string;
}

export interface AttributeCategory {
  id: AttributeCategoryId;
  title: string;
  color: string;
  attributes: AttributeDefinition[];
}

export type PlayerAttributes = Record<AttributeKey, number>;

export type LengthUnit = 'cm' | 'in';

export type WeightUnit = 'kg' | 'lb';

export interface PlayerProfile {
  id: string;
  name: string;
  heightCm: number;
  heightUnit: LengthUnit;
  wingspanCm: number;
  wingspanUnit: LengthUnit;
  weightKg: number;
  weightUnit: WeightUnit;
  position: string;
  mainGoal: string;
  archetype: string;
  totalXp: number;
  attributes: PlayerAttributes;
}

export type WorkoutType =
  | 'shooting'
  | 'ballHandling'
  | 'finishing'
  | 'defense'
  | 'rebounding'
  | 'athletic'
  | 'strength'
  | 'game';

export type WorkoutIntensity = 'light' | 'medium' | 'hard';

export interface WorkoutEffect {
  attribute: AttributeKey;
  weight: number;
}

/** One thing a player can say they worked on inside a workout, e.g. three-pointers. */
export interface WorkoutFocusOption {
  id: string;
  label: string;
  /** Attributes this focus trains; always a subset of the workout's effects. */
  effects: WorkoutEffect[];
}

export interface WorkoutDefinition {
  type: WorkoutType;
  title: string;
  description: string;
  accentColor: string;
  icon: string;
  effects: WorkoutEffect[];
  /** Empty when the workout has nothing to narrow down (a game). */
  focusOptions: WorkoutFocusOption[];
  /**
   * When set, the session does not use effect weights: it hands out this many
   * +1 gains spread over every category (see calculateWorkoutResult).
   */
  spreadGains?: Record<WorkoutIntensity, number>;
}

export interface TrainingSession {
  id: string;
  workoutType: WorkoutType;
  intensity: WorkoutIntensity;
  xpGained: number;
  questXpGained: number;
  attributeGains: Partial<Record<AttributeKey, number>>;
  completedAt: string;
  /** Focus option ids picked for this session; missing or empty = general session. */
  focus?: string[];
}

export type QuestPeriod = 'daily' | 'weekly';

export type QuestKind =
  | 'complete_workouts'
  | 'complete_workout_type'
  | 'reach_attribute'
  | 'improve_attribute'
  /** A session of `workoutType` whose focus includes `focusId`. */
  | 'complete_focus';

export interface Quest {
  id: string;
  title: string;
  description: string;
  period: QuestPeriod;
  kind: QuestKind;
  rewardXp: number;
  progress: number;
  goal: number;
  completed: boolean;
  claimed: boolean;
  workoutType?: WorkoutType;
  attributeKey?: AttributeKey;
  focusId?: string;
}

/** Which day and week the current quests belong to, and the daily streak. */
export interface QuestCycle {
  /** Local day of the daily quests, "YYYY-MM-DD". */
  dayKey: string;
  /** Local Monday of the weekly quests, "YYYY-MM-DD". */
  weekKey: string;
  /** Days in a row with at least one daily quest done. */
  streak: number;
  /** Last day a daily quest was done, or null. */
  lastActiveDay: string | null;
}

export type ActivityLogType = 'workout' | 'quest' | 'attribute' | 'level' | 'penalty';

export interface ActivityLogItem {
  id: string;
  type: ActivityLogType;
  title: string;
  description: string;
  createdAt: string;
  accentColor: string;
}

export interface LevelUpFeedback {
  previousLevel: number;
  level: number;
}

export interface ProgressState {
  player: PlayerProfile;
  quests: Quest[];
  trainingSessions: TrainingSession[];
  activityLog: ActivityLogItem[];
  lastLevelUp: LevelUpFeedback | null;
  /** Missing on rows saved before rotating quests; set up on the next load. */
  questCycle?: QuestCycle;
}

export interface ProgressUpdate {
  state: ProgressState;
  session: TrainingSession;
  workoutXpGained: number;
  questXpGained: number;
  attributeGains: Partial<Record<AttributeKey, number>>;
  completedQuests: Quest[];
  levelUp: LevelUpFeedback | null;
}
