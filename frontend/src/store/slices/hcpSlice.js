import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchHCPs = createAsyncThunk(
  'hcp/fetchAll',
  async (search = '', { rejectWithValue }) => {
    try {
      const params = search ? { search } : {};
      const res = await api.get('/hcp/', { params });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to fetch HCPs');
    }
  }
);

export const createHCP = createAsyncThunk(
  'hcp/create',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post('/hcp/', payload);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to create HCP');
    }
  }
);

const hcpSlice = createSlice({
  name: 'hcp',
  initialState: {
    items: [],
    loading: false,
    error: null,
    selectedHCP: null,
  },
  reducers: {
    setSelectedHCP: (state, action) => {
      state.selectedHCP = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHCPs.pending, (state) => { state.loading = true; })
      .addCase(fetchHCPs.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchHCPs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createHCP.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      });
  },
});

export const { setSelectedHCP } = hcpSlice.actions;
export default hcpSlice.reducer;
