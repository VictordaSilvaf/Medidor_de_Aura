import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { AppLocale } from '@/src/shared/i18n/types';

export type ThemeMode = 'system' | 'light' | 'dark';
export type DefaultVisibility = 'private' | 'public';

type PrefsState = {
  hasCompletedOnboarding: boolean;
  themeMode: ThemeMode;
  locale: AppLocale | null;
  defaultVisibility: DefaultVisibility;
  pushEnabled: boolean;
};

const initialState: PrefsState = {
  hasCompletedOnboarding: false,
  themeMode: 'dark',
  locale: null,
  defaultVisibility: 'private',
  pushEnabled: true,
};

const prefsSlice = createSlice({
  name: 'prefs',
  initialState,
  reducers: {
    setHasCompletedOnboarding(state, action: PayloadAction<boolean>) {
      state.hasCompletedOnboarding = action.payload;
    },
    setThemeMode(state, action: PayloadAction<ThemeMode>) {
      state.themeMode = action.payload;
    },
    setLocale(state, action: PayloadAction<AppLocale>) {
      state.locale = action.payload;
    },
    setDefaultVisibility(state, action: PayloadAction<DefaultVisibility>) {
      state.defaultVisibility = action.payload;
    },
    setPushEnabled(state, action: PayloadAction<boolean>) {
      state.pushEnabled = action.payload;
    },
  },
});

export const {
  setHasCompletedOnboarding,
  setThemeMode,
  setLocale,
  setDefaultVisibility,
  setPushEnabled,
} = prefsSlice.actions;
export const prefsReducer = prefsSlice.reducer;

export const selectHasCompletedOnboarding = (state: {
  prefs: PrefsState;
}) => state.prefs.hasCompletedOnboarding;

export const selectThemeMode = (state: { prefs: PrefsState }) =>
  state.prefs.themeMode;

export const selectLocale = (state: { prefs: PrefsState }) => state.prefs.locale;

export const selectDefaultVisibility = (state: { prefs: PrefsState }) =>
  state.prefs.defaultVisibility;

export const selectPushEnabled = (state: { prefs: PrefsState }) =>
  state.prefs.pushEnabled;