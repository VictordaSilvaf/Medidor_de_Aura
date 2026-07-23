import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewToken,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppDispatch } from '@/src/core/hooks';
import { AURA_TIERS } from '@/src/features/aura/tiers';
import {
  ONBOARDING_SLIDES,
  type OnboardingSlide,
} from '@/src/features/onboarding/slides';
import { setHasCompletedOnboarding } from '@/src/features/prefs/prefsSlice';
import { AuraOrb } from '@/src/shared/ui/AuraOrb';
import { GradientButton } from '@/src/shared/ui/GradientButton';
import { fonts, usePalette, useThemedStyles, type AppPalette } from '@/src/shared/ui/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const STORY_DURATION_MS = 5000;

function ProgressSegment({
  index,
  activeIndex,
  progress,
}: {
  index: number;
  activeIndex: number;
  progress: SharedValue<number>;
}) {
  const styles = useThemedStyles(createStyles);
  const style = useAnimatedStyle(() => {
    let fill = 0;
    if (index < activeIndex) fill = 1;
    else if (index === activeIndex) fill = progress.value;

    return {
      transform: [{ scaleX: Math.max(fill, 0.001) }],
    };
  });

  return (
    <View style={styles.segmentTrack}>
      <Animated.View style={[styles.segmentFill, style]} />
    </View>
  );
}

function TierScale() {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.tierRow}>
      {AURA_TIERS.map((tier) => (
        <View key={tier.id} style={styles.tierItem}>
          <View
            style={[
              styles.tierDot,
              {
                backgroundColor: tier.color,
                boxShadow: `0 0 10px 1px ${tier.color}66`,
              },
            ]}
          />
          <Text style={styles.tierLabel}>{tier.label}</Text>
        </View>
      ))}
    </View>
  );
}

function StorySlide({ item }: { item: OnboardingSlide }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.slide}>
      <View style={styles.slideOrb}>
        <AuraOrb
          size={176}
          colors={item.orb}
          glowColor={item.accent}
          intensity={0.2}
        />
      </View>

      <View style={styles.slideCopy}>
        <Text style={[styles.eyebrow, { color: item.accent }]}>
          {item.eyebrow}
        </Text>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.body}>{item.body}</Text>
        {item.showTiers ? <TierScale /> : null}
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = usePalette();
  const styles = useThemedStyles(createStyles);
  const listRef = useRef<FlatList<OnboardingSlide>>(null);
  const [index, setIndex] = useState(0);
  const progress = useSharedValue(0);
  const indexRef = useRef(0);

  const finish = useCallback(() => {
    dispatch(setHasCompletedOnboarding(true));
    router.replace('/(auth)/login');
  }, [dispatch, router]);

  const goTo = useCallback(
    (next: number) => {
      if (next < 0) return;
      if (next >= ONBOARDING_SLIDES.length) {
        finish();
        return;
      }
      indexRef.current = next;
      setIndex(next);
      listRef.current?.scrollToIndex({ index: next, animated: true });
    },
    [finish],
  );

  useEffect(() => {
    cancelAnimation(progress);
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: STORY_DURATION_MS,
      easing: Easing.linear,
    });

    const timeout = setTimeout(() => {
      goTo(indexRef.current + 1);
    }, STORY_DURATION_MS);

    return () => {
      clearTimeout(timeout);
      cancelAnimation(progress);
    };
  }, [goTo, index, progress]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first?.index == null) return;
      if (first.index !== indexRef.current) {
        indexRef.current = first.index;
        setIndex(first.index);
      }
    },
    [],
  );

  const onMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (next !== indexRef.current) {
      indexRef.current = next;
      setIndex(next);
    }
  };

  const onTap = (side: 'left' | 'right') => {
    if (side === 'left') {
      goTo(indexRef.current - 1);
      return;
    }
    goTo(indexRef.current + 1);
  };

  const isLast = index === ONBOARDING_SLIDES.length - 1;

  return (
    <View style={styles.root}>
      <FlatList
        ref={listRef}
        data={ONBOARDING_SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        renderItem={({ item }) => <StorySlide item={item} />}
        getItemLayout={(_, i) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * i,
          index: i,
        })}
      />

      <View
        pointerEvents="box-none"
        style={[styles.overlay, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.progressRow}>
          {ONBOARDING_SLIDES.map((slide, i) => (
            <ProgressSegment
              key={slide.id}
              index={i}
              activeIndex={index}
              progress={progress}
            />
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pular onboarding"
          onPress={finish}
          style={styles.skip}
          hitSlop={8}
        >
          <Text style={styles.skipLabel}>Pular</Text>
        </Pressable>

        <View pointerEvents="box-none" style={styles.tapZones}>
          <Pressable style={styles.tapLeft} onPress={() => onTap('left')} />
          <Pressable style={styles.tapRight} onPress={() => onTap('right')} />
        </View>

        <View
          pointerEvents="box-none"
          style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}
        >
          {isLast ? (
            <GradientButton
              title="Começar a farmar"
              onPress={finish}
              accessibilityLabel="Começar a usar o app"
            />
          ) : (
            <Text style={styles.hint}>Deslize ou toque para continuar</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const createStyles = (palette: AppPalette) =>
  StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  slide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: palette.bg,
  },
  slideOrb: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
  },
  slideCopy: {
    paddingHorizontal: 28,
    paddingBottom: 172,
    gap: 12,
  },
  eyebrow: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: 3.5,
    textTransform: 'uppercase',
  },
  title: {
    color: palette.textPrimary,
    fontFamily: fonts.bold,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  body: {
    color: palette.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 330,
  },
  tierRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 10,
  },
  tierItem: {
    alignItems: 'center',
    gap: 6,
  },
  tierDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  tierLabel: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 11,
    letterSpacing: 0.4,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
  },
  segmentTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  segmentFill: {
    height: '100%',
    width: '100%',
    borderRadius: 2,
    backgroundColor: palette.textPrimary,
    transformOrigin: 'left center',
  },
  skip: {
    alignSelf: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 14,
    zIndex: 2,
  },
  skipLabel: {
    color: palette.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  tapZones: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    top: 96,
    bottom: 200,
  },
  tapLeft: {
    flex: 1,
  },
  tapRight: {
    flex: 1,
  },
  footer: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 0,
    zIndex: 2,
  },
  hint: {
    color: palette.textDisabled,
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: 'center',
    letterSpacing: 0.4,
  },
});
