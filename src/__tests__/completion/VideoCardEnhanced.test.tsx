/**
 * Test Suite for Enhanced Video Card Completion Features
 * Tests the enhanced status display and completion metadata
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { VideoCardEnhanced } from '../../components/VideoLibrary/VideoCardEnhanced';
import { VideoFileEnhanced, CompletionMetadata } from '../../types/video-enhanced.types';

// Mock window.electronAPI
Object.defineProperty(window, 'electronAPI', {
  value: {
    openFile: jest.fn(),
    revealFile: jest.fn()
  },
  writable: true
});

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn()
  },
  writable: true
});

const createMockVideo = (overrides = {}): VideoFileEnhanced => ({
  id: 'test_video_123',
  file: new File([''], 'test.mp4', { type: 'video/mp4' }),
  name: 'Test Video.mp4',
  path: '/videos/test.mp4',
  originalName: 'test.mp4',
  status: 'ready',
  enhanced: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  metadata: {
    duration: 120,
    resolution: { width: 1920, height: 1080 },
    frameRate: 30,
    bitrate: 5000,
    codec: 'h264',
    audioTracks: 1,
    format: 'mp4',
    size: 100 * 1024 * 1024,
    aspectRatio: '16:9',
    hasAudio: true
  },
  thumbnail: {
    dataUrl: 'data:image/png;base64,test-thumbnail',
    timestamp: 10,
    width: 320,
    height: 180,
    generatedAt: new Date()
  },
  ...overrides
});

const createEnhancedVideo = (overrides = {}): VideoFileEnhanced => {
  const completionMetadata: CompletionMetadata = {
    processingTime: 180,
    completedAt: new Date(),
    qualityScore: 95,
    enhancementType: '4x AI Upscaling',
    enhancementFactor: '4x',
    inputSize: 100 * 1024 * 1024,
    outputSize: 150 * 1024 * 1024,
    outputPath: '/output/test_enhanced.mp4',
    avgProcessingSpeed: '1.2x',
    peakMemory: '2.1GB',
    gpuUtilization: '89%',
    efficiency: '94%',
    aiFeatures: {
      upscaling: { enabled: true, factor: 4, model: 'Real-ESRGAN' },
      denoising: { enabled: true, level: 'medium' },
      faceEnhancement: { enabled: false, strength: 0 },
      frameInterpolation: { enabled: false, targetFps: 30 }
    }
  };

  return createMockVideo({
    status: 'completed',
    enhanced: true,
    completionMetadata,
    qualityScore: 95,
    ...overrides
  });
};

const defaultProps = {
  isSelected: false,
  viewMode: 'grid' as const,
  gridSize: 'medium' as const,
  showThumbnails: true,
  showMetadata: true,
  showProgress: false,
  onSelect: jest.fn(),
  onDoubleClick: jest.fn(),
  onContextMenu: jest.fn(),
  onPreview: jest.fn(),
  onRemove: jest.fn(),
  onEdit: jest.fn()
};

describe('VideoCardEnhanced Completion Features', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Status Badge Display', () => {
    it('should display standard status badge for regular videos', () => {
      const video = createMockVideo({ status: 'ready' });
      
      render(<VideoCardEnhanced video={video} {...defaultProps} />);
      
      expect(screen.getByText('✅')).toBeInTheDocument();
      expect(screen.getByText('Ready')).toBeInTheDocument();
    });

    it('should display enhanced status badge for enhanced completed videos', () => {
      const video = createEnhancedVideo();
      
      render(<VideoCardEnhanced video={video} {...defaultProps} />);
      
      expect(screen.getByText('🚀')).toBeInTheDocument();
      expect(screen.getByText('Enhanced')).toBeInTheDocument();
    });

    it('should apply gradient background for enhanced status', () => {
      const video = createEnhancedVideo();
      
      const { container } = render(<VideoCardEnhanced video={video} {...defaultProps} />);
      
      const statusBadge = container.querySelector('[style*="linear-gradient"]');
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge).toHaveStyle({
        background: expect.stringContaining('linear-gradient')
      });
    });

    it('should show glow animation for enhanced completed videos', () => {
      const video = createEnhancedVideo();
      
      const { container } = render(<VideoCardEnhanced video={video} {...defaultProps} />);
      
      // Check for completion glow animation
      const styleTag = container.querySelector('style');
      expect(styleTag?.textContent).toContain('completionGlow');
      expect(styleTag?.textContent).toContain('box-shadow');
    });
  });

  describe('Completion Metadata Display', () => {
    it('should display completion metadata for enhanced videos', () => {
      const video = createEnhancedVideo();
      
      render(<VideoCardEnhanced video={video} {...defaultProps} />);
      
      expect(screen.getByText('🚀 Enhanced')).toBeInTheDocument();
      expect(screen.getByText('95%')).toBeInTheDocument(); // Quality score
      expect(screen.getByText('4x AI Upscaling')).toBeInTheDocument();
      expect(screen.getByText('3m')).toBeInTheDocument(); // Processing time
    });

    it('should not display metadata for non-enhanced videos', () => {
      const video = createMockVideo({ status: 'completed', enhanced: false });
      
      render(<VideoCardEnhanced video={video} {...defaultProps} />);
      
      expect(screen.queryByText('🚀 Enhanced')).not.toBeInTheDocument();
      expect(screen.queryByText('4x AI Upscaling')).not.toBeInTheDocument();
    });

    it('should handle missing completion metadata gracefully', () => {
      const video = createMockVideo({ 
        status: 'completed', 
        enhanced: true, 
        completionMetadata: undefined 
      });
      
      render(<VideoCardEnhanced video={video} {...defaultProps} />);
      
      // Should still render video name without errors
      expect(screen.getByText('Test Video.mp4')).toBeInTheDocument();
      expect(screen.queryByText('🚀 Enhanced')).not.toBeInTheDocument();
    });

    it('should format processing time correctly', () => {
      const video = createEnhancedVideo({
        completionMetadata: {
          ...createEnhancedVideo().completionMetadata!,
          processingTime: 3660 // 61 minutes
        }
      });
      
      render(<VideoCardEnhanced video={video} {...defaultProps} />);
      
      expect(screen.getByText('61m')).toBeInTheDocument();
    });
  });

  describe('Hover Actions', () => {
    it('should show standard action buttons on hover', () => {
      const video = createMockVideo();
      
      const { container } = render(<VideoCardEnhanced video={video} {...defaultProps} />);
      
      // Simulate hover
      const videoCard = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(videoCard);
      
      expect(screen.getByRole('button', { name: /Preview/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Edit/i })).toBeInTheDocument();
    });

    it('should show enhanced comparison button for enhanced videos', () => {
      const video = createEnhancedVideo();
      
      const { container } = render(<VideoCardEnhanced video={video} {...defaultProps} />);
      
      // Simulate hover
      const videoCard = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(videoCard);
      
      expect(screen.getByRole('button', { name: /Compare enhanced version/i })).toBeInTheDocument();
      expect(screen.getByText('🚀')).toBeInTheDocument(); // Enhanced comparison button icon
    });

    it('should not show enhanced comparison button for non-enhanced videos', () => {
      const video = createMockVideo({ status: 'completed', enhanced: false });
      
      const { container } = render(<VideoCardEnhanced video={video} {...defaultProps} />);
      
      // Simulate hover
      const videoCard = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(videoCard);
      
      expect(screen.queryByRole('button', { name: /Compare enhanced version/i })).not.toBeInTheDocument();
    });

    it('should log when enhanced comparison button is clicked', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const video = createEnhancedVideo();
      
      const { container } = render(<VideoCardEnhanced video={video} {...defaultProps} />);
      
      // Simulate hover and click
      const videoCard = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(videoCard);
      
      const compareButton = screen.getByRole('button', { name: /Compare enhanced version/i });
      fireEvent.click(compareButton);
      
      expect(consoleSpy).toHaveBeenCalledWith('Opening AI Preview comparison for:', 'Test Video.mp4');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Quick Action Buttons', () => {
    it('should show quick action buttons for enhanced completed videos on hover', () => {
      const video = createEnhancedVideo();
      
      const { container } = render(<VideoCardEnhanced video={video} {...defaultProps} />);
      
      // Simulate hover
      const videoCard = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(videoCard);
      
      expect(screen.getByRole('button', { name: /Play enhanced video/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Share enhanced video/i })).toBeInTheDocument();
      expect(screen.getByText('▶️ Play')).toBeInTheDocument();
      expect(screen.getByText('🔗 Share')).toBeInTheDocument();
    });

    it('should not show quick action buttons for non-enhanced videos', () => {
      const video = createMockVideo({ status: 'completed', enhanced: false });
      
      const { container } = render(<VideoCardEnhanced video={video} {...defaultProps} />);
      
      // Simulate hover
      const videoCard = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(videoCard);
      
      expect(screen.queryByRole('button', { name: /Play enhanced video/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Share enhanced video/i })).not.toBeInTheDocument();
    });

    it('should call electronAPI.openFile when play button is clicked', () => {
      const video = createEnhancedVideo();
      
      const { container } = render(<VideoCardEnhanced video={video} {...defaultProps} />);
      
      // Simulate hover and click play button
      const videoCard = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(videoCard);
      
      const playButton = screen.getByRole('button', { name: /Play enhanced video/i });
      fireEvent.click(playButton);
      
      expect(window.electronAPI.openFile).toHaveBeenCalledWith('/output/test_enhanced.mp4');
    });

    it('should copy to clipboard when share button is clicked', () => {
      const video = createEnhancedVideo();
      
      const { container } = render(<VideoCardEnhanced video={video} {...defaultProps} />);
      
      // Simulate hover and click share button
      const videoCard = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(videoCard);
      
      const shareButton = screen.getByRole('button', { name: /Share enhanced video/i });
      fireEvent.click(shareButton);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('/output/test_enhanced.mp4');
    });

    it('should handle missing output path gracefully', () => {
      const video = createEnhancedVideo({
        completionMetadata: {
          ...createEnhancedVideo().completionMetadata!,
          outputPath: undefined as any
        }
      });
      
      const { container } = render(<VideoCardEnhanced video={video} {...defaultProps} />);
      
      // Simulate hover and click share button
      const videoCard = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(videoCard);
      
      const shareButton = screen.getByRole('button', { name: /Share enhanced video/i });
      fireEvent.click(shareButton);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('');
    });
  });

  describe('Visual Styling', () => {
    it('should apply enhanced completion styling', () => {
      const video = createEnhancedVideo();
      
      const { container } = render(<VideoCardEnhanced video={video} {...defaultProps} />);
      
      // Check for gradient styling in metadata panel
      const metadataPanel = container.querySelector('[style*="linear-gradient"][style*="rgba(116, 97, 239"]');
      expect(metadataPanel).toBeInTheDocument();
      
      // Check for purple theme colors
      expect(container.textContent).toContain('🚀 Enhanced');
    });

    it('should have proper button styling for enhanced actions', () => {
      const video = createEnhancedVideo();
      
      const { container } = render(<VideoCardEnhanced video={video} {...defaultProps} />);
      
      // Simulate hover
      const videoCard = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(videoCard);
      
      const playButton = screen.getByRole('button', { name: /Play enhanced video/i });
      expect(playButton).toHaveStyle({
        background: expect.stringContaining('linear-gradient')
      });
      
      const compareButton = screen.getByRole('button', { name: /Compare enhanced version/i });
      expect(compareButton).toHaveStyle({
        background: expect.stringContaining('linear-gradient')
      });
    });
  });

  describe('Different View Modes', () => {
    it('should work in list view mode', () => {
      const video = createEnhancedVideo();
      
      render(<VideoCardEnhanced video={video} {...defaultProps} viewMode="list" />);
      
      expect(screen.getByText('🚀')).toBeInTheDocument();
      expect(screen.getByText('Enhanced')).toBeInTheDocument();
      expect(screen.getByText('Test Video.mp4')).toBeInTheDocument();
    });

    it('should work in different grid sizes', () => {
      const video = createEnhancedVideo();
      
      ['small', 'medium', 'large'].forEach(size => {
        const { rerender } = render(
          <VideoCardEnhanced 
            video={video} 
            {...defaultProps} 
            gridSize={size as any} 
          />
        );
        
        expect(screen.getByText('Enhanced')).toBeInTheDocument();
        
        rerender(<div />); // Clean up for next iteration
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero processing time', () => {
      const video = createEnhancedVideo({
        completionMetadata: {
          ...createEnhancedVideo().completionMetadata!,
          processingTime: 0
        }
      });
      
      render(<VideoCardEnhanced video={video} {...defaultProps} />);
      
      expect(screen.getByText('0m')).toBeInTheDocument();
    });

    it('should handle very large processing times', () => {
      const video = createEnhancedVideo({
        completionMetadata: {
          ...createEnhancedVideo().completionMetadata!,
          processingTime: 7200 // 2 hours
        }
      });
      
      render(<VideoCardEnhanced video={video} {...defaultProps} />);
      
      expect(screen.getByText('120m')).toBeInTheDocument();
    });

    it('should handle missing quality score', () => {
      const video = createEnhancedVideo({
        completionMetadata: {
          ...createEnhancedVideo().completionMetadata!,
          qualityScore: undefined as any
        }
      });
      
      render(<VideoCardEnhanced video={video} {...defaultProps} />);
      
      // Should use default quality score
      expect(screen.getByText('95%')).toBeInTheDocument();
    });

    it('should handle missing enhancement type', () => {
      const video = createEnhancedVideo({
        completionMetadata: {
          ...createEnhancedVideo().completionMetadata!,
          enhancementType: undefined as any
        }
      });
      
      render(<VideoCardEnhanced video={video} {...defaultProps} />);
      
      // Should use default enhancement type
      expect(screen.getByText('4x Upscale')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper button titles for screen readers', () => {
      const video = createEnhancedVideo();
      
      const { container } = render(<VideoCardEnhanced video={video} {...defaultProps} />);
      
      // Simulate hover
      const videoCard = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(videoCard);
      
      expect(screen.getByRole('button', { name: /Compare enhanced version/i })).toHaveAttribute('title', 'Compare enhanced version');
      expect(screen.getByRole('button', { name: /Play enhanced video/i })).toHaveAttribute('title', 'Play enhanced video');
      expect(screen.getByRole('button', { name: /Share enhanced video/i })).toHaveAttribute('title', 'Share enhanced video');
    });

    it('should support keyboard navigation', () => {
      const video = createEnhancedVideo();
      
      const { container } = render(<VideoCardEnhanced video={video} {...defaultProps} />);
      
      // Simulate hover to show buttons
      const videoCard = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(videoCard);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).not.toHaveAttribute('tabindex', '-1');
      });
    });
  });
});