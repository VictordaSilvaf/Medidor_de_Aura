import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppDispatch, useAppSelector } from '@/src/core/hooks';
import { selectAuthUser } from '@/src/features/auth/authSlice';
import {
  fetchChallenge,
  fetchChallengeLeaderboard,
  joinChallenge,
} from '@/src/features/social/socialApi';
import { localizeChallengeText } from '@/src/features/social/types';
import { setActiveChallengeId } from '@/src/features/video-analysis/pendingCaptureSlice';
import { GradientButton } from '@/src/shared/ui/GradientButton';
import { fonts, usePalette, useThemedStyles, type AppPalette } from '@/src/shared/ui/theme';

export default function ChallengeDetailScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = usePalette();
  const styles = useThemedStyles(createStyles);
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const user = useAppSelector(selectAuthUser);
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: challenge, isLoading } = useQuery({
    queryKey: ['challenge', id],
    queryFn: () => fetchChallenge(id!),
    enabled: Boolean(id),
  });

  const { data: leaderboard = [] } = useQuery({
    queryKey: ['challenge-leaderboard', id],
    queryFn: () => fetchChallengeLeaderboard(id!),
    enabled: Boolean(id),
  });

  const handleJoinAndMeasure = async () => {
    if (!user?.id || !challenge) return;
    try {
      await joinChallenge(challenge.id, user.id);
      dispatch(setActiveChallengeId(challenge.id));
      await queryClient.invalidateQueries({ queryKey: ['challenge-leaderboard', id] });
      router.push('/(app)/capture');
    } catch (error) {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('common.error'),
      );
    }
  };

  if (isLoading || !challenge) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <ChevronLeft size={22} color={palette.textPrimary} />
        </Pressable>
        <Text style={styles.topTitle}>{t(`challenges.type_${challenge.type}`)}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>
          {localizeChallengeText(challenge.title, i18n.language)}
        </Text>
        <Text style={styles.desc}>
          {localizeChallengeText(challenge.description, i18n.language)}
        </Text>
        <Text style={styles.reward}>
          {t('challenges.reward', { xp: challenge.reward_xp })}
        </Text>
        <GradientButton
          title={t('challenges.join')}
          onPress={() => void handleJoinAndMeasure()}
          style={{ marginTop: 16 }}
        />
      </View>

      <Text style={styles.boardTitle}>{t('challenges.leaderboard')}</Text>
      <FlatList
        data={leaderboard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 24,
          gap: 8,
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>{t('challenges.empty')}</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rank}>#{item.rank}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowName}>
                @{item.profile?.username ?? 'player'}
              </Text>
              <Text style={styles.rowMeta}>{item.tier_id}</Text>
            </View>
            <Text style={styles.rowScore}>+{item.score}</Text>
          </View>
        )}
      />
    </View>
  );
}

const createStyles = (palette: AppPalette) =>
  StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  centered: { alignItems: 'center', justifyContent: 'center' },
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
  topTitle: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  header: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8 },
  title: {
    color: palette.textPrimary,
    fontFamily: fonts.bold,
    fontSize: 26,
  },
  desc: {
    color: palette.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  reward: {
    color: palette.primary,
    fontFamily: fonts.semibold,
    fontSize: 14,
    marginTop: 10,
  },
  boardTitle: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    paddingHorizontal: 24,
    marginTop: 20,
    marginBottom: 10,
  },
  empty: {
    color: palette.textDisabled,
    fontFamily: fonts.medium,
    textAlign: 'center',
    marginTop: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.borderSubtle,
    backgroundColor: palette.card,
  },
  rank: {
    color: palette.neon,
    fontFamily: fonts.bold,
    fontSize: 16,
    width: 36,
  },
  rowName: {
    color: palette.textPrimary,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  rowMeta: {
    color: palette.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  rowScore: {
    color: palette.textPrimary,
    fontFamily: fonts.bold,
    fontSize: 16,
  },
});
