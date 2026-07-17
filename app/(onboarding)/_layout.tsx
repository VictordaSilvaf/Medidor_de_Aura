import { Redirect, Stack } from 'expo-router';

import { useAppSelector } from '@/src/core/hooks';
import { selectIsAuthenticated } from '@/src/features/auth/authSlice';
import { selectHasCompletedOnboarding } from '@/src/features/prefs/prefsSlice';

export default function OnboardingLayout() {
  const hasCompletedOnboarding = useAppSelector(selectHasCompletedOnboarding);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  if (hasCompletedOnboarding) {
    return (
      <Redirect href={isAuthenticated ? '/(app)/(tabs)' : '/(auth)/login'} />
    );
  }

  return <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />;
}
