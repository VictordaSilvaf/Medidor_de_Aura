import type { AppDispatch } from '@/src/core/store';
import { patchMyProfile } from '@/src/features/social/profileSlice';
import { bootstrapProfile } from '@/src/features/social/profileApi';

import {
  revenueCatMonetization,
  tierFromCustomerInfo,
} from './revenueCatAdapter';

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
      const tier = tierFromCustomerInfo(info);
      const expiresMs =
        info.entitlements.active[Object.keys(info.entitlements.active)[0] ?? '']
          ?.expirationDateMillis ?? null;
      dispatch(
        patchMyProfile({
          subscription_tier: tier,
          subscription_expires_at: expiresMs
            ? new Date(expiresMs).toISOString()
            : null,
          revenuecat_app_user_id: userId,
        }),
      );
    }
    void bootstrapProfile(dispatch, userId);
  } catch {
    // RevenueCat not configured in dev — profile tier stays from Supabase.
  }
}

export async function purchaseSubscriptionTier(
  dispatch: AppDispatch,
  userId: string,
  tier: 'ascendente' | 'lendario' | 'divino',
) {
  await revenueCatMonetization.configure(userId);
  const info = await revenueCatMonetization.purchaseTier(tier);
  const resolved = tierFromCustomerInfo(info);
  const activeKey = Object.keys(info.entitlements.active)[0];
  const expiresMs = activeKey
    ? info.entitlements.active[activeKey]?.expirationDateMillis
    : null;

  dispatch(
    patchMyProfile({
      subscription_tier: resolved,
      subscription_expires_at: expiresMs
        ? new Date(expiresMs).toISOString()
        : null,
    }),
  );

  void bootstrapProfile(dispatch, userId);
  return resolved;
}

export async function restoreSubscriptions(
  dispatch: AppDispatch,
  userId: string,
) {
  await revenueCatMonetization.configure(userId);
  const info = await revenueCatMonetization.restore();
  if (!info) return 'free' as const;

  const tier = tierFromCustomerInfo(info);
  const activeKey = Object.keys(info.entitlements.active)[0];
  const expiresMs = activeKey
    ? info.entitlements.active[activeKey]?.expirationDateMillis
    : null;

  dispatch(
    patchMyProfile({
      subscription_tier: tier,
      subscription_expires_at: expiresMs
        ? new Date(expiresMs).toISOString()
        : null,
    }),
  );

  void bootstrapProfile(dispatch, userId);
  return tier;
}
