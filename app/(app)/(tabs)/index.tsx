import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Settings, Zap } from 'lucide-react-native';
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
import { selectMyProfile } from '@/src/features/social/profileSlice';
import { fetchChallenges } from '@/src/features/social/socialApi';
import {
  localizeChallengeText,
  xpForNextLevel,
} from '@/src/features/social/types';
import { AuraOrb } from '@/src/shared/ui/AuraOrb';
import { GlowCard } from '@/src/shared/ui/GlowCard';
import { GradientButton } from '@/src/shared/ui/GradientButton';
import { brandGradient, fonts, palette } from '@/src/shared/ui/theme';

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

export default function HubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const profile = useAppSelector(selectMyProfile);
  const localStats = useAppSelector(selectAuraStats);

  const totalAura = profile?.total_aura ?? localStats.totalAura;
  const measurements = profile?.measurements ?? localStats.measurements;
  const bestTierId = profile?.best_tier_id ?? localStats.bestTierId;
  const bestTier = bestTierId ? TIER_BY_ID[bestTierId as keyof typeof TIER_BY_ID] : null;
  const orbColors = bestTier?.gradient ?? brandGradient;
  const orbGlow = bestTier?.color ?? palette.primary;
  const level = profile?.level ?? 1;
  const xp = profile?.xp ?? 0;
  const xpCap = xpForNextLevel(level);
  const xpProgress = Math.min(1, xp / xpCap);

  const { data: challenges = [] } = useQuery({
    queryKey: ['challenges'],
    queryFn: fetchChallenges,
  });
  const featured = challenges.find((c) => c.status === 'active' && c.type !== 'duel');

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
            <Settings size={18} color={palette.textSecondary} strokeWidth={1.8} />
          </Pressable>
        </HStack>

        <GlowCard glowColor={orbGlow}>
          <HStack className="items-center px-4 py-5">
            <StatBlock label={t('hub.totalAura')} value={String(totalAura)} />
            <View style={styles.divider} />
            <StatBlock label={t('hub.measurements')} value={String(measurements)} />
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

        <View style={styles.orbArea}>
          <AuraOrb
            size={200}
            colors={orbColors}
            glowColor={orbGlow}
            intensity={0.18}
          />
          <Text className="text-center text-sm text-muted-foreground px-8">
            {measurements === 0 ? t('hub.emptyAura') : t('hub.stableAura')}
          </Text>
        </View>

        {featured ? (
          <Pressable onPress={() => router.push(`/(app)/challenges/${featured.id}`)}>
            <GlowCard glowColor={palette.neon} className="px-4 py-4">
              <Text style={styles.featureEyebrow}>{t('hub.activeChallenge')}</Text>
              <Text style={styles.featureTitle}>
                {localizeChallengeText(featured.title, i18n.language)}
              </Text>
              <Text style={styles.featureReward}>
                {t('challenges.reward', { xp: featured.reward_xp })}
              </Text>
            </GlowCard>
          </Pressable>
        ) : null}

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
  orbArea: {
    flex: 1,
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
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
});
