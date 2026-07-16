import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

import { supabase } from '@/src/features/auth/supabase';

import { ensureNotificationPermission } from './permissions';

let handlerConfigured = false;

/**
 * Android Expo Go throws on any import of `expo-notifications` (SDK 53+).
 * Push registration also requires a development build.
 */
export function canUseRemotePushNotifications(): boolean {
  if (isRunningInExpoGo()) {
    return false;
  }
  return true;
}

function resolveProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID
  );
}

/** Registra o token Expo Push no Supabase para o usuário autenticado. */
export async function registerPushTokenForUser(
  userId: string,
): Promise<string | null> {
  if (!canUseRemotePushNotifications() || !Device.isDevice) {
    return null;
  }

  // Dynamic import keeps Expo Go (Android) from loading the broken module at boot.
  const Notifications = await import('expo-notifications');

  if (!handlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    handlerConfigured = true;
  }

  const permission = await ensureNotificationPermission();
  if (!permission.granted) {
    return null;
  }

  const projectId = resolveProjectId();
  const tokenResponse = projectId
    ? await Notifications.getExpoPushTokenAsync({ projectId })
    : await Notifications.getExpoPushTokenAsync();

  const token = tokenResponse.data;

  const { error } = await supabase.from('device_push_tokens').upsert(
    {
      user_id: userId,
      token,
      platform: Platform.OS,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,token' },
  );

  if (error) {
    console.warn('[push] failed to persist token', error.message);
  }

  return token;
}
