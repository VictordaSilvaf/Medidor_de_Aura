import { Redirect, Stack } from 'expo-router';

import { useAppSelector } from '@/src/core/hooks';
import { selectIsAuthenticated } from '@/src/features/auth/authSlice';
import { selectHasCompletedOnboarding } from '@/src/features/prefs/prefsSlice';

export default function AuthLayout() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const hasCompletedOnboarding = useAppSelector(selectHasCompletedOnboarding);

  if (!hasCompletedOnboarding) {
    return <Redirect href="/(onboarding)" />;
  }

  if (isAuthenticated) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    />
  );
}
