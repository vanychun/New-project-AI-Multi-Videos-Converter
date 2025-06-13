import { 
  TaskTree, 
  TaskNode, 
  TaskStatus, 
  TaskType, 
  ProcessingStage,
  TaskMessage,
  TaskEvent 
} from '../types/task.types';

/**
 * Utility functions for managing task hierarchies
 */

export class TaskHierarchyUtils {
  /**
   * Calculate the overall progress of a task tree
   */
  static calculateTreeProgress(tree: TaskTree): number {
    if (tree.total_nodes === 0) return 0;

    let totalWeight = 0;
    let weightedProgress = 0;

    for (const [_, node] of tree.nodes) {
      const weight = this.getTaskWeight(node);
      totalWeight += weight;
      weightedProgress += (node.progress / 100) * weight;
    }

    return totalWeight > 0 ? (weightedProgress / totalWeight) * 100 : 0;
  }

  /**
   * Get task weight based on type and estimated duration
   */
  static getTaskWeight(task: TaskNode): number {
    const typeWeight = {
      [TaskType.PARENT]: 10,
      [TaskType.SUB_TASK]: 5,
      [TaskType.MICRO_TASK]: 1
    }[task.type] || 1;

    const durationWeight = (task.estimated_duration || 60) / 60; // Normalize to hours
    return typeWeight * Math.max(0.1, durationWeight);
  }

  /**
   * Find critical path in task tree
   */
  static findCriticalPath(tree: TaskTree): string[] {
    const criticalPath: string[] = [];
    let currentTask = tree.nodes.get(tree.root_task_id);
    
    while (currentTask) {
      criticalPath.push(currentTask.id);
      
      // Find longest duration sub-task
      let longestSubTask: TaskNode | undefined;
      let maxDuration = 0;
      
      for (const subTaskId of currentTask.sub_tasks) {
        const subTask = tree.nodes.get(subTaskId);
        if (subTask && (subTask.estimated_duration || 0) > maxDuration) {
          maxDuration = subTask.estimated_duration || 0;
          longestSubTask = subTask;
        }
      }
      
      currentTask = longestSubTask;
    }
    
    return criticalPath;
  }

  /**
   * Identify bottlenecks in task execution
   */
  static identifyBottlenecks(tree: TaskTree): string[] {
    const bottlenecks: string[] = [];
    const avgDuration = this.getAverageDuration(tree);
    
    for (const [nodeId, node] of tree.nodes) {
      // Check if task is significantly slower than average
      if (node.metrics.duration && node.metrics.duration > avgDuration * 2) {
        bottlenecks.push(nodeId);
      }
      
      // Check if task has high error rate
      if (node.retry_count > 2) {
        bottlenecks.push(nodeId);
      }
      
      // Check if task is blocking many dependent tasks
      const dependentTasks = this.getDependentTasks(tree, nodeId);
      if (dependentTasks.length > 3 && node.status !== TaskStatus.COMPLETED) {
        bottlenecks.push(nodeId);
      }
    }
    
    return [...new Set(bottlenecks)]; // Remove duplicates
  }

  /**
   * Get average task duration
   */
  static getAverageDuration(tree: TaskTree): number {
    const completedTasks = Object.values(tree.nodes).filter(
      node => node.status === TaskStatus.COMPLETED && node.metrics.duration
    );
    
    if (completedTasks.length === 0) return 0;
    
    const totalDuration = completedTasks.reduce(
      (sum, task) => sum + (task.metrics.duration || 0), 
      0
    );
    
    return totalDuration / completedTasks.length;
  }

  /**
   * Get tasks that depend on a given task
   */
  static getDependentTasks(tree: TaskTree, taskId: string): TaskNode[] {
    const dependentTasks: TaskNode[] = [];
    
    for (const [_, node] of tree.nodes) {
      if (node.dependencies.depends_on.includes(taskId)) {
        dependentTasks.push(node);
      }
    }
    
    return dependentTasks;
  }

  /**
   * Estimate completion time based on current progress and historical data
   */
  static estimateCompletionTime(tree: TaskTree): number {
    const activeTasks = Object.values(tree.nodes).filter(
      node => node.status === TaskStatus.RUNNING
    );
    
    if (activeTasks.length === 0) return 0;
    
    let totalEstimatedTime = 0;
    
    for (const task of activeTasks) {
      if (task.remaining_time) {
        totalEstimatedTime += task.remaining_time;
      } else if (task.estimated_duration && task.progress > 0) {
        const elapsed = task.metrics.duration || 0;
        const estimatedTotal = (elapsed / task.progress) * 100;
        totalEstimatedTime += Math.max(0, estimatedTotal - elapsed);
      } else {
        // Use default estimate
        totalEstimatedTime += task.estimated_duration || 300; // 5 minutes default
      }
    }
    
    return totalEstimatedTime;
  }

  /**
   * Get task hierarchy depth
   */
  static getTaskDepth(tree: TaskTree, taskId: string): number {
    let depth = 0;
    let currentTask = tree.nodes.get(taskId);
    
    while (currentTask?.parent_task_id) {
      depth++;
      currentTask = tree.nodes.get(currentTask.parent_task_id);
    }
    
    return depth;
  }

  /**
   * Get all leaf tasks (tasks with no sub-tasks)
   */
  static getLeafTasks(tree: TaskTree): TaskNode[] {
    return Object.values(tree.nodes).filter(
      node => node.sub_tasks.length === 0
    );
  }

  /**
   * Get task by stage
   */
  static getTasksByStage(tree: TaskTree, stage: ProcessingStage): TaskNode[] {
    return Object.values(tree.nodes).filter(
      node => node.stage === stage
    );
  }

