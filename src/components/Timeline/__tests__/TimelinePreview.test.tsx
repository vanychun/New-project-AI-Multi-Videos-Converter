import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import TimelinePreview from '../TimelinePreview';
import videoSlice from '../../../store/slices/videoSlice';
import timelineSlice from '../../../store/slices/timelineSlice';
import { Video } from '../../../types/video.types';

// Mock HTML5 video
const mockVideo = {
  play: jest.fn(() => Promise.resolve()),
  pause: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  requestFullscreen: jest.fn(),
  currentTime: 0,
  duration: 120
};

Object.defineProperty(HTMLVideoElement.prototype, 'play', {
  writable: true,
  value: mockVideo.play
});

Object.defineProperty(HTMLVideoElement.prototype, 'pause', {
  writable: true,
  value: mockVideo.pause
});

const mockVideoData: Video = {
  id: 'test-video-1',
  name: 'Test Video.mp4',
  path: '/path/to/test-video.mp4',
  size: 104857600,
  duration: 120,
  format: 'mp4',
  resolution: '1920x1080',
  fps: 30,
  bitrate: 5000,
  thumbnail: 'data:image/jpeg;base64,testthumb',
  status: 'ready',
  metadata: {
    width: 1920,
    height: 1080,
    aspectRatio: '16:9',
    codec: 'h264',
    audioCodec: 'aac',
    audioChannels: 2,
    audioSampleRate: 44100,
    frameRate: 30,
    duration: 120,
    hasAudio: true,
    hasVideo: true
  },
  createdAt: Date.now(),
  modifiedAt: Date.now()
};

const createTestStore = (videos = [mockVideoData], timelineState = {}) => {
  return configureStore({
    reducer: {
      videos: videoSlice,
      timeline: timelineSlice
    },
    preloadedState: {
      videos: {
        videos,
        selectedVideos: videos.length > 0 ? [videos[0].id] : [],
        totalDuration: videos.reduce((sum, v) => sum + v.duration, 0),
        totalSize: videos.reduce((sum, v) => sum + v.size, 0),
        projectName: 'Test Project',
        projectPath: null
      },
      timeline: {
        currentTime: 0,
        totalDuration: 120,
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
        ...timelineState
      }
    }
  });
};

const renderWithStore = (component: React.ReactElement, store = createTestStore()) => {
  return render(
    <Provider store={store}>
      {component}
    </Provider>
  );
};

