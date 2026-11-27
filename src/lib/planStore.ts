import { describeError } from './authErrors';
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

export const PREMIUM_PRICE_LABEL = '$5 a month';

/**
 * Test mode only: switches the signed-in player's own plan through the
 * set_test_plan database function, which refuses once test upgrades are
 * turned off in public.app_settings. Real payments will replace this.
 */
export const setTestPlan = async (plan: Plan): Promise<{ error: string | null }> => {
  try {
    const { error } = await supabase.rpc('set_test_plan', { new_plan: plan });

    if (!error) {
      return { error: null };
    }

    const message = `${(error as { message?: string }).message ?? ''}`;

    if (message.includes('test_upgrades_disabled')) {
      return { error: 'Upgrades are not open yet.' };
    }

    // The function was not added to the database yet (PGRST202).
    if ((error as { code?: string }).code === 'PGRST202') {
      return { error: 'Upgrades are not set up yet.' };
    }

    return { error: describeError(error) };
  } catch (error) {
    return { error: describeError(error) };
  }
};
