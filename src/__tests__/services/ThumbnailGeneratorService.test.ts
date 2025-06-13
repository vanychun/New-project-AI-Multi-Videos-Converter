import { ThumbnailGeneratorService } from '../../services/ThumbnailGeneratorService';

// Mock HTML elements for testing
global.document = {
  createElement: jest.fn((tagName: string) => {
    if (tagName === 'video') {
      return {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        load: jest.fn(),
        duration: 60, // 60 seconds
        videoWidth: 1920,
        videoHeight: 1080,
        readyState: 4,
        currentTime: 0,
        src: '',
        preload: '',
        muted: false,
        crossOrigin: null
      };
    }
    if (tagName === 'canvas') {
      return {
        width: 0,
        height: 0,
        getContext: jest.fn(() => ({
          fillStyle: '',
          fillRect: jest.fn(),
          drawImage: jest.fn(),
          canvas: { width: 320, height: 180 }
        })),
        toDataURL: jest.fn(() => 'data:image/jpeg;base64,mockImageData')
      };
    }
    return {};
  })
} as any;

global.URL = {
  createObjectURL: jest.fn(() => 'blob:mock-url'),
  revokeObjectURL: jest.fn()
} as any;

global.performance = {
  now: jest.fn(() => Date.now())
} as any;

// Mock File class
class MockFile extends File {
  constructor(bits: BlobPart[], name: string, options?: FilePropertyBag) {
    super(bits, name, options);
  }
}

