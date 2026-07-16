import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
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

import { Button, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useAppDispatch } from '@/src/core/hooks';
import {
  ONBOARDING_SLIDES,
  type OnboardingSlide,
} from '@/src/features/onboarding/slides';
import { setHasCompletedOnboarding } from '@/src/features/prefs/prefsSlice';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const STORY_DURATION_MS = 4500;

function ProgressSegment({
  index,
  activeIndex,
  progress,
}: {
  index: number;
  activeIndex: number;
  progress: SharedValue<number>;
}) {
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

function StorySlide({ item }: { item: OnboardingSlide }) {
  return (
    <View style={styles.slide}>
      <LinearGradient
        colors={[...item.colors]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.slideCopy}>
        <Text className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-[#E8DCC8]">
          {item.eyebrow}
        </Text>
        <Text className="mb-4 text-4xl font-semibold leading-tight text-[#F7F2EA]">
          {item.title}
        </Text>
        <Text className="max-w-[320px] text-base leading-6 text-[#D9CFC0]">
          {item.body}
        </Text>
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first?.index == null) return;
      if (first.index !== indexRef.current) {
        indexRef.current = first.index;
        setIndex(first.index);
      }
    },
  ).current;

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
          <Text className="text-sm font-medium text-[#F4EFE6]">Pular</Text>
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
            <Button
              className="bg-[#F4EFE6]"
              onPress={finish}
              accessibilityLabel="Começar a usar o app"
            >
              <ButtonText className="text-[#0B1014]">Começar</ButtonText>
            </Button>
          ) : (
            <Text className="text-center text-sm text-[#D9CFC0]">
              Deslize ou toque para continuar
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#07090B',
  },
  slide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'flex-end',
  },
  slideCopy: {
    paddingHorizontal: 28,
    paddingBottom: 140,
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
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  segmentFill: {
    height: '100%',
    width: '100%',
    borderRadius: 2,
    backgroundColor: '#F4EFE6',
    transformOrigin: 'left center',
  },
  skip: {
    alignSelf: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 14,
    zIndex: 2,
  },
  tapZones: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    top: 96,
    bottom: 120,
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
});
