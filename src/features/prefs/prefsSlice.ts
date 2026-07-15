import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

type PrefsState = {
  hasCompletedOnboarding: boolean;
  themeMode: 'system' | 'light' | 'dark';
};

const initialState: PrefsState = {
  hasCompletedOnboarding: false,
  themeMode: 'system',
};

const prefsSlice = createSlice({
  name: 'prefs',
  initialState,
  reducers: {
    setHasCompletedOnboarding(state, action: PayloadAction<boolean>) {
      state.hasCompletedOnboarding = action.payload;
    },
    setThemeMode(state, action: PayloadAction<PrefsState['themeMode']>) {
      state.themeMode = action.payload;
    },
  },
});

export const { setHasCompletedOnboarding, setThemeMode } = prefsSlice.actions;
export const prefsReducer = prefsSlice.reducer;