describe('ThumbnailGeneratorService', () => {
  let service: ThumbnailGeneratorService;

  beforeEach(() => {
    service = ThumbnailGeneratorService.getInstance();
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = ThumbnailGeneratorService.getInstance();
      const instance2 = ThumbnailGeneratorService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('generateThumbnails', () => {
    it('should generate thumbnails for a video file', async () => {
      const file = new MockFile(['video content'], 'test.mp4', { type: 'video/mp4' });
      
      // Mock video element behavior
      const mockVideo = {
        addEventListener: jest.fn((event, handler) => {
          if (event === 'loadedmetadata') {
            setTimeout(() => handler(), 10);
          }
          if (event === 'seeked') {
            setTimeout(() => handler(), 10);
          }
        }),
        removeEventListener: jest.fn(),
        duration: 60,
        videoWidth: 1920,
        videoHeight: 1080,
        currentTime: 0,
        src: '',
        load: jest.fn()
      };

      (document.createElement as jest.Mock).mockImplementation((tagName) => {
        if (tagName === 'video') return mockVideo;
        if (tagName === 'canvas') {
          return {
            width: 0,
            height: 0,
            getContext: () => ({
              fillStyle: '',
              fillRect: jest.fn(),
              drawImage: jest.fn(),
              canvas: { width: 320, height: 180 }
            }),
            toDataURL: () => 'data:image/jpeg;base64,mockImageData'
          };
        }
        return {};
      });

      const result = await service.generateThumbnails(file, { count: 3 });

      expect(result.success).toBe(true);
      expect(result.thumbnails).toHaveLength(3);
      expect(result.duration).toBe(60);
      expect(result.processingTime).toBeGreaterThan(0);

      result.thumbnails.forEach((thumbnail, index) => {
        expect(thumbnail.dataUrl).toBe('data:image/jpeg;base64,mockImageData');
        expect(thumbnail.width).toBe(320);
        expect(thumbnail.height).toBe(180);
        expect(thumbnail.timestamp).toBeGreaterThanOrEqual(0);
        expect(thumbnail.timestamp).toBeLessThanOrEqual(60);
        expect(thumbnail.generatedAt).toBeInstanceOf(Date);
      });
    });

    it('should handle custom thumbnail options', async () => {
      const file = new MockFile(['video content'], 'test.mp4', { type: 'video/mp4' });
      
      const mockVideo = {
        addEventListener: jest.fn((event, handler) => {
          if (event === 'loadedmetadata') setTimeout(() => handler(), 10);
          if (event === 'seeked') setTimeout(() => handler(), 10);
        }),
        removeEventListener: jest.fn(),
        duration: 120,
        videoWidth: 1920,
        videoHeight: 1080,
        currentTime: 0,
        src: '',
        load: jest.fn()
      };

      (document.createElement as jest.Mock).mockImplementation((tagName) => {
        if (tagName === 'video') return mockVideo;
        if (tagName === 'canvas') {
          return {
            width: 0,
            height: 0,
            getContext: () => ({
              fillStyle: '',
              fillRect: jest.fn(),
              drawImage: jest.fn(),
              canvas: { width: 640, height: 360 }
            }),
            toDataURL: () => 'data:image/png;base64,customImageData'
          };
        }
        return {};
      });

      const options = {
        width: 640,
        height: 360,
        quality: 0.9,
        format: 'png' as const,
        count: 5
      };

      const result = await service.generateThumbnails(file, options);

      expect(result.success).toBe(true);
      expect(result.thumbnails).toHaveLength(5);
      expect(result.thumbnails[0].dataUrl).toBe('data:image/png;base64,customImageData');
    });

    it('should handle specific timestamps', async () => {
      const file = new MockFile(['video content'], 'test.mp4', { type: 'video/mp4' });
      
      const mockVideo = {
        addEventListener: jest.fn((event, handler) => {
          if (event === 'loadedmetadata') setTimeout(() => handler(), 10);
          if (event === 'seeked') setTimeout(() => handler(), 10);
        }),
        removeEventListener: jest.fn(),
        duration: 60,
        videoWidth: 1920,
        videoHeight: 1080,
        currentTime: 0,
        src: '',
        load: jest.fn()
      };

      (document.createElement as jest.Mock).mockImplementation((tagName) => {
        if (tagName === 'video') return mockVideo;
        if (tagName === 'canvas') {
          return {
            getContext: () => ({ fillRect: jest.fn(), drawImage: jest.fn() }),
            toDataURL: () => 'data:image/jpeg;base64,specificTimestamp'
          };
        }
        return {};
      });

      const options = {
        timestamps: [10, 30, 50]
      };

      const result = await service.generateThumbnails(file, options);

      expect(result.success).toBe(true);
      expect(result.thumbnails).toHaveLength(3);
      expect(result.thumbnails[0].timestamp).toBe(10);
      expect(result.thumbnails[1].timestamp).toBe(30);
      expect(result.thumbnails[2].timestamp).toBe(50);
    });

    it('should handle video loading errors', async () => {
      const file = new MockFile(['invalid video'], 'broken.mp4', { type: 'video/mp4' });
      
      const mockVideo = {
        addEventListener: jest.fn((event, handler) => {
          if (event === 'error') {
            setTimeout(() => handler(), 10);
          }
        }),
        removeEventListener: jest.fn(),
        src: '',
        load: jest.fn()
      };

      (document.createElement as jest.Mock).mockImplementation((tagName) => {
        if (tagName === 'video') return mockVideo;
        return {};
      });

      const result = await service.generateThumbnails(file);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.thumbnails).toHaveLength(0);
    });

    it('should handle invalid video dimensions', async () => {
      const file = new MockFile(['video content'], 'test.mp4', { type: 'video/mp4' });
      
      const mockVideo = {
        addEventListener: jest.fn((event, handler) => {
          if (event === 'loadedmetadata') setTimeout(() => handler(), 10);
        }),
        removeEventListener: jest.fn(),
        duration: 60,
        videoWidth: 0, // Invalid width
        videoHeight: 0, // Invalid height
        src: '',
        load: jest.fn()
      };

      (document.createElement as jest.Mock).mockImplementation((tagName) => {
        if (tagName === 'video') return mockVideo;
        return {};
      });

      const result = await service.generateThumbnails(file);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid video: zero dimensions');
    });
  });

  describe('generateSingleThumbnail', () => {
    it('should generate a single thumbnail at specified timestamp', async () => {
      const file = new MockFile(['video content'], 'test.mp4', { type: 'video/mp4' });
      
      const mockVideo = {
        addEventListener: jest.fn((event, handler) => {
          if (event === 'loadedmetadata') setTimeout(() => handler(), 10);
          if (event === 'seeked') setTimeout(() => handler(), 10);
        }),
        removeEventListener: jest.fn(),
        duration: 60,
        videoWidth: 1920,
        videoHeight: 1080,
        currentTime: 0,
        src: '',
        load: jest.fn()
      };

      (document.createElement as jest.Mock).mockImplementation((tagName) => {
        if (tagName === 'video') return mockVideo;
        if (tagName === 'canvas') {
          return {
            getContext: () => ({ fillRect: jest.fn(), drawImage: jest.fn() }),
            toDataURL: () => 'data:image/jpeg;base64,singleThumbnail'
          };
        }
        return {};
      });

      const thumbnail = await service.generateSingleThumbnail(file, 30);

      expect(thumbnail).not.toBeNull();
      expect(thumbnail!.timestamp).toBe(30);
      expect(thumbnail!.dataUrl).toBe('data:image/jpeg;base64,singleThumbnail');
    });

    it('should return null on error', async () => {
      const file = new MockFile(['invalid video'], 'broken.mp4', { type: 'video/mp4' });
      
      const mockVideo = {
        addEventListener: jest.fn((event, handler) => {
          if (event === 'error') setTimeout(() => handler(), 10);
        }),
        removeEventListener: jest.fn(),
        src: '',
        load: jest.fn()
      };

      (document.createElement as jest.Mock).mockImplementation((tagName) => {
        if (tagName === 'video') return mockVideo;
        return {};
      });

      const thumbnail = await service.generateSingleThumbnail(file, 30);

      expect(thumbnail).toBeNull();
    });
  });

  describe('generateBatchThumbnails', () => {
    it('should generate thumbnails for multiple files', async () => {
      const files = [
        new MockFile(['video1'], 'video1.mp4', { type: 'video/mp4' }),
        new MockFile(['video2'], 'video2.mp4', { type: 'video/mp4' })
      ];

      const mockVideo = {
        addEventListener: jest.fn((event, handler) => {
          if (event === 'loadedmetadata') setTimeout(() => handler(), 10);
          if (event === 'seeked') setTimeout(() => handler(), 10);
        }),
        removeEventListener: jest.fn(),
        duration: 60,
        videoWidth: 1920,
        videoHeight: 1080,
        currentTime: 0,
        src: '',
        load: jest.fn()
      };

      (document.createElement as jest.Mock).mockImplementation((tagName) => {
        if (tagName === 'video') return mockVideo;
        if (tagName === 'canvas') {
          return {
            getContext: () => ({ fillRect: jest.fn(), drawImage: jest.fn() }),
            toDataURL: () => 'data:image/jpeg;base64,batchThumbnail'
          };
        }
        return {};
      });

      const results = await service.generateBatchThumbnails(files);

      expect(results.size).toBe(2);
      expect(results.get('video1.mp4')?.success).toBe(true);
      expect(results.get('video2.mp4')?.success).toBe(true);
    });
  });

  describe('getOptimalThumbnailSize', () => {
    it('should calculate optimal size for landscape video', () => {
      const size = service.getOptimalThumbnailSize(1920, 1080);
      expect(size.width).toBe(320);
      expect(size.height).toBe(180);
    });

    it('should calculate optimal size for portrait video', () => {
      const size = service.getOptimalThumbnailSize(1080, 1920);
      expect(size.width).toBe(180);
      expect(size.height).toBe(320);
    });

    it('should calculate optimal size for square video', () => {
      const size = service.getOptimalThumbnailSize(1000, 1000);
      expect(size.width).toBe(320);
      expect(size.height).toBe(320);
    });
  });

  describe('estimateMemoryUsage', () => {
    it('should estimate memory usage correctly', () => {
      const estimate = service.estimateMemoryUsage(10, { width: 320, height: 180, count: 3 });
      
      expect(estimate.estimated).toBeGreaterThan(0);
      expect(estimate.recommendation).toBeDefined();
    });

    it('should recommend optimization for large operations', () => {
      const estimate = service.estimateMemoryUsage(1000, { width: 1920, height: 1080, count: 10 });
      
      expect(estimate.recommendation).toContain('reduce');
    });
  });

  describe('getStatistics', () => {
    it('should return current statistics', () => {
      const stats = service.getStatistics();
      
      expect(stats).toHaveProperty('activeGenerations');
      expect(stats).toHaveProperty('queuedGenerations');
      expect(stats).toHaveProperty('maxConcurrent');
      expect(typeof stats.activeGenerations).toBe('number');
      expect(typeof stats.queuedGenerations).toBe('number');
      expect(typeof stats.maxConcurrent).toBe('number');
    });
  });

  describe('clearQueue', () => {
    it('should clear the generation queue', () => {
      service.clearQueue();
      const stats = service.getStatistics();
      expect(stats.queuedGenerations).toBe(0);
    });
  });

  describe('concurrency control', () => {
    it('should respect maximum concurrent generations', async () => {
      const files = Array.from({ length: 10 }, (_, i) => 
        new MockFile([`video${i}`], `video${i}.mp4`, { type: 'video/mp4' })
      );

      const mockVideo = {
        addEventListener: jest.fn((event, handler) => {
          if (event === 'loadedmetadata') setTimeout(() => handler(), 50);
          if (event === 'seeked') setTimeout(() => handler(), 50);
        }),
        removeEventListener: jest.fn(),
        duration: 60,
        videoWidth: 1920,
        videoHeight: 1080,
        currentTime: 0,
        src: '',
        load: jest.fn()
      };

      (document.createElement as jest.Mock).mockImplementation((tagName) => {
        if (tagName === 'video') return mockVideo;
        if (tagName === 'canvas') {
          return {
            getContext: () => ({ fillRect: jest.fn(), drawImage: jest.fn() }),
            toDataURL: () => 'data:image/jpeg;base64,concurrentTest'
          };
        }
        return {};
      });

      // Start multiple operations
      const promises = files.map(file => service.generateThumbnails(file));
      
      // Check that we don't exceed max concurrent operations
      const statsBeforeCompletion = service.getStatistics();
      expect(statsBeforeCompletion.activeGenerations).toBeLessThanOrEqual(statsBeforeCompletion.maxConcurrent);

      await Promise.all(promises);
    });
  });
});