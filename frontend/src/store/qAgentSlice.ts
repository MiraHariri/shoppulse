import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getQAgentEmbedUrl } from '../services/qAgentService';

interface QAgentState {
  embedUrl: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: QAgentState = {
  embedUrl: null,
  loading: false,
  error: null,
};

// Async thunk to fetch Q agent embed URL
export const fetchQAgentEmbedUrl = createAsyncThunk(
  'qAgent/fetchEmbedUrl',
  async (_, { rejectWithValue }) => {
    try {
      const embedUrl = await getQAgentEmbedUrl();
      return embedUrl;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load Q agent');
    }
  }
);

const qAgentSlice = createSlice({
  name: 'qAgent',
  initialState,
  reducers: {
    clearQAgentEmbedUrl: (state) => {
      state.embedUrl = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchQAgentEmbedUrl.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchQAgentEmbedUrl.fulfilled, (state, action) => {
        state.loading = false;
        state.embedUrl = action.payload;
        state.error = null;
      })
      .addCase(fetchQAgentEmbedUrl.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearQAgentEmbedUrl } = qAgentSlice.actions;
export default qAgentSlice.reducer;
