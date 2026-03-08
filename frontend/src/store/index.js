import { configureStore } from '@reduxjs/toolkit';
import interactionsReducer from './slices/interactionsSlice';
import agentReducer from './slices/agentSlice';
import hcpReducer from './slices/hcpSlice';

export const store = configureStore({
  reducer: {
    interactions: interactionsReducer,
    agent: agentReducer,
    hcp: hcpReducer,
  },
});
