/**
 * Tests for Video Service
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { videoService } from '../services/videoService';
import { Video } from '../types/video.types';

// Mock window.electronAPI
const mockElectronAPI = {
  getVideoMetadata: jest.fn() as jest.MockedFunction<any>,
  extractThumbnail: jest.fn() as jest.MockedFunction<any>,
  extractThumbnailsBatch: jest.fn() as jest.MockedFunction<any>,
  validateVideoFile: jest.fn() as jest.MockedFunction<any>,
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

describe('VideoService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateVideoFile', () => {
    it('should validate supported video file', async () => {
      const supportedFile = new File(['test'], 'video.mp4', { type: 'video/mp4' });
      
      const result = await videoService.validateVideoFile(supportedFile);
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.fileInfo.name).toBe('video.mp4');
      expect(result.fileInfo.size).toBe(4);
      expect(result.fileInfo.type).toBe('video/mp4');
    });

    it('should reject unsupported file types', async () => {
      const unsupportedFile = new File(['test'], 'document.pdf', { type: 'application/pdf' });
      
      const result = await videoService.validateVideoFile(unsupportedFile);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Unsupported file type: application/pdf');
    });

    it('should reject files that are too large', async () => {
      // Create a mock file that's too large (over 10GB)
      const largeFile = new File(['test'], 'large.mp4', { type: 'video/mp4' });
      Object.defineProperty(largeFile, 'size', {
        value: 11 * 1024 * 1024 * 1024, // 11GB
        writable: false
      });
      
      const result = await videoService.validateVideoFile(largeFile);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('File size exceeds maximum limit of 10GB');
    });

    it('should handle files without type', async () => {
      const fileWithoutType = new File(['test'], 'video.mp4', { type: '' });
      
      const result = await videoService.validateVideoFile(fileWithoutType);
      
      expect(result.isValid).toBe(true); // Should validate by extension
    });
  });

  describe('processVideoFiles', () => {
    it('should process multiple video files', async () => {
      const files = [
        new File(['test1'], 'video1.mp4', { type: 'video/mp4' }),
        new File(['test2'], 'video2.avi', { type: 'video/x-msvideo' }),
      ];
      
      mockElectronAPI.getVideoMetadata.mockResolvedValue({
        duration: 120,
        width: 1920,
        height: 1080,
        fps: 30,
        codec: 'h264',
        size: 50000000,
        bitrate: 1000000,
        hasAudio: true
      });

      mockElectronAPI.extractThumbnail.mockResolvedValue('/path/to/thumbnail.jpg');

      const results = await videoService.processVideoFiles(files);
      
      expect(results).toHaveLength(2);
      expect(results[0].isValid).toBe(true);
      expect(results[1].isValid).toBe(true);
      expect(results[0].video?.name).toBe('video1.mp4');
      expect(results[1].video?.name).toBe('video2.avi');
    });

    it('should handle mixed valid and invalid files', async () => {
      const files = [
        new File(['test1'], 'video.mp4', { type: 'video/mp4' }),
        new File(['test2'], 'document.pdf', { type: 'application/pdf' }),
      ];
      
      mockElectronAPI.getVideoMetadata.mockResolvedValue({
        duration: 120,
        width: 1920,
        height: 1080,
        fps: 30,
        codec: 'h264',
        size: 50000000,
        bitrate: 1000000,
        hasAudio: true
      });

      mockElectronAPI.extractThumbnail.mockResolvedValue('/path/to/thumbnail.jpg');

      const results = await videoService.processVideoFiles(files);
      
      expect(results).toHaveLength(2);
      expect(results[0].isValid).toBe(true);
      expect(results[1].isValid).toBe(false);
      expect(results[1].error).toBe('Unsupported video format: pdf');
    });

    it('should handle metadata extraction errors', async () => {
      const files = [
        new File(['test'], 'video.mp4', { type: 'video/mp4' }),
      ];
      
      mockElectronAPI.getVideoMetadata.mockRejectedValue(new Error('Failed to extract metadata'));
      mockElectronAPI.extractThumbnail.mockResolvedValue('/path/to/thumbnail.jpg');

      const results = await videoService.processVideoFiles(files);
      
      expect(results).toHaveLength(1);
      expect(results[0].isValid).toBe(false);
      expect(results[0].error).toBe('Invalid video properties detected');
    });
  });

  describe('createVideoFromFile', () => {
    it('should create video object from valid file', async () => {
      const file = new File(['test'], 'video.mp4', { type: 'video/mp4' });
      const filePath = '/path/to/video.mp4';
      
      mockElectronAPI.getVideoMetadata.mockResolvedValue({
        duration: 120.5,
        width: 1920,
        height: 1080,
        fps: 29.97,
        codec: 'h264',
        size: 50000000,
        bitrate: 1000000,
        hasAudio: true,
        audioCodec: 'aac',
        audioChannels: 2,
        audioSampleRate: 48000
      });

      mockElectronAPI.extractThumbnail.mockResolvedValue('/path/to/thumbnail.jpg');

      const video = await videoService.createVideoFromFile(file);
      
      expect(video).toEqual({
        id: expect.any(String),
        name: 'video.mp4',
        path: '/path/to/video.mp4',
        size: 4,
        duration: 120.5,
        width: 1920,
        height: 1080,
        fps: 29.97,
        codec: 'h264',
        bitrate: 1000000,
        hasAudio: true,
        audioCodec: 'aac',
        audioChannels: 2,
        audioSampleRate: 48000,
        thumbnail: '/path/to/thumbnail.jpg',
        format: 'mp4',
        isSelected: false,
        trimStart: 0,
        trimEnd: 120.5,
        status: 'ready',
        progress: 0,
        addedAt: expect.any(Date)
      });
    });

    it('should handle thumbnail generation failure gracefully', async () => {
      const file = new File(['test'], 'video.mp4', { type: 'video/mp4' });
      const filePath = '/path/to/video.mp4';
      
      mockElectronAPI.getVideoMetadata.mockResolvedValue({
        duration: 120,
        width: 1920,
        height: 1080,
        fps: 30,
        codec: 'h264',
        size: 50000000,
        bitrate: 1000000,
        hasAudio: true
      });

      mockElectronAPI.extractThumbnail.mockRejectedValue(new Error('Thumbnail failed'));

      const video = await videoService.createVideoFromFile(file);
      
      expect(video.thumbnail).toBeUndefined();
      expect(video.id).toBeDefined();
      expect(video.name).toBe('video.mp4');
    });
  });

  describe('extractVideoMetadata', () => {
    it('should extract metadata successfully', async () => {
      const mockMetadata = {
        duration: 120.5,
        width: 1920,
        height: 1080,
        fps: 29.97,
        codec: 'h264',
        size: 50000000,
        bitrate: 1000000,
        hasAudio: true,
        audioCodec: 'aac'
      };

      mockElectronAPI.getVideoMetadata.mockResolvedValue(mockMetadata);

      const result = await videoService.extractVideoMetadata('/path/to/video.mp4');
      
      expect(result).toEqual(mockMetadata);
      expect(mockElectronAPI.getVideoMetadata).toHaveBeenCalledWith('/path/to/video.mp4');
    });

    it('should throw error when metadata extraction fails', async () => {
      mockElectronAPI.getVideoMetadata.mockRejectedValue(new Error('Extraction failed'));

      await expect(videoService.extractVideoMetadata('/path/to/video.mp4'))
        .rejects.toThrow('Extraction failed');
    });
  });

  describe('generateThumbnail', () => {
    it('should generate thumbnail at default timestamp', async () => {
      mockElectronAPI.extractThumbnail.mockResolvedValue('/path/to/thumbnail.jpg');

      const result = await videoService.generateThumbnail('/path/to/video.mp4');
      
      expect(result).toBe('/path/to/thumbnail.jpg');
      expect(mockElectronAPI.extractThumbnail).toHaveBeenCalledWith('/path/to/video.mp4', 5);
    });

    it('should generate thumbnail at specific timestamp', async () => {
      mockElectronAPI.extractThumbnail.mockResolvedValue('/path/to/thumbnail.jpg');

      const result = await videoService.generateThumbnail('/path/to/video.mp4', 30);
      
      expect(result).toBe('/path/to/thumbnail.jpg');
      expect(mockElectronAPI.extractThumbnail).toHaveBeenCalledWith('/path/to/video.mp4', 30);
    });

    it('should handle thumbnail generation errors', async () => {
      mockElectronAPI.extractThumbnail.mockRejectedValue(new Error('Thumbnail failed'));

      await expect(videoService.generateThumbnail('/path/to/video.mp4'))
        .rejects.toThrow('Thumbnail failed');
    });
  });

  describe('generateBatchThumbnails', () => {
    it('should generate thumbnails for multiple videos', async () => {
      const videos = [
        { id: '1', name: 'video1.mp4', path: '/path/to/video1.mp4' },
        { id: '2', name: 'video2.mp4', path: '/path/to/video2.mp4' }
      ] as Video[];
      
      mockElectronAPI.extractThumbnail.mockResolvedValue('/path/to/thumb.jpg');

      const result = await videoService.generateBatchThumbnails(videos);
      
      expect(result['1']).toBe('/path/to/thumb.jpg');
      expect(result['2']).toBe('/path/to/thumb.jpg');
    });

    it('should handle batch thumbnail generation errors', async () => {
      const videos = [
        { id: '1', name: 'video1.mp4', path: '/path/to/video1.mp4' }
      ] as Video[];
      
      mockElectronAPI.extractThumbnail.mockRejectedValue(new Error('Thumbnail failed'));

      const result = await videoService.generateBatchThumbnails(videos);
      
      expect(result['1']).toBe(''); // Should return empty string on error
    });
  });

  describe('utility functions', () => {
    it('should check if file type is supported', () => {
      expect(videoService.isFileTypeSupported('mp4')).toBe(true);
      expect(videoService.isFileTypeSupported('avi')).toBe(true);
      expect(videoService.isFileTypeSupported('mov')).toBe(true);
      expect(videoService.isFileTypeSupported('pdf')).toBe(false);
      expect(videoService.isFileTypeSupported('')).toBe(false);
    });

    it('should extract file format from name', () => {
      expect(videoService.extractFileFormat('video.mp4')).toBe('mp4');
      expect(videoService.extractFileFormat('movie.avi')).toBe('avi');
      expect(videoService.extractFileFormat('clip.MOV')).toBe('mov');
      expect(videoService.extractFileFormat('file.unknown')).toBe('unknown');
      expect(videoService.extractFileFormat('noextension')).toBe('');
    });

    it('should format file size correctly', () => {
      expect(videoService.formatFileSize(1024)).toBe('1.0 KB');
      expect(videoService.formatFileSize(1024 * 1024)).toBe('1.0 MB');
      expect(videoService.formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB');
      expect(videoService.formatFileSize(1024 * 1024 * 1024 * 1024)).toBe('1.0 TB');
      expect(videoService.formatFileSize(500)).toBe('500.0 B');
    });

    it('should format duration correctly', () => {
      expect(videoService.formatDuration(30)).toBe('0:30');
      expect(videoService.formatDuration(90)).toBe('1:30');
      expect(videoService.formatDuration(3661)).toBe('1:01:01');
      expect(videoService.formatDuration(7230)).toBe('2:00:30');
      expect(videoService.formatDuration(0)).toBe('0:00');
    });

    it('should validate video properties', () => {
      const validVideo: Partial<Video> = {
        duration: 120,
        size: 1000000,
        metadata: {
          width: 1920,
          height: 1080,
          frameRate: 30,
          codec: 'h264',
          aspectRatio: '16:9',
          hasAudio: true,
          hasVideo: true,
          audioCodec: 'aac',
          audioChannels: 2,
          audioSampleRate: 44100,
          bitDepth: 8,
          colorSpace: 'yuv420p'
        }
      };

      expect(videoService.validateVideoProperties(validVideo)).toBe(true);

      const invalidVideo: Partial<Video> = {
        duration: -1,
        size: 0,
        metadata: {
          width: 0,
          height: 0,
          frameRate: 0,
          codec: '',
          aspectRatio: '',
          hasAudio: false,
          hasVideo: false,
          audioCodec: '',
          audioChannels: 0,
          audioSampleRate: 0,
          bitDepth: 0,
          colorSpace: ''
        }
      };

      expect(videoService.validateVideoProperties(invalidVideo)).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle network timeouts gracefully', async () => {
      const file = new File(['test'], 'video.mp4', { type: 'video/mp4' });
      
      mockElectronAPI.getVideoMetadata.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      const result = await videoService.processVideoFiles([file]);
      
      expect(result[0].isValid).toBe(false);
      expect(result[0].error).toContain('Invalid video properties detected');
    });

    it('should handle corrupted video files', async () => {
      const file = new File(['corrupted'], 'corrupted.mp4', { type: 'video/mp4' });
      
      mockElectronAPI.getVideoMetadata.mockRejectedValue(new Error('Invalid video format'));

      const result = await videoService.processVideoFiles([file]);
      
      expect(result[0].isValid).toBe(false);
      expect(result[0].error).toContain('Invalid video properties detected');
    });
  });
});