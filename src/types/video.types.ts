import { TaskNode, TaskTree, TaskMessage, ProcessingStage } from './task.types';

// Re-export types from task.types for convenience
export { ProcessingStage, TaskStatus, TaskType, TaskPriority } from './task.types';
export type { TaskNode, TaskTree, TaskMessage, TaskEvent } from './task.types';

export type VideoStatus = 'ready' | 'processing' | 'completed' | 'error';

export enum ProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused'
}

export interface ProcessingItem {
  id: string;
  videoId: string;
  videoName: string;
  status: ProcessingStatus;
  progress: number;
  startTime?: number; // timestamp
  startedAt?: number; // timestamp  
  endTime?: number; // timestamp
  estimatedTimeRemaining?: number;
  inputSize: number;
  totalFrames: number;
  duration: number;
  error?: string;
  currentStep?: string;
  processingTime?: number;
  processingSpeed?: number | string;
  outputSize?: number;
  outputPath?: string;
  framesProcessed?: number;
  // Hierarchical task tracking
  task_tree_id?: string;
  parent_task_id?: string;
  current_stage?: ProcessingStage;
  sub_tasks?: string[];
  task_messages?: TaskMessage[];
  detailed_progress?: Record<ProcessingStage, number>;
  stage_timings?: Record<ProcessingStage, { start: number; end?: number; duration?: number }>;
}

export interface Video {
  id: string;
  name: string;
  /**
   * File path or URL to the video
   * - For Electron file dialog imports: file:// URL (e.g., file:///C:/path/to/video.mp4)
   * - For browser drag-drop imports: blob: URL created from File object
   * - For web videos: http:// or https:// URL
   * - For custom protocol: video:// URL (if implemented)
   */
  path: string;
  size: number; // bytes
  duration: number; // seconds
  format: string;
  resolution: string;
  fps: number;
  bitrate: number;
  /**
   * Video thumbnail
   * - base64 data URL (data:image/jpeg;base64,...)
   * - blob URL (blob:http://...)
   * - empty string if thumbnail generation failed
   * - undefined if not yet generated
   */
  thumbnail?: string;
  status: VideoStatus;
  processProgress?: number; // 0-100
  trimStart?: number; // seconds
  trimEnd?: number; // seconds
  timelinePosition?: number; // position on timeline in seconds
  trackIndex?: number; // which track/lane this video is on
  selected?: boolean;
  metadata: VideoMetadata;
  createdAt: number; // timestamp
  modifiedAt: number; // timestamp
  effects?: VideoEffect[];
  videoName?: string;
  inputSize?: number;
  totalFrames?: number;
  estimatedTimeRemaining?: number;
  /**
   * Original File object - ONLY available for browser drag-drop imports
   * Not available for Electron file dialog imports due to security restrictions
   * Used to create blob URLs for playback in browser
   */
  originalFile?: File;
}

export interface VideoEffect {
  id: string;
  type: 'upscaling' | 'frameInterpolation' | 'faceEnhancement' | 'denoising' | 'colorCorrection' | 'stabilization';
  name: string;
  enabled: boolean;
  settings: Record<string, any>;
}

export interface VideoMetadata {
  width: number;
  height: number;
  aspectRatio: string;
  codec: string;
  format?: string;
  audioCodec?: string;
  audioChannels?: number;
  audioSampleRate?: number;
  frameRate: number;
  duration?: number; // seconds
  bitrate?: number; // bits per second
  bitDepth?: number;
  colorSpace?: string;
  hasAudio: boolean;
  hasVideo: boolean;
}

export interface ProcessingSettings {
  outputFormat: string;
  quality: 'low' | 'medium' | 'high' | 'custom';
  resolution?: string;
  fps?: number;
  bitrate?: number;
  codec: string;
  outputPath: string;
  filenamePattern: string;
}

export interface AISettings {
  upscaling: {
    enabled: boolean;
    factor: 2 | 3 | 4 | 8;
    model: string;
    quality: number; // 0-100
  };
  frameInterpolation: {
    enabled: boolean;
    targetFps: number;
    model: string;
  };
  faceEnhancement: {
    enabled: boolean;
    strength: number; // 0-100
    model: string;
  };
  denoising: {
    enabled: boolean;
    level: 'low' | 'medium' | 'high' | 'extreme';
    model: string;
  };
  objectRemoval: {
    enabled: boolean;
    regions: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
    }>;
  };
  styleTransfer: {
    enabled: boolean;
    style: string;
    strength: number; // 0-100
  };
}

export interface VideoProcessingJob {
  id: string;
  videoId: string;
  status: ProcessingStatus;
  progress: number; // 0-100
  processingSettings: ProcessingSettings;
  aiSettings?: AISettings;
  startTime?: number; // timestamp
  endTime?: number; // timestamp
  estimatedTime?: number; // seconds
  outputPath?: string;
  error?: string;
  // Hierarchical task tracking
  task_tree?: TaskTree;
  root_task_id?: string;
  current_stage?: ProcessingStage;
  stage_progress?: Record<ProcessingStage, number>;
  active_sub_tasks?: string[];
  completed_stages?: ProcessingStage[];
  failed_stages?: ProcessingStage[];
  stage_messages?: TaskMessage[];
  performance_metrics?: {
    stages: Record<ProcessingStage, {
      duration?: number;
      throughput?: number;
      resource_usage?: {
        cpu: number;
        memory: number;
        gpu?: number;
      };
    }>;
    overall: {
      total_duration?: number;
      avg_throughput?: number;
      peak_memory?: number;
      peak_cpu?: number;
      peak_gpu?: number;
    };
  };
}

export interface BatchProcessingConfig {
  videos: string[]; // video IDs
  processingSettings: ProcessingSettings;
  aiSettings?: AISettings;
  parallelProcessing: boolean;
  maxConcurrent: number;
}

export interface VideoAnalysis {
  videoId: string;
  frameCount: number;
  keyFrames: number[];
  sceneChanges: number[];
  motionVectors: Array<{
    frame: number;
    motion: number; // 0-1 scale
  }>;
  audioAnalysis?: {
    rms: number[];
    spectralCentroid: number[];
    silenceRegions: Array<{
      start: number;
      end: number;
    }>;
  };
}