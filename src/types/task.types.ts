export enum TaskType {
  PARENT = 'parent',
  SUB_TASK = 'sub_task',
  MICRO_TASK = 'micro_task'
}

export enum TaskStatus {
  PENDING = 'pending',
  INITIALIZING = 'initializing',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  SKIPPED = 'skipped'
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ProcessingStage {
  ANALYSIS = 'analysis',
  PREPROCESSING = 'preprocessing',
  AI_ENHANCEMENT = 'ai_enhancement',
  FRAME_PROCESSING = 'frame_processing',
  AUDIO_PROCESSING = 'audio_processing',
  ENCODING = 'encoding',
  POST_PROCESSING = 'post_processing',
  VALIDATION = 'validation',
  CLEANUP = 'cleanup'
}

export interface TaskMessage {
  id: string;
  task_id: string;
  parent_task_id?: string;
  timestamp: number;
  type: 'info' | 'warning' | 'error' | 'success' | 'progress';
  title: string;
  message: string;
  data?: any;
  progress?: number;
  stage?: ProcessingStage;
}

export interface TaskMetrics {
  task_id: string;
  start_time?: number;
  end_time?: number;
  duration?: number;
  cpu_usage?: number;
  memory_usage?: number;
  gpu_usage?: number;
  frames_processed?: number;
  processing_speed?: number;
  throughput?: number;
  error_count?: number;
  retry_count?: number;
}

export interface TaskDependency {
  task_id: string;
  depends_on: string[];
  blocks: string[];
  dependency_type: 'sequential' | 'parallel' | 'conditional';
}

export interface TaskResource {
  cpu_cores?: number;
  memory_mb?: number;
  gpu_memory_mb?: number;
  disk_space_mb?: number;
  priority_weight?: number;
}

export interface TaskNode {
  id: string;
  parent_task_id?: string;
  type: TaskType;
  name: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  stage?: ProcessingStage;
  progress: number;
  created_at: number;
  started_at?: number;
  updated_at?: number;
  completed_at?: number;
  estimated_duration?: number;
  remaining_time?: number;
  sub_tasks: string[];
  dependencies: TaskDependency;
  resources: TaskResource;
  metrics: TaskMetrics;
  data?: any;
  error?: string;
  retry_count: number;
  max_retries: number;
  messages: TaskMessage[];
}

export interface TaskTree {
  id: string;
  root_task_id: string;
  name: string;
  description?: string;
  status: TaskStatus;
  progress: number;
  created_at: number;
  started_at?: number;
  completed_at?: number;
  estimated_duration?: number;
  remaining_time?: number;
  nodes: Record<string, TaskNode>;
  execution_order: string[];
  total_nodes: number;
  completed_nodes: number;
  failed_nodes: number;
  active_nodes: string[];
  critical_path: string[];
  bottlenecks: string[];
}

export interface TaskExecution {
  task_id: string;
  executor_id: string;
  thread_id?: string;
  process_id?: string;
  start_time: number;
  last_heartbeat: number;
  resource_usage: TaskResource;
  current_operation?: string;
  checkpoint_data?: any;
}

export interface TaskEvent {
  id: string;
  task_id: string;
  parent_task_id?: string;
  event_type: 'created' | 'started' | 'progress' | 'paused' | 'resumed' | 'completed' | 'failed' | 'cancelled' | 'dependency_resolved';
  timestamp: number;
  data?: any;
  message?: string;
}

export interface TaskScheduler {
  id: string;
  name: string;
  max_concurrent_tasks: number;
  max_concurrent_per_type: Record<TaskType, number>;
  resource_limits: TaskResource;
  current_tasks: string[];
  queued_tasks: string[];
  priority_queue: Array<{
    task_id: string;
    priority_score: number;
  }>;
}

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  type: TaskType;
  stage?: ProcessingStage;
  estimated_duration: number;
  required_resources: TaskResource;
  sub_task_templates?: string[];
  default_config?: any;
}

export interface VideoProcessingTaskData {
  video_id: string;
  input_path: string;
  output_path: string;
  processing_settings: any;
  ai_settings?: any;
  input_metadata?: {
    duration: number;
    frame_count: number;
    resolution: string;
    fps: number;
    codec: string;
    file_size: number;
  };
  output_metadata?: {
    duration: number;
    frame_count: number;
    resolution: string;
    fps: number;
    codec: string;
    file_size: number;
    quality_score?: number;
  };
  checkpoints: Array<{
    stage: ProcessingStage;
    timestamp: number;
    data: any;
  }>;
}

export interface AIProcessingTaskData extends VideoProcessingTaskData {
  model_name: string;
  model_version: string;
  batch_size: number;
  enhancement_type: 'upscaling' | 'denoising' | 'face_enhancement' | 'interpolation';
  enhancement_settings: Record<string, any>;
  processed_frames: number[];
  quality_metrics?: {
    psnr?: number;
    ssim?: number;
    lpips?: number;
  };
}

export interface TaskConfiguration {
  max_concurrent_tasks: number;
  max_retries: number;
  retry_delay_ms: number;
  heartbeat_interval_ms: number;
  checkpoint_interval_ms: number;
  resource_monitoring_interval_ms: number;
  auto_cleanup_completed_tasks: boolean;
  cleanup_delay_ms: number;
  enable_detailed_logging: boolean;
  enable_performance_profiling: boolean;
  enable_predictive_scheduling: boolean;
}

export type TaskUpdatePayload = Partial<Pick<TaskNode, 
  'status' | 'progress' | 'error' | 'remaining_time' | 'current_operation' | 'data'
>>;

export type TaskCreationPayload = Pick<TaskNode, 
  'name' | 'type' | 'priority' | 'stage'
> & {
  parent_task_id?: string;
  description?: string;
  estimated_duration?: number;
  resources?: Partial<TaskResource>;
  dependencies?: Partial<TaskDependency>;
  data?: any;
};