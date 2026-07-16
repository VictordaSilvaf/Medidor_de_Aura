import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { AuraResult } from './generateAura';
import { compareTiers, type AuraTierId } from './tiers';

type AuraState = {
  totalAura: number;
  measurements: number;
  bestTierId: AuraTierId | null;
  lastResult: AuraResult | null;
};

const initialState: AuraState = {
  totalAura: 0,
  measurements: 0,
  bestTierId: null,
  lastResult: null,
};

const auraSlice = createSlice({
  name: 'aura',
  initialState,
  reducers: {
    recordAura(state, action: PayloadAction<AuraResult>) {
      const result = action.payload;
      state.totalAura += result.score;
      state.measurements += 1;
      state.lastResult = result;
      if (
        state.bestTierId === null ||
        compareTiers(result.tierId, state.bestTierId) > 0
      ) {
        state.bestTierId = result.tierId;
      }
    },
  },
});

export const { recordAura } = auraSlice.actions;
export const auraReducer = auraSlice.reducer;

export const selectAuraStats = (state: { aura: AuraState }) => state.aura;
