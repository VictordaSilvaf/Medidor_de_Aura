import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Swords } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppDispatch, useAppSelector } from '@/src/core/hooks';
import { TIER_BY_ID } from '@/src/features/aura/tiers';
import { selectAuthUser } from '@/src/features/auth/authSlice';
import {
  createDuelChallenge,
  fetchPublicPost,
} from '@/src/features/social/socialApi';
import { setActiveChallengeId } from '@/src/features/video-analysis/pendingCaptureSlice';
import { GradientButton } from '@/src/shared/ui/GradientButton';
import { fonts, palette } from '@/src/shared/ui/theme';

export default function PostDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [startingDuel, setStartingDuel] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['post', id],
    queryFn: () => fetchPublicPost(id!),
    enabled: Boolean(id),
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

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <ChevronLeft size={22} color={palette.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{t('post.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        <Text style={styles.username}>@{data.profile.username}</Text>
        <Text style={[styles.tier, { color: tier?.color ?? palette.textPrimary }]}>
          {tier?.label ?? data.result.tier_id}
        </Text>
        <Text style={styles.score}>+{data.result.score}</Text>
        <Text style={styles.hint}>
          {t('post.duelHint', { score: data.result.score })}
        </Text>

        {canDuel ? (
          <GradientButton
            title={t('post.duelCta')}
            icon={<Swords size={18} color="#FFF" />}
            loading={startingDuel}
            onPress={() => void startDuel()}
            style={{ marginTop: 28 }}
          />
        ) : null}
      </View>
    </View>
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
  body: { padding: 24, alignItems: 'center', marginTop: 40 },
  username: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  tier: {
    fontFamily: fonts.bold,
    fontSize: 36,
    marginTop: 12,
  },
  score: {
    color: palette.textPrimary,
    fontFamily: fonts.semibold,
    fontSize: 28,
    marginTop: 8,
  },
  hint: {
    color: palette.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
  },
  error: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    textAlign: 'center',
  },
});
