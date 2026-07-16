import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type ThemeMode = 'system' | 'light' | 'dark';

type PrefsState = {
  hasCompletedOnboarding: boolean;
  themeMode: ThemeMode;
};

const initialState: PrefsState = {
  hasCompletedOnboarding: false,
  // Dark-first: o design system "Farmar Aura" foi desenhado para dark.
  themeMode: 'dark',
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
  },
});

export const { setHasCompletedOnboarding, setThemeMode } = prefsSlice.actions;
export const prefsReducer = prefsSlice.reducer;

export const selectHasCompletedOnboarding = (state: {
  prefs: PrefsState;
}) => state.prefs.hasCompletedOnboarding;

export const selectThemeMode = (state: { prefs: PrefsState }) =>
  state.prefs.themeMode;
