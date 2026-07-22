import { Platform } from 'react-native';

import { RevenueCatMonetization } from '@/src/features/monetization/revenueCatAdapter';
import { StripeMonetization } from '@/src/features/monetization/stripeAdapter';
import type {
  MonetizationPort,
  PurchaseChannel,
} from '@/src/features/monetization/types';

const revenueCat = new RevenueCatMonetization();
const stripe = new StripeMonetization();

/**
 * Chooses the payment channel:
 * - Native iOS/Android → RevenueCat (IAP)
 * - Web → Stripe
 * Explicit channel can be passed for cross-selling flows later.
 */
export function getMonetization(
  channel?: PurchaseChannel,
): MonetizationPort {
  if (channel === 'stripe') return stripe;
  if (channel === 'revenuecat') return revenueCat;

  if (Platform.OS === 'web') {
    return stripe;
  }

  return revenueCat;
}

export { revenueCat, stripe };
export {
  RC_PRO_ENTITLEMENT,
  RC_PACKAGE_MONTHLY,
  RC_PACKAGE_YEARLY,
} from '@/src/features/monetization/revenueCatConfig';
export {
  hasProEntitlement,
  revenueCatMonetization,
  tierFromCustomerInfo,
} from '@/src/features/monetization/revenueCatAdapter';
export {
  bootstrapMonetization,
  presentProPaywall,
  presentProPaywallIfNeeded,
  presentCustomerCenter,
  restoreSubscriptions,
  syncProfileFromCustomerInfo,
  refreshCustomerInfo,
} from '@/src/features/monetization/monetizationBootstrap';
