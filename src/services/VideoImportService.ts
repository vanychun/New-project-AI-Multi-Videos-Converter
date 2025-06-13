import { Video, VideoMetadata } from '../types/video.types';
import { v4 as uuidv4 } from 'uuid';

export interface ImportProgress {
  id: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  fileSize: number;
  video?: Video;
}

export interface BatchImportResult {
  successful: Video[];
  failed: ImportProgress[];
  totalProcessed: number;
}

export type ImportProgressCallback = (progresses: ImportProgress[]) => void;

export class VideoImportService {
  private supportedFormats = [
    'mp4', 'avi', 'mov', 'mkv', 'webm', 'wmv', 'flv', 'm4v', '3gp', 
    'ts', 'mts', 'mxf', 'ogv', 'f4v', 'asf', 'rm', 'rmvb', 'vob'
  ];
  
  private maxFileSize = 10 * 1024 * 1024 * 1024; // 10GB
  private concurrentLimit = 3; // Process 3 files simultaneously
  
  /**
   * Validate multiple files for import
   */
  validateFiles(files: File[]): {
    valid: File[];
    invalid: Array<{ file: File; reason: string }>;
  } {
    const valid: File[] = [];
    const invalid: Array<{ file: File; reason: string }> = [];
    
    for (const file of files) {
      // Check file size
      if (file.size > this.maxFileSize) {
        invalid.push({
          file,
          reason: `File size (${this.formatFileSize(file.size)}) exceeds maximum limit of ${this.formatFileSize(this.maxFileSize)}`
        });
        continue;
      }
      
      // Check if file is empty
      if (file.size === 0) {
        invalid.push({ file, reason: 'File is empty' });
        continue;
      }
      
      // Check file extension
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!extension || !this.supportedFormats.includes(extension)) {
        invalid.push({
          file,
          reason: `Unsupported format: ${extension || 'unknown'}. Supported: ${this.supportedFormats.join(', ')}`
        });
        continue;
      }
      
      valid.push(file);
    }
    
