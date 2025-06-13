/**
 * Test Suite for Notification Helper Functions
 * Tests the specialized notification functions for completion scenarios
 */

import { renderHook, act } from '@testing-library/react';
import { useNotificationHelpers } from '../../components/common/NotificationSystem';

// Mock the notification context
const mockAddNotification = jest.fn();
const mockUpdateNotification = jest.fn();

jest.mock('../../components/common/NotificationSystem', () => ({
  ...jest.requireActual('../../components/common/NotificationSystem'),
  useNotifications: () => ({
    addNotification: mockAddNotification,
    updateNotification: mockUpdateNotification,
    removeNotification: jest.fn(),
    clearAll: jest.fn(),
    notifications: []
  })
}));

describe('Notification Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('showCompletion', () => {
    it('should create completion notification with correct format', () => {
      const { result } = renderHook(() => useNotificationHelpers());
      
      act(() => {
        result.current.showCompletion('Test Video.mp4', {
          processingTime: 180, // 3 minutes
          outputSize: 150 * 1024 * 1024, // 150MB
          inputSize: 100 * 1024 * 1024, // 100MB
          qualityScore: 95,
          enhancementType: '4x AI Upscaling'
        });
      });

      expect(mockAddNotification).toHaveBeenCalledWith({
        type: 'completion',
        title: '🎉 Test Video.mp4 Enhanced!',
        message: '4x AI Upscaling completed in 3m 0s (+50.0% size). Quality score: 95%',
        duration: 10000,
        actions: [
          {
            label: '📂 Open File',
            action: expect.any(Function),
            primary: true
          },
          {
            label: '👁️ Show in Folder',
            action: expect.any(Function)
          }
        ]
      });
    });

    it('should handle missing metrics gracefully', () => {
      const { result } = renderHook(() => useNotificationHelpers());
      
      act(() => {
        result.current.showCompletion('Basic Video.mp4');
      });

      expect(mockAddNotification).toHaveBeenCalledWith({
        type: 'completion',
        title: '🎉 Basic Video.mp4 Enhanced!',
        message: 'Video processing completed. Quality score: 95%',
        duration: 10000,
        actions: expect.any(Array)
      });
    });

    it('should calculate size changes correctly', () => {
      const { result } = renderHook(() => useNotificationHelpers());
      
      // Test size decrease
      act(() => {
        result.current.showCompletion('Compressed Video.mp4', {
          outputSize: 50 * 1024 * 1024, // 50MB
          inputSize: 100 * 1024 * 1024, // 100MB
          qualityScore: 88
        });
      });

      const call = mockAddNotification.mock.calls[0][0];
      expect(call.message).toContain('-50.0% size');
      expect(call.message).toContain('Quality score: 88%');
    });
  });

  describe('showEnhancement', () => {
    it('should create enhancement notification with details', () => {
      const { result } = renderHook(() => useNotificationHelpers());
      
      act(() => {
        result.current.showEnhancement('🚀 AI Enhancement Complete!', {
          enhancementType: 'Real-ESRGAN',
          factor: '4x',
          quality: 95,
          outputPath: '/output/enhanced.mp4'
        });
      });

      expect(mockAddNotification).toHaveBeenCalledWith({
        type: 'enhancement',
        title: '🚀 AI Enhancement Complete!',
        message: 'Real-ESRGAN enhancement complete! 4x upscaling with 95% quality improvement.',
        duration: 12000,
        metadata: {
          enhancementType: 'Real-ESRGAN',
          factor: '4x',
          quality: 95,
          outputPath: '/output/enhanced.mp4'
        },
        actions: [
          {
            label: '🎬 Preview',
            action: expect.any(Function),
            primary: true
          },
          {
            label: '📂 Open',
            action: expect.any(Function)
          }
        ]
      });
    });
  });

  describe('showBatchComplete', () => {
    it('should create batch completion notification', () => {
      const { result } = renderHook(() => useNotificationHelpers());
      
      act(() => {
        result.current.showBatchComplete(8, 10, 600); // 8/10 success in 10 minutes
      });

      expect(mockAddNotification).toHaveBeenCalledWith({
        type: 'completion',
        title: '🎊 Batch Processing Complete!',
        message: '8/10 videos processed successfully (80% success rate) in 10m 0s',
        duration: 15000,
        actions: [
          {
            label: '📂 Open Output Folder',
            action: expect.any(Function),
            primary: true
          },
          {
            label: '📊 View Report',
            action: expect.any(Function)
          }
        ]
      });
    });

    it('should calculate success rate correctly', () => {
      const { result } = renderHook(() => useNotificationHelpers());
      
      act(() => {
        result.current.showBatchComplete(7, 9, 420); // 77.8% success rate
      });

      const call = mockAddNotification.mock.calls[0][0];
      expect(call.message).toContain('(78% success rate)'); // Rounded to nearest percent
    });
  });

  describe('updateProgress', () => {
    it('should update loading notification progress', () => {
      const { result } = renderHook(() => useNotificationHelpers());
      
      act(() => {
        result.current.updateProgress('notification_123', 65, 'Processing frames...');
      });

      expect(mockUpdateNotification).toHaveBeenCalledWith('notification_123', {
        progress: 65,
        title: 'Processing frames...'
      });
    });

    it('should update progress without title', () => {
      const { result } = renderHook(() => useNotificationHelpers());
      
      act(() => {
        result.current.updateProgress('notification_123', 45);
      });

      expect(mockUpdateNotification).toHaveBeenCalledWith('notification_123', {
        progress: 45
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete processing workflow', () => {
      const { result } = renderHook(() => useNotificationHelpers());
      
      // Start loading
      let notificationId: string;
      act(() => {
        notificationId = result.current.showLoading('Processing video...', 'Analyzing input file');
      });

      expect(mockAddNotification).toHaveBeenCalledWith({
        type: 'loading',
        title: 'Processing video...',
        message: 'Analyzing input file',
        persistent: true,
        progress: 0
      });

      // Update progress
      act(() => {
        result.current.updateProgress(notificationId, 50, 'Applying AI enhancement...');
      });

      expect(mockUpdateNotification).toHaveBeenCalledWith(notificationId, {
        progress: 50,
        title: 'Applying AI enhancement...'
      });

      // Show completion
      act(() => {
        result.current.showCompletion('Final Video.mp4', {
          processingTime: 240,
          qualityScore: 92,
          enhancementType: 'Complete Enhancement'
        });
      });

      expect(mockAddNotification).toHaveBeenLastCalledWith(
        expect.objectContaining({
          type: 'completion',
          title: '🎉 Final Video.mp4 Enhanced!'
        })
      );
    });
  });
});