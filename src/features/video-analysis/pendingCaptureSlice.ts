import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { PendingCapture } from './types';

type PendingCaptureState = {
  capture: PendingCapture | null;
  /** Active challenge/duel to attach on next successful upload. */
  activeChallengeId: string | null;
};

const initialState: PendingCaptureState = {
  capture: null,
  activeChallengeId: null,
};

const pendingCaptureSlice = createSlice({
  name: 'pendingCapture',
  initialState,
  reducers: {
    setPendingCapture(state, action: PayloadAction<PendingCapture>) {
      state.capture = {
        ...action.payload,
        challengeId: action.payload.challengeId ?? state.activeChallengeId,
      };
    },
    clearPendingCapture(state) {
      state.capture = null;
    },
    setActiveChallengeId(state, action: PayloadAction<string | null>) {
      state.activeChallengeId = action.payload;
    },
    clearActiveChallengeId(state) {
      state.activeChallengeId = null;
    },
  },
});

export const {
  setPendingCapture,
  clearPendingCapture,
  setActiveChallengeId,
  clearActiveChallengeId,
} = pendingCaptureSlice.actions;
export const pendingCaptureReducer = pendingCaptureSlice.reducer;

export const selectPendingCapture = (state: {
  pendingCapture: PendingCaptureState;
}) => state.pendingCapture.capture;

export const selectActiveChallengeId = (state: {
  pendingCapture: PendingCaptureState;
}) => state.pendingCapture.activeChallengeId;