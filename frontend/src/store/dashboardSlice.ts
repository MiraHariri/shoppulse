import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { DashboardState } from '../types/dashboard.types';
import { getEmbedUrl } from '../services/dashboardService';

const initialState: DashboardState = {
  embedUrl: null,
  loading: false,
  error: null,
};

/**
 * Fetch QuickSight embed URL
 */
export const fetchEmbedUrl = createAsyncThunk('dashboard/fetchEmbedUrl', async () => {
  return await getEmbedUrl();
});

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearEmbedUrl: (state) => {
      state.embedUrl = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmbedUrl.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmbedUrl.fulfilled, (state, action: PayloadAction<string>) => {
        state.embedUrl = action.payload;
        state.loading = false;
      })
      .addCase(fetchEmbedUrl.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to load dashboard';
        state.loading = false;
      });
  },
});

export const { clearError, clearEmbedUrl } = dashboardSlice.actions;
export default dashboardSlice.reducer;
