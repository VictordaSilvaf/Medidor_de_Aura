import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Plus, Swords } from 'lucide-react-native';
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
import { useAppSelector } from '@/src/core/hooks';
import { TIER_BY_ID } from '@/src/features/aura/tiers';
import { selectAuthUser } from '@/src/features/auth/authSlice';
import { fetchPublicFeed } from '@/src/features/social/socialApi';
import type { FeedPost } from '@/src/features/social/types';
import { GradientButton } from '@/src/shared/ui/GradientButton';
import { fonts, palette } from '@/src/shared/ui/theme';

function FeedCard({
  item,
  onOpen,
  onProfile,
  onDuel,
  canDuel,
}: {
  item: FeedPost;
  onOpen: () => void;
  onProfile: () => void;
  onDuel: () => void;
  canDuel: boolean;
}) {
  const { t } = useTranslation();
  const tier = TIER_BY_ID[item.tier_id as keyof typeof TIER_BY_ID];

  return (
    <Pressable onPress={onOpen} style={styles.card}>
      <View style={styles.cardTop}>
        <Pressable onPress={onProfile} style={styles.cardTopPress}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: `${tier?.color ?? palette.primary}33` },
            ]}
          >
            <Text
              style={[
                styles.avatarLetter,
                { color: tier?.color ?? palette.primary },
              ]}
            >
              {item.display_name.slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.display_name}</Text>
            <Text style={styles.meta}>
              {t('feed.by', { username: item.username })} · Lv {item.level}
            </Text>
          </View>
        </Pressable>
        <Text style={[styles.tier, { color: tier?.color ?? palette.textPrimary }]}>
          {tier?.label ?? item.tier_id}
        </Text>
      </View>
      <Text style={styles.score}>{t('feed.score', { score: item.score })}</Text>
      {canDuel ? (
        <GradientButton
          title={t('feed.duel')}
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

  const { data = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['feed'],
    queryFn: () => fetchPublicFeed(),
  });

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('feed.title')}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('feed.record')}
          onPress={() => router.push('/(app)/capture')}
          style={styles.recordBtn}
        >
          <Plus size={22} color="#FFF" strokeWidth={2.4} />
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator color={palette.primary} style={{ marginTop: 40 }} />
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
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.empty}>{t('feed.empty')}</Text>
              <GradientButton
                title={t('feed.record')}
                icon={<Plus size={18} color="#FFF" strokeWidth={2.2} />}
                onPress={() => router.push('/(app)/capture')}
                style={{ marginTop: 16, alignSelf: 'stretch' }}
              />
            </View>
          }
          renderItem={({ item }) => (
            <FeedCard
              item={item}
              canDuel={item.user_id !== user?.id}
              onOpen={() => router.push(`/(app)/post/${item.id}`)}
              onProfile={() =>
                router.push(`/(app)/user/${item.username}`)
              }
              onDuel={() => router.push(`/(app)/post/${item.id}`)}
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
  title: {
    color: palette.textPrimary,
    fontFamily: fonts.bold,
    fontSize: 24,
  },
  recordBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: palette.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  emptyWrap: {
    marginTop: 48,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  empty: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    textAlign: 'center',
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.borderSubtle,
    backgroundColor: palette.card,
    padding: 16,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardTopPress: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontFamily: fonts.bold, fontSize: 18 },
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
});
