import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  fetchFollowers,
  fetchFollowing,
  type FollowListItem,
} from '@/src/features/social/followApi';
import { UserAvatar } from '@/src/shared/ui/UserAvatar';
import { fonts, palette } from '@/src/shared/ui/theme';

type TabKey = 'followers' | 'following';

export default function ConnectionsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId, tab } = useLocalSearchParams<{
    userId: string;
    tab?: string;
  }>();
  const initial: TabKey = tab === 'following' ? 'following' : 'followers';
  const [active, setActive] = useState<TabKey>(initial);

  const { data: followers = [], isLoading: loadingFollowers } = useQuery({
    queryKey: ['followers', userId],
    queryFn: () => fetchFollowers(userId!),
    enabled: Boolean(userId),
  });

  const { data: following = [], isLoading: loadingFollowing } = useQuery({
    queryKey: ['following', userId],
    queryFn: () => fetchFollowing(userId!),
    enabled: Boolean(userId),
  });

  const list = active === 'followers' ? followers : following;
  const loading =
    active === 'followers' ? loadingFollowers : loadingFollowing;

  const emptyText = useMemo(
    () =>
      active === 'followers'
        ? t('profile.emptyFollowers')
        : t('profile.emptyFollowing'),
    [active, t],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <ChevronLeft size={22} color={palette.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{t('profile.connections')}</Text>
        <View style={styles.iconBtnPlaceholder} />
      </View>

      <View style={styles.tabs}>
        {(['followers', 'following'] as const).map((key) => {
          const selected = active === key;
          return (
            <Pressable
              key={key}
              onPress={() => setActive(key)}
              style={[styles.tab, selected && styles.tabActive]}
            >
              <Text style={[styles.tabText, selected && styles.tabTextActive]}>
                {key === 'followers'
                  ? t('profile.followers')
                  : t('profile.following')}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator color={palette.primary} style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.user_id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 24,
            gap: 8,
            flexGrow: 1,
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>{emptyText}</Text>
          }
          renderItem={({ item }: { item: FollowListItem }) => (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/(app)/user/${item.username}`)}
            >
              <UserAvatar
                uri={item.avatar_url}
                name={item.display_name}
                size={48}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.display_name}</Text>
                <Text style={styles.username}>
                  @{item.username} · Lv {item.level}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  title: {
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
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.borderSubtle,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: palette.primary,
  },
  tabText: {
    color: palette.textDisabled,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  tabTextActive: {
    color: palette.textPrimary,
  },
  empty: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    textAlign: 'center',
    marginTop: 48,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.borderSubtle,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${palette.primary}33`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: palette.primary,
    fontFamily: fonts.bold,
    fontSize: 18,
  },
  name: {
    color: palette.textPrimary,
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
  username: {
    color: palette.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 2,
  },
});
