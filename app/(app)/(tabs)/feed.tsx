import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { Heart, MessageCircle, Plus, Swords } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/ui/text";
import { Image } from "expo-image";
import { useAppSelector } from "@/src/core/hooks";
import { TIER_BY_ID } from "@/src/features/aura/tiers";
import { selectAuthUser } from "@/src/features/auth/authSlice";
import { likePost, unlikePost } from "@/src/features/social/engagementApi";
import { fetchPublicFeed } from "@/src/features/social/socialApi";
import type { FeedPost } from "@/src/features/social/types";
import { AppMenuButton } from "@/src/shared/ui/AppMenuSheet";
import { GradientButton } from "@/src/shared/ui/GradientButton";
import { UserAvatar } from "@/src/shared/ui/UserAvatar";
import {
  fonts,
  useThemedStyles,
  usePalette,
  type AppPalette,
} from "@/src/shared/ui/theme";

function FeedSkeleton() {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.skeletonList}>
      {[0, 1, 2].map((item) => (
        <Animated.View
          key={item}
          entering={FadeIn.delay(item * 90).duration(260)}
          style={styles.skeletonCard}
        >
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonBody}>
            <View style={styles.skeletonLineWide} />
            <View style={styles.skeletonLine} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

function FeedCard({
  item,
  onOpen,
  onProfile,
  onDuel,
  onToggleLike,
  canDuel,
  likePending,
}: {
  item: FeedPost;
  onOpen: () => void;
  onProfile: () => void;
  onDuel: () => void;
  onToggleLike: () => void;
  canDuel: boolean;
  likePending: boolean;
}) {
  const { t } = useTranslation();
  const tier = TIER_BY_ID[item.tier_id as keyof typeof TIER_BY_ID];
  const player = useVideoPlayer(item.video_url, (instance) => {
    instance.loop = true;
    instance.muted = true;
  });
  const palette = usePalette();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable onPress={onOpen} style={styles.card}>
      <View style={styles.cardTop}>
        <Pressable onPress={onProfile} style={styles.cardTopPress}>
          <UserAvatar
            uri={item.avatar_url}
            name={item.display_name}
            size={42}
            accentColor={tier?.color}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.display_name}</Text>
            <Text style={styles.meta}>
              {t("feed.by", { username: item.username })} · Lv {item.level}
            </Text>
          </View>
        </Pressable>
        <Text
          style={[styles.tier, { color: tier?.color ?? palette.textPrimary }]}
        >
          {tier?.label ?? item.tier_id}
        </Text>
      </View>
      {item.title ? (
        <Text style={styles.postTitle} numberOfLines={2}>
          {item.title}
        </Text>
      ) : null}
      <Text style={styles.score}>{t("feed.score", { score: item.score })}</Text>
      {item.video_url ? (
        <VideoView
          player={player}
          style={styles.video}
          nativeControls
          contentFit="cover"
        />
      ) : item.thumbnail_md_url || item.thumbnail_lg_url ? (
        <Image
          source={{
            uri: item.thumbnail_lg_url ?? item.thumbnail_md_url ?? undefined,
          }}
          style={styles.video}
          contentFit="cover"
        />
      ) : null}

      <View style={styles.engageRow}>
        <Pressable
          style={styles.engageBtn}
          onPress={(e) => {
            e.stopPropagation?.();
            onToggleLike();
          }}
          disabled={likePending}
          hitSlop={8}
        >
          <Heart
            size={18}
            color={item.liked_by_me ? palette.error : palette.textSecondary}
            fill={item.liked_by_me ? palette.error : "transparent"}
          />
          <Text style={styles.engageCount}>{item.like_count}</Text>
        </Pressable>
        <Pressable style={styles.engageBtn} onPress={onOpen} hitSlop={8}>
          <MessageCircle size={18} color={palette.textSecondary} />
          <Text style={styles.engageCount}>{item.comment_count}</Text>
        </Pressable>
      </View>

      {canDuel ? (
        <GradientButton
          title={t("feed.duel")}
          icon={<Swords size={16} color="#FFF" />}
          onPress={onDuel}
          style={{ marginTop: 12 }}
        />
      ) : null}
    </Pressable>
  );
}

