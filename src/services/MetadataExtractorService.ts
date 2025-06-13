import { VideoMetadata } from '../types/video-enhanced.types';

export interface MetadataExtractionOptions {
  extractThumbnails?: boolean;
  analysisDepth?: 'basic' | 'detailed' | 'comprehensive';
  timeout?: number; // in seconds
  includeAdvancedCodecInfo?: boolean;
  analyzeQuality?: boolean;
}

export interface MetadataExtractionResult {
  metadata: VideoMetadata;
  extractionTime: number; // in milliseconds
  success: boolean;
  error?: string;
  warnings?: string[];
  rawData?: any; // Raw FFprobe output
}

export interface QualityAnalysis {
  overallScore: number; // 0-100
  factors: {
    resolution: number;
    bitrate: number;
    frameRate: number;
    audioQuality: number;
    compression: number;
  };
  suggestions: string[];
  issues: string[];
}

export class MetadataExtractorService {
  private static instance: MetadataExtractorService;
  private readonly ffprobePath: string;
  private readonly MAX_CONCURRENT_EXTRACTIONS = 3;
  private activeExtractions = 0;
  private extractionQueue: Array<() => void> = [];

  public static getInstance(): MetadataExtractorService {
    if (!MetadataExtractorService.instance) {
      MetadataExtractorService.instance = new MetadataExtractorService();
    }
    return MetadataExtractorService.instance;
  }

  private constructor() {
    // In Electron context, ffprobe-static would provide the path
    this.ffprobePath = this.detectFFprobePath();
  }

