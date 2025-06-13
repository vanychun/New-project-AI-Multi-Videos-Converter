import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { VideoProcessingJob, BatchProcessingConfig, ProcessingItem, ProcessingStatus } from '../../types/video.types';
import { TaskTree, TaskNode, TaskMessage, TaskEvent, ProcessingStage, TaskStatus } from '../../types/task.types';

export interface ProcessingState {
  jobs: VideoProcessingJob[];
  activeJobs: string[];
  completedJobs: string[];
  failedJobs: string[];
  queue: ProcessingItem[];
  isProcessing: boolean;
  isPaused: boolean;
  batchConfig: BatchProcessingConfig | null;
  totalProgress: number;
  estimatedTimeRemaining: number;
  currentItem: ProcessingItem | null;
  processingStats: {
    totalJobsProcessed: number;
    totalTimeSpent: number;
    averageProcessingTime: number;
    successRate: number;
  };
  systemResources: {
    cpuUsage: number;
    memoryUsage: number;
    gpuUsage: number;
    gpuMemoryUsage: number;
    diskUsage: number;
    temperature: number;
  };
  // Hierarchical task tracking
  taskTrees: Record<string, TaskTree>;
  taskNodes: Record<string, TaskNode>;
  taskMessages: TaskMessage[];
  taskEvents: TaskEvent[];
  activeTaskTrees: string[];
  completedTaskTrees: string[];
  failedTaskTrees: string[];
  currentStages: Record<string, ProcessingStage>; // jobId -> current stage
  stageProgress: Record<string, Record<ProcessingStage, number>>; // jobId -> stage -> progress
  hierarchicalView: boolean;
  selectedTaskTreeId: string | null;
  expandedTasks: string[];
  taskFilters: {
    showCompleted: boolean;
    showFailed: boolean;
    showMessages: boolean;
    stageFilter: ProcessingStage | 'all';
  };
}

const initialState: ProcessingState = {
  jobs: [],
  activeJobs: [],
  completedJobs: [],
  failedJobs: [],
  queue: [],
  isProcessing: false,
  isPaused: false,
  batchConfig: null,
  totalProgress: 0,
  estimatedTimeRemaining: 0,
  currentItem: null,
  processingStats: {
    totalJobsProcessed: 0,
    totalTimeSpent: 0,
    averageProcessingTime: 0,
    successRate: 100,
  },
  systemResources: {
    cpuUsage: 0,
    memoryUsage: 0,
    gpuUsage: 0,
    gpuMemoryUsage: 0,
    diskUsage: 0,
    temperature: 0,
  },
  // Hierarchical task tracking
  taskTrees: {},
  taskNodes: {},
  taskMessages: [],
  taskEvents: [],
  activeTaskTrees: [],
  completedTaskTrees: [],
  failedTaskTrees: [],
  currentStages: {},
  stageProgress: {},
  hierarchicalView: true,
  selectedTaskTreeId: null,
  expandedTasks: [],
  taskFilters: {
    showCompleted: true,
    showFailed: true,
    showMessages: true,
    stageFilter: 'all',
  },
};

