import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { OutputVideo } from '../../components/OutputVideos/OutputVideoCard';

export interface OutputState {
  outputVideos: OutputVideo[];
  selectedOutputVideos: string[];
  totalOutputSize: number;
  lastExportDate: number | null;
  exportHistory: ExportSession[];
  settings: {
    autoCleanup: boolean;
    maxHistoryItems: number;
    defaultOutputPath: string;
    autoOpenAfterExport: boolean;
  };
}

export interface ExportSession {
  id: string;
  startedAt: number;
  completedAt: number;
  videosProcessed: number;
  totalInputSize: number;
  totalOutputSize: number;
  averageSpeed: number;
  settings: any;
}

const initialState: OutputState = {
  outputVideos: [],
  selectedOutputVideos: [],
  totalOutputSize: 0,
  lastExportDate: null,
  exportHistory: [],
  settings: {
    autoCleanup: false,
    maxHistoryItems: 100,
    defaultOutputPath: '',
    autoOpenAfterExport: false,
  },
};

const outputSlice = createSlice({
  name: 'output',
  initialState,
  reducers: {
    addOutputVideo: (state, action: PayloadAction<OutputVideo>) => {
      const newVideo = action.payload;
      
      // Check if video already exists (by path)
      const existingIndex = state.outputVideos.findIndex(v => v.path === newVideo.path);
      
      if (existingIndex >= 0) {
        // Update existing video
        state.outputVideos[existingIndex] = newVideo;
      } else {
        // Add new video
        state.outputVideos.unshift(newVideo); // Add to beginning for newest first
        state.totalOutputSize += newVideo.size;
      }
      
      state.lastExportDate = newVideo.completedAt;
      
      // Auto-cleanup if enabled
      if (state.settings.autoCleanup && state.outputVideos.length > state.settings.maxHistoryItems) {
        const videosToRemove = state.outputVideos.splice(state.settings.maxHistoryItems);
        videosToRemove.forEach(video => {
          state.totalOutputSize -= video.size;
        });
      }
    },

    addMultipleOutputVideos: (state, action: PayloadAction<OutputVideo[]>) => {
      action.payload.forEach(video => {
        const existingIndex = state.outputVideos.findIndex(v => v.path === video.path);
        
        if (existingIndex >= 0) {
          state.outputVideos[existingIndex] = video;
        } else {
          state.outputVideos.unshift(video);
          state.totalOutputSize += video.size;
        }
      });
      
      if (action.payload.length > 0) {
        state.lastExportDate = Math.max(...action.payload.map(v => v.completedAt));
      }
    },

    removeOutputVideo: (state, action: PayloadAction<string>) => {
      const videoId = action.payload;
      const videoIndex = state.outputVideos.findIndex(v => v.id === videoId);
      
      if (videoIndex >= 0) {
        const removedVideo = state.outputVideos[videoIndex];
        state.outputVideos.splice(videoIndex, 1);
        state.totalOutputSize -= removedVideo.size;
        
        // Remove from selected if it was selected
        state.selectedOutputVideos = state.selectedOutputVideos.filter(id => id !== videoId);
      }
    },

    removeMultipleOutputVideos: (state, action: PayloadAction<string[]>) => {
      const videoIds = action.payload;
      
      videoIds.forEach(videoId => {
        const videoIndex = state.outputVideos.findIndex(v => v.id === videoId);
        
        if (videoIndex >= 0) {
          const removedVideo = state.outputVideos[videoIndex];
          state.outputVideos.splice(videoIndex, 1);
          state.totalOutputSize -= removedVideo.size;
        }
      });
      
      // Remove from selected
      state.selectedOutputVideos = state.selectedOutputVideos.filter(
        id => !videoIds.includes(id)
      );
    },

    updateOutputVideo: (state, action: PayloadAction<{ id: string; updates: Partial<OutputVideo> }>) => {
      const { id, updates } = action.payload;
      const videoIndex = state.outputVideos.findIndex(v => v.id === id);
      
      if (videoIndex >= 0) {
        const oldSize = state.outputVideos[videoIndex].size;
        state.outputVideos[videoIndex] = { ...state.outputVideos[videoIndex], ...updates };
        
        // Update total size if size changed
        if (updates.size !== undefined) {
          state.totalOutputSize = state.totalOutputSize - oldSize + updates.size;
        }
      }
    },

    setSelectedOutputVideos: (state, action: PayloadAction<string[]>) => {
      state.selectedOutputVideos = action.payload;
    },

    selectAllOutputVideos: (state) => {
      state.selectedOutputVideos = state.outputVideos.map(v => v.id);
    },

    clearSelectedOutputVideos: (state) => {
      state.selectedOutputVideos = [];
    },

    clearOutputVideos: (state) => {
      state.outputVideos = [];
      state.selectedOutputVideos = [];
      state.totalOutputSize = 0;
      state.lastExportDate = null;
    },

    addExportSession: (state, action: PayloadAction<ExportSession>) => {
      state.exportHistory.unshift(action.payload); // Add to beginning
      
      // Keep only recent sessions
      if (state.exportHistory.length > 50) {
        state.exportHistory = state.exportHistory.slice(0, 50);
      }
    },

    updateOutputSettings: (state, action: PayloadAction<Partial<OutputState['settings']>>) => {
      state.settings = { ...state.settings, ...action.payload };
    },

    cleanupOldOutputs: (state, action: PayloadAction<number>) => {
      const cutoffDate = action.payload;
      const initialLength = state.outputVideos.length;
      
      state.outputVideos = state.outputVideos.filter(video => {
        if (video.completedAt < cutoffDate) {
          state.totalOutputSize -= video.size;
          return false;
        }
        return true;
      });
      
      // Update selected videos to remove any that were cleaned up
      const remainingIds = new Set(state.outputVideos.map(v => v.id));
      state.selectedOutputVideos = state.selectedOutputVideos.filter(id => remainingIds.has(id));
      
      console.log(`Cleaned up ${initialLength - state.outputVideos.length} old output videos`);
    },

    syncWithProcessingQueue: (state, action: PayloadAction<any[]>) => {
      const completedJobs = action.payload.filter(job => 
        job.status === 'completed' && 
        job.outputPath &&
        !state.outputVideos.find(video => video.path === job.outputPath)
      );

      completedJobs.forEach(job => {
        const outputVideo: OutputVideo = {
          id: `output_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          originalVideoId: job.videoId || '',
          name: job.outputPath?.split('/').pop() || job.videoName || 'Unknown',
          originalName: job.videoName || 'Unknown',
          path: job.outputPath || '',
          size: job.outputSize || 0,
          duration: job.duration || 0,
          format: job.outputPath?.split('.').pop() || 'mp4',
          resolution: job.resolution || '1080p',
          thumbnail: job.thumbnail,
          createdAt: job.startedAt || Date.now(),
          completedAt: job.completedAt || Date.now(),
          processingTime: (job.completedAt || Date.now()) - (job.startedAt || Date.now()),
          settings: {
            quality: job.quality || 'high',
            codec: job.codec || 'h264',
            effects: job.effects?.map((e: any) => e.name) || []
          },
          stats: {
            compressionRatio: job.outputSize && job.inputSize 
              ? job.outputSize / job.inputSize 
              : 1,
            avgSpeed: job.avgProcessingSpeed || 1.0,
            peakMemory: job.peakMemory || '0MB'
          }
        };

        state.outputVideos.unshift(outputVideo);
        state.totalOutputSize += outputVideo.size;
      });

      if (completedJobs.length > 0) {
        state.lastExportDate = Math.max(...completedJobs.map(job => job.completedAt || Date.now()));
      }
    },

    // Bulk operations
    markAsShared: (state, action: PayloadAction<string[]>) => {
      const videoIds = action.payload;
      videoIds.forEach(id => {
        const video = state.outputVideos.find(v => v.id === id);
        if (video) {
          // Add shared timestamp or flag - extend OutputVideo type if needed
          (video as any).sharedAt = Date.now();
        }
      });
    },

    updateCompressionStats: (state, action: PayloadAction<{ id: string; stats: any }>) => {
      const { id, stats } = action.payload;
      const video = state.outputVideos.find(v => v.id === id);
      if (video) {
        video.stats = { ...video.stats, ...stats };
      }
    },

    // Import/Export functionality
    exportOutputHistory: (state) => {
      return {
        outputVideos: state.outputVideos,
        exportHistory: state.exportHistory,
        exportedAt: Date.now()
      };
    },

    importOutputHistory: (state, action: PayloadAction<{ outputVideos: OutputVideo[]; exportHistory: ExportSession[] }>) => {
      const { outputVideos, exportHistory } = action.payload;
      
      // Merge videos, avoiding duplicates
      outputVideos.forEach(video => {
        const existingIndex = state.outputVideos.findIndex(v => v.path === video.path);
        if (existingIndex === -1) {
          state.outputVideos.push(video);
          state.totalOutputSize += video.size;
        }
      });
      
      // Merge export history
      exportHistory.forEach(session => {
        const existingIndex = state.exportHistory.findIndex(s => s.id === session.id);
        if (existingIndex === -1) {
          state.exportHistory.push(session);
        }
      });
      
      // Sort by completion date
      state.outputVideos.sort((a, b) => b.completedAt - a.completedAt);
      state.exportHistory.sort((a, b) => b.completedAt - a.completedAt);
    }
  },
});

export const {
  addOutputVideo,
  addMultipleOutputVideos,
  removeOutputVideo,
  removeMultipleOutputVideos,
  updateOutputVideo,
  setSelectedOutputVideos,
  selectAllOutputVideos,
  clearSelectedOutputVideos,
  clearOutputVideos,
  addExportSession,
  updateOutputSettings,
  cleanupOldOutputs,
  syncWithProcessingQueue,
  markAsShared,
  updateCompressionStats,
  exportOutputHistory,
  importOutputHistory
} = outputSlice.actions;

export default outputSlice.reducer;