import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { Video, VideoStatus } from '../../types/video.types';
import { RootState } from '../store';
import { memoryManager } from '../../utils/performanceMonitor';

export interface OptimizedVideoState {
  videos: Video[];
  selectedVideos: string[];
  totalDuration: number;
  totalSize: number;
  projectName: string;
  projectPath: string | null;
  // Performance optimizations
  videoIndex: Map<string, number>; // For O(1) video lookups
  lastUpdated: number;
  metadata: {
    totalVideos: number;
    processedVideos: number;
    errorVideos: number;
  };
}

const initialState: OptimizedVideoState = {
  videos: [],
  selectedVideos: [],
  totalDuration: 0,
  totalSize: 0,
  projectName: 'Untitled Project',
  projectPath: null,
  videoIndex: new Map(),
  lastUpdated: Date.now(),
  metadata: {
    totalVideos: 0,
    processedVideos: 0,
    errorVideos: 0
  }
};

// Helper functions for optimized operations
const updateVideoIndex = (state: OptimizedVideoState) => {
  state.videoIndex.clear();
  state.videos.forEach((video, index) => {
    state.videoIndex.set(video.id, index);
  });
};

const updateMetadata = (state: OptimizedVideoState) => {
  state.metadata.totalVideos = state.videos.length;
  state.metadata.processedVideos = state.videos.filter(v => v.status === 'completed').length;
  state.metadata.errorVideos = state.videos.filter(v => v.status === 'error').length;
  state.totalDuration = state.videos.reduce((sum, video) => sum + video.duration, 0);
  state.totalSize = state.videos.reduce((sum, video) => sum + video.size, 0);
  state.lastUpdated = Date.now();
};

const optimizedVideoSlice = createSlice({
  name: 'optimizedVideos',
  initialState,
  reducers: {
    addVideos: (state, action: PayloadAction<Video[]>) => {
      const newVideos = action.payload.filter(video => 
        !state.videoIndex.has(video.id)
      );
      
      state.videos.push(...newVideos);
      updateVideoIndex(state);
      updateMetadata(state);
      
      // Clear caches that depend on video list
      memoryManager.clear('videoFilters');
      memoryManager.clear('videoStats');
    },

    removeVideo: (state, action: PayloadAction<string>) => {
      const videoId = action.payload;
      const index = state.videoIndex.get(videoId);
      
      if (index !== undefined) {
        state.videos.splice(index, 1);
        state.selectedVideos = state.selectedVideos.filter(id => id !== videoId);
        updateVideoIndex(state);
        updateMetadata(state);
        
        // Clear related caches
        memoryManager.clear('videoFilters');
        memoryManager.clear('videoStats');
      }
    },

    removeVideos: (state, action: PayloadAction<string[]>) => {
      const videoIds = new Set(action.payload);
      state.videos = state.videos.filter(video => !videoIds.has(video.id));
      state.selectedVideos = state.selectedVideos.filter(id => !videoIds.has(id));
      
      updateVideoIndex(state);
      updateMetadata(state);
      
      // Clear related caches
      memoryManager.clear('videoFilters');
      memoryManager.clear('videoStats');
    },

    updateVideo: (state, action: PayloadAction<{ id: string; updates: Partial<Video> }>) => {
      const { id, updates } = action.payload;
      const index = state.videoIndex.get(id);
      
      if (index !== undefined) {
        state.videos[index] = { ...state.videos[index], ...updates };
        updateMetadata(state);
        
        // Clear caches if status or metadata changed
        if (updates.status || updates.metadata) {
          memoryManager.clear('videoStats');
        }
      }
    },

    batchUpdateVideos: (state, action: PayloadAction<Array<{ id: string; updates: Partial<Video> }>>) => {
      action.payload.forEach(({ id, updates }) => {
        const index = state.videoIndex.get(id);
        if (index !== undefined) {
          state.videos[index] = { ...state.videos[index], ...updates };
        }
      });
      
      updateMetadata(state);
      memoryManager.clear('videoStats');
    },

    selectVideo: (state, action: PayloadAction<string>) => {
      const videoId = action.payload;
      if (!state.selectedVideos.includes(videoId)) {
        state.selectedVideos.push(videoId);
      }
    },

    deselectVideo: (state, action: PayloadAction<string>) => {
      state.selectedVideos = state.selectedVideos.filter(id => id !== action.payload);
    },

    selectAllVideos: (state, action: PayloadAction<string[]>) => {
      state.selectedVideos = [...action.payload];
    },

    deselectAllVideos: (state) => {
      state.selectedVideos = [];
    },

    toggleVideoSelection: (state, action: PayloadAction<string>) => {
      const videoId = action.payload;
      const index = state.selectedVideos.indexOf(videoId);
      
      if (index >= 0) {
        state.selectedVideos.splice(index, 1);
      } else {
        state.selectedVideos.push(videoId);
      }
    },

    updateVideoStatus: (state, action: PayloadAction<{ id: string; status: VideoStatus; progress?: number }>) => {
      const { id, status, progress } = action.payload;
      const index = state.videoIndex.get(id);
      
      if (index !== undefined) {
        state.videos[index].status = status;
        if (progress !== undefined) {
          state.videos[index].processProgress = progress;
        }
        updateMetadata(state);
      }
    },

    setProjectName: (state, action: PayloadAction<string>) => {
      state.projectName = action.payload;
    },

    setProjectPath: (state, action: PayloadAction<string | null>) => {
      state.projectPath = action.payload;
    },

    clearAllVideos: (state) => {
      state.videos = [];
      state.selectedVideos = [];
      state.videoIndex.clear();
      updateMetadata(state);
      
      // Clear all video-related caches
      memoryManager.clear('videoFilters');
      memoryManager.clear('videoStats');
      memoryManager.clear('videoThumbnails');
    },

    optimizeMemory: (state) => {
      // Remove unnecessary data for memory optimization
      state.videos.forEach(video => {
        // Clear large thumbnail data for videos not visible
        if (video.thumbnail && video.thumbnail.length > 100000) {
          // Keep only a placeholder for very large thumbnails
          video.thumbnail = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7wn46mPC90ZXh0Pjwvc3ZnPg==';
        }
      });
      
      updateMetadata(state);
    }
  },
});

