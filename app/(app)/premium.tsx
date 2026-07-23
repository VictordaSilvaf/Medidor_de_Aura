import { useRouter } from "expo-router";
import { ChevronLeft, Crown, Sparkles } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import type { CustomerInfo, PurchasesError } from "react-native-purchases";
import RevenueCatUI from "react-native-purchases-ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/ui/text";
import { useAppDispatch, useAppSelector } from "@/src/core/hooks";
import { selectAuthUser } from "@/src/features/auth/authSlice";
import {
  presentCustomerCenter,
  presentProPaywall,
  refreshCustomerInfo,
  restoreSubscriptions,
  syncProfileFromCustomerInfo,
} from "@/src/features/monetization/monetizationBootstrap";
import {
  hasProEntitlement,
  isUserCancelledPurchase,
  revenueCatMonetization,
  tierFromCustomerInfo,
} from "@/src/features/monetization/revenueCatAdapter";
import { RC_PRO_ENTITLEMENT } from "@/src/features/monetization/revenueCatConfig";
import { MonetizationNotConfiguredError } from "@/src/features/monetization/types";
import {
  SUBSCRIPTION_TIER_COLORS,
  TIER_LIMITS,
  tierLabelKey,
} from "@/src/features/monetization/subscriptionTiers";
import { selectSubscriptionTier } from "@/src/features/social/profileSlice";
import { GradientButton } from "@/src/shared/ui/GradientButton";
import { appAlert } from "@/src/shared/ui/appAlert";
import {
  fonts,
  useThemedStyles,
  usePalette,
  type AppPalette,
} from "@/src/shared/ui/theme";

/**
 * Subscription screen.
 * - Free (native): embedded RevenueCat Paywall (no auto-dismiss / back)
 * - Pro: manage via Customer Center
 * Header back is the only way to leave without purchasing.
 */
