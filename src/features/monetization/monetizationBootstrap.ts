import type { CustomerInfo } from 'react-native-purchases';

import type { AppDispatch } from '@/src/core/store';
import { patchMyProfile } from '@/src/features/social/profileSlice';
import { bootstrapProfile } from '@/src/features/social/profileApi';

import {
  hasProEntitlement,
  proExpirationIso,
  revenueCatMonetization,
  tierFromCustomerInfo,
} from './revenueCatAdapter';
import type { SubscriptionTier } from './subscriptionTiers';

export function syncProfileFromCustomerInfo(
  dispatch: AppDispatch,
  userId: string,
  info: CustomerInfo,
) {
  const tier = tierFromCustomerInfo(info);
  const expiresAt = proExpirationIso(info);

  dispatch(
    patchMyProfile({
      subscription_tier: tier,
      subscription_expires_at: expiresAt,
      revenuecat_app_user_id: userId,
    }),
  );
}

export async function bootstrapMonetization(
  dispatch: AppDispatch,
  userId: string | undefined,
) {
  if (!userId) {
    await revenueCatMonetization.logOut();
    return;
  }

  try {
    await revenueCatMonetization.configure(userId);
    const info = await revenueCatMonetization.getCustomerInfo();
    if (info) {
      syncProfileFromCustomerInfo(dispatch, userId, info);
    }
    void bootstrapProfile(dispatch, userId);
  } catch {
    // RevenueCat not configured / Expo Go Preview — profile tier stays from Supabase.
  }
}

export async function refreshCustomerInfo(
  dispatch: AppDispatch,
  userId: string,
): Promise<{ tier: SubscriptionTier; isPro: boolean }> {
  await revenueCatMonetization.configure(userId);
  const info = await revenueCatMonetization.getCustomerInfo();
  if (!info) {
    return { tier: 'free', isPro: false };
  }
  syncProfileFromCustomerInfo(dispatch, userId, info);
  void bootstrapProfile(dispatch, userId);
  return {
    tier: tierFromCustomerInfo(info),
    isPro: hasProEntitlement(info),
  };
}

/** Opens the RevenueCat remote Paywall (monthly + yearly from current Offering). */
export async function presentProPaywall(
  dispatch: AppDispatch,
  userId: string,
): Promise<{ purchased: boolean; tier: SubscriptionTier; isPro: boolean }> {
  await revenueCatMonetization.configure(userId);
  const { purchased, customerInfo } =
    await revenueCatMonetization.presentPaywall();

  if (customerInfo) {
    syncProfileFromCustomerInfo(dispatch, userId, customerInfo);
    void bootstrapProfile(dispatch, userId);
    return {
      purchased,
      tier: tierFromCustomerInfo(customerInfo),
      isPro: hasProEntitlement(customerInfo),
    };
  }

  const refreshed = await refreshCustomerInfo(dispatch, userId);
  return { purchased, ...refreshed };
}

/** Paywall only when Pro entitlement is missing. */
export async function presentProPaywallIfNeeded(
  dispatch: AppDispatch,
  userId: string,
) {
  await revenueCatMonetization.configure(userId);
  const { purchased, customerInfo, result } =
    await revenueCatMonetization.presentPaywallIfNeeded();

  if (customerInfo) {
    syncProfileFromCustomerInfo(dispatch, userId, customerInfo);
    void bootstrapProfile(dispatch, userId);
  } else if (purchased) {
    await refreshCustomerInfo(dispatch, userId);
  }

  return { purchased, result, customerInfo };
}

export async function presentCustomerCenter(
  dispatch: AppDispatch,
  userId: string,
) {
  await revenueCatMonetization.configure(userId);
  await revenueCatMonetization.presentCustomerCenter();
  // Subscription may have changed (cancel / refund / restore) while open.
  return refreshCustomerInfo(dispatch, userId);
}

export async function purchaseSubscriptionTier(
  dispatch: AppDispatch,
  userId: string,
  tier: 'ascendente' | 'lendario' | 'divino',
) {
  await revenueCatMonetization.configure(userId);
  const info = await revenueCatMonetization.purchaseTier(tier);
  syncProfileFromCustomerInfo(dispatch, userId, info);
  void bootstrapProfile(dispatch, userId);
  return tierFromCustomerInfo(info);
}

export async function purchaseProPackage(
  dispatch: AppDispatch,
  userId: string,
  productKey: 'monthly' | 'yearly',
) {
  await revenueCatMonetization.configure(userId);
  const info = await revenueCatMonetization.purchasePackage(productKey);
  syncProfileFromCustomerInfo(dispatch, userId, info);
  void bootstrapProfile(dispatch, userId);
  return {
    tier: tierFromCustomerInfo(info),
    isPro: hasProEntitlement(info),
  };
}

export async function restoreSubscriptions(
  dispatch: AppDispatch,
  userId: string,
) {
  await revenueCatMonetization.configure(userId);
  const info = await revenueCatMonetization.restore();
  if (!info) return { tier: 'free' as const, isPro: false };

  syncProfileFromCustomerInfo(dispatch, userId, info);
  void bootstrapProfile(dispatch, userId);
  return {
    tier: tierFromCustomerInfo(info),
    isPro: hasProEntitlement(info),
  };
}
