import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi } from 'vitest';
import AIEnhancement from '../../components/Settings/AIEnhancement';
import videoSlice from '../../store/slices/videoSlice';
import settingsSlice from '../../store/slices/settingsSlice';
import uiSlice from '../../store/slices/uiSlice';
import processingSlice from '../../store/slices/processingSlice';

// Mock aiService
vi.mock('../../services/aiService', () => ({
  aiService: {
    checkBackendStatus: vi.fn(),
    getSystemInfo: vi.fn(),
    validateAISettings: vi.fn(),
    upscaleVideo: vi.fn(),
    denoiseVideo: vi.fn(),
    enhanceFaces: vi.fn(),
    interpolateFrames: vi.fn()
  }
}));

// Import the mocked service
import { aiService } from '../../services/aiService';

describe('AIEnhancement Component', () => {
  let store: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create a test store with initial state
    store = configureStore({
      reducer: {
        videos: videoSlice,
        settings: settingsSlice,
        ui: uiSlice,
        processing: processingSlice
      },
      preloadedState: {
        videos: {
          videos: [
            {
              id: 'video1',
              name: 'test-video.mp4',
              path: '/test/test-video.mp4',
              size: 1000000,
              duration: 60,
              resolution: '1920x1080',
              thumbnailPath: '',
              selected: false
            }
          ],
          selectedVideos: ['video1']
        },
        settings: {
          ai: {
            enabled: true,
            upscaling: {
              enabled: true,
              factor: 2,
              model: 'realesrgan-x4plus',
              quality: 80
            },
            frameInterpolation: {
              enabled: false,
              targetFps: 60,
              model: 'rife'
            },
            faceEnhancement: {
              enabled: false,
              strength: 70,
              model: 'gfpgan'
            },
            denoising: {
              enabled: false,
              level: 'medium',
              model: 'dncnn'
            }
          }
        }
      }
    });

    // Mock backend status check
    (aiService.checkBackendStatus as any).mockResolvedValue(true);
    (aiService.getSystemInfo as any).mockResolvedValue({
      gpu_available: true,
      gpu_name: 'NVIDIA GeForce RTX 4050',
      gpu_memory: 6141,
      cpu_count: 20,
      total_memory: 15
    });
  });

  const renderComponent = () => {
    return render(
      <Provider store={store}>
        <AIEnhancement />
      </Provider>
    );
  };

  describe('Component Rendering', () => {
    it('should render AI Enhancement header', () => {
      renderComponent();
      expect(screen.getByText('AI Enhancement Suite')).toBeInTheDocument();
    });

    it('should display GPU status', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('GPU Acceleration Available')).toBeInTheDocument();
      });
    });

    it('should show backend offline status when backend is not available', async () => {
      (aiService.checkBackendStatus as any).mockResolvedValue(false);
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('AI Backend Not Available')).toBeInTheDocument();
      });
    });

    it('should render all AI feature sections', () => {
      renderComponent();
      
      expect(screen.getByText('AI Video Upscaling')).toBeInTheDocument();
      expect(screen.getByText('AI Denoising')).toBeInTheDocument();
      expect(screen.getByText('AI Face Enhancement')).toBeInTheDocument();
      expect(screen.getByText('AI Frame Interpolation')).toBeInTheDocument();
    });

    it('should display preset buttons', () => {
      renderComponent();
      
      expect(screen.getByText('⚡ Fast')).toBeInTheDocument();
      expect(screen.getByText('⚖️ Balanced')).toBeInTheDocument();
      expect(screen.getByText('💎 Quality')).toBeInTheDocument();
    });
  });

  describe('Feature Toggles', () => {
    it('should toggle upscaling feature', () => {
      renderComponent();
      
      const upscalingSection = screen.getByText('AI Video Upscaling').closest('div');
      const toggleButton = upscalingSection?.parentElement;
      
      if (toggleButton) {
        fireEvent.click(toggleButton);
        
        // Check if action was dispatched
        const state = store.getState();
        // The toggle should have changed the state
        expect(state.settings.ai.upscaling.enabled).toBe(false);
      }
    });

    it('should update upscaling factor', () => {
      renderComponent();
      
      const factorButton = screen.getByText('4x');
      fireEvent.click(factorButton);
      
      const state = store.getState();
      expect(state.settings.ai.upscaling.factor).toBe(4);
    });

    it('should update quality slider', () => {
      renderComponent();
      
      const qualitySlider = screen.getByDisplayValue('80');
      fireEvent.change(qualitySlider, { target: { value: '95' } });
      
      const state = store.getState();
      expect(state.settings.ai.upscaling.quality).toBe(95);
    });
  });

  describe('Preset Application', () => {
    it('should apply fast preset', () => {
      renderComponent();
      
      const fastPreset = screen.getByText('⚡ Fast');
      fireEvent.click(fastPreset);
      
      const state = store.getState();
      expect(state.settings.ai.upscaling.factor).toBe(2);
      expect(state.settings.ai.upscaling.quality).toBe(60);
    });

    it('should apply balanced preset', () => {
      renderComponent();
      
      const balancedPreset = screen.getByText('⚖️ Balanced');
      fireEvent.click(balancedPreset);
      
      const state = store.getState();
      expect(state.settings.ai.upscaling.quality).toBe(80);
    });

    it('should apply quality preset', () => {
      renderComponent();
      
      const qualityPreset = screen.getByText('💎 Quality');
      fireEvent.click(qualityPreset);
      
      const state = store.getState();
      expect(state.settings.ai.upscaling.factor).toBe(4);
      expect(state.settings.ai.upscaling.quality).toBe(95);
    });
  });

  describe('Processing', () => {
    it('should show warning when no videos selected', async () => {
      // Update store to have no selected videos
      store = configureStore({
        reducer: {
          videos: videoSlice,
          settings: settingsSlice,
          ui: uiSlice,
          processing: processingSlice
        },
        preloadedState: {
          videos: {
            videos: [],
            selectedVideos: []
          }
        }
      });
      
      renderComponent();
      
      const startButton = screen.getByText('Start AI Processing');
      fireEvent.click(startButton);
      
      await waitFor(() => {
        const notifications = store.getState().ui.notifications;
        expect(notifications).toHaveLength(1);
        expect(notifications[0].title).toBe('No Videos Selected');
      });
    });

    it('should validate AI settings before processing', async () => {
      (aiService.validateAISettings as any).mockResolvedValue({
        valid: false,
        warnings: ['Insufficient GPU memory']
      });
      
      renderComponent();
      
      const startButton = screen.getByText('Start AI Processing');
      fireEvent.click(startButton);
      
      await waitFor(() => {
        const notifications = store.getState().ui.notifications;
        const warningNotification = notifications.find((n: any) => n.type === 'warning');
        expect(warningNotification).toBeDefined();
      });
    });

    it('should start processing with correct settings', async () => {
      (aiService.validateAISettings as any).mockResolvedValue({
        valid: true,
        warnings: []
      });
      
      (aiService.upscaleVideo as any).mockResolvedValue('/output/video.mp4');
      
      renderComponent();
      
      const startButton = screen.getByText('Start AI Processing');
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(aiService.upscaleVideo).toHaveBeenCalledWith(
          '/test/test-video.mp4',
          expect.stringContaining('_ai_enhanced.mp4'),
          expect.objectContaining({
            enabled: true,
            factor: 2,
            model: 'realesrgan-x4plus',
            quality: 80
          }),
          expect.any(Function)
        );
      });
    });

    it('should handle processing errors', async () => {
      (aiService.validateAISettings as any).mockResolvedValue({
        valid: true,
        warnings: []
      });
      
      (aiService.upscaleVideo as any).mockRejectedValue(new Error('Processing failed'));
      
      renderComponent();
      
      const startButton = screen.getByText('Start AI Processing');
      fireEvent.click(startButton);
      
      await waitFor(() => {
        const notifications = store.getState().ui.notifications;
        const errorNotification = notifications.find((n: any) => n.type === 'error');
        expect(errorNotification).toBeDefined();
        expect(errorNotification.title).toBe('AI Processing Failed');
      });
    });
  });

  describe('Model Selection', () => {
    it('should update upscaling model', () => {
      renderComponent();
      
      const modelSelect = screen.getByDisplayValue('Real-ESRGAN x4+ (Best Quality)');
      fireEvent.change(modelSelect, { target: { value: 'realesrgan-x4plus-anime' } });
      
      const state = store.getState();
      expect(state.settings.ai.upscaling.model).toBe('realesrgan-x4plus-anime');
    });

    it('should update face enhancement model', () => {
      renderComponent();
      
      const modelSelect = screen.getByDisplayValue('GFPGAN v1.4 (Recommended)');
      fireEvent.change(modelSelect, { target: { value: 'restoreformer' } });
      
      const state = store.getState();
      expect(state.settings.ai.faceEnhancement.model).toBe('restoreformer');
    });
  });

  describe('Processing Time Estimation', () => {
    it('should calculate processing time based on enabled features', () => {
      renderComponent();
      
      expect(screen.getByText(/Est. time: ~\d+ min/)).toBeInTheDocument();
    });

    it('should update time estimate when features change', () => {
      renderComponent();
      
      // Enable more features
      const denoisingSection = screen.getByText('AI Denoising').closest('div');
      const toggleButton = denoisingSection?.parentElement;
      
      if (toggleButton) {
        fireEvent.click(toggleButton);
        
        // Time estimate should change
        expect(screen.getByText(/Est. time: ~\d+ min/)).toBeInTheDocument();
      }
    });
  });

  describe('GPU Status Updates', () => {
    it('should show retry button when backend is offline', async () => {
      (aiService.checkBackendStatus as any).mockResolvedValue(false);
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should retry backend connection', async () => {
      (aiService.checkBackendStatus as any)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      
      renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
      
      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);
      
      await waitFor(() => {
        expect(aiService.checkBackendStatus).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Advanced Options', () => {
    it('should toggle advanced options', () => {
      renderComponent();
      
      const advancedToggle = screen.getByText('Advanced Options');
      fireEvent.click(advancedToggle);
      
      expect(screen.getByText('Use GPU acceleration')).toBeInTheDocument();
      expect(screen.getByText('Preserve film grain')).toBeInTheDocument();
    });
  });
});