import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { usePostSplashHref } from '@/src/features/onboarding/usePostSplashHref';
import { AuraOrb } from '@/src/shared/ui/AuraOrb';
import { brandGradient, fonts, palette } from '@/src/shared/ui/theme';

const SPLASH_MS = 2600;

export default function SplashScreenRoute() {
  const router = useRouter();
  const href = usePostSplashHref();
  const orbOpacity = useSharedValue(0);
  const orbScale = useSharedValue(0.7);

  useEffect(() => {
    orbOpacity.value = withTiming(1, { duration: 700 });
    orbScale.value = withDelay(
      80,
      withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }),
    );

    const timeout = setTimeout(() => {
      router.replace(href);
    }, SPLASH_MS);

    return () => clearTimeout(timeout);
  }, [href, orbOpacity, orbScale, router]);

  const orbStyle = useAnimatedStyle(() => ({
    opacity: orbOpacity.value,
    transform: [{ scale: orbScale.value }],
  }));

  return (
    <View style={styles.root} accessibilityLabel="Carregando Medidor de Aura">
      <View style={styles.center}>
        <Animated.View style={orbStyle}>
          <AuraOrb
            size={168}
            colors={brandGradient}
            glowColor={palette.primary}
            intensity={0.25}
          />
        </Animated.View>

        <Animated.View
          entering={FadeIn.delay(500).duration(800)}
          style={styles.wordmark}
        >
          <Text style={styles.title}>MEDIDOR{'\n'}DE AURA</Text>
          <LinearGradient
            colors={[...brandGradient]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.bar}
          />
          <Text style={styles.tagline}>Energia quantificada</Text>
        </Animated.View>
      </View>

      <Animated.Text
        entering={FadeIn.delay(1100).duration(700)}
        style={styles.footer}
      >
        FARMAR AURA · v1.0
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 44,
  },
  wordmark: {
    alignItems: 'center',
    gap: 14,
  },
  title: {
    color: palette.textPrimary,
    fontFamily: fonts.bold,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: 2,
    textAlign: 'center',
  },
  bar: {
    width: 56,
    height: 3,
    borderRadius: 2,
  },
  tagline: {
    color: palette.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  footer: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    color: palette.textDisabled,
    fontFamily: fonts.medium,
    fontSize: 11,
    letterSpacing: 2.5,
  },
});
