import type { Href } from 'expo-router';

import { useAppSelector } from '@/src/core/hooks';
import { selectIsAuthenticated } from '@/src/features/auth/authSlice';
import { selectHasCompletedOnboarding } from '@/src/features/prefs/prefsSlice';

export function usePostSplashHref(): Href {
  const hasCompletedOnboarding = useAppSelector(selectHasCompletedOnboarding);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  if (!hasCompletedOnboarding) {
    return '/(onboarding)';
  }

  if (isAuthenticated) {
    return '/(app)/(tabs)';
  }

  return '/(auth)/login';
}
