import AsyncStorage from '@react-native-async-storage/async-storage';

/** Redux Persist storage — works in Expo Go and production builds. */
export const reduxStorage = {
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  getItem: (key: string) => AsyncStorage.getItem(key),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};