// Optimized selectors with memoization
export const selectAllVideos = createSelector(
  (state: RootState) => state.optimizedVideos.videos,
  (videos) => {
    const cacheKey = `allVideos_${videos.length}`;
    const cached = memoryManager.get('videoSelectors', cacheKey);
    if (cached) return cached;
    
    const result = [...videos];
    memoryManager.set('videoSelectors', cacheKey, result);
    return result;
  }
);

export const selectSelectedVideos = createSelector(
  (state: RootState) => state.optimizedVideos.selectedVideos,
  (state: RootState) => state.optimizedVideos.videos,
  (selectedIds, videos) => {
    const cacheKey = `selectedVideos_${selectedIds.join(',')}_${videos.length}`;
    const cached = memoryManager.get('videoSelectors', cacheKey);
    if (cached) return cached;
    
    const videoMap = new Map(videos.map(v => [v.id, v]));
    const result = selectedIds.map(id => videoMap.get(id)).filter(Boolean) as Video[];
    
    memoryManager.set('videoSelectors', cacheKey, result);
    return result;
  }
);

export const selectVideoById = createSelector(
  [(state: RootState) => state.optimizedVideos.videos, (state: RootState, videoId: string) => videoId],
  (videos, videoId) => {
    const cacheKey = `video_${videoId}`;
    const cached = memoryManager.get('videoSelectors', cacheKey);
    if (cached) return cached;
    
    const result = videos.find(video => video.id === videoId);
    memoryManager.set('videoSelectors', cacheKey, result);
    return result;
  }
);

export const selectVideoStats = createSelector(
  (state: RootState) => state.optimizedVideos.videos,
  (videos) => {
    const cacheKey = `stats_${videos.length}_${videos.map(v => v.status).join(',')}`;
    const cached = memoryManager.get('videoStats', cacheKey);
    if (cached) return cached;
    
    const stats = {
      total: videos.length,
      ready: videos.filter(v => v.status === 'ready').length,
      processing: videos.filter(v => v.status === 'processing').length,
      completed: videos.filter(v => v.status === 'completed').length,
      error: videos.filter(v => v.status === 'error').length,
      totalSize: videos.reduce((sum, v) => sum + v.size, 0),
      totalDuration: videos.reduce((sum, v) => sum + v.duration, 0),
      averageQuality: videos.length > 0 ? 
        videos.reduce((sum, v) => sum + v.metadata.width, 0) / videos.length : 0
    };
    
    memoryManager.set('videoStats', cacheKey, stats);
    return stats;
  }
);

export const selectVideosByStatus = createSelector(
  [(state: RootState) => state.optimizedVideos.videos, (state: RootState, status: VideoStatus) => status],
  (videos, status) => {
    const cacheKey = `byStatus_${status}_${videos.length}`;
    const cached = memoryManager.get('videoFilters', cacheKey);
    if (cached) return cached;
    
    const result = videos.filter(video => video.status === status);
    memoryManager.set('videoFilters', cacheKey, result);
    return result;
  }
);

export const selectHDVideos = createSelector(
  (state: RootState) => state.optimizedVideos.videos,
  (videos) => {
    const cacheKey = `hdVideos_${videos.length}`;
    const cached = memoryManager.get('videoFilters', cacheKey);
    if (cached) return cached;
    
    const result = videos.filter(video => video.metadata.width >= 1920);
    memoryManager.set('videoFilters', cacheKey, result);
    return result;
  }
);

export const {
  addVideos,
  removeVideo,
  removeVideos,
  updateVideo,
  batchUpdateVideos,
  selectVideo,
  deselectVideo,
  selectAllVideos,
  deselectAllVideos,
  toggleVideoSelection,
  updateVideoStatus,
  setProjectName,
  setProjectPath,
  clearAllVideos,
  optimizeMemory
} = optimizedVideoSlice.actions;

export default optimizedVideoSlice.reducer;