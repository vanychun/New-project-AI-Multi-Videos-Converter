import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import QuickFiltersEnhanced from '../QuickFiltersEnhanced';
import videoSlice from '../../../store/slices/videoSlice';
import { Video } from '../../../types/video.types';

// Mock videos for testing
const mockVideos: Video[] = [
  {
    id: '1',
    name: 'Recent Video.mp4',
    path: '/path/1.mp4',
    size: 50 * 1024 * 1024, // 50MB
    duration: 120,
    format: 'mp4',
    resolution: '1920x1080',
    fps: 30,
    bitrate: 5000,
    status: 'ready',
    metadata: { width: 1920, height: 1080, aspectRatio: '16:9', codec: 'h264', frameRate: 30, hasAudio: true, hasVideo: true },
    createdAt: Date.now() - 1000 * 60 * 60, // 1 hour ago
    modifiedAt: Date.now()
  },
  {
    id: '2',
    name: 'Large Video.mp4',
    path: '/path/2.mp4',
    size: 200 * 1024 * 1024, // 200MB
    duration: 600, // 10 minutes
    format: 'mp4',
    resolution: '3840x2160',
    fps: 30,
    bitrate: 15000,
    status: 'processing',
    metadata: { width: 3840, height: 2160, aspectRatio: '16:9', codec: 'h264', frameRate: 30, hasAudio: true, hasVideo: true },
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 10, // 10 days ago
    modifiedAt: Date.now(),
    effects: [{ id: '1', type: 'upscaling', name: 'Upscale', enabled: true, settings: {} }]
  },
  {
    id: '3',
    name: 'Old Video.mp4',
    path: '/path/3.mp4',
    size: 30 * 1024 * 1024, // 30MB
    duration: 60,
    format: 'mp4',
    resolution: '1280x720',
    fps: 30,
    bitrate: 3000,
    status: 'completed',
    metadata: { width: 1280, height: 720, aspectRatio: '16:9', codec: 'h264', frameRate: 30, hasAudio: false, hasVideo: true },
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30, // 30 days ago
    modifiedAt: Date.now()
  }
];

