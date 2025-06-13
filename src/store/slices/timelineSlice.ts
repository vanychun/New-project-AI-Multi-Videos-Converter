import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface TimelineState {
  currentTime: number;
  totalDuration: number;
  zoom: number;
  zoomLevel: number;
  isPlaying: boolean;
  playbackSpeed: number;
  playbackRate: number;
  loopMode: boolean;
  selectedTracks: string[];
  viewportStart: number;
  viewportEnd: number;
  snapToGrid: boolean;
  gridInterval: number; // seconds
  trimMode: boolean;
  activeTrimHandle: { videoId: string; handle: 'start' | 'end' } | null;
}

const initialState: TimelineState = {
  currentTime: 0,
  totalDuration: 0,
  zoom: 1,
  zoomLevel: 1,
  isPlaying: false,
  playbackSpeed: 1,
  playbackRate: 1,
  loopMode: false,
  selectedTracks: [],
  viewportStart: 0,
  viewportEnd: 100,
  snapToGrid: true,
  gridInterval: 1,
  trimMode: false,
  activeTrimHandle: null,
};

const timelineSlice = createSlice({
  name: 'timeline',
  initialState,
  reducers: {
    setCurrentTime: (state, action: PayloadAction<number>) => {
      state.currentTime = Math.max(0, Math.min(action.payload, state.totalDuration));
    },
    
    setTotalDuration: (state, action: PayloadAction<number>) => {
      state.totalDuration = action.payload;
      if (state.currentTime > action.payload) {
        state.currentTime = action.payload;
      }
    },
    
    setZoomLevel: (state, action: PayloadAction<number>) => {
      state.zoomLevel = Math.max(0.1, Math.min(10, action.payload));
    },
    
    setIsPlaying: (state, action: PayloadAction<boolean>) => {
      state.isPlaying = action.payload;
    },
    
    togglePlayback: (state) => {
      state.isPlaying = !state.isPlaying;
    },
    
    setPlaybackSpeed: (state, action: PayloadAction<number>) => {
      state.playbackSpeed = action.payload;
    },

    setPlaybackRate: (state, action: PayloadAction<number>) => {
      state.playbackRate = action.payload;
    },

    setLoopMode: (state, action: PayloadAction<boolean>) => {
      state.loopMode = action.payload;
    },
    
    selectTrack: (state, action: PayloadAction<string>) => {
      if (!state.selectedTracks.includes(action.payload)) {
        state.selectedTracks.push(action.payload);
      }
    },
    
    deselectTrack: (state, action: PayloadAction<string>) => {
      state.selectedTracks = state.selectedTracks.filter(id => id !== action.payload);
    },
    
    clearTrackSelection: (state) => {
      state.selectedTracks = [];
    },
    
    setViewport: (state, action: PayloadAction<{ start: number; end: number }>) => {
      state.viewportStart = action.payload.start;
      state.viewportEnd = action.payload.end;
    },
    
    panViewport: (state, action: PayloadAction<number>) => {
      const panAmount = action.payload;
      // const viewportSize = state.viewportEnd - state.viewportStart; // TODO: Use for viewport calculations
      
      if (state.viewportStart + panAmount >= 0 && state.viewportEnd + panAmount <= state.totalDuration) {
        state.viewportStart += panAmount;
        state.viewportEnd += panAmount;
      }
    },
    
    zoomToFit: (state) => {
      state.viewportStart = 0;
      state.viewportEnd = state.totalDuration;
      state.zoomLevel = 1;
    },
    
    zoomToSelection: (state) => {
      // Implementation for zooming to selected tracks
      if (state.selectedTracks.length > 0) {
        // Calculate bounds of selected tracks
        // This would require video data, so we'll implement in a thunk
      }
    },
    
    setSnapToGrid: (state, action: PayloadAction<boolean>) => {
      state.snapToGrid = action.payload;
    },
    
    setGridInterval: (state, action: PayloadAction<number>) => {
      state.gridInterval = Math.max(0.1, action.payload);
    },
    
    setTrimMode: (state, action: PayloadAction<boolean>) => {
      state.trimMode = action.payload;
      if (!action.payload) {
        state.activeTrimHandle = null;
      }
    },
    
    setActiveTrimHandle: (state, action: PayloadAction<{ videoId: string; handle: 'start' | 'end' } | null>) => {
      state.activeTrimHandle = action.payload;
    },
    
    seekToTime: (state, action: PayloadAction<number>) => {
      const targetTime = action.payload;
      
      if (state.snapToGrid) {
        // Snap to nearest grid line
        const snappedTime = Math.round(targetTime / state.gridInterval) * state.gridInterval;
        state.currentTime = Math.max(0, Math.min(snappedTime, state.totalDuration));
      } else {
        state.currentTime = Math.max(0, Math.min(targetTime, state.totalDuration));
      }
    },
    
    stepFrame: (state, action: PayloadAction<'forward' | 'backward'>) => {
      const frameStep = 1 / 30; // Assume 30fps for frame stepping
      const direction = action.payload === 'forward' ? 1 : -1;
      const newTime = state.currentTime + (frameStep * direction);
      
      state.currentTime = Math.max(0, Math.min(newTime, state.totalDuration));
    },
    
    jumpToStart: (state) => {
      state.currentTime = 0;
    },
    
    jumpToEnd: (state) => {
      state.currentTime = state.totalDuration;
    },
    
    resetTimeline: (_state) => {
      return { ...initialState };
    },
  },
});

export const {
  setCurrentTime,
  setTotalDuration,
  setZoomLevel,
  setIsPlaying,
  togglePlayback,
  setPlaybackSpeed,
  setPlaybackRate,
  setLoopMode,
  selectTrack,
  deselectTrack,
  clearTrackSelection,
  setViewport,
  panViewport,
  zoomToFit,
  zoomToSelection,
  setSnapToGrid,
  setGridInterval,
  setTrimMode,
  setActiveTrimHandle,
  seekToTime,
  stepFrame,
  jumpToStart,
  jumpToEnd,
  resetTimeline,
} = timelineSlice.actions;

export default timelineSlice.reducer;