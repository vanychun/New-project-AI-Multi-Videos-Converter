import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, Store } from '@reduxjs/toolkit';
import { VideoState } from '../store/slices/videoSlice';
import { TimelineState } from '../store/slices/timelineSlice';
import { UIState } from '../store/slices/uiSlice';
import { ProcessingState } from '../store/slices/processingSlice';
import { SettingsState } from '../store/slices/settingsSlice';
import videoSlice from '../store/slices/videoSlice';
import timelineSlice from '../store/slices/timelineSlice';
import uiSlice from '../store/slices/uiSlice';
import processingSlice from '../store/slices/processingSlice';
import settingsSlice from '../store/slices/settingsSlice';
import { Video, VideoStatus } from '../types/video.types';

// Define RootState for tests
export interface TestRootState {
  videos: VideoState;
  timeline: TimelineState;
  ui: UIState;
  processing: ProcessingState;
  settings: SettingsState;
}

// Create mock store
export function createMockStore(initialState?: Partial<TestRootState>): Store<TestRootState> {
  return configureStore({
    reducer: {
      videos: videoSlice,
      timeline: timelineSlice,
      ui: uiSlice,
      processing: processingSlice,
      settings: settingsSlice,
    },
    preloadedState: initialState,
  });
}

// Custom render with Redux Provider
interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialState?: Partial<TestRootState>;
  store?: Store<TestRootState>;
}

export function renderWithRedux(
  ui: ReactElement,
  {
    initialState,
    store = createMockStore(initialState),
    ...renderOptions
  }: ExtendedRenderOptions = {}
): RenderResult & { store: Store<TestRootState> } {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  }

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

// Mock video data factory
export function createMockVideo(overrides: Partial<Video> = {}): Video {
  const baseVideo: Video = {
    id: 'test-video-1',
    name: 'Test Video.mp4',
    path: '/path/to/test/video.mp4',
    size: 1024 * 1024 * 100, // 100MB
    duration: 60, // 60 seconds
    format: 'mp4',
    resolution: '1920x1080',
    fps: 30,
    bitrate: 5000,
    thumbnail: 'data:image/jpeg;base64,test-thumbnail',
    status: 'ready' as VideoStatus,
    processProgress: 0,
    trimStart: 0,
    trimEnd: 60,
    timelinePosition: 0,
    trackIndex: 0,
    selected: false,
    metadata: {
      width: 1920,
      height: 1080,
      aspectRatio: '16:9',
      codec: 'h264',
      audioCodec: 'aac',
      audioChannels: 2,
      audioSampleRate: 48000,
      frameRate: 30,
      duration: 60,
      bitDepth: 8,
      colorSpace: 'yuv420p',
      hasAudio: true,
      hasVideo: true,
    },
    createdAt: Date.now(),
    modifiedAt: Date.now(),
    effects: [],
  };

  return { ...baseVideo, ...overrides };
}

// Mock multiple videos
export function createMockVideos(count: number): Video[] {
  return Array.from({ length: count }, (_, index) =>
    createMockVideo({
      id: `test-video-${index + 1}`,
      name: `Test Video ${index + 1}.mp4`,
      timelinePosition: index * 30, // Stagger by 30 seconds
    })
  );
}

// Mock trim handle
export function createMockTrimHandle(videoId: string, handle: 'start' | 'end') {
  return { videoId, handle };
}

// Test constants
export const TEST_CONSTANTS = {
  DEFAULT_PIXELS_PER_SECOND: 10,
  DEFAULT_GRID_INTERVAL: 1,
  DEFAULT_TOTAL_DURATION: 120,
  DRAG_DISTANCE: 100,
  TRIM_THRESHOLD: 0.1,
} as const;

// Mock event helpers
export function createMockMouseEvent(type: string, options: Partial<MouseEvent> = {}): MouseEvent {
  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: 100,
    clientY: 100,
    ...options,
  });
}

export function createMockKeyboardEvent(type: string, options: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return new KeyboardEvent(type, {
    bubbles: true,
    cancelable: true,
    key: 'Enter',
    ...options,
  });
}

// Mock CSS variables for tests
export function setupCSSVariables() {
  document.documentElement.style.setProperty('--primary', '#3b82f6');
  document.documentElement.style.setProperty('--error', '#ef4444');
  document.documentElement.style.setProperty('--warning', '#f59e0b');
  document.documentElement.style.setProperty('--success', '#10b981');
  document.documentElement.style.setProperty('--text-muted', '#6b7280');
  document.documentElement.style.setProperty('--border', '#e5e7eb');
  document.documentElement.style.setProperty('--selection', '#3b82f6');
}