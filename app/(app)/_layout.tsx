import { Redirect, Stack } from 'expo-router';

import { useAppSelector } from '@/src/core/hooks';
import { selectIsAuthenticated } from '@/src/features/auth/authSlice';
import { selectHasCompletedOnboarding } from '@/src/features/prefs/prefsSlice';
import { selectProfileLoading } from '@/src/features/social/profileSlice';
import { Box } from '@/components/ui/box';
import { Spinner } from '@/components/ui/spinner';

export default function AppLayout() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const hasCompletedOnboarding = useAppSelector(selectHasCompletedOnboarding);
  const profileLoading = useAppSelector(selectProfileLoading);

  if (!hasCompletedOnboarding) {
    return <Redirect href="/(onboarding)" />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (profileLoading) {
    return (
      <Box className="flex-1 items-center justify-center bg-background">
        <Spinner />
      </Box>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="capture" options={{ animation: 'fade' }} />
      <Stack.Screen name="preview" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="processing/[id]" options={{ animation: 'fade' }} />
      <Stack.Screen name="result/[id]" options={{ animation: 'fade' }} />
      <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="profile/setup" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="profile/edit" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="challenges/[id]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="post/[id]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="measure" options={{ animation: 'fade' }} />
    </Stack>
  );
}
