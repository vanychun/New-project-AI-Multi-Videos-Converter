import { useSelector, useDispatch } from 'react-redux';
import { useCallback, useMemo, useEffect } from 'react';
import { RootState } from '../store/store';
import { 
  addTaskTree,
  updateTaskTree,
  addTaskNode,
  updateTaskNode,
  addTaskMessage,
  addTaskEvent,
  toggleTaskExpansion,
  setSelectedTaskTree,
  removeTaskTree,
  pauseTaskTree,
  resumeTaskTree,
  cancelTaskTree
} from '../store/slices/processingSlice';
import { 
  TaskTree, 
  TaskNode, 
  TaskMessage, 
  TaskEvent, 
  TaskStatus,
  ProcessingStage 
} from '../types/task.types';
import { TaskHierarchyUtils } from '../utils/taskHierarchy';
import { taskManager } from '../services/taskManager';

/**
 * Custom hook for managing task hierarchies
 */
export const useTaskHierarchy = () => {
  const dispatch = useDispatch();
  const {
    taskTrees,
    taskNodes,
    taskMessages,
    taskEvents,
    activeTaskTrees,
    selectedTaskTreeId,
    expandedTasks,
    hierarchicalView,
    taskFilters
  } = useSelector((state: RootState) => state.processing);

  // Subscribe to task manager events
  useEffect(() => {
    const unsubscribe = taskManager.addEventListener((event: TaskEvent) => {
      dispatch(addTaskEvent(event));
      
      // Handle specific event types
      switch (event.event_type) {
        case 'created':
          if (event.data?.tree_name) {
            // New tree created
            const tree = taskManager.getTaskTree(event.task_id);
            if (tree) {
              dispatch(addTaskTree(tree));
            }
          } else {
            // New task created
            const task = taskManager.getTask(event.task_id);
            if (task) {
              // Find which tree this task belongs to
              for (const [treeId, tree] of Object.entries(taskTrees)) {
                if (tree.nodes[task.id]) {
                  dispatch(addTaskNode({ treeId, node: task }));
                  break;
                }
              }
            }
          }
          break;
          
        case 'progress':
          const task = taskManager.getTask(event.task_id);
          if (task) {
            dispatch(updateTaskNode({ 
              nodeId: event.task_id, 
              updates: { 
                progress: task.progress,
                status: task.status,
                remaining_time: task.remaining_time
              }
            }));
          }
          break;
          
        case 'completed':
        case 'failed':
        case 'cancelled':
          const updatedTask = taskManager.getTask(event.task_id);
          if (updatedTask) {
            dispatch(updateTaskNode({
              nodeId: event.task_id,
              updates: {
                status: updatedTask.status,
                progress: updatedTask.progress,
                completed_at: updatedTask.completed_at,
                error: updatedTask.error
              }
            }));
          }
          break;
      }
    });

    return unsubscribe;
  }, [dispatch, taskTrees]);

  // Memoized calculations
  const hierarchyStats = useMemo(() => {
    const stats = {
      totalTrees: Object.keys(taskTrees).length,
      activeTrees: activeTaskTrees.length,
      totalTasks: Object.keys(taskNodes).length,
      runningTasks: Object.values(taskNodes).filter(node => node.status === TaskStatus.RUNNING).length,
      completedTasks: Object.values(taskNodes).filter(node => node.status === TaskStatus.COMPLETED).length,
      failedTasks: Object.values(taskNodes).filter(node => node.status === TaskStatus.FAILED).length,
      totalMessages: taskMessages.length,
      errorMessages: taskMessages.filter(msg => msg.type === 'error').length
    };
    
    return stats;
  }, [taskTrees, activeTaskTrees, taskNodes, taskMessages]);

  // Get filtered task trees
  const getFilteredTrees = useCallback((filters?: {
    status?: TaskStatus;
    includeCompleted?: boolean;
  }) => {
    const trees = Object.values(taskTrees);
    
    if (!filters) return trees;
    
    return trees.filter(tree => {
      if (filters.status && tree.status !== filters.status) return false;
      if (!filters.includeCompleted && tree.status === TaskStatus.COMPLETED) return false;
      return true;
    });
  }, [taskTrees]);

  // Get task tree with computed properties
  const getEnhancedTree = useCallback((treeId: string) => {
    const tree = taskTrees[treeId];
    if (!tree) return null;

    const progress = TaskHierarchyUtils.calculateTreeProgress(tree);
    const criticalPath = TaskHierarchyUtils.findCriticalPath(tree);
    const bottlenecks = TaskHierarchyUtils.identifyBottlenecks(tree);
    const estimatedTime = TaskHierarchyUtils.estimateCompletionTime(tree);
    const resourceUsage = TaskHierarchyUtils.calculateResourceUtilization(tree);
    const performanceReport = TaskHierarchyUtils.generatePerformanceReport(tree);

    return {
      ...tree,
      computed: {
        progress,
        criticalPath,
        bottlenecks,
        estimatedTime,
        resourceUsage,
        performanceReport
      }
    };
  }, [taskTrees]);

  // Get tasks by stage
  const getTasksByStage = useCallback((treeId: string, stage: ProcessingStage) => {
    const tree = taskTrees[treeId];
    if (!tree) return [];
    
    return TaskHierarchyUtils.getTasksByStage(tree, stage);
  }, [taskTrees]);

  // Get filtered messages
  const getFilteredMessages = useCallback((filters: {
    treeId?: string;
    taskId?: string;
    type?: string[];
    stage?: ProcessingStage;
    timeRange?: { start: number; end: number };
  }) => {
    let filteredMessages = taskMessages;

    // Filter by tree
    if (filters.treeId) {
      const tree = taskTrees[filters.treeId];
      if (tree) {
        const treeTaskIds = Object.keys(tree.nodes);
        filteredMessages = filteredMessages.filter(msg => 
          treeTaskIds.includes(msg.task_id) || 
          (msg.parent_task_id && treeTaskIds.includes(msg.parent_task_id))
        );
      }
    }

    return TaskHierarchyUtils.filterMessages(filteredMessages, filters);
  }, [taskMessages, taskTrees]);

  // Create new task tree for video processing
  const createVideoProcessingTree = useCallback(async (
    videoId: string,
    videoName: string,
    processingSettings: any,
    aiSettings?: any
  ) => {
    const treeId = taskManager.createVideoProcessingTaskTree(
      videoId,
      videoName,
      processingSettings,
      aiSettings
    );
    
    const tree = taskManager.getTaskTree(treeId);
    if (tree) {
      dispatch(addTaskTree(tree));
    }
    
    return treeId;
  }, [dispatch]);

  // Task tree actions
  const pauseTree = useCallback((treeId: string) => {
    taskManager.pauseTask(treeId);
    dispatch(pauseTaskTree(treeId));
  }, [dispatch]);

  const resumeTree = useCallback((treeId: string) => {
    taskManager.resumeTask(treeId);
    dispatch(resumeTaskTree(treeId));
  }, [dispatch]);

  const cancelTree = useCallback((treeId: string) => {
    taskManager.cancelTask(treeId);
    dispatch(cancelTaskTree(treeId));
  }, [dispatch]);

  const removeTree = useCallback((treeId: string) => {
    dispatch(removeTaskTree(treeId));
  }, [dispatch]);

  // Task node actions
  const pauseTask = useCallback((taskId: string) => {
    taskManager.pauseTask(taskId);
  }, []);

  const resumeTask = useCallback((taskId: string) => {
    taskManager.resumeTask(taskId);
  }, []);

  const cancelTask = useCallback((taskId: string) => {
    taskManager.cancelTask(taskId);
  }, []);

  const retryTask = useCallback((taskId: string) => {
    taskManager.retryTask(taskId);
  }, []);

  // UI actions
  const toggleExpansion = useCallback((taskId: string) => {
    dispatch(toggleTaskExpansion(taskId));
  }, [dispatch]);

  const selectTree = useCallback((treeId: string | null) => {
    dispatch(setSelectedTaskTree(treeId));
  }, [dispatch]);

  // Add message to task
  const addMessage = useCallback((taskId: string, message: Omit<TaskMessage, 'id' | 'task_id' | 'timestamp'>) => {
    taskManager.addMessage(taskId, message);
  }, []);

  // Export functionality
  const exportTree = useCallback((treeId: string) => {
    const tree = taskTrees[treeId];
    if (!tree) return null;
    
    return TaskHierarchyUtils.exportToJSON(tree);
  }, [taskTrees]);

  // Get next available tasks that can be started
  const getNextAvailableTasks = useCallback((treeId: string) => {
    const tree = taskTrees[treeId];
    if (!tree) return [];
    
    return TaskHierarchyUtils.getNextAvailableTasks(tree);
  }, [taskTrees]);

  // Check if task dependencies are satisfied
  const areDependenciesSatisfied = useCallback((treeId: string, taskId: string) => {
    const tree = taskTrees[treeId];
    if (!tree) return false;
    
    return TaskHierarchyUtils.areDependenciesSatisfied(tree, taskId);
  }, [taskTrees]);

  // Get task depth in hierarchy
  const getTaskDepth = useCallback((treeId: string, taskId: string) => {
    const tree = taskTrees[treeId];
    if (!tree) return 0;
    
    return TaskHierarchyUtils.getTaskDepth(tree, taskId);
  }, [taskTrees]);

  return {
    // State
    taskTrees,
    taskNodes,
    taskMessages,
    taskEvents,
    activeTaskTrees,
    selectedTaskTreeId,
    expandedTasks,
    hierarchicalView,
    taskFilters,
    hierarchyStats,

    // Computed data
    getFilteredTrees,
    getEnhancedTree,
    getTasksByStage,
    getFilteredMessages,
    getNextAvailableTasks,
    getTaskDepth,

    // Tree management
    createVideoProcessingTree,
    pauseTree,
    resumeTree,
    cancelTree,
    removeTree,
    exportTree,

    // Task management
    pauseTask,
    resumeTask,
    cancelTask,
    retryTask,
    addMessage,

    // UI actions
    toggleExpansion,
    selectTree,

    // Utilities
    areDependenciesSatisfied,
  };
};

export default useTaskHierarchy;