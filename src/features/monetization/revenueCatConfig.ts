/**
 * RevenueCat dashboard identifiers — keep in sync with the RC project.
 *
 * Dashboard setup:
 * 1. Entitlement id: `Medidor_de_Aura Pro`
 * 2. Products: `monthly` + `yearly` (store product ids may differ; package
 *    identifiers in the current Offering should contain these strings)
 * 3. Attach both products to the Pro entitlement
 * 4. Create a Paywall on the current Offering
 * 5. Enable Customer Center in the RC dashboard
 */

/** Primary entitlement that unlocks VIP features / quotas. */
export const RC_PRO_ENTITLEMENT = 'Medidor_de_Aura Pro';

/** Package identifiers expected in the current Offering. */
export const RC_PACKAGE_MONTHLY = 'monthly';
export const RC_PACKAGE_YEARLY = 'yearly';

/**
 * When Pro is active, map to this internal subscription tier for server quotas.
 * (profiles.subscription_tier still uses free | ascendente | lendario | divino)
 */
export const RC_PRO_MAPS_TO_TIER = 'lendario' as const;
