import { SUPPORTED_VIDEO_FORMATS, SUPPORTED_VIDEO_CODECS, FileImportOptions, FailedImport, ImportWarning } from '../types/video-enhanced.types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileInfo: {
    extension: string;
    mimeType: string;
    size: number;
    name: string;
  };
}

export interface BatchValidationResult {
  validFiles: File[];
  invalidFiles: FailedImport[];
  warnings: ImportWarning[];
  statistics: {
    totalFiles: number;
    validFiles: number;
    invalidFiles: number;
    totalSize: number;
    largestFile: { name: string; size: number };
    averageSize: number;
  };
}

export class FileValidationService {
  private static instance: FileValidationService;
  
  private readonly VIDEO_MIME_TYPES = new Set([
    'video/mp4',
    'video/avi',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
    'video/x-ms-wmv',
    'video/x-flv',
    'video/x-matroska',
    'video/3gpp',
    'video/ogg',
    'video/mp2t',
    'video/x-m4v'
  ]);

  private readonly MAGIC_NUMBERS = new Map([
    // MP4
    [[0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], 'mp4'],
    [[0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70], 'mp4'],
    // AVI
    [[0x52, 0x49, 0x46, 0x46], 'avi'],
    // MOV/QuickTime
    [[0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74], 'mov'],
    // WebM
    [[0x1A, 0x45, 0xDF, 0xA3], 'webm'],
    // MKV
    [[0x1A, 0x45, 0xDF, 0xA3], 'mkv'],
    // FLV
    [[0x46, 0x4C, 0x56, 0x01], 'flv']
  ]);

  public static getInstance(): FileValidationService {
    if (!FileValidationService.instance) {
      FileValidationService.instance = new FileValidationService();
    }
    return FileValidationService.instance;
  }

  private constructor() {}

  /**
   * Validate a single file
   */
  public async validateFile(file: File, options: FileImportOptions): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const fileInfo = {
      extension: this.getFileExtension(file.name),
      mimeType: file.type,
      size: file.size,
      name: file.name
    };

    // Check file size
    if (options.maxFileSize && file.size > options.maxFileSize) {
      errors.push(`File size (${this.formatFileSize(file.size)}) exceeds maximum allowed size (${this.formatFileSize(options.maxFileSize)})`);
    }

    // Check if file is empty
    if (file.size === 0) {
      errors.push('File is empty');
    }

    // Check file extension
    if (options.validateFormat) {
      const extension = fileInfo.extension.toLowerCase();
      if (options.allowedFormats && !options.allowedFormats.includes(extension)) {
        errors.push(`File format '${extension}' is not supported. Supported formats: ${options.allowedFormats.join(', ')}`);
      }
    }

    // Check MIME type
    if (file.type && !this.VIDEO_MIME_TYPES.has(file.type)) {
      warnings.push(`Unexpected MIME type: ${file.type}. File may not be a valid video.`);
    }

    // Check file signature (magic numbers)
    try {
      const isValidSignature = await this.validateFileSignature(file);
      if (!isValidSignature) {
        warnings.push('File signature does not match expected video file format. File may be corrupted or misnamed.');
      }
    } catch (error) {
      warnings.push('Could not read file signature for validation');
    }

