import { configureStore, createSlice } from '@reduxjs/toolkit';

// Simple test slice - no external dependencies
const appSlice = createSlice({
  name: 'app',
  initialState: {
    name: 'AI Multi Videos Converter',
    version: '1.0.0',
    initialized: true
  },
  reducers: {
    updateName: (state, action) => {
      state.name = action.payload;
    }
  }
});

// Debug store with minimal configuration
export const debugStore = configureStore({
  reducer: {
    app: appSlice.reducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Disable for debugging
      immutableCheck: false     // Disable for debugging
    })
});

export type DebugRootState = ReturnType<typeof debugStore.getState>;
export type DebugAppDispatch = typeof debugStore.dispatch;
export const { updateName } = appSlice.actions;