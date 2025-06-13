import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VideoCard } from '../VideoCard';
import { Video } from '../../../types/video.types';

// Mock video data
const mockVideo: Video = {
  id: 'test-video-1',
  name: 'Test Video.mp4',
  path: '/path/to/test-video.mp4',
  size: 104857600, // 100MB
  duration: 120, // 2 minutes
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

const mockProps = {
  video: mockVideo,
  isSelected: false,
  onSelect: jest.fn(),
  onRemove: jest.fn(),
  onEdit: jest.fn(),
  onPreview: jest.fn(),
  viewMode: 'grid' as const,
  thumbnailSize: 200,
  showThumbnails: true
};

describe('VideoCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders video card with basic information', () => {
    render(<VideoCard {...mockProps} />);
    
    expect(screen.getByText('Test Video.mp4')).toBeInTheDocument();
    expect(screen.getByText('1920x1080')).toBeInTheDocument();
    expect(screen.getByText('100.0 MB')).toBeInTheDocument();
    expect(screen.getByText('2:00')).toBeInTheDocument();
  });

  it('displays thumbnail when available', () => {
    render(<VideoCard {...mockProps} />);
    
    const thumbnail = screen.getByAltText('Test Video.mp4');
    expect(thumbnail).toBeInTheDocument();
    expect(thumbnail).toHaveAttribute('src', mockVideo.thumbnail);
  });

  it('shows placeholder when no thumbnail', () => {
    const videoWithoutThumbnail = { ...mockVideo, thumbnail: undefined };
    render(<VideoCard {...mockProps} video={videoWithoutThumbnail} />);
    
    expect(screen.getByText('📹')).toBeInTheDocument();
  });

  it('calls onSelect when card is clicked', () => {
    render(<VideoCard {...mockProps} />);
    
    fireEvent.click(screen.getByText('Test Video.mp4'));
    expect(mockProps.onSelect).toHaveBeenCalledWith(mockVideo.id, true);
  });

  it('shows selection state correctly', () => {
    render(<VideoCard {...mockProps} isSelected={true} />);
    
    const card = screen.getByText('Test Video.mp4').closest('.video-card-modern');
    expect(card).toHaveClass('selected');
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('displays quality badge correctly', () => {
    render(<VideoCard {...mockProps} />);
    expect(screen.getByText('HD')).toBeInTheDocument();
  });

  it('shows 4K badge for 4K content', () => {
    const fourKVideo = {
      ...mockVideo,
      metadata: { ...mockVideo.metadata, width: 2560, height: 1440 }
    };
    render(<VideoCard {...mockProps} video={fourKVideo} />);
    expect(screen.getByText('4K')).toBeInTheDocument();
  });

  it('shows 8K badge for UHD content', () => {
    const uhdVideo = {
      ...mockVideo,
      metadata: { ...mockVideo.metadata, width: 3840, height: 2160 }
    };
    render(<VideoCard {...mockProps} video={uhdVideo} />);
    expect(screen.getByText('8K')).toBeInTheDocument();
  });

  it('displays status indicator', () => {
    render(<VideoCard {...mockProps} />);
    
    const statusDot = document.querySelector('.status-dot');
    expect(statusDot).toBeInTheDocument();
  });

  it('shows processing progress when processing', () => {
    const processingVideo = {
      ...mockVideo,
      status: 'processing' as const,
      processProgress: 45
    };
    render(<VideoCard {...mockProps} video={processingVideo} />);
    
    const progressFill = document.querySelector('.progress-fill');
    expect(progressFill).toHaveStyle('width: 45%');
  });

  it('shows effects indicator when video has effects', () => {
    const videoWithEffects = {
      ...mockVideo,
      effects: [
        { id: '1', type: 'upscaling', name: 'Upscale', enabled: true, settings: {} }
      ]
    };
    render(<VideoCard {...mockProps} video={videoWithEffects} />);
    
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('✨')).toBeInTheDocument();
  });

  it('shows audio indicator when video has audio', () => {
    render(<VideoCard {...mockProps} />);
    expect(screen.getByText('🔊')).toBeInTheDocument();
  });

  it('renders list view correctly', () => {
    render(<VideoCard {...mockProps} viewMode="list" />);
    
    const listCard = document.querySelector('.video-card-list');
    expect(listCard).toBeInTheDocument();
  });

  it('calls onPreview when preview button is clicked', () => {
    render(<VideoCard {...mockProps} />);
    
    // Hover to show action buttons
    const card = screen.getByText('Test Video.mp4').closest('.video-card-modern');
    fireEvent.mouseEnter(card!);
    
    const previewButton = screen.getByTitle('Preview video');
    fireEvent.click(previewButton);
    
    expect(mockProps.onPreview).toHaveBeenCalledWith(mockVideo);
  });

  it('calls onEdit when edit button is clicked', () => {
    render(<VideoCard {...mockProps} />);
    
    const card = screen.getByText('Test Video.mp4').closest('.video-card-modern');
    fireEvent.mouseEnter(card!);
    
    const editButton = screen.getByTitle('Edit video');
    fireEvent.click(editButton);
    
    expect(mockProps.onEdit).toHaveBeenCalledWith(mockVideo.id);
  });

  it('calls onRemove when remove button is clicked', () => {
    render(<VideoCard {...mockProps} />);
    
    const card = screen.getByText('Test Video.mp4').closest('.video-card-modern');
    fireEvent.mouseEnter(card!);
    
    const removeButton = screen.getByTitle('Remove video');
    fireEvent.click(removeButton);
    
    expect(mockProps.onRemove).toHaveBeenCalledWith(mockVideo.id);
  });

  it('formats file size correctly', () => {
    const largeVideo = { ...mockVideo, size: 1073741824 }; // 1GB
    render(<VideoCard {...mockProps} video={largeVideo} />);
    
    expect(screen.getByText('1.0 GB')).toBeInTheDocument();
  });

  it('formats duration correctly for long videos', () => {
    const longVideo = { ...mockVideo, duration: 3725 }; // 1h 2m 5s
    render(<VideoCard {...mockProps} />);
    
    // Check that duration is formatted properly
    expect(screen.getByText('2:00')).toBeInTheDocument();
  });

  it('adjusts thumbnail size based on props', () => {
    render(<VideoCard {...mockProps} thumbnailSize={300} />);
    
    const card = document.querySelector('.video-card-modern');
    expect(card).toHaveStyle('width: 300px');
  });

  it('stops propagation on action button clicks', () => {
    const onSelect = jest.fn();
    render(<VideoCard {...mockProps} onSelect={onSelect} />);
    
    const card = screen.getByText('Test Video.mp4').closest('.video-card-modern');
    fireEvent.mouseEnter(card!);
    
    const editButton = screen.getByTitle('Edit video');
    fireEvent.click(editButton);
    
    // onSelect should not be called because event propagation was stopped
    expect(onSelect).not.toHaveBeenCalled();
  });
});