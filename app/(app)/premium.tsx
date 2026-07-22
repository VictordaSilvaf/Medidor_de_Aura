import { useRouter } from 'expo-router';
import { ChevronLeft, Crown, Settings2, Sparkles } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import type { CustomerInfo, PurchasesError } from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { useAppDispatch, useAppSelector } from '@/src/core/hooks';
import { selectAuthUser } from '@/src/features/auth/authSlice';
import {
  presentCustomerCenter,
  presentProPaywall,
  refreshCustomerInfo,
  restoreSubscriptions,
  syncProfileFromCustomerInfo,
} from '@/src/features/monetization/monetizationBootstrap';
import {
  hasProEntitlement,
  isUserCancelledPurchase,
  revenueCatMonetization,
  tierFromCustomerInfo,
} from '@/src/features/monetization/revenueCatAdapter';
import { RC_PRO_ENTITLEMENT } from '@/src/features/monetization/revenueCatConfig';
import { MonetizationNotConfiguredError } from '@/src/features/monetization/types';
import {
  SUBSCRIPTION_TIER_COLORS,
  TIER_LIMITS,
  tierLabelKey,
} from '@/src/features/monetization/subscriptionTiers';
import { selectSubscriptionTier } from '@/src/features/social/profileSlice';
import { GradientButton } from '@/src/shared/ui/GradientButton';
import { appAlert } from '@/src/shared/ui/appAlert';
import { fonts, palette } from '@/src/shared/ui/theme';

/**
 * Dedicated subscription screen.
 * - Free: embeds RevenueCat remote Paywall (`<RevenueCatUI.Paywall />`)
 * - Pro: manage via Customer Center + restore
 */
