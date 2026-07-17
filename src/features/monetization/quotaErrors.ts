import type { SubscriptionTier } from '@/src/features/monetization/subscriptionTiers';

export class QuotaExceededError extends Error {
  readonly code = 'quota_exceeded' as const;

  constructor(
    public readonly tier: SubscriptionTier,
    public readonly dailyUsed: number,
    public readonly monthlyUsed: number,
    public readonly dailyLimit: number,
    public readonly monthlyLimit: number,
  ) {
    super('quota_exceeded');
    this.name = 'QuotaExceededError';
  }
}

export function isQuotaExceededError(
  error: unknown,
): error is QuotaExceededError {
  return error instanceof QuotaExceededError;
}