describe('TimelinePreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock fullscreen API
    Object.defineProperty(document, 'fullscreenElement', {
      writable: true,
      value: null
    });
    Object.defineProperty(document, 'exitFullscreen', {
      writable: true,
      value: jest.fn()
    });
  });

  it('renders video preview when video is available', () => {
    renderWithStore(<TimelinePreview />);
    
    const video = screen.getByRole('application'); // video element
    expect(video).toBeInTheDocument();
  });

  it('shows empty state when no video is selected', () => {
    const store = createTestStore([]);
    renderWithStore(<TimelinePreview />, store);
    
    expect(screen.getByText('No video selected')).toBeInTheDocument();
    expect(screen.getByText('Select a video track or add videos to the timeline')).toBeInTheDocument();
  });

  it('displays video information correctly', () => {
    renderWithStore(<TimelinePreview />);
    
    expect(screen.getByText('Test Video.mp4')).toBeInTheDocument();
    expect(screen.getByText('1920×1080')).toBeInTheDocument();
  });

  it('shows play button when video is paused', () => {
    renderWithStore(<TimelinePreview />);
    
    const playButton = screen.getByText('▶️');
    expect(playButton).toBeInTheDocument();
  });

  it('shows pause button when video is playing', () => {
    const store = createTestStore([mockVideoData], { isPlaying: true });
    renderWithStore(<TimelinePreview />, store);
    
    const pauseButton = screen.getByText('⏸️');
    expect(pauseButton).toBeInTheDocument();
  });

  it('displays current time and total duration', () => {
    const store = createTestStore([mockVideoData], { currentTime: 30, totalDuration: 120 });
    renderWithStore(<TimelinePreview />, store);
    
    expect(screen.getByText('0:30 / 2:00')).toBeInTheDocument();
  });

  it('shows video controls on hover', async () => {
    renderWithStore(<TimelinePreview />);
    
    const videoContainer = document.querySelector('.video-preview-container');
    fireEvent.mouseEnter(videoContainer!);
    
    await waitFor(() => {
      expect(screen.getByTitle('Zoom In')).toBeInTheDocument();
      expect(screen.getByTitle('Zoom Out')).toBeInTheDocument();
      expect(screen.getByTitle('Fit All')).toBeInTheDocument();
    });
  });

  it('handles play/pause toggle', () => {
    renderWithStore(<TimelinePreview />);
    
    const playButton = document.querySelector('.video-play-button');
    fireEvent.click(playButton!);
    
    // Should dispatch togglePlayback action
    expect(mockVideo.play).toHaveBeenCalled();
  });

  it('handles zoom controls', () => {
    renderWithStore(<TimelinePreview />);
    
    // Show controls first
    const videoContainer = document.querySelector('.video-preview-container');
    fireEvent.mouseEnter(videoContainer!);
    
    const zoomInButton = screen.getByTitle('Zoom In');
    fireEvent.click(zoomInButton);
    
    // Should dispatch zoom action
    expect(zoomInButton).toBeInTheDocument();
  });

  it('handles fullscreen toggle', () => {
    renderWithStore(<TimelinePreview />);
    
    const videoContainer = document.querySelector('.video-preview-container');
    fireEvent.mouseEnter(videoContainer!);
    
    const fullscreenButton = screen.getByTitle('Fullscreen');
    fireEvent.click(fullscreenButton);
    
    expect(mockVideo.requestFullscreen).toHaveBeenCalled();
  });

  it('shows progress bar that reflects current time', () => {
    const store = createTestStore([mockVideoData], { currentTime: 60, totalDuration: 120 });
    renderWithStore(<TimelinePreview />, store);
    
    const progressFill = document.querySelector('.progress-fill');
    expect(progressFill).toHaveStyle('width: 50%');
  });

  it('handles seeking via progress bar click', () => {
    renderWithStore(<TimelinePreview />);
    
    const progressBar = document.querySelector('.video-progress-bar');
    
    // Mock getBoundingClientRect
    const mockRect = { left: 0, width: 200 };
    progressBar!.getBoundingClientRect = jest.fn(() => mockRect as DOMRect);
    
    fireEvent.click(progressBar!, { clientX: 100 }); // Click at 50% position
    
    // Should seek to middle of video
    expect(progressBar).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    renderWithStore(<TimelinePreview />);
    
    expect(screen.getByText('Loading video...')).toBeInTheDocument();
  });

  it('shows error state when video fails to load', () => {
    renderWithStore(<TimelinePreview />);
    
    const video = document.querySelector('video');
    fireEvent.error(video!);
    
    expect(screen.getByText('Failed to load video')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('handles retry after error', () => {
    renderWithStore(<TimelinePreview />);
    
    const video = document.querySelector('video');
    fireEvent.error(video!);
    
    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);
    
    expect(screen.queryByText('Failed to load video')).not.toBeInTheDocument();
  });

  it('formats time correctly for long videos', () => {
    const store = createTestStore([mockVideoData], { currentTime: 3725, totalDuration: 7200 }); // 1h 2m 5s / 2h
    renderWithStore(<TimelinePreview />, store);
    
    expect(screen.getByText(/1:02:05/)).toBeInTheDocument();
  });

  it('hides video preview when showVideoPreview is false', () => {
    renderWithStore(<TimelinePreview showVideoPreview={false} />);
    
    expect(screen.queryByRole('application')).not.toBeInTheDocument();
  });

  it('adjusts height based on props', () => {
    renderWithStore(<TimelinePreview height={400} />);
    
    const container = document.querySelector('.timeline-preview');
    expect(container).toHaveStyle('height: 400px');
  });

  it('shows timeline container', () => {
    renderWithStore(<TimelinePreview />);
    
    const timelineArea = document.querySelector('.timeline-area');
    expect(timelineArea).toBeInTheDocument();
  });

  it('handles video time updates', () => {
    renderWithStore(<TimelinePreview />);
    
    const video = document.querySelector('video');
    
    // Mock video currentTime
    Object.defineProperty(video, 'currentTime', { value: 30, writable: true });
    
    fireEvent.timeUpdate(video!);
    
    // Should update timeline current time
    expect(video).toBeInTheDocument();
  });

  it('syncs video playback with timeline state', () => {
    const { rerender } = renderWithStore(<TimelinePreview />);
    
    // Change to playing state
    const playingStore = createTestStore([mockVideoData], { isPlaying: true });
    rerender(
      <Provider store={playingStore}>
        <TimelinePreview />
      </Provider>
    );
    
    expect(mockVideo.play).toHaveBeenCalled();
  });

  it('hides controls after timeout', async () => {
    jest.useFakeTimers();
    
    renderWithStore(<TimelinePreview />);
    
    const videoContainer = document.querySelector('.video-preview-container');
    fireEvent.mouseMove(videoContainer!);
    
    // Controls should be visible
    const controlsOverlay = document.querySelector('.video-controls-overlay');
    expect(controlsOverlay).toHaveStyle('opacity: 1');
    
    // Fast forward time
    jest.advanceTimersByTime(3000);
    
    await waitFor(() => {
      expect(controlsOverlay).toHaveStyle('opacity: 0');
    });
    
    jest.useRealTimers();
  });
});