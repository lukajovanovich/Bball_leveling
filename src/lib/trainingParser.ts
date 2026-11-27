import { WORKOUTS } from '../data/workouts';
import { WorkoutIntensity, WorkoutType } from '../types';
import { normalizeWorkoutFocus } from './progression';

/** One workout read out of the player's own words, before they confirm it. */
export interface ParsedWorkout {
  workoutType: WorkoutType;
  intensity: WorkoutIntensity;
  focus: string[];
  /** Short reason in the player's terms, e.g. "100 mid-range and 50 threes". */
  note: string;
}

export interface TrainingCatalogEntry {
  type: WorkoutType;
  title: string;
  description: string;
  focus: { id: string; label: string }[];
}

const INTENSITIES: WorkoutIntensity[] = ['light', 'medium', 'hard'];

/** What the AI may choose from; sent with every request so the server stays in sync. */
export const buildTrainingCatalog = (): TrainingCatalogEntry[] =>
  WORKOUTS.map((workout) => ({
    type: workout.type,
    title: workout.title,
    description: workout.description,
    focus: workout.focusOptions.map((option) => ({ id: option.id, label: option.label }))
  }));

/** Longest text the player can send; the server enforces the same limit. */
export const MAX_TRAINING_TEXT_LENGTH = 1500;

/**
 * Keeps only entries the game understands: a known workout type, a known
 * intensity (medium when unclear), focus ids of that workout, one entry per
 * type. Whatever the AI returns goes through here before the player sees it.
 */
export const validateParsedWorkouts = (raw: unknown): ParsedWorkout[] => {
  const list = Array.isArray(raw) ? raw : [];
  const seen = new Set<WorkoutType>();
  const result: ParsedWorkout[] = [];

  list.forEach((item) => {
    const entry = item as Partial<Record<keyof ParsedWorkout, unknown>> | null;
    const workout = WORKOUTS.find((candidate) => candidate.type === entry?.workoutType);

    if (!workout || seen.has(workout.type)) {
      return;
    }

    seen.add(workout.type);
    result.push({
      workoutType: workout.type,
      intensity: INTENSITIES.includes(entry?.intensity as WorkoutIntensity)
        ? (entry?.intensity as WorkoutIntensity)
        : 'medium',
      focus: normalizeWorkoutFocus(
        workout,
        Array.isArray(entry?.focus)
          ? entry.focus.filter((id): id is string => typeof id === 'string')
          : []
      ),
      note: typeof entry?.note === 'string' ? entry.note.slice(0, 140) : ''
    });
  });

  return result;
};

// ---------------------------------------------------------------------------
// Demo reading, used only while the AI is not set up on the server. It looks
// for plain keywords, so it is deliberately simple and labelled as a demo.
// ---------------------------------------------------------------------------

const KEYWORDS: { type: WorkoutType; words: RegExp; focus?: { id: string; words: RegExp }[] }[] = [
  {
    type: 'shooting',
    words: /shoot|shot|three|3s|3[\s-]?p(oin)?t|mid-?range|free throw|jumper|fade|sut|šut|trojk|poludistan/i,
    focus: [
      { id: 'midRange', words: /mid-?range|poludistan/i },
      { id: 'threePointers', words: /three|3s|3[\s-]?p(oin)?t|trojk/i },
      { id: 'freeThrows', words: /free throw|slobodn/i },
      { id: 'offDribble', words: /fade|off the dribble|pull-?up|iz pokreta/i }
    ]
  },
  { type: 'ballHandling', words: /handl|dribbl|crossover|pass|driblin|pas/i },
  { type: 'finishing', words: /layup|dunk|finish|post|zakucav|polaga/i },
  {
    type: 'defense',
    words: /defen|odbran/i,
    focus: [{ id: 'perimeter', words: /perimeter|on-?ball|perimetar/i }]
  },
  { type: 'rebounding', words: /rebound|board|skok/i },
  { type: 'athletic', words: /sprint|jump|vertical|agility|condition|kondicij|trc/i },
  { type: 'strength', words: /gym|lift|squat|weights|strength|teretan|snag/i },
  { type: 'game', words: /game|pickup|scrimmage|3x3|5x5|played|basket|utakmic|odigra/i }
];

export const demoParseTraining = (text: string): ParsedWorkout[] => {
  const intensity: WorkoutIntensity = /hard|intense|tough|tesk|jak/i.test(text)
    ? 'hard'
    : /light|easy|lagan/i.test(text)
      ? 'light'
      : 'medium';

  return validateParsedWorkouts(
    KEYWORDS.filter((entry) => entry.words.test(text)).map((entry) => ({
      workoutType: entry.type,
      intensity,
      focus: (entry.focus ?? []).filter((option) => option.words.test(text)).map((option) => option.id),
      note: ''
    }))
  );
};
