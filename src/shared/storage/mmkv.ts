type KeyValueStorage = {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  remove: (key: string) => void;
};

class MemoryStorage implements KeyValueStorage {
  private store = new Map<string, string>();

  getString(key: string) {
    return this.store.get(key);
  }

  set(key: string, value: string) {
    this.store.set(key, value);
  }

  remove(key: string) {
    this.store.delete(key);
  }
}

function createStorage(): KeyValueStorage {
  try {
    // MMKV requires a development build (native module). Falls back in Expo Go / web.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createMMKV } = require('react-native-mmkv') as {
      createMMKV: (options?: { id?: string }) => KeyValueStorage;
    };
    const storage = createMMKV({ id: 'medidor-de-aura' });
    storage.set('__mmkv_probe', '1');
    storage.remove('__mmkv_probe');
    return storage;
  } catch (error) {
    if (__DEV__) {
      console.warn(
        '[storage] MMKV unavailable; using in-memory fallback. Use a dev build for persistence.',
        error,
      );
    }
    return new MemoryStorage();
  }
}

export const mmkv = createStorage();

export const reduxStorage = {
  setItem: (key: string, value: string): Promise<boolean> => {
    mmkv.set(key, value);
    return Promise.resolve(true);
  },
  getItem: (key: string): Promise<string | null> => {
    const value = mmkv.getString(key);
    return Promise.resolve(value ?? null);
  },
  removeItem: (key: string): Promise<void> => {
    mmkv.remove(key);
    return Promise.resolve();
  },
};
