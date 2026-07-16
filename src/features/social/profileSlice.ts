import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { Profile } from './types';

type ProfileState = {
  me: Profile | null;
  loading: boolean;
  setupRequired: boolean;
};

const initialState: ProfileState = {
  me: null,
  loading: true,
  setupRequired: false,
};

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setProfileLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setMyProfile(state, action: PayloadAction<Profile | null>) {
      state.me = action.payload;
      state.loading = false;
      state.setupRequired = !action.payload?.username;
    },
    patchMyProfile(state, action: PayloadAction<Partial<Profile>>) {
      if (!state.me) return;
      state.me = { ...state.me, ...action.payload };
    },
  },
});

export const { setProfileLoading, setMyProfile, patchMyProfile } =
  profileSlice.actions;
export const profileReducer = profileSlice.reducer;

export const selectMyProfile = (state: { profile: ProfileState }) =>
  state.profile.me;
export const selectProfileLoading = (state: { profile: ProfileState }) =>
  state.profile.loading;
export const selectSetupRequired = (state: { profile: ProfileState }) =>
  state.profile.setupRequired;