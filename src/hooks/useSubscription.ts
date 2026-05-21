import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type PlanType = 'trial' | 'pro' | 'annual' | 'lifetime' | 'free';

export interface SubscriptionInfo {
  planType: PlanType;
  trialExpiresAt: Date | null;
  subscriptionStatus: string | null;
  hasFullAccess: boolean;
  isTrialExpired: boolean;
  daysLeftInTrial: number | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export function useSubscription(): SubscriptionInfo {
  const { user } = useAuth();
  const [planType, setPlanType] = useState<PlanType>('trial');
  const [trialExpiresAt, setTrialExpiresAt] = useState<Date | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('plan_type, trial_expires_at, subscription_status')
      .eq('id', user.id)
      .maybeSingle();
    if (data) {
      setPlanType((data.plan_type as PlanType) ?? 'trial');
      setTrialExpiresAt(data.trial_expires_at ? new Date(data.trial_expires_at) : null);
      setSubscriptionStatus(data.subscription_status ?? null);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const now = new Date();
  const isTrialExpired =
    planType === 'trial' && (!trialExpiresAt || trialExpiresAt.getTime() <= now.getTime());

  const daysLeftInTrial =
    planType === 'trial' && trialExpiresAt
      ? Math.max(0, Math.ceil((trialExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : null;

  const hasFullAccess =
    planType === 'lifetime' ||
    ((planType === 'pro' || planType === 'annual') && subscriptionStatus === 'active') ||
    (planType === 'trial' && !isTrialExpired);

  return {
    planType,
    trialExpiresAt,
    subscriptionStatus,
    hasFullAccess,
    isTrialExpired,
    daysLeftInTrial,
    isLoading,
    refetch: load,
  };
}