import { useLocalSearchParams, useRouter } from 'expo-router';
import { RotateCcw, Share2, X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useAppDispatch, useAppSelector } from '@/src/core/hooks';
import { recordAura } from '@/src/features/aura/auraSlice';
import { TIER_BY_ID, tierChance } from '@/src/features/aura/tiers';
import { selectAuthUser } from '@/src/features/auth/authSlice';
import {
  markRevealSeen,
  selectSeenRevealIds,
} from '@/src/features/prefs/prefsSlice';
import { bootstrapProfile } from '@/src/features/social/profileApi';
import { scoreColor } from '@/src/features/video-analysis/statusUi';
import { useAnalysisSubscription } from '@/src/features/video-analysis/useAnalysisSubscription';
import { AuraOrb } from '@/src/shared/ui/AuraOrb';
import { AuraParticles } from '@/src/shared/ui/AuraParticles';
import { GlowCard } from '@/src/shared/ui/GlowCard';
import { GradientButton } from '@/src/shared/ui/GradientButton';
import { brandGradient, fonts, palette } from '@/src/shared/ui/theme';

const COUNT_UP_MS = 2800;
const PHASE_LABELS = [
  'Escaneando campo…',
  'Amplificando sinal…',
  'Calibrando sensores…',
  'Aura detectada!',
];

