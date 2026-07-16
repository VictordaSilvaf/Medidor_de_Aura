import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

export type PermissionKind = 'camera' | 'microphone' | 'library' | 'notifications';

export type PermissionResult = {
  granted: boolean;
  canAskAgain: boolean;
};

async function requestCamera(): Promise<PermissionResult> {
  const current = await Camera.getCameraPermissionsAsync();
  if (current.granted) {
    return { granted: true, canAskAgain: current.canAskAgain };
  }
  const next = await Camera.requestCameraPermissionsAsync();
  return { granted: next.granted, canAskAgain: next.canAskAgain };
}

async function requestMicrophone(): Promise<PermissionResult> {
  const current = await Camera.getMicrophonePermissionsAsync();
  if (current.granted) {
    return { granted: true, canAskAgain: current.canAskAgain };
  }
  const next = await Camera.requestMicrophonePermissionsAsync();
  return { granted: next.granted, canAskAgain: next.canAskAgain };
}

async function requestLibrary(): Promise<PermissionResult> {
  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted) {
    return { granted: true, canAskAgain: current.canAskAgain };
  }
  const next = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return { granted: next.granted, canAskAgain: next.canAskAgain };
}

async function requestNotifications(): Promise<PermissionResult> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return { granted: true, canAskAgain: current.canAskAgain };
  }
  const next = await Notifications.requestPermissionsAsync();
  return { granted: next.granted, canAskAgain: next.canAskAgain };
}

/** Pede câmera + microfone juntos (fluxo de gravação). */
export async function ensureCapturePermissions(): Promise<{
  ok: boolean;
  missing: PermissionKind[];
  canAskAgain: boolean;
}> {
  const camera = await requestCamera();
  const microphone = await requestMicrophone();
  const missing: PermissionKind[] = [];
  if (!camera.granted) missing.push('camera');
  if (!microphone.granted) missing.push('microphone');
  return {
    ok: missing.length === 0,
    missing,
    canAskAgain: camera.canAskAgain && microphone.canAskAgain,
  };
}

export async function ensureLibraryPermission(): Promise<PermissionResult> {
  return requestLibrary();
}

export async function ensureNotificationPermission(): Promise<PermissionResult> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('analysis', {
      name: 'Análises de aura',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  return requestNotifications();
}

export async function openSystemSettings(): Promise<void> {
  await Linking.openSettings();
}