const processingSlice = createSlice({
  name: 'processing',
  initialState,
  reducers: {
    addJob: (state, action: PayloadAction<VideoProcessingJob>) => {
      state.jobs.push(action.payload);
    },
    
    addToQueue: (state, action: PayloadAction<ProcessingItem>) => {
      state.queue.push(action.payload);
    },
    
    removeJob: (state, action: PayloadAction<string>) => {
      const jobId = action.payload;
      state.jobs = state.jobs.filter(job => job.id !== jobId);
      state.queue = state.queue.filter(item => item.id !== jobId);
      state.activeJobs = state.activeJobs.filter(id => id !== jobId);
      state.completedJobs = state.completedJobs.filter(id => id !== jobId);
      state.failedJobs = state.failedJobs.filter(id => id !== jobId);
    },
    
    removeFromQueue: (state, action: PayloadAction<string>) => {
      const itemId = action.payload;
      state.queue = state.queue.filter(item => item.id !== itemId);
    },
    
    updateQueueItem: (state, action: PayloadAction<{ id: string; updates: Partial<ProcessingItem> }>) => {
      const { id, updates } = action.payload;
      const item = state.queue.find(item => item.id === id);
      if (item) {
        Object.assign(item, updates);
      }
    },
    
    clearQueue: (state) => {
      state.queue = [];
    },
    
    updateJobStatus: (state, action: PayloadAction<{ 
      jobId: string; 
      status: VideoProcessingJob['status'];
      error?: string;
    }>) => {
      const { jobId, status, error } = action.payload;
      const job = state.jobs.find(j => j.id === jobId);
      
      if (job) {
        job.status = status;
        if (error) job.error = error;
        
        // Update job tracking arrays
        state.activeJobs = state.activeJobs.filter(id => id !== jobId);
        state.completedJobs = state.completedJobs.filter(id => id !== jobId);
        state.failedJobs = state.failedJobs.filter(id => id !== jobId);
        
        switch (status) {
          case 'processing':
            if (!state.activeJobs.includes(jobId)) {
              state.activeJobs.push(jobId);
            }
            job.startTime = Date.now();
            break;
          case 'completed':
            state.completedJobs.push(jobId);
            job.endTime = Date.now();
            state.queue = state.queue.filter(item => item.id !== jobId);
            break;
          case 'error':
            state.failedJobs.push(jobId);
            job.endTime = Date.now();
            state.queue = state.queue.filter(item => item.id !== jobId);
            break;
          case ProcessingStatus.CANCELLED:
            job.endTime = Date.now();
            state.queue = state.queue.filter(item => item.id !== jobId);
            break;
        }
      }
    },
    
    updateJobProgress: (state, action: PayloadAction<{ jobId: string; progress: number }>) => {
      const { jobId, progress } = action.payload;
      const job = state.jobs.find(j => j.id === jobId);
      
      if (job) {
        job.progress = Math.max(0, Math.min(100, progress));
        
        // Update estimated time
        if (job.startTime && progress > 0) {
          const elapsed = Date.now() - job.startTime;
          const estimatedTotal = (elapsed / progress) * 100;
          job.estimatedTime = (estimatedTotal - elapsed) / 1000; // Convert to seconds
        }
      }
      
      // Update total progress
      state.totalProgress = state.jobs.length > 0 
        ? state.jobs.reduce((sum, job) => sum + job.progress, 0) / state.jobs.length 
        : 0;
    },
    
    startProcessing: (state) => {
      state.isProcessing = true;
      state.isPaused = false;
    },
    
    pauseProcessing: (state) => {
      state.isPaused = true;
    },
    
    resumeProcessing: (state) => {
      state.isPaused = false;
    },
    
    stopProcessing: (state) => {
      state.isProcessing = false;
      state.isPaused = false;
      
      // Cancel all active jobs
      state.activeJobs.forEach(jobId => {
        const job = state.jobs.find(j => j.id === jobId);
        if (job) {
          job.status = ProcessingStatus.CANCELLED;
          job.endTime = Date.now();
        }
      });
      
      state.activeJobs = [];
      state.queue = [];
    },
    
    setBatchConfig: (state, action: PayloadAction<BatchProcessingConfig | null>) => {
      state.batchConfig = action.payload;
    },
    
    reorderQueue: (state, action: PayloadAction<{ fromIndex: number; toIndex: number }>) => {
      const { fromIndex, toIndex } = action.payload;
      const [movedJobId] = state.queue.splice(fromIndex, 1);
      state.queue.splice(toIndex, 0, movedJobId);
    },
    
    clearCompletedJobs: (state) => {
      const completedJobIds = state.completedJobs;
      state.jobs = state.jobs.filter(job => !completedJobIds.includes(job.id));
      state.completedJobs = [];
    },
    
    clearFailedJobs: (state) => {
      const failedJobIds = state.failedJobs;
      state.jobs = state.jobs.filter(job => !failedJobIds.includes(job.id));
      state.failedJobs = [];
    },
    
    clearAllJobs: (state) => {
      state.jobs = [];
      state.activeJobs = [];
      state.completedJobs = [];
      state.failedJobs = [];
      state.queue = [];
      state.isProcessing = false;
      state.isPaused = false;
      state.totalProgress = 0;
    },
    
    retryJob: (state, action: PayloadAction<string>) => {
      const jobId = action.payload;
      const job = state.jobs.find(j => j.id === jobId);
      
      if (job && job.status === ProcessingStatus.ERROR) {
        job.status = ProcessingStatus.PENDING;
        job.progress = 0;
        job.error = undefined;
        job.startTime = undefined;
        job.endTime = undefined;
        
        // Move from failed to queue
        state.failedJobs = state.failedJobs.filter(id => id !== jobId);
        const existingItem = state.queue.find(item => item.id === jobId);
        if (!existingItem && job) {
          const processingItem: ProcessingItem = {
            id: jobId,
            videoId: job.videoId,
            videoName: job.videoId,
            status: ProcessingStatus.PENDING,
            progress: 0,
            inputSize: 0,
            totalFrames: 0,
            duration: 0
          };
          state.queue.push(processingItem);
        }
      }
    },
    
    updateSystemResources: (state, action: PayloadAction<Partial<ProcessingState['systemResources']>>) => {
      state.systemResources = { ...state.systemResources, ...action.payload };
    },
    
    updateProcessingStats: (state, action: PayloadAction<Partial<ProcessingState['processingStats']>>) => {
      state.processingStats = { ...state.processingStats, ...action.payload };
    },
    
    calculateEstimatedTime: (state) => {
      const pendingJobs = state.jobs.filter(job => 
        job.status === ProcessingStatus.PENDING || state.queue.some(item => item.id === job.id)
      );
      
      if (pendingJobs.length === 0) {
        state.estimatedTimeRemaining = 0;
        return;
      }
      
      const averageTime = state.processingStats.averageProcessingTime || 60; // Default 1 minute
      const concurrentJobs = Math.min(pendingJobs.length, state.batchConfig?.maxConcurrent || 3);
      
      state.estimatedTimeRemaining = (pendingJobs.length * averageTime) / concurrentJobs;
    },
    
    addBatchJobs: (state, action: PayloadAction<VideoProcessingJob[]>) => {
      const newJobs = action.payload;
      state.jobs.push(...newJobs);
      const processingItems = newJobs.map(job => ({
        id: job.id,
        videoId: job.videoId,
        videoName: job.videoId,
        status: ProcessingStatus.PENDING,
        progress: 0,
        inputSize: 0,
        totalFrames: 0,
        duration: 0
      } as ProcessingItem));
      state.queue.push(...processingItems);
    },
    
    updateJobOutput: (state, action: PayloadAction<{ jobId: string; outputPath: string }>) => {
      const { jobId, outputPath } = action.payload;
      const job = state.jobs.find(j => j.id === jobId);
      
      if (job) {
        job.outputPath = outputPath;
      }
    },
    
    setJobEstimatedTime: (state, action: PayloadAction<{ jobId: string; estimatedTime: number }>) => {
      const { jobId, estimatedTime } = action.payload;
      const job = state.jobs.find(j => j.id === jobId);
      
      if (job) {
        job.estimatedTime = estimatedTime;
      }
    },

    // Hierarchical Task Actions
    addTaskTree: (state, action: PayloadAction<TaskTree>) => {
      const tree = action.payload;
      state.taskTrees[tree.id] = tree;
      
      if (tree.status === TaskStatus.RUNNING) {
        state.activeTaskTrees.push(tree.id);
      }
    },

    updateTaskTree: (state, action: PayloadAction<{ treeId: string; updates: Partial<TaskTree> }>) => {
      const { treeId, updates } = action.payload;
      const tree = state.taskTrees[treeId];
      
      if (tree) {
        Object.assign(tree, updates);
        tree.updated_at = Date.now();

        // Update tree status tracking
        const oldActiveIndex = state.activeTaskTrees.indexOf(treeId);
        const oldCompletedIndex = state.completedTaskTrees.indexOf(treeId);
        const oldFailedIndex = state.failedTaskTrees.indexOf(treeId);

        // Remove from old arrays
        if (oldActiveIndex > -1) state.activeTaskTrees.splice(oldActiveIndex, 1);
        if (oldCompletedIndex > -1) state.completedTaskTrees.splice(oldCompletedIndex, 1);
        if (oldFailedIndex > -1) state.failedTaskTrees.splice(oldFailedIndex, 1);

        // Add to appropriate array based on new status
        if (updates.status === TaskStatus.RUNNING && !state.activeTaskTrees.includes(treeId)) {
          state.activeTaskTrees.push(treeId);
        } else if (updates.status === TaskStatus.COMPLETED && !state.completedTaskTrees.includes(treeId)) {
          state.completedTaskTrees.push(treeId);
        } else if (updates.status === TaskStatus.FAILED && !state.failedTaskTrees.includes(treeId)) {
          state.failedTaskTrees.push(treeId);
        }
      }
    },

    addTaskNode: (state, action: PayloadAction<{ treeId: string; node: TaskNode }>) => {
      const { treeId, node } = action.payload;
      state.taskNodes[node.id] = node;
      
      const tree = state.taskTrees[treeId];
      if (tree) {
        tree.nodes.set(node.id, node);
        tree.total_nodes++;
      }
    },

    updateTaskNode: (state, action: PayloadAction<{ nodeId: string; updates: Partial<TaskNode> }>) => {
      const { nodeId, updates } = action.payload;
      const node = state.taskNodes[nodeId];
      
      if (node) {
        Object.assign(node, updates);
        node.updated_at = Date.now();

        // Update progress tracking
        if (updates.progress !== undefined) {
          const job = state.jobs.find(j => j.task_tree?.root_task_id === node.id);
          if (job && node.stage) {
            if (!state.stageProgress[job.id]) {
              state.stageProgress[job.id] = {} as Record<ProcessingStage, number>;
            }
            state.stageProgress[job.id][node.stage] = updates.progress;
          }
        }

        // Update current stage
        if (updates.status === TaskStatus.RUNNING && node.stage) {
          const job = state.jobs.find(j => j.task_tree?.root_task_id === node.parent_task_id || j.task_tree?.root_task_id === node.id);
          if (job) {
            state.currentStages[job.id] = node.stage;
          }
        }
      }
    },

    addTaskMessage: (state, action: PayloadAction<TaskMessage>) => {
      const message = action.payload;
      state.taskMessages.push(message);
      
      // Add message to task node
      const node = state.taskNodes[message.task_id];
      if (node) {
        node.messages.push(message);
      }

      // Limit message history to prevent memory issues
      if (state.taskMessages.length > 1000) {
        state.taskMessages = state.taskMessages.slice(-500);
      }
    },

    addTaskEvent: (state, action: PayloadAction<TaskEvent>) => {
      const event = action.payload;
      state.taskEvents.push(event);

      // Limit event history
      if (state.taskEvents.length > 1000) {
        state.taskEvents = state.taskEvents.slice(-500);
      }
    },

    toggleTaskExpansion: (state, action: PayloadAction<string>) => {
      const taskId = action.payload;
      const index = state.expandedTasks.indexOf(taskId);
      
      if (index > -1) {
        state.expandedTasks.splice(index, 1);
      } else {
        state.expandedTasks.push(taskId);
      }
    },

    setSelectedTaskTree: (state, action: PayloadAction<string | null>) => {
      state.selectedTaskTreeId = action.payload;
    },

    setHierarchicalView: (state, action: PayloadAction<boolean>) => {
      state.hierarchicalView = action.payload;
    },

    updateTaskFilters: (state, action: PayloadAction<Partial<ProcessingState['taskFilters']>>) => {
      state.taskFilters = { ...state.taskFilters, ...action.payload };
    },

    clearTaskMessages: (state) => {
      state.taskMessages = [];
      Object.values(state.taskNodes).forEach(node => {
        node.messages = [];
      });
    },

    clearTaskEvents: (state) => {
      state.taskEvents = [];
    },

    removeTaskTree: (state, action: PayloadAction<string>) => {
      const treeId = action.payload;
      const tree = state.taskTrees[treeId];
      
      if (tree) {
        // Remove all nodes from this tree
        tree.nodes.forEach((_, nodeId) => {
          delete state.taskNodes[nodeId];
        });
        
        // Remove tree
        delete state.taskTrees[treeId];
        
        // Remove from tracking arrays
        state.activeTaskTrees = state.activeTaskTrees.filter(id => id !== treeId);
        state.completedTaskTrees = state.completedTaskTrees.filter(id => id !== treeId);
        state.failedTaskTrees = state.failedTaskTrees.filter(id => id !== treeId);
        
        // Clear selection if this tree was selected
        if (state.selectedTaskTreeId === treeId) {
          state.selectedTaskTreeId = null;
        }
      }
    },

    pauseTaskTree: (state, action: PayloadAction<string>) => {
      const treeId = action.payload;
      const tree = state.taskTrees[treeId];
      
      if (tree) {
        tree.status = TaskStatus.PAUSED;
        
        // Pause all running nodes in this tree
        tree.nodes.forEach(node => {
          if (node.status === TaskStatus.RUNNING) {
            node.status = TaskStatus.PAUSED;
          }
        });
      }
    },

    resumeTaskTree: (state, action: PayloadAction<string>) => {
      const treeId = action.payload;
      const tree = state.taskTrees[treeId];
      
      if (tree) {
        tree.status = TaskStatus.RUNNING;
        
        // Resume paused nodes in this tree
        tree.nodes.forEach(node => {
          if (node.status === TaskStatus.PAUSED) {
            node.status = TaskStatus.RUNNING;
          }
        });
      }
    },

    cancelTaskTree: (state, action: PayloadAction<string>) => {
      const treeId = action.payload;
      const tree = state.taskTrees[treeId];
      
      if (tree) {
        tree.status = TaskStatus.CANCELLED;
        tree.completed_at = Date.now();
        
        // Cancel all active nodes in this tree
        tree.nodes.forEach(node => {
          if (node.status === TaskStatus.RUNNING || node.status === TaskStatus.PENDING) {
            node.status = TaskStatus.CANCELLED;
            node.completed_at = Date.now();
          }
        });
      }
    },

    updateStageProgress: (state, action: PayloadAction<{ 
      jobId: string; 
      stage: ProcessingStage; 
      progress: number 
    }>) => {
      const { jobId, stage, progress } = action.payload;
      
      if (!state.stageProgress[jobId]) {
        state.stageProgress[jobId] = {} as Record<ProcessingStage, number>;
      }
      
      state.stageProgress[jobId][stage] = progress;
      state.currentStages[jobId] = stage;
    },

    completeStage: (state, action: PayloadAction<{ jobId: string; stage: ProcessingStage }>) => {
      const { jobId, stage } = action.payload;
      
      if (!state.stageProgress[jobId]) {
        state.stageProgress[jobId] = {} as Record<ProcessingStage, number>;
      }
      
      state.stageProgress[jobId][stage] = 100;
      
      // Find job and update completed stages
      const job = state.jobs.find(j => j.id === jobId);
      if (job) {
        if (!job.completed_stages) {
          job.completed_stages = [];
        }
        if (!job.completed_stages.includes(stage)) {
          job.completed_stages.push(stage);
        }
      }
    },
  },
});

export const {
  addJob,
  addToQueue,
  removeJob,
  removeFromQueue,
  updateQueueItem,
  clearQueue,
  updateJobStatus,
  updateJobProgress,
  startProcessing,
  pauseProcessing,
  resumeProcessing,
  stopProcessing,
  setBatchConfig,
  reorderQueue,
  clearCompletedJobs,
  clearFailedJobs,
  clearAllJobs,
  retryJob,
  updateSystemResources,
  updateProcessingStats,
  calculateEstimatedTime,
  addBatchJobs,
  updateJobOutput,
  setJobEstimatedTime,
  // Hierarchical task actions
  addTaskTree,
  updateTaskTree,
  addTaskNode,
  updateTaskNode,
  addTaskMessage,
  addTaskEvent,
  toggleTaskExpansion,
  setSelectedTaskTree,
  setHierarchicalView,
  updateTaskFilters,
  clearTaskMessages,
  clearTaskEvents,
  removeTaskTree,
  pauseTaskTree,
  resumeTaskTree,
  cancelTaskTree,
  updateStageProgress,
  completeStage,
} = processingSlice.actions;

export default processingSlice.reducer;