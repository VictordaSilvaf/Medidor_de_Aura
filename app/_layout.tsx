import '../global.css';

import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
  useFonts,
} from '@expo-google-fonts/space-grotesk';
import { Stack, useNavigationContainerRef } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, type RefObject } from 'react';
import { useColorScheme } from 'react-native';
import type { NavigationContainerRef } from '@react-navigation/native';

import { AppProviders } from '@/src/core/providers/AppProviders';
import { useAppSelector } from '@/src/core/hooks';
import { selectAuthStatus } from '@/src/features/auth/authSlice';
import { useReactNavigationDevTools } from '@/src/shared/devtools/useRozeniteDevTools';
import { Box } from '@/components/ui/box';
import { Spinner } from '@/components/ui/spinner';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const status = useAppSelector(selectAuthStatus);
  const colorScheme = useColorScheme();
  const navigationRef = useNavigationContainerRef();

  // Expo Router's ref type is slightly incompatible with Rozenite's RefObject expectation.
  useReactNavigationDevTools({
    ref: navigationRef as unknown as RefObject<NavigationContainerRef<any> | null>,
  });

  const bootReady = fontsReady && status !== 'idle' && status !== 'loading';

  useEffect(() => {
    if (bootReady) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [bootReady]);

  if (!bootReady) {
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
        <Stack.Screen name="splash" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontsError] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  return (
    <AppProviders>
      <RootNavigator fontsReady={fontsLoaded || !!fontsError} />
    </AppProviders>
  );
}
