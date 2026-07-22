import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ImagePlus, RotateCcw, Upload, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView, type VideoThumbnail } from 'expo-video';

import { useAppDispatch, useAppSelector } from '@/src/core/hooks';
import { selectAuthUser } from '@/src/features/auth/authSlice';
import { selectDefaultVisibility } from '@/src/features/prefs/prefsSlice';
import { presentProPaywallIfNeeded } from '@/src/features/monetization/monetizationBootstrap';
import { isQuotaExceededError } from '@/src/features/monetization/quotaErrors';
import type { VideoVisibility } from '@/src/features/social/types';
import { submitPendingCapture } from '@/src/features/video-analysis/analysisApi';
import {
  clearActiveChallengeId,
  clearPendingCapture,
  selectActiveChallengeId,
  selectPendingCapture,
} from '@/src/features/video-analysis/pendingCaptureSlice';
import {
  generateFrameCandidates,
  pickGalleryThumbnail,
  type FrameCandidate,
} from '@/src/features/video-analysis/thumbnailApi';
import { appAlert } from '@/src/shared/ui/appAlert';
import { GradientButton } from '@/src/shared/ui/GradientButton';
import { fonts, palette } from '@/src/shared/ui/theme';

export default function PreviewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const capture = useAppSelector(selectPendingCapture);
  const defaultVisibility = useAppSelector(selectDefaultVisibility);
  const activeChallengeId = useAppSelector(selectActiveChallengeId);

  const [visibility, setVisibility] = useState<VideoVisibility>(defaultVisibility);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [frames, setFrames] = useState<FrameCandidate[]>([]);
  const [framesLoading, setFramesLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [galleryUri, setGalleryUri] = useState<string | null>(null);

  const player = useVideoPlayer(capture?.uri ?? null, (instance) => {
    instance.loop = true;
    instance.play();
  });

  useEffect(() => {
    if (!capture || !player) return;
    let cancelled = false;

    void (async () => {
      setFramesLoading(true);
      try {
        // Wait briefly so the asset is ready for thumbnail extraction.
        await new Promise((r) => setTimeout(r, 400));
        const candidates = await generateFrameCandidates(
          player,
          capture.durationMs,
        );
        if (cancelled) return;
        setFrames(candidates);
        setSelectedId(candidates[0]?.id ?? null);
        setGalleryUri(null);
      } catch (error) {
        console.warn('[preview] frame generation failed', error);
        if (!cancelled) {
          setFrames([]);
          const code = error instanceof Error ? error.message : '';
          appAlert.warn(
            t('preview.cover'),
            code === 'VIDEO_FILE_MISSING'
              ? t('preview.framesMissing')
              : t('preview.framesFailed'),
          );
        }
      } finally {
        if (!cancelled) setFramesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [capture, player, t]);

  const handleDiscard = useCallback(() => {
    dispatch(clearPendingCapture());
    router.replace('/(app)/capture');
  }, [dispatch, router]);

  const handlePickGallery = useCallback(async () => {
    try {
      const picked = await pickGalleryThumbnail();
      if (!picked) return;
      setGalleryUri(picked.uri);
      setSelectedId('gallery');
    } catch (error) {
      appAlert.error(
        t('common.error'),
        error instanceof Error ? error.message : t('common.error'),
      );
    }
  }, [t]);

  const selectedSource: string | VideoThumbnail | null = (() => {
    if (selectedId === 'gallery' && galleryUri) return galleryUri;
    const frame = frames.find((f) => f.id === selectedId);
    return frame?.preview ?? galleryUri ?? null;
  })();

  const handleSubmit = useCallback(async () => {
    if (!capture || uploading || !user?.id) return;
    setUploading(true);
    setProgress(0);
    try {
      const analysis = await submitPendingCapture({
        ...capture,
        visibility,
        challengeId: capture.challengeId ?? activeChallengeId,
        title: title.trim() || null,
        thumbnailSource: selectedSource,
        userId: user.id,
        onUploadProgress: setProgress,
      });
      dispatch(clearPendingCapture());
      dispatch(clearActiveChallengeId());
      router.replace(`/(app)/processing/${analysis.id}`);
    } catch (error) {
      if (isQuotaExceededError(error)) {
        setUploading(false);
        appAlert.warn(
          t('quota.title'),
          t('quota.body', {
            daily: error.dailyUsed,
            monthly: error.monthlyUsed,
          }),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('premium.upgrade'),
              onPress: () => {
                void (async () => {
                  if (!user?.id) {
                    router.push('/premium');
                    return;
                  }
                  try {
                    const { purchased } = await presentProPaywallIfNeeded(
                      dispatch,
                      user.id,
                    );
                    if (!purchased) {
                      router.push('/premium');
                    }
                  } catch {
                    router.push('/premium');
                  }
                })();
              },
            },
          ],
        );
        return;
      }
      const message =
        error instanceof Error ? error.message : t('common.error');
      appAlert.error(t('common.error'), message);
      setUploading(false);
    }
  }, [
    activeChallengeId,
    capture,
    dispatch,
    router,
    selectedSource,
    t,
    title,
    uploading,
    user?.id,
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

      <ScrollView
        style={styles.panelScroll}
        contentContainerStyle={[
          styles.panel,
          { paddingBottom: insets.bottom + 20 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
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

        <Text style={styles.visibilityLabel}>{t('preview.titleLabel')}</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={t('preview.titlePlaceholder')}
          placeholderTextColor={palette.textDisabled}
          maxLength={80}
          editable={!uploading}
          style={styles.titleInput}
        />

        <Text style={styles.visibilityLabel}>{t('preview.cover')}</Text>
        {framesLoading ? (
          <ActivityIndicator color={palette.primary} style={{ marginVertical: 8 }} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.frameRow}
          >
            {frames.map((frame) => {
              const active = selectedId === frame.id;
              return (
                <Pressable
                  key={frame.id}
                  disabled={uploading}
                  onPress={() => {
                    setSelectedId(frame.id);
                    setGalleryUri(null);
                  }}
                  style={[styles.frameCard, active && styles.frameCardActive]}
                >
                  <Image
                    source={frame.preview}
                    style={styles.frameImage}
                    contentFit="cover"
                  />
                </Pressable>
              );
            })}
            {galleryUri ? (
              <Pressable
                disabled={uploading}
                onPress={() => setSelectedId('gallery')}
                style={[
                  styles.frameCard,
                  selectedId === 'gallery' && styles.frameCardActive,
                ]}
              >
                <Image
                  source={{ uri: galleryUri }}
                  style={styles.frameImage}
                  contentFit="cover"
                />
              </Pressable>
            ) : null}
            <Pressable
              disabled={uploading}
              onPress={() => void handlePickGallery()}
              style={styles.galleryPick}
            >
              <ImagePlus size={20} color={palette.textSecondary} />
              <Text style={styles.galleryPickText}>{t('preview.pickCover')}</Text>
            </Pressable>
          </ScrollView>
        )}

        <Text style={styles.visibilityLabel}>{t('preview.visibility')}</Text>
        <View style={styles.visibilityRow}>
          {(['public', 'private'] as const).map((value) => {
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
      </ScrollView>
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
  panelScroll: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '58%',
  },
  panel: {
    paddingHorizontal: 20,
    gap: 12,
    backgroundColor: 'rgba(9,9,11,0.9)',
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
  titleInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.borderSubtle,
    backgroundColor: 'rgba(255,255,255,0.04)',
    color: palette.textPrimary,
    fontFamily: fonts.medium,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  frameRow: {
    gap: 10,
    paddingVertical: 4,
  },
  frameCard: {
    width: 72,
    height: 96,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  frameCardActive: {
    borderColor: palette.primary,
  },
  frameImage: {
    width: '100%',
    height: '100%',
  },
  galleryPick: {
    width: 72,
    height: 96,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.borderSubtle,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 6,
  },
  galleryPickText: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 10,
    textAlign: 'center',
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
