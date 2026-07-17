import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft,
  MoreHorizontal,
  UserMinus,
  UserPlus,
} from 'lucide-react-native';
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
import { useAppSelector } from '@/src/core/hooks';
import { selectAuthUser } from '@/src/features/auth/authSlice';
import {
  fetchPublicProfileBundle,
  followUser,
  unfollowUser,
} from '@/src/features/social/followApi';
import {
  blockUser,
  reportContent,
} from '@/src/features/social/notificationsApi';
import { GradientButton } from '@/src/shared/ui/GradientButton';
import {
  ProfileHeader,
  ProfilePostsGrid,
} from '@/src/shared/ui/ProfileView';
import { fonts, palette } from '@/src/shared/ui/theme';

export default function UserProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const viewer = useAppSelector(selectAuthUser);
  const { username } = useLocalSearchParams<{ username: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['public-profile', username],
    queryFn: () => fetchPublicProfileBundle(username!, viewer?.id),
    enabled: Boolean(username),
  });

  const isOwn = viewer?.id && data?.profile.user_id === viewer.id;

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!viewer?.id || !data) return;
      if (data.amFollowing) {
        await unfollowUser(viewer.id, data.profile.user_id);
      } else {
        await followUser(viewer.id, data.profile.user_id);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['public-profile', username],
      });
      void queryClient.invalidateQueries({
        queryKey: ['social-counts', data?.profile.user_id],
      });
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.root, styles.centered, { padding: 24 }]}>
        <Text style={styles.errorText}>
          {error instanceof Error ? error.message : t('profile.notFound')}
        </Text>
        <GradientButton
          title={t('common.back')}
          onPress={() => router.back()}
          style={{ marginTop: 16, alignSelf: 'stretch' }}
        />
      </View>
    );
  }

  const { profile, counts, amFollowing, posts } = data;
  const openSafetyMenu = () => {
    if (!viewer?.id || isOwn) return;
    Alert.alert(profile.display_name, undefined, [
      {
        text: t('safety.report'),
        onPress: () => {
          void reportContent({
            reporterId: viewer.id,
            reportedUserId: profile.user_id,
            reason: t('safety.reason'),
          }).then(() => Alert.alert(t('safety.reportSent')));
        },
      },
      {
        text: t('safety.block'),
        style: 'destructive',
        onPress: () =>
          Alert.alert(t('safety.block'), t('safety.blockConfirm'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('safety.block'),
              style: 'destructive',
              onPress: () => {
                void blockUser(viewer.id, profile.user_id).then(() =>
                  router.back(),
                );
              },
            },
          ]),
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <ChevronLeft size={22} color={palette.textPrimary} />
        </Pressable>
        <Text style={styles.topUsername}>@{profile.username}</Text>
        {isOwn ? (
          <View style={styles.iconBtnPlaceholder} />
        ) : (
          <Pressable onPress={openSafetyMenu} style={styles.iconBtn}>
            <MoreHorizontal size={21} color={palette.textSecondary} />
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 28,
        }}
      >
        <ProfileHeader
          profile={profile}
          counts={counts}
          onFollowers={() =>
            router.push({
              pathname: '/(app)/connections/[userId]',
              params: { userId: profile.user_id, tab: 'followers' },
            })
          }
          onFollowing={() =>
            router.push({
              pathname: '/(app)/connections/[userId]',
              params: { userId: profile.user_id, tab: 'following' },
            })
          }
          actions={
            isOwn ? (
              <GradientButton
                title={t('profile.edit')}
                onPress={() => router.push('/(app)/profile/edit')}
              />
            ) : (
              <GradientButton
                title={
                  amFollowing ? t('profile.unfollow') : t('profile.follow')
                }
                variant={amFollowing ? 'ghost' : 'primary'}
                icon={
                  amFollowing ? (
                    <UserMinus size={16} color={palette.textPrimary} />
                  ) : (
                    <UserPlus size={16} color="#FFF" />
                  )
                }
                loading={followMutation.isPending}
                onPress={() => followMutation.mutate()}
              />
            )
          }
        />

        <ProfilePostsGrid
          posts={posts}
          onOpen={(id) => router.push(`/(app)/post/${id}`)}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  centered: { alignItems: 'center', justifyContent: 'center' },
  errorText: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    textAlign: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  topUsername: {
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
});
