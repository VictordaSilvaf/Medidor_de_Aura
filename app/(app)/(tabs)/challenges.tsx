import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { fetchChallenges } from '@/src/features/social/socialApi';
import {
  localizeChallengeText,
  type Challenge,
} from '@/src/features/social/types';
import { AppMenuButton } from '@/src/shared/ui/AppMenuSheet';
import { fonts, palette } from '@/src/shared/ui/theme';

function ChallengeCard({
  item,
  onPress,
}: {
  item: Challenge;
  onPress: () => void;
}) {
  const { t, i18n } = useTranslation();
  const isActive = item.status === 'active';

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, isActive ? styles.cardActive : styles.cardInactive]}
    >
      <Text style={[styles.type, isActive && styles.typeActive]}>
        {t(`challenges.type_${item.type}`)}
      </Text>
      <Text style={styles.title}>
        {localizeChallengeText(item.title, i18n.language)}
      </Text>
      <Text style={styles.desc} numberOfLines={2}>
        {localizeChallengeText(item.description, i18n.language)}
      </Text>
      <Text style={styles.reward}>
        {t('challenges.reward', { xp: item.reward_xp })}
      </Text>
    </Pressable>
  );
}

export default function ChallengesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['challenges'],
    queryFn: fetchChallenges,
  });

  const challenges = data.filter((c) => c.status !== 'draft');

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <AppMenuButton />
        <Text style={styles.screenTitle}>{t('challenges.title')}</Text>
        <View style={{ width: 40 }} />
      </View>
      {isLoading ? (
        <ActivityIndicator color={palette.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={challenges}
          keyExtractor={(item) => item.id}
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 24,
            gap: 12,
            flexGrow: 1,
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>{t('challenges.empty')}</Text>
          }
          renderItem={({ item }) => (
            <ChallengeCard
              item={item}
              onPress={() => router.push(`/(app)/challenges/${item.id}`)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  screenTitle: {
    color: palette.textPrimary,
    fontFamily: fonts.bold,
    fontSize: 24,
  },
  empty: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    textAlign: 'center',
    marginTop: 48,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  cardActive: {
    borderColor: 'rgba(109,93,252,0.45)',
    backgroundColor: 'rgba(109,93,252,0.18)',
  },
  cardInactive: {
    borderColor: palette.borderSubtle,
    backgroundColor: palette.card,
  },
  type: {
    color: palette.textDisabled,
    fontFamily: fonts.medium,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  typeActive: {
    color: palette.neon,
  },
  title: {
    color: palette.textPrimary,
    fontFamily: fonts.semibold,
    fontSize: 17,
  },
  desc: {
    color: palette.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  reward: {
    color: palette.primary,
    fontFamily: fonts.semibold,
    fontSize: 13,
    marginTop: 8,
  },
});
