import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useNetworkActivityDevTools } from '@rozenite/network-activity-plugin';
import { usePerformanceMonitorDevTools } from '@rozenite/performance-monitor-plugin';
import { useReactNavigationDevTools } from '@rozenite/react-navigation-plugin';
import { useReduxDevToolsAgentTools } from '@rozenite/redux-devtools-plugin';
import {
  createAsyncStorageAdapter,
  createExpoSecureStorageAdapter,
  useRozeniteStoragePlugin,
} from '@rozenite/storage-plugin';

const storages = [
  createAsyncStorageAdapter({
    storage: AsyncStorage,
  }),
  createExpoSecureStorageAdapter({
    storage: SecureStore,
    // SecureStore cannot enumerate keys — list known auth keys.
    keys: [
      'sb-oiobrmwhenfhcoxhwksi-auth-token',
      'supabase.auth.token',
    ],
  }),
];

/**
 * Mounts Rozenite DevTools plugins (network, performance, redux agent, storage).
 * Navigation plugin is wired separately in the root layout (needs container ref).
 */
export function useRozeniteAppDevTools() {
  useNetworkActivityDevTools();
  usePerformanceMonitorDevTools();
  useReduxDevToolsAgentTools();
  useRozeniteStoragePlugin({ storages });
}

export { useReactNavigationDevTools };