export default function PremiumScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const currentTier = useAppSelector(selectSubscriptionTier);

  const [isPro, setIsPro] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mounted = useRef(true);
  const palette = usePalette();
  const styles = useThemedStyles(createStyles);

  const accent = SUBSCRIPTION_TIER_COLORS[isPro ? currentTier : "lendario"];
  const limits = TIER_LIMITS[currentTier === "free" ? "lendario" : currentTier];

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(app)/(tabs)");
  }, [router]);

  const applyInfo = useCallback(
    (info: CustomerInfo) => {
      if (!user?.id) return;
      syncProfileFromCustomerInfo(dispatch, user.id, info);
      setIsPro(hasProEntitlement(info));
    },
    [dispatch, user?.id],
  );

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;

    const boot = async () => {
      if (!user?.id) {
        if (!cancelled) {
          setChecking(false);
          setErrorMessage(t("premium.notConfiguredBody"));
        }
        return;
      }

      if (Platform.OS === "web") {
        if (!cancelled) {
          setChecking(false);
          setIsPro(currentTier !== "free");
        }
        return;
      }

      if (!revenueCatMonetization.isConfigured()) {
        if (!cancelled) {
          setChecking(false);
          setIsPro(currentTier !== "free");
          setErrorMessage(t("premium.notConfiguredBody"));
        }
        return;
      }

      // Don't hang forever on "checking…"
      const timeout = setTimeout(() => {
        if (!cancelled && mounted.current) {
          setChecking(false);
          setShowPaywall(true);
        }
      }, 4000);

      try {
        await revenueCatMonetization.configure(user.id);
        const { isPro: pro } = await refreshCustomerInfo(dispatch, user.id);
        if (cancelled) return;
        setIsPro(pro);
        setShowPaywall(!pro);
        setErrorMessage(null);
      } catch (error) {
        if (cancelled) return;
        setIsPro(currentTier !== "free");
        setShowPaywall(currentTier === "free");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : t("premium.notConfiguredBody"),
        );
      } finally {
        clearTimeout(timeout);
        if (!cancelled) setChecking(false);
      }
    };

    void boot();
    return () => {
      cancelled = true;
      mounted.current = false;
    };
  }, [currentTier, dispatch, t, user?.id]);

  const handlePurchaseCompleted = useCallback(
    ({ customerInfo }: { customerInfo: CustomerInfo }) => {
      setBusy(false);
      applyInfo(customerInfo);
      setShowPaywall(false);
      appAlert.success(
        t("premium.successTitle"),
        t("premium.successBody", {
          tier: t(tierLabelKey(tierFromCustomerInfo(customerInfo))),
        }),
      );
    },
    [applyInfo, t],
  );

  const handleRestoreCompleted = useCallback(
    ({ customerInfo }: { customerInfo: CustomerInfo }) => {
      setBusy(false);
      applyInfo(customerInfo);
      if (hasProEntitlement(customerInfo)) {
        setShowPaywall(false);
        appAlert.success(
          t("premium.restoreTitle"),
          t("premium.restoreSuccess", {
            tier: t(tierLabelKey(tierFromCustomerInfo(customerInfo))),
          }),
        );
      } else {
        appAlert.warn(t("premium.restoreTitle"), t("premium.restoreEmpty"));
      }
    },
    [applyInfo, t],
  );

  const handlePurchaseError = useCallback(
    ({ error }: { error: PurchasesError }) => {
      setBusy(false);
      if (isUserCancelledPurchase(error)) return;
      appAlert.error(t("common.error"), error.message || t("common.error"));
    },
    [t],
  );

  const handleModalPaywall = useCallback(async () => {
    if (!user?.id) return;
    setBusy(true);
    try {
      const {
        purchased,
        isPro: pro,
        tier,
      } = await presentProPaywall(dispatch, user.id);
      setIsPro(pro);
      if (pro) setShowPaywall(false);
      if (purchased && pro) {
        appAlert.success(
          t("premium.successTitle"),
          t("premium.successBody", { tier: t(tierLabelKey(tier)) }),
        );
      }
    } catch (error) {
      if (error instanceof MonetizationNotConfiguredError) {
        appAlert.warn(
          t("premium.notConfiguredTitle"),
          t("premium.notConfiguredBody"),
        );
      } else if (!isUserCancelledPurchase(error)) {
        appAlert.error(
          t("common.error"),
          error instanceof Error ? error.message : t("common.error"),
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
      setShowPaywall(!pro);
    } catch (error) {
      if (error instanceof MonetizationNotConfiguredError) {
        appAlert.warn(
          t("premium.notConfiguredTitle"),
          t("premium.notConfiguredBody"),
        );
      } else {
        appAlert.error(
          t("common.error"),
          error instanceof Error ? error.message : t("common.error"),
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
      const { tier, isPro: pro } = await restoreSubscriptions(
        dispatch,
        user.id,
      );
      setIsPro(pro);
      if (pro) setShowPaywall(false);
      if (!pro) {
        appAlert.warn(t("premium.restoreTitle"), t("premium.restoreEmpty"));
      } else {
        appAlert.success(
          t("premium.restoreTitle"),
          t("premium.restoreSuccess", { tier: t(tierLabelKey(tier)) }),
        );
      }
    } catch (error) {
      if (error instanceof MonetizationNotConfiguredError) {
        appAlert.warn(
          t("premium.notConfiguredTitle"),
          t("premium.notConfiguredBody"),
        );
      } else {
        appAlert.error(
          t("common.error"),
          error instanceof Error ? error.message : t("common.error"),
        );
      }
    } finally {
      setBusy(false);
    }
  }, [dispatch, t, user?.id]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={goBack}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          hitSlop={12}
        >
          <ChevronLeft size={22} color={palette.textPrimary} />
        </Pressable>
        <Text style={styles.screenTitle}>{t("premium.title")}</Text>
        <View style={styles.iconBtnPlaceholder} />
      </View>

      {checking ? (
        <View style={styles.centered}>
          <ActivityIndicator color={palette.primary} size="large" />
          <Text style={styles.muted}>{t("premium.checking")}</Text>
        </View>
      ) : null}

      {!checking && Platform.OS === "web" ? (
        <View style={styles.centered}>
          <Text style={styles.webNote}>{t("premium.webNote")}</Text>
          <GradientButton title={t("common.back")} onPress={goBack} />
        </View>
      ) : null}

      {!checking && isPro && Platform.OS !== "web" ? (
        <View style={[styles.proBody, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.hero}>
            <Sparkles size={28} color={palette.neon} />
            <Text style={[styles.heroTitle, { color: accent }]}>
              {t("premium.proName")}
            </Text>
            <Text style={styles.heroBody}>
              {t("premium.proActive", { entitlement: RC_PRO_ENTITLEMENT })}
            </Text>
            <Text style={styles.muted}>
              {t("premium.dailyQuota", { count: limits.daily })}
              {" · "}
              {t("premium.monthlyQuota", { count: limits.monthly })}
            </Text>
          </View>
          <GradientButton
            title={t("premium.manage")}
            onPress={() => void handleCustomerCenter()}
            disabled={busy}
          />
          <GradientButton
            title={t("premium.restore")}
            variant="ghost"
            onPress={() => void handleRestore()}
            disabled={busy}
          />
          {busy ? <ActivityIndicator color={palette.primary} /> : null}
          <Text style={styles.legal}>{t("premium.legal")}</Text>
        </View>
      ) : null}

      {!checking && !isPro && Platform.OS !== "web" && showPaywall ? (
        <View style={styles.paywallWrap}>
          <RevenueCatUI.Paywall
            style={styles.paywall}
            options={{
              // Keep users on this screen; only our header navigates back.
              displayCloseButton: false,
            }}
            onPurchaseStarted={() => setBusy(true)}
            onPurchaseCompleted={handlePurchaseCompleted}
            onPurchaseError={handlePurchaseError}
            onPurchaseCancelled={() => setBusy(false)}
            onRestoreStarted={() => setBusy(true)}
            onRestoreCompleted={handleRestoreCompleted}
            onRestoreError={({ error }) => {
              setBusy(false);
              appAlert.error(t("common.error"), error.message);
            }}
            onDismiss={() => {
              // Do NOT router.back() — RC sometimes fires dismiss without user intent.
              setBusy(false);
              if (user?.id) {
                void refreshCustomerInfo(dispatch, user.id).then(
                  ({ isPro: pro }) => {
                    if (mounted.current) {
                      setIsPro(pro);
                      if (pro) setShowPaywall(false);
                    }
                  },
                );
              }
            }}
          />
          <View
            style={[styles.footerActions, { paddingBottom: insets.bottom + 8 }]}
          >
            <GradientButton
              title={t("premium.openModalPaywall")}
              variant="ghost"
              onPress={() => void handleModalPaywall()}
              disabled={busy}
            />
            <GradientButton
              title={t("premium.restore")}
              variant="ghost"
              onPress={() => void handleRestore()}
              disabled={busy}
            />
          </View>
        </View>
      ) : null}

      {!checking &&
      !isPro &&
      Platform.OS !== "web" &&
      !showPaywall &&
      errorMessage ? (
        <View style={[styles.proBody, { paddingBottom: insets.bottom + 24 }]}>
          <Crown size={28} color={palette.neon} />
          <Text style={styles.heroTitle}>{t("premium.proName")}</Text>
          <Text style={styles.heroBody}>{errorMessage}</Text>
          <GradientButton
            title={t("premium.seePlans")}
            onPress={() => {
              setErrorMessage(null);
              setShowPaywall(true);
              void handleModalPaywall();
            }}
            disabled={busy}
          />
          <GradientButton
            title={t("premium.restore")}
            variant="ghost"
            onPress={() => void handleRestore()}
            disabled={busy}
          />
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (palette: AppPalette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: palette.bg },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      marginBottom: 4,
      zIndex: 2,
    },
    screenTitle: {
      color: palette.textPrimary,
      fontFamily: fonts.bold,
      fontSize: 17,
    },
    iconBtn: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    iconBtnPlaceholder: { width: 40, height: 40 },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      paddingHorizontal: 24,
    },
    proBody: {
      flex: 1,
      paddingHorizontal: 20,
      gap: 14,
      justifyContent: "center",
      alignItems: "center",
    },
    hero: { alignItems: "center", gap: 8, marginBottom: 12 },
    heroTitle: {
      color: palette.textPrimary,
      fontFamily: fonts.bold,
      fontSize: 24,
      textAlign: "center",
    },
    heroBody: {
      color: palette.textSecondary,
      fontFamily: fonts.medium,
      fontSize: 14,
      textAlign: "center",
      lineHeight: 20,
    },
    muted: {
      color: palette.textSecondary,
      fontFamily: fonts.medium,
      fontSize: 13,
      textAlign: "center",
    },
    webNote: {
      color: palette.warning,
      fontFamily: fonts.medium,
      fontSize: 14,
      textAlign: "center",
      marginBottom: 16,
    },
    paywallWrap: { flex: 1 },
    paywall: { flex: 1 },
    footerActions: {
      gap: 4,
      paddingHorizontal: 16,
      paddingTop: 4,
    },
    legal: {
      color: palette.textDisabled,
      fontFamily: fonts.regular,
      fontSize: 11,
      lineHeight: 16,
      textAlign: "center",
      marginTop: 8,
    },
  });
