import { supabase } from './supabase';

export type Plan = 'free' | 'premium';

interface UserPlanRow {
  plan: string | null;
}

/**
 * Reads the player's plan. `user_plans` is read-only for players (see
 * supabase/schema.sql), so this cannot be faked from the app. A missing row,
 * an unknown value or a failed read all mean free.
 */
export const fetchUserPlan = async (
  userId: string
): Promise<{ plan: Plan; error: unknown }> => {
  try {
    const { data, error } = await supabase
      .from('user_plans')
      .select('plan')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      return { plan: 'free', error };
    }

    return {
      plan: (data as UserPlanRow | null)?.plan === 'premium' ? 'premium' : 'free',
      error: null
    };
  } catch (error) {
    return { plan: 'free', error };
  }
};
