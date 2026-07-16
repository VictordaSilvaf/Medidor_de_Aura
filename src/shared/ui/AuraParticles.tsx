import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

type ParticleSpec = {
  id: number;
  angle: number;
  size: number;
  delay: number;
  duration: number;
  drift: number;
};

type AuraParticlesProps = {
  /** Raio máximo (px) do campo de partículas, a partir do centro. */
  radius: number;
  color: string;
  count?: number;
  /** 0 = calmo, 1 = explosivo (revelação). */
  intensity?: number;
};

function Particle({
  spec,
  radius,
  color,
  intensity,
}: {
  spec: ParticleSpec;
  radius: number;
  color: string;
  intensity: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    const duration = spec.duration * (1 - intensity * 0.55);
    progress.value = 0;
    progress.value = withDelay(
      spec.delay,
      withRepeat(
        withTiming(1, { duration, easing: Easing.out(Easing.quad) }),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(progress);
  }, [intensity, progress, spec.delay, spec.duration]);

  const style = useAnimatedStyle(() => {
    const dist = interpolate(
      progress.value,
      [0, 1],
      [radius * 0.45, radius],
    );
    const x = Math.cos(spec.angle) * dist;
    const y = Math.sin(spec.angle) * dist - progress.value * spec.drift;
    const opacity = interpolate(
      progress.value,
      [0, 0.15, 0.7, 1],
      [0, 0.9, 0.5, 0],
    );
    return {
      opacity,
      transform: [
        { translateX: x },
        { translateY: y },
        { scale: interpolate(progress.value, [0, 1], [1, 0.5]) },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particle,
        {
          width: spec.size,
          height: spec.size,
          borderRadius: spec.size / 2,
          backgroundColor: color,
          boxShadow: `0 0 ${spec.size * 2}px 1px ${color}99`,
        },
        style,
      ]}
    />
  );
}

/** PRNG puro (determinístico por seed) — mantém o render idempotente. */
function seeded(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Partículas luminosas flutuando para fora do orbe. */
export function AuraParticles({
  radius,
  color,
  count = 14,
  intensity = 0,
}: AuraParticlesProps) {
  const specs = useMemo<ParticleSpec[]>(
    () =>
      Array.from({ length: count }, (_, id) => ({
        id,
        angle: seeded(id) * Math.PI * 2,
        size: 3 + seeded(id + 17) * 4,
        delay: seeded(id + 43) * 2400,
        duration: 2200 + seeded(id + 71) * 2000,
        drift: 10 + seeded(id + 97) * 26,
      })),
    [count],
  );

  return (
    <View pointerEvents="none" style={styles.field}>
      {specs.map((spec) => (
        <Particle
          key={spec.id}
          spec={spec}
          radius={radius}
          color={color}
          intensity={intensity}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
  },
});
