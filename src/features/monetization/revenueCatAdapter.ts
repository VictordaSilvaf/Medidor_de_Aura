import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesError,
  type PurchasesOfferings,
  type PurchasesPackage,
} from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

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
import {
  RC_PACKAGE_MONTHLY,
  RC_PACKAGE_YEARLY,
  RC_PRO_ENTITLEMENT,
  RC_PRO_MAPS_TO_TIER,
} from '@/src/features/monetization/revenueCatConfig';

function apiKeyForPlatform(): string | undefined {
  const shared = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
  if (Platform.OS === 'ios') {
    return (
      process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS || shared || undefined
    );
  }
  if (Platform.OS === 'android') {
    return (
      process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID || shared || undefined
    );
  }
  // Expo Go / web Preview API — prefer shared test key when present
  return shared || undefined;
}

export function isPurchasesError(error: unknown): error is PurchasesError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as PurchasesError).code === 'string'
  );
}

export function isUserCancelledPurchase(error: unknown): boolean {
  if (
    error &&
    typeof error === 'object' &&
    'userCancelled' in error &&
    (error as { userCancelled?: boolean }).userCancelled
  ) {
    return true;
  }
  return (
    isPurchasesError(error) &&
    error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
  );
}

function activeEntitlementIds(info: CustomerInfo): string[] {
  return Object.keys(info.entitlements.active ?? {});
}

export function hasProEntitlement(info: CustomerInfo | null | undefined): boolean {
  if (!info) return false;
  const active = info.entitlements.active ?? {};
  if (active[RC_PRO_ENTITLEMENT]) return true;
  // Case-insensitive fallback (dashboard typos / rename)
  const lower = RC_PRO_ENTITLEMENT.toLowerCase();
  return Object.keys(active).some((id) => id.toLowerCase() === lower);
}

function entitlementsFromCustomerInfo(info: CustomerInfo): Entitlement[] {
  const ids = activeEntitlementIds(info);
  const result: Entitlement[] = [];
  if (hasProEntitlement(info) || ids.length > 0) {
    result.push('premium_scan', 'pro');
  }
  if (
    ids.includes(RC_ENTITLEMENTS.lendario) ||
    ids.includes(RC_ENTITLEMENTS.divino) ||
    hasProEntitlement(info)
  ) {
    result.push('premium_insights');
  }
  return result;
}

export function tierFromCustomerInfo(info: CustomerInfo): SubscriptionTier {
  if (hasProEntitlement(info)) {
    return RC_PRO_MAPS_TO_TIER;
  }
  return tierFromEntitlements(activeEntitlementIds(info));
}

export function proExpirationIso(info: CustomerInfo): string | null {
  const entitlement =
    info.entitlements.active[RC_PRO_ENTITLEMENT] ??
    Object.values(info.entitlements.active).find(
      (e) => e.identifier.toLowerCase() === RC_PRO_ENTITLEMENT.toLowerCase(),
    );
  if (entitlement?.expirationDate) return entitlement.expirationDate;
  const first = Object.values(info.entitlements.active)[0];
  return first?.expirationDate ?? null;
}

function packageForProduct(
  offerings: PurchasesOfferings,
  productKey: 'monthly' | 'yearly',
): PurchasesPackage | null {
  const current = offerings.current;
  if (!current) return null;

  const needle =
    productKey === 'monthly' ? RC_PACKAGE_MONTHLY : RC_PACKAGE_YEARLY;

  const match = current.availablePackages.find((pkg) => {
    const id = pkg.identifier.toLowerCase();
    const productId = pkg.product.identifier.toLowerCase();
    const packageType = String(pkg.packageType ?? '').toLowerCase();
    return (
      id.includes(needle) ||
      productId.includes(needle) ||
      (needle === 'yearly' &&
        (id.includes('annual') ||
          productId.includes('annual') ||
          packageType.includes('annual'))) ||
      (needle === 'monthly' && packageType.includes('monthly'))
    );
  });

  return match ?? null;
}

function packageForLegacyTier(
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

  isConfigured(): boolean {
    if (Platform.OS === 'web') return false;
    return Boolean(apiKeyForPlatform());
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

  async checkProAccess(): Promise<boolean> {
    const info = await this.getCustomerInfo();
    return hasProEntitlement(info);
  }

  async getOfferings(): Promise<PurchasesOfferings | null> {
    if (Platform.OS === 'web') return null;
    this.ensureNative();
    return Purchases.getOfferings();
  }

  async purchasePackage(
    productKey: 'monthly' | 'yearly',
  ): Promise<CustomerInfo> {
    const offerings = await this.getOfferings();
    if (!offerings?.current) {
      throw new Error('OFFERINGS_UNAVAILABLE');
    }
    const pkg = packageForProduct(offerings, productKey);
    if (!pkg) {
      throw new Error(`PACKAGE_NOT_FOUND:${productKey}`);
    }
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  }

  async purchaseTier(
    tier: Exclude<SubscriptionTier, 'free'>,
  ): Promise<CustomerInfo> {
    const offerings = await this.getOfferings();
    if (!offerings?.current) {
      throw new Error('OFFERINGS_UNAVAILABLE');
    }
    const pkg = packageForLegacyTier(offerings, tier);
    if (!pkg) {
      throw new Error('PACKAGE_NOT_FOUND');
    }
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  }

  async purchase(productId: ProductId): Promise<void> {
    if (productId === 'monthly' || productId === 'yearly') {
      await this.purchasePackage(productId);
      return;
    }
    const tier = PAID_TIERS.find(
      (t): t is Exclude<SubscriptionTier, 'free'> =>
        t === productId || productId.includes(t),
    );
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

  /**
   * Presents the remotely configured RevenueCat Paywall.
   * @returns true if the user purchased or restored.
   */
  async presentPaywall(): Promise<{
    purchased: boolean;
    result: PAYWALL_RESULT;
    customerInfo: CustomerInfo | null;
  }> {
    this.ensureNative();
    const result = await RevenueCatUI.presentPaywall({
      displayCloseButton: true,
    });
    const purchased =
      result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED;
    const customerInfo = purchased ? await this.getCustomerInfo() : null;
    return { purchased, result, customerInfo };
  }

  /**
   * Shows the paywall only if Pro is not already unlocked.
   */
  async presentPaywallIfNeeded(): Promise<{
    purchased: boolean;
    result: PAYWALL_RESULT;
    customerInfo: CustomerInfo | null;
  }> {
    this.ensureNative();
    const result = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: RC_PRO_ENTITLEMENT,
      displayCloseButton: true,
    });
    const purchased =
      result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED;
    const customerInfo =
      purchased || result === PAYWALL_RESULT.NOT_PRESENTED
        ? await this.getCustomerInfo()
        : null;
    return { purchased, result, customerInfo };
  }

  /** Manage subscription / restore / cancel via RevenueCat Customer Center. */
  async presentCustomerCenter(): Promise<void> {
    this.ensureNative();
    await RevenueCatUI.presentCustomerCenter();
  }
}

export const revenueCatMonetization = new RevenueCatMonetization();
