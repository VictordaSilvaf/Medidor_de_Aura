import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesOfferings,
  type PurchasesPackage,
} from 'react-native-purchases';

import {
  MonetizationNotConfiguredError,
  type Entitlement,
  type MonetizationPort,
  type ProductId,
} from '@/src/features/monetization/types';
import {
  PAID_TIERS,
  RC_ENTITLEMENTS,
  tierFromEntitlements,
  type SubscriptionTier,
} from '@/src/features/monetization/subscriptionTiers';

function apiKeyForPlatform(): string | undefined {
  if (Platform.OS === 'ios') {
    return process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS;
  }
  if (Platform.OS === 'android') {
    return process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID;
  }
  return undefined;
}

function activeEntitlementIds(info: CustomerInfo): string[] {
  return Object.keys(info.entitlements.active ?? {});
}

function entitlementsFromCustomerInfo(info: CustomerInfo): Entitlement[] {
  const ids = activeEntitlementIds(info);
  const result: Entitlement[] = [];
  if (ids.length > 0) result.push('premium_scan');
  if (
    ids.includes(RC_ENTITLEMENTS.lendario) ||
    ids.includes(RC_ENTITLEMENTS.divino)
  ) {
    result.push('premium_insights');
  }
  return result;
}

export function tierFromCustomerInfo(info: CustomerInfo): SubscriptionTier {
  return tierFromEntitlements(activeEntitlementIds(info));
}

function packageForTier(
  offerings: PurchasesOfferings,
  tier: Exclude<SubscriptionTier, 'free'>,
): PurchasesPackage | null {
  const current = offerings.current;
  if (!current) return null;

  const entitlementId = RC_ENTITLEMENTS[tier].toLowerCase();
  const fromTierPackage = current.availablePackages.find((pkg) => {
    const id = pkg.identifier.toLowerCase();
    const productId = pkg.product.identifier.toLowerCase();
    return id.includes(entitlementId) || productId.includes(entitlementId);
  });
  if (fromTierPackage) return fromTierPackage;

  const index = PAID_TIERS.indexOf(tier);
  if (index >= 0 && index < current.availablePackages.length) {
    return current.availablePackages[index] ?? null;
  }

  return null;
}

let configuredForUser: string | null = null;

export class RevenueCatMonetization implements MonetizationPort {
  readonly channel = 'revenuecat' as const;

  private ensureNative() {
    if (Platform.OS === 'web') {
      throw new MonetizationNotConfiguredError(this.channel);
    }
    const apiKey = apiKeyForPlatform();
    if (!apiKey) {
      throw new MonetizationNotConfiguredError(this.channel);
    }
    return apiKey;
  }

  async configure(userId: string): Promise<void> {
    if (Platform.OS === 'web') return;
    const apiKey = this.ensureNative();
    if (configuredForUser === userId) return;

    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
    Purchases.configure({ apiKey, appUserID: userId });
    configuredForUser = userId;
  }

  async logOut(): Promise<void> {
    if (Platform.OS === 'web') return;
    configuredForUser = null;
    try {
      await Purchases.logOut();
    } catch {
      // ignore if never configured
    }
  }

  async getCustomerInfo(): Promise<CustomerInfo | null> {
    if (Platform.OS === 'web') return null;
    this.ensureNative();
    return Purchases.getCustomerInfo();
  }

  async getEntitlements(): Promise<Entitlement[]> {
    const info = await this.getCustomerInfo();
    if (!info) return [];
    return entitlementsFromCustomerInfo(info);
  }

  async getOfferings(): Promise<PurchasesOfferings | null> {
    if (Platform.OS === 'web') return null;
    this.ensureNative();
    return Purchases.getOfferings();
  }

  async purchaseTier(tier: Exclude<SubscriptionTier, 'free'>): Promise<CustomerInfo> {
    const offerings = await this.getOfferings();
    if (!offerings?.current) {
      throw new Error('OFFERINGS_UNAVAILABLE');
    }
    const pkg = packageForTier(offerings, tier);
    if (!pkg) {
      throw new Error('PACKAGE_NOT_FOUND');
    }
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  }

  async purchase(productId: ProductId): Promise<void> {
    const tier = PAID_TIERS.find((t) => t === productId || productId.includes(t));
    if (!tier) {
      throw new Error('UNKNOWN_PRODUCT');
    }
    await this.purchaseTier(tier);
  }

  async restore(): Promise<CustomerInfo | null> {
    if (Platform.OS === 'web') return null;
    this.ensureNative();
    return Purchases.restorePurchases();
  }
}

export const revenueCatMonetization = new RevenueCatMonetization();
