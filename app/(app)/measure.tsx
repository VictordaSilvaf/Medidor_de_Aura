import { useRouter } from 'expo-router';
import { RotateCcw, Share2, X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  ZoomIn,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppDispatch } from '@/src/core/hooks';
import { recordAura } from '@/src/features/aura/auraSlice';
import { generateAura, type AuraResult } from '@/src/features/aura/generateAura';
import { TIER_BY_ID, tierChance } from '@/src/features/aura/tiers';
import { AuraOrb } from '@/src/shared/ui/AuraOrb';
import { AuraParticles } from '@/src/shared/ui/AuraParticles';
import { GlowCard } from '@/src/shared/ui/GlowCard';
import { GradientButton } from '@/src/shared/ui/GradientButton';
import { brandGradient, fonts, palette } from '@/src/shared/ui/theme';

const SCAN_MESSAGES = [
  'Calibrando sensores…',
  'Lendo frequência…',
  'Isolando ruído…',
  'Analisando sua aura…',
];
const SCAN_MS = 3400;
const COUNT_UP_MS = 1200;

type Phase = 'scanning' | 'reveal';

export default function MeasureScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();

  const [phase, setPhase] = useState<Phase>('scanning');
  const [messageIndex, setMessageIndex] = useState(0);
  const [result, setResult] = useState<AuraResult | null>(null);
  const [displayScore, setDisplayScore] = useState(0);

  const scanProgress = useSharedValue(0);
  const flash = useSharedValue(0);
  const burst = useSharedValue(1);
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanCleanupRef = useRef<(() => void) | null>(null);

  const startCountUp = useCallback((target: number) => {
    const startedAt = Date.now();
    countRef.current = setInterval(() => {
      const t = Math.min((Date.now() - startedAt) / COUNT_UP_MS, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayScore(Math.round(eased * target));
      if (t >= 1 && countRef.current) {
        clearInterval(countRef.current);
        countRef.current = null;
      }
    }, 24);
  }, []);

  /** Dispara timers e animações do scan. Estado deve estar em 'scanning'. */
  const beginScan = useCallback(() => {
    scanProgress.set(0);
    scanProgress.set(
      withTiming(1, {
        duration: SCAN_MS,
        easing: Easing.inOut(Easing.quad),
      }),
    );

    const messageTimer = setInterval(() => {
      setMessageIndex((current) =>
        Math.min(current + 1, SCAN_MESSAGES.length - 1),
      );
    }, Math.floor(SCAN_MS / SCAN_MESSAGES.length));

    const revealTimer = setTimeout(() => {
      clearInterval(messageTimer);
      const generated = generateAura();
      dispatch(recordAura(generated));
      setResult(generated);
      setPhase('reveal');

      // Momento da revelação: flash de energia + burst de escala no orbe.
      flash.set(
        withSequence(
          withTiming(0.85, { duration: 140 }),
          withTiming(0, { duration: 520, easing: Easing.out(Easing.quad) }),
        ),
      );
      burst.set(
        withSequence(
          withTiming(1.16, {
            duration: 260,
            easing: Easing.out(Easing.back(2)),
          }),
          withTiming(1, { duration: 420, easing: Easing.inOut(Easing.quad) }),
        ),
      );
      startCountUp(generated.score);
    }, SCAN_MS);

    scanCleanupRef.current = () => {
      clearInterval(messageTimer);
      clearTimeout(revealTimer);
    };
  }, [burst, dispatch, flash, scanProgress, startCountUp]);

  useEffect(() => {
    // O estado inicial já é a fase de scan; aqui só disparam timers/animações.
    beginScan();
    return () => {
      scanCleanupRef.current?.();
      cancelAnimation(scanProgress);
      if (countRef.current) clearInterval(countRef.current);
    };
    // Roda apenas na montagem; re-medição usa handleAgain.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAgain = useCallback(() => {
    scanCleanupRef.current?.();
    setPhase('scanning');
    setResult(null);
    setDisplayScore(0);
    setMessageIndex(0);
    beginScan();
  }, [beginScan]);

  const handleShare = useCallback(async () => {
    if (!result) return;
    const tier = TIER_BY_ID[result.tierId];
    try {
      await Share.share({
        message: `Minha aura é ${tier.label.toUpperCase()} — +${result.score} aura no Medidor de Aura. Qual é a sua?`,
      });
    } catch {
      // Compartilhamento cancelado pelo usuário — nada a fazer.
    }
  }, [result]);

  const progressStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: Math.max(scanProgress.value, 0.001) }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flash.value,
  }));

  const burstStyle = useAnimatedStyle(() => ({
    transform: [{ scale: burst.value }],
  }));

  const tier = result ? TIER_BY_ID[result.tierId] : null;
  const orbColors = tier?.gradient ?? brandGradient;
  const orbGlow = tier?.color ?? palette.primary;

  return (
    <View style={styles.root}>
      <Animated.View
        pointerEvents="none"
        style={[styles.flash, { backgroundColor: `${orbGlow}59` }, flashStyle]}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fechar medição"
        onPress={() => router.back()}
        hitSlop={10}
        style={[styles.close, { top: insets.top + 12 }]}
      >
        <X size={20} color={palette.textSecondary} strokeWidth={1.8} />
      </Pressable>

      <View style={styles.orbStage}>
        <AuraParticles
          radius={190}
          color={orbGlow}
          count={phase === 'reveal' ? 22 : 14}
          intensity={phase === 'reveal' ? 1 : 0.4}
        />
        <Animated.View style={burstStyle}>
          <AuraOrb
            size={236}
            colors={orbColors}
            glowColor={orbGlow}
            intensity={phase === 'scanning' ? 0.85 : 0.45}
          />
        </Animated.View>
      </View>

      {phase === 'scanning' ? (
        <View style={[styles.panel, { paddingBottom: insets.bottom + 36 }]}>
          <Animated.Text
            key={messageIndex}
            entering={FadeIn.duration(320)}
            exiting={FadeOut.duration(180)}
            style={styles.scanMessage}
          >
            {SCAN_MESSAGES[messageIndex]}
          </Animated.Text>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, progressStyle]} />
          </View>
          <Text style={styles.scanHint}>Mantenha a energia estável</Text>
        </View>
      ) : tier && result ? (
        <View style={[styles.panel, { paddingBottom: insets.bottom + 24 }]}>
          <Animated.View
            entering={ZoomIn.springify().damping(14).delay(120)}
            style={styles.revealHeader}
          >
            <Text style={styles.revealEyebrow}>Sua aura é</Text>
            <Text
              style={[
                styles.revealTier,
                { color: tier.color, textShadowColor: `${tier.color}66` },
              ]}
            >
              {tier.label.toUpperCase()}
            </Text>
            <Text style={styles.revealScore}>+{displayScore} aura</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(450).duration(500)}>
            <GlowCard glowColor={tier.color} glass className="px-5 py-5">
              <View style={styles.cardRow}>
                <Text style={styles.cardTagline}>{tier.tagline}</Text>
                <View
                  style={[
                    styles.chanceBadge,
                    { borderColor: `${tier.color}55` },
                  ]}
                >
                  <Text style={[styles.chanceText, { color: tier.color }]}>
                    {tierChance(tier.id)}% drop
                  </Text>
                </View>
              </View>

              <View style={styles.cardActions}>
                <GradientButton
                  title="Compartilhar"
                  icon={<Share2 size={18} color="#FFFFFF" strokeWidth={2} />}
                  onPress={handleShare}
                  style={styles.cardAction}
                />
                <GradientButton
                  title="Medir de novo"
                  variant="ghost"
                  icon={
                    <RotateCcw
                      size={18}
                      color={palette.textPrimary}
                      strokeWidth={2}
                    />
                  }
                  onPress={handleAgain}
                  style={styles.cardAction}
                />
              </View>
            </GlowCard>
          </Animated.View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  close: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 14,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.borderSubtle,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  orbStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flash: {
    ...StyleSheet.absoluteFill,
    zIndex: 5,
  },
  panel: {
    paddingHorizontal: 24,
    gap: 18,
  },
  scanMessage: {
    color: palette.textPrimary,
    fontFamily: fonts.medium,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  progressFill: {
    height: '100%',
    width: '100%',
    borderRadius: 2,
    backgroundColor: palette.primary,
    transformOrigin: 'left center',
  },
  scanHint: {
    color: palette.textDisabled,
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: 'center',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  revealHeader: {
    alignItems: 'center',
    gap: 4,
  },
  revealEyebrow: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 14,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  revealTier: {
    fontFamily: fonts.bold,
    fontSize: 44,
    letterSpacing: 1.5,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  revealScore: {
    color: palette.textPrimary,
    fontFamily: fonts.semibold,
    fontSize: 22,
    fontVariant: ['tabular-nums'],
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardTagline: {
    flex: 1,
    color: palette.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  chanceBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chanceText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  cardAction: {
    flex: 1,
  },
});
