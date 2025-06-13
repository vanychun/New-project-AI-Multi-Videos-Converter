import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Video, VideoStatus } from '../../types/video.types';

export interface VideoState {
  videos: Video[];
  selectedVideos: string[];
  totalDuration: number;
  totalSize: number;
  projectName: string;
  projectPath: string | null;
}

const initialState: VideoState = {
  videos: [],
  selectedVideos: [],
  totalDuration: 0,
  totalSize: 0,
  projectName: 'Untitled Project',
  projectPath: null,
};

const videoSlice = createSlice({
  name: 'videos',
  initialState,
  reducers: {
    addVideos: (state, action: PayloadAction<Video[]>) => {
      // Calculate the next available timeline position
      const getNextTimelinePosition = (): number => {
        if (state.videos.length === 0) return 0;
        
        // Find the latest end time of existing videos
        const latestEndTime = Math.max(...state.videos.map(video => {
          const startPos = video.timelinePosition || 0;
          const duration = video.trimEnd !== undefined ? video.trimEnd : video.duration;
          return startPos + duration;
        }));
        
        return latestEndTime;
      };
      
      let nextPosition = getNextTimelinePosition();
      
      // Add timeline positions to new videos and push them to state
      const videosWithPositions = action.payload.map(video => {
        const videoWithPosition = {
          ...video,
          timelinePosition: nextPosition
        };
        
        // Update nextPosition for the next video (sequential placement)
        const videoDuration = video.trimEnd !== undefined ? video.trimEnd : video.duration;
        nextPosition += videoDuration;
        
        return videoWithPosition;
      });
      
      state.videos.push(...videosWithPositions);
      
      // Auto-select newly imported videos for timeline display
      const newVideoIds = action.payload.map(video => video.id);
      newVideoIds.forEach(id => {
        if (!state.selectedVideos.includes(id)) {
          state.selectedVideos.push(id);
        }
      });
      
      state.totalDuration = state.videos.reduce((sum, video) => sum + video.duration, 0);
      state.totalSize = state.videos.reduce((sum, video) => sum + video.size, 0);
    },
    
    removeVideo: (state, action: PayloadAction<string>) => {
      state.videos = state.videos.filter(video => video.id !== action.payload);
      state.selectedVideos = state.selectedVideos.filter(id => id !== action.payload);
      state.totalDuration = state.videos.reduce((sum, video) => sum + video.duration, 0);
      state.totalSize = state.videos.reduce((sum, video) => sum + video.size, 0);
    },
    
    updateVideoStatus: (state, action: PayloadAction<{ id: string; status: VideoStatus }>) => {
      const video = state.videos.find(v => v.id === action.payload.id);
      if (video) {
        video.status = action.payload.status;
      }
    },
    
    updateVideoProgress: (state, action: PayloadAction<{ id: string; progress: number }>) => {
      const video = state.videos.find(v => v.id === action.payload.id);
      if (video) {
        video.processProgress = action.payload.progress;
      }
    },
    
    updateVideoTrimPoints: (state, action: PayloadAction<{ 
      id: string; 
      trimStart: number; 
      trimEnd: number; 
    }>) => {
      const video = state.videos.find(v => v.id === action.payload.id);
      if (video) {
        video.trimStart = action.payload.trimStart;
        video.trimEnd = action.payload.trimEnd;
      }
    },

    updateVideoTimelinePosition: (state, action: PayloadAction<{ 
      id: string; 
      timelinePosition: number; 
    }>) => {
      const video = state.videos.find(v => v.id === action.payload.id);
      if (video) {
        video.timelinePosition = action.payload.timelinePosition;
      }
    },

    addVideoToTimeline: (state, action: PayloadAction<{ 
      videoId: string; 
      timelinePosition?: number; 
    }>) => {
      const { videoId, timelinePosition } = action.payload;
      const video = state.videos.find(v => v.id === videoId);
      
      if (video) {
        // If no position specified, add at the end
        if (timelinePosition === undefined) {
          const latestEndTime = state.videos.length > 0 
            ? Math.max(...state.videos.map(v => {
                const startPos = v.timelinePosition || 0;
                const duration = v.trimEnd !== undefined ? v.trimEnd : v.duration;
                return startPos + duration;
              }))
            : 0;
          video.timelinePosition = latestEndTime;
        } else {
          video.timelinePosition = timelinePosition;
        }
      }
    },

    removeVideoFromTimeline: (state, action: PayloadAction<string>) => {
      const video = state.videos.find(v => v.id === action.payload);
      if (video) {
        video.timelinePosition = undefined;
      }
    },
    
    selectVideo: (state, action: PayloadAction<string>) => {
      if (!state.selectedVideos.includes(action.payload)) {
        state.selectedVideos.push(action.payload);
      }
    },
    
    deselectVideo: (state, action: PayloadAction<string>) => {
      state.selectedVideos = state.selectedVideos.filter(id => id !== action.payload);
    },
    
    selectAllVideos: (state, action: PayloadAction<string[] | undefined>) => {
      state.selectedVideos = action.payload || state.videos.map(video => video.id);
    },

    autoSelectAllVideos: (state) => {
      // Auto-select all videos that aren't already selected
      const unselectedVideoIds = state.videos
        .filter(video => !state.selectedVideos.includes(video.id))
        .map(video => video.id);
      
      state.selectedVideos.push(...unselectedVideoIds);
    },
    
    deselectAllVideos: (state) => {
      state.selectedVideos = [];
    },
    
    reorderVideos: (state, action: PayloadAction<{ fromIndex: number; toIndex: number }>) => {
      const { fromIndex, toIndex } = action.payload;
      const [movedVideo] = state.videos.splice(fromIndex, 1);
      state.videos.splice(toIndex, 0, movedVideo);
    },
    
    setProjectName: (state, action: PayloadAction<string>) => {
      state.projectName = action.payload;
    },
    
    setProjectPath: (state, action: PayloadAction<string | null>) => {
      state.projectPath = action.payload;
    },
    
    clearProject: (state) => {
      state.videos = [];
      state.selectedVideos = [];
      state.totalDuration = 0;
      state.totalSize = 0;
      state.projectName = 'Untitled Project';
      state.projectPath = null;
    },
    
    loadProject: (state, action: PayloadAction<VideoState>) => {
      return { ...action.payload };
    },
    
    addVideoEffect: (state, action: PayloadAction<{ videoId: string; effect: any }>) => {
      const { videoId, effect } = action.payload;
      const video = state.videos.find(v => v.id === videoId);
      if (video) {
        if (!video.effects) {
          video.effects = [];
        }
        video.effects.push(effect);
      }
    },
    
    removeVideoEffect: (state, action: PayloadAction<{ videoId: string; effectIndex: number }>) => {
      const { videoId, effectIndex } = action.payload;
      const video = state.videos.find(v => v.id === videoId);
      if (video && video.effects) {
        video.effects.splice(effectIndex, 1);
      }
    },
  },
});

export const {
  addVideos,
  removeVideo,
  updateVideoStatus,
  updateVideoProgress,
  updateVideoTrimPoints,
  updateVideoTimelinePosition,
  addVideoToTimeline,
  removeVideoFromTimeline,
  selectVideo,
  deselectVideo,
  selectAllVideos,
  autoSelectAllVideos,
  deselectAllVideos,
  reorderVideos,
  setProjectName,
  setProjectPath,
  clearProject,
  loadProject,
  addVideoEffect,
  removeVideoEffect,
} = videoSlice.actions;

export default videoSlice.reducer;