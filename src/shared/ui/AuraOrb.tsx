import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

type GradientColors = readonly [string, string, string];

type AuraOrbProps = {
  size: number;
  /** Gradiente do corpo do orbe. Trocar a prop faz crossfade suave. */
  colors: GradientColors;
  /** Cor do glow externo — normalmente a cor do tier. */
  glowColor: string;
  /** 0 = respiração calma (idle), 1 = pulso rápido (análise/revelação). */
  intensity?: number;
};

/**
 * Assinatura visual do app: orbe de energia com gradiente animado,
 * banda de luz rotativa e glow pulsante. Sem Skia — só Views + Reanimated.
 */
export function AuraOrb({ size, colors, glowColor, intensity = 0 }: AuraOrbProps) {
  const pulse = useSharedValue(0);
  const rotation = useSharedValue(0);
  const fade = useSharedValue(1);

  const prevColors = useRef<GradientColors>(colors);
  const [layers, setLayers] = useState<{
    from: GradientColors;
    to: GradientColors;
  }>({ from: colors, to: colors });

  useEffect(() => {
    if (prevColors.current.join('|') !== colors.join('|')) {
      setLayers({ from: prevColors.current, to: colors });
      prevColors.current = colors;
      fade.value = 0;
      fade.value = withTiming(1, { duration: 750, easing: Easing.inOut(Easing.quad) });
    }
  }, [colors, fade]);

  useEffect(() => {
    const pulseDuration = 2400 - intensity * 1600;
    pulse.value = 0;
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: pulseDuration, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: pulseDuration, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );

    const spinDuration = 14000 - intensity * 10000;
    rotation.value = 0;
    rotation.value = withRepeat(
      withTiming(360, { duration: spinDuration, easing: Easing.linear }),
      -1,
      false,
    );

    return () => {
      cancelAnimation(pulse);
      cancelAnimation(rotation);
    };
  }, [intensity, pulse, rotation]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + pulse.value * (0.3 + intensity * 0.2),
    transform: [{ scale: 1 + pulse.value * (0.05 + intensity * 0.08) }],
  }));

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * (0.015 + intensity * 0.035) }],
  }));

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
  }));

  const glowSize = size * 1.4;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Glow externo pulsante */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
            backgroundColor: `${glowColor}14`,
            boxShadow: `0 0 ${size * 0.45}px ${size * 0.12}px ${glowColor}59`,
          },
          glowStyle,
        ]}
      />

      {/* Anel orbital */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: size * 1.16,
          height: size * 1.16,
          borderRadius: (size * 1.16) / 2,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.12)',
        }}
      />

      {/* Corpo do orbe */}
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            overflow: 'hidden',
          },
          bodyStyle,
        ]}
      >
        <LinearGradient
          colors={[...layers.from]}
          start={{ x: 0.1, y: 0.1 }}
          end={{ x: 0.9, y: 0.9 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={[StyleSheet.absoluteFill, fadeStyle]}>
          <LinearGradient
            colors={[...layers.to]}
            start={{ x: 0.1, y: 0.1 }}
            end={{ x: 0.9, y: 0.9 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Banda de luz varrendo o orbe */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: -size * 0.3,
              top: -size * 0.3,
              width: size * 1.6,
              height: size * 1.6,
            },
            sweepStyle,
          ]}
        >
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.22)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
          />
        </Animated.View>

        {/* Reflexo superior */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,255,255,0.35)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.55 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}
