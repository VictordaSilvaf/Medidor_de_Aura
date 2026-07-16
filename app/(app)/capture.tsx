import { CameraView } from 'expo-camera';
import { useRouter } from 'expo-router';
import {
  Film,
  FlipHorizontal2,
  ImagePlus,
  X,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppDispatch } from '@/src/core/hooks';
import {
  MAX_VIDEO_DURATION_MS,
  MAX_VIDEO_FILE_SIZE_BYTES,
  RECORD_COUNTDOWN_SECONDS,
} from '@/src/features/video-analysis/constants';
import { setPendingCapture } from '@/src/features/video-analysis/pendingCaptureSlice';
import {
  ensureCapturePermissions,
  openSystemSettings,
} from '@/src/features/video-analysis/permissions';
import { pickGalleryVideo } from '@/src/features/video-analysis/pickGalleryVideo';
import { validateVideoMeta } from '@/src/features/video-analysis/validateVideo';
import { GradientButton } from '@/src/shared/ui/GradientButton';
import { fonts, palette } from '@/src/shared/ui/theme';

type Phase = 'idle' | 'countdown' | 'recording';

function formatSeconds(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function CaptureScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const cameraRef = useRef<ComponentRef<typeof CameraView>>(null);

  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [ready, setReady] = useState(false);
  const [permissionOk, setPermissionOk] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [countdown, setCountdown] = useState(RECORD_COUNTDOWN_SECONDS);
  const [elapsedMs, setElapsedMs] = useState(0);

  const pulse = useSharedValue(1);
  const timersRef = useRef<
    (ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>)[]
  >([]);

  const clearTimers = useCallback(() => {
    for (const t of timersRef.current) clearTimeout(t as ReturnType<typeof setTimeout>);
    timersRef.current = [];
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await ensureCapturePermissions();
      if (cancelled) return;
      setPermissionOk(result.ok);
      if (!result.ok && !result.canAskAgain) {
        Alert.alert(
          'Permissões necessárias',
          'Ative câmera e microfone nas configurações para medir sua aura.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Abrir ajustes', onPress: () => void openSystemSettings() },
          ],
        );
      }
    })();
    return () => {
      cancelled = true;
      clearTimers();
    };
  }, [clearTimers]);

  const goToPreview = useCallback(
    (video: {
      uri: string;
      durationMs: number;
      fileSizeBytes: number;
      mimeType: string;
      fileName: string;
      source: 'camera' | 'gallery';
    }) => {
      dispatch(
        setPendingCapture({
          uri: video.uri,
          source: video.source,
          durationMs: video.durationMs,
          fileSizeBytes: video.fileSizeBytes,
          mimeType: video.mimeType,
          fileName: video.fileName,
        }),
      );
      router.push('/(app)/preview');
    },
    [dispatch, router],
  );

  const startRecording = useCallback(async () => {
    if (!cameraRef.current || !ready) return;
    setPhase('recording');
    setElapsedMs(0);
    pulse.set(withTiming(1.08, { duration: 400 }));

    const startedAt = Date.now();
    const tick = setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 200);
    timersRef.current.push(tick);

    try {
      const recorded = await cameraRef.current.recordAsync({
        maxDuration: Math.floor(MAX_VIDEO_DURATION_MS / 1000),
        maxFileSize: MAX_VIDEO_FILE_SIZE_BYTES,
        // H.264 quando disponível (iOS) — melhor interoperabilidade com Android/R2.
        codec: 'avc1',
      });

      clearTimers();
      setPhase('idle');
      pulse.set(withTiming(1, { duration: 200 }));

      if (!recorded?.uri) return;

      const durationMs = Math.min(Date.now() - startedAt, MAX_VIDEO_DURATION_MS);
      const validated = validateVideoMeta({
        uri: recorded.uri,
        durationMs,
        mimeType: 'video/mp4',
      });
      goToPreview({ ...validated, source: 'camera' });
    } catch (error) {
      clearTimers();
      setPhase('idle');
      pulse.set(withTiming(1, { duration: 200 }));
      const message =
        error instanceof Error ? error.message : 'Não foi possível gravar o vídeo.';
      Alert.alert('Gravação', message);
    }
  }, [clearTimers, goToPreview, pulse, ready]);

  const beginCountdown = useCallback(() => {
    if (phase !== 'idle' || !ready) return;
    clearTimers();
    setPhase('countdown');
    setCountdown(RECORD_COUNTDOWN_SECONDS);

    let remaining = RECORD_COUNTDOWN_SECONDS;
    const tick = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(tick);
        void startRecording();
      }
    }, 1000);
    timersRef.current.push(tick);
  }, [clearTimers, phase, ready, startRecording]);

  const stopRecording = useCallback(() => {
    if (phase !== 'recording') return;
    cameraRef.current?.stopRecording();
  }, [phase]);

  const handleGallery = useCallback(async () => {
    try {
      const video = await pickGalleryVideo();
      if (!video) return;
      goToPreview({ ...video, source: 'gallery' });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha ao escolher o vídeo.';
      if (message.includes('configurações')) {
        Alert.alert('Galeria', message, [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir ajustes', onPress: () => void openSystemSettings() },
        ]);
        return;
      }
      Alert.alert('Galeria', message);
    }
  }, [goToPreview]);

  const recordButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  if (permissionOk === false) {
    return (
      <View style={[styles.root, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.permissionTitle}>Precisamos da câmera</Text>
        <Text style={styles.permissionBody}>
          Para medir sua aura, permita câmera e microfone. Você também pode
          enviar um vídeo da galeria (até 1 minuto / 50 MB).
        </Text>
        <GradientButton
          title="Permitir acesso"
          onPress={() => {
            void ensureCapturePermissions().then((r) => setPermissionOk(r.ok));
          }}
          style={{ alignSelf: 'stretch', marginHorizontal: 24 }}
        />
        <GradientButton
          title="Enviar da galeria"
          variant="ghost"
          icon={<ImagePlus size={18} color={palette.textPrimary} />}
          onPress={() => void handleGallery()}
          style={{ alignSelf: 'stretch', marginHorizontal: 24, marginTop: 12 }}
        />
        <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={styles.link}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {permissionOk ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          mode="video"
          mute={false}
          videoQuality="720p"
          onCameraReady={() => setReady(true)}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.cameraPlaceholder]} />
      )}

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          onPress={() => {
            if (phase === 'recording') stopRecording();
            clearTimers();
            router.back();
          }}
          style={styles.iconBtn}
        >
          <X size={20} color={palette.textPrimary} strokeWidth={1.8} />
        </Pressable>
        <View style={styles.badge}>
          <Film size={14} color={palette.neon} strokeWidth={2} />
          <Text style={styles.badgeText}>
            {phase === 'recording'
              ? formatSeconds(elapsedMs)
              : 'Até 1:00 · 50 MB'}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Inverter câmera"
          disabled={phase !== 'idle'}
          onPress={() =>
            setFacing((current) => (current === 'front' ? 'back' : 'front'))
          }
          style={styles.iconBtn}
        >
          <FlipHorizontal2 size={20} color={palette.textPrimary} strokeWidth={1.8} />
        </Pressable>
      </View>

      {phase === 'countdown' ? (
        <Animated.View
          entering={ZoomIn.springify().damping(14)}
          exiting={FadeOut.duration(120)}
          style={styles.countdownOverlay}
        >
          <Text style={styles.countdownNumber}>{countdown}</Text>
          <Text style={styles.countdownHint}>Prepare-se</Text>
        </Animated.View>
      ) : null}

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enviar vídeo da galeria"
          disabled={phase !== 'idle'}
          onPress={() => void handleGallery()}
          style={styles.sideAction}
        >
          <ImagePlus size={22} color={palette.textPrimary} strokeWidth={1.8} />
          <Text style={styles.sideLabel}>Galeria</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            phase === 'recording' ? 'Parar gravação' : 'Iniciar gravação'
          }
          disabled={!ready || phase === 'countdown'}
          onPress={() => {
            if (phase === 'recording') stopRecording();
            else beginCountdown();
          }}
        >
          <Animated.View
            style={[
              styles.recordOuter,
              phase === 'recording' && styles.recordOuterActive,
              recordButtonStyle,
            ]}
          >
            <View
              style={[
                styles.recordInner,
                phase === 'recording' && styles.recordInnerStop,
              ]}
            />
          </Animated.View>
        </Pressable>

        <View style={styles.sideAction}>
          <Animated.Text entering={FadeIn} style={styles.sideLabel}>
            {phase === 'idle'
              ? 'Gravar'
              : phase === 'countdown'
                ? 'Contagem'
                : 'Parar'}
          </Animated.Text>
        </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  cameraPlaceholder: {
    backgroundColor: '#111118',
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
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: palette.borderSubtle,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: palette.borderSubtle,
  },
  badgeText: {
    color: palette.textPrimary,
    fontFamily: fonts.medium,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(9,9,11,0.55)',
  },
  countdownNumber: {
    color: '#FFFFFF',
    fontFamily: fonts.bold,
    fontSize: 96,
    letterSpacing: 2,
  },
  countdownHint: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 16,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sideAction: {
    width: 72,
    alignItems: 'center',
    gap: 6,
  },
  sideLabel: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  recordOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordOuterActive: {
    borderColor: palette.error,
  },
  recordInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: palette.error,
  },
  recordInnerStop: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  permissionTitle: {
    color: palette.textPrimary,
    fontFamily: fonts.bold,
    fontSize: 24,
    textAlign: 'center',
  },
  permissionBody: {
    color: palette.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 8,
  },
  link: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 15,
  },
});
