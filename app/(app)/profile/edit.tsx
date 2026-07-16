import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppDispatch, useAppSelector } from '@/src/core/hooks';
import { updateProfile } from '@/src/features/social/profileApi';
import {
  selectMyProfile,
  setMyProfile,
} from '@/src/features/social/profileSlice';
import { GradientButton } from '@/src/shared/ui/GradientButton';
import { fonts, palette } from '@/src/shared/ui/theme';

export default function ProfileEditScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const profile = useAppSelector(selectMyProfile);

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [isPublic, setIsPublic] = useState(profile?.is_public_profile ?? true);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const updated = await updateProfile(profile.user_id, {
        display_name: displayName.trim() || profile.username,
        bio: bio.trim(),
        is_public_profile: isPublic,
      });
      dispatch(setMyProfile(updated));
      router.back();
    } catch (error) {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('common.error'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <ChevronLeft size={22} color={palette.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{t('profile.editTitle')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>{t('profile.displayName')}</Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          style={styles.input}
          placeholderTextColor={palette.textDisabled}
        />

        <Text style={styles.label}>{t('profile.bio')}</Text>
        <TextInput
          value={bio}
          onChangeText={setBio}
          multiline
          style={[styles.input, styles.bio]}
          placeholderTextColor={palette.textDisabled}
        />

        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('profile.publicProfile')}</Text>
          <Switch
            value={isPublic}
            onValueChange={setIsPublic}
            trackColor={{ true: palette.primary, false: '#333' }}
          />
        </View>

        <GradientButton
          title={t('common.save')}
          loading={loading}
          onPress={() => void handleSave()}
          style={{ marginTop: 20 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
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
  form: { padding: 24, gap: 8 },
  label: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 8,
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
  bio: { minHeight: 100, textAlignVertical: 'top' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  rowLabel: {
    color: palette.textPrimary,
    fontFamily: fonts.medium,
    fontSize: 15,
  },
});
