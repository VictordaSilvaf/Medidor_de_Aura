import { supabase } from '@/src/features/auth/supabase';
import {
  TIER_LIMITS,
  type SubscriptionTier,
} from '@/src/features/monetization/subscriptionTiers';

export type AnalysisQuotaUsage = {
  tier: SubscriptionTier;
  dailyUsed: number;
  monthlyUsed: number;
  dailyLimit: number;
  monthlyLimit: number;
  dailyRemaining: number;
  monthlyRemaining: number;
  priority: number;
};

function utcDayStartIso(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString();
}

function utcMonthStartIso(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  ).toISOString();
}

async function countSince(userId: string, sinceIso: string): Promise<number> {
  const { count, error } = await supabase
    .from('video_analyses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .not('status', 'in', '(pending_upload,failed)')
    .gte('created_at', sinceIso);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Uso de cota alinhado ao enforce de create-analysis (UTC). */
export async function fetchAnalysisQuotaUsage(
  userId: string,
  tier: SubscriptionTier,
): Promise<AnalysisQuotaUsage> {
  const limits = TIER_LIMITS[tier];
  const [dailyUsed, monthlyUsed] = await Promise.all([
    countSince(userId, utcDayStartIso()),
    countSince(userId, utcMonthStartIso()),
  ]);

  return {
    tier,
    dailyUsed,
    monthlyUsed,
    dailyLimit: limits.daily,
    monthlyLimit: limits.monthly,
    dailyRemaining: Math.max(0, limits.daily - dailyUsed),
    monthlyRemaining: Math.max(0, limits.monthly - monthlyUsed),
    priority: limits.priority,
  };
}
