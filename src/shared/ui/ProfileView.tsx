import { LinearGradient } from 'expo-linear-gradient';
import { Grid3X3, Heart, MessageCircle } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui/text';
import { TIER_BY_ID } from '@/src/features/aura/tiers';
import type { SocialCounts } from '@/src/features/social/followApi';
import type { Profile } from '@/src/features/social/types';
import {
  effectiveSubscriptionTier,
  isPaidTier,
  SUBSCRIPTION_TIER_COLORS,
  tierLabelKey,
} from '@/src/features/monetization/subscriptionTiers';
import { scoreColor } from '@/src/features/video-analysis/statusUi';
import { fonts, palette } from '@/src/shared/ui/theme';

import { UserAvatar } from './UserAvatar';

export type ProfileGridPost = {
  id: string;
  score: number;
  tier_id: string;
  created_at: string;
  like_count?: number;
  comment_count?: number;
};

function Stat({
  value,
  label,
  onPress,
}: {
  value: number;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={styles.stat}
    >
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

export function ProfileHeader({
  profile,
  counts,
  onFollowers,
  onFollowing,
  actions,
}: {
  profile: Profile;
  counts: SocialCounts;
  onFollowers: () => void;
  onFollowing: () => void;
  actions: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <View>
      <View style={styles.banner}>
        {profile.banner_url ? (
          <Image
            source={{ uri: profile.banner_url }}
            resizeMode="cover"
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <LinearGradient
            colors={['#121329', '#2A1D59', '#0D5666']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(9,9,11,0.7)']}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={styles.identityRow}>
        <UserAvatar
          uri={profile.avatar_url}
          name={profile.display_name}
          size={88}
          style={styles.avatar}
        />
        <View style={styles.statsRow}>
          <Stat value={counts.posts} label={t('profile.posts')} />
          <Stat
            value={counts.followers}
            label={t('profile.followers')}
            onPress={onFollowers}
          />
          <Stat
            value={counts.following}
            label={t('profile.following')}
            onPress={onFollowing}
          />
        </View>
      </View>

      <Text style={styles.name}>{profile.display_name}</Text>
      {(() => {
        const subTier = effectiveSubscriptionTier(
          profile.subscription_tier ?? 'free',
          profile.subscription_expires_at,
        );
        if (!isPaidTier(subTier)) return null;
        const color = SUBSCRIPTION_TIER_COLORS[subTier];
        return (
          <View style={[styles.vipBadge, { borderColor: `${color}55` }]}>
            <Text style={[styles.vipBadgeText, { color }]}>
              {t('premium.badge', { tier: t(tierLabelKey(subTier)) })}
            </Text>
          </View>
        );
      })()}
      <Text style={styles.levelLine}>
        {t('profile.levelXp', { level: profile.level, xp: profile.xp })}
        {' · '}
        {t('profile.aura', { count: profile.total_aura })}
      </Text>
      {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
      <View style={styles.actions}>{actions}</View>
    </View>
  );
}

export function ProfilePostsGrid({
  posts,
  loading,
  onOpen,
}: {
  posts: ProfileGridPost[];
  loading?: boolean;
  onOpen: (id: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <View>
      <View style={styles.gridHeader}>
        <Grid3X3 size={16} color={palette.textSecondary} />
        <Text style={styles.gridTitle}>{t('profile.posts')}</Text>
      </View>
      {loading ? (
        <Text style={styles.emptyGrid}>{t('common.loading')}</Text>
      ) : posts.length === 0 ? (
        <Text style={styles.emptyGrid}>{t('profile.noPosts')}</Text>
      ) : (
        <View style={styles.grid}>
          {posts.map((post) => {
            const tier = TIER_BY_ID[post.tier_id as keyof typeof TIER_BY_ID];
            return (
              <Pressable
                key={post.id}
                accessibilityRole="button"
                style={styles.gridCell}
                onPress={() => onOpen(post.id)}
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
                    style={[styles.gridScore, { color: scoreColor(post.score) }]}
                  >
                    +{post.score}
                  </Text>
                  <View style={styles.gridEngagement}>
                    <Heart size={10} color={palette.textDisabled} />
                    <Text style={styles.gridCount}>{post.like_count ?? 0}</Text>
                    <MessageCircle size={10} color={palette.textDisabled} />
                    <Text style={styles.gridCount}>
                      {post.comment_count ?? 0}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    height: 150,
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: palette.surface,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 16,
    marginTop: -34,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  avatar: {
    borderWidth: 3,
    borderColor: palette.bg,
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 6,
  },
  stat: { alignItems: 'center', minWidth: 62, paddingVertical: 4 },
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
    fontSize: 17,
  },
  vipBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  vipBadgeText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
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
  gridEngagement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  gridCount: {
    color: palette.textDisabled,
    fontFamily: fonts.medium,
    fontSize: 9,
    fontVariant: ['tabular-nums'],
  },
});
