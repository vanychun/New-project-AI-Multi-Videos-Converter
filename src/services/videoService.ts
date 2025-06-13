import { Video, VideoMetadata } from '../types/video.types';
import { fileRegistry } from '../store/middleware/videoStateMiddleware';

export class VideoService {
  private supportedFormats = ['mp4', 'avi', 'mov', 'mkv', 'webm', 'wmv', 'flv', 'm4v', '3gp'];
  private metadataCache = new Map<string, VideoMetadata>();
  private thumbnailCache = new Map<string, string>();
  
  /**
   * Validate if file is a supported video format
   */
  isValidVideoFile(file: File): boolean {
    const extension = file.name.split('.').pop()?.toLowerCase();
    return extension ? this.supportedFormats.includes(extension) : false;
  }

  /**
   * Validate video file with detailed information
   */
  async validateVideoFile(file: File): Promise<{
    isValid: boolean;
    error?: string;
    fileInfo: {
      name: string;
      size: number;
      type: string;
    };
  }> {
    const fileInfo = {
      name: file.name,
      size: file.size,
      type: file.type
    };

    // Check file size (10GB limit)
    const maxSize = 10 * 1024 * 1024 * 1024; // 10GB
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: 'File size exceeds maximum limit of 10GB',
        fileInfo
      };
    }

    // Check file extension
    if (!this.isValidVideoFile(file)) {
      return {
        isValid: false,
        error: `Unsupported file type: ${file.type}`,
        fileInfo
      };
    }

    return {
      isValid: true,
      fileInfo
    };
  }
  
  /**
   * Extract video metadata using FFmpeg or browser fallback
   */
  async extractMetadata(filePath: string, file?: File): Promise<VideoMetadata> {
    try {
      // Try Electron API first if available
      if (window.electronAPI && window.electronAPI.getVideoMetadata) {
        const metadata = await window.electronAPI.getVideoMetadata(filePath);
        return this.parseMetadata(metadata);
      }
      
      // Browser fallback using HTML5 video element
      if (file) {
        return await this.extractBrowserMetadata(file);
      }
      
      // Default fallback
      return this.getDefaultMetadata();
    } catch (error) {
      console.error('Failed to extract metadata:', error);
      return this.getDefaultMetadata();
    }
  }
  
  /**
   * Generate thumbnail for video
   */
  async generateThumbnail(filePath: string, timeStamp: number = 5, file?: File): Promise<string> {
    try {
      // Try Electron API first if available
      if (window.electronAPI && window.electronAPI.extractThumbnail) {
        return await window.electronAPI.extractThumbnail(filePath, timeStamp);
      }
      
      // Browser fallback using canvas
      if (file) {
        return await this.generateBrowserThumbnail(file, timeStamp);
      }
      
      return ''; // Return empty string if thumbnail generation fails
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
      return '';
    }
  }
  
  /**
   * Create Video object from file (browser)
   */
  async createVideoFromFile(file: File): Promise<Video> {
    if (!this.isValidVideoFile(file)) {
      throw new Error(`Unsupported video format: ${file.name}`);
    }
    
    // Create object URL for browser compatibility
    const objectUrl = URL.createObjectURL(file);
    
    const video: Video = {
      id: this.generateVideoId(),
      name: file.name,
      path: objectUrl, // Use object URL instead of file.path
      size: file.size,
      duration: 0,
      format: this.getFileExtension(file.name),
      resolution: '',
      fps: 0,
      bitrate: 0,
      status: 'ready',
      metadata: {} as VideoMetadata,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      // Note: originalFile will be handled by middleware and stored in fileRegistry
      originalFile: file, // This will be removed by middleware before storing in Redux
    };
    
    try {
      // Extract metadata with file object for browser compatibility
      video.metadata = await this.extractMetadata(video.path, file);
      video.duration = video.metadata.duration || 0;
      video.resolution = `${video.metadata.width}x${video.metadata.height}`;
      video.fps = video.metadata.frameRate;
      
      // Generate thumbnail with file object
      video.thumbnail = await this.generateThumbnail(video.path, 5, file);
      
    } catch (error) {
      console.warn(`Failed to process video ${file.name}:`, error);
      // Set default values if metadata extraction fails
      video.metadata = this.getDefaultMetadata();
      video.duration = 0;
      video.resolution = '1920x1080';
      video.fps = 30;
    }
    
    return video;
  }
  
  /**
   * Create Video object from file path (Electron)
   */
  async createVideoFromPath(filePath: string): Promise<Video> {
    const fileName = filePath.split(/[\\/]/).pop() || 'Unknown';
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
    
    if (!this.supportedFormats.includes(fileExtension)) {
      throw new Error(`Unsupported video format: ${fileName}`);
    }
    
    // Check if file is valid first
    const validation = await this.validateVideoFilePath(filePath);
    if (!validation.valid) {
      throw new Error(`Invalid video file: ${validation.error}`);
    }
    
    // Convert to file:// URL if needed
    const videoUrl = this.convertToFileUrl(filePath);
    
    const video: Video = {
      id: this.generateVideoId(),
      name: fileName,
      path: videoUrl, // Use file:// URL
      size: 0,
      duration: 0,
      format: fileExtension,
      resolution: '',
      fps: 0,
      bitrate: 0,
      status: 'ready',
      metadata: {} as VideoMetadata,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };
    
    try {
      // Load metadata and thumbnail
      video.metadata = await this.extractMetadata(filePath);
      video.duration = video.metadata.duration || 0;
      video.resolution = `${video.metadata.width}x${video.metadata.height}`;
      video.fps = video.metadata.frameRate;
      video.size = validation.size || await this.getFileSize(filePath);
      
      // Generate thumbnail
      video.thumbnail = await this.generateThumbnail(filePath);
      
    } catch (error) {
      console.warn(`Failed to process video ${fileName}:`, error);
      video.metadata = this.getDefaultMetadata();
      video.status = 'error';
    }
    
    return video;
  }
  
  /**
   * Create multiple Video objects from file paths (Electron)
   */
  async createVideosFromPaths(filePaths: string[]): Promise<Video[]> {
    console.log('createVideosFromPaths called with:', filePaths);
    
    // Validate all files first
    const validationPromises = filePaths.map(path => this.validateVideoFilePath(path));
    const validationResults = await Promise.allSettled(validationPromises);
    
    console.log('Validation results:', validationResults);
    
    const validPaths = filePaths.filter((_, index) => {
      const result = validationResults[index];
      return result.status === 'fulfilled' && result.value.valid;
    });
    
    // Generate thumbnails in batch for better performance
    const thumbnailPromises = this.generateThumbnailsBatch(validPaths);
    
    // Process valid files
    const videoPromises = validPaths.map(path => this.createVideoFromPath(path));
    const videos = await Promise.allSettled(videoPromises);
    
    // Wait for thumbnails to complete
    await thumbnailPromises;
    
    return videos
      .filter((result): result is PromiseFulfilledResult<Video> => result.status === 'fulfilled')
      .map(result => result.value);
  }
  
  /**
   * Create multiple Video objects from files
   */
  async createVideosFromFiles(files: File[]): Promise<Video[]> {
    const videos: Video[] = [];
    const errors: string[] = [];
    
    for (const file of files) {
      try {
        const video = await this.createVideoFromFile(file);
        videos.push(video);
      } catch (error) {
        errors.push(`${file.name}: ${error}`);
      }
    }
    
    if (errors.length > 0) {
      console.warn('Some files failed to process:', errors);
    }
    
    return videos;
  }
  
  /**
   * Update video trim points
   */
  updateVideoTrimPoints(video: Video, trimStart: number, trimEnd: number): Video {
    const maxEnd = video.duration;
    const validStart = Math.max(0, Math.min(trimStart, maxEnd - 1));
    const validEnd = Math.max(validStart + 1, Math.min(trimEnd, maxEnd));
    
    return {
      ...video,
      trimStart: validStart,
      trimEnd: validEnd,
      modifiedAt: Date.now(),
    };
  }
  
  /**
   * Get video duration considering trim points
   */
  getEffectiveDuration(video: Video): number {
    if (video.trimStart !== undefined && video.trimEnd !== undefined) {
      return video.trimEnd - video.trimStart;
    }
    return video.duration;
  }
  
  /**
   * Calculate total size of videos
   */
  calculateTotalSize(videos: Video[]): number {
    return videos.reduce((total, video) => total + video.size, 0);
  }
  
  /**
   * Calculate total duration of videos
   */
  calculateTotalDuration(videos: Video[]): number {
    return videos.reduce((total, video) => total + this.getEffectiveDuration(video), 0);
  }
  
  /**
   * Format file size to human readable string
   */
  formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
  
  /**
   * Format duration to human readable string
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
  
  /**
   * Get video aspect ratio
   */
  getAspectRatio(video: Video): number {
    return video.metadata.width / video.metadata.height;
  }
  
  /**
   * Check if video has audio
   */
  hasAudio(video: Video): boolean {
    return video.metadata.hasAudio;
  }
  
  /**
   * Get video codec information
   */
  getCodecInfo(video: Video): { video: string; audio?: string } {
    return {
      video: video.metadata.codec,
      audio: video.metadata.audioCodec,
    };
  }
  
  /**
   * Estimate processing time based on video properties
   */
  estimateProcessingTime(video: Video, processingType: 'convert' | 'ai_upscale' | 'ai_interpolate'): number {
    const baseDuration = this.getEffectiveDuration(video);
    const resolution = video.metadata.width * video.metadata.height;
    
    // Base processing time factors
    const factors = {
      convert: 0.5,       // 0.5x real-time for standard conversion
      ai_upscale: 5.0,    // 5x real-time for AI upscaling
      ai_interpolate: 3.0, // 3x real-time for frame interpolation
    };
    
    // Resolution multiplier (4K takes longer)
    const resolutionMultiplier = resolution > 2073600 ? 2.0 : 1.0; // 1920x1080 = 2073600
    
    return baseDuration * factors[processingType] * resolutionMultiplier;
  }
  
  /**
   * Validate video file path (Electron)
   */
  async validateVideoFilePath(filePath: string): Promise<{ valid: boolean; error?: string; size?: number }> {
    try {
      if (window.electronAPI?.validateVideoFile) {
        return await window.electronAPI.validateVideoFile(filePath);
      }
      return { valid: true }; // Fallback for browser
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Unknown validation error' 
      };
    }
  }
  
  /**
   * Generate thumbnails in batch (Electron)
   */
  async generateThumbnailsBatch(filePaths: string[]): Promise<Record<string, string>> {
    try {
      if (window.electronAPI?.extractThumbnailsBatch) {
        const thumbnails = await window.electronAPI.extractThumbnailsBatch(filePaths);
        
        // Update cache
        for (const [filePath, thumbnailPath] of Object.entries(thumbnails)) {
          if (thumbnailPath && typeof thumbnailPath === 'string') {
            this.thumbnailCache.set(`${filePath}_5`, thumbnailPath);
          }
        }
        
        return thumbnails;
      }
      return {};
    } catch (error) {
      console.error('Failed to generate thumbnails in batch:', error);
      return {};
    }
  }
  
  /**
   * Get file size (Electron)
   */
  async getFileSize(filePath: string): Promise<number> {
    try {
      if (window.electronAPI?.getFileSize) {
        return await window.electronAPI.getFileSize(filePath);
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }
  
  /**
   * Get processing statistics
   */
  getProcessingStats(videos: Video[]): {
    total: number;
    ready: number;
    processing: number;
    completed: number;
    error: number;
    totalSize: number;
    totalDuration: number;
  } {
    return {
      total: videos.length,
      ready: videos.filter(v => v.status === 'ready').length,
      processing: videos.filter(v => v.status === 'processing').length,
      completed: videos.filter(v => v.status === 'completed').length,
      error: videos.filter(v => v.status === 'error').length,
      totalSize: videos.reduce((sum, v) => sum + v.size, 0),
      totalDuration: videos.reduce((sum, v) => sum + v.duration, 0)
    };
  }
  
  /**
   * Validate video properties
   */
  validateVideoProperties(video: Partial<Video>): boolean {
    return !!(
      video.duration && video.duration > 0 &&
      video.size && video.size > 0 &&
      video.metadata?.width && video.metadata.width > 0 &&
      video.metadata?.height && video.metadata.height > 0
    );
  }

  /**
   * Process video files and return validation results
   */
  async processVideoFiles(files: File[]): Promise<Array<{ file: File; isValid: boolean; error?: string; video?: Video }>> {
    const results = [];
    
    for (const file of files) {
      try {
        if (!this.isValidVideoFile(file)) {
          results.push({
            file,
            isValid: false,
            error: `Unsupported video format: ${this.getFileExtension(file.name)}`
          });
          continue;
        }

        const video = await this.createVideoFromFile(file);
        
        if (this.validateVideoProperties(video)) {
          results.push({
            file,
            isValid: true,
            video
          });
        } else {
          results.push({
            file,
            isValid: false,
            error: 'Invalid video properties detected'
          });
        }
      } catch (error) {
        results.push({
          file,
          isValid: false,
          error: error instanceof Error ? error.message : 'Failed to extract video metadata'
        });
      }
    }
    
    return results;
  }

  /**
   * Generate batch thumbnails
   */
  async generateBatchThumbnails(videos: Video[]): Promise<Record<string, string>> {
    const thumbnails: Record<string, string> = {};
    
    for (const video of videos) {
      try {
        const thumbnail = await this.generateThumbnail(video.path, 5);
        thumbnails[video.id] = thumbnail;
      } catch (error) {
        console.error(`Failed to generate thumbnail for ${video.name}:`, error);
        thumbnails[video.id] = '';
      }
    }
    
    return thumbnails;
  }

  /**
   * Extract video metadata (alias for backward compatibility)
   */
  async extractVideoMetadata(filePath: string, file?: File): Promise<any> {
    try {
      if (window.electronAPI && window.electronAPI.getVideoMetadata) {
        return await window.electronAPI.getVideoMetadata(filePath);
      }
      
      if (file) {
        const metadata = await this.extractBrowserMetadata(file);
        return {
          duration: metadata.duration,
          width: metadata.width,
          height: metadata.height,
          frameRate: metadata.frameRate,
          codec: metadata.codec,
          format: 'unknown'
        };
      }
      
      throw new Error('No metadata extraction method available');
    } catch (error) {
      throw new Error(`Failed to extract metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if file type is supported
   */
  isFileTypeSupported(extension: string): boolean {
    return this.supportedFormats.includes(extension.toLowerCase());
  }

  /**
   * Extract file format from filename
   */
  extractFileFormat(filename: string): string {
    return this.getFileExtension(filename);
  }

  /**
   * Get File object for a video (from file registry)
   */
  getVideoFile(videoId: string): File | undefined {
    return fileRegistry.getFile(videoId);
  }

  /**
   * Check if video has an associated File object
   */
  hasVideoFile(videoId: string): boolean {
    return fileRegistry.hasFile(videoId);
  }

  /**
   * Clear caches
   */
  clearCaches(): void {
    this.metadataCache.clear();
    this.thumbnailCache.clear();
  }
  
  // Private helper methods
  private generateVideoId(): string {
    return `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }
  
  private convertToFileUrl(filePath: string): string {
    // If already a URL, return as is
    if (filePath.startsWith('http://') || 
        filePath.startsWith('https://') || 
        filePath.startsWith('file://') || 
        filePath.startsWith('blob:')) {
      return filePath;
    }
    
    // Convert Windows backslashes to forward slashes
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    // Add file:// protocol
    if (normalizedPath.startsWith('/')) {
      // Unix absolute path
      return `file://${normalizedPath}`;
    } else if (normalizedPath.match(/^[A-Za-z]:/)) {
      // Windows absolute path
      return `file:///${normalizedPath}`;
    } else {
      // Relative path - just return as is
      return normalizedPath;
    }
  }
  
  private parseMetadata(rawMetadata: any): VideoMetadata {
    return {
      width: rawMetadata.width || 1920,
      height: rawMetadata.height || 1080,
      aspectRatio: rawMetadata.aspect_ratio || '16:9',
      codec: rawMetadata.codec_name || 'h264',
      audioCodec: rawMetadata.audio_codec || 'aac',
      audioChannels: rawMetadata.audio_channels || 2,
      audioSampleRate: rawMetadata.audio_sample_rate || 44100,
      frameRate: rawMetadata.frame_rate || 30,
      duration: rawMetadata.duration || 0,
      bitDepth: rawMetadata.bit_depth || 8,
      colorSpace: rawMetadata.color_space || 'yuv420p',
      hasAudio: rawMetadata.has_audio || true,
      hasVideo: rawMetadata.has_video || true,
    };
  }
  
  private getDefaultMetadata(): VideoMetadata {
    return {
      width: 1920,
      height: 1080,
      aspectRatio: '16:9',
      codec: 'unknown',
      frameRate: 30,
      hasAudio: true,
      hasVideo: true,
      duration: 0,
      audioCodec: 'unknown',
      audioChannels: 2,
      audioSampleRate: 44100,
      bitDepth: 8,
      colorSpace: 'yuv420p'
    };
  }
  
  /**
   * Extract metadata using browser HTML5 video element
   */
  private async extractBrowserMetadata(file: File): Promise<VideoMetadata> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const objectUrl = URL.createObjectURL(file);
      
      video.onloadedmetadata = () => {
        const metadata: VideoMetadata = {
          width: video.videoWidth || 1920,
          height: video.videoHeight || 1080,
          aspectRatio: video.videoWidth && video.videoHeight ? 
            `${Math.round((video.videoWidth / video.videoHeight) * 100) / 100}:1` : '16:9',
          codec: 'unknown',
          frameRate: 30, // Default since we can't easily get this from HTML5
          duration: video.duration || 0,
          hasAudio: true, // Assume true
          hasVideo: true,
          audioCodec: 'unknown',
          audioChannels: 2,
          audioSampleRate: 44100,
          bitDepth: 8,
          colorSpace: 'yuv420p'
        };
        
        URL.revokeObjectURL(objectUrl);
        resolve(metadata);
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(this.getDefaultMetadata());
      };
      
      video.src = objectUrl;
    });
  }
  
  /**
   * Generate thumbnail using browser canvas
   */
  private async generateBrowserThumbnail(file: File, timeStamp: number = 5): Promise<string> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const objectUrl = URL.createObjectURL(file);
      
      video.onloadedmetadata = () => {
        // Set canvas size
        canvas.width = Math.min(video.videoWidth || 320, 320);
        canvas.height = Math.min(video.videoHeight || 180, 180);
        
        // Seek to timestamp
        video.currentTime = Math.min(timeStamp, video.duration || 5);
      };
      
      video.onseeked = () => {
        if (ctx) {
          // Draw video frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Convert to data URL
          const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
          URL.revokeObjectURL(objectUrl);
          resolve(thumbnail);
        } else {
          URL.revokeObjectURL(objectUrl);
          resolve('');
        }
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve('');
      };
      
      video.src = objectUrl;
    });
  }
}

export const videoService = new VideoService();