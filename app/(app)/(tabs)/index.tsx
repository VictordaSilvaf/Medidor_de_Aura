import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronRight, Film, Settings, Zap } from 'lucide-react-native';
import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useAppSelector } from '@/src/core/hooks';
import { selectAuraStats } from '@/src/features/aura/auraSlice';
import { TIER_BY_ID } from '@/src/features/aura/tiers';
import { selectAuthUser } from '@/src/features/auth/authSlice';
import { selectSeenRevealIds } from '@/src/features/prefs/prefsSlice';
import { selectMyProfile } from '@/src/features/social/profileSlice';
import { fetchChallenges } from '@/src/features/social/socialApi';
import {
  localizeChallengeText,
  xpForNextLevel,
} from '@/src/features/social/types';
import {
  fetchMyAnalyses,
  type AnalysisListItem,
} from '@/src/features/video-analysis/analysisApi';
import {
  scoreColor,
  statusColor,
  statusLabel,
} from '@/src/features/video-analysis/statusUi';
import { GlowCard } from '@/src/shared/ui/GlowCard';
import { GradientButton } from '@/src/shared/ui/GradientButton';
import { fonts, palette } from '@/src/shared/ui/theme';

function StatBlock({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <VStack className="flex-1 items-center" space="xs">
      <Text
        className="text-2xl text-foreground"
        style={{ fontFamily: fonts.bold, fontVariant: ['tabular-nums'] }}
      >
        {value}
      </Text>
      <Text
        className="text-xs uppercase text-muted-foreground"
        style={[
          { fontFamily: fonts.medium, letterSpacing: 1.5 },
          valueColor ? { color: valueColor } : null,
        ]}
      >
        {label}
      </Text>
    </VStack>
  );
}

function openAnalysis(
  item: AnalysisListItem,
  seenIds: string[],
  router: ReturnType<typeof useRouter>,
) {
  if (item.status === 'completed' && item.result) {
    if (!seenIds.includes(item.id)) {
      router.push(`/(app)/reveal/${item.id}`);
      return;
    }
    router.push(`/(app)/result/${item.id}`);
    return;
  }
  router.push(`/(app)/processing/${item.id}`);
}

