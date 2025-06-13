import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VideoCardEnhanced } from '../../components/VideoLibrary/VideoCardEnhanced';
import { VideoFileEnhanced } from '../../types/video-enhanced.types';

// Mock video file for testing
const createMockVideo = (overrides: Partial<VideoFileEnhanced> = {}): VideoFileEnhanced => ({
  id: 'test-video-1',
  file: new File(['test'], 'test.mp4', { type: 'video/mp4' }),
  name: 'Test Video.mp4',
  path: '/path/to/test.mp4',
  originalName: 'Test Video.mp4',
  status: 'ready',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  metadata: {
    duration: 120,
    resolution: { width: 1920, height: 1080 },
    frameRate: 30,
    bitrate: 5000,
    codec: 'h264',
    audioTracks: 1,
    format: 'mp4',
    size: 50 * 1024 * 1024, // 50MB
    aspectRatio: '16:9',
    hasAudio: true
  },
  thumbnail: {
    dataUrl: 'data:image/jpeg;base64,mockThumbnail',
    timestamp: 60,
    width: 320,
    height: 180,
    generatedAt: new Date('2024-01-01')
  },
  qualityScore: 85,
  tags: ['test', 'sample'],
  ...overrides
});

const defaultProps = {
  isSelected: false,
  viewMode: 'grid' as const,
  gridSize: 'medium' as const,
  showThumbnails: true,
  showMetadata: true,
  showProgress: true,
  onSelect: jest.fn(),
  onDoubleClick: jest.fn(),
  onContextMenu: jest.fn(),
  onPreview: jest.fn(),
  onRemove: jest.fn(),
  onEdit: jest.fn()
};

