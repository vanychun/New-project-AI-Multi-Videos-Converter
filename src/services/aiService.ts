import { AISettings } from '../types/video.types';

export interface AIModel {
  id: string;
  name: string;
  type: 'upscaling' | 'interpolation' | 'face_enhancement' | 'denoising' | 'style_transfer';
  size: string;
  description: string;
  downloaded: boolean;
  downloadProgress?: number;
  requirements: {
    vram: number; // GB
    ram: number; // GB
    cudaVersion?: string;
  };
}

export class AIService {
  private baseUrl = 'http://127.0.0.1:8001';
  private activeJobs: Map<string, string> = new Map(); // jobId -> backendJobId
  
  /**
   * Check if AI backend is available
   */
  async checkBackendStatus(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/`);
      return response.ok;
    } catch (error) {
      console.error('AI backend not available:', error);
      return false;
    }
  }
  
  /**
   * Get system information from AI backend
   */
  async getSystemInfo(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/system-info`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get system info:', error);
      throw error;
    }
  }
  
  /**
   * Get available AI models
   */
  async getAvailableModels(): Promise<AIModel[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models/available`);
      const data = await response.json();
      return this.parseModelsResponse(data);
    } catch (error) {
      console.error('Failed to get available models:', error);
      return this.getDefaultModels();
    }
  }
  
  /**
   * Download AI model
   */
  async downloadModel(
    modelName: string,
    modelType: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    try {
      const formData = new FormData();
      formData.append('model_id', modelName);
      
      const response = await fetch(`${this.baseUrl}/models/download`, {
        method: 'POST',
        body: formData, // Use FormData instead of JSON
      });
      
      const result = await response.json();
      
      if (result.job_id) {
        // Poll for download progress
        await this.pollJobProgress(result.job_id, onProgress);
      }
    } catch (error) {
      console.error('Failed to download model:', error);
      throw error;
    }
  }
  
  /**
   * Process video with AI upscaling
   */
  async upscaleVideo(
    videoPath: string,
    outputPath: string,
    settings: AISettings['upscaling'],
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/process/upscale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_path: videoPath,
          output_path: outputPath,
          settings: {
            upscaling: {
              factor: settings.factor,
              model: settings.model,
              quality: settings.quality,
            }
          }
        }),
      });
      
      const result = await response.json();
      
      if (result.job_id) {
        this.activeJobs.set(result.job_id, result.job_id);
        await this.pollJobProgress(result.job_id, onProgress);
        return outputPath;
      }
      
      throw new Error('Failed to start upscaling job');
    } catch (error) {
      console.error('Failed to upscale video:', error);
      throw error;
    }
  }
  
  /**
   * Process video with frame interpolation
   */
  async interpolateFrames(
    videoPath: string,
    outputPath: string,
    settings: AISettings['frameInterpolation'],
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/process/interpolate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_path: videoPath,
          output_path: outputPath,
          settings: {
            frame_interpolation: {
              target_fps: settings.targetFps,
              model: settings.model,
            }
          }
        }),
      });
      
      const result = await response.json();
      
      if (result.job_id) {
        this.activeJobs.set(result.job_id, result.job_id);
        await this.pollJobProgress(result.job_id, onProgress);
        return outputPath;
      }
      
      throw new Error('Failed to start frame interpolation job');
    } catch (error) {
      console.error('Failed to interpolate frames:', error);
      throw error;
    }
  }
  
  /**
   * Process video with face enhancement
   */
  async enhanceFaces(
    videoPath: string,
    outputPath: string,
    settings: AISettings['faceEnhancement'],
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/process/enhance-faces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_path: videoPath,
          output_path: outputPath,
          settings: {
            face_enhancement: {
              strength: settings.strength,
              model: settings.model,
            }
          }
        }),
      });
      
      const result = await response.json();
      
      if (result.job_id) {
        this.activeJobs.set(result.job_id, result.job_id);
        await this.pollJobProgress(result.job_id, onProgress);
        return outputPath;
      }
      
      throw new Error('Failed to start face enhancement job');
    } catch (error) {
      console.error('Failed to enhance faces:', error);
      throw error;
    }
  }
  
  /**
   * Process video with denoising
   */
  async denoiseVideo(
    videoPath: string,
    outputPath: string,
    settings: AISettings['denoising'],
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/process/denoise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_path: videoPath,
          output_path: outputPath,
          settings: {
            denoising: {
              level: settings.level,
              model: settings.model,
            }
          }
        }),
      });
      
      const result = await response.json();
      
      if (result.job_id) {
        this.activeJobs.set(result.job_id, result.job_id);
        await this.pollJobProgress(result.job_id, onProgress);
        return outputPath;
      }
      
      throw new Error('Failed to start denoising job');
    } catch (error) {
      console.error('Failed to denoise video:', error);
      throw error;
    }
  }
  
  /**
   * Cancel AI processing job
   */
  async cancelJob(jobId: string): Promise<void> {
    const backendJobId = this.activeJobs.get(jobId);
    
    if (backendJobId) {
      try {
        await fetch(`${this.baseUrl}/job/${backendJobId}`, {
          method: 'DELETE',
        });
        
        this.activeJobs.delete(jobId);
      } catch (error) {
        console.error('Failed to cancel AI job:', error);
        throw error;
      }
    }
  }
  
  /**
   * Get job status from AI backend
   */
  async getJobStatus(jobId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/job/${jobId}/status`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get job status:', error);
      throw error;
    }
  }
  
  /**
   * Estimate processing time for AI enhancement
   */
  estimateProcessingTime(
    videoDuration: number,
    resolution: string,
    aiSettings: AISettings
  ): number {
    let baseTime = videoDuration;
    
    // Upscaling factor
    if (aiSettings.upscaling.enabled) {
      const upscaleFactors: Record<number, number> = {
        2: 3.0,
        4: 8.0,
        8: 20.0,
      };
      baseTime *= upscaleFactors[aiSettings.upscaling.factor] || 3.0;
    }
    
    // Frame interpolation factor
    if (aiSettings.frameInterpolation.enabled) {
      const fpsMultiplier = aiSettings.frameInterpolation.targetFps / 30; // Assume 30fps input
      baseTime *= Math.max(1.5, fpsMultiplier * 2);
    }
    
    // Face enhancement factor
    if (aiSettings.faceEnhancement.enabled) {
      baseTime *= 1.8;
    }
    
    // Denoising factor
    if (aiSettings.denoising.enabled) {
      const denoiseFactors: Record<string, number> = {
        light: 1.3,
        medium: 1.6,
        strong: 2.0,
      };
      baseTime *= denoiseFactors[aiSettings.denoising.level] || 1.6;
    }
    
    // Resolution factor
    const resolutionFactors: Record<string, number> = {
      '720p': 1.0,
      '1080p': 2.0,
      '1440p': 3.5,
      '2160p': 6.0,
    };
    baseTime *= resolutionFactors[resolution] || 2.0;
    
    return Math.round(baseTime);
  }
  
  /**
   * Check if settings are compatible with hardware
   */
  async validateAISettings(settings: AISettings): Promise<{ valid: boolean; warnings: string[] }> {
    const warnings: string[] = [];
    
    try {
      const systemInfo = await this.getSystemInfo();
      
      // Check GPU memory requirements
      let requiredVRAM = 2; // Base requirement
      
      if (settings.upscaling.enabled) {
        requiredVRAM += settings.upscaling.factor * 1.5;
      }
      
      if (settings.frameInterpolation.enabled) {
        requiredVRAM += 3;
      }
      
      if (settings.faceEnhancement.enabled) {
        requiredVRAM += 2;
      }
      
      if (systemInfo.gpu_memory && systemInfo.gpu_memory < requiredVRAM * 1024) {
        warnings.push(`Insufficient GPU memory. Required: ${requiredVRAM}GB, Available: ${Math.round(systemInfo.gpu_memory / 1024)}GB`);
      }
      
      // Check if too many features are enabled
      const enabledFeatures = [
        settings.upscaling.enabled,
        settings.frameInterpolation.enabled,
        settings.faceEnhancement.enabled,
        settings.denoising.enabled,
      ].filter(Boolean).length;
      
      if (enabledFeatures > 2) {
        warnings.push('Multiple AI features enabled will significantly increase processing time');
      }
      
      return {
        valid: warnings.length === 0,
        warnings,
      };
      
    } catch (error) {
      return {
        valid: false,
        warnings: ['Cannot validate AI settings: Backend unavailable'],
      };
    }
  }
  
  // Private methods
  private async pollJobProgress(jobId: string, onProgress?: (progress: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const pollInterval = setInterval(async () => {
        try {
          const status = await this.getJobStatus(jobId);
          
          if (onProgress && typeof status.progress === 'number') {
            onProgress(status.progress);
          }
          
          if (status.status === 'completed') {
            clearInterval(pollInterval);
            resolve();
          } else if (status.status === 'error') {
            clearInterval(pollInterval);
            reject(new Error(status.error || 'AI processing failed'));
          } else if (status.status === 'cancelled') {
            clearInterval(pollInterval);
            reject(new Error('AI processing was cancelled'));
          }
        } catch (error) {
          clearInterval(pollInterval);
          reject(error);
        }
      }, 1000); // Poll every second
      
      // Timeout after 30 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        reject(new Error('AI processing timeout'));
      }, 30 * 60 * 1000);
    });
  }
  
  private parseModelsResponse(data: any): AIModel[] {
    // Parse the response from the AI backend
    return data.models || this.getDefaultModels();
  }
  
  private getDefaultModels(): AIModel[] {
    return [
      {
        id: 'realesrgan-x4plus',
        name: 'Real-ESRGAN x4plus',
        type: 'upscaling',
        size: '67 MB',
        description: 'General purpose 4x upscaling model',
        downloaded: false,
        requirements: { vram: 4, ram: 8 },
      },
      {
        id: 'realesrgan-x4plus-anime',
        name: 'Real-ESRGAN x4plus Anime',
        type: 'upscaling',
        size: '67 MB',
        description: 'Optimized for anime and cartoon content',
        downloaded: false,
        requirements: { vram: 4, ram: 8 },
      },
      {
        id: 'rife',
        name: 'RIFE Frame Interpolation',
        type: 'interpolation',
        size: '45 MB',
        description: 'Real-time intermediate frame enhancement',
        downloaded: false,
        requirements: { vram: 6, ram: 8 },
      },
      {
        id: 'gfpgan',
        name: 'GFPGAN Face Enhancement',
        type: 'face_enhancement',
        size: '348 MB',
        description: 'GAN-based face restoration',
        downloaded: false,
        requirements: { vram: 4, ram: 8 },
      },
      {
        id: 'dncnn',
        name: 'DnCNN Denoising',
        type: 'denoising',
        size: '556 KB',
        description: 'Deep CNN for image denoising',
        downloaded: false,
        requirements: { vram: 2, ram: 4 },
      },
    ];
  }
}

export const aiService = new AIService();