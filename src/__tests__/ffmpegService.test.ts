/**
 * Tests for FFmpeg Service
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { FFmpegServiceEnhanced, ConversionSettings } from '../services/ffmpegServiceEnhanced';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

// Mock child_process
jest.mock('child_process');
const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

// Mock ffmpeg-static and ffprobe-static
jest.mock('ffmpeg-static', () => '/path/to/ffmpeg', { virtual: true });
jest.mock('ffprobe-static', () => ({ path: '/path/to/ffprobe' }), { virtual: true });

// Mock process.resourcesPath for Electron
Object.defineProperty(process, 'resourcesPath', {
  value: '/mock/resources/path',
  writable: true,
});

// Mock NODE_ENV
Object.defineProperty(process.env, 'NODE_ENV', {
  value: 'test',
  writable: true,
});

describe('FFmpegServiceEnhanced', () => {
  let ffmpegService: FFmpegServiceEnhanced;
  let mockProcess: any;

  beforeEach(() => {
    ffmpegService = new FFmpegServiceEnhanced();
    
    // Create mock process
    mockProcess = new EventEmitter();
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    mockProcess.kill = jest.fn();
    
    mockSpawn.mockReturnValue(mockProcess as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getVideoInfo', () => {
    it('should extract video information correctly', async () => {
      const mockVideoInfo = {
        format: {
          duration: '120.5',
          size: '50000000',
          bit_rate: '1000000'
        },
        streams: [
          {
            codec_type: 'video',
            width: 1920,
            height: 1080,
            r_frame_rate: '30/1',
            codec_name: 'h264'
          },
          {
            codec_type: 'audio',
            codec_name: 'aac'
          }
        ]
      };

      const promise = ffmpegService.getVideoInfo('/path/to/video.mp4');
      
      // Simulate ffprobe output
      setTimeout(() => {
        mockProcess.stdout.emit('data', JSON.stringify(mockVideoInfo));
        mockProcess.emit('close', 0);
      }, 10);

      const result = await promise;

      expect(result).toEqual({
        duration: 120.5,
        size: 50000000,
        bitrate: 1000000,
        width: 1920,
        height: 1080,
        fps: 30,
        videoCodec: 'h264',
        audioCodec: 'aac',
        hasAudio: true,
        format: undefined // This will be undefined in the mock
      });

      expect(mockSpawn).toHaveBeenCalledWith('/mock/resources/path/bin/ffprobe.exe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        '/path/to/video.mp4'
      ]);
    });

    it('should handle ffprobe errors', async () => {
      const promise = ffmpegService.getVideoInfo('/path/to/invalid.mp4');
      
      setTimeout(() => {
        mockProcess.emit('close', 1);
      }, 10);

      await expect(promise).rejects.toThrow('FFprobe exited with code 1');
    });

    it('should handle invalid JSON output', async () => {
      const promise = ffmpegService.getVideoInfo('/path/to/video.mp4');
      
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'invalid json');
        mockProcess.emit('close', 0);
      }, 10);

      await expect(promise).rejects.toThrow('Failed to parse FFprobe output');
    });
  });

  describe('convertVideo', () => {
    const settings: ConversionSettings = {
      outputFormat: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
      quality: 23,
      resolution: { width: 1280, height: 720 },
      fps: 30,
      preset: 'medium',
      hardwareAcceleration: false
    };

    it('should start video conversion with correct arguments', async () => {
      // Mock getVideoInfo
      jest.spyOn(ffmpegService, 'getVideoInfo').mockResolvedValue({
        duration: 120,
        fps: 30,
        width: 1920,
        height: 1080
      });

      const promise = ffmpegService.convertVideo(
        '/path/to/input.mp4',
        '/path/to/output.mp4',
        settings,
        'job123'
      );
      
      setTimeout(() => {
        mockProcess.emit('close', 0);
      }, 10);

      await promise;

      expect(mockSpawn).toHaveBeenCalledWith('/mock/resources/path/bin/ffmpeg.exe', [
        '-y',
        '-i', '/path/to/input.mp4',
        '-c:v', 'libx264',
        '-crf', '23',
        '-preset', 'medium',
        '-s', '1280x720',
        '-r', '30',
        '-c:a', 'aac',
        '-progress', 'pipe:2',
        '/path/to/output.mp4'
      ]);
    });

    it('should handle hardware acceleration', async () => {
      const hwSettings = { ...settings, hardwareAcceleration: true };
      
      jest.spyOn(ffmpegService, 'getVideoInfo').mockResolvedValue({
        duration: 120,
        fps: 30
      });

      const promise = ffmpegService.convertVideo(
        '/path/to/input.mp4',
        '/path/to/output.mp4',
        hwSettings,
        'job123'
      );
      
      setTimeout(() => {
        mockProcess.emit('close', 0);
      }, 10);

      await promise;

      const spawnArgs = mockSpawn.mock.calls[mockSpawn.mock.calls.length - 1][1]; // Last call args
      expect(spawnArgs).toContain('-hwaccel');
      expect(spawnArgs).toContain('auto');
      expect(spawnArgs).toContain('-c:v');
      expect(spawnArgs).toContain('h264_nvenc');
    });

    it('should emit progress events', async () => {
      jest.spyOn(ffmpegService, 'getVideoInfo').mockResolvedValue({
        duration: 120,
        fps: 30
      });

      const progressSpy = jest.fn();
      ffmpegService.on('progress', progressSpy);

      const promise = ffmpegService.convertVideo(
        '/path/to/input.mp4',
        '/path/to/output.mp4',
        settings,
        'job123'
      );
      
      setTimeout(() => {
        // Simulate FFmpeg progress output
        mockProcess.stderr.emit('data', 'frame=150\nfps=30.5\nbitrate=1000kbits/s\n');
        mockProcess.emit('close', 0);
      }, 10);

      await promise;

      expect(progressSpy).toHaveBeenCalled();
    });

    it('should handle conversion errors', async () => {
      jest.spyOn(ffmpegService, 'getVideoInfo').mockResolvedValue({
        duration: 120,
        fps: 30
      });

      const errorSpy = jest.fn();
      ffmpegService.on('error', errorSpy);

      const promise = ffmpegService.convertVideo(
        '/path/to/input.mp4',
        '/path/to/output.mp4',
        settings,
        'job123'
      );
      
      setTimeout(() => {
        mockProcess.emit('close', 1);
      }, 10);

      await expect(promise).rejects.toThrow('FFmpeg process exited with code 1');
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('generateThumbnail', () => {
    it('should generate thumbnail with correct arguments', async () => {
      const promise = ffmpegService.generateThumbnail(
        '/path/to/video.mp4',
        '/path/to/thumb.jpg',
        10,
        640,
        480
      );
      
      setTimeout(() => {
        mockProcess.emit('close', 0);
      }, 10);

      await promise;

      expect(mockSpawn).toHaveBeenCalledWith('/mock/resources/path/bin/ffmpeg.exe', [
        '-i', '/path/to/video.mp4',
        '-ss', '10',
        '-vframes', '1',
        '-vf', 'scale=640:480',
        '-y',
        '/path/to/thumb.jpg'
      ]);
    });

    it('should handle thumbnail generation errors', async () => {
      const promise = ffmpegService.generateThumbnail(
        '/path/to/video.mp4',
        '/path/to/thumb.jpg'
      );
      
      setTimeout(() => {
        mockProcess.emit('close', 1);
      }, 10);

      await expect(promise).rejects.toThrow('Thumbnail generation failed with code 1');
    });
  });

  describe('extractFrames', () => {
    it('should extract frames with time range', async () => {
      const promise = ffmpegService.extractFrames(
        '/path/to/video.mp4',
        '/path/to/frames',
        10,
        20
      );
      
      setTimeout(() => {
        mockProcess.emit('close', 0);
      }, 10);

      await promise;

      expect(mockSpawn).toHaveBeenCalledWith('/mock/resources/path/bin/ffmpeg.exe', [
        '-i', '/path/to/video.mp4',
        '-ss', '10',
        '-t', '10',
        '-vf', 'fps=1',
        '-q:v', '2',
        expect.stringContaining('frame_%04d.png')
      ]);
    });

    it('should extract frames without time range', async () => {
      const promise = ffmpegService.extractFrames(
        '/path/to/video.mp4',
        '/path/to/frames'
      );
      
      setTimeout(() => {
        mockProcess.emit('close', 0);
      }, 10);

      await promise;

      expect(mockSpawn).toHaveBeenCalledWith('/mock/resources/path/bin/ffmpeg.exe', [
        '-i', '/path/to/video.mp4',
        '-vf', 'fps=1',
        '-q:v', '2',
        expect.stringContaining('frame_%04d.png')
      ]);
    });
  });

  describe('job management', () => {
    it('should track active jobs', async () => {
      const jobId = 'test-job';
      
      // Mock getVideoInfo for convertVideo
      jest.spyOn(ffmpegService, 'getVideoInfo').mockResolvedValue({
        duration: 120,
        fps: 30
      });
      
      const promise = ffmpegService.convertVideo(
        '/path/to/input.mp4',
        '/path/to/output.mp4',
        {
          outputFormat: 'mp4',
          videoCodec: 'h264',
          audioCodec: 'aac',
          quality: 23
        },
        jobId
      );

      // Give the async operation time to start
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(ffmpegService.isJobActive(jobId)).toBe(true);
      expect(ffmpegService.getActiveJobs()).toContain(jobId);
      
      // Complete the promise
      setTimeout(() => {
        mockProcess.emit('close', 0);
      }, 10);
      
      await promise;
    });

    it('should cancel jobs', async () => {
      const jobId = 'test-job';
      
      // Mock getVideoInfo for convertVideo
      jest.spyOn(ffmpegService, 'getVideoInfo').mockResolvedValue({
        duration: 120,
        fps: 30
      });
      
      // Add error handler to prevent unhandled error
      ffmpegService.on('error', () => {
        // Expected error from cancellation, ignore
      });
      
      const promise = ffmpegService.convertVideo(
        '/path/to/input.mp4',
        '/path/to/output.mp4',
        {
          outputFormat: 'mp4',
          videoCodec: 'h264',
          audioCodec: 'aac',
          quality: 23
        },
        jobId
      );

      // Give the async operation time to start
      await new Promise(resolve => setTimeout(resolve, 10));

      const result = ffmpegService.cancelJob(jobId);
      
      expect(result).toBe(true);
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(ffmpegService.isJobActive(jobId)).toBe(false);
      
      // Complete the promise with cancellation
      setTimeout(() => {
        mockProcess.emit('close', 1); // Exit with error code
      }, 10);
      
      // Handle the promise completion
      try {
        await promise;
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect((error as Error).message).toContain('FFmpeg process exited with code 1');
      }
    });

    it('should return false when canceling non-existent job', () => {
      const result = ffmpegService.cancelJob('non-existent-job');
      expect(result).toBe(false);
    });
  });

  describe('codec mapping', () => {
    it('should map video codecs correctly', () => {
      const service = ffmpegService as any;
      
      expect(service.getVideoCodec('h264')).toBe('libx264');
      expect(service.getVideoCodec('h265')).toBe('libx265');
      expect(service.getVideoCodec('vp9')).toBe('libvpx-vp9');
      expect(service.getVideoCodec('av1')).toBe('libaom-av1');
      expect(service.getVideoCodec('unknown')).toBe('libx264');
    });

    it('should map audio codecs correctly', () => {
      const service = ffmpegService as any;
      
      expect(service.getAudioCodec('aac')).toBe('aac');
      expect(service.getAudioCodec('mp3')).toBe('libmp3lame');
      expect(service.getAudioCodec('opus')).toBe('libopus');
      expect(service.getAudioCodec('copy')).toBe('copy');
      expect(service.getAudioCodec('unknown')).toBe('aac');
    });
  });

  describe('progress parsing', () => {
    it('should parse FFmpeg progress correctly', () => {
      const service = ffmpegService as any;
      const progressData = `frame=150
fps=30.5
bitrate=1000kbits/s
total_size=5000000
out_time_us=5000000
out_time=00:00:05.000000
dup_frames=0
drop_frames=0
speed=1.0x`;

      const progress = service.parseProgress(progressData, 300);
      
      expect(progress).toEqual({
        frame: 150,
        fps: 30.5,
        bitrate: '1000kbits/s',
        totalSize: 5000000,
        outTimeUs: 5000000,
        outTime: '00:00:05.000000',
        dupFrames: 0,
        dropFrames: 0,
        speed: 1.0,
        progress: 50 // 150/300 * 100
      });
    });

    it('should handle incomplete progress data', () => {
      const service = ffmpegService as any;
      const progressData = 'incomplete data';

      const progress = service.parseProgress(progressData, 300);
      expect(progress).toBeNull();
    });
  });
});