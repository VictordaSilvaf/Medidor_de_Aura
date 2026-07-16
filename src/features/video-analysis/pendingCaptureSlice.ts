import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { PendingCapture } from './types';

type PendingCaptureState = {
  capture: PendingCapture | null;
};

const initialState: PendingCaptureState = {
  capture: null,
};

const pendingCaptureSlice = createSlice({
  name: 'pendingCapture',
  initialState,
  reducers: {
    setPendingCapture(state, action: PayloadAction<PendingCapture>) {
      state.capture = action.payload;
    },
    clearPendingCapture(state) {
      state.capture = null;
    },
  },
});

export const { setPendingCapture, clearPendingCapture } =
  pendingCaptureSlice.actions;
export const pendingCaptureReducer = pendingCaptureSlice.reducer;

export const selectPendingCapture = (state: {
  pendingCapture: PendingCaptureState;
}) => state.pendingCapture.capture;