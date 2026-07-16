import { useRouter } from 'expo-router';
import { Pencil, Settings } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { useAppDispatch, useAppSelector } from '@/src/core/hooks';
import { signOut } from '@/src/features/auth/authService';
import { selectAuthUser } from '@/src/features/auth/authSlice';
import {
  selectMyProfile,
  setMyProfile,
} from '@/src/features/social/profileSlice';
import { GradientButton } from '@/src/shared/ui/GradientButton';
import { fonts, palette } from '@/src/shared/ui/theme';

export default function ProfileTabScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const profile = useAppSelector(selectMyProfile);

  const handleSignOut = async () => {
    try {
      await signOut();
      dispatch(setMyProfile(null));
    } catch (error) {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('common.error'),
      );
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('profile.title')}</Text>
        <Pressable
          onPress={() => router.push('/(app)/settings')}
          style={styles.iconBtn}
        >
          <Settings size={18} color={palette.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLetter}>
            {(profile?.display_name ?? '?').slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{profile?.display_name ?? '—'}</Text>
        <Text style={styles.username}>@{profile?.username ?? '—'}</Text>
        <Text style={styles.level}>
          {t('profile.levelXp', {
            level: profile?.level ?? 1,
            xp: profile?.xp ?? 0,
          })}
        </Text>
        <Text style={styles.aura}>
          {t('profile.aura', { count: profile?.total_aura ?? 0 })}
        </Text>
        {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.actions}>
        <GradientButton
          title={t('profile.edit')}
          icon={<Pencil size={16} color="#FFF" />}
          onPress={() => router.push('/(app)/profile/edit')}
        />
        <GradientButton
          title={t('common.signOut')}
          variant="ghost"
          onPress={() => void handleSignOut()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg, paddingHorizontal: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  title: {
    color: palette.textPrimary,
    fontFamily: fonts.bold,
    fontSize: 24,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.borderSubtle,
  },
  hero: { alignItems: 'center', gap: 6, marginBottom: 28 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: `${palette.primary}33`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarLetter: {
    color: palette.primary,
    fontFamily: fonts.bold,
    fontSize: 36,
  },
  name: {
    color: palette.textPrimary,
    fontFamily: fonts.bold,
    fontSize: 22,
  },
  username: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  level: {
    color: palette.neon,
    fontFamily: fonts.semibold,
    fontSize: 14,
    marginTop: 6,
  },
  aura: {
    color: palette.textPrimary,
    fontFamily: fonts.medium,
    fontSize: 15,
  },
  bio: {
    color: palette.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
  },
  email: {
    color: palette.textDisabled,
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 8,
  },
  actions: { gap: 12 },
});
