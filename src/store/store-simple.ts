import { configureStore } from '@reduxjs/toolkit';
import videoSlice from './slices/videoSlice';
import timelineSlice from './slices/timelineSlice';
import settingsSlice from './slices/settingsSlice';
import processingSlice from './slices/processingSlice';
import uiSlice from './slices/uiSlice';

// Simple store without problematic middleware for browser testing
export const store = configureStore({
  reducer: {
    videos: videoSlice,
    timeline: timelineSlice,
    settings: settingsSlice,
    processing: processingSlice,
    ui: uiSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;