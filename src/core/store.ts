import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { rozeniteDevToolsEnhancer } from '@rozenite/redux-devtools-plugin';
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
  persistReducer,
  persistStore,
} from 'redux-persist';

import { auraReducer } from '@/src/features/aura/auraSlice';
import { authReducer } from '@/src/features/auth/authSlice';
import { prefsReducer } from '@/src/features/prefs/prefsSlice';
import { reduxStorage } from '@/src/shared/storage/asyncStorage';

const rootReducer = combineReducers({
  auth: authReducer,
  prefs: prefsReducer,
  aura: auraReducer,
});

const persistConfig = {
  key: 'root',
  storage: reduxStorage,
  // Session is revalidated via Supabase on boot — persist client prefs + farm de aura.
  whitelist: ['prefs', 'aura'] as string[],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
  enhancers: (getDefaultEnhancers) =>
    getDefaultEnhancers().concat(
      rozeniteDevToolsEnhancer({
        name: 'medidor-de-aura',
        maxAge: 30,
      }),
    ),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
