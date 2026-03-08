import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchInteractions = createAsyncThunk(
  'interactions/fetchAll',
  async ({ hcp_id } = {}, { rejectWithValue }) => {
    try {
      const params = hcp_id ? { hcp_id } : {};
      const res = await api.get('/interactions/', { params });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch');
    }
  }
);

export const createInteraction = createAsyncThunk(
  'interactions/create',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post('/interactions/', payload);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to create');
    }
  }
);

export const updateInteraction = createAsyncThunk(
  'interactions/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await api.patch(`/interactions/${id}`, data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to update');
    }
  }
);

export const deleteInteraction = createAsyncThunk(
  'interactions/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/interactions/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to delete');
    }
  }
);

const interactionsSlice = createSlice({
  name: 'interactions',
  initialState: {
    items: [],
    loading: false,
    error: null,
    selectedInteraction: null,
  },
  reducers: {
    setSelectedInteraction: (state, action) => {
      state.selectedInteraction = action.payload;
    },
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInteractions.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchInteractions.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchInteractions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createInteraction.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(updateInteraction.fulfilled, (state, action) => {
        const idx = state.items.findIndex(i => i.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(deleteInteraction.fulfilled, (state, action) => {
        state.items = state.items.filter(i => i.id !== action.payload);
      });
  },
});

export const { setSelectedInteraction, clearError } = interactionsSlice.actions;
export default interactionsSlice.reducer;
