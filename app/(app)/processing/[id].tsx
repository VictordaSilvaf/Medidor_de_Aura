import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAnalysisSubscription } from '@/src/features/video-analysis/useAnalysisSubscription';
import { AuraOrb } from '@/src/shared/ui/AuraOrb';
import { AuraParticles } from '@/src/shared/ui/AuraParticles';
import { GradientButton } from '@/src/shared/ui/GradientButton';
import { brandGradient, fonts, usePalette, useThemedStyles, type AppPalette } from '@/src/shared/ui/theme';

const STATUS_COPY: Record<string, string> = {
  pending_upload: 'Preparando upload…',
  uploaded: 'Vídeo recebido…',
  queued: 'Na fila de análise…',
  processing: 'Lendo sua aura…',
  completed: 'Análise concluída',
  failed: 'Falha no processamento',
};

export default function ProcessingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = usePalette();
  const styles = useThemedStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { analysis, error, loading } = useAnalysisSubscription(id);

  const spin = useSharedValue(0);
  useEffect(() => {
    spin.set(
      withRepeat(
        withTiming(1, { duration: 4200, easing: Easing.linear }),
        -1,
        false,
      ),
    );
  }, [spin]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));

  useEffect(() => {
    if (!analysis) return;
    if (analysis.status === 'completed') {
      router.replace(`/(app)/reveal/${analysis.id}`);
    }
  }, [analysis, router]);

  const status = analysis?.status ?? 'queued';
  const message =
    error ??
    (loading ? 'Conectando…' : STATUS_COPY[status] ?? 'Processando…');

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.stage}>
        <AuraParticles radius={180} color={palette.primary} count={16} intensity={0.7} />
        <Animated.View style={orbStyle}>
          <AuraOrb
            size={220}
            colors={brandGradient}
            glowColor={palette.primary}
            intensity={0.9}
          />
        </Animated.View>
      </View>

      <Text style={styles.title}>{message}</Text>
      <Text style={styles.subtitle}>
        Estamos processando seu vídeo. Você receberá uma notificação quando o resultado estiver pronto.
      </Text>

      {status === 'failed' ? (
        <GradientButton
          title="Tentar de novo"
          onPress={() => router.replace('/(app)/capture')}
          style={{ marginHorizontal: 24, marginTop: 20 }}
        />
      ) : (
        <GradientButton
          title="Voltar ao início"
          variant="ghost"
          onPress={() => router.replace('/(app)/(tabs)')}
          style={{ marginHorizontal: 24, marginTop: 20 }}
        />
      )}
    </View>
  );
}

const createStyles = (palette: AppPalette) =>
  StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
    justifyContent: 'flex-end',
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: palette.textPrimary,
    fontFamily: fonts.semibold,
    fontSize: 20,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  subtitle: {
    color: palette.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 32,
    marginTop: 10,
  },
});
