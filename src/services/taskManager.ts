import { 
  TaskNode, 
  TaskTree, 
  TaskMessage, 
  TaskType, 
  TaskStatus, 
  TaskPriority, 
  ProcessingStage,
  TaskCreationPayload,
  TaskUpdatePayload,
  TaskEvent,
  TaskExecution,
  TaskConfiguration,
  VideoProcessingTaskData,
  AIProcessingTaskData
} from '../types/task.types';

export class TaskManager {
  private taskTrees: Map<string, TaskTree> = new Map();
  private taskNodes: Map<string, TaskNode> = new Map();
  private activeExecutions: Map<string, TaskExecution> = new Map();
  private messageQueue: TaskMessage[] = [];
  private eventHistory: TaskEvent[] = [];
  private listeners: Array<(event: TaskEvent) => void> = [];
  private config: TaskConfiguration;

  constructor(config?: Partial<TaskConfiguration>) {
    this.config = {
      max_concurrent_tasks: 4,
      max_retries: 3,
      retry_delay_ms: 5000,
      heartbeat_interval_ms: 1000,
      checkpoint_interval_ms: 10000,
      resource_monitoring_interval_ms: 2000,
      auto_cleanup_completed_tasks: true,
      cleanup_delay_ms: 300000, // 5 minutes
      enable_detailed_logging: true,
      enable_performance_profiling: true,
      enable_predictive_scheduling: true,
      ...config
    };
  }

