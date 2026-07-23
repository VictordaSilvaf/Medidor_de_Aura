import { Crown, Upload, Zap } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/text";
import type { AnalysisQuotaUsage } from "@/src/features/monetization/quotaApi";
import {
  isPaidTier,
  SUBSCRIPTION_TIER_COLORS,
  tierLabelKey,
} from "@/src/features/monetization/subscriptionTiers";
import {
  fonts,
  useThemedStyles,
  usePalette,
  type AppPalette,
} from "@/src/shared/ui/theme";

function Meter({
  label,
  used,
  limit,
  remaining,
  accent,
}: {
  label: string;
  used: number;
  limit: number;
  remaining: number;
  accent: string;
}) {
  const ratio = limit > 0 ? Math.min(1, used / limit) : 1;
  const depleted = remaining <= 0;
  const palette = usePalette();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.meter}>
      <View style={styles.meterHeader}>
        <Text style={styles.meterLabel}>{label}</Text>
        <Text
          style={[
            styles.meterValue,
            depleted ? { color: palette.error } : { color: accent },
          ]}
        >
          {remaining}/{limit}
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${Math.round(ratio * 100)}%`,
              backgroundColor: depleted ? palette.error : accent,
            },
          ]}
        />
      </View>
      <Text style={styles.meterHint}>
        {used} / {limit}
      </Text>
    </View>
  );
}

export function QuotaUsageCard({
  usage,
  onPressUpgrade,
}: {
  usage: AnalysisQuotaUsage;
  onPressUpgrade?: () => void;
}) {
  const { t } = useTranslation();
  const accent = SUBSCRIPTION_TIER_COLORS[usage.tier];
  const remaining = Math.min(usage.dailyRemaining, usage.monthlyRemaining);
  const depleted = remaining <= 0;
  const palette = usePalette();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.card, { borderColor: `${accent}44` }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrap, { borderColor: `${accent}55` }]}>
          <Upload size={16} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{t("profile.quotaTitle")}</Text>
          <Text style={styles.cardSubtitle}>
            {t("premium.yourPlan", { tier: t(tierLabelKey(usage.tier)) })}
          </Text>
        </View>
        <View style={[styles.remainingPill, { borderColor: `${accent}55` }]}>
          <Text style={[styles.remainingPillText, { color: accent }]}>
            {depleted
              ? t("profile.quotaDepleted")
              : t("profile.quotaRemainingShort", { count: remaining })}
          </Text>
        </View>
      </View>

      <Text style={styles.summary}>
        {t("profile.quotaSummary", { count: remaining })}
      </Text>

      <Meter
        label={t("profile.quotaDaily")}
        used={usage.dailyUsed}
        limit={usage.dailyLimit}
        remaining={usage.dailyRemaining}
        accent={accent}
      />
      <Meter
        label={t("profile.quotaMonthly")}
        used={usage.monthlyUsed}
        limit={usage.monthlyLimit}
        remaining={usage.monthlyRemaining}
        accent={accent}
      />

      <View style={styles.metaRow}>
        <Zap size={14} color={palette.textSecondary} />
        <Text style={styles.metaText}>
          {t("premium.priority", { level: usage.priority })}
        </Text>
      </View>

      {onPressUpgrade ? (
        <Pressable
          accessibilityRole="button"
          onPress={onPressUpgrade}
          style={styles.upgradeRow}
        >
          <Crown size={14} color={palette.neon} />
          <Text style={styles.upgradeText}>
            {isPaidTier(usage.tier)
              ? t("premium.upgrade")
              : t("premium.ctaHub")}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (palette: AppPalette) =>
  StyleSheet.create({
    card: {
      borderRadius: 16,
      borderWidth: 1,
      backgroundColor: palette.card,
      padding: 14,
      gap: 12,
      marginBottom: 16,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: palette.segmentIdle,
    },
    cardTitle: {
      color: palette.textPrimary,
      fontFamily: fonts.semibold,
      fontSize: 15,
    },
    cardSubtitle: {
      color: palette.textSecondary,
      fontFamily: fonts.medium,
      fontSize: 12,
      marginTop: 2,
    },
    remainingPill: {
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    remainingPillText: {
      fontFamily: fonts.semibold,
      fontSize: 11,
    },
    summary: {
      color: palette.textSecondary,
      fontFamily: fonts.medium,
      fontSize: 13,
      lineHeight: 18,
    },
    meter: {
      gap: 6,
    },
    meterHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    meterLabel: {
      color: palette.textSecondary,
      fontFamily: fonts.medium,
      fontSize: 12,
    },
    meterValue: {
      fontFamily: fonts.bold,
      fontSize: 13,
      fontVariant: ["tabular-nums"],
    },
    meterHint: {
      color: palette.textDisabled,
      fontFamily: fonts.regular,
      fontSize: 11,
    },
    track: {
      height: 6,
      borderRadius: 3,
      overflow: "hidden",
      backgroundColor: palette.borderSubtle,
    },
    fill: {
      height: "100%",
      borderRadius: 3,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    metaText: {
      color: palette.textSecondary,
      fontFamily: fonts.medium,
      fontSize: 12,
    },
    upgradeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingTop: 4,
    },
    upgradeText: {
      color: palette.neon,
      fontFamily: fonts.semibold,
      fontSize: 13,
    },
  });
