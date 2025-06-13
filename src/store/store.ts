import { configureStore } from '@reduxjs/toolkit';
import videoSlice from './slices/videoSlice';
import timelineSlice from './slices/timelineSlice';
import settingsSlice from './slices/settingsSlice';
import processingSlice from './slices/processingSlice';
import uiSlice from './slices/uiSlice';
import outputSlice from './slices/outputSlice';
import { settingsMiddleware } from './middleware/settingsMiddleware';
import { videoStateMiddleware } from './middleware/videoStateMiddleware';

export const store = configureStore({
  reducer: {
    videos: videoSlice,
    timeline: timelineSlice,
    settings: settingsSlice,
    processing: processingSlice,
    ui: uiSlice,
    output: outputSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST', 
          'persist/REHYDRATE',
          'videos/addVideos',
          'videos/loadProject'
        ],
        // Custom function to check if a path should be ignored
        ignoredPaths: (function() {
          const ignoredPaths = [
            // Static ignored paths
            'register', 'unregister'
          ];
          
          // Dynamically add paths for video originalFile properties (up to 100 videos)
          for (let i = 0; i < 100; i++) {
            ignoredPaths.push(`videos.videos.${i}.originalFile`);
          }
          
          return ignoredPaths;
        })(),
        
        ignoredActionsPaths: [
          'payload.0.originalFile',
          'payload.1.originalFile', 
          'payload.2.originalFile',
          'payload.3.originalFile',
          'payload.4.originalFile',
          'payload.originalFile',
          'meta.arg.originalFile',
          'meta.baseQueryMeta',
          'meta.request',
          'meta.condition'
        ],
        
        // Custom serialization check
        isSerializable: (value: any, key?: string, path?: string) => {
          // Allow File objects in originalFile properties
          if (key === 'originalFile' && value instanceof File) {
            return true;
          }
          
          // Allow URLs in path properties
          if (key === 'path' && typeof value === 'string') {
            return true;
          }
          
          // Check for common non-serializable types
          if (value instanceof File || 
              value instanceof Blob || 
              value instanceof ArrayBuffer ||
              (typeof value === 'function') ||
              (value && typeof value === 'object' && value.constructor !== Object && value.constructor !== Array)) {
            // Only allow these in specific contexts
            return path?.includes('originalFile') || false;
          }
          
          return true;
        }
      },
    }).concat(settingsMiddleware, videoStateMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Debug: Add store to window for inspection
if (typeof window !== 'undefined') {
  (window as any).debugStore = store;
  (window as any).getReduxState = () => store.getState();
}