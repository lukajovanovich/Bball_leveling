import { describeError } from './authErrors';
import { supabase } from './supabase';
import {
  MAX_TRAINING_TEXT_LENGTH,
  ParsedWorkout,
  buildTrainingCatalog,
  demoParseTraining,
  validateParsedWorkouts
} from './trainingParser';

export const PARSE_TRAINING_FUNCTION = 'parse-training';

export type TrainingReadResult =
  | { ok: true; workouts: ParsedWorkout[]; demo: boolean; remainingToday?: number }
  | { ok: false; message: string };

interface FunctionResponse {
  status?: string;
  workouts?: unknown;
  remainingToday?: number;
  limit?: number;
  message?: string;
}

/**
 * Sends the player's own description to the parse-training Edge Function and
 * returns the workouts it found, checked against the game's catalog. While the
 * function or its AI key is not set up yet, a simple keyword reading is used
 * instead and marked as a demo.
 */
export const readTrainingDescription = async (text: string): Promise<TrainingReadResult> => {
  const trimmed = text.trim().slice(0, MAX_TRAINING_TEXT_LENGTH);

  if (!trimmed) {
    return { ok: false, message: 'Write what you trained today first.' };
  }

  let data: FunctionResponse | null = null;

  try {
    const response = await supabase.functions.invoke(PARSE_TRAINING_FUNCTION, {
      body: { text: trimmed, catalog: buildTrainingCatalog() }
    });

    data = (response.data ?? null) as FunctionResponse | null;

    // A function that is not deployed yet answers 404; treat it like a
    // missing AI key so the screen still works in demo mode.
    if (response.error && !data) {
      const status = (response.error as { context?: { status?: number } }).context?.status;

      if (status === 404) {
        return { ok: true, workouts: demoParseTraining(trimmed), demo: true };
      }

      return { ok: false, message: describeError(response.error) };
    }
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }

  switch (data?.status) {
    case 'ok':
      return {
        ok: true,
        workouts: validateParsedWorkouts(data.workouts),
        demo: false,
        remainingToday: data.remainingToday
      };
    case 'not_configured':
      return { ok: true, workouts: demoParseTraining(trimmed), demo: true };
    case 'not_premium':
      return { ok: false, message: 'Describing your training is part of Premium.' };
    case 'limit_reached':
      return {
        ok: false,
        message: data.limit
          ? `You've used all ${data.limit} training reads for today. More tomorrow.`
          : "You've used today's training reads. More tomorrow."
      };
    default:
      return {
        ok: false,
        message: data?.message ?? 'Could not read your training right now. Try again.'
      };
  }
};