  // Task Tree Management
  createTaskTree(name: string, description?: string): string {
    const tree_id = `tree_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const taskTree: TaskTree = {
      id: tree_id,
      root_task_id: '',
      name,
      description,
      status: TaskStatus.PENDING,
      progress: 0,
      created_at: Date.now(),
      nodes: {},
      execution_order: [],
      total_nodes: 0,
      completed_nodes: 0,
      failed_nodes: 0,
      active_nodes: [],
      critical_path: [],
      bottlenecks: []
    };

    this.taskTrees.set(tree_id, taskTree);
    this.emitEvent('created', tree_id, undefined, { tree_name: name });
    
    return tree_id;
  }

  // Create Video Processing Task Hierarchy
  createVideoProcessingTaskTree(
    videoId: string,
    videoName: string,
    processingSettings: any,
    aiSettings?: any
  ): string {
    const tree_id = this.createTaskTree(`Video Processing: ${videoName}`);
    const tree = this.taskTrees.get(tree_id)!;

    // Create root task
    const rootTaskId = this.createTask({
      name: `Process ${videoName}`,
      type: TaskType.PARENT,
      priority: TaskPriority.HIGH,
      stage: ProcessingStage.ANALYSIS,
      description: `Complete video processing pipeline for ${videoName}`,
      estimated_duration: 300, // 5 minutes estimate
      data: {
        video_id: videoId,
        video_name: videoName,
        processing_settings: processingSettings,
        ai_settings: aiSettings
      } as VideoProcessingTaskData
    }, tree_id);

    tree.root_task_id = rootTaskId;

    // Create processing stage sub-tasks
    const stages = [
      { stage: ProcessingStage.ANALYSIS, name: 'Video Analysis', duration: 30 },
      { stage: ProcessingStage.PREPROCESSING, name: 'Preprocessing', duration: 45 },
      { stage: ProcessingStage.AI_ENHANCEMENT, name: 'AI Enhancement', duration: 120 },
      { stage: ProcessingStage.FRAME_PROCESSING, name: 'Frame Processing', duration: 90 },
      { stage: ProcessingStage.AUDIO_PROCESSING, name: 'Audio Processing', duration: 30 },
      { stage: ProcessingStage.ENCODING, name: 'Final Encoding', duration: 60 },
      { stage: ProcessingStage.POST_PROCESSING, name: 'Post Processing', duration: 15 },
      { stage: ProcessingStage.VALIDATION, name: 'Quality Validation', duration: 10 },
      { stage: ProcessingStage.CLEANUP, name: 'Cleanup', duration: 5 }
    ];

    let previousTaskId = rootTaskId;
    
    for (const stageInfo of stages) {
      const taskId = this.createTask({
        name: stageInfo.name,
        type: TaskType.SUB_TASK,
        priority: TaskPriority.MEDIUM,
        stage: stageInfo.stage,
        parent_task_id: rootTaskId,
        estimated_duration: stageInfo.duration,
        dependencies: {
          task_id: '',
          depends_on: previousTaskId !== rootTaskId ? [previousTaskId] : [],
          blocks: [],
          dependency_type: 'sequential'
        }
      }, tree_id);

      // Create micro-tasks for AI enhancement stage
      if (stageInfo.stage === ProcessingStage.AI_ENHANCEMENT && aiSettings) {
        this.createAIEnhancementMicroTasks(taskId, aiSettings, tree_id);
      }

      previousTaskId = taskId;
    }

    this.calculateCriticalPath(tree_id);
    return tree_id;
  }

  // Create AI Enhancement Micro-tasks
  private createAIEnhancementMicroTasks(parentTaskId: string, aiSettings: any, treeId: string): void {
    const microTasks = [];

    if (aiSettings.upscaling?.enabled) {
      microTasks.push({
        name: 'AI Upscaling',
        stage: ProcessingStage.AI_ENHANCEMENT,
        duration: 60,
        data: { enhancement_type: 'upscaling', settings: aiSettings.upscaling }
      });
    }

    if (aiSettings.denoising?.enabled) {
      microTasks.push({
        name: 'AI Denoising',
        stage: ProcessingStage.AI_ENHANCEMENT,
        duration: 40,
        data: { enhancement_type: 'denoising', settings: aiSettings.denoising }
      });
    }

    if (aiSettings.faceEnhancement?.enabled) {
      microTasks.push({
        name: 'Face Enhancement',
        stage: ProcessingStage.AI_ENHANCEMENT,
        duration: 30,
        data: { enhancement_type: 'face_enhancement', settings: aiSettings.faceEnhancement }
      });
    }

    if (aiSettings.frameInterpolation?.enabled) {
      microTasks.push({
        name: 'Frame Interpolation',
        stage: ProcessingStage.AI_ENHANCEMENT,
        duration: 80,
        data: { enhancement_type: 'interpolation', settings: aiSettings.frameInterpolation }
      });
    }

    // Create micro-tasks
    microTasks.forEach(taskInfo => {
      this.createTask({
        name: taskInfo.name,
        type: TaskType.MICRO_TASK,
        priority: TaskPriority.MEDIUM,
        stage: taskInfo.stage,
        parent_task_id: parentTaskId,
        estimated_duration: taskInfo.duration,
        data: taskInfo.data
      }, treeId);
    });
  }

  // Task Creation and Management
  createTask(payload: TaskCreationPayload, treeId?: string): string {
    const task_id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const task: TaskNode = {
      id: task_id,
      parent_task_id: payload.parent_task_id,
      type: payload.type,
      name: payload.name,
      description: payload.description,
      status: TaskStatus.PENDING,
      priority: payload.priority,
      stage: payload.stage,
      progress: 0,
      created_at: Date.now(),
      sub_tasks: [],
      dependencies: payload.dependencies || {
        task_id: task_id,
        depends_on: [],
        blocks: [],
        dependency_type: 'sequential'
      },
      resources: payload.resources || {},
      metrics: {
        task_id: task_id,
        retry_count: 0
      },
      data: payload.data,
      retry_count: 0,
      max_retries: this.config.max_retries,
      messages: []
    };

    this.taskNodes.set(task_id, task);

    // Add to tree if specified
    if (treeId) {
      const tree = this.taskTrees.get(treeId);
      if (tree) {
        tree.nodes[task_id] = task;
        tree.total_nodes++;
        
        // Update parent task's sub_tasks array
        if (payload.parent_task_id) {
          const parentTask = tree.nodes[payload.parent_task_id];
          if (parentTask) {
            parentTask.sub_tasks.push(task_id);
          }
        }
      }
    }

    this.emitEvent('created', task_id, payload.parent_task_id, payload);
    return task_id;
  }

  // Task Status Updates
  updateTask(taskId: string, updates: TaskUpdatePayload): void {
    const task = this.taskNodes.get(taskId);
    if (!task) return;

    const oldStatus = task.status;
    Object.assign(task, updates);
    task.updated_at = Date.now();

    // Handle status changes
    if (updates.status && updates.status !== oldStatus) {
      this.handleStatusChange(task, oldStatus, updates.status);
    }

    // Update tree progress
    this.updateTreeProgress(taskId);
    this.emitEvent('progress', taskId, task.parent_task_id, updates);
  }

  private handleStatusChange(task: TaskNode, oldStatus: TaskStatus, newStatus: TaskStatus): void {
    switch (newStatus) {
      case TaskStatus.RUNNING:
        task.started_at = Date.now();
        task.metrics.start_time = Date.now();
        this.emitEvent('started', task.id, task.parent_task_id);
        break;
        
      case TaskStatus.COMPLETED:
        task.completed_at = Date.now();
        task.metrics.end_time = Date.now();
        task.metrics.duration = task.metrics.end_time - (task.metrics.start_time || 0);
        task.progress = 100;
        this.emitEvent('completed', task.id, task.parent_task_id);
        break;
        
      case TaskStatus.FAILED:
        task.completed_at = Date.now();
        task.metrics.end_time = Date.now();
        this.emitEvent('failed', task.id, task.parent_task_id, { error: task.error });
        break;
        
      case TaskStatus.CANCELLED:
        task.completed_at = Date.now();
        this.emitEvent('cancelled', task.id, task.parent_task_id);
        break;
    }

    // Start dependent tasks if this task completed
    if (newStatus === TaskStatus.COMPLETED) {
      this.startDependentTasks(task.id);
    }
  }

  // Message System
  addMessage(taskId: string, message: Omit<TaskMessage, 'id' | 'task_id' | 'timestamp'>): void {
    const task = this.taskNodes.get(taskId);
    if (!task) return;

    const taskMessage: TaskMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      task_id: taskId,
      parent_task_id: task.parent_task_id,
      timestamp: Date.now(),
      ...message
    };

    task.messages.push(taskMessage);
    this.messageQueue.push(taskMessage);

    // Emit message event
    this.emitEvent('progress', taskId, task.parent_task_id, { message: taskMessage });
  }

  // Progress Calculation
  private updateTreeProgress(taskId: string): void {
    // Find which trees contain this task
    for (const [treeId, tree] of this.taskTrees) {
      if (tree.nodes[taskId]) {
        const totalProgress = this.calculateTreeProgress(tree);
        tree.progress = totalProgress;
        
        // Update tree status based on node statuses
        this.updateTreeStatus(tree);
        break;
      }
    }
  }

  private calculateTreeProgress(tree: TaskTree): number {
    if (tree.total_nodes === 0) return 0;

    let totalWeight = 0;
    let weightedProgress = 0;

    for (const node of Object.values(tree.nodes)) {
      const weight = this.getTaskWeight(node);
      totalWeight += weight;
      weightedProgress += (node.progress / 100) * weight;
    }

    return totalWeight > 0 ? (weightedProgress / totalWeight) * 100 : 0;
  }

  private getTaskWeight(task: TaskNode): number {
    // Weight based on task type and estimated duration
    const typeWeight = {
      [TaskType.PARENT]: 10,
      [TaskType.SUB_TASK]: 5,
      [TaskType.MICRO_TASK]: 1
    }[task.type] || 1;

    const durationWeight = (task.estimated_duration || 60) / 60; // Normalize to hours
    return typeWeight * Math.max(0.1, durationWeight);
  }

  private updateTreeStatus(tree: TaskTree): void {
    const statuses = Object.values(tree.nodes).map(node => node.status);
    
    if (statuses.every(status => status === TaskStatus.COMPLETED)) {
      tree.status = TaskStatus.COMPLETED;
      tree.completed_at = Date.now();
    } else if (statuses.some(status => status === TaskStatus.FAILED)) {
      tree.status = TaskStatus.FAILED;
    } else if (statuses.some(status => status === TaskStatus.RUNNING)) {
      tree.status = TaskStatus.RUNNING;
      if (!tree.started_at) tree.started_at = Date.now();
    } else if (statuses.some(status => status === TaskStatus.PAUSED)) {
      tree.status = TaskStatus.PAUSED;
    }
  }

  // Dependency Management
  private startDependentTasks(completedTaskId: string): void {
    for (const [_, task] of this.taskNodes) {
      if (task.dependencies.depends_on.includes(completedTaskId) && 
          task.status === TaskStatus.PENDING) {
        
        // Check if all dependencies are completed
        const allDependenciesCompleted = task.dependencies.depends_on.every(depId => {
          const depTask = this.taskNodes.get(depId);
          return depTask?.status === TaskStatus.COMPLETED;
        });

        if (allDependenciesCompleted) {
          this.updateTask(task.id, { status: TaskStatus.RUNNING });
          this.emitEvent('dependency_resolved', task.id, task.parent_task_id);
        }
      }
    }
  }

  // Critical Path Analysis
  private calculateCriticalPath(treeId: string): void {
    const tree = this.taskTrees.get(treeId);
    if (!tree) return;

    // Simple critical path calculation based on longest duration chain
    const criticalPath: string[] = [];
    let currentTask = tree.nodes[tree.root_task_id];
    
    while (currentTask) {
      criticalPath.push(currentTask.id);
      
      // Find longest duration sub-task
      let longestSubTask: TaskNode | undefined;
      let maxDuration = 0;
      
      for (const subTaskId of currentTask.sub_tasks) {
        const subTask = tree.nodes[subTaskId];
        if (subTask && (subTask.estimated_duration || 0) > maxDuration) {
          maxDuration = subTask.estimated_duration || 0;
          longestSubTask = subTask;
        }
      }
      
      currentTask = longestSubTask;
    }
    
    tree.critical_path = criticalPath;
  }

  // Event System
  private emitEvent(
    event_type: TaskEvent['event_type'], 
    task_id: string, 
    parent_task_id?: string, 
    data?: any
  ): void {
    const event: TaskEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      task_id,
      parent_task_id,
      event_type,
      timestamp: Date.now(),
      data
    };

    this.eventHistory.push(event);
    this.listeners.forEach(listener => listener(event));
  }

  // Public API Methods
  addEventListener(listener: (event: TaskEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) this.listeners.splice(index, 1);
    };
  }

  getTaskTree(treeId: string): TaskTree | undefined {
    return this.taskTrees.get(treeId);
  }

  getTask(taskId: string): TaskNode | undefined {
    return this.taskNodes.get(taskId);
  }

  getTaskMessages(taskId: string): TaskMessage[] {
    const task = this.taskNodes.get(taskId);
    return task?.messages || [];
  }

  getAllMessages(): TaskMessage[] {
    return [...this.messageQueue];
  }

  getActiveTaskTrees(): TaskTree[] {
    return Array.from(this.taskTrees.values()).filter(
      tree => tree.status === TaskStatus.RUNNING || tree.status === TaskStatus.PENDING
    );
  }

  pauseTask(taskId: string): void {
    this.updateTask(taskId, { status: TaskStatus.PAUSED });
  }

  resumeTask(taskId: string): void {
    this.updateTask(taskId, { status: TaskStatus.RUNNING });
  }

  cancelTask(taskId: string): void {
    const task = this.taskNodes.get(taskId);
    if (!task) return;

    // Cancel all sub-tasks
    task.sub_tasks.forEach(subTaskId => {
      this.updateTask(subTaskId, { status: TaskStatus.CANCELLED });
    });

    this.updateTask(taskId, { status: TaskStatus.CANCELLED });
  }

  retryTask(taskId: string): void {
    const task = this.taskNodes.get(taskId);
    if (!task || task.retry_count >= task.max_retries) return;

    task.retry_count++;
    this.updateTask(taskId, { 
      status: TaskStatus.PENDING, 
      progress: 0, 
      error: undefined 
    });
  }

  // Cleanup
  cleanup(): void {
    if (this.config.auto_cleanup_completed_tasks) {
      const now = Date.now();
      const cleanupThreshold = now - this.config.cleanup_delay_ms;

      for (const [treeId, tree] of this.taskTrees) {
        if (tree.status === TaskStatus.COMPLETED && 
            (tree.completed_at || 0) < cleanupThreshold) {
          
          // Remove all nodes from this tree
          for (const nodeId of Object.keys(tree.nodes)) {
            this.taskNodes.delete(nodeId);
          }
          
          this.taskTrees.delete(treeId);
        }
      }
    }
  }
}

// Singleton instance
export const taskManager = new TaskManager();