export default function FeedScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAppSelector(selectAuthUser);
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"all" | "following">("all");
  const palette = usePalette();
  const styles = useThemedStyles(createStyles);

  const {
    data: pages,
    isLoading,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["feed", user?.id, mode],
    queryFn: ({ pageParam }) => fetchPublicFeed(12, user?.id, pageParam, mode),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === 12 ? allPages.length * 12 : undefined,
  });
  const data = pages?.pages.flat() ?? [];

  const likeMutation = useMutation({
    mutationFn: async (item: FeedPost) => {
      if (!user?.id) return;
      if (item.liked_by_me) {
        await unlikePost(item.id, user.id);
      } else {
        await likePost(item.id, user.id);
      }
    },
    onMutate: async (item) => {
      const key = ["feed", user?.id, mode] as const;
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<InfiniteData<FeedPost[]>>(key);
      queryClient.setQueryData<InfiniteData<FeedPost[]>>(key, (old) =>
        old
          ? {
              ...old,
              pages: old.pages.map((page) =>
                page.map((p) =>
                  p.id === item.id
                    ? {
                        ...p,
                        liked_by_me: !p.liked_by_me,
                        like_count: p.liked_by_me
                          ? Math.max(0, p.like_count - 1)
                          : p.like_count + 1,
                      }
                    : p,
                ),
              ),
            }
          : old,
      );
      return { prev, key };
    },
    onError: (_err, _item, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(ctx.key, ctx.prev);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ["feed", user?.id, mode],
      });
    },
  });

  const modeSwitch = (
    <View style={styles.modeSwitch}>
      {(["all", "following"] as const).map((option) => (
        <Pressable
          key={option}
          onPress={() => setMode(option)}
          style={[
            styles.modeButton,
            mode === option && styles.modeButtonActive,
          ]}
        >
          <Text
            style={[styles.modeText, mode === option && styles.modeTextActive]}
          >
            {t(option === "all" ? "engagement.forYou" : "engagement.following")}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <AppMenuButton />
          <Text style={styles.title}>{t("feed.title")}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("feed.record")}
          onPress={() => router.push("/(app)/capture")}
          style={styles.recordBtn}
        >
          <Plus size={22} color="#FFF" strokeWidth={2.4} />
        </Pressable>
      </View>
      {modeSwitch}

      {isLoading ? (
        <FeedSkeleton />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 24,
            gap: 14,
            flexGrow: 1,
          }}
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator color={palette.primary} />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.empty}>{t("feed.empty")}</Text>
              <GradientButton
                title={t("feed.record")}
                icon={<Plus size={18} color="#FFF" strokeWidth={2.2} />}
                onPress={() => router.push("/(app)/capture")}
                style={{ marginTop: 16, alignSelf: "stretch" }}
              />
            </View>
          }
          renderItem={({ item }) => (
            <FeedCard
              item={item}
              canDuel={item.user_id !== user?.id}
              likePending={
                likeMutation.isPending && likeMutation.variables?.id === item.id
              }
              onOpen={() => router.push(`/(app)/post/${item.id}`)}
              onProfile={() => router.push(`/(app)/user/${item.username}`)}
              onDuel={() => router.push(`/(app)/post/${item.id}`)}
              onToggleLike={() => likeMutation.mutate(item)}
            />
          )}
        />
      )}
    </View>
  );
}

const createStyles = (palette: AppPalette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: palette.bg },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    title: {
      color: palette.textPrimary,
      fontFamily: fonts.bold,
      fontSize: 24,
    },
    modeSwitch: {
      flexDirection: "row",
      marginHorizontal: 20,
      marginBottom: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.borderSubtle,
    },
    modeButton: {
      flex: 1,
      alignItems: "center",
      paddingBottom: 10,
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
    },
    modeButtonActive: { borderBottomColor: palette.primary },
    modeText: {
      color: palette.textDisabled,
      fontFamily: fonts.medium,
      fontSize: 13,
    },
    modeTextActive: { color: palette.textPrimary },
    recordBtn: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: palette.primary,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: palette.primary,
      shadowOpacity: 0.35,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    emptyWrap: {
      marginTop: 48,
      paddingHorizontal: 12,
      alignItems: "center",
    },
    skeletonList: { paddingHorizontal: 20, gap: 14 },
    skeletonCard: {
      height: 132,
      flexDirection: "row",
      gap: 12,
      borderRadius: 18,
      padding: 16,
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.borderSubtle,
    },
    skeletonAvatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: palette.surface,
    },
    skeletonBody: { flex: 1, gap: 10, paddingTop: 4 },
    skeletonLineWide: {
      width: "72%",
      height: 12,
      borderRadius: 6,
      backgroundColor: palette.surface,
    },
    skeletonLine: {
      width: "44%",
      height: 10,
      borderRadius: 5,
      backgroundColor: palette.surface,
    },
    empty: {
      color: palette.textSecondary,
      fontFamily: fonts.medium,
      textAlign: "center",
    },
    card: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: palette.borderSubtle,
      backgroundColor: palette.card,
      padding: 16,
    },
    cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
    cardTopPress: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    name: {
      color: palette.textPrimary,
      fontFamily: fonts.semibold,
      fontSize: 15,
    },
    meta: {
      color: palette.textSecondary,
      fontFamily: fonts.regular,
      fontSize: 12,
      marginTop: 2,
    },
    tier: { fontFamily: fonts.semibold, fontSize: 13 },
    score: {
      color: palette.textPrimary,
      fontFamily: fonts.bold,
      fontSize: 22,
      marginTop: 14,
    },
    postTitle: {
      color: palette.textSecondary,
      fontFamily: fonts.medium,
      fontSize: 14,
      marginTop: 8,
    },
    video: {
      width: "100%",
      aspectRatio: 9 / 14,
      marginTop: 14,
      borderRadius: 14,
      backgroundColor: palette.bgSecondary,
    },
    engageRow: {
      flexDirection: "row",
      gap: 20,
      marginTop: 12,
    },
    engageBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    engageCount: {
      color: palette.textSecondary,
      fontFamily: fonts.medium,
      fontSize: 13,
    },
  });
