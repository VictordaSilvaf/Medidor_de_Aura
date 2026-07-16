import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, UserPlus, UserMinus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { useAppSelector } from '@/src/core/hooks';
import { TIER_BY_ID } from '@/src/features/aura/tiers';
import { selectAuthUser } from '@/src/features/auth/authSlice';
import {
  fetchPublicProfileBundle,
  followUser,
  unfollowUser,
} from '@/src/features/social/followApi';
import { scoreColor } from '@/src/features/video-analysis/statusUi';
import { GradientButton } from '@/src/shared/ui/GradientButton';
import { fonts, palette } from '@/src/shared/ui/theme';

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function UserProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const viewer = useAppSelector(selectAuthUser);
  const { username } = useLocalSearchParams<{ username: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['public-profile', username],
    queryFn: () => fetchPublicProfileBundle(username!, viewer?.id),
    enabled: Boolean(username),
  });

  const isOwn = viewer?.id && data?.profile.user_id === viewer.id;

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!viewer?.id || !data) return;
      if (data.amFollowing) {
        await unfollowUser(viewer.id, data.profile.user_id);
      } else {
        await followUser(viewer.id, data.profile.user_id);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['public-profile', username],
      });
      void queryClient.invalidateQueries({
        queryKey: ['social-counts', data?.profile.user_id],
      });
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.root, styles.centered, { padding: 24 }]}>
        <Text style={styles.errorText}>
          {error instanceof Error ? error.message : t('profile.notFound')}
        </Text>
        <GradientButton
          title={t('common.back')}
          onPress={() => router.back()}
          style={{ marginTop: 16, alignSelf: 'stretch' }}
        />
      </View>
    );
  }

  const { profile, counts, amFollowing, posts } = data;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <ChevronLeft size={22} color={palette.textPrimary} />
        </Pressable>
        <Text style={styles.topUsername}>@{profile.username}</Text>
        <View style={styles.iconBtnPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 28,
        }}
      >
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>
              {profile.display_name.slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={styles.statsRow}>
            <Stat value={counts.posts} label={t('profile.posts')} />
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/(app)/connections/[userId]',
                  params: { userId: profile.user_id, tab: 'followers' },
                })
              }
            >
              <Stat value={counts.followers} label={t('profile.followers')} />
            </Pressable>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/(app)/connections/[userId]',
                  params: { userId: profile.user_id, tab: 'following' },
                })
              }
            >
              <Stat value={counts.following} label={t('profile.following')} />
            </Pressable>
          </View>
        </View>

        <Text style={styles.name}>{profile.display_name}</Text>
        <Text style={styles.levelLine}>
          {t('profile.levelXp', { level: profile.level, xp: profile.xp })}
          {' · '}
          {t('profile.aura', { count: profile.total_aura })}
        </Text>
        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

        <View style={styles.actions}>
          {isOwn ? (
            <GradientButton
              title={t('profile.edit')}
              onPress={() => router.push('/(app)/profile/edit')}
            />
          ) : (
            <GradientButton
              title={
                amFollowing ? t('profile.unfollow') : t('profile.follow')
              }
              variant={amFollowing ? 'ghost' : 'primary'}
              icon={
                amFollowing ? (
                  <UserMinus size={16} color={palette.textPrimary} />
                ) : (
                  <UserPlus size={16} color="#FFF" />
                )
              }
              loading={followMutation.isPending}
              onPress={() => followMutation.mutate()}
            />
          )}
        </View>

        <Text style={styles.gridTitle}>{t('profile.posts')}</Text>
        {posts.length === 0 ? (
          <Text style={styles.emptyGrid}>{t('profile.noPosts')}</Text>
        ) : (
          <View style={styles.grid}>
            {posts.map((post) => {
              const tier = TIER_BY_ID[post.tier_id as keyof typeof TIER_BY_ID];
              return (
                <Pressable
                  key={post.id}
                  style={styles.gridCell}
                  onPress={() => router.push(`/(app)/post/${post.id}`)}
                >
                  <View
                    style={[
                      styles.gridInner,
                      { borderColor: `${tier?.color ?? palette.primary}55` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.gridTier,
                        { color: tier?.color ?? palette.textPrimary },
                      ]}
                    >
                      {tier?.label ?? post.tier_id}
                    </Text>
                    <Text
                      style={[
                        styles.gridScore,
                        { color: scoreColor(post.score) },
                      ]}
                    >
                      +{post.score}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  centered: { alignItems: 'center', justifyContent: 'center' },
  errorText: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    textAlign: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  topUsername: {
    color: palette.textPrimary,
    fontFamily: fonts.bold,
    fontSize: 17,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnPlaceholder: { width: 40, height: 40 },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginBottom: 14,
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: `${palette.primary}33`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: `${palette.primary}66`,
  },
  avatarLetter: {
    color: palette.primary,
    fontFamily: fonts.bold,
    fontSize: 34,
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: { alignItems: 'center', minWidth: 64 },
  statValue: {
    color: palette.textPrimary,
    fontFamily: fonts.bold,
    fontSize: 18,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 12,
    marginTop: 2,
  },
  name: {
    color: palette.textPrimary,
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  levelLine: {
    color: palette.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    marginTop: 4,
  },
  bio: {
    color: palette.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  actions: { marginTop: 16, marginBottom: 22 },
  gridTitle: {
    color: palette.textSecondary,
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.borderSubtle,
    paddingTop: 14,
  },
  emptyGrid: {
    color: palette.textDisabled,
    fontFamily: fonts.medium,
    textAlign: 'center',
    marginTop: 28,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  gridCell: { width: '32.2%', aspectRatio: 1 },
  gridInner: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 6,
  },
  gridTier: { fontFamily: fonts.semibold, fontSize: 11 },
  gridScore: {
    fontFamily: fonts.bold,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
});
