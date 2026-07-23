import { useRouter } from 'expo-router';
import { Camera, ChevronLeft, ImageIcon } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppDispatch, useAppSelector } from '@/src/core/hooks';
import { updateProfile } from '@/src/features/social/profileApi';
import { pickAndUploadProfileImage } from '@/src/features/social/profileImageApi';
import {
  selectMyProfile,
  setMyProfile,
} from '@/src/features/social/profileSlice';
import { GradientButton } from '@/src/shared/ui/GradientButton';
import { UserAvatar } from '@/src/shared/ui/UserAvatar';
import { fonts, usePalette, useThemedStyles, type AppPalette } from '@/src/shared/ui/theme';

export default function ProfileEditScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = usePalette();
  const styles = useThemedStyles(createStyles);
  const dispatch = useAppDispatch();
  const profile = useAppSelector(selectMyProfile);

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [isPublic, setIsPublic] = useState(profile?.is_public_profile ?? true);
  const [defaultVisibility, setDefaultVisibility] = useState(
    profile?.default_visibility ?? 'public',
  );
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<'avatar' | 'banner' | null>(null);

  const handleImage = async (kind: 'avatar' | 'banner') => {
    if (!profile || uploading) return;
    setUploading(kind);
    try {
      const updated = await pickAndUploadProfileImage({
        userId: profile.user_id,
        kind,
      });
      if (updated) dispatch(setMyProfile(updated));
    } catch (error) {
      const msg =
        error instanceof Error &&
        (error.message === 'LIBRARY_PERMISSION_REQUIRED' ||
          error.message === 'LIBRARY_PERMISSION_DENIED')
          ? t('profile.imagePermission')
          : t('profile.imageUploadFailed');
      Alert.alert(t('common.error'), msg);
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const updated = await updateProfile(profile.user_id, {
        display_name: displayName.trim() || profile.username,
        username: username.trim() || profile.username,
        bio: bio.trim(),
        is_public_profile: isPublic,
        default_visibility: defaultVisibility,
      });
      dispatch(setMyProfile(updated));
      router.back();
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      Alert.alert(
        t('common.error'),
        code === 'USERNAME_TAKEN'
          ? t('profile.usernameTaken')
          : code === 'USERNAME_INVALID'
            ? t('profile.usernameHint')
            : error instanceof Error
              ? error.message
              : t('common.error'),
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

      <ScrollView
        contentContainerStyle={{
          padding: 24,
          paddingBottom: insets.bottom + 32,
          gap: 8,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          style={styles.bannerBtn}
          onPress={() => void handleImage('banner')}
          disabled={uploading !== null}
        >
          {profile?.banner_url ? (
            <Image
              source={{ uri: profile.banner_url }}
              style={styles.bannerPreview}
            />
          ) : (
            <View style={[styles.bannerPreview, styles.bannerEmpty]}>
              <ImageIcon size={22} color={palette.textSecondary} />
              <Text style={styles.bannerHint}>{t('profile.changeBanner')}</Text>
            </View>
          )}
          <View style={styles.bannerOverlay}>
            <Text style={styles.bannerOverlayText}>
              {uploading === 'banner'
                ? t('common.loading')
                : t('profile.changeBanner')}
            </Text>
          </View>
        </Pressable>

        <View style={styles.avatarRow}>
          <Pressable
            onPress={() => void handleImage('avatar')}
            disabled={uploading !== null}
            style={styles.avatarBtn}
          >
            <UserAvatar
              uri={profile?.avatar_url}
              name={profile?.display_name}
              size={88}
            />
            <View style={styles.cameraBadge}>
              <Camera size={14} color="#FFF" />
            </View>
          </Pressable>
          <Text style={styles.avatarHint}>
            {uploading === 'avatar'
              ? t('common.loading')
              : t('profile.changeAvatar')}
          </Text>
        </View>

        <Text style={styles.label}>{t('profile.displayName')}</Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          style={styles.input}
          placeholderTextColor={palette.textDisabled}
        />

        <Text style={styles.label}>{t('profile.username')}</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          placeholderTextColor={palette.textDisabled}
        />
        <Text style={styles.fieldHint}>{t('profile.usernameHint')}</Text>

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
              trackColor={{ true: palette.primary, false: palette.switchTrackOff }}
          />
        </View>

        <Text style={styles.label}>{t('profile.defaultVisibility')}</Text>
        <View style={styles.visibilityChoices}>
          {(['public', 'private'] as const).map((visibility) => (
            <Pressable
              key={visibility}
              accessibilityRole="button"
              onPress={() => setDefaultVisibility(visibility)}
              style={[
                styles.visibilityChoice,
                defaultVisibility === visibility &&
                  styles.visibilityChoiceActive,
              ]}
            >
              <Text
                style={[
                  styles.visibilityText,
                  defaultVisibility === visibility &&
                    styles.visibilityTextActive,
                ]}
              >
                {t(`settings.visibility${visibility === 'public' ? 'Public' : 'Private'}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        <GradientButton
          title={t('common.save')}
          loading={loading}
          onPress={() => void handleSave()}
          style={{ marginTop: 20 }}
        />
      </ScrollView>
    </View>
  );
}

const createStyles = (palette: AppPalette) =>
  StyleSheet.create({
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
  bannerBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
  },
  bannerPreview: {
    width: '100%',
    height: 110,
    backgroundColor: palette.surface,
  },
  bannerEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bannerHint: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  bannerOverlay: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  bannerOverlayText: {
    color: '#FFF',
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  avatarRow: {
    alignItems: 'center',
    marginVertical: 12,
    gap: 8,
  },
  avatarBtn: { position: 'relative' },
  cameraBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: palette.bg,
  },
  avatarHint: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  label: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 8,
  },
  fieldHint: {
    color: palette.textDisabled,
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 4,
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
  visibilityChoices: {
    flexDirection: 'row',
    gap: 8,
  },
  visibilityChoice: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.borderSubtle,
    backgroundColor: palette.card,
  },
  visibilityChoiceActive: {
    borderColor: palette.primary,
    backgroundColor: `${palette.primary}22`,
  },
  visibilityText: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
  },
  visibilityTextActive: {
    color: palette.textPrimary,
  },
});
