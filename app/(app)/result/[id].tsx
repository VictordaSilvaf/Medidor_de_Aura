import { useLocalSearchParams, useRouter } from 'expo-router';
import { RotateCcw, Share2, X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppDispatch, useAppSelector } from '@/src/core/hooks';
import { recordAura } from '@/src/features/aura/auraSlice';
import { TIER_BY_ID, tierChance } from '@/src/features/aura/tiers';
import { selectAuthUser } from '@/src/features/auth/authSlice';
import { bootstrapProfile } from '@/src/features/social/profileApi';
import { useAnalysisSubscription } from '@/src/features/video-analysis/useAnalysisSubscription';
import { AuraOrb } from '@/src/shared/ui/AuraOrb';
import { AuraParticles } from '@/src/shared/ui/AuraParticles';
import { GlowCard } from '@/src/shared/ui/GlowCard';
import { GradientButton } from '@/src/shared/ui/GradientButton';
import { brandGradient, fonts, palette } from '@/src/shared/ui/theme';

const COUNT_UP_MS = 1200;

export default function ResultScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const user = useAppSelector(selectAuthUser);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { analysis, result, error, loading } = useAnalysisSubscription(id);

  const [displayScore, setDisplayScore] = useState(0);
  const recordedRef = useRef(false);
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const flash = useSharedValue(0);
  const burst = useSharedValue(1);

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

    const startedAt = Date.now();
    countRef.current = setInterval(() => {
      const t = Math.min((Date.now() - startedAt) / COUNT_UP_MS, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayScore(Math.round(eased * result.score));
      if (t >= 1 && countRef.current) {
        clearInterval(countRef.current);
        countRef.current = null;
      }
    }, 24);

    return () => {
      if (countRef.current) clearInterval(countRef.current);
    };
  }, [burst, dispatch, flash, result, user?.id]);

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

  const tier = result ? TIER_BY_ID[result.tier_id] : null;
  const orbColors = tier?.gradient ?? brandGradient;
  const orbGlow = tier?.color ?? palette.primary;

  if (loading && !result) {
    return (
      <View style={[styles.root, styles.centered]}>
        <Text style={styles.loading}>Carregando resultado…</Text>
      </View>
    );
  }

  if (error || analysis?.status === 'failed' || (!loading && !result)) {
    return (
      <View style={[styles.root, styles.centered, { padding: 24 }]}>
        <Text style={styles.loading}>
          {error ?? analysis?.error_message ?? 'Resultado indisponível.'}
        </Text>
        <GradientButton
          title="Nova medição"
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
        style={[styles.flash, { backgroundColor: `${orbGlow}59` }, flashStyle]}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fechar"
        onPress={() => router.replace('/(app)/(tabs)')}
        hitSlop={10}
        style={[styles.close, { top: insets.top + 12 }]}
      >
        <X size={20} color={palette.textSecondary} strokeWidth={1.8} />
      </Pressable>

      <View style={styles.orbStage}>
        <AuraParticles
          radius={190}
          color={orbGlow}
          count={22}
          intensity={1}
        />
        <Animated.View style={burstStyle}>
          <AuraOrb
            size={236}
            colors={orbColors}
            glowColor={orbGlow}
            intensity={0.45}
          />
        </Animated.View>
      </View>

      {tier && result ? (
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
                  onPress={() => void handleShare()}
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
  flash: {
    ...StyleSheet.absoluteFill,
    zIndex: 5,
  },
  panel: {
    paddingHorizontal: 24,
    gap: 18,
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
