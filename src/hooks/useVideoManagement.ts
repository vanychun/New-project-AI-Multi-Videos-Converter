import { useState, useCallback, useRef, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { 
  VideoFileEnhanced, 
  SearchQuery, 
  ImportResult,
  ProcessingProgress,
  DEFAULT_IMPORT_OPTIONS 
} from '../types/video-enhanced.types';
import { BatchOperation } from '../components/common/BatchProgressIndicator';
import { FileValidationService } from '../services/FileValidationService';
import { ThumbnailGeneratorService } from '../services/ThumbnailGeneratorService';
import { MetadataExtractorService } from '../services/MetadataExtractorService';
import { SearchService } from '../services/SearchService';

export interface VideoProcessingOptions {
  outputFormat: string;
  quality: 'low' | 'medium' | 'high' | 'custom';
  resolution?: { width: number; height: number };
}

export const useVideoManagement = () => {
  // Local state instead of Redux
  const [videos, setVideos] = useState<VideoFileEnhanced[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [operations, setOperations] = useState<BatchOperation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<VideoFileEnhanced[]>([]);

  const fileValidator = FileValidationService.getInstance();
  const thumbnailGenerator = ThumbnailGeneratorService.getInstance();
  const metadataExtractor = MetadataExtractorService.getInstance();
  const searchService = SearchService.getInstance();

  const operationIdCounter = useRef(0);
  const activeOperations = useRef(new Map<string, AbortController>());

  // Initialize search index
  useEffect(() => {
    if (videos.length > 0) {
      const enhancedVideos = videos as VideoFileEnhanced[];
      searchService.buildIndex(enhancedVideos);
      setSearchResults(enhancedVideos);
    }
  }, [videos]);

  const createOperation = (
    type: BatchOperation['type'],
    title: string,
    videoIds: string[]
  ): BatchOperation => {
    const id = `op-${++operationIdCounter.current}`;
    return {
      id,
      type,
      title,
      videoIds,
      progress: { percentage: 0, stage: 'analyzing' },
      startTime: new Date(),
      currentVideoIndex: 0,
      totalVideos: videoIds.length,
      completedVideos: [],
      failedVideos: [],
      canCancel: true,
      canPause: true,
      isPaused: false
    };
  };

  const updateOperation = (
    operationId: string, 
    updates: Partial<BatchOperation>
  ) => {
    setOperations(prev => prev.map(op => 
      op.id === operationId ? { ...op, ...updates } : op
    ));
  };

  const importVideos = useCallback(async (files: File[]): Promise<ImportResult> => {
    setIsLoading(true);
    setError(null);

    const operation = createOperation('import', `Importing ${files.length} video(s)`, []);
    setOperations(prev => [...prev, operation]);

    const abortController = new AbortController();
    activeOperations.current.set(operation.id, abortController);

    try {
      // Validate files
      updateOperation(operation.id, {
        progress: { percentage: 10, stage: 'analyzing', currentOperation: 'Validating files...' }
      });

      const validationResult = await fileValidator.validateFiles(files, DEFAULT_IMPORT_OPTIONS);
      
      if (validationResult.invalidFiles.length > 0) {
        console.warn('Invalid files:', validationResult.invalidFiles);
      }

      const validFiles = validationResult.validFiles;
      const enhancedVideos: VideoFileEnhanced[] = [];
      
      // Process each valid file
      for (let i = 0; i < validFiles.length; i++) {
        if (abortController.signal.aborted) break;

        const file = validFiles[i];
        const progress = 10 + (i / validFiles.length) * 80;
        
        updateOperation(operation.id, {
          currentVideoIndex: i,
          progress: { 
            percentage: progress, 
            stage: 'processing',
            currentOperation: `Processing ${file.name}...`
          }
        });

        try {
          // Create enhanced video object
          const video: VideoFileEnhanced = {
            id: nanoid(),
            file,
            name: file.name,
            path: file.name, // In browser, we don't have full path
            originalName: file.name,
            status: 'importing',
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: undefined,
            thumbnail: undefined,
            thumbnails: undefined
          };

          enhancedVideos.push(video);
          setVideos(prev => [...prev, video]);

          // Generate thumbnails
          updateOperation(operation.id, {
            progress: { 
              percentage: progress + 5, 
              stage: 'processing',
              currentOperation: `Generating thumbnails for ${file.name}...`
            }
          });

          const thumbnailResult = await thumbnailGenerator.generateThumbnails(file, {
            count: 3,
            format: 'jpeg',
            quality: 0.8
          });

          if (thumbnailResult.success) {
            video.thumbnail = thumbnailResult.thumbnails[0];
            video.thumbnails = thumbnailResult.thumbnails;
          }

          // Extract metadata
          updateOperation(operation.id, {
            progress: { 
              percentage: progress + 10, 
              stage: 'processing',
              currentOperation: `Analyzing ${file.name}...`
            }
          });

          const metadataResult = await metadataExtractor.extractMetadata(file);

          if (metadataResult.success) {
            video.metadata = metadataResult.metadata;
            
            // Analyze quality
            const qualityAnalysis = await metadataExtractor.analyzeQuality(metadataResult.metadata);
            video.qualityScore = qualityAnalysis.overallScore;
            video.suggestions = qualityAnalysis.suggestions;
          }

          video.status = 'ready';
          setVideos(prev => prev.map(v => v.id === video.id ? { ...v, ...video } : v));

          operation.completedVideos.push(video.id);
          updateOperation(operation.id, { completedVideos: operation.completedVideos });

        } catch (err) {
          console.error(`Error processing ${file.name}:`, err);
          operation.failedVideos.push({
            videoId: file.name,
            error: err instanceof Error ? err.message : 'Unknown error'
          });
          updateOperation(operation.id, { failedVideos: operation.failedVideos });
        }
      }

      // Finalize
      updateOperation(operation.id, {
        progress: { percentage: 100, stage: 'complete' },
        estimatedEndTime: new Date()
      });

      // Update search index
      searchService.buildIndex(enhancedVideos);

      const result: ImportResult = {
        successful: enhancedVideos,
        failed: validationResult.invalidFiles,
        warnings: validationResult.warnings,
        totalTime: Date.now() - operation.startTime.getTime(),
        statistics: {
          totalFiles: files.length,
          successfulFiles: enhancedVideos.length,
          failedFiles: validationResult.invalidFiles.length,
          totalSize: enhancedVideos.reduce((sum, v) => sum + (v.metadata?.size || 0), 0),
          averageProcessingTime: (Date.now() - operation.startTime.getTime()) / files.length,
          thumbnailsGenerated: enhancedVideos.filter(v => v.thumbnails).length * 3,
          metadataExtracted: enhancedVideos.filter(v => v.metadata).length
        }
      };

      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Import failed';
      setError(errorMessage);
      updateOperation(operation.id, {
        progress: { percentage: 0, stage: 'complete' },
        failedVideos: [{ videoId: 'all', error: errorMessage }]
      });
      throw err;
    } finally {
      setIsLoading(false);
      activeOperations.current.delete(operation.id);
    }
  }, []);

  const processVideos = useCallback(async (
    videoIds: string[], 
    options: VideoProcessingOptions
  ) => {
    const operation = createOperation(
      'process', 
      `Processing ${videoIds.length} video(s)`,
      videoIds
    );
    setOperations(prev => [...prev, operation]);

    const abortController = new AbortController();
    activeOperations.current.set(operation.id, abortController);

    try {
      for (let i = 0; i < videoIds.length; i++) {
        if (abortController.signal.aborted || operation.isPaused) break;

        const videoId = videoIds[i];
        const progress = (i / videoIds.length) * 100;

        updateOperation(operation.id, {
          currentVideoIndex: i,
          currentVideo: videos.find(v => v.id === videoId) as VideoFileEnhanced,
          progress: {
            percentage: progress,
            stage: 'processing',
            currentOperation: `Processing video ${i + 1} of ${videoIds.length}...`
          }
        });

        // Simulate processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        setVideos(prev => prev.map(v => 
          v.id === videoId ? { ...v, status: 'completed' } : v
        ));

        operation.completedVideos.push(videoId);
        updateOperation(operation.id, { completedVideos: operation.completedVideos });
      }

      updateOperation(operation.id, {
        progress: { percentage: 100, stage: 'complete' },
        estimatedEndTime: new Date()
      });

    } catch (err) {
      console.error('Processing error:', err);
    } finally {
      activeOperations.current.delete(operation.id);
    }
  }, [videos]);

  const searchVideos = useCallback(async (query: SearchQuery) => {
    try {
      const enhancedVideos = videos as VideoFileEnhanced[];
      const result = await searchService.search(enhancedVideos, query);
      setSearchResults(result.videos);
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults(videos as VideoFileEnhanced[]);
    }
  }, [videos]);

  const selectVideo = useCallback((videoId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
      } else {
        newSet.add(videoId);
      }
      return newSet;
    });
  }, []);

  const selectMultipleVideos = useCallback((videoIds: string[]) => {
    setSelectedIds(new Set(videoIds));
  }, []);

  const removeVideos = useCallback((videoIds: string[]) => {
    setVideos(prev => prev.filter(v => !videoIds.includes(v.id)));
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      videoIds.forEach(id => newSet.delete(id));
      return newSet;
    });
    // Update search index
    const remaining = videos.filter(v => !videoIds.includes(v.id));
    searchService.buildIndex(remaining as VideoFileEnhanced[]);
  }, [videos]);

  const updateVideo = useCallback((videoId: string, updates: Partial<VideoFileEnhanced>) => {
    setVideos(prev => prev.map(v => 
      v.id === videoId ? { ...v, ...updates } : v
    ));
    // Update search index entry
    const video = videos.find(v => v.id === videoId);
    if (video) {
      searchService.updateIndexEntry({ ...video, ...updates } as VideoFileEnhanced);
    }
  }, [videos]);

  const cancelOperation = useCallback((operationId: string) => {
    const controller = activeOperations.current.get(operationId);
    if (controller) {
      controller.abort();
      activeOperations.current.delete(operationId);
    }
    updateOperation(operationId, {
      progress: { percentage: 0, stage: 'complete' },
      canCancel: false
    });
  }, []);

  const pauseOperation = useCallback((operationId: string) => {
    updateOperation(operationId, { isPaused: true });
  }, []);

  const resumeOperation = useCallback((operationId: string) => {
    updateOperation(operationId, { isPaused: false });
  }, []);

  const retryOperation = useCallback((operationId: string, failedVideoIds: string[]) => {
    console.log('Retry operation:', operationId, failedVideoIds);
  }, []);

  const dismissOperation = useCallback((operationId: string) => {
    setOperations(prev => prev.filter(op => op.id !== operationId));
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    videos: searchResults.length > 0 || searchResults === videos ? searchResults : videos as VideoFileEnhanced[],
    selectedVideoIds: Array.from(selectedIds),
    operations,
    isLoading,
    error,
    importVideos,
    selectVideo,
    selectMultipleVideos,
    removeVideos,
    updateVideo,
    searchVideos,
    processVideos,
    cancelOperation,
    pauseOperation,
    resumeOperation,
    retryOperation,
    dismissOperation,
    clearError
  };
};