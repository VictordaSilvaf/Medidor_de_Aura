import { ChevronDown, Settings2, Timer } from "lucide-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { useAppDispatch, useAppSelector } from "@/src/core/hooks";
import {
  COUNTDOWN_OPTIONS,
  selectCountdownSeconds,
  setCountdownSeconds,
  type CountdownSeconds,
} from "@/src/features/prefs/prefsSlice";
import {
  fonts,
  useThemedStyles,
  usePalette,
  type AppPalette,
} from "@/src/shared/ui/theme";

type Props = {
  readonly disabled?: boolean;
};

function countdownLabel(value: CountdownSeconds, offText: string) {
  return value === 0 ? offText : `${value}s`;
}

export function CaptureSettingsIsland({ disabled = false }: Props) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const countdown = useAppSelector(selectCountdownSeconds);
  const [expanded, setExpanded] = useState(false);
  const offText = t("capture.countdownOff");
  const palette = usePalette();
  const styles = useThemedStyles(createStyles);

  useEffect(() => {
    if (disabled) setExpanded(false);
  }, [disabled]);

  return (
    <View style={styles.panel}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("capture.settingsIsland")}
        disabled={disabled}
        onPress={() => {
          if (disabled) return;
          setExpanded((open) => !open);
        }}
        style={[styles.header, disabled && styles.headerDisabled]}
      >
        <View style={styles.headerLeft}>
          <Settings2 size={15} color={palette.neon} strokeWidth={2} />
          <Text style={styles.headerTitle}>{t("capture.settingsIsland")}</Text>
        </View>
        <View style={styles.headerRight}>
          <Timer size={14} color={palette.textPrimary} strokeWidth={2} />
          <Text style={styles.headerValue}>
            {countdownLabel(countdown, offText)}
          </Text>
          <ChevronDown
            size={14}
            color={palette.textSecondary}
            strokeWidth={2}
            style={{ transform: [{ rotate: expanded ? "180deg" : "0deg" }] }}
          />
        </View>
      </Pressable>

      {expanded ? (
        <Animated.View
          entering={FadeIn.duration(160)}
          exiting={FadeOut.duration(100)}
          style={styles.body}
        >
          <Text style={styles.sectionLabel}>{t("capture.countdownLabel")}</Text>
          <View style={styles.chips}>
            {COUNTDOWN_OPTIONS.map((value) => {
              const active = countdown === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => dispatch(setCountdownSeconds(value))}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {countdownLabel(value, offText)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const createStyles = (palette: AppPalette) =>
  StyleSheet.create({
    panel: {
      width: "100%",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
      paddingVertical: 11,
      gap: 12,
    },
    headerDisabled: {
      opacity: 0.55,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    headerTitle: {
      color: palette.textSecondary,
      fontFamily: fonts.medium,
      fontSize: 12,
      letterSpacing: 0.6,
      textTransform: "uppercase",
    },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    headerValue: {
      color: palette.textPrimary,
      fontFamily: fonts.semibold,
      fontSize: 13,
    },
    body: {
      paddingHorizontal: 10,
      paddingBottom: 12,
      gap: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: palette.borderSubtle,
      paddingTop: 10,
    },
    sectionLabel: {
      color: palette.textDisabled,
      fontFamily: fonts.medium,
      fontSize: 11,
      letterSpacing: 0.8,
      textTransform: "uppercase",
      paddingHorizontal: 2,
    },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    chip: {
      minWidth: 52,
      alignItems: "center",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.borderSubtle,
      backgroundColor: palette.segmentIdle,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    chipActive: {
      borderColor: palette.primary,
      backgroundColor: `${palette.primary}22`,
    },
    chipText: {
      color: palette.textSecondary,
      fontFamily: fonts.semibold,
      fontSize: 13,
      fontVariant: ["tabular-nums"],
    },
    chipTextActive: {
      color: palette.textPrimary,
    },
  });
