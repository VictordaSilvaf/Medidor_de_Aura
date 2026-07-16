import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppDispatch, useAppSelector } from '@/src/core/hooks';
import { selectAuthUser } from '@/src/features/auth/authSlice';
import {
  createProfile,
  normalizeUsername,
} from '@/src/features/social/profileApi';
import { setMyProfile } from '@/src/features/social/profileSlice';
import { selectDefaultVisibility } from '@/src/features/prefs/prefsSlice';
import { GradientButton } from '@/src/shared/ui/GradientButton';
import { fonts, palette } from '@/src/shared/ui/theme';

export default function ProfileSetupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const defaultVisibility = useAppSelector(selectDefaultVisibility);

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user?.id) return;
    const normalized = normalizeUsername(username);
    if (!normalized) {
      Alert.alert(t('common.error'), t('profile.usernameRequired'));
      return;
    }
    setLoading(true);
    try {
      const profile = await createProfile({
        userId: user.id,
        displayName: displayName || normalized,
        username: normalized,
        defaultVisibility,
      });
      dispatch(setMyProfile(profile));
      router.replace('/(app)/(tabs)');
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      Alert.alert(
        t('common.error'),
        code === 'USERNAME_TAKEN'
          ? t('profile.usernameTaken')
          : code === 'USERNAME_INVALID'
            ? t('profile.usernameHint')
            : code || t('common.error'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 32 }]}>
      <Text style={styles.title}>{t('profile.setupTitle')}</Text>
      <Text style={styles.subtitle}>{t('profile.setupSubtitle')}</Text>

      <Text style={styles.label}>{t('profile.displayName')}</Text>
      <TextInput
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Nome completo"
        placeholderTextColor={palette.textDisabled}
        style={styles.input}
      />

      <Text style={styles.label}>{t('profile.username')}</Text>
      <TextInput
        value={username}
        onChangeText={(v) => setUsername(normalizeUsername(v))}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="sixseven_"
        placeholderTextColor={palette.textDisabled}
        style={styles.input}
      />
      <Text style={styles.hint}>{t('profile.usernameHint')}</Text>

      <GradientButton
        title={t('common.continue')}
        loading={loading}
        onPress={() => void handleSubmit()}
        style={{ marginTop: 28 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg, paddingHorizontal: 24 },
  title: {
    color: palette.textPrimary,
    fontFamily: fonts.bold,
    fontSize: 28,
    marginBottom: 8,
  },
  subtitle: {
    color: palette.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 28,
  },
  label: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.borderSubtle,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: palette.textPrimary,
    fontFamily: fonts.medium,
    fontSize: 16,
    backgroundColor: palette.card,
  },
  hint: {
    color: palette.textDisabled,
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 8,
  },
});