  /**
   * Check if all dependencies are satisfied
   */
  static areDependenciesSatisfied(tree: TaskTree, taskId: string): boolean {
    const task = tree.nodes.get(taskId);
    if (!task) return false;
    
    return task.dependencies.depends_on.every(depId => {
      const depTask = tree.nodes.get(depId);
      return depTask?.status === TaskStatus.COMPLETED;
    });
  }

  /**
   * Get next available tasks (tasks that can be started)
   */
  static getNextAvailableTasks(tree: TaskTree): TaskNode[] {
    return Object.values(tree.nodes).filter(node => 
      node.status === TaskStatus.PENDING && 
      this.areDependenciesSatisfied(tree, node.id)
    );
  }

  /**
   * Calculate resource utilization
   */
  static calculateResourceUtilization(tree: TaskTree): {
    cpu: number;
    memory: number;
    gpu?: number;
  } {
    const activeTasks = Object.values(tree.nodes).filter(
      node => node.status === TaskStatus.RUNNING
    );
    
    if (activeTasks.length === 0) {
      return { cpu: 0, memory: 0, gpu: 0 };
    }
    
    const totalCpu = activeTasks.reduce((sum, task) => 
      sum + (task.metrics.cpu_usage || 0), 0
    );
    
    const totalMemory = activeTasks.reduce((sum, task) => 
      sum + (task.metrics.memory_usage || 0), 0
    );
    
    const totalGpu = activeTasks.reduce((sum, task) => 
      sum + (task.metrics.gpu_usage || 0), 0
    );
    
    return {
      cpu: totalCpu / activeTasks.length,
      memory: totalMemory / activeTasks.length,
      gpu: totalGpu / activeTasks.length
    };
  }

  /**
   * Generate task performance report
   */
  static generatePerformanceReport(tree: TaskTree): {
    totalDuration: number;
    averageTaskDuration: number;
    fastestTask: TaskNode | null;
    slowestTask: TaskNode | null;
    errorRate: number;
    throughput: number;
  } {
    const completedTasks = Object.values(tree.nodes).filter(
      node => node.status === TaskStatus.COMPLETED
    );
    
    if (completedTasks.length === 0) {
      return {
        totalDuration: 0,
        averageTaskDuration: 0,
        fastestTask: null,
        slowestTask: null,
        errorRate: 0,
        throughput: 0
      };
    }
    
    const totalDuration = tree.completed_at && tree.started_at 
      ? tree.completed_at - tree.started_at 
      : 0;
    
    const taskDurations = completedTasks
      .map(task => task.metrics.duration || 0)
      .filter(duration => duration > 0);
    
    const averageTaskDuration = taskDurations.length > 0
      ? taskDurations.reduce((sum, d) => sum + d, 0) / taskDurations.length
      : 0;
    
    const fastestTask = completedTasks.reduce((fastest, task) => {
      const taskDuration = task.metrics.duration || Infinity;
      const fastestDuration = fastest?.metrics.duration || Infinity;
      return taskDuration < fastestDuration ? task : fastest;
    }, null as TaskNode | null);
    
    const slowestTask = completedTasks.reduce((slowest, task) => {
      const taskDuration = task.metrics.duration || 0;
      const slowestDuration = slowest?.metrics.duration || 0;
      return taskDuration > slowestDuration ? task : slowest;
    }, null as TaskNode | null);
    
    const failedTasks = Object.values(tree.nodes).filter(
      node => node.status === TaskStatus.FAILED
    );
    
    const errorRate = tree.total_nodes > 0 
      ? (failedTasks.length / tree.total_nodes) * 100 
      : 0;
    
    const throughput = totalDuration > 0 
      ? completedTasks.length / (totalDuration / 1000) // tasks per second
      : 0;
    
    return {
      totalDuration,
      averageTaskDuration,
      fastestTask,
      slowestTask,
      errorRate,
      throughput
    };
  }

  /**
   * Filter messages by criteria
   */
  static filterMessages(
    messages: TaskMessage[], 
    filters: {
      type?: string[];
      stage?: ProcessingStage;
      taskId?: string;
      timeRange?: { start: number; end: number };
    }
  ): TaskMessage[] {
    return messages.filter(message => {
      if (filters.type && !filters.type.includes(message.type)) {
        return false;
      }
      
      if (filters.stage && message.stage !== filters.stage) {
        return false;
      }
      
      if (filters.taskId && message.task_id !== filters.taskId) {
        return false;
      }
      
      if (filters.timeRange && (
        message.timestamp < filters.timeRange.start || 
        message.timestamp > filters.timeRange.end
      )) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Export task tree to JSON
   */
  static exportToJSON(tree: TaskTree): string {
    const exportData = {
      tree: {
        id: tree.id,
        name: tree.name,
        description: tree.description,
        status: tree.status,
        progress: tree.progress,
        created_at: tree.created_at,
        started_at: tree.started_at,
        completed_at: tree.completed_at,
        total_nodes: tree.total_nodes,
        critical_path: tree.critical_path
      },
      nodes: Object.values(tree.nodes).map(node => ({
        id: node.id,
        parent_task_id: node.parent_task_id,
        type: node.type,
        name: node.name,
        description: node.description,
        status: node.status,
        priority: node.priority,
        stage: node.stage,
        progress: node.progress,
        created_at: node.created_at,
        started_at: node.started_at,
        completed_at: node.completed_at,
        estimated_duration: node.estimated_duration,
        metrics: node.metrics,
        error: node.error,
        retry_count: node.retry_count
      }))
    };
    
    return JSON.stringify(exportData, null, 2);
  }
}