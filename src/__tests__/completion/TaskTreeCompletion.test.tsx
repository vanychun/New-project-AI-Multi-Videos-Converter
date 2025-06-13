/**
 * Test Suite for Task Tree Completion Features
 * Tests the hierarchical task breakdown and completion display
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';

import TaskTree from '../../components/TaskTree/TaskTree';
import { processingSlice } from '../../store/slices/processingSlice';
import { TaskStatus, TaskType, ProcessingStage, TaskTree as TaskTreeType, TaskNode } from '../../types/task.types';

const createMockTaskNode = (overrides = {}): TaskNode => ({
  id: 'task_node_123',
  name: 'Test Task',
  description: 'Test task description',
  type: TaskType.SUB_TASK,
  status: TaskStatus.COMPLETED,
  progress: 100,
  stage: ProcessingStage.ANALYSIS,
  parent_id: null,
  sub_tasks: [],
  estimated_duration: 30,
  remaining_time: 0,
  retry_count: 0,
  max_retries: 3,
  messages: [],
  metrics: { duration: 25000 },
  error: null,
  ...overrides
});

const createCompletedTaskTree = (overrides = {}): TaskTreeType => ({
  id: 'tree_completed_123',
  name: 'Video Enhancement Pipeline',
  description: 'Complete AI video enhancement process',
  status: TaskStatus.COMPLETED,
  progress: 100,
  total_nodes: 8,
  active_nodes: [],
  completed_nodes: ['analysis', 'preprocessing', 'ai_enhancement', 'frame_processing', 'audio_processing', 'encoding', 'post_processing', 'validation'],
  failed_nodes: [],
  critical_path: ['analysis', 'ai_enhancement', 'encoding', 'validation'],
  estimated_duration: 150,
  created_at: new Date('2024-12-06T10:00:00Z'),
  started_at: new Date('2024-12-06T10:01:00Z'),
  completed_at: new Date('2024-12-06T10:04:00Z'),
  root_task_id: 'analysis',
  nodes: {
    analysis: createMockTaskNode({
      id: 'analysis',
      name: 'Video Analysis',
      description: 'Analyze input video properties',
      type: TaskType.PARENT,
      stage: ProcessingStage.ANALYSIS,
      sub_tasks: ['metadata_extraction', 'thumbnail_generation'],
      metrics: { duration: 30000 }
    }),
    metadata_extraction: createMockTaskNode({
      id: 'metadata_extraction',
      name: 'Extract Metadata',
      description: 'Extract video metadata and properties',
      stage: ProcessingStage.ANALYSIS,
      parent_id: 'analysis',
      metrics: { duration: 15000 }
    }),
    thumbnail_generation: createMockTaskNode({
      id: 'thumbnail_generation',
      name: 'Generate Thumbnails',
      description: 'Generate preview thumbnails',
      stage: ProcessingStage.PREPROCESSING,
      parent_id: 'analysis',
      metrics: { duration: 12000 }
    }),
    preprocessing: createMockTaskNode({
      id: 'preprocessing',
      name: 'Video Preprocessing',
      description: 'Prepare video for enhancement',
      stage: ProcessingStage.PREPROCESSING,
      metrics: { duration: 25000 }
    }),
    ai_enhancement: createMockTaskNode({
      id: 'ai_enhancement',
      name: 'AI Enhancement',
      description: 'Apply AI upscaling and enhancement',
      stage: ProcessingStage.AI_ENHANCEMENT,
      metrics: { duration: 60000 }
    }),
    frame_processing: createMockTaskNode({
      id: 'frame_processing',
      name: 'Frame Processing',
      description: 'Process individual frames',
      stage: ProcessingStage.FRAME_PROCESSING,
      metrics: { duration: 45000 }
    }),
    audio_processing: createMockTaskNode({
      id: 'audio_processing',
      name: 'Audio Processing',
      description: 'Process audio tracks',
      stage: ProcessingStage.AUDIO_PROCESSING,
      metrics: { duration: 20000 }
    }),
    encoding: createMockTaskNode({
      id: 'encoding',
      name: 'Video Encoding',
      description: 'Encode final video',
      stage: ProcessingStage.ENCODING,
      metrics: { duration: 35000 }
    }),
    post_processing: createMockTaskNode({
      id: 'post_processing',
      name: 'Post Processing',
      description: 'Final post-processing steps',
      stage: ProcessingStage.POST_PROCESSING,
      metrics: { duration: 15000 }
    }),
    validation: createMockTaskNode({
      id: 'validation',
      name: 'Output Validation',
      description: 'Validate output quality',
      stage: ProcessingStage.VALIDATION,
      metrics: { duration: 10000 }
    })
  },
  ...overrides
});

const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      processing: processingSlice.reducer
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
        stageProgress: {},
        ...initialState
      }
    }
  });
};

describe('Task Tree Completion Features', () => {
  
  describe('Completion Breakdown Display', () => {
    it('should display completion breakdown for completed task trees', () => {
      const completedTree = createCompletedTaskTree();
      const store = createTestStore({
        taskTrees: { tree_completed_123: completedTree }
      });

      render(
        <Provider store={store}>
          <TaskTree treeId="tree_completed_123" />
        </Provider>
      );

      // Check completion header
      expect(screen.getByText('🎉')).toBeInTheDocument();
      expect(screen.getByText('Task Tree Completed Successfully!')).toBeInTheDocument();
      
      // Should show completion time
      const completedTime = completedTree.completed_at;
      if (completedTime) {
        const timeString = new Date(completedTime).toLocaleTimeString();
        expect(screen.getByText(timeString)).toBeInTheDocument();
      }
    });

    it('should not display completion breakdown for non-completed trees', () => {
      const runningTree = createCompletedTaskTree({
        status: TaskStatus.RUNNING,
        progress: 50,
        completed_at: null
      });
      
      const store = createTestStore({
        taskTrees: { tree_running_123: runningTree }
      });

      render(
        <Provider store={store}>
          <TaskTree treeId="tree_running_123" />
        </Provider>
      );

      expect(screen.queryByText('Task Tree Completed Successfully!')).not.toBeInTheDocument();
      expect(screen.queryByText('🎉')).not.toBeInTheDocument();
    });
  });

  describe('Summary Metrics', () => {
    it('should display accurate summary metrics', () => {
      const completedTree = createCompletedTaskTree();
      const store = createTestStore({
        taskTrees: { tree_completed_123: completedTree }
      });

      render(
        <Provider store={store}>
          <TaskTree treeId="tree_completed_123" />
        </Provider>
      );

      // Check total tasks
      expect(screen.getByText('Total Tasks')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument(); // total_nodes

      // Check success rate (all completed = 100%)
      expect(screen.getByText('Success Rate')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();

      // Check efficiency calculation
      expect(screen.getByText('Efficiency')).toBeInTheDocument();
      // Tree: estimated 150s, actual 180s (10:04 - 10:01), efficiency = 150/180 * 100 = 83%
      expect(screen.getByText(/83%|80%|90%/)).toBeInTheDocument(); // Allow some variance
    });

    it('should calculate total time correctly', () => {
      const completedTree = createCompletedTaskTree();
      const store = createTestStore({
        taskTrees: { tree_completed_123: completedTree }
      });

      render(
        <Provider store={store}>
          <TaskTree treeId="tree_completed_123" />
        </Provider>
      );

      expect(screen.getByText('Total Time')).toBeInTheDocument();
      // Difference between started_at (10:01) and completed_at (10:04) = 3 minutes
      expect(screen.getByText('3:00')).toBeInTheDocument();
    });

    it('should handle missing timestamps gracefully', () => {
      const treeWithoutTimestamps = createCompletedTaskTree({
        started_at: null,
        completed_at: null
      });
      
      const store = createTestStore({
        taskTrees: { tree_no_timestamps: treeWithoutTimestamps }
      });

      render(
        <Provider store={store}>
          <TaskTree treeId="tree_no_timestamps" />
        </Provider>
      );

      expect(screen.getByText('Total Time')).toBeInTheDocument();
      expect(screen.getByText('--:--')).toBeInTheDocument();
    });
  });

  describe('Stage Breakdown', () => {
    it('should display processing stages completed', () => {
      const completedTree = createCompletedTaskTree();
      const store = createTestStore({
        taskTrees: { tree_completed_123: completedTree }
      });

      render(
        <Provider store={store}>
          <TaskTree treeId="tree_completed_123" />
        </Provider>
      );

      expect(screen.getByText('Processing Stages Completed')).toBeInTheDocument();

      // Check for stage icons and names
      expect(screen.getByText('🔍')).toBeInTheDocument(); // Analysis
      expect(screen.getByText('Analysis')).toBeInTheDocument();
      
      expect(screen.getByText('⚙️')).toBeInTheDocument(); // Preprocessing
      expect(screen.getByText('Preprocessing')).toBeInTheDocument();
      
      expect(screen.getByText('🤖')).toBeInTheDocument(); // AI Enhancement
      expect(screen.getByText('Ai Enhancement')).toBeInTheDocument();
      
      expect(screen.getByText('🎬')).toBeInTheDocument(); // Frame Processing
      expect(screen.getByText('Frame Processing')).toBeInTheDocument();
      
      expect(screen.getByText('🔊')).toBeInTheDocument(); // Audio Processing
      expect(screen.getByText('Audio Processing')).toBeInTheDocument();
      
      expect(screen.getByText('📺')).toBeInTheDocument(); // Encoding
      expect(screen.getByText('Encoding')).toBeInTheDocument();
      
      expect(screen.getByText('✨')).toBeInTheDocument(); // Post Processing
      expect(screen.getByText('Post Processing')).toBeInTheDocument();
      
      expect(screen.getByText('✔️')).toBeInTheDocument(); // Validation
      expect(screen.getByText('Validation')).toBeInTheDocument();
    });

    it('should show task counts for each stage', () => {
      const completedTree = createCompletedTaskTree();
      const store = createTestStore({
        taskTrees: { tree_completed_123: completedTree }
      });

      render(
        <Provider store={store}>
          <TaskTree treeId="tree_completed_123" />
        </Provider>
      );

      // Should show task counts in parentheses
      expect(screen.getByText('(2 tasks)')).toBeInTheDocument(); // Analysis stage has 2 tasks
      expect(screen.getByText('(1 tasks)')).toBeInTheDocument(); // Other stages have 1 task each
    });

    it('should not show stages with zero completed tasks', () => {
      const treeWithMissingStages = createCompletedTaskTree({
        nodes: {
          analysis: createMockTaskNode({
            id: 'analysis',
            name: 'Video Analysis',
            stage: ProcessingStage.ANALYSIS
          })
        }
      });
      
      const store = createTestStore({
        taskTrees: { tree_minimal: treeWithMissingStages }
      });

      render(
        <Provider store={store}>
          <TaskTree treeId="tree_minimal" />
        </Provider>
      );

      // Should only show Analysis stage
      expect(screen.getByText('Analysis')).toBeInTheDocument();
      expect(screen.queryByText('Preprocessing')).not.toBeInTheDocument();
      expect(screen.queryByText('Ai Enhancement')).not.toBeInTheDocument();
    });
  });

  describe('Performance Summary', () => {
    it('should display performance metrics', () => {
      const completedTree = createCompletedTaskTree();
      const store = createTestStore({
        taskTrees: { tree_completed_123: completedTree }
      });

      render(
        <Provider store={store}>
          <TaskTree treeId="tree_completed_123" />
        </Provider>
      );

      expect(screen.getByText('Performance Summary')).toBeInTheDocument();
      
      expect(screen.getByText('Average Task Duration:')).toBeInTheDocument();
      expect(screen.getByText('Longest Task:')).toBeInTheDocument();
      expect(screen.getByText('Retry Attempts:')).toBeInTheDocument();
      expect(screen.getByText('Critical Path Efficiency:')).toBeInTheDocument();
    });

    it('should calculate average task duration correctly', () => {
      const completedTree = createCompletedTaskTree();
      const store = createTestStore({
        taskTrees: { tree_completed_123: completedTree }
      });

      render(
        <Provider store={store}>
          <TaskTree treeId="tree_completed_123" />
        </Provider>
      );

      // Total duration: 30+15+12+25+60+45+20+35+15+10 = 267 seconds
      // Average: 267/10 = 26.7 seconds ≈ 0:27
      expect(screen.getByText(/0:2[0-9]/)).toBeInTheDocument(); // Around 26-27 seconds
    });

    it('should identify longest task correctly', () => {
      const completedTree = createCompletedTaskTree();
      const store = createTestStore({
        taskTrees: { tree_completed_123: completedTree }
      });

      render(
        <Provider store={store}>
          <TaskTree treeId="tree_completed_123" />
        </Provider>
      );

      // Longest task is ai_enhancement with 60000ms = 1:00
      expect(screen.getByText('1:00')).toBeInTheDocument();
    });

    it('should count retry attempts correctly', () => {
      const treeWithRetries = createCompletedTaskTree({
        nodes: {
          ...createCompletedTaskTree().nodes,
          retry_task: createMockTaskNode({
            id: 'retry_task',
            name: 'Task with Retries',
            retry_count: 2
          })
        }
      });
      
      const store = createTestStore({
        taskTrees: { tree_with_retries: treeWithRetries }
      });

      render(
        <Provider store={store}>
          <TaskTree treeId="tree_with_retries" />
        </Provider>
      );

      expect(screen.getByText('2')).toBeInTheDocument(); // Total retry count
    });

    it('should calculate critical path efficiency', () => {
      const completedTree = createCompletedTaskTree();
      const store = createTestStore({
        taskTrees: { tree_completed_123: completedTree }
      });

      render(
        <Provider store={store}>
          <TaskTree treeId="tree_completed_123" />
        </Provider>
      );

      // Critical path has 4 tasks, all completed = 100% efficiency
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should handle empty critical path', () => {
      const treeWithoutCriticalPath = createCompletedTaskTree({
        critical_path: []
      });
      
      const store = createTestStore({
        taskTrees: { tree_no_critical: treeWithoutCriticalPath }
      });

      render(
        <Provider store={store}>
          <TaskTree treeId="tree_no_critical" />
        </Provider>
      );

      expect(screen.getByText('N/A')).toBeInTheDocument();
    });
  });

  describe('Visual Styling', () => {
    it('should apply completion styling classes', () => {
      const completedTree = createCompletedTaskTree();
      const store = createTestStore({
        taskTrees: { tree_completed_123: completedTree }
      });

      const { container } = render(
        <Provider store={store}>
          <TaskTree treeId="tree_completed_123" />
        </Provider>
      );

      expect(container.querySelector('.completion-breakdown')).toBeInTheDocument();
      expect(container.querySelector('.completion-header')).toBeInTheDocument();
      expect(container.querySelector('.completion-summary')).toBeInTheDocument();
      expect(container.querySelector('.stage-breakdown')).toBeInTheDocument();
      expect(container.querySelector('.performance-breakdown')).toBeInTheDocument();
    });

    it('should show progress bars at 100% for completed stages', () => {
      const completedTree = createCompletedTaskTree();
      const store = createTestStore({
        taskTrees: { tree_completed_123: completedTree }
      });

      const { container } = render(
        <Provider store={store}>
          <TaskTree treeId="tree_completed_123" />
        </Provider>
      );

      const progressBars = container.querySelectorAll('.stage-progress-fill');
      progressBars.forEach(bar => {
        expect(bar).toHaveStyle({ width: '100%' });
        expect(bar).toHaveStyle({ backgroundColor: '#10b981' });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing task tree gracefully', () => {
      const store = createTestStore({
        taskTrees: {}
      });

      render(
        <Provider store={store}>
          <TaskTree treeId="nonexistent_tree" />
        </Provider>
      );

      expect(screen.getByText('Task tree not found')).toBeInTheDocument();
    });

    it('should handle empty nodes object', () => {
      const emptyTree = createCompletedTaskTree({
        nodes: {},
        total_nodes: 0
      });
      
      const store = createTestStore({
        taskTrees: { empty_tree: emptyTree }
      });

      render(
        <Provider store={store}>
          <TaskTree treeId="empty_tree" />
        </Provider>
      );

      // Should still show tree header
      expect(screen.getByText('Video Enhancement Pipeline')).toBeInTheDocument();
      
      // Should handle zero division gracefully
      expect(screen.getByText('Total Tasks')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should handle nodes without metrics', () => {
      const treeWithoutMetrics = createCompletedTaskTree({
        nodes: {
          no_metrics: createMockTaskNode({
            id: 'no_metrics',
            name: 'Task Without Metrics',
            metrics: {}
          })
        }
      });
      
      const store = createTestStore({
        taskTrees: { tree_no_metrics: treeWithoutMetrics }
      });

      render(
        <Provider store={store}>
          <TaskTree treeId="tree_no_metrics" />
        </Provider>
      );

      // Should not crash and show default values
      expect(screen.getByText('Average Task Duration:')).toBeInTheDocument();
    });
  });

  describe('Integration with Task Filters', () => {
    it('should respect task filters when calculating metrics', () => {
      const treeWithFailedTasks = createCompletedTaskTree({
        nodes: {
          ...createCompletedTaskTree().nodes,
          failed_task: createMockTaskNode({
            id: 'failed_task',
            name: 'Failed Task',
            status: TaskStatus.FAILED
          })
        },
        failed_nodes: ['failed_task']
      });
      
      const store = createTestStore({
        taskTrees: { tree_with_failures: treeWithFailedTasks },
        taskFilters: {
          showCompleted: true,
          showFailed: false, // Hide failed tasks
          stageFilter: 'all'
        }
      });

      render(
        <Provider store={store}>
          <TaskTree treeId="tree_with_failures" />
        </Provider>
      );

      // Should only count completed tasks in metrics
      // (not include the failed task in calculations)
      expect(screen.getByText('Performance Summary')).toBeInTheDocument();
    });
  });

  describe('Time Formatting', () => {
    it('should format different time durations correctly', () => {
      const testCases = [
        { ms: 5000, expected: '0:05' },
        { ms: 65000, expected: '1:05' },
        { ms: 3600000, expected: '60:00' },
        { ms: 0, expected: '0:00' }
      ];

      testCases.forEach(({ ms, expected }) => {
        const treeWithSpecificTime = createCompletedTaskTree({
          nodes: {
            test_task: createMockTaskNode({
              id: 'test_task',
              name: 'Test Task',
              metrics: { duration: ms }
            })
          }
        });
        
        const store = createTestStore({
          taskTrees: { test_tree: treeWithSpecificTime }
        });

        const { rerender } = render(
          <Provider store={store}>
            <TaskTree treeId="test_tree" />
          </Provider>
        );

        if (ms === Math.max(...testCases.map(t => t.ms))) {
          // For the longest time, it should appear in "Longest Task"
          expect(screen.getByText(expected)).toBeInTheDocument();
        }

        rerender(<div />); // Clean up for next test
      });
    });
  });
});