export default function RevealScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const user = useAppSelector(selectAuthUser);
  const seenIds = useAppSelector(selectSeenRevealIds);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { analysis, result, error, loading } = useAnalysisSubscription(id);

  const [displayScore, setDisplayScore] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const recordedRef = useRef(false);
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const flash = useSharedValue(0);
  const burst = useSharedValue(1);
  const scoreProgress = useSharedValue(0);
  const ring = useSharedValue(0.6);

  useEffect(() => {
    if (!id || !result) return;
    if (!seenIds.includes(id)) {
      dispatch(markRevealSeen(id));
    }
  }, [dispatch, id, result, seenIds]);

  useEffect(() => {
    if (!result || recordedRef.current) return;
    recordedRef.current = true;

    dispatch(
      recordAura({
        tierId: result.tier_id,
        score: result.score,
        measuredAt: Date.now(),
      }),
    );
    if (user?.id) {
      void bootstrapProfile(dispatch, user.id);
    }

    const phaseTimer = setInterval(() => {
      setPhaseIndex((i) => Math.min(i + 1, PHASE_LABELS.length - 1));
    }, 700);

    flash.set(
      withSequence(
        withTiming(0.9, { duration: 160 }),
        withTiming(0, { duration: 700, easing: Easing.out(Easing.quad) }),
      ),
    );
    burst.set(
      withSequence(
        withTiming(1.22, {
          duration: 320,
          easing: Easing.out(Easing.back(2.4)),
        }),
        withTiming(1, { duration: 520, easing: Easing.inOut(Easing.quad) }),
      ),
    );
    ring.set(
      withDelay(
        200,
        withTiming(1.35, {
          duration: COUNT_UP_MS,
          easing: Easing.out(Easing.cubic),
        }),
      ),
    );
    scoreProgress.set(
      withTiming(1, {
        duration: COUNT_UP_MS,
        easing: Easing.out(Easing.cubic),
      }),
    );

    const startedAt = Date.now();
    countRef.current = setInterval(() => {
      const t = Math.min((Date.now() - startedAt) / COUNT_UP_MS, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayScore(Math.round(eased * result.score));
      if (t >= 1 && countRef.current) {
        clearInterval(countRef.current);
        countRef.current = null;
        clearInterval(phaseTimer);
        setPhaseIndex(PHASE_LABELS.length - 1);
      }
    }, 20);

    return () => {
      clearInterval(phaseTimer);
      if (countRef.current) clearInterval(countRef.current);
    };
  }, [burst, dispatch, flash, result, ring, scoreProgress, user?.id]);

  const handleShare = useCallback(async () => {
    if (!result) return;
    const tier = TIER_BY_ID[result.tier_id];
    try {
      await Share.share({
        message: `Minha aura é ${tier.label.toUpperCase()} — +${result.score} aura no Medidor de Aura. Qual é a sua?`,
      });
    } catch {
      // cancelado
    }
  }, [result]);

  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  const burstStyle = useAnimatedStyle(() => ({
    transform: [{ scale: burst.value }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ring.value }],
    opacity: 1.1 - (ring.value - 0.6),
  }));
  const targetScoreColor = scoreColor(result?.score ?? 0);
  const scoreAnimStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      scoreProgress.value,
      [0, 0.25, 0.5, 0.75, 1],
      ['#94A3B8', '#38BDF8', '#10B981', '#FACC15', targetScoreColor],
    );
    return {
      color,
      textShadowColor: color,
      transform: [{ scale: 0.92 + scoreProgress.value * 0.18 }],
    };
  });

  const tier = result ? TIER_BY_ID[result.tier_id] : null;
  const orbColors = tier?.gradient ?? brandGradient;
  const orbGlow = tier?.color ?? palette.primary;
  const liveScoreColor = scoreColor(displayScore);

  if (loading && !result) {
    return (
      <View style={[styles.root, styles.centered]}>
        <Text style={styles.loading}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (error || analysis?.status === 'failed' || (!loading && !result)) {
    return (
      <View style={[styles.root, styles.centered, { padding: 24 }]}>
        <Text style={styles.loading}>
          {error ?? analysis?.error_message ?? t('reveal.unavailable')}
        </Text>
        <GradientButton
          title={t('hub.measureCta')}
          onPress={() => router.replace('/(app)/capture')}
          style={{ alignSelf: 'stretch', marginTop: 16 }}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Animated.View
        pointerEvents="none"
        style={[styles.flash, { backgroundColor: `${orbGlow}66` }, flashStyle]}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
        onPress={() => router.replace('/(app)/(tabs)')}
        hitSlop={10}
        style={[styles.close, { top: insets.top + 12 }]}
      >
        <X size={20} color={palette.textSecondary} strokeWidth={1.8} />
      </Pressable>

      <View style={styles.orbStage}>
        <Animated.View
          style={[
            styles.energyRing,
            { borderColor: `${liveScoreColor}55` },
            ringStyle,
          ]}
        />
        <AuraParticles radius={210} color={orbGlow} count={28} intensity={1} />
        <Animated.View style={burstStyle}>
          <AuraOrb
            size={248}
            colors={orbColors}
            glowColor={orbGlow}
            intensity={0.55}
          />
        </Animated.View>
      </View>

      {tier && result ? (
        <View style={[styles.panel, { paddingBottom: insets.bottom + 24 }]}>
          <Animated.View entering={FadeIn.delay(80)} style={styles.phaseWrap}>
            <Text style={styles.phaseText}>{PHASE_LABELS[phaseIndex]}</Text>
          </Animated.View>

          <Animated.View
            entering={ZoomIn.springify().damping(12).delay(200)}
            style={styles.revealHeader}
          >
            <Text style={styles.revealEyebrow}>{t('reveal.yourAura')}</Text>
            <Text
              style={[
                styles.revealTier,
                { color: tier.color, textShadowColor: `${tier.color}88` },
              ]}
            >
              {tier.label.toUpperCase()}
            </Text>
            <Animated.Text style={[styles.revealScore, scoreAnimStyle]}>
              +{displayScore}
            </Animated.Text>
            <Text style={[styles.revealScoreUnit, { color: liveScoreColor }]}>
              AURA
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(900).duration(520)}>
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
                  title={t('reveal.share')}
                  icon={<Share2 size={18} color="#FFFFFF" strokeWidth={2} />}
                  onPress={() => void handleShare()}
                  style={styles.cardAction}
                />
                <GradientButton
                  title={t('reveal.measureAgain')}
                  variant="ghost"
                  icon={
                    <RotateCcw
                      size={18}
                      color={palette.textPrimary}
                      strokeWidth={2}
                    />
                  }
                  onPress={() => router.replace('/(app)/capture')}
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
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 16,
    textAlign: 'center',
  },
  close: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 14,
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
  energyRing: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 2,
  },
  flash: {
    ...StyleSheet.absoluteFill,
    zIndex: 5,
  },
  panel: {
    paddingHorizontal: 24,
    gap: 14,
  },
  phaseWrap: {
    alignItems: 'center',
  },
  phaseText: {
    color: palette.neon,
    fontFamily: fonts.medium,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  revealHeader: {
    alignItems: 'center',
    gap: 2,
  },
  revealEyebrow: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 13,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  revealTier: {
    fontFamily: fonts.bold,
    fontSize: 46,
    letterSpacing: 1.5,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 28,
  },
  revealScore: {
    fontFamily: fonts.bold,
    fontSize: 56,
    fontVariant: ['tabular-nums'],
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    marginTop: 4,
  },
  revealScoreUnit: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    letterSpacing: 4,
    marginTop: -4,
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