const createTestStore = (videos = mockVideos) => {
  return configureStore({
    reducer: {
      videos: videoSlice
    },
    preloadedState: {
      videos: {
        videos,
        selectedVideos: [],
        totalDuration: videos.reduce((sum, v) => sum + v.duration, 0),
        totalSize: videos.reduce((sum, v) => sum + v.size, 0),
        projectName: 'Test Project',
        projectPath: null
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

const mockProps = {
  activeFilter: null,
  onFilterChange: jest.fn()
};

describe('QuickFiltersEnhanced', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all main filters with correct counts', () => {
    renderWithStore(<QuickFiltersEnhanced {...mockProps} />);
    
    expect(screen.getByText('All Videos')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // All videos count
    
    expect(screen.getByText('Recent')).toBeInTheDocument();
    const countElements = screen.getAllByText('1');
    expect(countElements.length).toBeGreaterThan(0); // Multiple filters can have count 1
    
    expect(screen.getByText('Large Files')).toBeInTheDocument();
    
    expect(screen.getByText('HD')).toBeInTheDocument();
    const hdCountElements = screen.getAllByText('2');
    expect(hdCountElements.length).toBeGreaterThan(0); // HD videos count
  });

  it('shows 4K/8K filter when UHD content is present', () => {
    renderWithStore(<QuickFiltersEnhanced {...mockProps} />);
    
    expect(screen.getByText('4K/8K')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // UHD videos count
  });

  it('shows enhanced filter when videos have effects', () => {
    renderWithStore(<QuickFiltersEnhanced {...mockProps} />);
    
    expect(screen.getByText('Enhanced')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // Enhanced videos count
  });

  it('shows with audio filter correctly', () => {
    renderWithStore(<QuickFiltersEnhanced {...mockProps} />);
    
    expect(screen.getByText('With Audio')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Videos with audio count
  });

  it('renders status filters when applicable', () => {
    renderWithStore(<QuickFiltersEnhanced {...mockProps} />);
    
    expect(screen.getByText('Processing')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('calls onFilterChange when filter is clicked', () => {
    renderWithStore(<QuickFiltersEnhanced {...mockProps} />);
    
    const recentFilter = screen.getByText('Recent');
    fireEvent.click(recentFilter);
    
    expect(mockProps.onFilterChange).toHaveBeenCalledWith('recent');
  });

  it('shows active filter correctly', () => {
    renderWithStore(<QuickFiltersEnhanced {...mockProps} activeFilter="recent" />);
    
    const recentFilter = screen.getByText('Recent').closest('.filter-btn');
    expect(recentFilter).toHaveClass('active');
  });

  it('shows clear filter button when filter is active', () => {
    renderWithStore(<QuickFiltersEnhanced {...mockProps} activeFilter="recent" />);
    
    expect(screen.getByText('Clear Filter')).toBeInTheDocument();
  });

  it('calls onFilterChange with null when clear filter is clicked', () => {
    renderWithStore(<QuickFiltersEnhanced {...mockProps} activeFilter="recent" />);
    
    const clearButton = screen.getByText('Clear Filter');
    fireEvent.click(clearButton);
    
    expect(mockProps.onFilterChange).toHaveBeenCalledWith(null);
  });

  it('deactivates filter when clicked again', () => {
    renderWithStore(<QuickFiltersEnhanced {...mockProps} activeFilter="recent" />);
    
    const recentFilter = screen.getByText('Recent');
    fireEvent.click(recentFilter);
    
    expect(mockProps.onFilterChange).toHaveBeenCalledWith(null);
  });

  it('shows custom filter button', () => {
    renderWithStore(<QuickFiltersEnhanced {...mockProps} />);
    
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  it('filters are color-coded correctly', () => {
    renderWithStore(<QuickFiltersEnhanced {...mockProps} />);
    
    const allVideosFilter = screen.getByText('All Videos').closest('.filter-btn');
    expect(allVideosFilter).toHaveStyle('--filter-color: #7461ef');
  });

  it('does not show filters with zero counts except All Videos', () => {
    const emptyStore = createTestStore([]);
    renderWithStore(<QuickFiltersEnhanced {...mockProps} />, emptyStore);
    
    expect(screen.getByText('All Videos')).toBeInTheDocument();
    expect(screen.queryByText('Recent')).not.toBeInTheDocument();
    expect(screen.queryByText('Large Files')).not.toBeInTheDocument();
  });

  it('calculates long videos filter correctly', () => {
    renderWithStore(<QuickFiltersEnhanced {...mockProps} />);
    
    // One video has duration > 300 seconds (600s = 10 minutes)
    expect(screen.getByText('Long Videos')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('does not show status filters when no videos have those statuses', () => {
    const readyOnlyVideos = mockVideos.map(v => ({ ...v, status: 'ready' as const }));
    const store = createTestStore(readyOnlyVideos);
    renderWithStore(<QuickFiltersEnhanced {...mockProps} />, store);
    
    expect(screen.queryByText('Processing')).not.toBeInTheDocument();
    expect(screen.queryByText('Completed')).not.toBeInTheDocument();
  });

  it('handles empty state gracefully', () => {
    const emptyStore = createTestStore([]);
    renderWithStore(<QuickFiltersEnhanced {...mockProps} />, emptyStore);
    
    expect(screen.getByText('All Videos')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('updates counts dynamically when videos change', () => {
    const store = createTestStore(mockVideos.slice(0, 1)); // Only first video
    renderWithStore(<QuickFiltersEnhanced {...mockProps} />, store);
    
    const allVideosButton = screen.getByText('All Videos').closest('button');
    expect(allVideosButton).toHaveTextContent('1'); // All videos count
    expect(screen.getByText('Recent')).toBeInTheDocument();
  });

  it('shows correct icons for each filter', () => {
    renderWithStore(<QuickFiltersEnhanced {...mockProps} />);
    
    expect(screen.getByText('📁')).toBeInTheDocument(); // All Videos
    expect(screen.getByText('🕒')).toBeInTheDocument(); // Recent
    expect(screen.getByText('📊')).toBeInTheDocument(); // Large Files
    expect(screen.getByText('🎬')).toBeInTheDocument(); // HD
    expect(screen.getByText('🔊')).toBeInTheDocument(); // With Audio
    expect(screen.getByText('✨')).toBeInTheDocument(); // Enhanced
  });
});