import { Middleware } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { Video } from '../../types/video.types';

/**
 * File registry to store File objects outside of Redux state
 * This prevents serialization issues while maintaining access to File objects
 */
class FileRegistry {
  private fileMap = new Map<string, File>();

  setFile(videoId: string, file: File): void {
    this.fileMap.set(videoId, file);
  }

  getFile(videoId: string): File | undefined {
    return this.fileMap.get(videoId);
  }

  removeFile(videoId: string): void {
    this.fileMap.delete(videoId);
  }

  clear(): void {
    this.fileMap.clear();
  }

  hasFile(videoId: string): boolean {
    return this.fileMap.has(videoId);
  }
}

// Global file registry instance
export const fileRegistry = new FileRegistry();

/**
 * Middleware to handle video file objects and ensure serializable state
 */
export const videoStateMiddleware: Middleware<{}, RootState> = (store) => (next) => (action) => {
  // Handle video-related actions
  if (action.type === 'videos/addVideos' && action.payload) {
    // Extract and store File objects separately
    const videosWithoutFiles = action.payload.map((video: Video) => {
      if (video.originalFile) {
        // Store File object in registry
        fileRegistry.setFile(video.id, video.originalFile);
        
        // Remove File object from Redux state
        const { originalFile, ...videoWithoutFile } = video;
        return videoWithoutFile;
      }
      return video;
    });

    // Dispatch action with cleaned videos
    return next({
      ...action,
      payload: videosWithoutFiles
    });
  }

  // Handle video removal
  if (action.type === 'videos/removeVideo' && typeof action.payload === 'string') {
    // Clean up File registry
    fileRegistry.removeFile(action.payload);
  }

  // Handle project clearing
  if (action.type === 'videos/clearProject') {
    fileRegistry.clear();
  }

  // Handle video loading from project
  if (action.type === 'videos/loadProject' && action.payload) {
    // Note: When loading projects, File objects won't be available
    // This is expected behavior as File objects can't be persisted
    console.log('🔄 Loading project - File objects will not be available for imported videos');
  }

  return next(action);
};

/**
 * Helper function to get File object for a video
 * Use this instead of accessing video.originalFile directly
 */
export const getVideoFile = (videoId: string): File | undefined => {
  return fileRegistry.getFile(videoId);
};

/**
 * Helper function to check if a video has an associated File object
 */
export const hasVideoFile = (videoId: string): boolean => {
  return fileRegistry.hasFile(videoId);
};

/**
 * Helper function to create blob URL from stored File object
 */
export const createVideoBlob = (videoId: string): string | null => {
  const file = fileRegistry.getFile(videoId);
  if (file) {
    return URL.createObjectURL(file);
  }
  return null;
};

/**
 * Helper function to get video source for playback
 * Returns the appropriate source based on available data
 */
export const getVideoSource = (video: Video): string | null => {
  // Try to get File object from registry first
  const file = fileRegistry.getFile(video.id);
  if (file) {
    return URL.createObjectURL(file);
  }
  
  // Fall back to video path
  if (video.path) {
    return video.path;
  }
  
  return null;
};