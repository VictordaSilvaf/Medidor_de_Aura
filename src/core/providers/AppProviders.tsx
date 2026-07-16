import { useEffect, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { Box } from '@/components/ui/box';
import { Spinner } from '@/components/ui/spinner';
import { store, persistor } from '@/src/core/store';
import { useAppDispatch, useAppSelector } from '@/src/core/hooks';
import { bootstrapAuth } from '@/src/features/auth/authService';
import { selectThemeMode } from '@/src/features/prefs/prefsSlice';
import { queryClient } from '@/src/shared/api/queryClient';
import { useRozeniteAppDevTools } from '@/src/shared/devtools/useRozeniteDevTools';

function AuthBootstrap({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    void (async () => {
      unsubscribe = await bootstrapAuth(dispatch);
    })();

    return () => {
      unsubscribe?.();
    };
  }, [dispatch]);

  return <>{children}</>;
}

function ThemedShell({ children }: { children: ReactNode }) {
  const themeMode = useAppSelector(selectThemeMode);
  useRozeniteAppDevTools();

  return (
    <GluestackUIProvider mode={themeMode}>
      <AuthBootstrap>{children}</AuthBootstrap>
    </GluestackUIProvider>
  );
}

function PersistLoading() {
  return (
    <Box className="flex-1 items-center justify-center bg-background">
      <Spinner />
    </Box>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <PersistGate loading={<PersistLoading />} persistor={persistor}>
          <QueryClientProvider client={queryClient}>
            <ThemedShell>{children}</ThemedShell>
          </QueryClientProvider>
        </PersistGate>
      </Provider>
    </GestureHandlerRootView>
  );
}