export default function HubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const user = useAppSelector(selectAuthUser);
  const profile = useAppSelector(selectMyProfile);
  const localStats = useAppSelector(selectAuraStats);
  const seenIds = useAppSelector(selectSeenRevealIds);
  const autoRevealDone = useRef(false);

  const totalAura = profile?.total_aura ?? localStats.totalAura;
  const measurements = profile?.measurements ?? localStats.measurements;
  const bestTierId = profile?.best_tier_id ?? localStats.bestTierId;
  const bestTier = bestTierId
    ? TIER_BY_ID[bestTierId as keyof typeof TIER_BY_ID]
    : null;
  const orbGlow = bestTier?.color ?? palette.primary;
  const level = profile?.level ?? 1;
  const xp = profile?.xp ?? 0;
  const xpCap = xpForNextLevel(level);
  const xpProgress = Math.min(1, xp / xpCap);

  const { data: challenges = [] } = useQuery({
    queryKey: ['challenges'],
    queryFn: fetchChallenges,
  });
  const featured = challenges.find(
    (c) => c.status === 'active' && c.type !== 'duel',
  );

  const {
    data: recent = [],
    refetch: refetchRecent,
  } = useQuery({
    queryKey: ['my-analyses', user?.id, 'home'],
    queryFn: () => fetchMyAnalyses(user!.id, 5),
    enabled: Boolean(user?.id),
    refetchInterval: 8_000,
  });

  useFocusEffect(
    useCallback(() => {
      void refetchRecent();
      autoRevealDone.current = false;
    }, [refetchRecent]),
  );

  useFocusEffect(
    useCallback(() => {
      if (autoRevealDone.current || recent.length === 0) return;
      const pending = recent.find(
        (item) =>
          item.status === 'completed' &&
          item.result &&
          !seenIds.includes(item.id),
      );
      if (pending) {
        autoRevealDone.current = true;
        router.push(`/(app)/reveal/${pending.id}`);
      }
    }, [recent, router, seenIds]),
  );

  return (
    <Box className="flex-1 bg-background">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 28,
          paddingHorizontal: 24,
          flexGrow: 1,
          gap: 24,
        }}
      >
        <HStack className="items-center justify-between">
          <VStack space="xs">
            <Text
              className="text-xs uppercase text-muted-foreground"
              style={{ fontFamily: fonts.semibold, letterSpacing: 3 }}
            >
              {t('hub.brand')}
            </Text>
            <Text className="text-sm text-muted-foreground">
              {profile
                ? `@${profile.username} · ${t('hub.level', { level })}`
                : t('hub.anonymous')}
            </Text>
          </VStack>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('profile.settings')}
            onPress={() => router.push('/(app)/settings')}
            hitSlop={10}
            style={styles.iconButton}
          >
            <Settings
              size={18}
              color={palette.textSecondary}
              strokeWidth={1.8}
            />
          </Pressable>
        </HStack>

        <GlowCard glowColor={orbGlow}>
          <HStack className="items-center px-4 py-5">
            <StatBlock label={t('hub.totalAura')} value={String(totalAura)} />
            <View style={styles.divider} />
            <StatBlock
              label={t('hub.measurements')}
              value={String(measurements)}
            />
            <View style={styles.divider} />
            <StatBlock
              label={bestTier ? bestTier.label : t('hub.bestTier')}
              value={bestTier ? '★' : '—'}
              valueColor={bestTier?.color}
            />
          </HStack>
        </GlowCard>

        <View style={styles.xpBlock}>
          <HStack className="items-center justify-between mb-2">
            <Text style={styles.xpLabel}>
              {t('hub.level', { level })}
              {profile?.streak_days
                ? ` · ${t('hub.streak', { count: profile.streak_days })}`
                : ''}
            </Text>
            <Text style={styles.xpLabel}>
              {xp}/{xpCap} XP
            </Text>
          </HStack>
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${xpProgress * 100}%` }]} />
          </View>
        </View>

        {featured ? (
          <Pressable
            onPress={() => router.push(`/(app)/challenges/${featured.id}`)}
          >
            <GlowCard glowColor={palette.neon} className="px-4 py-4">
              <Text style={styles.featureEyebrow}>
                {t('hub.activeChallenge')}
              </Text>
              <Text style={styles.featureTitle}>
                {localizeChallengeText(featured.title, i18n.language)}
              </Text>
              <Text style={styles.featureReward}>
                {t('challenges.reward', { xp: featured.reward_xp })}
              </Text>
            </GlowCard>
          </Pressable>
        ) : null}

        <View style={styles.recentBlock}>
          <HStack className="items-center justify-between mb-3">
            <Text style={styles.recentTitle}>{t('hub.recentUploads')}</Text>
            <Pressable
              onPress={() => router.push('/(app)/uploads')}
              hitSlop={8}
              style={styles.seeAll}
            >
              <Text style={styles.seeAllText}>{t('hub.seeAllUploads')}</Text>
              <ChevronRight
                size={16}
                color={palette.neon}
                strokeWidth={2}
              />
            </Pressable>
          </HStack>

          {recent.length === 0 ? (
            <View style={styles.recentEmpty}>
              <Film size={20} color={palette.textDisabled} strokeWidth={1.6} />
              <Text style={styles.recentEmptyText}>{t('hub.noUploads')}</Text>
            </View>
          ) : (
            recent.map((item) => {
              const tier = item.result
                ? TIER_BY_ID[item.result.tier_id]
                : null;
              const unseen =
                item.status === 'completed' && !seenIds.includes(item.id);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => openAnalysis(item, seenIds, router)}
                  style={[styles.recentRow, unseen && styles.recentRowUnseen]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: statusColor(item.status) },
                    ]}
                  />
                  <View style={styles.recentBody}>
                    <Text style={styles.recentStatus}>
                      {statusLabel(item.status)}
                      {unseen ? ` · ${t('uploads.newBadge')}` : ''}
                      {tier ? ` · ${tier.label}` : ''}
                    </Text>
                    <Text style={styles.recentMeta}>
                      {item.source === 'camera'
                        ? t('preview.sourceCamera')
                        : t('preview.sourceGallery')}
                    </Text>
                  </View>
                  {item.result ? (
                    <Text
                      style={[
                        styles.recentScore,
                        { color: scoreColor(item.result.score) },
                      ]}
                    >
                      +{item.result.score}
                    </Text>
                  ) : (
                    <Text style={styles.recentScoreMuted}>…</Text>
                  )}
                </Pressable>
              );
            })
          )}
        </View>

        <GradientButton
          title={t('hub.measureCta')}
          icon={<Zap size={20} color="#FFFFFF" strokeWidth={2.2} />}
          onPress={() => router.push('/(app)/capture')}
          accessibilityLabel={t('hub.measureCta')}
        />
      </ScrollView>
    </Box>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  divider: {
    width: 1,
    height: 34,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  xpBlock: {
    gap: 4,
  },
  xpLabel: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  xpTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  xpFill: {
    height: '100%',
    backgroundColor: palette.primary,
  },
  featureEyebrow: {
    color: palette.neon,
    fontFamily: fonts.medium,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  featureTitle: {
    color: palette.textPrimary,
    fontFamily: fonts.semibold,
    fontSize: 17,
  },
  featureReward: {
    color: palette.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    marginTop: 4,
  },
  recentBlock: {
    gap: 8,
  },
  recentTitle: {
    color: palette.textPrimary,
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    color: palette.neon,
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  recentEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.borderSubtle,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  recentEmptyText: {
    color: palette.textDisabled,
    fontFamily: fonts.regular,
    fontSize: 13,
    flex: 1,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.borderSubtle,
    backgroundColor: palette.card,
  },
  recentRowUnseen: {
    borderColor: `${palette.primary}66`,
    backgroundColor: `${palette.primary}14`,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recentBody: {
    flex: 1,
    gap: 2,
  },
  recentStatus: {
    color: palette.textPrimary,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  recentMeta: {
    color: palette.textDisabled,
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  recentScore: {
    fontFamily: fonts.bold,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  recentScoreMuted: {
    color: palette.textDisabled,
    fontFamily: fonts.medium,
    fontSize: 14,
  },
});
