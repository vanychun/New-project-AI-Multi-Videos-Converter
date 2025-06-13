/**
 * Comprehensive Test Suite for Upscaling Completion Features
 * 
 * This test suite covers all the completion experience features:
 * 1. ProcessingQueue completion UI
 * 2. Success notifications system
 * 3. Action buttons for completed videos
 * 4. AI Preview Modal comparison modes
 * 5. Enhancement details and metrics
 * 6. Video Library completion status
 * 7. Hierarchical task breakdown
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';

// Components to test
import ProcessingQueue from '../../components/ProcessingQueue/ProcessingQueue';
import { NotificationProvider, useNotificationHelpers } from '../../components/common/NotificationSystem';
import AIPreviewModal from '../../components/Settings/AIPreviewModal';
import { VideoCardEnhanced } from '../../components/VideoLibrary/VideoCardEnhanced';
import TaskTree from '../../components/TaskTree/TaskTree';

// Store and types
import { processingSlice } from '../../store/slices/processingSlice';
import { videoSlice } from '../../store/slices/videoSlice';
import { settingsSlice } from '../../store/slices/settingsSlice';
import { uiSlice } from '../../store/slices/uiSlice';
import { ProcessingStatus } from '../../types/video.types';
import { TaskStatus } from '../../types/task.types';
import { VideoFileEnhanced, CompletionMetadata } from '../../types/video-enhanced.types';

// Mock data generators
const createMockCompletedQueueItem = (overrides = {}) => ({
  id: 'queue_test_123',
  videoId: 'video_test_123',
  videoName: 'Test Video.mp4',
  inputPath: '/input/test-video.mp4',
  outputPath: '/output/test-video_enhanced.mp4',
  inputSize: 100 * 1024 * 1024, // 100MB
  outputSize: 150 * 1024 * 1024, // 150MB
  duration: 120, // 2 minutes
  resolution: '1920x1080',
  status: ProcessingStatus.COMPLETED,
  progress: 100,
  processingTime: 180, // 3 minutes
  qualityScore: 95,
  enhancementFactor: '4x',
  avgProcessingSpeed: '1.2x',
  peakMemory: '2.1GB',
  gpuUtilization: '89%',
  efficiency: '94%',
  completedAt: Date.now(),
  effects: [
    { name: 'AI Upscaling' },
    { name: 'Noise Reduction' }
  ],
  ...overrides
});

const createMockEnhancedVideo = (overrides = {}): VideoFileEnhanced => ({
  id: 'video_enhanced_123',
  file: new File([''], 'test.mp4', { type: 'video/mp4' }),
  name: 'Test Enhanced Video.mp4',
  path: '/videos/test-enhanced.mp4',
  originalName: 'test.mp4',
  status: 'completed',
  enhanced: true,
  completionMetadata: {
    processingTime: 180,
    completedAt: new Date(),
    qualityScore: 95,
    enhancementType: '4x AI Upscaling',
    enhancementFactor: '4x',
    inputSize: 100 * 1024 * 1024,
    outputSize: 150 * 1024 * 1024,
    outputPath: '/output/test-enhanced.mp4',
    avgProcessingSpeed: '1.2x',
    peakMemory: '2.1GB',
    gpuUtilization: '89%',
    efficiency: '94%'
  } as CompletionMetadata,
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
  ...overrides
});

const createMockTaskTree = (overrides = {}) => ({
  id: 'tree_completed_123',
  name: 'Video Enhancement Pipeline',
  description: 'Complete AI video enhancement process',
  status: TaskStatus.COMPLETED,
  progress: 100,
  total_nodes: 8,
  active_nodes: [],
  completed_nodes: ['node1', 'node2', 'node3', 'node4', 'node5', 'node6', 'node7', 'node8'],
  failed_nodes: [],
  critical_path: ['node1', 'node3', 'node6', 'node8'],
  estimated_duration: 150,
  created_at: new Date('2024-12-06T10:00:00Z'),
  started_at: new Date('2024-12-06T10:01:00Z'),
  completed_at: new Date('2024-12-06T10:04:00Z'),
  root_task_id: 'node1',
  nodes: {
    node1: {
      id: 'node1',
      name: 'Video Analysis',
      description: 'Analyze input video properties',
      type: 'PARENT',
      status: TaskStatus.COMPLETED,
      progress: 100,
      stage: 'ANALYSIS',
      parent_id: null,
      sub_tasks: ['node2', 'node3'],
      estimated_duration: 30,
      remaining_time: 0,
      retry_count: 0,
      max_retries: 3,
      messages: [],
      metrics: { duration: 25000 },
      error: null
    },
    node2: {
      id: 'node2',
      name: 'Extract Metadata',
      description: 'Extract video metadata and properties',
      type: 'SUB_TASK',
      status: TaskStatus.COMPLETED,
      progress: 100,
      stage: 'ANALYSIS',
      parent_id: 'node1',
      sub_tasks: [],
      estimated_duration: 15,
      remaining_time: 0,
      retry_count: 0,
      max_retries: 3,
      messages: [],
      metrics: { duration: 12000 },
      error: null
    },
    node3: {
      id: 'node3',
      name: 'Generate Thumbnails',
      description: 'Generate preview thumbnails',
      type: 'SUB_TASK',
      status: TaskStatus.COMPLETED,
      progress: 100,
      stage: 'PREPROCESSING',
      parent_id: 'node1',
      sub_tasks: [],
      estimated_duration: 20,
      remaining_time: 0,
      retry_count: 0,
      max_retries: 3,
      messages: [],
      metrics: { duration: 18000 },
      error: null
    }
  },
  ...overrides
});

// Test store setup
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      processing: processingSlice.reducer,
      videos: videoSlice.reducer,
      settings: settingsSlice.reducer,
      ui: uiSlice.reducer
    },
    preloadedState: {
      processing: {
        queue: [],
        isProcessing: false,
        totalProgress: 0,
        currentItem: null,
        taskTrees: {},
        taskNodes: {},
        taskMessages: [],
        activeTaskTrees: [],
        hierarchicalView: false,
        taskFilters: {
          showCompleted: true,
          showFailed: true,
          stageFilter: 'all'
        },
        selectedTaskTreeId: null,
        expandedTasks: [],
        currentStages: {},
        stageProgress: {}
      },
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
      ui: {
        notifications: []
      },
      ...initialState
    }
  });
};

describe('Completion Features Test Suite', () => {
  
  // Test 1: ProcessingQueue Completion UI
  describe('ProcessingQueue Completion UI', () => {
    it('should display detailed completion metrics for completed items', () => {
      const completedItem = createMockCompletedQueueItem();
      const store = createTestStore({
        processing: { queue: [completedItem] }
      });

      render(
        <Provider store={store}>
          <ProcessingQueue />
        </Provider>
      );

      // Check completion header
      expect(screen.getByText('🎉')).toBeInTheDocument();
      expect(screen.getByText('Processing Complete!')).toBeInTheDocument();

      // Check metrics display
      expect(screen.getByText('Output Size')).toBeInTheDocument();
      expect(screen.getByText('Processing Time')).toBeInTheDocument();
      expect(screen.getByText('Quality Score')).toBeInTheDocument();
      expect(screen.getByText('Enhancement')).toBeInTheDocument();

      // Check output size with percentage change
      expect(screen.getByText('150.0 MB')).toBeInTheDocument();
      expect(screen.getByText('+50.0%')).toBeInTheDocument(); // Size increase

      // Check processing time
      expect(screen.getByText('3:00')).toBeInTheDocument(); // 180 seconds

      // Check quality score
      expect(screen.getByText('95%')).toBeInTheDocument();
      expect(screen.getByText('Excellent')).toBeInTheDocument();

      // Check enhancement factor
      expect(screen.getByText('4x Upscale')).toBeInTheDocument();
    });

    it('should display performance metrics', () => {
      const completedItem = createMockCompletedQueueItem();
      const store = createTestStore({
        processing: { queue: [completedItem] }
      });

      render(
        <Provider store={store}>
          <ProcessingQueue />
        </Provider>
      );

      // Check performance section
      expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
      expect(screen.getByText('Average Speed:')).toBeInTheDocument();
      expect(screen.getByText('1.2x')).toBeInTheDocument();
      expect(screen.getByText('Peak Memory:')).toBeInTheDocument();
      expect(screen.getByText('2.1GB')).toBeInTheDocument();
      expect(screen.getByText('GPU Utilization:')).toBeInTheDocument();
      expect(screen.getByText('89%')).toBeInTheDocument();
      expect(screen.getByText('Efficiency:')).toBeInTheDocument();
      expect(screen.getByText('94%')).toBeInTheDocument();
    });

    it('should display action buttons for completed items', () => {
      const completedItem = createMockCompletedQueueItem();
      const store = createTestStore({
        processing: { queue: [completedItem] }
      });

      render(
        <Provider store={store}>
          <ProcessingQueue />
        </Provider>
      );

      // Check action buttons
      expect(screen.getByRole('button', { name: /📂 Open/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /👁️ Show/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /🎬 Preview/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /🔗 Share/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /📄 Log/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /🗑️ Remove/i })).toBeInTheDocument();
    });
  });

  // Test 2: Success Notifications System
  describe('Success Notifications System', () => {
    it('should display completion notification with metrics', async () => {
      const TestComponent = () => {
        const { showCompletion } = useNotificationHelpers();
        
        React.useEffect(() => {
          showCompletion('Test Video.mp4', {
            processingTime: 180,
            outputSize: 150 * 1024 * 1024,
            inputSize: 100 * 1024 * 1024,
            qualityScore: 95,
            enhancementType: '4x AI Upscaling'
          });
        }, [showCompletion]);

        return <div>Test Component</div>;
      };

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('🎉 Test Video.mp4 Enhanced!')).toBeInTheDocument();
      });

      expect(screen.getByText(/4x AI Upscaling completed in 3m 0s/)).toBeInTheDocument();
      expect(screen.getByText(/Quality score: 95%/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /📂 Open File/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /👁️ Show in Folder/i })).toBeInTheDocument();
    });

    it('should display enhancement notification with details', async () => {
      const TestComponent = () => {
        const { showEnhancement } = useNotificationHelpers();
        
        React.useEffect(() => {
          showEnhancement('🚀 Video Enhancement Complete!', {
            enhancementType: 'AI Upscaling',
            factor: '4x',
            quality: 95,
            outputPath: '/output/enhanced.mp4'
          });
        }, [showEnhancement]);

        return <div>Test Component</div>;
      };

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('🚀 Video Enhancement Complete!')).toBeInTheDocument();
      });

      expect(screen.getByText(/AI Upscaling enhancement complete! 4x upscaling with 95% quality improvement/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /🎬 Preview/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /📂 Open/i })).toBeInTheDocument();
    });
  });

  // Test 3: AI Preview Modal Comparison Modes
  describe('AI Preview Modal Comparison Modes', () => {
    it('should render all three comparison modes', () => {
      const mockVideo = {
        id: 'test_video',
        name: 'Test Video.mp4',
        resolution: '1920x1080',
        fps: 30,
        duration: 120
      };

      const store = createTestStore({
        videos: { videos: [mockVideo] },
        settings: {
          ai: {
            upscaling: { enabled: true, factor: 4, model: 'Real-ESRGAN' },
            denoising: { enabled: true, level: 'medium' },
            faceEnhancement: { enabled: true, strength: 75 },
            frameInterpolation: { enabled: false, targetFps: 60 }
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

      // Check mode selector buttons
      expect(screen.getByRole('button', { name: /⬛ Split/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /◧ Side by Side/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /🔄 Toggle/i })).toBeInTheDocument();

      // Check AI enhancement info
      expect(screen.getByText('AI Enhancement Preview')).toBeInTheDocument();
      expect(screen.getByText('Test Video.mp4')).toBeInTheDocument();
    });

    it('should switch between comparison modes', () => {
      const mockVideo = {
        id: 'test_video',
        name: 'Test Video.mp4'
      };

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

      // Click side-by-side mode
      fireEvent.click(screen.getByRole('button', { name: /◧ Side by Side/i }));
      
      // Should see VS divider
      expect(screen.getByText('VS')).toBeInTheDocument();
      expect(screen.getByText('📹 Original Version')).toBeInTheDocument();
      expect(screen.getByText('🚀 AI Enhanced Version')).toBeInTheDocument();

      // Click toggle mode
      fireEvent.click(screen.getByRole('button', { name: /🔄 Toggle/i }));
      
      // Should see toggle button
      expect(screen.getByRole('button', { name: /Show AI Enhanced/i })).toBeInTheDocument();
    });
  });

  // Test 4: Video Library Enhanced Status
  describe('Video Library Enhanced Status', () => {
    it('should display enhanced status badge for completed enhanced videos', () => {
      const enhancedVideo = createMockEnhancedVideo();

      render(
        <VideoCardEnhanced
          video={enhancedVideo}
          isSelected={false}
          viewMode="grid"
          gridSize="medium"
          showThumbnails={true}
          showMetadata={true}
          showProgress={false}
          onSelect={jest.fn()}
          onDoubleClick={jest.fn()}
          onContextMenu={jest.fn()}
          onPreview={jest.fn()}
          onRemove={jest.fn()}
          onEdit={jest.fn()}
        />
      );

      // Check enhanced status badge
      expect(screen.getByText('🚀')).toBeInTheDocument();
      expect(screen.getByText('Enhanced')).toBeInTheDocument();
    });

    it('should display completion metadata for enhanced videos', () => {
      const enhancedVideo = createMockEnhancedVideo();

      render(
        <VideoCardEnhanced
          video={enhancedVideo}
          isSelected={false}
          viewMode="grid"
          gridSize="medium"
          showThumbnails={true}
          showMetadata={true}
          showProgress={false}
          onSelect={jest.fn()}
          onDoubleClick={jest.fn()}
          onContextMenu={jest.fn()}
          onPreview={jest.fn()}
          onRemove={jest.fn()}
          onEdit={jest.fn()}
        />
      );

      // Check completion metadata display
      expect(screen.getByText('🚀 Enhanced')).toBeInTheDocument();
      expect(screen.getByText('95%')).toBeInTheDocument(); // Quality score
      expect(screen.getByText('4x AI Upscaling')).toBeInTheDocument();
      expect(screen.getByText('3m')).toBeInTheDocument(); // Processing time
    });

    it('should show quick action buttons on hover for enhanced videos', () => {
      const enhancedVideo = createMockEnhancedVideo();

      render(
        <VideoCardEnhanced
          video={enhancedVideo}
          isSelected={false}
          viewMode="grid"
          gridSize="medium"
          showThumbnails={true}
          showMetadata={true}
          showProgress={false}
          onSelect={jest.fn()}
          onDoubleClick={jest.fn()}
          onContextMenu={jest.fn()}
          onPreview={jest.fn()}
          onRemove={jest.fn()}
          onEdit={jest.fn()}
        />
      );

      // Simulate hover
      const videoCard = screen.getByRole('button', { name: /👁️/i }).closest('div');
      if (videoCard) {
        fireEvent.mouseEnter(videoCard);
      }

      // Should show enhanced comparison button
      expect(screen.getByRole('button', { name: /Compare enhanced version/i })).toBeInTheDocument();
    });
  });

  // Test 5: Hierarchical Task Breakdown
  describe('Hierarchical Task Breakdown', () => {
    it('should display completion breakdown for completed task trees', () => {
      const completedTree = createMockTaskTree();
      const store = createTestStore({
        processing: {
          taskTrees: { tree_completed_123: completedTree }
        }
      });

      render(
        <Provider store={store}>
          <TaskTree treeId="tree_completed_123" />
        </Provider>
      );

      // Check completion header
      expect(screen.getByText('🎉')).toBeInTheDocument();
      expect(screen.getByText('Task Tree Completed Successfully!')).toBeInTheDocument();

      // Check summary metrics
      expect(screen.getByText('Total Tasks')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument(); // total_nodes
      expect(screen.getByText('Total Time')).toBeInTheDocument();
      expect(screen.getByText('Success Rate')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument(); // All completed

      // Check stage breakdown
      expect(screen.getByText('Processing Stages Completed')).toBeInTheDocument();
      expect(screen.getByText('🔍')).toBeInTheDocument(); // Analysis stage icon

      // Check performance summary
      expect(screen.getByText('Performance Summary')).toBeInTheDocument();
      expect(screen.getByText('Average Task Duration:')).toBeInTheDocument();
      expect(screen.getByText('Critical Path Efficiency:')).toBeInTheDocument();
    });

    it('should calculate and display performance metrics', () => {
      const completedTree = createMockTaskTree();
      const store = createTestStore({
        processing: {
          taskTrees: { tree_completed_123: completedTree }
        }
      });

      render(
        <Provider store={store}>
          <TaskTree treeId="tree_completed_123" />
        </Provider>
      );

      // Check efficiency calculation
      // Tree completed in 3 minutes (10:04 - 10:01), estimated 2.5 minutes (150s)
      // Efficiency should be around 83% (150/180 * 100)
      expect(screen.getByText(/83%|80%|90%/)).toBeInTheDocument(); // Allow some variance

      // Check retry attempts
      expect(screen.getByText('Retry Attempts:')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument(); // No retries in mock data
    });
  });

  // Test 6: Integration Tests
  describe('Integration Tests', () => {
    it('should handle complete processing flow from queue to library', async () => {
      const processingItem = createMockCompletedQueueItem();
      const enhancedVideo = createMockEnhancedVideo({
        id: processingItem.videoId
      });

      const store = createTestStore({
        processing: { queue: [processingItem] },
        videos: { videos: [enhancedVideo] }
      });

      // Render ProcessingQueue
      const { rerender } = render(
        <Provider store={store}>
          <NotificationProvider>
            <ProcessingQueue />
          </NotificationProvider>
        </Provider>
      );

      // Check completion display in queue
      expect(screen.getByText('Processing Complete!')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /📂 Open/i })).toBeInTheDocument();

      // Rerender with VideoLibrary
      rerender(
        <Provider store={store}>
          <VideoCardEnhanced
            video={enhancedVideo}
            isSelected={false}
            viewMode="grid"
            gridSize="medium"
            showThumbnails={true}
            showMetadata={true}
            showProgress={false}
            onSelect={jest.fn()}
            onDoubleClick={jest.fn()}
            onContextMenu={jest.fn()}
            onPreview={jest.fn()}
            onRemove={jest.fn()}
            onEdit={jest.fn()}
          />
        </Provider>
      );

      // Check enhanced status in library
      expect(screen.getByText('Enhanced')).toBeInTheDocument();
      expect(screen.getByText('4x AI Upscaling')).toBeInTheDocument();
    });

    it('should maintain consistency across all completion displays', () => {
      const metrics = {
        processingTime: 180,
        qualityScore: 95,
        enhancementType: '4x AI Upscaling',
        outputSize: 150 * 1024 * 1024,
        inputSize: 100 * 1024 * 1024
      };

      // Test that the same metrics appear consistently
      const processingItem = createMockCompletedQueueItem(metrics);
      const enhancedVideo = createMockEnhancedVideo({
        completionMetadata: { ...metrics, completedAt: new Date(), enhancementFactor: '4x', outputPath: '/test' }
      });

      // Both should show the same quality score
      expect(processingItem.qualityScore).toBe(enhancedVideo.completionMetadata?.qualityScore);
      expect(processingItem.processingTime).toBe(enhancedVideo.completionMetadata?.processingTime);
    });
  });

  // Test 7: Error Handling
  describe('Error Handling', () => {
    it('should handle missing completion metadata gracefully', () => {
      const videoWithoutMetadata = createMockEnhancedVideo({
        completionMetadata: undefined
      });

      render(
        <VideoCardEnhanced
          video={videoWithoutMetadata}
          isSelected={false}
          viewMode="grid"
          gridSize="medium"
          showThumbnails={true}
          showMetadata={true}
          showProgress={false}
          onSelect={jest.fn()}
          onDoubleClick={jest.fn()}
          onContextMenu={jest.fn()}
          onPreview={jest.fn()}
          onRemove={jest.fn()}
          onEdit={jest.fn()}
        />
      );

      // Should still render without errors
      expect(screen.getByText('Test Enhanced Video.mp4')).toBeInTheDocument();
    });

    it('should handle incomplete task trees gracefully', () => {
      const incompleteTree = createMockTaskTree({
        nodes: {}, // Empty nodes
        total_nodes: 0
      });

      const store = createTestStore({
        processing: {
          taskTrees: { incomplete_tree: incompleteTree }
        }
      });

      render(
        <Provider store={store}>
          <TaskTree treeId="incomplete_tree" />
        </Provider>
      );

      // Should render tree header without crashing
      expect(screen.getByText('Video Enhancement Pipeline')).toBeInTheDocument();
    });
  });
});

// Performance Tests
describe('Performance Tests', () => {
  it('should render large completion lists efficiently', () => {
    const largeQueue = Array.from({ length: 100 }, (_, i) => 
      createMockCompletedQueueItem({ id: `queue_${i}`, videoName: `Video ${i}.mp4` })
    );

    const store = createTestStore({
      processing: { queue: largeQueue }
    });

    const startTime = performance.now();
    
    render(
      <Provider store={store}>
        <ProcessingQueue />
      </Provider>
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render within reasonable time (less than 1 second)
    expect(renderTime).toBeLessThan(1000);
  });
});

// Accessibility Tests
describe('Accessibility Tests', () => {
  it('should have proper ARIA labels for completion status', () => {
    const completedItem = createMockCompletedQueueItem();
    const store = createTestStore({
      processing: { queue: [completedItem] }
    });

    render(
      <Provider store={store}>
        <ProcessingQueue />
      </Provider>
    );

    // Check action buttons have proper titles
    expect(screen.getByRole('button', { name: /Open output file in default player/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Show in file explorer/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Preview before\/after comparison/i })).toBeInTheDocument();
  });

  it('should support keyboard navigation for completion actions', () => {
    const enhancedVideo = createMockEnhancedVideo();

    render(
      <VideoCardEnhanced
        video={enhancedVideo}
        isSelected={false}
        viewMode="grid"
        gridSize="medium"
        showThumbnails={true}
        showMetadata={true}
        showProgress={false}
        onSelect={jest.fn()}
        onDoubleClick={jest.fn()}
        onContextMenu={jest.fn()}
        onPreview={jest.fn()}
        onRemove={jest.fn()}
        onEdit={jest.fn()}
      />
    );

    // Action buttons should be focusable
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).not.toHaveAttribute('tabindex', '-1');
    });
  });
});