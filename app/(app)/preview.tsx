import { useRouter } from 'expo-router';
import { RotateCcw, Upload, X } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';

import { useAppDispatch, useAppSelector } from '@/src/core/hooks';
import { selectDefaultVisibility } from '@/src/features/prefs/prefsSlice';
import type { VideoVisibility } from '@/src/features/social/types';
import { submitPendingCapture } from '@/src/features/video-analysis/analysisApi';
import {
  clearActiveChallengeId,
  clearPendingCapture,
  selectActiveChallengeId,
  selectPendingCapture,
} from '@/src/features/video-analysis/pendingCaptureSlice';
import { GradientButton } from '@/src/shared/ui/GradientButton';
import { fonts, palette } from '@/src/shared/ui/theme';

export default function PreviewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const capture = useAppSelector(selectPendingCapture);
  const defaultVisibility = useAppSelector(selectDefaultVisibility);
  const activeChallengeId = useAppSelector(selectActiveChallengeId);

  const [visibility, setVisibility] = useState<VideoVisibility>(defaultVisibility);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const player = useVideoPlayer(capture?.uri ?? null, (instance) => {
    instance.loop = true;
    instance.play();
  });

  const handleDiscard = useCallback(() => {
    dispatch(clearPendingCapture());
    router.replace('/(app)/capture');
  }, [dispatch, router]);

  const handleSubmit = useCallback(async () => {
    if (!capture || uploading) return;
    setUploading(true);
    setProgress(0);
    try {
      const analysis = await submitPendingCapture({
        ...capture,
        visibility,
        challengeId: capture.challengeId ?? activeChallengeId,
        onUploadProgress: setProgress,
      });
      dispatch(clearPendingCapture());
      dispatch(clearActiveChallengeId());
      router.replace(`/(app)/processing/${analysis.id}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('common.error');
      Alert.alert(t('common.error'), message);
      setUploading(false);
    }
  }, [
    activeChallengeId,
    capture,
    dispatch,
    router,
    t,
    uploading,
    visibility,
  ]);

  if (!capture) {
    return (
      <View style={[styles.root, styles.centered]}>
        <Text style={styles.empty}>{t('preview.empty')}</Text>
        <GradientButton
          title={t('preview.backToCapture')}
          onPress={() => router.replace('/(app)/capture')}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          disabled={uploading}
          onPress={() => {
            dispatch(clearPendingCapture());
            router.back();
          }}
          style={styles.iconBtn}
        >
          <X size={20} color={palette.textPrimary} strokeWidth={1.8} />
        </Pressable>
        <Text style={styles.title}>{t('preview.title')}</Text>
        <View style={styles.iconBtnPlaceholder} />
      </View>

      <View style={[styles.panel, { paddingBottom: insets.bottom + 20 }]}>
        <Text style={styles.hint}>
          {t('preview.meta', {
            source:
              capture.source === 'camera'
                ? t('preview.sourceCamera')
                : t('preview.sourceGallery'),
            seconds: Math.round(capture.durationMs / 1000),
            mb: (capture.fileSizeBytes / (1024 * 1024)).toFixed(1),
          })}
        </Text>

        <Text style={styles.visibilityLabel}>{t('preview.visibility')}</Text>
        <View style={styles.visibilityRow}>
          {(['private', 'public'] as const).map((value) => {
            const active = visibility === value;
            return (
              <Pressable
                key={value}
                disabled={uploading}
                onPress={() => setVisibility(value)}
                style={[styles.visCard, active && styles.visCardActive]}
              >
                <Text style={[styles.visTitle, active && styles.visTitleActive]}>
                  {value === 'public' ? t('preview.public') : t('preview.private')}
                </Text>
                <Text style={styles.visHint}>
                  {value === 'public'
                    ? t('preview.publicHint')
                    : t('preview.privateHint')}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {uploading ? (
          <View style={styles.progressBlock}>
            <Text style={styles.progressLabel}>
              {t('preview.uploading', { percent: Math.round(progress * 100) })}
            </Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.round(progress * 100)}%` },
                ]}
              />
            </View>
          </View>
        ) : (
          <View style={styles.actions}>
            <GradientButton
              title={t('preview.discard')}
              variant="ghost"
              icon={<RotateCcw size={18} color={palette.textPrimary} />}
              onPress={handleDiscard}
              style={styles.action}
            />
            <GradientButton
              title={t('preview.useThis')}
              icon={<Upload size={18} color="#FFFFFF" />}
              onPress={() => void handleSubmit()}
              style={styles.action}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    padding: 24,
  },
  empty: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 16,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: palette.borderSubtle,
  },
  iconBtnPlaceholder: {
    width: 42,
    height: 42,
  },
  title: {
    color: palette.textPrimary,
    fontFamily: fonts.semibold,
    fontSize: 16,
    letterSpacing: 1,
  },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    gap: 12,
    backgroundColor: 'rgba(9,9,11,0.82)',
    paddingTop: 16,
  },
  hint: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 13,
    textAlign: 'center',
  },
  visibilityLabel: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  visibilityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  visCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.borderSubtle,
    padding: 12,
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  visCardActive: {
    borderColor: palette.primary,
    backgroundColor: `${palette.primary}22`,
  },
  visTitle: {
    color: palette.textSecondary,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  visTitleActive: {
    color: palette.textPrimary,
  },
  visHint: {
    color: palette.textDisabled,
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 15,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  action: {
    flex: 1,
  },
  progressBlock: {
    gap: 10,
    paddingBottom: 8,
  },
  progressLabel: {
    color: palette.textPrimary,
    fontFamily: fonts.medium,
    fontSize: 14,
    textAlign: 'center',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: palette.primary,
  },
});
