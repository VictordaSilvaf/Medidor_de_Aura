import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import {
  brandGradient,
  fonts,
  radius,
  useThemedStyles,
  usePalette,
  type AppPalette,
} from "@/src/shared/ui/theme";

type GradientButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** primary = gradiente da marca; ghost = surface discreta com borda. */
  variant?: "primary" | "ghost";
  icon?: ReactNode;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function GradientButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
  icon,
  accessibilityLabel,
  style,
}: GradientButtonProps) {
  const scale = useSharedValue(1);
  const palette = usePalette();
  const styles = useThemedStyles(createStyles);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const content = (
    <View style={styles.content}>
      {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : icon}
      <Text
        style={[
          styles.label,
          variant === "ghost" && { color: palette.textPrimary },
        ]}
      >
        {title}
      </Text>
    </View>
  );

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityState={{ disabled: disabled || loading }}
        disabled={disabled || loading}
        onPress={onPress}
        onPressIn={() => {
          scale.set(withTiming(0.97, { duration: 110 }));
        }}
        onPressOut={() => {
          scale.set(withTiming(1, { duration: 160 }));
        }}
        style={[styles.pressable, (disabled || loading) && styles.disabled]}
      >
        {variant === "primary" ? (
          <LinearGradient
            colors={[...brandGradient]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.fill, styles.glow]}
          >
            {content}
          </LinearGradient>
        ) : (
          <View style={[styles.fill, styles.ghost]}>{content}</View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const createStyles = (palette: AppPalette) =>
  StyleSheet.create({
    pressable: {
      borderRadius: radius.button,
    },
    disabled: {
      opacity: 0.5,
    },
    fill: {
      minHeight: 56,
      borderRadius: radius.button,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
    },
    glow: {
      boxShadow: `0 6px 28px -6px ${palette.primary}80`,
    },
    ghost: {
      backgroundColor: palette.segmentIdle,
      borderWidth: 1,
      borderColor: palette.borderSubtle,
    },
    content: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    label: {
      color: "#FFFFFF",
      fontFamily: fonts.semibold,
      fontSize: 17,
      letterSpacing: 0.2,
    },
  });
