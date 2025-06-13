import { FileValidationService } from '../../services/FileValidationService';
import { DEFAULT_IMPORT_OPTIONS } from '../../types/video-enhanced.types';

// Mock File constructor for testing
class MockFile extends File {
  constructor(bits: BlobPart[], name: string, options?: FilePropertyBag) {
    super(bits, name, options);
  }
}

describe('FileValidationService', () => {
  let service: FileValidationService;

  beforeEach(() => {
    service = FileValidationService.getInstance();
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = FileValidationService.getInstance();
      const instance2 = FileValidationService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('validateFile', () => {
    it('should validate a valid MP4 file', async () => {
      const file = new MockFile(['test content'], 'test.mp4', { type: 'video/mp4' });
      const result = await service.validateFile(file, DEFAULT_IMPORT_OPTIONS);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.fileInfo.extension).toBe('mp4');
      expect(result.fileInfo.mimeType).toBe('video/mp4');
    });

    it('should reject files that are too large', async () => {
      const largeFile = new MockFile(['x'.repeat(1000)], 'large.mp4', { type: 'video/mp4' });
      const options = { ...DEFAULT_IMPORT_OPTIONS, maxFileSize: 500 };
      
      const result = await service.validateFile(largeFile, options);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('exceeds maximum allowed size'));
    });

    it('should reject empty files', async () => {
      const emptyFile = new MockFile([], 'empty.mp4', { type: 'video/mp4' });
      const result = await service.validateFile(emptyFile, DEFAULT_IMPORT_OPTIONS);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File is empty');
    });

    it('should reject unsupported formats when validation is enabled', async () => {
      const unsupportedFile = new MockFile(['test'], 'test.xyz', { type: 'application/unknown' });
      const options = { ...DEFAULT_IMPORT_OPTIONS, allowedFormats: ['mp4', 'avi'] };
      
      const result = await service.validateFile(unsupportedFile, options);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('not supported'));
    });

    it('should add warnings for unexpected MIME types', async () => {
      const file = new MockFile(['test'], 'test.mp4', { type: 'text/plain' });
      const result = await service.validateFile(file, DEFAULT_IMPORT_OPTIONS);

      expect(result.warnings).toContain(expect.stringContaining('Unexpected MIME type'));
    });
  });

  describe('validateFiles', () => {
    it('should validate multiple files', async () => {
      const validFile = new MockFile(['content1'], 'valid.mp4', { type: 'video/mp4' });
      const invalidFile = new MockFile([], 'empty.mp4', { type: 'video/mp4' });
      
      const result = await service.validateFiles([validFile, invalidFile], DEFAULT_IMPORT_OPTIONS);

      expect(result.validFiles).toHaveLength(1);
      expect(result.invalidFiles).toHaveLength(1);
      expect(result.statistics.totalFiles).toBe(2);
      expect(result.statistics.validFiles).toBe(1);
      expect(result.statistics.invalidFiles).toBe(1);
    });

    it('should calculate statistics correctly', async () => {
      const file1 = new MockFile(['x'.repeat(1000)], 'file1.mp4', { type: 'video/mp4' });
      const file2 = new MockFile(['x'.repeat(2000)], 'file2.mp4', { type: 'video/mp4' });
      
      const result = await service.validateFiles([file1, file2], DEFAULT_IMPORT_OPTIONS);

      expect(result.statistics.totalSize).toBe(3000);
      expect(result.statistics.averageSize).toBe(1500);
      expect(result.statistics.largestFile.size).toBe(2000);
      expect(result.statistics.largestFile.name).toBe('file2.mp4');
    });
  });

  describe('quickValidate', () => {
    it('should quickly validate supported formats', () => {
      const validFile = new MockFile(['content'], 'test.mp4', { type: 'video/mp4' });
      const result = service.quickValidate(validFile);

      expect(result.isValid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should reject unsupported formats quickly', () => {
      const invalidFile = new MockFile(['content'], 'test.xyz', { type: 'application/unknown' });
      const result = service.quickValidate(invalidFile);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Unsupported format');
    });

    it('should reject empty files quickly', () => {
      const emptyFile = new MockFile([], 'empty.mp4', { type: 'video/mp4' });
      const result = service.quickValidate(emptyFile);

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Empty file');
    });

    it('should reject files that are too large quickly', () => {
      // Create a file larger than 50GB (the default limit)
      const hugeFile = new MockFile(['x'], 'huge.mp4', { type: 'video/mp4' });
      Object.defineProperty(hugeFile, 'size', { value: 60 * 1024 * 1024 * 1024 }); // 60GB
      
      const result = service.quickValidate(hugeFile);

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('File too large');
    });
  });

  describe('getSupportedFormats', () => {
    it('should return supported formats information', () => {
      const info = service.getSupportedFormats();

      expect(info.formats).toContain('mp4');
      expect(info.formats).toContain('avi');
      expect(info.formats).toContain('mov');
      expect(info.mimeTypes).toContain('video/mp4');
      expect(info.maxFileSize).toBe(50 * 1024 * 1024 * 1024); // 50GB
      expect(info.description).toContain('MP4');
    });
  });

  describe('edge cases', () => {
    it('should handle files with no extension', async () => {
      const file = new MockFile(['content'], 'videofile', { type: 'video/mp4' });
      const result = await service.validateFile(file, DEFAULT_IMPORT_OPTIONS);

      expect(result.fileInfo.extension).toBe('');
      // Should still be valid due to correct MIME type
      expect(result.isValid).toBe(true);
    });

    it('should handle files with multiple extensions', async () => {
      const file = new MockFile(['content'], 'file.backup.mp4', { type: 'video/mp4' });
      const result = await service.validateFile(file, DEFAULT_IMPORT_OPTIONS);

      expect(result.fileInfo.extension).toBe('mp4');
      expect(result.isValid).toBe(true);
    });

    it('should handle files with uppercase extensions', async () => {
      const file = new MockFile(['content'], 'VIDEO.MP4', { type: 'video/mp4' });
      const result = await service.validateFile(file, DEFAULT_IMPORT_OPTIONS);

      expect(result.isValid).toBe(true);
    });

    it('should handle concurrent validation requests', async () => {
      const files = Array.from({ length: 10 }, (_, i) => 
        new MockFile([`content${i}`], `file${i}.mp4`, { type: 'video/mp4' })
      );

      const promises = files.map(file => service.validateFile(file, DEFAULT_IMPORT_OPTIONS));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('error handling', () => {
    it('should handle validation errors gracefully', async () => {
      // Create a file that will cause validation to fail
      const problematicFile = new MockFile(['content'], 'test.mp4', { type: 'video/mp4' });
      
      // Mock the validateFileSignature method to throw an error
      jest.spyOn(service as any, 'validateFileSignature').mockRejectedValue(new Error('Read error'));

      const result = await service.validateFile(problematicFile, DEFAULT_IMPORT_OPTIONS);

      expect(result.warnings).toContain('Could not read file signature for validation');
    });

    it('should handle batch validation errors gracefully', async () => {
      const validFile = new MockFile(['content'], 'valid.mp4', { type: 'video/mp4' });
      const problematicFile = new MockFile(['content'], 'problem.mp4', { type: 'video/mp4' });

      // Mock validateFile to throw for the problematic file
      const originalValidateFile = service.validateFile.bind(service);
      jest.spyOn(service, 'validateFile').mockImplementation((file, options) => {
        if (file.name === 'problem.mp4') {
          throw new Error('Validation error');
        }
        return originalValidateFile(file, options);
      });

      const result = await service.validateFiles([validFile, problematicFile], DEFAULT_IMPORT_OPTIONS);

      expect(result.validFiles).toHaveLength(1);
      expect(result.invalidFiles).toHaveLength(1);
      expect(result.invalidFiles[0].reason).toContain('unexpected error');
    });
  });
});