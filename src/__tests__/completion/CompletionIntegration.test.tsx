/**
 * Integration Test Suite for Completion Features
 * Tests the end-to-end flow and integration between components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';

// Components
import ProcessingQueue from '../../components/ProcessingQueue/ProcessingQueue';
import { VideoCardEnhanced } from '../../components/VideoLibrary/VideoCardEnhanced';
import { NotificationProvider, useNotificationHelpers } from '../../components/common/NotificationSystem';
import AIPreviewModal from '../../components/Settings/AIPreviewModal';
import TaskTree from '../../components/TaskTree/TaskTree';

// Store slices
import { processingSlice } from '../../store/slices/processingSlice';
import { videoSlice } from '../../store/slices/videoSlice';
import { settingsSlice } from '../../store/slices/settingsSlice';
import { uiSlice } from '../../store/slices/uiSlice';

// Types
import { ProcessingStatus } from '../../types/video.types';
import { TaskStatus } from '../../types/task.types';
import { VideoFileEnhanced, CompletionMetadata } from '../../types/video-enhanced.types';

// Mock electron API
Object.defineProperty(window, 'electronAPI', {
  value: {
    openFile: jest.fn(),
    revealFile: jest.fn(),
    openFileDialog: jest.fn()
  }
});

const createIntegratedTestData = () => {
  const videoId = 'integrated_test_video';
  const queueItemId = 'queue_integrated_test';
  const treeId = 'tree_integrated_test';
  
  const completionMetadata: CompletionMetadata = {
    processingTime: 240, // 4 minutes
    completedAt: new Date(),
    qualityScore: 94,
    enhancementType: '4x Real-ESRGAN Upscaling',
    enhancementFactor: '4x',
    inputSize: 120 * 1024 * 1024, // 120MB
    outputSize: 180 * 1024 * 1024, // 180MB
    outputPath: '/output/integrated_test_enhanced.mp4',
    avgProcessingSpeed: '1.3x',
    peakMemory: '2.8GB',
    gpuUtilization: '92%',
    efficiency: '96%',
    aiFeatures: {
      upscaling: { enabled: true, factor: 4, model: 'Real-ESRGAN' },
      denoising: { enabled: true, level: 'high' },
      faceEnhancement: { enabled: true, strength: 85 },
      frameInterpolation: { enabled: false, targetFps: 30 }
    }
  };

  const enhancedVideo: VideoFileEnhanced = {
    id: videoId,
    file: new File([''], 'integrated_test.mp4', { type: 'video/mp4' }),
    name: 'Integrated Test Video.mp4',
    path: '/input/integrated_test.mp4',
    originalName: 'integrated_test.mp4',
    status: 'completed',
    enhanced: true,
    completionMetadata,
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: {
      duration: 180, // 3 minutes
      resolution: { width: 1920, height: 1080 },
      frameRate: 30,
      bitrate: 8000,
      codec: 'h264',
      audioTracks: 2,
      format: 'mp4',
      size: 120 * 1024 * 1024,
      aspectRatio: '16:9',
      hasAudio: true
    },
    thumbnail: {
      dataUrl: 'data:image/png;base64,test-thumbnail',
      timestamp: 30,
      width: 320,
      height: 180,
      generatedAt: new Date()
    }
  };

  const completedQueueItem = {
    id: queueItemId,
    videoId,
    videoName: 'Integrated Test Video.mp4',
    inputPath: '/input/integrated_test.mp4',
    outputPath: '/output/integrated_test_enhanced.mp4',
    inputSize: 120 * 1024 * 1024,
    outputSize: 180 * 1024 * 1024,
    duration: 180,
    resolution: '1920x1080',
    status: ProcessingStatus.COMPLETED,
    progress: 100,
    processingTime: 240,
    qualityScore: 94,
    enhancementFactor: '4x',
    avgProcessingSpeed: '1.3x',
    peakMemory: '2.8GB',
    gpuUtilization: '92%',
    efficiency: '96%',
    completedAt: Date.now(),
    effects: [
      { name: 'Real-ESRGAN Upscaling' },
      { name: 'High-Level Denoising' },
      { name: 'Face Enhancement' }
    ]
  };

  const completedTaskTree = {
    id: treeId,
    name: 'Integrated Video Enhancement',
    description: 'Complete enhancement pipeline for integrated test',
    status: TaskStatus.COMPLETED,
    progress: 100,
    total_nodes: 6,
    active_nodes: [],
    completed_nodes: ['analysis', 'preprocessing', 'enhancement', 'encoding', 'validation', 'cleanup'],
    failed_nodes: [],
    critical_path: ['analysis', 'enhancement', 'encoding', 'validation'],
    estimated_duration: 200,
    created_at: new Date('2024-12-06T14:00:00Z'),
    started_at: new Date('2024-12-06T14:01:00Z'),
    completed_at: new Date('2024-12-06T14:05:00Z'),
    root_task_id: 'analysis',
    nodes: {
      analysis: {
        id: 'analysis',
        name: 'Video Analysis',
        description: 'Analyze video properties',
        type: 'PARENT',
        status: TaskStatus.COMPLETED,
        progress: 100,
        stage: 'ANALYSIS',
        parent_id: null,
        sub_tasks: ['preprocessing'],
        estimated_duration: 30,
        remaining_time: 0,
        retry_count: 0,
        max_retries: 3,
        messages: [],
        metrics: { duration: 25000 },
        error: null
      },
      preprocessing: {
        id: 'preprocessing',
        name: 'Preprocessing',
        description: 'Prepare video for enhancement',
        type: 'SUB_TASK',
        status: TaskStatus.COMPLETED,
        progress: 100,
        stage: 'PREPROCESSING',
        parent_id: 'analysis',
        sub_tasks: [],
        estimated_duration: 40,
        remaining_time: 0,
        retry_count: 0,
        max_retries: 3,
        messages: [],
        metrics: { duration: 35000 },
        error: null
      },
      enhancement: {
        id: 'enhancement',
        name: 'AI Enhancement',
        description: 'Apply AI upscaling and enhancement',
        type: 'SUB_TASK',
        status: TaskStatus.COMPLETED,
        progress: 100,
        stage: 'AI_ENHANCEMENT',
        parent_id: null,
        sub_tasks: [],
        estimated_duration: 120,
        remaining_time: 0,
        retry_count: 0,
        max_retries: 3,
        messages: [],
        metrics: { duration: 110000 },
        error: null
      },
      encoding: {
        id: 'encoding',
        name: 'Video Encoding',
        description: 'Encode enhanced video',
        type: 'SUB_TASK',
        status: TaskStatus.COMPLETED,
        progress: 100,
        stage: 'ENCODING',
        parent_id: null,
        sub_tasks: [],
        estimated_duration: 60,
        remaining_time: 0,
        retry_count: 0,
        max_retries: 3,
        messages: [],
        metrics: { duration: 55000 },
        error: null
      },
      validation: {
        id: 'validation',
        name: 'Quality Validation',
        description: 'Validate output quality',
        type: 'SUB_TASK',
        status: TaskStatus.COMPLETED,
        progress: 100,
        stage: 'VALIDATION',
        parent_id: null,
        sub_tasks: [],
        estimated_duration: 20,
        remaining_time: 0,
        retry_count: 0,
        max_retries: 3,
        messages: [],
        metrics: { duration: 18000 },
        error: null
      },
      cleanup: {
        id: 'cleanup',
        name: 'Cleanup',
        description: 'Clean up temporary files',
        type: 'SUB_TASK',
        status: TaskStatus.COMPLETED,
        progress: 100,
        stage: 'CLEANUP',
        parent_id: null,
        sub_tasks: [],
        estimated_duration: 10,
        remaining_time: 0,
        retry_count: 0,
        max_retries: 3,
        messages: [],
        metrics: { duration: 8000 },
        error: null
      }
    }
  };

  return {
    videoId,
    queueItemId,
    treeId,
    enhancedVideo,
    completedQueueItem,
    completedTaskTree
  };
};

const createIntegratedStore = (testData: ReturnType<typeof createIntegratedTestData>) => {
  return configureStore({
    reducer: {
      processing: processingSlice.reducer,
      videos: videoSlice.reducer,
      settings: settingsSlice.reducer,
      ui: uiSlice.reducer
    },
    preloadedState: {
      processing: {
        queue: [testData.completedQueueItem],
        isProcessing: false,
        totalProgress: 100,
        currentItem: null,
        taskTrees: { [testData.treeId]: testData.completedTaskTree },
        taskNodes: testData.completedTaskTree.nodes,
        taskMessages: [],
        activeTaskTrees: [],
        hierarchicalView: true,
        taskFilters: {
          showCompleted: true,
          showFailed: true,
          stageFilter: 'all'
        },
        selectedTaskTreeId: testData.treeId,
        expandedTasks: [],
        currentStages: {},
        stageProgress: {}
      },
      videos: {
        videos: [testData.enhancedVideo],
        selectedVideos: [testData.videoId],
        totalDuration: 180,
        totalSize: 120 * 1024 * 1024
      },
      settings: {
        ai: {
          upscaling: { enabled: true, factor: 4, model: 'Real-ESRGAN' },
          denoising: { enabled: true, level: 'high' },
          faceEnhancement: { enabled: true, strength: 85 },
          frameInterpolation: { enabled: false, targetFps: 30 }
        },
        processing: {
          outputPath: '/output',
          outputFormat: 'mp4'
        }
      },
      ui: {
        notifications: []
      }
    }
  });
};

describe('Completion Features Integration', () => {
  let testData: ReturnType<typeof createIntegratedTestData>;
  let store: ReturnType<typeof createIntegratedStore>;

  beforeEach(() => {
    testData = createIntegratedTestData();
    store = createIntegratedStore(testData);
    jest.clearAllMocks();
  });

  describe('End-to-End Completion Flow', () => {
    it('should display consistent completion data across all components', () => {
      const { rerender } = render(
        <Provider store={store}>
          <NotificationProvider>
            <ProcessingQueue />
          </NotificationProvider>
        </Provider>
      );

      // Check ProcessingQueue completion display
      expect(screen.getByText('🎉')).toBeInTheDocument();
      expect(screen.getByText('Processing Complete!')).toBeInTheDocument();
      expect(screen.getByText('180.0 MB')).toBeInTheDocument(); // Output size
      expect(screen.getByText('4:00')).toBeInTheDocument(); // Processing time
      expect(screen.getByText('94%')).toBeInTheDocument(); // Quality score
      expect(screen.getByText('4x Upscale')).toBeInTheDocument();

      // Rerender with VideoCardEnhanced
      rerender(
        <Provider store={store}>
          <VideoCardEnhanced
            video={testData.enhancedVideo}
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

      // Check VideoCard completion display
      expect(screen.getByText('🚀')).toBeInTheDocument();
      expect(screen.getByText('Enhanced')).toBeInTheDocument();
      expect(screen.getByText('94%')).toBeInTheDocument(); // Same quality score
      expect(screen.getByText('4x Real-ESRGAN Upscaling')).toBeInTheDocument();
      expect(screen.getByText('4m')).toBeInTheDocument(); // Processing time

      // Rerender with TaskTree
      rerender(
        <Provider store={store}>
          <TaskTree treeId={testData.treeId} />
        </Provider>
      );

      // Check TaskTree completion display
      expect(screen.getByText('Task Tree Completed Successfully!')).toBeInTheDocument();
      expect(screen.getByText('Total Tasks')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument(); // total_nodes
      expect(screen.getByText('Total Time')).toBeInTheDocument();
      expect(screen.getByText('4:00')).toBeInTheDocument(); // Tree completion time
      expect(screen.getByText('100%')).toBeInTheDocument(); // Success rate
    });

    it('should handle action button interactions consistently', () => {
      render(
        <Provider store={store}>
          <ProcessingQueue />
        </Provider>
      );

      // Test ProcessingQueue action buttons
      const openButton = screen.getByRole('button', { name: /📂 Open/i });
      const showButton = screen.getByRole('button', { name: /👁️ Show/i });
      const shareButton = screen.getByRole('button', { name: /🔗 Share/i });

      fireEvent.click(openButton);
      expect(window.electronAPI.openFile).toHaveBeenCalledWith('/output/integrated_test_enhanced.mp4');

      fireEvent.click(showButton);
      expect(window.electronAPI.revealFile).toHaveBeenCalledWith('/output/integrated_test_enhanced.mp4');

      fireEvent.click(shareButton);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('/output/integrated_test_enhanced.mp4');
    });

    it('should show completion notification with correct metrics', async () => {
      const TestNotificationTrigger = () => {
        const { showCompletion } = useNotificationHelpers();
        
        React.useEffect(() => {
          showCompletion(testData.enhancedVideo.name, {
            processingTime: testData.completionMetadata?.processingTime,
            outputSize: testData.completionMetadata?.outputSize,
            inputSize: testData.completionMetadata?.inputSize,
            qualityScore: testData.completionMetadata?.qualityScore,
            enhancementType: testData.completionMetadata?.enhancementType
          });
        }, [showCompletion]);

        return null;
      };

      render(
        <NotificationProvider>
          <TestNotificationTrigger />
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('🎉 Integrated Test Video.mp4 Enhanced!')).toBeInTheDocument();
      });

      expect(screen.getByText(/4x Real-ESRGAN Upscaling completed in 4m 0s/)).toBeInTheDocument();
      expect(screen.getByText(/\+50\.0% size/)).toBeInTheDocument(); // Size increase
      expect(screen.getByText(/Quality score: 94%/)).toBeInTheDocument();
    });
  });

  describe('Data Consistency Validation', () => {
    it('should maintain data consistency between ProcessingQueue and Video Library', () => {
      // Extract metrics from both sources
      const queueItem = testData.completedQueueItem;
      const videoMetadata = testData.enhancedVideo.completionMetadata!;

      // Validate key metrics match
      expect(queueItem.qualityScore).toBe(videoMetadata.qualityScore);
      expect(queueItem.processingTime).toBe(videoMetadata.processingTime);
      expect(queueItem.outputSize).toBe(videoMetadata.outputSize);
      expect(queueItem.inputSize).toBe(videoMetadata.inputSize);
      expect(queueItem.outputPath).toBe(videoMetadata.outputPath);
      expect(queueItem.avgProcessingSpeed).toBe(videoMetadata.avgProcessingSpeed);
      expect(queueItem.peakMemory).toBe(videoMetadata.peakMemory);
      expect(queueItem.gpuUtilization).toBe(videoMetadata.gpuUtilization);
      expect(queueItem.efficiency).toBe(videoMetadata.efficiency);
    });

    it('should calculate metrics correctly across components', () => {
      const { processingTime, inputSize, outputSize } = testData.completionMetadata!;
      
      // Processing time formatting should be consistent
      const expectedTimeMinutes = Math.floor(processingTime / 60);
      const expectedTimeSeconds = processingTime % 60;
      const expectedTimeString = `${expectedTimeMinutes}:${expectedTimeSeconds.toString().padStart(2, '0')}`;
      
      expect(expectedTimeString).toBe('4:00');

      // Size change calculation should be consistent
      const sizeChangePercent = ((outputSize - inputSize) / inputSize * 100).toFixed(1);
      expect(sizeChangePercent).toBe('50.0'); // 180MB vs 120MB = 50% increase
    });

    it('should validate task tree metrics align with processing metrics', () => {
      const taskTree = testData.completedTaskTree;
      const videoMetadata = testData.completionMetadata!;

      // Tree completion time should align with video processing time
      const treeStartTime = new Date(taskTree.started_at!).getTime();
      const treeEndTime = new Date(taskTree.completed_at!).getTime();
      const treeDurationSeconds = Math.floor((treeEndTime - treeStartTime) / 1000);
      
      expect(treeDurationSeconds).toBe(240); // 4 minutes = 240 seconds
      expect(treeDurationSeconds).toBe(videoMetadata.processingTime);
    });
  });

  describe('Cross-Component Interactions', () => {
    it('should handle AI Preview Modal integration', () => {
      render(
        <Provider store={store}>
          <AIPreviewModal
            isOpen={true}
            onClose={jest.fn()}
            videoId={testData.videoId}
          />
        </Provider>
      );

      // Should show video info
      expect(screen.getByText('AI Enhancement Preview')).toBeInTheDocument();
      expect(screen.getByText('Integrated Test Video.mp4')).toBeInTheDocument();

      // Should show AI settings that match completion metadata
      expect(screen.getByText('Upscaling:')).toBeInTheDocument();
      expect(screen.getByText('4x (Real-ESRGAN)')).toBeInTheDocument();
      expect(screen.getByText('Denoising:')).toBeInTheDocument();
      expect(screen.getByText('high')).toBeInTheDocument();
      expect(screen.getByText('Face Enhancement:')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
    });

    it('should handle enhanced video card hover actions', () => {
      const { container } = render(
        <Provider store={store}>
          <VideoCardEnhanced
            video={testData.enhancedVideo}
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

      // Simulate hover
      const videoCard = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(videoCard);

      // Should show enhanced-specific actions
      expect(screen.getByRole('button', { name: /Compare enhanced version/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Play enhanced video/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Share enhanced video/i })).toBeInTheDocument();

      // Test play button
      const playButton = screen.getByRole('button', { name: /Play enhanced video/i });
      fireEvent.click(playButton);
      expect(window.electronAPI.openFile).toHaveBeenCalledWith('/output/integrated_test_enhanced.mp4');
    });
  });

  describe('Performance and Error Handling', () => {
    it('should handle partial completion data gracefully', () => {
      const incompleteData = createIntegratedTestData();
      incompleteData.enhancedVideo.completionMetadata = {
        ...incompleteData.enhancedVideo.completionMetadata!,
        avgProcessingSpeed: undefined as any,
        peakMemory: undefined as any,
        gpuUtilization: undefined as any
      };

      const incompleteStore = createIntegratedStore(incompleteData);

      render(
        <Provider store={incompleteStore}>
          <ProcessingQueue />
        </Provider>
      );

      // Should still show completion status
      expect(screen.getByText('Processing Complete!')).toBeInTheDocument();
      expect(screen.getByText('94%')).toBeInTheDocument(); // Quality score should still show
    });

    it('should handle missing task tree data gracefully', () => {
      const dataWithoutTree = createIntegratedTestData();
      const storeWithoutTree = createIntegratedStore(dataWithoutTree);
      
      // Remove task tree from store
      storeWithoutTree.dispatch({
        type: 'processing/clearTaskTrees'
      });

      render(
        <Provider store={storeWithoutTree}>
          <TaskTree treeId={dataWithoutTree.treeId} />
        </Provider>
      );

      expect(screen.getByText('Task tree not found')).toBeInTheDocument();
    });

    it('should maintain performance with large datasets', () => {
      // Create large dataset
      const largeQueue = Array.from({ length: 50 }, (_, i) => ({
        ...testData.completedQueueItem,
        id: `queue_${i}`,
        videoName: `Test Video ${i}.mp4`
      }));

      const largeVideos = Array.from({ length: 50 }, (_, i) => ({
        ...testData.enhancedVideo,
        id: `video_${i}`,
        name: `Test Video ${i}.mp4`
      }));

      const largeStore = configureStore({
        reducer: {
          processing: processingSlice.reducer,
          videos: videoSlice.reducer,
          settings: settingsSlice.reducer,
          ui: uiSlice.reducer
        },
        preloadedState: {
          ...store.getState(),
          processing: {
            ...store.getState().processing,
            queue: largeQueue
          },
          videos: {
            ...store.getState().videos,
            videos: largeVideos
          }
        }
      });

      const startTime = performance.now();
      
      render(
        <Provider store={largeStore}>
          <ProcessingQueue />
        </Provider>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time (less than 2 seconds for large dataset)
      expect(renderTime).toBeLessThan(2000);
      
      // Should show correct counts
      expect(screen.getByText('Showing 50 of 50 items')).toBeInTheDocument();
    });
  });

  describe('State Management Integration', () => {
    it('should properly update state when processing completes', () => {
      // Start with processing state
      const processingStore = configureStore({
        reducer: {
          processing: processingSlice.reducer,
          videos: videoSlice.reducer,
          settings: settingsSlice.reducer,
          ui: uiSlice.reducer
        },
        preloadedState: {
          ...store.getState(),
          processing: {
            ...store.getState().processing,
            isProcessing: true,
            queue: [{
              ...testData.completedQueueItem,
              status: ProcessingStatus.PROCESSING,
              progress: 75
            }]
          }
        }
      });

      const { rerender } = render(
        <Provider store={processingStore}>
          <ProcessingQueue />
        </Provider>
      );

      // Should show processing state
      expect(screen.getByText('⚙️')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();

      // Simulate completion
      processingStore.dispatch({
        type: 'processing/updateQueueItem',
        payload: {
          id: testData.queueItemId,
          updates: {
            status: ProcessingStatus.COMPLETED,
            progress: 100,
            completedAt: Date.now()
          }
        }
      });

      rerender(
        <Provider store={processingStore}>
          <ProcessingQueue />
        </Provider>
      );

      // Should show completed state
      expect(screen.getByText('Processing Complete!')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('Accessibility Integration', () => {
    it('should maintain accessibility across all completion components', () => {
      const { rerender } = render(
        <Provider store={store}>
          <ProcessingQueue />
        </Provider>
      );

      // Check ProcessingQueue accessibility
      let buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('title');
      });

      // Check VideoCard accessibility
      rerender(
        <Provider store={store}>
          <VideoCardEnhanced
            video={testData.enhancedVideo}
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

      // All buttons should be keyboard accessible
      buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).not.toHaveAttribute('tabindex', '-1');
      });

      // Check TaskTree accessibility
      rerender(
        <Provider store={store}>
          <TaskTree treeId={testData.treeId} />
        </Provider>
      );

      expect(screen.getByText('Task Tree Completed Successfully!')).toBeInTheDocument();
      // Task tree should have proper structure for screen readers
      const treeElement = screen.getByText('Integrated Video Enhancement').closest('.task-tree');
      expect(treeElement).toBeInTheDocument();
    });
  });
});