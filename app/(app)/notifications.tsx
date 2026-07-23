import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/ui/text";
import { useAppSelector } from "@/src/core/hooks";
import { selectAuthUser } from "@/src/features/auth/authSlice";
import {
  fetchNotifications,
  markNotificationsRead,
} from "@/src/features/social/notificationsApi";
import { UserAvatar } from "@/src/shared/ui/UserAvatar";
import {
  fonts,
  useThemedStyles,
  usePalette,
  type AppPalette,
} from "@/src/shared/ui/theme";

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const user = useAppSelector(selectAuthUser);
  const palette = usePalette();
  const styles = useThemedStyles(createStyles);
  const { data = [], isLoading } = useQuery({
    queryKey: ["social-notifications", user?.id],
    queryFn: () => fetchNotifications(user!.id),
    enabled: Boolean(user?.id),
  });

  useEffect(() => {
    if (!user?.id || !data.some((item) => !item.read_at)) return;
    void markNotificationsRead(user.id).then(() =>
      queryClient.invalidateQueries({
        queryKey: ["social-notifications", user.id],
      }),
    );
  }, [data, queryClient, user?.id]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <ChevronLeft size={22} color={palette.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{t("notifications.title")}</Text>
        <View style={styles.iconButton} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={palette.primary} style={{ marginTop: 48 }} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 24,
            gap: 6,
            flexGrow: 1,
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>{t("notifications.empty")}</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.row, !item.read_at && styles.unread]}
              onPress={() => {
                if (item.analysis_id) {
                  router.push(`/(app)/post/${item.analysis_id}`);
                } else {
                  router.push(`/(app)/user/${item.actor.username}`);
                }
              }}
            >
              <UserAvatar
                uri={item.actor.avatar_url}
                name={item.actor.display_name}
                size={44}
              />
              <Text style={styles.body}>
                <Text style={styles.actor}>{item.actor.display_name}</Text>{" "}
                {t(`notifications.${item.type}`)}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const createStyles = (palette: AppPalette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: palette.bg },
    top: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
    },
    iconButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      color: palette.textPrimary,
      fontFamily: fonts.bold,
      fontSize: 17,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 12,
      borderRadius: 14,
    },
    unread: { backgroundColor: `${palette.primary}18` },
    body: {
      flex: 1,
      color: palette.textSecondary,
      fontFamily: fonts.regular,
      fontSize: 14,
      lineHeight: 20,
    },
    actor: { color: palette.textPrimary, fontFamily: fonts.semibold },
    empty: {
      color: palette.textSecondary,
      fontFamily: fonts.medium,
      textAlign: "center",
      marginTop: 48,
    },
  });
