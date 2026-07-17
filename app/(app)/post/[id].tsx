import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
  ChevronLeft,
  Flag,
  Heart,
  MessageCircle,
  Send,
  Share2,
  Swords,
  Trash2,
} from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppDispatch, useAppSelector } from '@/src/core/hooks';
import { TIER_BY_ID } from '@/src/features/aura/tiers';
import { selectAuthUser } from '@/src/features/auth/authSlice';
import {
  addComment,
  fetchComments,
  likeComment,
  likePost,
  softDeleteComment,
  unlikeComment,
  unlikePost,
} from '@/src/features/social/engagementApi';
import { reportContent } from '@/src/features/social/notificationsApi';
import {
  createDuelChallenge,
  fetchPublicPost,
} from '@/src/features/social/socialApi';
import type { PostComment } from '@/src/features/social/types';
import { setActiveChallengeId } from '@/src/features/video-analysis/pendingCaptureSlice';
import { GradientButton } from '@/src/shared/ui/GradientButton';
import { UserAvatar } from '@/src/shared/ui/UserAvatar';
import { fonts, palette } from '@/src/shared/ui/theme';

export default function PostDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const user = useAppSelector(selectAuthUser);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [startingDuel, setStartingDuel] = useState(false);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<PostComment | null>(null);

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['post', id, user?.id],
    queryFn: () => fetchPublicPost(id!, user?.id),
    enabled: Boolean(id),
  });
  const player = useVideoPlayer(data?.video_url ?? null, (instance) => {
    instance.loop = true;
  });

  const {
    data: commentPages,
    isLoading: commentsLoading,
    fetchNextPage: fetchMoreComments,
    hasNextPage: hasMoreComments,
    isFetchingNextPage: isFetchingMoreComments,
  } = useInfiniteQuery({
    queryKey: ['comments', id, user?.id],
    queryFn: ({ pageParam }) =>
      fetchComments(id!, user?.id, 30, pageParam),
    enabled: Boolean(id),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === 30 ? pages.length * 30 : undefined,
  });
  const comments = commentPages?.pages.flat() ?? [];

  const invalidateEngagement = () => {
    void queryClient.invalidateQueries({ queryKey: ['post', id] });
    void queryClient.invalidateQueries({ queryKey: ['comments', id] });
    void queryClient.invalidateQueries({ queryKey: ['feed'] });
  };

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !id) return;
      if (data?.liked_by_me) {
        await unlikePost(id, user.id);
      } else {
        await likePost(id, user.id);
      }
    },
    onSuccess: invalidateEngagement,
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !id) return;
      await addComment({
        analysisId: id,
        userId: user.id,
        body: draft,
        parentId: replyTo?.id,
      });
    },
    onSuccess: () => {
      setDraft('');
      setReplyTo(null);
      invalidateEngagement();
    },
    onError: (err) => {
      Alert.alert(
        t('common.error'),
        err instanceof Error ? err.message : t('common.error'),
      );
    },
  });

  const commentLikeMutation = useMutation({
    mutationFn: async (comment: PostComment) => {
      if (!user?.id) return;
      if (comment.liked_by_me) {
        await unlikeComment(comment.id, user.id);
      } else {
        await likeComment(comment.id, user.id);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comments', id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (commentId: string) => {
      if (!user?.id) return;
      await softDeleteComment(commentId, user.id);
    },
    onSuccess: invalidateEngagement,
  });

  const startDuel = async () => {
    if (!user?.id || !data?.analysis || !data.result || !data.profile) return;
    if (data.analysis.user_id === user.id) return;
    setStartingDuel(true);
    try {
      const challenge = await createDuelChallenge({
        challengerUserId: user.id,
        opponentUserId: data.analysis.user_id,
        opponentAnalysisId: data.analysis.id,
        opponentScore: data.result.score,
        opponentUsername: data.profile.username,
      });
      dispatch(setActiveChallengeId(challenge.id));
      router.push('/(app)/capture');
    } catch (err) {
      Alert.alert(
        t('common.error'),
        err instanceof Error ? err.message : t('common.error'),
      );
    } finally {
      setStartingDuel(false);
    }
  };

  const sharePost = async () => {
    if (!id) return;
    await Share.share({
      message: `${t('post.title')} · ${Linking.createURL(`/post/${id}`)}`,
    });
  };

  const reportPost = () => {
    if (!user?.id || !id || !data?.analysis) return;
    Alert.alert(t('safety.report'), t('safety.reason'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('safety.report'),
        style: 'destructive',
        onPress: () => {
          void reportContent({
            reporterId: user.id,
            reportedUserId: data.analysis.user_id,
            analysisId: id,
            reason: t('safety.reason'),
          }).then(() => Alert.alert(t('safety.reportSent')));
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  if (error || !data?.analysis || !data.result || !data.profile) {
    return (
      <View style={[styles.root, styles.centered, { padding: 24 }]}>
        <Text style={styles.error}>
          {error instanceof Error ? error.message : t('post.privateBlocked')}
        </Text>
        <GradientButton title={t('common.back')} onPress={() => router.back()} />
      </View>
    );
  }

  const tier = TIER_BY_ID[data.result.tier_id as keyof typeof TIER_BY_ID];
  const canDuel = data.analysis.user_id !== user?.id;
  const likeCount = data.analysis.like_count ?? 0;
  const commentCount = data.analysis.comment_count ?? 0;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top + 8 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={8}
    >
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <ChevronLeft size={22} color={palette.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{t('post.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        onEndReached={() => {
          if (hasMoreComments && !isFetchingMoreComments) {
            void fetchMoreComments();
          }
        }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          isFetchingMoreComments ? (
            <ActivityIndicator color={palette.primary} />
          ) : null
        }
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 16,
          flexGrow: 1,
        }}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Pressable
              style={styles.authorRow}
              onPress={() =>
                router.push(`/(app)/user/${data.profile!.username}`)
              }
            >
              <UserAvatar
                uri={data.profile.avatar_url}
                name={data.profile.display_name}
                size={48}
                accentColor={tier?.color}
              />
              <View>
                <Text style={styles.displayName}>
                  {data.profile.display_name}
                </Text>
                <Text style={styles.username}>@{data.profile.username}</Text>
              </View>
            </Pressable>

            {data.video_url ? (
              <VideoView
                player={player}
                style={styles.video}
                nativeControls
                contentFit="cover"
              />
            ) : null}

            <Text
              style={[styles.tier, { color: tier?.color ?? palette.textPrimary }]}
            >
              {tier?.label ?? data.result.tier_id}
            </Text>
            <Text style={styles.score}>+{data.result.score}</Text>

            <View style={styles.engageRow}>
              <Pressable
                style={styles.engageBtn}
                onPress={() => likeMutation.mutate()}
                disabled={!user?.id || likeMutation.isPending}
              >
                <Heart
                  size={22}
                  color={data.liked_by_me ? palette.error : palette.textPrimary}
                  fill={data.liked_by_me ? palette.error : 'transparent'}
                />
                <Text style={styles.engageCount}>{likeCount}</Text>
              </Pressable>
              <View style={styles.engageBtn}>
                <MessageCircle size={22} color={palette.textPrimary} />
                <Text style={styles.engageCount}>{commentCount}</Text>
              </View>
              <Pressable style={styles.engageBtn} onPress={() => void sharePost()}>
                <Share2 size={21} color={palette.textPrimary} />
              </Pressable>
              {data.analysis.user_id !== user?.id ? (
                <Pressable style={styles.engageBtn} onPress={reportPost}>
                  <Flag size={19} color={palette.textSecondary} />
                </Pressable>
              ) : null}
            </View>

            <Text style={styles.hint}>
              {t('post.duelHint', { score: data.result.score })}
            </Text>

            {canDuel ? (
              <GradientButton
                title={t('post.duelCta')}
                icon={<Swords size={18} color="#FFF" />}
                loading={startingDuel}
                onPress={() => void startDuel()}
                style={{ marginTop: 20 }}
              />
            ) : null}

            <Text style={styles.commentsTitle}>
              {t('engagement.comments')}
            </Text>
            {commentsLoading ? (
              <ActivityIndicator
                color={palette.primary}
                style={{ marginVertical: 16 }}
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          commentsLoading ? null : (
            <Text style={styles.emptyComments}>
              {t('engagement.noComments')}
            </Text>
          )
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.commentRow,
              item.parent_id && styles.commentReplyRow,
            ]}
          >
            <Pressable
              onPress={() => router.push(`/(app)/user/${item.username}`)}
            >
              <UserAvatar
                uri={item.avatar_url}
                name={item.display_name}
                size={36}
              />
            </Pressable>
            <View style={{ flex: 1 }}>
              <View style={styles.commentMeta}>
                <Text style={styles.commentName}>{item.display_name}</Text>
                <Text style={styles.commentTime}>
                  {(() => {
                    const diffMs =
                      Date.now() - new Date(item.created_at).getTime();
                    const mins = Math.floor(diffMs / 60_000);
                    if (mins < 1) return t('engagement.justNow');
                    if (mins < 60)
                      return t('engagement.minutesAgo', { count: mins });
                    const hours = Math.floor(mins / 60);
                    if (hours < 24)
                      return t('engagement.hoursAgo', { count: hours });
                    return t('engagement.daysAgo', {
                      count: Math.floor(hours / 24),
                    });
                  })()}
                </Text>
              </View>
              <Text style={styles.commentBody}>{item.body}</Text>
              <View style={styles.commentActions}>
                <Pressable onPress={() => setReplyTo(item)}>
                  <Text style={styles.replyText}>{t('common.reply')}</Text>
                </Pressable>
                <Pressable
                  style={styles.commentLike}
                  onPress={() => commentLikeMutation.mutate(item)}
                  disabled={!user?.id}
                >
                  <Heart
                    size={14}
                    color={
                      item.liked_by_me ? palette.error : palette.textSecondary
                    }
                    fill={item.liked_by_me ? palette.error : 'transparent'}
                  />
                  <Text style={styles.commentLikeCount}>
                    {item.like_count}
                  </Text>
                </Pressable>
                {item.user_id === user?.id ? (
                  <Pressable
                    onPress={() =>
                      Alert.alert(
                        t('engagement.deleteComment'),
                        t('engagement.deleteCommentConfirm'),
                        [
                          { text: t('common.cancel'), style: 'cancel' },
                          {
                            text: t('engagement.delete'),
                            style: 'destructive',
                            onPress: () => deleteMutation.mutate(item.id),
                          },
                        ],
                      )
                    }
                  >
                    <Trash2 size={14} color={palette.textDisabled} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
        )}
      />

      <View
        style={[
          styles.composer,
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        {replyTo ? (
          <View style={styles.replyBanner}>
            <Text style={styles.replyingText}>
              {t('common.replyingTo', { username: replyTo.username })}
            </Text>
            <Pressable onPress={() => setReplyTo(null)}>
              <Text style={styles.replyCancel}>{t('common.cancelReply')}</Text>
            </Pressable>
          </View>
        ) : null}
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={t('engagement.commentPlaceholder')}
          placeholderTextColor={palette.textDisabled}
          style={styles.composerInput}
          maxLength={500}
          multiline
        />
        <Pressable
          style={[
            styles.sendBtn,
            (!draft.trim() || commentMutation.isPending) && styles.sendDisabled,
          ]}
          disabled={!draft.trim() || !user?.id || commentMutation.isPending}
          onPress={() => commentMutation.mutate()}
        >
          <Send size={18} color="#FFF" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  centered: { alignItems: 'center', justifyContent: 'center', gap: 16 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  back: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: palette.textPrimary,
    fontFamily: fonts.semibold,
    fontSize: 17,
  },
  headerBlock: { paddingTop: 16, paddingBottom: 8 },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  video: {
    width: '100%',
    aspectRatio: 9 / 14,
    borderRadius: 18,
    backgroundColor: palette.bgSecondary,
    marginBottom: 22,
  },
  displayName: {
    color: palette.textPrimary,
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  username: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 13,
    marginTop: 2,
  },
  tier: {
    fontFamily: fonts.bold,
    fontSize: 36,
    textAlign: 'center',
  },
  score: {
    color: palette.textPrimary,
    fontFamily: fonts.semibold,
    fontSize: 28,
    marginTop: 8,
    textAlign: 'center',
  },
  engageRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
    marginTop: 20,
  },
  engageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  engageCount: {
    color: palette.textPrimary,
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  hint: {
    color: palette.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
  },
  commentsTitle: {
    color: palette.textPrimary,
    fontFamily: fonts.semibold,
    fontSize: 16,
    marginTop: 28,
    marginBottom: 12,
  },
  emptyComments: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    textAlign: 'center',
    marginTop: 8,
  },
  commentRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  commentReplyRow: {
    marginLeft: 42,
    paddingLeft: 10,
    borderLeftWidth: 1,
    borderLeftColor: palette.borderSubtle,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentName: {
    color: palette.textPrimary,
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  commentTime: {
    color: palette.textDisabled,
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  commentBody: {
    color: palette.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 6,
  },
  commentLike: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentLikeCount: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  replyText: {
    color: palette.primary,
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: palette.borderSubtle,
    backgroundColor: palette.bgSecondary,
    flexWrap: 'wrap',
  },
  replyBanner: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 6,
  },
  replyingText: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  replyCancel: {
    color: palette.primary,
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  composerInput: {
    flex: 1,
    maxHeight: 100,
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.borderSubtle,
    backgroundColor: palette.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: palette.textPrimary,
    fontFamily: fonts.medium,
    fontSize: 15,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.4 },
  error: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    textAlign: 'center',
  },
});
