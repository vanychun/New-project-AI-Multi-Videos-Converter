import { VideoThumbnail } from '../types/video-enhanced.types';

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number; // 0-1
  format?: 'jpeg' | 'webp' | 'png';
  timestamps?: number[]; // Specific timestamps to capture
  count?: number; // Number of thumbnails to generate
  aspectRatio?: 'preserve' | 'crop' | 'stretch';
}

export interface ThumbnailGenerationResult {
  thumbnails: VideoThumbnail[];
  duration: number; // Video duration in seconds
  success: boolean;
  error?: string;
  processingTime: number; // Generation time in ms
}

export class ThumbnailGeneratorService {
  private static instance: ThumbnailGeneratorService;
  
  private readonly DEFAULT_OPTIONS: Required<ThumbnailOptions> = {
    width: 320,
    height: 180,
    quality: 0.8,
    format: 'jpeg',
    timestamps: [],
    count: 3,
    aspectRatio: 'preserve'
  };

  private readonly MAX_CANVAS_SIZE = 4096; // Maximum canvas dimension
  private readonly MAX_CONCURRENT_GENERATIONS = 4; // Limit concurrent operations
  private activeGenerations = 0;
  private generationQueue: Array<() => void> = [];

  public static getInstance(): ThumbnailGeneratorService {
    if (!ThumbnailGeneratorService.instance) {
      ThumbnailGeneratorService.instance = new ThumbnailGeneratorService();
    }
    return ThumbnailGeneratorService.instance;
  }

  private constructor() {}

  /**
   * Generate thumbnails for a video file
   */
  public async generateThumbnails(
    file: File, 
    options: ThumbnailOptions = {}
  ): Promise<ThumbnailGenerationResult> {
    const startTime = performance.now();
    const finalOptions = { ...this.DEFAULT_OPTIONS, ...options };

    try {
      // Wait for available generation slot
      await this.waitForGenerationSlot();
      this.activeGenerations++;

      const video = await this.createVideoElement(file);
      const duration = video.duration;

      // Determine timestamps for thumbnail generation
      const timestamps = this.determineTimestamps(duration, finalOptions);
      
      // Generate thumbnails
      const thumbnails: VideoThumbnail[] = [];
      
      for (const timestamp of timestamps) {
        try {
          const thumbnail = await this.captureFrame(video, timestamp, finalOptions);
          thumbnails.push(thumbnail);
        } catch (error) {
          console.warn(`Failed to generate thumbnail at ${timestamp}s:`, error);
          // Continue with other thumbnails
        }
      }

      // Clean up
      this.cleanupVideoElement(video);
      this.activeGenerations--;
      this.processQueue();

      const processingTime = performance.now() - startTime;

      if (thumbnails.length === 0) {
        throw new Error('Failed to generate any thumbnails');
      }

      return {
        thumbnails,
        duration,
        success: true,
        processingTime
      };

    } catch (error) {
      this.activeGenerations--;
      this.processQueue();

      return {
        thumbnails: [],
        duration: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        processingTime: performance.now() - startTime
      };
    }
  }

  /**
   * Generate a single thumbnail at a specific timestamp
   */
  public async generateSingleThumbnail(
    file: File,
    timestamp: number,
    options: ThumbnailOptions = {}
  ): Promise<VideoThumbnail | null> {
    const finalOptions = { ...this.DEFAULT_OPTIONS, ...options };

    try {
      await this.waitForGenerationSlot();
      this.activeGenerations++;

      const video = await this.createVideoElement(file);
      const thumbnail = await this.captureFrame(video, timestamp, finalOptions);
      
      this.cleanupVideoElement(video);
      this.activeGenerations--;
      this.processQueue();

      return thumbnail;

    } catch (error) {
      this.activeGenerations--;
      this.processQueue();
      console.error('Failed to generate single thumbnail:', error);
      return null;
    }
  }

  /**
   * Generate thumbnails for multiple files in batch
   */
  public async generateBatchThumbnails(
    files: File[],
    options: ThumbnailOptions = {}
  ): Promise<Map<string, ThumbnailGenerationResult>> {
    const results = new Map<string, ThumbnailGenerationResult>();
    
    // Process files in batches to avoid overwhelming the system
    const BATCH_SIZE = 3;
    const batches = this.chunkArray(files, BATCH_SIZE);
    
    for (const batch of batches) {
      const batchPromises = batch.map(async (file) => {
        const result = await this.generateThumbnails(file, options);
        results.set(file.name, result);
        return result;
      });
      
      await Promise.all(batchPromises);
    }
    
    return results;
  }

