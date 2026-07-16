import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { usePostSplashHref } from '@/src/features/onboarding/usePostSplashHref';

const SPLASH_MS = 2400;

export default function SplashScreenRoute() {
  const router = useRouter();
  const href = usePostSplashHref();
  const insets = useSafeAreaInsets();
  const ringScale = useSharedValue(0.65);
  const ringOpacity = useSharedValue(0);
  const coreOpacity = useSharedValue(0);

  useEffect(() => {
    ringOpacity.value = withTiming(1, { duration: 500 });
    coreOpacity.value = withDelay(180, withTiming(1, { duration: 600 }));
    ringScale.value = withSequence(
      withTiming(1.08, {
        duration: 900,
        easing: Easing.out(Easing.cubic),
      }),
      withTiming(1, {
        duration: 700,
        easing: Easing.inOut(Easing.quad),
      }),
    );

    const timeout = setTimeout(() => {
      router.replace(href);
    }, SPLASH_MS);

    return () => clearTimeout(timeout);
  }, [coreOpacity, href, ringOpacity, ringScale, router]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  const coreStyle = useAnimatedStyle(() => ({
    opacity: coreOpacity.value,
  }));

  return (
    <View
      style={styles.root}
      accessibilityLabel="Carregando Medidor de Aura"
    >
      <LinearGradient
        colors={['#07090B', '#12181C', '#1C2522']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Animated.View style={[styles.ring, ringStyle]}>
          <LinearGradient
            colors={[
              'rgba(196,165,116,0.55)',
              'rgba(126,184,178,0.15)',
              'transparent',
            ]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={styles.ringFill}
          />
        </Animated.View>

        <Animated.View
          entering={FadeIn.delay(280).duration(700)}
          style={coreStyle}
        >
          <Text className="text-center text-4xl font-semibold tracking-tight text-[#F4EFE6]">
            Medidor de Aura
          </Text>
          <Text className="mt-3 text-center text-base text-[#C4A574]">
            Leitura da sua presença
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#07090B',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  ring: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  ringFill: {
    width: '100%',
    height: '100%',
    borderRadius: 110,
    borderWidth: 1,
    borderColor: 'rgba(196,165,116,0.35)',
  },
});