    return { valid, invalid };
  }
  
  /**
   * Validate file paths for Electron import
   */
  validateFilePaths(filePaths: string[]): {
    valid: string[];
    invalid: Array<{ path: string; reason: string }>;
  } {
    const valid: string[] = [];
    const invalid: Array<{ path: string; reason: string }> = [];
    
    for (const filePath of filePaths) {
      const extension = filePath.split('.').pop()?.toLowerCase();
      const filename = filePath.split(/[\\/]/).pop() || 'unknown';
      
      if (!extension || !this.supportedFormats.includes(extension)) {
        invalid.push({
          path: filePath,
          reason: `Unsupported format: ${extension || 'unknown'}`
        });
        continue;
      }
      
      valid.push(filePath);
    }
    
    return { valid, invalid };
  }
  
  /**
   * Import files with progress tracking
   */
  async importFiles(
    files: File[], 
    onProgress?: ImportProgressCallback
  ): Promise<BatchImportResult> {
    const { valid, invalid } = this.validateFiles(files);
    
    // Initialize progress tracking
    const progresses: ImportProgress[] = valid.map(file => ({
      id: uuidv4(),
      filename: file.name,
      status: 'pending',
      progress: 0,
      fileSize: file.size
    }));
    
    // Add failed validations
    const failedProgresses: ImportProgress[] = invalid.map(({ file, reason }) => ({
      id: uuidv4(),
      filename: file.name,
      status: 'failed',
      progress: 0,
      error: reason,
      fileSize: file.size
    }));
    
    // Initial progress callback
    onProgress?.([...progresses, ...failedProgresses]);
    
    const successful: Video[] = [];
    const failed: ImportProgress[] = [...failedProgresses];
    
    // Process files in batches
    const batches = this.createBatches(valid, this.concurrentLimit);
    
    for (const batch of batches) {
      const batchPromises = batch.map(async (file, index) => {
        const progressIndex = valid.indexOf(file);
        const progressItem = progresses[progressIndex];
        
        try {
          // Update status to processing
          progressItem.status = 'processing';
          progressItem.progress = 0;
          onProgress?.([...progresses, ...failedProgresses]);
          
          // Create file URL for processing
          const fileUrl = URL.createObjectURL(file);
          
          try {
            // Extract metadata with progress updates
            progressItem.progress = 25;
            onProgress?.([...progresses, ...failedProgresses]);
            
            const metadata = await this.extractMetadataFromFile(file);
            
            progressItem.progress = 50;
            onProgress?.([...progresses, ...failedProgresses]);
            
            // Generate thumbnail
            const thumbnail = await this.generateThumbnailFromFile(file, metadata.duration * 0.1);
            
            progressItem.progress = 75;
            onProgress?.([...progresses, ...failedProgresses]);
            
            // Create video object
            const video: Video = {
              id: uuidv4(),
              name: file.name,
              path: fileUrl,
              size: file.size,
              duration: metadata.duration,
              format: metadata.format,
              resolution: `${metadata.width}x${metadata.height}`,
              fps: metadata.frameRate,
              bitrate: metadata.bitrate || 0,
              status: 'ready',
              thumbnail,
              metadata: {
                width: metadata.width,
                height: metadata.height,
                aspectRatio: this.calculateAspectRatio(metadata.width, metadata.height),
                codec: metadata.codec,
                audioCodec: metadata.audioCodec,
                audioChannels: metadata.audioChannels,
                audioSampleRate: metadata.audioSampleRate,
                frameRate: metadata.frameRate,
                duration: metadata.duration,
                hasAudio: metadata.hasAudio,
                hasVideo: metadata.hasVideo,
                bitrate: metadata.bitrate
              },
              createdAt: Date.now(),
              modifiedAt: Date.now(),
              originalFile: file // Store reference for browser-based operations
            };
            
            progressItem.status = 'completed';
            progressItem.progress = 100;
            progressItem.video = video;
            onProgress?.([...progresses, ...failedProgresses]);
            
            return video;
            
          } finally {
            // Clean up object URL if not used
            if (!progressItem.video) {
              URL.revokeObjectURL(fileUrl);
            }
          }
          
        } catch (error) {
          progressItem.status = 'failed';
          progressItem.error = error instanceof Error ? error.message : 'Unknown error occurred';
          failed.push(progressItem);
          onProgress?.([...progresses, ...failedProgresses]);
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      successful.push(...batchResults.filter((v): v is Video => v !== null));
    }
    
    return {
      successful,
      failed,
      totalProcessed: files.length
    };
  }
  
  /**
   * Import file paths via Electron
   */
  async importFilePaths(
    filePaths: string[],
    onProgress?: ImportProgressCallback
  ): Promise<BatchImportResult> {
    if (!window?.electronAPI) {
      throw new Error('Electron API not available');
    }
    
    const { valid, invalid } = this.validateFilePaths(filePaths);
    
    // Initialize progress tracking
    const progresses: ImportProgress[] = valid.map(filePath => ({
      id: uuidv4(),
      filename: filePath.split(/[\\/]/).pop() || 'unknown',
      status: 'pending',
      progress: 0,
      fileSize: 0 // Will be updated when we get metadata
    }));
    
    // Add failed validations
    const failedProgresses: ImportProgress[] = invalid.map(({ path, reason }) => ({
      id: uuidv4(),
      filename: path.split(/[\\/]/).pop() || 'unknown',
      status: 'failed',
      progress: 0,
      error: reason,
      fileSize: 0
    }));
    
    onProgress?.([...progresses, ...failedProgresses]);
    
    const successful: Video[] = [];
    const failed: ImportProgress[] = [...failedProgresses];
    
    // Process files in batches
    const batches = this.createBatches(valid, this.concurrentLimit);
    
    for (const batch of batches) {
      const batchPromises = batch.map(async (filePath) => {
        const progressIndex = valid.indexOf(filePath);
        const progressItem = progresses[progressIndex];
        
        try {
          progressItem.status = 'processing';
          progressItem.progress = 0;
          onProgress?.([...progresses, ...failedProgresses]);
          
          // Get metadata using Electron API
          const metadata = await window.electronAPI!.getVideoMetadata(filePath);
          if (!metadata) {
            throw new Error('Failed to extract video metadata');
          }
          
          progressItem.fileSize = metadata.size || 0;
          progressItem.progress = 40;
          onProgress?.([...progresses, ...failedProgresses]);
          
          // Generate thumbnail
          const thumbnailTime = Math.min(metadata.duration * 0.1, 5);
          let thumbnail = '';
          try {
            thumbnail = await window.electronAPI!.extractThumbnail(filePath, thumbnailTime);
          } catch (error) {
            console.warn('Failed to generate thumbnail:', error);
          }
          
          progressItem.progress = 80;
          onProgress?.([...progresses, ...failedProgresses]);
          
          // Create video object
          const video: Video = {
            id: uuidv4(),
            name: progressItem.filename,
            path: filePath,
            size: metadata.size || 0,
            duration: metadata.duration || 0,
            format: metadata.format || 'unknown',
            resolution: metadata.resolution || '0x0',
            fps: metadata.fps || 0,
            bitrate: metadata.bitrate || 0,
            status: 'ready',
            thumbnail,
            metadata: {
              width: metadata.width || 0,
              height: metadata.height || 0,
              aspectRatio: metadata.aspectRatio || this.calculateAspectRatio(metadata.width || 0, metadata.height || 0),
              codec: metadata.codec || 'unknown',
              audioCodec: metadata.audioCodec,
              audioChannels: metadata.audioChannels,
              audioSampleRate: metadata.audioSampleRate,
              frameRate: metadata.fps || 0,
              duration: metadata.duration || 0,
              hasAudio: metadata.hasAudio || false,
              hasVideo: metadata.hasVideo !== false,
              bitrate: metadata.bitrate
            },
            createdAt: Date.now(),
            modifiedAt: Date.now()
          };
          
          progressItem.status = 'completed';
          progressItem.progress = 100;
          progressItem.video = video;
          onProgress?.([...progresses, ...failedProgresses]);
          
          return video;
          
        } catch (error) {
          progressItem.status = 'failed';
          progressItem.error = error instanceof Error ? error.message : 'Unknown error occurred';
          failed.push(progressItem);
          onProgress?.([...progresses, ...failedProgresses]);
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      successful.push(...batchResults.filter((v): v is Video => v !== null));
    }
    
    return {
      successful,
      failed,
      totalProcessed: filePaths.length
    };
  }
  
  /**
   * Extract metadata from File object using HTML5 video
   */
  private async extractMetadataFromFile(file: File): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);
      
      video.onloadedmetadata = () => {
        const metadata: VideoMetadata = {
          width: video.videoWidth,
          height: video.videoHeight,
          duration: video.duration,
          frameRate: 30, // Default, can't be detected reliably in browser
          format: file.type.split('/')[1] || 'unknown',
          codec: 'unknown', // Can't be detected in browser
          hasAudio: true, // Assume true, can't be detected reliably
          hasVideo: video.videoWidth > 0 && video.videoHeight > 0,
          aspectRatio: this.calculateAspectRatio(video.videoWidth, video.videoHeight),
          bitrate: undefined // Can't be detected in browser
        };
        
        URL.revokeObjectURL(url);
        resolve(metadata);
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load video metadata'));
      };
      
      video.src = url;
    });
  }
  
  /**
   * Generate thumbnail from File object
   */
  private async generateThumbnailFromFile(file: File, timeStamp: number = 5): Promise<string> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Cannot create canvas context'));
        return;
      }
      
      const url = URL.createObjectURL(file);
      
      video.onloadedmetadata = () => {
        video.currentTime = Math.min(timeStamp, video.duration * 0.5);
      };
      
      video.onseeked = () => {
        // Set canvas size to video dimensions (max 320x240)
        const maxWidth = 320;
        const maxHeight = 240;
        let { width, height } = video;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, width, height);
        
        // Convert to data URL
        const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
        URL.revokeObjectURL(url);
        resolve(thumbnail);
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load video for thumbnail generation'));
      };
      
      video.src = url;
    });
  }
  
  /**
   * Calculate aspect ratio string
   */
  private calculateAspectRatio(width: number, height: number): string {
    if (width === 0 || height === 0) return '16:9';
    
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(width, height);
    
    return `${width / divisor}:${height / divisor}`;
  }
  
  /**
   * Create batches for parallel processing
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }
  
  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}

export const videoImportService = new VideoImportService();