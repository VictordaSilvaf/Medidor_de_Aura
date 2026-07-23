import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { AppLocale } from '@/src/shared/i18n/types';

export type ThemeMode = 'system' | 'light' | 'dark';
export type DefaultVisibility = 'private' | 'public';

/** Opções de contagem regressiva antes de gravar (segundos). */
export const COUNTDOWN_OPTIONS = [0, 3, 5, 10, 30] as const;
export type CountdownSeconds = (typeof COUNTDOWN_OPTIONS)[number];

type PrefsState = {
  hasCompletedOnboarding: boolean;
  themeMode: ThemeMode;
  locale: AppLocale | null;
  defaultVisibility: DefaultVisibility;
  pushEnabled: boolean;
  countdownSeconds: CountdownSeconds;
  /** IDs de análises cuja revelação especial já foi vista. */
  seenRevealIds: string[];
};

const initialState: PrefsState = {
  hasCompletedOnboarding: false,
  themeMode: 'system',
  locale: null,
  defaultVisibility: 'public',
  pushEnabled: true,
  countdownSeconds: 3,
  seenRevealIds: [],
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
    setCountdownSeconds(state, action: PayloadAction<CountdownSeconds>) {
      state.countdownSeconds = action.payload;
    },
    markRevealSeen(state, action: PayloadAction<string>) {
      const id = action.payload;
      const seen = Array.isArray(state.seenRevealIds)
        ? state.seenRevealIds
        : [];
      if (!seen.includes(id)) {
        state.seenRevealIds = [id, ...seen].slice(0, 100);
      }
    },
  },
});

export const {
  setHasCompletedOnboarding,
  setThemeMode,
  setLocale,
  setDefaultVisibility,
  setPushEnabled,
  setCountdownSeconds,
  markRevealSeen,
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

export const selectCountdownSeconds = (state: { prefs: PrefsState }) =>
  state.prefs.countdownSeconds;

const EMPTY_SEEN_REVEAL_IDS: string[] = [];

export const selectSeenRevealIds = (state: { prefs: PrefsState }) =>
  Array.isArray(state.prefs.seenRevealIds)
    ? state.prefs.seenRevealIds
    : EMPTY_SEEN_REVEAL_IDS;