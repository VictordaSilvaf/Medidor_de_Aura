export type SubscriptionTier =
  | 'free'
  | 'ascendente'
  | 'lendario'
  | 'divino';

export type TierLimits = {
  daily: number;
  monthly: number;
  priority: number;
};

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: { daily: 1, monthly: 5, priority: 0 },
  ascendente: { daily: 3, monthly: 20, priority: 10 },
  lendario: { daily: 6, monthly: 50, priority: 20 },
  divino: { daily: 20, monthly: 120, priority: 30 },
};

export const PAID_TIERS: SubscriptionTier[] = [
  'ascendente',
  'lendario',
  'divino',
];

export const TIER_ORDER: SubscriptionTier[] = [
  'free',
  'ascendente',
  'lendario',
  'divino',
];

/**
 * Legacy per-tier entitlement ids (optional multi-plan setup).
 * Primary product uses `Medidor_de_Aura Pro` — see revenueCatConfig.ts.
 */
export const RC_ENTITLEMENTS: Record<Exclude<SubscriptionTier, 'free'>, string> =
  {
    ascendente: 'ascendente',
    lendario: 'lendario',
    divino: 'divino',
  };

export function isPaidTier(tier: SubscriptionTier): boolean {
  return tier !== 'free';
}

export function effectiveSubscriptionTier(
  tier: SubscriptionTier | null | undefined,
  expiresAt: string | null | undefined,
): SubscriptionTier {
  if (!tier || tier === 'free') return 'free';
  if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) return 'free';
  return tier;
}

export function tierFromEntitlements(
  activeEntitlementIds: string[],
): SubscriptionTier {
  const set = new Set(activeEntitlementIds.map((id) => id.toLowerCase()));
  // Single Pro entitlement (dashboard) → lendario quotas
  if (
    set.has('medidor_de_aura pro') ||
    set.has('medidor_de_aura_pro') ||
    [...set].some((id) => id.includes('medidor_de_aura') && id.includes('pro'))
  ) {
    return 'lendario';
  }
  if (set.has(RC_ENTITLEMENTS.divino)) return 'divino';
  if (set.has(RC_ENTITLEMENTS.lendario)) return 'lendario';
  if (set.has(RC_ENTITLEMENTS.ascendente)) return 'ascendente';
  return 'free';
}

export const SUBSCRIPTION_TIER_COLORS: Record<SubscriptionTier, string> = {
  free: '#94A3B8',
  ascendente: '#38BDF8',
  lendario: '#FACC15',
  divino: '#A855F7',
};

export function tierLabelKey(tier: SubscriptionTier): string {
  return `premium.tiers.${tier}`;
}
