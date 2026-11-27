import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { Plan, fetchUserPlan } from '../lib/planStore';
import { useAuth } from './AuthContext';

interface PlanContextValue {
  plan: Plan;
  isPremium: boolean;
  isLoadingPlan: boolean;
  refreshPlan: () => Promise<void>;
}

const PlanContext = createContext<PlanContextValue | undefined>(undefined);

// Guests and setups without Supabase are always free. The plan only unlocks
// screens; anything that costs money (the AI training read) is checked again
// on the server.
export const PlanProvider = ({ children }: PropsWithChildren) => {
  const { user, isConfigured } = useAuth();
  const userId = user?.id ?? null;
  const [plan, setPlan] = useState<Plan>('free');
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);

  const load = useCallback(
    async (isActive: () => boolean = () => true) => {
      if (!userId || !isConfigured) {
        setPlan('free');
        setIsLoadingPlan(false);
        return;
      }

      setIsLoadingPlan(true);
      const result = await fetchUserPlan(userId);

      if (isActive()) {
        setPlan(result.plan);
        setIsLoadingPlan(false);
      }
    },
    [isConfigured, userId]
  );

  useEffect(() => {
    let active = true;
    void load(() => active);

    return () => {
      active = false;
    };
  }, [load]);

  const value = useMemo(
    () => ({
      plan,
      isPremium: plan === 'premium',
      isLoadingPlan,
      refreshPlan: () => load()
    }),
    [isLoadingPlan, load, plan]
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
};

export const usePlan = () => {
  const context = useContext(PlanContext);

  if (!context) {
    throw new Error('usePlan must be used inside PlanProvider');
  }

  return context;
};