export default function PremiumScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const currentTier = useAppSelector(selectSubscriptionTier);
  const [isPro, setIsPro] = useState(currentTier !== 'free');
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [paywallReady, setPaywallReady] = useState(false);
  const [paywallError, setPaywallError] = useState<string | null>(null);
  const [fallbackMode, setFallbackMode] = useState(false);

  const accent = SUBSCRIPTION_TIER_COLORS[isPro ? currentTier : 'lendario'];
  const limits = TIER_LIMITS[currentTier === 'free' ? 'lendario' : currentTier];

  const applyInfo = useCallback(
    (info: CustomerInfo) => {
      if (!user?.id) return;
      syncProfileFromCustomerInfo(dispatch, user.id, info);
      setIsPro(hasProEntitlement(info));
    },
    [dispatch, user?.id],
  );

  const syncStatus = useCallback(async () => {
    if (!user?.id) {
      setChecking(false);
      return;
    }

    if (!revenueCatMonetization.isConfigured()) {
      setIsPro(currentTier !== 'free');
      setPaywallError(t('premium.notConfiguredBody'));
      setChecking(false);
      return;
    }

    try {
      await revenueCatMonetization.configure(user.id);
      const { isPro: pro } = await refreshCustomerInfo(dispatch, user.id);
      setIsPro(pro);
      setPaywallReady(true);
      setPaywallError(null);
    } catch (error) {
      setIsPro(currentTier !== 'free');
      setPaywallError(
        error instanceof Error ? error.message : t('premium.notConfiguredBody'),
      );
    } finally {
      setChecking(false);
    }
  }, [currentTier, dispatch, t, user?.id]);

  useEffect(() => {
    void syncStatus();
  }, [syncStatus]);

  const handlePurchaseCompleted = useCallback(
    ({ customerInfo }: { customerInfo: CustomerInfo }) => {
      applyInfo(customerInfo);
      appAlert.success(
        t('premium.successTitle'),
        t('premium.successBody', {
          tier: t(tierLabelKey(tierFromCustomerInfo(customerInfo))),
        }),
      );
    },
    [applyInfo, t],
  );

  const handleRestoreCompleted = useCallback(
    ({ customerInfo }: { customerInfo: CustomerInfo }) => {
      applyInfo(customerInfo);
      if (hasProEntitlement(customerInfo)) {
        appAlert.success(
          t('premium.restoreTitle'),
          t('premium.restoreSuccess', {
            tier: t(tierLabelKey(tierFromCustomerInfo(customerInfo))),
          }),
        );
      } else {
        appAlert.warn(t('premium.restoreTitle'), t('premium.restoreEmpty'));
      }
    },
    [applyInfo, t],
  );

  const handlePurchaseError = useCallback(
    ({ error }: { error: PurchasesError }) => {
      if (isUserCancelledPurchase(error)) return;
      appAlert.error(t('common.error'), error.message || t('common.error'));
    },
    [t],
  );

  const handleModalPaywall = useCallback(async () => {
    if (!user?.id) return;
    setBusy(true);
    try {
      const { purchased, isPro: pro, tier } = await presentProPaywall(
        dispatch,
        user.id,
      );
      setIsPro(pro);
      if (purchased && pro) {
        appAlert.success(
          t('premium.successTitle'),
          t('premium.successBody', { tier: t(tierLabelKey(tier)) }),
        );
      }
    } catch (error) {
      if (error instanceof MonetizationNotConfiguredError) {
        appAlert.warn(
          t('premium.notConfiguredTitle'),
          t('premium.notConfiguredBody'),
        );
      } else if (!isUserCancelledPurchase(error)) {
        appAlert.error(
          t('common.error'),
          error instanceof Error ? error.message : t('common.error'),
        );
      }
    } finally {
      setBusy(false);
    }
  }, [dispatch, t, user?.id]);

  const handleCustomerCenter = useCallback(async () => {
    if (!user?.id) return;
    setBusy(true);
    try {
      const { isPro: pro } = await presentCustomerCenter(dispatch, user.id);
      setIsPro(pro);
    } catch (error) {
      if (error instanceof MonetizationNotConfiguredError) {
        appAlert.warn(
          t('premium.notConfiguredTitle'),
          t('premium.notConfiguredBody'),
        );
      } else {
        appAlert.error(
          t('common.error'),
          error instanceof Error ? error.message : t('common.error'),
        );
      }
    } finally {
      setBusy(false);
    }
  }, [dispatch, t, user?.id]);

  const handleRestore = useCallback(async () => {
    if (!user?.id) return;
    setBusy(true);
    try {
      const { tier, isPro: pro } = await restoreSubscriptions(dispatch, user.id);
      setIsPro(pro);
      if (!pro) {
        appAlert.warn(t('premium.restoreTitle'), t('premium.restoreEmpty'));
      } else {
        appAlert.success(
          t('premium.restoreTitle'),
          t('premium.restoreSuccess', { tier: t(tierLabelKey(tier)) }),
        );
      }
    } catch (error) {
      if (error instanceof MonetizationNotConfiguredError) {
        appAlert.warn(
          t('premium.notConfiguredTitle'),
          t('premium.notConfiguredBody'),
        );
      } else {
        appAlert.error(
          t('common.error'),
          error instanceof Error ? error.message : t('common.error'),
        );
      }
    } finally {
      setBusy(false);
    }
  }, [dispatch, t, user?.id]);

  const showEmbeddedPaywall =
    !checking &&
    !isPro &&
    Platform.OS !== 'web' &&
    paywallReady &&
    !fallbackMode &&
    !paywallError;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(app)/(tabs)');
          }}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <ChevronLeft size={22} color={palette.textPrimary} />
        </Pressable>
        <Text style={styles.screenTitle}>{t('premium.title')}</Text>
        <View style={styles.iconBtnPlaceholder} />
      </View>

      {checking ? (
        <View style={styles.centered}>
          <ActivityIndicator color={palette.primary} />
          <Text style={styles.muted}>{t('premium.checking')}</Text>
        </View>
      ) : null}

      {!checking && isPro ? (
        <View style={[styles.proBody, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.hero}>
            <Sparkles size={28} color={palette.neon} />
            <Text style={[styles.heroTitle, { color: accent }]}>
              {t('premium.proName')}
            </Text>
            <Text style={styles.heroBody}>
              {t('premium.proActive', { entitlement: RC_PRO_ENTITLEMENT })}
            </Text>
            <Text style={styles.muted}>
              {t('premium.dailyQuota', { count: limits.daily })}
              {' · '}
              {t('premium.monthlyQuota', { count: limits.monthly })}
            </Text>
          </View>

          <GradientButton
            title={t('premium.manage')}
            onPress={() => void handleCustomerCenter()}
            disabled={busy || Platform.OS === 'web'}
          />
          <GradientButton
            title={t('premium.restore')}
            variant="ghost"
            onPress={() => void handleRestore()}
            disabled={busy || Platform.OS === 'web'}
          />
          {busy ? <ActivityIndicator color={palette.primary} /> : null}
          <Text style={styles.legal}>{t('premium.legal')}</Text>
        </View>
      ) : null}

      {!checking && !isPro && Platform.OS === 'web' ? (
        <View style={styles.centered}>
          <Text style={styles.webNote}>{t('premium.webNote')}</Text>
        </View>
      ) : null}

      {!checking && !isPro && Platform.OS !== 'web' && paywallError ? (
        <View style={[styles.proBody, { paddingBottom: insets.bottom + 24 }]}>
          <Crown size={28} color={palette.neon} />
          <Text style={styles.heroTitle}>{t('premium.proName')}</Text>
          <Text style={styles.heroBody}>{paywallError}</Text>
          <GradientButton
            title={t('premium.seePlans')}
            onPress={() => {
              setPaywallError(null);
              setFallbackMode(false);
              void syncStatus();
            }}
          />
          <GradientButton
            title={t('premium.restore')}
            variant="ghost"
            onPress={() => void handleRestore()}
            disabled={busy}
          />
        </View>
      ) : null}

      {showEmbeddedPaywall ? (
        <View style={styles.paywallWrap}>
          <RevenueCatUI.Paywall
            style={styles.paywall}
            options={{
              displayCloseButton: true,
            }}
            onPurchaseStarted={() => setBusy(true)}
            onPurchaseCompleted={handlePurchaseCompleted}
            onPurchaseError={handlePurchaseError}
            onPurchaseCancelled={() => setBusy(false)}
            onRestoreStarted={() => setBusy(true)}
            onRestoreCompleted={handleRestoreCompleted}
            onRestoreError={({ error }) => {
              setBusy(false);
              appAlert.error(t('common.error'), error.message);
            }}
            onDismiss={() => {
              setBusy(false);
              if (!user?.id) {
                if (router.canGoBack()) router.back();
                return;
              }
              void refreshCustomerInfo(dispatch, user.id).then(({ isPro: pro }) => {
                setIsPro(pro);
                // Only leave the screen when the user closed without unlocking Pro.
                if (!pro && router.canGoBack()) {
                  router.back();
                }
              });
            }}
          />
          <Pressable
            style={styles.fallbackLink}
            onPress={() => {
              setFallbackMode(true);
              void handleModalPaywall();
            }}
          >
            <Settings2 size={14} color={palette.textSecondary} />
            <Text style={styles.fallbackText}>{t('premium.openModalPaywall')}</Text>
          </Pressable>
        </View>
      ) : null}

      {!checking && !isPro && Platform.OS !== 'web' && fallbackMode ? (
        <View style={[styles.proBody, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={styles.heroTitle}>{t('premium.proName')}</Text>
          <Text style={styles.heroBody}>{t('premium.proTagline')}</Text>
          <GradientButton
            title={t('premium.seePlans')}
            onPress={() => void handleModalPaywall()}
            disabled={busy}
          />
          <GradientButton
            title={t('premium.restore')}
            variant="ghost"
            onPress={() => void handleRestore()}
            disabled={busy}
          />
          <Pressable onPress={() => setFallbackMode(false)}>
            <Text style={styles.fallbackText}>{t('premium.showEmbedded')}</Text>
          </Pressable>
          {busy ? <ActivityIndicator color={palette.primary} /> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  screenTitle: {
    color: palette.textPrimary,
    fontFamily: fonts.bold,
    fontSize: 17,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnPlaceholder: { width: 40, height: 40 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  proBody: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 14,
    justifyContent: 'center',
  },
  hero: { alignItems: 'center', gap: 8, marginBottom: 12 },
  heroTitle: {
    color: palette.textPrimary,
    fontFamily: fonts.bold,
    fontSize: 24,
    textAlign: 'center',
  },
  heroBody: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  muted: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 13,
    textAlign: 'center',
  },
  webNote: {
    color: palette.warning,
    fontFamily: fonts.medium,
    fontSize: 14,
    textAlign: 'center',
  },
  paywallWrap: { flex: 1 },
  paywall: { flex: 1 },
  fallbackLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  fallbackText: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 12,
    textAlign: 'center',
  },
  legal: {
    color: palette.textDisabled,
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 8,
  },
});
