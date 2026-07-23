import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/text";
import {
  subscribeAppAlert,
  type AppAlertButton,
  type AppAlertConfig,
  type AppAlertVariant,
} from "@/src/shared/ui/appAlert";
import {
  fonts,
  palette,
  useThemedStyles,
  usePalette,
  type AppPalette,
} from "@/src/shared/ui/theme";

const VARIANT: Record<
  AppAlertVariant,
  { color: string; bg: string; border: string; Icon: typeof Info }
> = {
  success: {
    color: palette.success,
    bg: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.35)",
    Icon: CheckCircle2,
  },
  warn: {
    color: palette.warning,
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.4)",
    Icon: AlertTriangle,
  },
  error: {
    color: palette.error,
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.4)",
    Icon: XCircle,
  },
  info: {
    color: palette.primary,
    bg: "rgba(109,93,252,0.12)",
    border: "rgba(109,93,252,0.4)",
    Icon: Info,
  },
};

export function AppAlertHost() {
  const { t } = useTranslation();
  const [config, setConfig] = useState<AppAlertConfig | null>(null);
  const palette = usePalette();
  const styles = useThemedStyles(createStyles);

  useEffect(() => subscribeAppAlert(setConfig), []);

  const close = () => setConfig(null);

  const handleButton = (button: AppAlertButton) => {
    close();
    // Defer so the modal unmounts before navigation / follow-up UI.
    requestAnimationFrame(() => button.onPress?.());
  };

  if (!config) return null;

  const theme = VARIANT[config.variant];
  const { Icon } = theme;
  const buttons = config.buttons?.length
    ? config.buttons
    : [{ text: t("common.ok") }];

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={close}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <View
          style={[
            styles.card,
            { borderColor: theme.border, backgroundColor: palette.surface },
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: theme.bg }]}>
            <Icon size={28} color={theme.color} strokeWidth={2.2} />
          </View>
          <Text style={styles.title}>{config.title}</Text>
          {config.message ? (
            <Text style={styles.message}>{config.message}</Text>
          ) : null}
          <View style={styles.actions}>
            {buttons.map((button, index) => {
              const destructive = button.style === "destructive";
              const cancel = button.style === "cancel";
              const primary =
                !cancel && !destructive && index === buttons.length - 1;
              return (
                <Pressable
                  key={`${button.text}-${index}`}
                  accessibilityRole="button"
                  onPress={() => handleButton(button)}
                  style={[
                    styles.button,
                    primary && { backgroundColor: theme.color },
                    cancel && styles.buttonCancel,
                    destructive && styles.buttonDestructive,
                  ]}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      primary && styles.buttonTextPrimary,
                      cancel && styles.buttonTextCancel,
                      destructive && styles.buttonTextDestructive,
                    ]}
                  >
                    {button.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (palette: AppPalette) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.72)",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 28,
    },
    card: {
      width: "100%",
      maxWidth: 360,
      borderRadius: 20,
      borderWidth: 1,
      paddingHorizontal: 22,
      paddingTop: 22,
      paddingBottom: 16,
      gap: 10,
    },
    iconWrap: {
      width: 52,
      height: 52,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
      marginBottom: 4,
    },
    title: {
      color: palette.textPrimary,
      fontFamily: fonts.bold,
      fontSize: 18,
      textAlign: "center",
    },
    message: {
      color: palette.textSecondary,
      fontFamily: fonts.regular,
      fontSize: 14,
      lineHeight: 20,
      textAlign: "center",
      marginBottom: 4,
    },
    actions: {
      marginTop: 8,
      gap: 8,
    },
    button: {
      borderRadius: 14,
      paddingVertical: 13,
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.06)",
    },
    buttonCancel: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: palette.borderSubtle,
    },
    buttonDestructive: {
      backgroundColor: "rgba(239,68,68,0.15)",
    },
    buttonText: {
      color: palette.textPrimary,
      fontFamily: fonts.semibold,
      fontSize: 15,
    },
    buttonTextPrimary: {
      color: "#FFFFFF",
    },
    buttonTextCancel: {
      color: palette.textSecondary,
    },
    buttonTextDestructive: {
      color: palette.error,
    },
  });
