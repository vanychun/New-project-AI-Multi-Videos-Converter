// Enhanced Video Types for Professional Video Management
export interface VideoMetadata {
  duration: number; // Duration in seconds
  resolution: {
    width: number;
    height: number;
  };
  frameRate: number; // FPS
  bitrate: number; // Bitrate in kbps
  codec: string; // Video codec (h264, h265, etc.)
  audioTracks: number; // Number of audio tracks
  format: string; // Container format
  size: number; // File size in bytes
  aspectRatio: string; // e.g., "16:9", "4:3"
  hasAudio: boolean;
  colorSpace?: string;
  profile?: string;
}

export interface VideoThumbnail {
  dataUrl: string; // Base64 data URL
  timestamp: number; // Timestamp in video when thumbnail was captured
  width: number;
  height: number;
  generatedAt: Date;
}

export interface CompletionMetadata {
  // Processing Information
  processingTime: number; // Total processing time in seconds
  completedAt: Date; // When processing finished
  qualityScore: number; // Final quality score (0-100)
  
  // Enhancement Details
  enhancementType: string; // e.g., "4x AI Upscaling", "Noise Reduction + Face Enhancement"
  enhancementFactor: string; // e.g., "4x", "2x", "HD to 4K"
  
  // File Information
  inputSize: number; // Original file size in bytes
  outputSize: number; // Enhanced file size in bytes
  outputPath: string; // Path to enhanced video file
  
  // Performance Metrics
  avgProcessingSpeed?: string; // e.g., "1.2x", "0.8x"
  peakMemory?: string; // e.g., "2.1GB"
  gpuUtilization?: string; // e.g., "89%"
  efficiency?: string; // e.g., "94%"
  
  // AI Features Applied
  aiFeatures?: {
    upscaling?: { enabled: boolean; factor: number; model: string };
    denoising?: { enabled: boolean; level: string };
    faceEnhancement?: { enabled: boolean; strength: number };
    frameInterpolation?: { enabled: boolean; targetFps: number };
  };
}

export interface ProcessingProgress {
  percentage: number; // 0-100
  stage: 'analyzing' | 'processing' | 'finalizing' | 'complete';
  estimatedTimeRemaining?: number; // Seconds
  currentOperation?: string;
  speed?: number; // Processing speed (fps or MB/s)
}

export interface VideoFileEnhanced {
  // Core Properties
  id: string;
  file: File;
  name: string;
  path: string;
  originalName: string;
  
  // Metadata & Analysis
  metadata?: VideoMetadata;
  thumbnail?: VideoThumbnail;
  thumbnails?: VideoThumbnail[]; // Multiple thumbnails for preview
  
  // Status & Progress
  status: 'importing' | 'analyzing' | 'ready' | 'processing' | 'completed' | 'error' | 'paused';
  progress?: ProcessingProgress;
  error?: VideoError;
  
  // Enhanced Status (for AI processed videos)
  enhanced?: boolean; // True if video has been AI enhanced
  completionMetadata?: CompletionMetadata; // Metadata about enhancement completion
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt?: Date;
  
  // Processing Settings
  settings?: VideoProcessingSettings;
  
  // Quality Analysis
  qualityScore?: number; // 0-100 quality rating
  suggestions?: string[]; // AI improvement suggestions
  
  // User Properties
  tags?: string[];
  notes?: string;
  favorite?: boolean;
  customName?: string;
}

export interface VideoError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  recoverable: boolean;
  suggestions?: string[];
}

export interface VideoProcessingSettings {
  // Output Settings
  outputFormat: string;
  quality: 'low' | 'medium' | 'high' | 'custom';
  resolution?: { width: number; height: number };
  
  // AI Enhancement
  aiUpscaling?: {
    enabled: boolean;
    factor: 2 | 4 | 8;
    model: string;
  };
  
  // Basic Processing
  trimStart?: number;
  trimEnd?: number;
  volume?: number;
  
  // Advanced
  customSettings?: Record<string, any>;
}

export interface ProjectEnhanced {
  id: string;
  name: string;
  description?: string;
  
  // Content
  videos: VideoFileEnhanced[];
  totalSize: number;
  totalDuration: number;
  
  // Settings
  defaultSettings: VideoProcessingSettings;
  exportSettings: ExportSettings;
  
  // Organization
  tags: string[];
  categories: string[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastOpenedAt?: Date;
  
  // Statistics
  stats: ProjectStatistics;
  
  // Backup
  version: number;
  autoSave: boolean;
}

export interface ExportSettings {
  outputDirectory: string;
  fileNaming: 'original' | 'custom' | 'timestamp';
  customNamePattern?: string;
  overwriteExisting: boolean;
  createSubfolders: boolean;
  preserveStructure: boolean;
}

export interface ProjectStatistics {
  totalVideos: number;
  completedVideos: number;
  failedVideos: number;
  totalProcessingTime: number; // in seconds
  averageFileSize: number;
  mostCommonFormat: string;
  qualityDistribution: Record<string, number>;
}

// Search and Filter Types
export interface VideoFilter {
  // Basic Filters
  formats?: string[];
  statuses?: VideoFileEnhanced['status'][];
  dateRange?: {
    start: Date;
    end: Date;
  };
  
  // Size Filters
  sizeRange?: {
    min: number; // bytes
    max: number; // bytes
  };
  
  // Duration Filters
  durationRange?: {
    min: number; // seconds
    max: number; // seconds
  };
  
  // Resolution Filters
  resolutionCategories?: ('SD' | 'HD' | 'FHD' | '4K' | '8K')[];
  
  // Quality Filters
  qualityRange?: {
    min: number; // 0-100
    max: number; // 0-100
  };
  