describe('VideoCardEnhanced', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render video card with basic information', () => {
      const video = createMockVideo();
      render(<VideoCardEnhanced video={video} {...defaultProps} />);

      expect(screen.getByText('Test Video.mp4')).toBeInTheDocument();
      expect(screen.getByText('50.0 MB')).toBeInTheDocument();
      expect(screen.getByText('2:00')).toBeInTheDocument();
    });

    it('should display thumbnail when available', () => {
      const video = createMockVideo();
      render(<VideoCardEnhanced video={video} {...defaultProps} />);

      const thumbnail = screen.getByRole('img');
      expect(thumbnail).toHaveAttribute('src', 'data:image/jpeg;base64,mockThumbnail');
      expect(thumbnail).toHaveAttribute('alt', 'Test Video.mp4');
    });

    it('should show placeholder when no thumbnail available', () => {
      const video = createMockVideo({ thumbnail: undefined });
      render(<VideoCardEnhanced video={video} {...defaultProps} />);

      expect(screen.getByText('📹')).toBeInTheDocument();
      expect(screen.getByText('No Preview')).toBeInTheDocument();
    });

    it('should display status badge', () => {
      const video = createMockVideo({ status: 'processing' });
      render(<VideoCardEnhanced video={video} {...defaultProps} />);

      expect(screen.getByText('Processing')).toBeInTheDocument();
      expect(screen.getByText('⚙️')).toBeInTheDocument();
    });

    it('should display quality indicator', () => {
      const video = createMockVideo({ qualityScore: 85 });
      render(<VideoCardEnhanced video={video} {...defaultProps} />);

      expect(screen.getByText('High')).toBeInTheDocument();
    });

    it('should display tags', () => {
      const video = createMockVideo({ tags: ['test', 'sample', 'demo'] });
      render(<VideoCardEnhanced video={video} {...defaultProps} />);

      expect(screen.getByText('test')).toBeInTheDocument();
      expect(screen.getByText('sample')).toBeInTheDocument();
      expect(screen.getByText('+1')).toBeInTheDocument(); // Shows +1 for third tag
    });

    it('should display favorite indicator', () => {
      const video = createMockVideo({ favorite: true });
      render(<VideoCardEnhanced video={video} {...defaultProps} />);

      expect(screen.getByText('⭐')).toBeInTheDocument();
    });

    it('should display error message when video has error', () => {
      const video = createMockVideo({
        status: 'error',
        error: {
          code: 'PROCESSING_ERROR',
          message: 'Failed to process video',
          timestamp: new Date(),
          recoverable: true
        }
      });
      render(<VideoCardEnhanced video={video} {...defaultProps} />);

      expect(screen.getByText('Failed to process video')).toBeInTheDocument();
    });
  });

  describe('selection', () => {
    it('should show selection indicator when selected', () => {
      const video = createMockVideo();
      render(<VideoCardEnhanced video={video} {...defaultProps} isSelected={true} />);

      expect(screen.getByText('✓')).toBeInTheDocument();
    });

    it('should call onSelect when clicked', async () => {
      const video = createMockVideo();
      const onSelect = jest.fn();
      render(<VideoCardEnhanced video={video} {...defaultProps} onSelect={onSelect} />);

      await userEvent.click(screen.getByRole('button', { hidden: true })); // Card acts as button
      expect(onSelect).toHaveBeenCalledWith('test-video-1', false);
    });

    it('should call onSelect with multiselect when Ctrl+clicked', async () => {
      const video = createMockVideo();
      const onSelect = jest.fn();
      render(<VideoCardEnhanced video={video} {...defaultProps} onSelect={onSelect} />);

      await userEvent.click(screen.getByRole('button', { hidden: true }), { ctrlKey: true });
      expect(onSelect).toHaveBeenCalledWith('test-video-1', true);
    });
  });

  describe('interactions', () => {
    it('should call onDoubleClick when double-clicked', async () => {
      const video = createMockVideo();
      const onDoubleClick = jest.fn();
      render(<VideoCardEnhanced video={video} {...defaultProps} onDoubleClick={onDoubleClick} />);

      await userEvent.dblClick(screen.getByRole('button', { hidden: true }));
      expect(onDoubleClick).toHaveBeenCalledWith(video);
    });

    it('should call onContextMenu when right-clicked', async () => {
      const video = createMockVideo();
      const onContextMenu = jest.fn();
      render(<VideoCardEnhanced video={video} {...defaultProps} onContextMenu={onContextMenu} />);

      await userEvent.pointer({ keys: '[MouseRight]', target: screen.getByRole('button', { hidden: true }) });
      expect(onContextMenu).toHaveBeenCalled();
    });

    it('should show hover actions on mouse enter', async () => {
      const video = createMockVideo();
      render(<VideoCardEnhanced video={video} {...defaultProps} />);

      const card = screen.getByRole('button', { hidden: true });
      await userEvent.hover(card);

      await waitFor(() => {
        expect(screen.getByTitle('Preview')).toBeInTheDocument();
        expect(screen.getByTitle('Edit')).toBeInTheDocument();
      });
    });

    it('should call onPreview when preview button is clicked', async () => {
      const video = createMockVideo();
      const onPreview = jest.fn();
      render(<VideoCardEnhanced video={video} {...defaultProps} onPreview={onPreview} />);

      const card = screen.getByRole('button', { hidden: true });
      await userEvent.hover(card);

      await waitFor(() => {
        const previewButton = screen.getByTitle('Preview');
        expect(previewButton).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTitle('Preview'));
      expect(onPreview).toHaveBeenCalledWith(video);
    });

    it('should call onEdit when edit button is clicked', async () => {
      const video = createMockVideo();
      const onEdit = jest.fn();
      render(<VideoCardEnhanced video={video} {...defaultProps} onEdit={onEdit} />);

      const card = screen.getByRole('button', { hidden: true });
      await userEvent.hover(card);

      await waitFor(() => {
        const editButton = screen.getByTitle('Edit');
        expect(editButton).toBeInTheDocument();
      });

      await userEvent.click(screen.getByTitle('Edit'));
      expect(onEdit).toHaveBeenCalledWith(video);
    });
  });

  describe('progress display', () => {
    it('should display progress indicator when video is processing', () => {
      const video = createMockVideo({
        status: 'processing',
        progress: {
          percentage: 65,
          stage: 'processing',
          currentOperation: 'Applying filters...',
          estimatedTimeRemaining: 120
        }
      });
      render(<VideoCardEnhanced video={video} {...defaultProps} />);

      expect(screen.getByText('65%')).toBeInTheDocument();
      expect(screen.getByText('Applying filters...')).toBeInTheDocument();
    });

    it('should not show progress when showProgress is false', () => {
      const video = createMockVideo({
        status: 'processing',
        progress: {
          percentage: 65,
          stage: 'processing',
          currentOperation: 'Applying filters...'
        }
      });
      render(<VideoCardEnhanced video={video} {...defaultProps} showProgress={false} />);

      expect(screen.queryByText('65%')).not.toBeInTheDocument();
    });
  });

  describe('view modes', () => {
    it('should render correctly in list view mode', () => {
      const video = createMockVideo();
      render(<VideoCardEnhanced video={video} {...defaultProps} viewMode="list" />);

      // In list view, some elements might be positioned differently
      expect(screen.getByText('Test Video.mp4')).toBeInTheDocument();
      expect(screen.getByText('50.0 MB')).toBeInTheDocument();
    });

    it('should adjust size based on gridSize prop', () => {
      const video = createMockVideo();
      const { rerender } = render(<VideoCardEnhanced video={video} {...defaultProps} gridSize="small" />);

      // Component should render without errors for different grid sizes
      expect(screen.getByText('Test Video.mp4')).toBeInTheDocument();

      rerender(<VideoCardEnhanced video={video} {...defaultProps} gridSize="large" />);
      expect(screen.getByText('Test Video.mp4')).toBeInTheDocument();
    });
  });

  describe('thumbnail carousel', () => {
    it('should display thumbnail carousel when multiple thumbnails available', () => {
      const video = createMockVideo({
        thumbnails: [
          {
            dataUrl: 'data:image/jpeg;base64,thumb1',
            timestamp: 10,
            width: 320,
            height: 180,
            generatedAt: new Date()
          },
          {
            dataUrl: 'data:image/jpeg;base64,thumb2',
            timestamp: 30,
            width: 320,
            height: 180,
            generatedAt: new Date()
          },
          {
            dataUrl: 'data:image/jpeg;base64,thumb3',
            timestamp: 50,
            width: 320,
            height: 180,
            generatedAt: new Date()
          }
        ]
      });
      render(<VideoCardEnhanced video={video} {...defaultProps} />);

      // Thumbnail carousel indicators should be present
      const card = screen.getByRole('button', { hidden: true });
      expect(card).toBeInTheDocument();
    });

    it('should not show carousel for single thumbnail', () => {
      const video = createMockVideo({
        thumbnails: [
          {
            dataUrl: 'data:image/jpeg;base64,singleThumb',
            timestamp: 30,
            width: 320,
            height: 180,
            generatedAt: new Date()
          }
        ]
      });
      render(<VideoCardEnhanced video={video} {...defaultProps} />);

      // Should render normally without carousel
      expect(screen.getByText('Test Video.mp4')).toBeInTheDocument();
    });
  });

  describe('metadata overlay', () => {
    it('should show metadata overlay on hover when showMetadata is true', async () => {
      const video = createMockVideo();
      render(<VideoCardEnhanced video={video} {...defaultProps} />);

      const card = screen.getByRole('button', { hidden: true });
      await userEvent.hover(card);

      // Wait for metadata overlay to appear (with delay)
      await waitFor(() => {
        expect(screen.getByText('1920×1080')).toBeInTheDocument();
        expect(screen.getByText('H264')).toBeInTheDocument();
        expect(screen.getByText('30 FPS')).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should not show metadata overlay when showMetadata is false', async () => {
      const video = createMockVideo();
      render(<VideoCardEnhanced video={video} {...defaultProps} showMetadata={false} />);

      const card = screen.getByRole('button', { hidden: true });
      await userEvent.hover(card);

      // Metadata should not appear even after waiting
      await waitFor(() => {
        expect(screen.queryByText('1920×1080')).not.toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const video = createMockVideo();
      render(<VideoCardEnhanced video={video} {...defaultProps} />);

      const thumbnail = screen.getByRole('img');
      expect(thumbnail).toHaveAttribute('alt', 'Test Video.mp4');
      expect(thumbnail).toHaveAttribute('draggable', 'false');
    });

    it('should handle keyboard navigation', async () => {
      const video = createMockVideo();
      const onSelect = jest.fn();
      render(<VideoCardEnhanced video={video} {...defaultProps} onSelect={onSelect} />);

      const card = screen.getByRole('button', { hidden: true });
      card.focus();

      await userEvent.keyboard('[Enter]');
      expect(onSelect).toHaveBeenCalledWith('test-video-1', false);
    });
  });

  describe('edge cases', () => {
    it('should handle missing metadata gracefully', () => {
      const video = createMockVideo({ metadata: undefined });
      render(<VideoCardEnhanced video={video} {...defaultProps} />);

      expect(screen.getByText('Test Video.mp4')).toBeInTheDocument();
      // Should not crash when metadata is missing
    });

    it('should handle very long file names', () => {
      const video = createMockVideo({
        name: 'This is a very long file name that should be truncated properly to fit within the card boundaries.mp4'
      });
      render(<VideoCardEnhanced video={video} {...defaultProps} />);

      expect(screen.getByText(/This is a very long file name/)).toBeInTheDocument();
    });

    it('should handle custom video names', () => {
      const video = createMockVideo({
        name: 'original-name.mp4',
        customName: 'My Custom Video Name'
      });
      render(<VideoCardEnhanced video={video} {...defaultProps} />);

      expect(screen.getByText('My Custom Video Name')).toBeInTheDocument();
      expect(screen.queryByText('original-name.mp4')).not.toBeInTheDocument();
    });
  });
});