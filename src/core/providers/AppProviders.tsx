import { useEffect, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { I18nextProvider } from 'react-i18next';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { Box } from '@/components/ui/box';
import { Spinner } from '@/components/ui/spinner';
import { store, persistor } from '@/src/core/store';
import { useAppDispatch, useAppSelector } from '@/src/core/hooks';
import { bootstrapAuth } from '@/src/features/auth/authService';
import {
  selectLocale,
  selectThemeMode,
} from '@/src/features/prefs/prefsSlice';
import { queryClient } from '@/src/shared/api/queryClient';
import { useRozeniteAppDevTools } from '@/src/shared/devtools/useRozeniteDevTools';
import i18n, { detectDeviceLocale } from '@/src/shared/i18n';
import { AppAlertHost } from '@/src/shared/ui/AppAlertHost';

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

function LocaleSync({ children }: { children: ReactNode }) {
  const locale = useAppSelector(selectLocale);

  useEffect(() => {
    const next = locale ?? detectDeviceLocale();
    if (i18n.language !== next) {
      void i18n.changeLanguage(next);
    }
  }, [locale]);

  return <>{children}</>;
}

function ThemedShell({ children }: { children: ReactNode }) {
  const themeMode = useAppSelector(selectThemeMode);
  useRozeniteAppDevTools();

  return (
    <GluestackUIProvider mode={themeMode}>
      <LocaleSync>
        <AuthBootstrap>{children}</AuthBootstrap>
      </LocaleSync>
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
            <I18nextProvider i18n={i18n}>
              <ThemedShell>
                {children}
                <AppAlertHost />
              </ThemedShell>
            </I18nextProvider>
          </QueryClientProvider>
        </PersistGate>
      </Provider>
    </GestureHandlerRootView>
  );
}
