/**
 * Test Suite for AI Preview Modal Comparison Features
 * Tests all three comparison modes and enhanced preview functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';

import AIPreviewModal from '../../components/Settings/AIPreviewModal';
import { videoSlice } from '../../store/slices/videoSlice';
import { settingsSlice } from '../../store/slices/settingsSlice';

// Mock getVideoSource helper
jest.mock('../../store/middleware/videoStateMiddleware', () => ({
  getVideoSource: jest.fn((video) => {
    if (video?.id === 'test_video_with_source') {
      return 'blob:test-video-url';
    }
    return null;
  })
}));

const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      videos: videoSlice.reducer,
      settings: settingsSlice.reducer
    },
    preloadedState: {
      videos: {
        videos: [],
        selectedVideos: [],
        totalDuration: 0,
        totalSize: 0
      },
      settings: {
        ai: {
          upscaling: { enabled: true, factor: 4, model: 'Real-ESRGAN' },
          denoising: { enabled: true, level: 'medium' },
          faceEnhancement: { enabled: true, strength: 75 },
          frameInterpolation: { enabled: false, targetFps: 60 }
        }
      },
      ...initialState
    }
  });
};

const mockVideo = {
  id: 'test_video',
  name: 'Test Video.mp4',
  resolution: '1920x1080',
  fps: 30,
  duration: 120,
  thumbnail: 'data:image/png;base64,test-thumbnail'
};

const mockVideoWithSource = {
  id: 'test_video_with_source',
  name: 'Test Video with Source.mp4',
  resolution: '3840x2160',
  fps: 60,
  duration: 180
};

describe('AI Preview Modal', () => {
  
  describe('Modal Rendering', () => {
    it('should render modal when open', () => {
      const store = createTestStore({
        videos: { videos: [mockVideo] }
      });

      render(
        <Provider store={store}>
          <AIPreviewModal 
            isOpen={true} 
            onClose={jest.fn()} 
            videoId="test_video" 
          />
        </Provider>
      );

      expect(screen.getByText('AI Enhancement Preview')).toBeInTheDocument();
      expect(screen.getByText('Test Video.mp4')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      const store = createTestStore({
        videos: { videos: [mockVideo] }
      });

      render(
        <Provider store={store}>
          <AIPreviewModal 
            isOpen={false} 
            onClose={jest.fn()} 
            videoId="test_video" 
          />
        </Provider>
      );

      expect(screen.queryByText('AI Enhancement Preview')).not.toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
      const mockOnClose = jest.fn();
      const store = createTestStore({
        videos: { videos: [mockVideo] }
      });

      render(
        <Provider store={store}>
          <AIPreviewModal 
            isOpen={true} 
            onClose={mockOnClose} 
            videoId="test_video" 
          />
        </Provider>
      );

      fireEvent.click(screen.getByText('✕'));
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Preview Mode Selection', () => {
    it('should display all three mode buttons', () => {
      const store = createTestStore({
        videos: { videos: [mockVideo] }
      });

      render(
        <Provider store={store}>
          <AIPreviewModal 
            isOpen={true} 
            onClose={jest.fn()} 
            videoId="test_video" 
          />
        </Provider>
      );

      expect(screen.getByRole('button', { name: /⬛ Split/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /◧ Side by Side/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /🔄 Toggle/i })).toBeInTheDocument();
    });

    it('should switch to side-by-side mode', () => {
      const store = createTestStore({
        videos: { videos: [mockVideo] }
      });

      render(
        <Provider store={store}>
          <AIPreviewModal 
            isOpen={true} 
            onClose={jest.fn()} 
            videoId="test_video" 
          />
        </Provider>
      );

      fireEvent.click(screen.getByRole('button', { name: /◧ Side by Side/i }));
      
      // Should show VS divider and comparison panels
      expect(screen.getByText('VS')).toBeInTheDocument();
      expect(screen.getByText('📹 Original Version')).toBeInTheDocument();
      expect(screen.getByText('🚀 AI Enhanced Version')).toBeInTheDocument();
    });

    it('should switch to toggle mode', () => {
      const store = createTestStore({
        videos: { videos: [mockVideo] }
      });

      render(
        <Provider store={store}>
          <AIPreviewModal 
            isOpen={true} 
            onClose={jest.fn()} 
            videoId="test_video" 
          />
        </Provider>
      );

      fireEvent.click(screen.getByRole('button', { name: /🔄 Toggle/i }));
      
      // Should show toggle button
      expect(screen.getByRole('button', { name: /Show AI Enhanced/i })).toBeInTheDocument();
    });

    it('should highlight active mode button', () => {
      const store = createTestStore({
        videos: { videos: [mockVideo] }
      });

      render(
        <Provider store={store}>
          <AIPreviewModal 
            isOpen={true} 
            onClose={jest.fn()} 
            videoId="test_video" 
          />
        </Provider>
      );

      const splitButton = screen.getByRole('button', { name: /⬛ Split/i });
      
      // Split should be active by default
      expect(splitButton).toHaveStyle({ background: '#7461ef' });

      // Click side-by-side
      fireEvent.click(screen.getByRole('button', { name: /◧ Side by Side/i }));
      
      const sideButton = screen.getByRole('button', { name: /◧ Side by Side/i });
      expect(sideButton).toHaveStyle({ background: '#7461ef' });
    });
  });

  describe('Split View Mode', () => {
    it('should display split view with both panels', () => {
      const store = createTestStore({
        videos: { videos: [mockVideo] }
      });

      render(
        <Provider store={store}>
          <AIPreviewModal 
            isOpen={true} 
            onClose={jest.fn()} 
            videoId="test_video" 
          />
        </Provider>
      );

      // Should show both labels
      expect(screen.getByText('📹 Original')).toBeInTheDocument();
      expect(screen.getByText('🚀 AI Enhanced')).toBeInTheDocument();
      
      // Should show quality indicators
      expect(screen.getByText('Standard Quality')).toBeInTheDocument();
      expect(screen.getByText('AI Enhanced • 4K')).toBeInTheDocument();
    });

    it('should display interactive split line', () => {
      const store = createTestStore({
        videos: { videos: [mockVideo] }
      });

      const { container } = render(
        <Provider store={store}>
          <AIPreviewModal 
            isOpen={true} 
            onClose={jest.fn()} 
            videoId="test_video" 
          />
        </Provider>
      );

      // Check for split line (gradient with glow animation)
      const splitLine = container.querySelector('[style*="linear-gradient"]');
      expect(splitLine).toBeInTheDocument();
    });
  });

  describe('Side-by-Side Mode', () => {
    it('should display two separate panels with VS divider', () => {
      const store = createTestStore({
        videos: { videos: [mockVideo] }
      });

      render(
        <Provider store={store}>
          <AIPreviewModal 
            isOpen={true} 
            onClose={jest.fn()} 
            videoId="test_video" 
          />
        </Provider>
      );

      fireEvent.click(screen.getByRole('button', { name: /◧ Side by Side/i }));

      // Check for VS divider with animation
      expect(screen.getByText('VS')).toBeInTheDocument();
      
      // Check for individual panel headers
      expect(screen.getByText('📹 Original Version')).toBeInTheDocument();
      expect(screen.getByText('🚀 AI Enhanced Version')).toBeInTheDocument();
      
      // Check for enhancement badges
      expect(screen.getByText('4K UPSCALE')).toBeInTheDocument();
      expect(screen.getByText('AI ENHANCED')).toBeInTheDocument();
    });

    it('should show detailed info panels', () => {
      const store = createTestStore({
        videos: { videos: [mockVideo] }
      });

      render(
        <Provider store={store}>
          <AIPreviewModal 
            isOpen={true} 
            onClose={jest.fn()} 
            videoId="test_video" 
          />
        </Provider>
      );

      fireEvent.click(screen.getByRole('button', { name: /◧ Side by Side/i }));

      // Check original panel info
      expect(screen.getByText('Quality: Standard')).toBeInTheDocument();
      expect(screen.getByText('Resolution: 1920×1080')).toBeInTheDocument();
      
      // Check enhanced panel info
      expect(screen.getByText('Quality: AI Enhanced • 95%')).toBeInTheDocument();
      expect(screen.getByText('Resolution: 3840×2160 (4K)')).toBeInTheDocument();
    });

    it('should have hover effects on panels', () => {
      const store = createTestStore({
        videos: { videos: [mockVideo] }
      });

      const { container } = render(
        <Provider store={store}>
          <AIPreviewModal 
            isOpen={true} 
            onClose={jest.fn()} 
            videoId="test_video" 
          />
        </Provider>
      );

      fireEvent.click(screen.getByRole('button', { name: /◧ Side by Side/i }));

      const panels = container.querySelectorAll('[style*="transition"]');
      expect(panels.length).toBeGreaterThan(0);
    });
  });

  describe('Toggle Mode', () => {
    it('should show original by default in toggle mode', () => {
      const store = createTestStore({
        videos: { videos: [mockVideo] }
      });

      render(
        <Provider store={store}>
          <AIPreviewModal 
            isOpen={true} 
            onClose={jest.fn()} 
            videoId="test_video" 
          />
        </Provider>
      );

      fireEvent.click(screen.getByRole('button', { name: /🔄 Toggle/i }));

      expect(screen.getByText('📹 Original Quality')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Show AI Enhanced/i })).toBeInTheDocument();
    });

    it('should toggle between original and enhanced', () => {
      const store = createTestStore({
        videos: { videos: [mockVideo] }
      });

      render(
        <Provider store={store}>
          <AIPreviewModal 
            isOpen={true} 
            onClose={jest.fn()} 
            videoId="test_video" 
          />
        </Provider>
      );

      fireEvent.click(screen.getByRole('button', { name: /🔄 Toggle/i }));

      // Initially showing original
      expect(screen.getByText('📹 Original Quality')).toBeInTheDocument();
      
      // Click toggle button
      fireEvent.click(screen.getByRole('button', { name: /Show AI Enhanced/i }));
      
      // Should show enhanced
      expect(screen.getByText('🚀 AI Enhanced Quality')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Show Original/i })).toBeInTheDocument();
      
      // Should show enhancement details
      expect(screen.getByText('4X UPSCALE')).toBeInTheDocument();
      expect(screen.getByText('95% QUALITY SCORE')).toBeInTheDocument();
    });

    it('should have animated toggle button', () => {
      const store = createTestStore({
        videos: { videos: [mockVideo] }
      });

      const { container } = render(
        <Provider store={store}>
          <AIPreviewModal 
            isOpen={true} 
            onClose={jest.fn()} 
            videoId="test_video" 
          />
        </Provider>
      );

      fireEvent.click(screen.getByRole('button', { name: /🔄 Toggle/i }));

      const toggleButton = screen.getByRole('button', { name: /Show AI Enhanced/i });
      
      // Should have gradient styling and pulse animation
      expect(toggleButton).toHaveStyle({ background: expect.stringContaining('linear-gradient') });
      
      // Check for pulse animation element
      const pulseElement = container.querySelector('[style*="pulse"]');
      expect(pulseElement).toBeInTheDocument();
    });
  });

  describe('Enhanced Preview Generation', () => {
    it('should generate enhanced preview canvas', async () => {
      const store = createTestStore({
        videos: { videos: [mockVideo] },
        settings: {
          ai: {
            upscaling: { enabled: true, factor: 4, model: 'Real-ESRGAN' },
            denoising: { enabled: true, level: 'high' },
            faceEnhancement: { enabled: true, strength: 80 },
            frameInterpolation: { enabled: true, targetFps: 60 }
          }
        }
      });

      render(
        <Provider store={store}>
          <AIPreviewModal 
            isOpen={true} 
            onClose={jest.fn()} 
            videoId="test_video" 
          />
        </Provider>
      );

      await waitFor(() => {
        // Should show enhanced preview indicators
        expect(screen.getByText('🚀')).toBeInTheDocument();
        expect(screen.getByText('AI Enhanced')).toBeInTheDocument();
      });

      // Should show enabled features
      expect(screen.getByText(/📈 Upscaling 4x/)).toBeInTheDocument();
      expect(screen.getByText(/🎬 Frame Interpolation 60fps/)).toBeInTheDocument();
      expect(screen.getByText(/👤 Face Enhancement 80%/)).toBeInTheDocument();
      expect(screen.getByText(/✨ Denoising \(high\)/)).toBeInTheDocument();
    });

    it('should handle video loading states', async () => {
      const store = createTestStore({
        videos: { videos: [mockVideoWithSource] }
      });

      render(
        <Provider store={store}>
          <AIPreviewModal 
            isOpen={true} 
            onClose={jest.fn()} 
            videoId="test_video_with_source" 
          />
        </Provider>
      );

      // Should show loading state initially
      expect(screen.getByText('Generating AI preview...')).toBeInTheDocument();
      expect(screen.getByText('This may take a few moments')).toBeInTheDocument();

      // Should complete loading
      await waitFor(() => {
        expect(screen.queryByText('Generating AI preview...')).not.toBeInTheDocument();
      });
    });

    it('should create placeholder for videos without source', () => {
      const store = createTestStore({
        videos: { videos: [mockVideo] }
      });

      render(
        <Provider store={store}>
          <AIPreviewModal 
            isOpen={true} 
            onClose={jest.fn()} 
            videoId="test_video" 
          />
        </Provider>
      );

      // Should show placeholder content
      expect(screen.getByText('📁 No video file loaded - Preview mode active')).toBeInTheDocument();
      expect(screen.getByText('1280 × 720 • Placeholder')).toBeInTheDocument();
    });
  });

  describe('Enhancement Info Bar', () => {
    it('should display active AI settings', () => {
      const store = createTestStore({
        videos: { videos: [mockVideo] },
        settings: {
          ai: {
            upscaling: { enabled: true, factor: 4, model: 'Real-ESRGAN' },
            denoising: { enabled: true, level: 'medium' },
            faceEnhancement: { enabled: false, strength: 50 },
            frameInterpolation: { enabled: true, targetFps: 60 }
          }
        }
      });

      render(
        <Provider store={store}>
          <AIPreviewModal 
            isOpen={true} 
            onClose={jest.fn()} 
            videoId="test_video" 
          />
        </Provider>
      );

      // Should show enabled settings
      expect(screen.getByText('Upscaling:')).toBeInTheDocument();
      expect(screen.getByText('4x (Real-ESRGAN)')).toBeInTheDocument();
      expect(screen.getByText('Denoising:')).toBeInTheDocument();
      expect(screen.getByText('medium')).toBeInTheDocument();
      expect(screen.getByText('Frame Interpolation:')).toBeInTheDocument();
      expect(screen.getByText('60 fps')).toBeInTheDocument();
      
      // Should not show disabled settings
      expect(screen.queryByText('Face Enhancement:')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing video gracefully', () => {
      const store = createTestStore({
        videos: { videos: [] }
      });

      render(
        <Provider store={store}>
          <AIPreviewModal 
            isOpen={true} 
            onClose={jest.fn()} 
            videoId="nonexistent_video" 
          />
        </Provider>
      );

      expect(screen.getByText('Select a video to preview AI enhancements')).toBeInTheDocument();
    });

    it('should handle video load errors', async () => {
      // Mock console.warn to avoid test noise
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const store = createTestStore({
        videos: { videos: [mockVideoWithSource] }
      });

      render(
        <Provider store={store}>
          <AIPreviewModal 
            isOpen={true} 
            onClose={jest.fn()} 
            videoId="test_video_with_source" 
          />
        </Provider>
      );

      // Should eventually show preview ready state even if video fails to load
      await waitFor(() => {
        expect(screen.queryByText('Generating AI preview...')).not.toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const store = createTestStore({
        videos: { videos: [mockVideo] }
      });

      render(
        <Provider store={store}>
          <AIPreviewModal 
            isOpen={true} 
            onClose={jest.fn()} 
            videoId="test_video" 
          />
        </Provider>
      );

      // Mode buttons should have descriptive text
      expect(screen.getByRole('button', { name: /Split/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Side by Side/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Toggle/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      const store = createTestStore({
        videos: { videos: [mockVideo] }
      });

      render(
        <Provider store={store}>
          <AIPreviewModal 
            isOpen={true} 
            onClose={jest.fn()} 
            videoId="test_video" 
          />
        </Provider>
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).not.toHaveAttribute('tabindex', '-1');
      });
    });
  });
});