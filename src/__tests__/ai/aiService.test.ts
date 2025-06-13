import { aiService } from '../../services/aiService';
import { AISettings } from '../../types/video.types';

// Mock fetch globally
global.fetch = jest.fn();

describe('AIService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('checkBackendStatus', () => {
    it('should return true when backend is available', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'running' })
      });

      const result = await aiService.checkBackendStatus();
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('http://127.0.0.1:8001/');
    });

    it('should return false when backend is not available', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await aiService.checkBackendStatus();
      expect(result).toBe(false);
    });

    it('should return false when backend returns non-ok status', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      const result = await aiService.checkBackendStatus();
      expect(result).toBe(false);
    });
  });

  describe('getSystemInfo', () => {
    it('should return system information when successful', async () => {
      const mockSystemInfo = {
        gpu_available: true,
        gpu_name: 'NVIDIA GeForce RTX 4050',
        gpu_memory: 6141,
        cpu_count: 20,
        total_memory: 15
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSystemInfo
      });

      const result = await aiService.getSystemInfo();
      expect(result).toEqual(mockSystemInfo);
      expect(global.fetch).toHaveBeenCalledWith('http://127.0.0.1:8001/system-info');
    });

    it('should throw error when request fails', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await expect(aiService.getSystemInfo()).rejects.toThrow('Network error');
    });
  });

  describe('getAvailableModels', () => {
    it('should return parsed models when successful', async () => {
      const mockModels = {
        models: [
          {
            id: 'realesrgan-x4plus',
            name: 'Real-ESRGAN x4plus',
            type: 'upscaling',
            size: '67 MB',
            downloaded: true
          }
        ]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockModels
      });

      const result = await aiService.getAvailableModels();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('realesrgan-x4plus');
    });

    it('should return default models when request fails', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await aiService.getAvailableModels();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].downloaded).toBe(false);
    });
  });

  describe('upscaleVideo', () => {
    it('should process video upscaling successfully', async () => {
      const mockJobId = 'job_123';
      const inputPath = '/path/to/input.mp4';
      const outputPath = '/path/to/output.mp4';
      const settings = {
        enabled: true,
        factor: 2 as const,
        model: 'realesrgan-x4plus',
        quality: 80
      };

      // Mock job creation
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ job_id: mockJobId })
      });

      // Mock job status polling (completed immediately)
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'completed', progress: 100 })
      });

      const onProgress = jest.fn();
      const result = await aiService.upscaleVideo(inputPath, outputPath, settings, onProgress);

      expect(result).toBe(outputPath);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://127.0.0.1:8001/process/upscale',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('realesrgan-x4plus')
        })
      );
    });

    it('should handle upscaling errors', async () => {
      const settings = {
        enabled: true,
        factor: 2 as const,
        model: 'realesrgan-x4plus',
        quality: 80
      };

      (global.fetch as any).mockRejectedValueOnce(new Error('Backend error'));

      await expect(
        aiService.upscaleVideo('/input.mp4', '/output.mp4', settings)
      ).rejects.toThrow('Backend error');
    });
  });

  describe('validateAISettings', () => {
    it('should validate settings successfully with no warnings', async () => {
      const mockSystemInfo = {
        gpu_memory: 8192, // 8GB
        gpu_available: true
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSystemInfo
      });

      const settings: AISettings = {
        enabled: true,
        upscaling: { enabled: true, factor: 2, model: 'realesrgan-x4plus', quality: 80 },
        frameInterpolation: { enabled: false, targetFps: 60, model: 'rife' },
        faceEnhancement: { enabled: false, strength: 70, model: 'gfpgan' },
        denoising: { enabled: false, level: 'medium', model: 'dncnn' }
      };

      const result = await aiService.validateAISettings(settings);
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn about insufficient GPU memory', async () => {
      const mockSystemInfo = {
        gpu_memory: 2048, // 2GB
        gpu_available: true
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSystemInfo
      });

      const settings: AISettings = {
        enabled: true,
        upscaling: { enabled: true, factor: 4, model: 'realesrgan-x4plus', quality: 80 },
        frameInterpolation: { enabled: true, targetFps: 120, model: 'rife' },
        faceEnhancement: { enabled: true, strength: 90, model: 'gfpgan' },
        denoising: { enabled: true, level: 'high', model: 'dncnn' }
      };

      const result = await aiService.validateAISettings(settings);
      expect(result.valid).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Insufficient GPU memory');
    });

    it('should warn about too many features enabled', async () => {
      const mockSystemInfo = {
        gpu_memory: 16384, // 16GB - plenty
        gpu_available: true
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSystemInfo
      });

      const settings: AISettings = {
        enabled: true,
        upscaling: { enabled: true, factor: 2, model: 'realesrgan-x4plus', quality: 80 },
        frameInterpolation: { enabled: true, targetFps: 60, model: 'rife' },
        faceEnhancement: { enabled: true, strength: 70, model: 'gfpgan' },
        denoising: { enabled: true, level: 'medium', model: 'dncnn' }
      };

      const result = await aiService.validateAISettings(settings);
      expect(result.warnings).toContain('Multiple AI features enabled will significantly increase processing time');
    });
  });

  describe('estimateProcessingTime', () => {
    it('should estimate time correctly for single feature', () => {
      const settings: AISettings = {
        enabled: true,
        upscaling: { enabled: true, factor: 2, model: 'realesrgan-x4plus', quality: 80 },
        frameInterpolation: { enabled: false, targetFps: 60, model: 'rife' },
        faceEnhancement: { enabled: false, strength: 70, model: 'gfpgan' },
        denoising: { enabled: false, level: 'medium', model: 'dncnn' }
      };

      const time = aiService.estimateProcessingTime(60, '1080p', settings);
      expect(time).toBe(360); // 60 seconds * 3.0 factor * 2.0 resolution factor
    });

    it('should estimate time correctly for multiple features', () => {
      const settings: AISettings = {
        enabled: true,
        upscaling: { enabled: true, factor: 4, model: 'realesrgan-x4plus', quality: 95 },
        frameInterpolation: { enabled: true, targetFps: 120, model: 'rife' },
        faceEnhancement: { enabled: true, strength: 90, model: 'gfpgan' },
        denoising: { enabled: true, level: 'high', model: 'dncnn' }
      };

      const time = aiService.estimateProcessingTime(60, '1080p', settings);
      expect(time).toBeGreaterThan(1000); // Should be quite high with all features
    });
  });

  describe('cancelJob', () => {
    it('should cancel active job successfully', async () => {
      const jobId = 'job_123';
      
      // Add job to active jobs map
      (aiService as any).activeJobs.set(jobId, jobId);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'cancelled' })
      });

      await aiService.cancelJob(jobId);
      
      expect(global.fetch).toHaveBeenCalledWith(
        `http://127.0.0.1:8001/job/${jobId}`,
        { method: 'DELETE' }
      );
      expect((aiService as any).activeJobs.has(jobId)).toBe(false);
    });

    it('should handle cancellation of non-existent job', async () => {
      await expect(aiService.cancelJob('non_existent')).resolves.not.toThrow();
    });
  });
});