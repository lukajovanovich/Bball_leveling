import { normalizeProgressState } from '../data/mockPlayer';
import { ProgressState } from '../types';
import { supabase } from './supabase';

interface PlayerProfileRow {
  progress_state: ProgressState;
}

const sanitizeProgressState = (state: ProgressState): ProgressState => ({
  ...normalizeProgressState(state),
  lastLevelUp: null
});

export const fetchPlayerProgressState = async (userId: string) => {
  const { data, error } = await supabase
    .from('player_profiles')
    .select('progress_state')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  const row = data as PlayerProfileRow | null;

  return {
    data: row ? sanitizeProgressState(row.progress_state) : null,
    error: null
  };
};

export const upsertPlayerProgressState = async (
  userId: string,
  email: string | null,
  state: ProgressState
) =>
  supabase.from('player_profiles').upsert(
    {
      user_id: userId,
      email,
      progress_state: sanitizeProgressState(state),
      updated_at: new Date().toISOString()
    },
    {
      onConflict: 'user_id'
    }
  );
