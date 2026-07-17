import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Search } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { useAppSelector } from '@/src/core/hooks';
import { selectAuthUser } from '@/src/features/auth/authSlice';
import {
  searchUsers,
  type UserSearchHit,
} from '@/src/features/social/profileApi';
import { UserAvatar } from '@/src/shared/ui/UserAvatar';
import { fonts, palette } from '@/src/shared/ui/theme';

export default function SearchScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAppSelector(selectAuthUser);
  const [input, setInput] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setDebounced(input.trim()), 300);
    return () => clearTimeout(id);
  }, [input]);

  const { data = [], isFetching, isError, error } = useQuery({
    queryKey: ['user-search', debounced],
    queryFn: () => searchUsers(debounced, 30, user?.id),
    enabled: debounced.length >= 1,
  });

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.topBar}>
        <Text style={styles.title}>{t('search.title')}</Text>
      </View>

      <View style={styles.searchWrap}>
        <Search size={18} color={palette.textSecondary} />
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={t('search.placeholder')}
          placeholderTextColor={palette.textDisabled}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          returnKeyType="search"
        />
      </View>

      {debounced.length < 1 ? (
        <Text style={styles.hint}>{t('search.hint')}</Text>
      ) : isFetching && data.length === 0 ? (
        <ActivityIndicator color={palette.primary} style={{ marginTop: 32 }} />
      ) : isError ? (
        <Text style={styles.hint}>
          {error instanceof Error ? error.message : t('common.error')}
        </Text>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.user_id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 24,
            gap: 8,
            flexGrow: 1,
          }}
          ListEmptyComponent={
            <Text style={styles.hint}>{t('search.empty')}</Text>
          }
          renderItem={({ item }: { item: UserSearchHit }) => (
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
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  title: {
    color: palette.textPrimary,
    fontFamily: fonts.bold,
    fontSize: 22,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.borderSubtle,
  },
  input: {
    flex: 1,
    color: palette.textPrimary,
    fontFamily: fonts.medium,
    fontSize: 16,
    padding: 0,
  },
  hint: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    textAlign: 'center',
    marginTop: 40,
    paddingHorizontal: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.borderSubtle,
  },
  name: {
    color: palette.textPrimary,
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
  username: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 13,
    marginTop: 2,
  },
});
