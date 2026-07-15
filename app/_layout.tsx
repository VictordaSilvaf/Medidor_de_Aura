import '../global.css';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AppProviders } from '@/src/core/providers/AppProviders';
import { useAppSelector } from '@/src/core/hooks';
import { selectAuthStatus } from '@/src/features/auth/authSlice';
import { Box } from '@/components/ui/box';
import { Spinner } from '@/components/ui/spinner';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootNavigator() {
  const status = useAppSelector(selectAuthStatus);

  useEffect(() => {
    if (status !== 'idle' && status !== 'loading') {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [status]);

  if (status === 'idle' || status === 'loading') {
    return (
      <Box className="flex-1 items-center justify-center bg-background">
        <Spinner />
      </Box>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}