  // Tags and Categories
  tags?: string[];
  favorites?: boolean;
  
  // Advanced
  hasAudio?: boolean;
  aspectRatios?: string[];
  codecs?: string[];
}

export interface SearchQuery {
  text: string;
  filters: VideoFilter;
  sortBy: 'name' | 'size' | 'duration' | 'createdAt' | 'quality' | 'status';
  sortOrder: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  videos: VideoFileEnhanced[];
  totalCount: number;
  facets: SearchFacets;
  suggestions?: string[];
  executionTime: number; // milliseconds
}

export interface SearchFacets {
  formats: Record<string, number>;
  statuses: Record<string, number>;
  resolutions: Record<string, number>;
  durations: Record<string, number>;
  sizes: Record<string, number>;
  tags: Record<string, number>;
}

// Import and Validation Types
export interface FileImportOptions {
  validateFormat: boolean;
  generateThumbnails: boolean;
  extractMetadata: boolean;
  maxFileSize?: number; // bytes
  allowedFormats?: string[];
  thumbnailCount?: number;
  thumbnailQuality?: number; // 0-1
}

export interface ImportResult {
  successful: VideoFileEnhanced[];
  failed: FailedImport[];
  warnings: ImportWarning[];
  totalTime: number; // milliseconds
  statistics: ImportStatistics;
}

export interface FailedImport {
  file: File;
  reason: string;
  error: Error;
  suggestions?: string[];
}

export interface ImportWarning {
  file: File;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ImportStatistics {
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  totalSize: number;
  averageProcessingTime: number;
  thumbnailsGenerated: number;
  metadataExtracted: number;
}

// View and Display Types
export interface ViewSettings {
  layout: 'grid' | 'list' | 'timeline';
  gridSize: 'small' | 'medium' | 'large';
  showThumbnails: boolean;
  showMetadata: boolean;
  showProgress: boolean;
  groupBy?: 'none' | 'status' | 'format' | 'date' | 'size';
  itemsPerPage: number;
}

export interface LibraryState {
  videos: VideoFileEnhanced[];
  selectedVideoIds: string[];
  searchQuery: SearchQuery;
  searchResults?: SearchResult;
  viewSettings: ViewSettings;
  loading: boolean;
  error?: string;
  
  // Statistics
  totalVideos: number;
  totalSize: number;
  totalDuration: number;
  statusCounts: Record<VideoFileEnhanced['status'], number>;
}

// Performance and Optimization Types
export interface PerformanceMetrics {
  // Import Performance
  averageImportTime: number; // per file in ms
  thumbnailGenerationTime: number; // average per thumbnail in ms
  metadataExtractionTime: number; // average per file in ms
  
  // Search Performance
  searchExecutionTime: number; // ms
  filterExecutionTime: number; // ms
  
  // Memory Usage
  memoryUsage: {
    total: number;
    videos: number;
    thumbnails: number;
    metadata: number;
  };
  
  // UI Performance
  renderTime: number; // ms
  scrollPerformance: number; // fps during scroll
  
  // File System
  diskUsage: {
    thumbnails: number;
    projects: number;
    cache: number;
  };
}

// Event Types for State Management
export type VideoLibraryEvent = 
  | { type: 'IMPORT_START'; payload: { files: File[]; options: FileImportOptions } }
  | { type: 'IMPORT_SUCCESS'; payload: ImportResult }
  | { type: 'IMPORT_FAILURE'; payload: { error: string } }
  | { type: 'VIDEO_SELECT'; payload: { videoId: string; multi: boolean } }
  | { type: 'VIDEO_DESELECT'; payload: { videoId: string } }
  | { type: 'VIDEO_UPDATE'; payload: { videoId: string; updates: Partial<VideoFileEnhanced> } }
  | { type: 'VIDEO_DELETE'; payload: { videoIds: string[] } }
  | { type: 'SEARCH_UPDATE'; payload: SearchQuery }
  | { type: 'VIEW_UPDATE'; payload: Partial<ViewSettings> }
  | { type: 'PROJECT_SAVE'; payload: { project: ProjectEnhanced } }
  | { type: 'PROJECT_LOAD'; payload: { projectId: string } };

// Constants
export const SUPPORTED_VIDEO_FORMATS = [
  'mp4', 'avi', 'mov', 'mkv', 'webm', 'wmv', 'flv', 'm4v', 'mpg', 'mpeg', '3gp', 'ogv'
] as const;

export const SUPPORTED_VIDEO_CODECS = [
  'h264', 'h265', 'vp8', 'vp9', 'av1', 'xvid', 'mpeg4', 'theora'
] as const;

export const RESOLUTION_CATEGORIES = {
  'SD': { maxWidth: 720, maxHeight: 576 },
  'HD': { maxWidth: 1280, maxHeight: 720 },
  'FHD': { maxWidth: 1920, maxHeight: 1080 },
  '4K': { maxWidth: 3840, maxHeight: 2160 },
  '8K': { maxWidth: 7680, maxHeight: 4320 }
} as const;

export const DEFAULT_IMPORT_OPTIONS: FileImportOptions = {
  validateFormat: true,
  generateThumbnails: true,
  extractMetadata: true,
  maxFileSize: 10 * 1024 * 1024 * 1024, // 10GB
  allowedFormats: [...SUPPORTED_VIDEO_FORMATS],
  thumbnailCount: 3,
  thumbnailQuality: 0.8
};

export const DEFAULT_VIEW_SETTINGS: ViewSettings = {
  layout: 'grid',
  gridSize: 'medium',
  showThumbnails: true,
  showMetadata: true,
  showProgress: true,
  groupBy: 'none',
  itemsPerPage: 50
};