    // Check for common issues
    await this.performAdditionalChecks(file, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      fileInfo
    };
  }

  /**
   * Validate multiple files in batch
   */
  public async validateFiles(files: File[], options: FileImportOptions): Promise<BatchValidationResult> {
    const validFiles: File[] = [];
    const invalidFiles: FailedImport[] = [];
    const warnings: ImportWarning[] = [];
    
    let totalSize = 0;
    let largestFile = { name: '', size: 0 };

    // Process files concurrently but limit concurrency to avoid overwhelming the system
    const BATCH_SIZE = 10;
    const batches = this.chunkArray(files, BATCH_SIZE);
    
    for (const batch of batches) {
      const batchPromises = batch.map(async (file) => {
        try {
          const result = await this.validateFile(file, options);
          
          totalSize += file.size;
          
          if (file.size > largestFile.size) {
            largestFile = { name: file.name, size: file.size };
          }
          
          // Add warnings to the main warnings array
          result.warnings.forEach(warning => {
            warnings.push({
              file,
              message: warning,
              severity: 'medium'
            });
          });
          
          if (result.isValid) {
            validFiles.push(file);
          } else {
            invalidFiles.push({
              file,
              reason: result.errors.join(', '),
              error: new Error(result.errors.join(', ')),
              suggestions: this.generateSuggestions(result.errors, file)
            });
          }
        } catch (error) {
          invalidFiles.push({
            file,
            reason: 'Validation failed due to unexpected error',
            error: error as Error,
            suggestions: ['Try re-selecting the file', 'Check if the file is not corrupted']
          });
        }
      });
      
      await Promise.all(batchPromises);
    }

    return {
      validFiles,
      invalidFiles,
      warnings,
      statistics: {
        totalFiles: files.length,
        validFiles: validFiles.length,
        invalidFiles: invalidFiles.length,
        totalSize,
        largestFile,
        averageSize: files.length > 0 ? totalSize / files.length : 0
      }
    };
  }

  /**
   * Check file signature using magic numbers
   */
  private async validateFileSignature(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const buffer = event.target?.result as ArrayBuffer;
          if (!buffer) {
            resolve(false);
            return;
          }

          const bytes = new Uint8Array(buffer);
          const isValid = this.checkMagicNumbers(bytes);
          resolve(isValid);
        } catch (error) {
          resolve(false);
        }
      };
      
      reader.onerror = () => resolve(false);
      
      // Read first 32 bytes for magic number checking
      reader.readAsArrayBuffer(file.slice(0, 32));
    });
  }

  /**
   * Check magic numbers against known video formats
   */
  private checkMagicNumbers(bytes: Uint8Array): boolean {
    for (const [magicBytes, format] of this.MAGIC_NUMBERS) {
      if (this.arrayStartsWith(bytes, magicBytes)) {
        return true;
      }
    }
    
    // Additional checks for formats that might have variable headers
    return this.checkVariableHeaders(bytes);
  }

  /**
   * Check for video formats with variable headers
   */
  private checkVariableHeaders(bytes: Uint8Array): boolean {
    // Check for AVI (RIFF format)
    if (bytes.length >= 12) {
      const riffHeader = Array.from(bytes.slice(0, 4));
      const aviHeader = Array.from(bytes.slice(8, 12));
      if (this.arrayEquals(riffHeader, [0x52, 0x49, 0x46, 0x46]) && 
          this.arrayEquals(aviHeader, [0x41, 0x56, 0x49, 0x20])) {
        return true;
      }
    }
    
    // Check for MP4/MOV variants
    if (bytes.length >= 12) {
      const ftypIndex = this.findSequence(bytes, [0x66, 0x74, 0x79, 0x70]);
      if (ftypIndex !== -1 && ftypIndex < 8) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Perform additional checks for common file issues
   */
  private async performAdditionalChecks(file: File, warnings: string[]): Promise<void> {
    // Check for suspicious file names
    if (this.isSuspiciousFileName(file.name)) {
      warnings.push('File name contains suspicious characters or patterns');
    }
    
    // Check for very small files that might not be valid videos
    const MIN_VIDEO_SIZE = 1024; // 1KB
    if (file.size < MIN_VIDEO_SIZE) {
      warnings.push('File size is unusually small for a video file');
    }
    
    // Check for extremely large files
    const MAX_REASONABLE_SIZE = 50 * 1024 * 1024 * 1024; // 50GB
    if (file.size > MAX_REASONABLE_SIZE) {
      warnings.push('File size is unusually large. Processing may take significant time and resources.');
    }
    
    // Check last modified date
    const fileDate = new Date(file.lastModified);
    const now = new Date();
    const daysDiff = (now.getTime() - fileDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDiff > 365 * 10) { // Older than 10 years
      warnings.push('File is very old. Please verify it is not corrupted.');
    }
  }

  /**
   * Generate helpful suggestions based on validation errors
   */
  private generateSuggestions(errors: string[], file: File): string[] {
    const suggestions: string[] = [];
    
    for (const error of errors) {
      if (error.includes('not supported')) {
        suggestions.push('Convert the file to a supported format (MP4, AVI, MOV, etc.)');
        suggestions.push('Check if the file extension matches the actual format');
      }
      
      if (error.includes('exceeds maximum')) {
        suggestions.push('Compress the video to reduce file size');
        suggestions.push('Split the video into smaller segments');
      }
      
      if (error.includes('empty')) {
        suggestions.push('Re-export the video from the original source');
        suggestions.push('Check if the file was completely downloaded');
      }
      
      if (error.includes('corrupted')) {
        suggestions.push('Try re-downloading or re-creating the file');
        suggestions.push('Use video repair tools to fix corruption');
      }
    }
    
    if (suggestions.length === 0) {
      suggestions.push('Check file integrity and try again');
      suggestions.push('Contact support if the problem persists');
    }
    
    return suggestions;
  }

  /**
   * Utility Methods
   */
  private getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot === -1 ? '' : fileName.slice(lastDot + 1);
  }

  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  }

  private isSuspiciousFileName(fileName: string): boolean {
    const suspiciousPatterns = [
      /[<>:"|?*]/, // Invalid characters for most file systems
      /^\./,       // Hidden files
      /\s+$/,      // Trailing whitespace
      /^\s+/,      // Leading whitespace
      /\x00-\x1f/, // Control characters
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(fileName));
  }

  private arrayStartsWith(array: Uint8Array, prefix: number[]): boolean {
    if (array.length < prefix.length) return false;
    return prefix.every((byte, index) => array[index] === byte);
  }

  private arrayEquals(a: number[], b: number[]): boolean {
    return a.length === b.length && a.every((val, index) => val === b[index]);
  }

  private findSequence(array: Uint8Array, sequence: number[]): number {
    for (let i = 0; i <= array.length - sequence.length; i++) {
      if (sequence.every((byte, offset) => array[i + offset] === byte)) {
        return i;
      }
    }
    return -1;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Quick validation for drag & drop operations
   */
  public quickValidate(file: File): { isValid: boolean; reason?: string } {
    // Quick checks without reading file content
    const extension = this.getFileExtension(file.name).toLowerCase();
    
    if (!SUPPORTED_VIDEO_FORMATS.includes(extension as any)) {
      return { isValid: false, reason: `Unsupported format: ${extension}` };
    }
    
    if (file.size === 0) {
      return { isValid: false, reason: 'Empty file' };
    }
    
    if (file.size > 50 * 1024 * 1024 * 1024) { // 50GB
      return { isValid: false, reason: 'File too large' };
    }
    
    return { isValid: true };
  }

  /**
   * Get supported formats information
   */
  public getSupportedFormats(): {
    formats: string[];
    mimeTypes: string[];
    maxFileSize: number;
    description: string;
  } {
    return {
      formats: [...SUPPORTED_VIDEO_FORMATS],
      mimeTypes: [...this.VIDEO_MIME_TYPES],
      maxFileSize: 50 * 1024 * 1024 * 1024, // 50GB
      description: 'Supported video formats: MP4, AVI, MOV, MKV, WebM, WMV, FLV, and more'
    };
  }
}