  /**
   * Extract comprehensive metadata from video file
   */
  public async extractMetadata(
    file: File,
    options: MetadataExtractionOptions = {}
  ): Promise<MetadataExtractionResult> {
    const startTime = performance.now();
    const defaultOptions: Required<MetadataExtractionOptions> = {
      extractThumbnails: false,
      analysisDepth: 'detailed',
      timeout: 30,
      includeAdvancedCodecInfo: true,
      analyzeQuality: true,
      ...options
    };

    try {
      // Wait for extraction slot
      await this.waitForExtractionSlot();
      this.activeExtractions++;

      // Create temporary file path for analysis
      const tempPath = await this.createTempFile(file);

      try {
        // Run FFprobe analysis
        const probeResult = await this.runFFprobe(tempPath, defaultOptions);
        
        // Parse and enhance metadata
        const metadata = await this.parseFFprobeOutput(probeResult, file, defaultOptions);
        
        // Cleanup
        await this.cleanupTempFile(tempPath);
        
        const extractionTime = performance.now() - startTime;
        
        return {
          metadata,
          extractionTime,
          success: true,
          rawData: probeResult
        };

      } catch (error) {
        await this.cleanupTempFile(tempPath);
        throw error;
      }

    } catch (error) {
      const extractionTime = performance.now() - startTime;
      return {
        metadata: this.createFallbackMetadata(file),
        extractionTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    } finally {
      this.activeExtractions--;
      this.processQueue();
    }
  }

  /**
   * Extract metadata from multiple files in batch
   */
  public async extractBatchMetadata(
    files: File[],
    options: MetadataExtractionOptions = {}
  ): Promise<Map<string, MetadataExtractionResult>> {
    const results = new Map<string, MetadataExtractionResult>();
    
    // Process files in batches to avoid overwhelming the system
    const BATCH_SIZE = 2;
    const batches = this.chunkArray(files, BATCH_SIZE);
    
    for (const batch of batches) {
      const batchPromises = batch.map(async (file) => {
        try {
          const result = await this.extractMetadata(file, options);
          results.set(file.name, result);
          return result;
        } catch (error) {
          const fallbackResult: MetadataExtractionResult = {
            metadata: this.createFallbackMetadata(file),
            extractionTime: 0,
            success: false,
            error: error instanceof Error ? error.message : 'Batch processing error'
          };
          results.set(file.name, fallbackResult);
          return fallbackResult;
        }
      });
      
      await Promise.all(batchPromises);
    }
    
    return results;
  }

  /**
   * Analyze video quality and provide recommendations
   */
  public async analyzeQuality(metadata: VideoMetadata): Promise<QualityAnalysis> {
    const factors = {
      resolution: this.scoreResolution(metadata.resolution),
      bitrate: this.scoreBitrate(metadata.bitrate, metadata.resolution),
      frameRate: this.scoreFrameRate(metadata.frameRate),
      audioQuality: this.scoreAudioQuality(metadata),
      compression: this.scoreCompression(metadata)
    };

    const overallScore = Object.values(factors).reduce((sum, score) => sum + score, 0) / 5;
    
    const suggestions = this.generateQualitySuggestions(factors, metadata);
    const issues = this.identifyQualityIssues(factors, metadata);

    return {
      overallScore: Math.round(overallScore),
      factors,
      suggestions,
      issues
    };
  }

  /**
   * Get optimal processing settings based on metadata
   */
  public getOptimalProcessingSettings(metadata: VideoMetadata): {
    recommendedFormat: string;
    recommendedResolution: { width: number; height: number };
    recommendedBitrate: number;
    recommendedFrameRate: number;
    processingComplexity: 'low' | 'medium' | 'high';
    estimatedProcessingTime: number; // in seconds
  } {
    const { width, height } = metadata.resolution;
    const currentPixels = width * height;

    // Determine processing complexity
    let processingComplexity: 'low' | 'medium' | 'high' = 'low';
    if (currentPixels > 2073600) processingComplexity = 'high'; // > 1080p
    else if (currentPixels > 921600) processingComplexity = 'medium'; // > 720p

    // Estimate processing time (rough calculation)
    const baseTimePerSecond = processingComplexity === 'high' ? 2 : 
                             processingComplexity === 'medium' ? 1 : 0.5;
    const estimatedProcessingTime = metadata.duration * baseTimePerSecond;

    return {
      recommendedFormat: this.getOptimalFormat(metadata),
      recommendedResolution: this.getOptimalResolution(metadata.resolution),
      recommendedBitrate: this.getOptimalBitrate(metadata),
      recommendedFrameRate: this.getOptimalFrameRate(metadata.frameRate),
      processingComplexity,
      estimatedProcessingTime
    };
  }

  /**
   * Run FFprobe analysis
   */
  private async runFFprobe(
    filePath: string, 
    options: Required<MetadataExtractionOptions>
  ): Promise<any> {
    // In a real Electron app, this would use child_process to run ffprobe
    // For now, we'll simulate the FFprobe analysis
    return new Promise((resolve, reject) => {
      // Simulate FFprobe execution delay
      setTimeout(() => {
        try {
          // Mock FFprobe output structure
          const mockProbeData = {
            streams: [
              {
                index: 0,
                codec_name: "h264",
                codec_long_name: "H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10",
                profile: "High",
                codec_type: "video",
                codec_tag_string: "avc1",
                width: 1920,
                height: 1080,
                coded_width: 1920,
                coded_height: 1080,
                r_frame_rate: "30/1",
                avg_frame_rate: "30/1",
                time_base: "1/30000",
                duration_ts: 1500000,
                duration: "50.000000",
                bit_rate: "5000000",
                bits_per_raw_sample: "8",
                nb_frames: "1500",
                sample_aspect_ratio: "1:1",
                display_aspect_ratio: "16:9",
                pix_fmt: "yuv420p",
                level: 40,
                color_range: "tv",
                color_space: "bt709",
                color_transfer: "bt709",
                color_primaries: "bt709",
                tags: {
                  language: "und",
                  handler_name: "VideoHandler"
                }
              },
              {
                index: 1,
                codec_name: "aac",
                codec_long_name: "AAC (Advanced Audio Coding)",
                profile: "LC",
                codec_type: "audio",
                codec_tag_string: "mp4a",
                sample_fmt: "fltp",
                sample_rate: "48000",
                channels: 2,
                channel_layout: "stereo",
                bits_per_sample: 0,
                r_frame_rate: "0/0",
                avg_frame_rate: "0/0",
                time_base: "1/48000",
                duration_ts: 2400000,
                duration: "50.000000",
                bit_rate: "128000",
                nb_frames: "2344",
                tags: {
                  language: "und",
                  handler_name: "SoundHandler"
                }
              }
            ],
            format: {
              filename: filePath,
              nb_streams: 2,
              nb_programs: 0,
              format_name: "mov,mp4,m4a,3gp,3g2,mj2",
              format_long_name: "QuickTime / MOV",
              start_time: "0.000000",
              duration: "50.000000",
              size: "31250000",
              bit_rate: "5000000",
              probe_score: 100,
              tags: {
                major_brand: "isom",
                minor_version: "512",
                compatible_brands: "isomiso2avc1mp41",
                encoder: "Lavf58.29.100"
              }
            }
          };

          resolve(mockProbeData);
        } catch (error) {
          reject(new Error(`FFprobe analysis failed: ${error}`));
        }
      }, 500 + Math.random() * 1500); // Simulate variable processing time
    });
  }

  /**
   * Parse FFprobe output into our metadata format
   */
  private async parseFFprobeOutput(
    probeData: any,
    file: File,
    options: Required<MetadataExtractionOptions>
  ): Promise<VideoMetadata> {
    const videoStream = probeData.streams.find((s: any) => s.codec_type === 'video');
    const audioStream = probeData.streams.find((s: any) => s.codec_type === 'audio');
    const format = probeData.format;

    if (!videoStream) {
      throw new Error('No video stream found in file');
    }

    // Parse duration
    const duration = parseFloat(format.duration || videoStream.duration || '0');
    
    // Parse resolution
    const width = parseInt(videoStream.width) || 0;
    const height = parseInt(videoStream.height) || 0;
    
    // Parse frame rate
    const frameRateStr = videoStream.r_frame_rate || videoStream.avg_frame_rate || '30/1';
    const [numerator, denominator] = frameRateStr.split('/').map(Number);
    const frameRate = denominator ? numerator / denominator : 30;
    
    // Parse bitrate
    const bitrate = parseInt(format.bit_rate || videoStream.bit_rate || '0') / 1000; // Convert to kbps
    
    // Parse codec
    const codec = videoStream.codec_name || 'unknown';
    
    // Count audio tracks
    const audioTracks = probeData.streams.filter((s: any) => s.codec_type === 'audio').length;
    
    // Determine format
    const formatName = this.determineFormat(format.format_name, file.name);
    
    // Calculate aspect ratio
    const aspectRatio = this.calculateAspectRatio(width, height);
    
    // Extract additional metadata
    const colorSpace = videoStream.color_space || videoStream.colorspace;
    const profile = videoStream.profile;

    const metadata: VideoMetadata = {
      duration,
      resolution: { width, height },
      frameRate,
      bitrate,
      codec,
      audioTracks,
      format: formatName,
      size: file.size,
      aspectRatio,
      hasAudio: audioTracks > 0,
      colorSpace,
      profile
    };

    return metadata;
  }

  /**
   * Create fallback metadata when extraction fails
   */
  private createFallbackMetadata(file: File): VideoMetadata {
    const extension = file.name.split('.').pop()?.toLowerCase() || 'unknown';
    
    return {
      duration: 0,
      resolution: { width: 0, height: 0 },
      frameRate: 0,
      bitrate: 0,
      codec: 'unknown',
      audioTracks: 0,
      format: extension,
      size: file.size,
      aspectRatio: '0:0',
      hasAudio: false
    };
  }

  /**
   * Quality scoring methods
   */
  private scoreResolution(resolution: { width: number; height: number }): number {
    const pixels = resolution.width * resolution.height;
    
    if (pixels >= 7680 * 4320) return 100; // 8K
    if (pixels >= 3840 * 2160) return 95;  // 4K
    if (pixels >= 1920 * 1080) return 85;  // 1080p
    if (pixels >= 1280 * 720) return 70;   // 720p
    if (pixels >= 854 * 480) return 50;    // 480p
    if (pixels >= 640 * 360) return 30;    // 360p
    return 10; // Lower resolutions
  }

  private scoreBitrate(bitrate: number, resolution: { width: number; height: number }): number {
    const pixels = resolution.width * resolution.height;
    const idealBitrate = this.getIdealBitrate(pixels);
    const ratio = bitrate / idealBitrate;
    
    if (ratio >= 0.8 && ratio <= 1.5) return 100; // Optimal range
    if (ratio >= 0.6 && ratio <= 2.0) return 80;  // Good range
    if (ratio >= 0.4 && ratio <= 3.0) return 60;  // Acceptable range
    if (ratio >= 0.2 && ratio <= 5.0) return 40;  // Poor range
    return 20; // Very poor
  }

  private scoreFrameRate(frameRate: number): number {
    if (frameRate >= 60) return 100;
    if (frameRate >= 30) return 90;
    if (frameRate >= 24) return 80;
    if (frameRate >= 15) return 60;
    if (frameRate >= 10) return 40;
    return 20;
  }

  private scoreAudioQuality(metadata: VideoMetadata): number {
    if (!metadata.hasAudio) return 0;
    if (metadata.audioTracks > 1) return 100; // Multiple audio tracks
    return 80; // Single audio track
  }

  private scoreCompression(metadata: VideoMetadata): number {
    const { codec } = metadata;
    
    switch (codec.toLowerCase()) {
      case 'h265':
      case 'hevc':
        return 100; // Most efficient
      case 'h264':
      case 'avc':
        return 90;  // Very good
      case 'vp9':
        return 85;  // Good
      case 'vp8':
        return 70;  // Decent
      case 'mpeg4':
        return 60;  // Older but acceptable
      case 'xvid':
        return 50;  // Legacy
      default:
        return 40;  // Unknown/legacy codecs
    }
  }

  /**
   * Utility methods
   */
  private getIdealBitrate(pixels: number): number {
    // Rough bitrate recommendations (kbps) based on resolution
    if (pixels >= 7680 * 4320) return 80000; // 8K
    if (pixels >= 3840 * 2160) return 25000; // 4K
    if (pixels >= 1920 * 1080) return 8000;  // 1080p
    if (pixels >= 1280 * 720) return 5000;   // 720p
    if (pixels >= 854 * 480) return 2500;    // 480p
    return 1000; // Lower resolutions
  }

  private calculateAspectRatio(width: number, height: number): string {
    if (width === 0 || height === 0) return '0:0';
    
    const gcd = this.greatestCommonDivisor(width, height);
    return `${width / gcd}:${height / gcd}`;
  }

  private greatestCommonDivisor(a: number, b: number): number {
    return b === 0 ? a : this.greatestCommonDivisor(b, a % b);
  }

  private determineFormat(formatName: string, fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (formatName.includes('mp4')) return 'mp4';
    if (formatName.includes('avi')) return 'avi';
    if (formatName.includes('mov')) return 'mov';
    if (formatName.includes('webm')) return 'webm';
    if (formatName.includes('mkv')) return 'mkv';
    
    return extension || 'unknown';
  }

  private getOptimalFormat(metadata: VideoMetadata): string {
    // Recommend format based on codec and use case
    if (metadata.codec === 'h265' || metadata.codec === 'hevc') {
      return 'mp4'; // H.265 works best in MP4
    }
    if (metadata.codec === 'vp9') {
      return 'webm'; // VP9 is designed for WebM
    }
    return 'mp4'; // Default to MP4 for broad compatibility
  }

  private getOptimalResolution(current: { width: number; height: number }): { width: number; height: number } {
    // Return current resolution if it's already optimal
    const pixels = current.width * current.height;
    
    if (pixels <= 1920 * 1080) {
      return current; // Don't upscale smaller videos
    }
    
    // For larger videos, suggest 1080p as optimal balance
    return { width: 1920, height: 1080 };
  }

  private getOptimalBitrate(metadata: VideoMetadata): number {
    const pixels = metadata.resolution.width * metadata.resolution.height;
    return this.getIdealBitrate(pixels);
  }

  private getOptimalFrameRate(current: number): number {
    if (current > 60) return 60; // Cap at 60fps for most use cases
    if (current < 24) return 30; // Increase very low frame rates
    return current; // Keep current if reasonable
  }

  private generateQualitySuggestions(factors: any, metadata: VideoMetadata): string[] {
    const suggestions: string[] = [];
    
    if (factors.resolution < 70) {
      suggestions.push('Consider upscaling to improve resolution quality');
    }
    
    if (factors.bitrate < 60) {
      suggestions.push('Increase bitrate for better visual quality');
    }
    
    if (factors.frameRate < 60) {
      suggestions.push('Low frame rate detected - consider frame interpolation');
    }
    
    if (factors.compression < 70) {
      suggestions.push('Re-encode with modern codec (H.265/VP9) for better compression');
    }
    
    if (!metadata.hasAudio) {
      suggestions.push('No audio detected - consider adding audio track if needed');
    }
    
    return suggestions;
  }

  private identifyQualityIssues(factors: any, metadata: VideoMetadata): string[] {
    const issues: string[] = [];
    
    if (factors.resolution < 30) {
      issues.push('Very low resolution may result in poor viewing experience');
    }
    
    if (factors.bitrate < 30) {
      issues.push('Extremely low bitrate will cause visible compression artifacts');
    }
    
    if (factors.frameRate < 40) {
      issues.push('Low frame rate may cause choppy playback');
    }
    
    if (metadata.duration === 0) {
      issues.push('Unable to determine video duration - file may be corrupted');
    }
    
    return issues;
  }

  private detectFFprobePath(): string {
    // In a real Electron app, this would detect the actual ffprobe path
    // For development, we'll use a placeholder
    return 'ffprobe';
  }

  private async createTempFile(file: File): Promise<string> {
    // In a real implementation, this would create a temporary file
    // For now, we'll return a mock path
    return `/tmp/video_${Date.now()}_${file.name}`;
  }

  private async cleanupTempFile(path: string): Promise<void> {
    // In a real implementation, this would delete the temporary file
    // For now, we'll just log the cleanup
    console.log(`Cleaning up temp file: ${path}`);
  }

  private async waitForExtractionSlot(): Promise<void> {
    return new Promise((resolve) => {
      if (this.activeExtractions < this.MAX_CONCURRENT_EXTRACTIONS) {
        resolve();
      } else {
        this.extractionQueue.push(resolve);
      }
    });
  }

  private processQueue(): void {
    if (this.extractionQueue.length > 0 && this.activeExtractions < this.MAX_CONCURRENT_EXTRACTIONS) {
      const nextResolve = this.extractionQueue.shift();
      if (nextResolve) {
        nextResolve();
      }
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Get extraction statistics
   */
  public getStatistics(): {
    activeExtractions: number;
    queuedExtractions: number;
    maxConcurrent: number;
  } {
    return {
      activeExtractions: this.activeExtractions,
      queuedExtractions: this.extractionQueue.length,
      maxConcurrent: this.MAX_CONCURRENT_EXTRACTIONS
    };
  }

  /**
   * Clear extraction queue
   */
  public clearQueue(): void {
    this.extractionQueue.length = 0;
  }
}