import { Redirect, Stack } from 'expo-router';

import { useAppSelector } from '@/src/core/hooks';
import { selectIsAuthenticated } from '@/src/features/auth/authSlice';
import { selectHasCompletedOnboarding } from '@/src/features/prefs/prefsSlice';

export default function AppLayout() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const hasCompletedOnboarding = useAppSelector(selectHasCompletedOnboarding);

  if (!hasCompletedOnboarding) {
    return <Redirect href="/(onboarding)" />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="measure" options={{ animation: 'fade' }} />
    </Stack>
  );
}