  /**
   * Create video element from file
   */
  private createVideoElement(file: File): Promise<HTMLVideoElement> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);
      
      video.preload = 'metadata';
      video.muted = true; // Required for autoplay in some browsers
      video.crossOrigin = 'anonymous';
      
      const cleanup = () => {
        URL.revokeObjectURL(url);
      };

      video.onloadedmetadata = () => {
        // Validate video
        if (video.duration === 0 || isNaN(video.duration)) {
          cleanup();
          reject(new Error('Invalid video: zero or undefined duration'));
          return;
        }
        
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          cleanup();
          reject(new Error('Invalid video: zero dimensions'));
          return;
        }

        resolve(video);
      };
      
      video.onerror = () => {
        cleanup();
        reject(new Error('Failed to load video metadata'));
      };
      
      video.onabort = () => {
        cleanup();
        reject(new Error('Video loading was aborted'));
      };
      
      // Set timeout to avoid hanging
      setTimeout(() => {
        if (video.readyState < 1) {
          cleanup();
          reject(new Error('Video loading timeout'));
        }
      }, 30000); // 30 second timeout
      
      video.src = url;
    });
  }

  /**
   * Capture a frame at specific timestamp
   */
  private captureFrame(
    video: HTMLVideoElement,
    timestamp: number,
    options: Required<ThumbnailOptions>
  ): Promise<VideoThumbnail> {
    return new Promise((resolve, reject) => {
      const seekHandler = () => {
        try {
          video.removeEventListener('seeked', seekHandler);
          video.removeEventListener('error', errorHandler);
          
          // Create canvas and capture frame
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          // Calculate dimensions based on aspect ratio handling
          const dimensions = this.calculateDimensions(
            video.videoWidth,
            video.videoHeight,
            options.width,
            options.height,
            options.aspectRatio
          );
          
          canvas.width = dimensions.width;
          canvas.height = dimensions.height;
          
          // Clear canvas and set background
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw video frame
          this.drawVideoFrame(ctx, video, dimensions, options.aspectRatio);
          
          // Convert to data URL
          const dataUrl = canvas.toDataURL(`image/${options.format}`, options.quality);
          
          const thumbnail: VideoThumbnail = {
            dataUrl,
            timestamp,
            width: canvas.width,
            height: canvas.height,
            generatedAt: new Date()
          };
          
          resolve(thumbnail);
          
        } catch (error) {
          reject(error);
        }
      };
      
      const errorHandler = () => {
        video.removeEventListener('seeked', seekHandler);
        video.removeEventListener('error', errorHandler);
        reject(new Error('Video seek error'));
      };
      
      video.addEventListener('seeked', seekHandler);
      video.addEventListener('error', errorHandler);
      
      // Seek to timestamp (clamp to valid range)
      const clampedTime = Math.max(0, Math.min(timestamp, video.duration - 0.1));
      video.currentTime = clampedTime;
    });
  }

  /**
   * Calculate optimal dimensions based on aspect ratio handling
   */
  private calculateDimensions(
    videoWidth: number,
    videoHeight: number,
    targetWidth: number,
    targetHeight: number,
    aspectRatio: 'preserve' | 'crop' | 'stretch'
  ): { width: number; height: number; sourceX: number; sourceY: number; sourceWidth: number; sourceHeight: number } {
    
    // Clamp dimensions to maximum canvas size
    targetWidth = Math.min(targetWidth, this.MAX_CANVAS_SIZE);
    targetHeight = Math.min(targetHeight, this.MAX_CANVAS_SIZE);
    
    const videoAspect = videoWidth / videoHeight;
    const targetAspect = targetWidth / targetHeight;
    
    switch (aspectRatio) {
      case 'stretch':
        return {
          width: targetWidth,
          height: targetHeight,
          sourceX: 0,
          sourceY: 0,
          sourceWidth: videoWidth,
          sourceHeight: videoHeight
        };
        
      case 'crop':
        if (videoAspect > targetAspect) {
          // Video is wider, crop horizontally
          const sourceWidth = videoHeight * targetAspect;
          const sourceX = (videoWidth - sourceWidth) / 2;
          return {
            width: targetWidth,
            height: targetHeight,
            sourceX,
            sourceY: 0,
            sourceWidth,
            sourceHeight: videoHeight
          };
        } else {
          // Video is taller, crop vertically
          const sourceHeight = videoWidth / targetAspect;
          const sourceY = (videoHeight - sourceHeight) / 2;
          return {
            width: targetWidth,
            height: targetHeight,
            sourceX: 0,
            sourceY,
            sourceWidth: videoWidth,
            sourceHeight
          };
        }
        
      case 'preserve':
      default:
        if (videoAspect > targetAspect) {
          // Video is wider, fit by width
          const height = targetWidth / videoAspect;
          return {
            width: targetWidth,
            height: Math.round(height),
            sourceX: 0,
            sourceY: 0,
            sourceWidth: videoWidth,
            sourceHeight: videoHeight
          };
        } else {
          // Video is taller, fit by height
          const width = targetHeight * videoAspect;
          return {
            width: Math.round(width),
            height: targetHeight,
            sourceX: 0,
            sourceY: 0,
            sourceWidth: videoWidth,
            sourceHeight: videoHeight
          };
        }
    }
  }

  /**
   * Draw video frame to canvas with proper aspect ratio handling
   */
  private drawVideoFrame(
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    dimensions: ReturnType<typeof this.calculateDimensions>,
    aspectRatio: 'preserve' | 'crop' | 'stretch'
  ): void {
    
    if (aspectRatio === 'preserve') {
      // Center the image on canvas
      const offsetX = (ctx.canvas.width - dimensions.width) / 2;
      const offsetY = (ctx.canvas.height - dimensions.height) / 2;
      
      ctx.drawImage(
        video,
        dimensions.sourceX,
        dimensions.sourceY,
        dimensions.sourceWidth,
        dimensions.sourceHeight,
        offsetX,
        offsetY,
        dimensions.width,
        dimensions.height
      );
    } else {
      // Fill entire canvas
      ctx.drawImage(
        video,
        dimensions.sourceX,
        dimensions.sourceY,
        dimensions.sourceWidth,
        dimensions.sourceHeight,
        0,
        0,
        dimensions.width,
        dimensions.height
      );
    }
  }

  /**
   * Determine timestamps for thumbnail generation
   */
  private determineTimestamps(duration: number, options: Required<ThumbnailOptions>): number[] {
    if (options.timestamps.length > 0) {
      // Use provided timestamps, but validate them
      return options.timestamps
        .filter(t => t >= 0 && t < duration)
        .slice(0, 10); // Limit to 10 thumbnails max
    }
    
    // Generate evenly spaced timestamps
    const count = Math.min(options.count, 10); // Limit to 10 thumbnails
    const timestamps: number[] = [];
    
    if (count === 1) {
      // Single thumbnail at middle
      timestamps.push(duration / 2);
    } else {
      // Evenly distributed thumbnails, avoiding very start and end
      const margin = Math.min(duration * 0.05, 2); // 5% margin or 2 seconds
      const availableDuration = duration - (2 * margin);
      const interval = availableDuration / (count - 1);
      
      for (let i = 0; i < count; i++) {
        const timestamp = margin + (i * interval);
        timestamps.push(Math.min(timestamp, duration - 0.1));
      }
    }
    
    return timestamps;
  }

  /**
   * Clean up video element and revoke object URL
   */
  private cleanupVideoElement(video: HTMLVideoElement): void {
    if (video.src) {
      URL.revokeObjectURL(video.src);
    }
    video.src = '';
    video.load(); // Reset video element
  }

  /**
   * Wait for available generation slot
   */
  private waitForGenerationSlot(): Promise<void> {
    return new Promise((resolve) => {
      if (this.activeGenerations < this.MAX_CONCURRENT_GENERATIONS) {
        resolve();
      } else {
        this.generationQueue.push(resolve);
      }
    });
  }

  /**
   * Process queued generation requests
   */
  private processQueue(): void {
    if (this.generationQueue.length > 0 && this.activeGenerations < this.MAX_CONCURRENT_GENERATIONS) {
      const nextResolve = this.generationQueue.shift();
      if (nextResolve) {
        nextResolve();
      }
    }
  }

  /**
   * Utility method to chunk arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Get optimal thumbnail size based on video dimensions
   */
  public getOptimalThumbnailSize(videoWidth: number, videoHeight: number): { width: number; height: number } {
    const aspectRatio = videoWidth / videoHeight;
    const maxDimension = 320;
    
    if (aspectRatio > 1) {
      // Landscape video
      return {
        width: maxDimension,
        height: Math.round(maxDimension / aspectRatio)
      };
    } else {
      // Portrait or square video
      return {
        width: Math.round(maxDimension * aspectRatio),
        height: maxDimension
      };
    }
  }

  /**
   * Estimate memory usage for thumbnail generation
   */
  public estimateMemoryUsage(
    fileCount: number,
    options: ThumbnailOptions = {}
  ): { estimated: number; recommendation: string } {
    const finalOptions = { ...this.DEFAULT_OPTIONS, ...options };
    const thumbnailsPerFile = finalOptions.count;
    const bytesPerPixel = 4; // RGBA
    const thumbnailSize = finalOptions.width * finalOptions.height * bytesPerPixel;
    const totalThumbnails = fileCount * thumbnailsPerFile;
    const estimatedBytes = totalThumbnails * thumbnailSize;
    
    let recommendation = 'Good';
    if (estimatedBytes > 500 * 1024 * 1024) { // > 500MB
      recommendation = 'Consider reducing thumbnail size or count';
    } else if (estimatedBytes > 1000 * 1024 * 1024) { // > 1GB
      recommendation = 'High memory usage - reduce thumbnail parameters';
    }
    
    return {
      estimated: estimatedBytes,
      recommendation
    };
  }

  /**
   * Clear all pending operations (useful for cleanup)
   */
  public clearQueue(): void {
    this.generationQueue.length = 0;
  }

  /**
   * Get current generation statistics
   */
  public getStatistics(): {
    activeGenerations: number;
    queuedGenerations: number;
    maxConcurrent: number;
  } {
    return {
      activeGenerations: this.activeGenerations,
      queuedGenerations: this.generationQueue.length,
      maxConcurrent: this.MAX_CONCURRENT_GENERATIONS
    };
  }
}