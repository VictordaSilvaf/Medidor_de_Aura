import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Grid3X3, Pencil, Settings } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { useAppDispatch, useAppSelector } from '@/src/core/hooks';
import { TIER_BY_ID } from '@/src/features/aura/tiers';
import { signOut } from '@/src/features/auth/authService';
import {
  fetchPublicPostsGrid,
  fetchSocialCounts,
} from '@/src/features/social/followApi';
import {
  selectMyProfile,
  setMyProfile,
} from '@/src/features/social/profileSlice';
import { scoreColor } from '@/src/features/video-analysis/statusUi';
import { GradientButton } from '@/src/shared/ui/GradientButton';
import { fonts, palette } from '@/src/shared/ui/theme';

function StatTap({
  value,
  label,
  onPress,
}: {
  value: number | string;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.stat} disabled={!onPress}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

export default function ProfileTabScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const profile = useAppSelector(selectMyProfile);

  const { data: counts, isLoading: countsLoading } = useQuery({
    queryKey: ['social-counts', profile?.user_id],
    queryFn: () => fetchSocialCounts(profile!.user_id),
    enabled: Boolean(profile?.user_id),
  });

  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['profile-grid', profile?.user_id],
    queryFn: () => fetchPublicPostsGrid(profile!.user_id),
    enabled: Boolean(profile?.user_id),
  });

  const handleSignOut = async () => {
    try {
      await signOut();
      dispatch(setMyProfile(null));
    } catch (error) {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('common.error'),
      );
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.topBar}>
        <Text style={styles.topUsername}>
          @{profile?.username ?? '—'}
        </Text>
        <Pressable
          onPress={() => router.push('/(app)/settings')}
          style={styles.iconBtn}
        >
          <Settings size={18} color={palette.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 28,
          paddingHorizontal: 16,
        }}
      >
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>
              {(profile?.display_name ?? '?').slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={styles.statsRow}>
            {countsLoading ? (
              <ActivityIndicator color={palette.primary} />
            ) : (
              <>
                <StatTap
                  value={counts?.posts ?? 0}
                  label={t('profile.posts')}
                />
                <StatTap
                  value={counts?.followers ?? 0}
                  label={t('profile.followers')}
                  onPress={() =>
                    profile &&
                    router.push({
                      pathname: '/(app)/connections/[userId]',
                      params: { userId: profile.user_id, tab: 'followers' },
                    })
                  }
                />
                <StatTap
                  value={counts?.following ?? 0}
                  label={t('profile.following')}
                  onPress={() =>
                    profile &&
                    router.push({
                      pathname: '/(app)/connections/[userId]',
                      params: { userId: profile.user_id, tab: 'following' },
                    })
                  }
                />
              </>
            )}
          </View>
        </View>

        <Text style={styles.name}>{profile?.display_name ?? '—'}</Text>
        <Text style={styles.levelLine}>
          {t('profile.levelXp', {
            level: profile?.level ?? 1,
            xp: profile?.xp ?? 0,
          })}
          {' · '}
          {t('profile.aura', { count: profile?.total_aura ?? 0 })}
        </Text>
        {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

        <View style={styles.actions}>
          <GradientButton
            title={t('profile.edit')}
            icon={<Pencil size={16} color="#FFF" />}
            onPress={() => router.push('/(app)/profile/edit')}
            style={{ flex: 1 }}
          />
          <GradientButton
            title={t('common.signOut')}
            variant="ghost"
            onPress={() => void handleSignOut()}
            style={{ flex: 1 }}
          />
        </View>

        <View style={styles.gridHeader}>
          <Grid3X3 size={16} color={palette.textSecondary} />
          <Text style={styles.gridTitle}>{t('profile.posts')}</Text>
        </View>

        {postsLoading ? (
          <ActivityIndicator color={palette.primary} style={{ marginTop: 24 }} />
        ) : posts.length === 0 ? (
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  topUsername: {
    color: palette.textPrimary,
    fontFamily: fonts.bold,
    fontSize: 18,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.borderSubtle,
  },
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
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    marginBottom: 22,
  },
  gridHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.borderSubtle,
    paddingTop: 14,
    marginBottom: 12,
  },
  gridTitle: {
    color: palette.textSecondary,
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  emptyGrid: {
    color: palette.textDisabled,
    fontFamily: fonts.medium,
    textAlign: 'center',
    marginTop: 28,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  gridCell: {
    width: '32.2%',
    aspectRatio: 1,
  },
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
  gridTier: {
    fontFamily: fonts.semibold,
    fontSize: 11,
  },
  gridScore: {
    fontFamily: fonts.bold,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
});
