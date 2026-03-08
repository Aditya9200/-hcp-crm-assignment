import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const initSession = createAsyncThunk(
  'agent/initSession',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.post('/agent/session/new');
      return res.data.session_id;
    } catch (err) {
      return rejectWithValue('Failed to create session');
    }
  }
);

export const sendMessage = createAsyncThunk(
  'agent/sendMessage',
  async ({ session_id, message, hcp_id }, { rejectWithValue }) => {
    try {
      const res = await api.post('/agent/chat', { session_id, message, hcp_id });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Agent error');
    }
  }
);

const agentSlice = createSlice({
  name: 'agent',
  initialState: {
    sessionId: null,
    messages: [],
    loading: false,
    error: null,
    lastAction: null,
    lastInteractionId: null,
  },
  reducers: {
    addUserMessage: (state, action) => {
      state.messages.push({ role: 'user', content: action.payload, timestamp: Date.now() });
    },
    clearSession: (state) => {
      state.sessionId = null;
      state.messages = [];
      state.lastAction = null;
      state.lastInteractionId = null;
    },
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initSession.fulfilled, (state, action) => {
        state.sessionId = action.payload;
        state.messages = [];
      })
      .addCase(sendMessage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.loading = false;
        state.messages.push({
          role: 'assistant',
          content: action.payload.response,
          action_taken: action.payload.action_taken,
          interaction_id: action.payload.interaction_id,
          timestamp: Date.now()
        });
        state.lastAction = action.payload.action_taken;
        state.lastInteractionId = action.payload.interaction_id;
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.messages.push({
          role: 'assistant',
          content: '⚠️ Something went wrong. Please try again.',
          timestamp: Date.now()
        });
      });
  },
});

export const { addUserMessage, clearSession, clearError } = agentSlice.actions;
export default agentSlice.reducer;
