import React from 'react';
import { useDispatch } from 'react-redux';
import { addVideos } from '../../store/slices/videoSlice';
import { addNotification } from '../../store/slices/uiSlice';
import { v4 as uuidv4 } from 'uuid';
import { Video } from '../../types/video.types';
import './FileImportButton.css';

const FileImportButton: React.FC = () => {
  const dispatch = useDispatch();

  const handleFileImport = async () => {
    try {
      // Use Electron's dialog API to open file picker
      const result = await window.electronAPI.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [
          { 
            name: 'Video Files', 
            extensions: ['mp4', 'avi', 'mov', 'mkv', 'webm', 'wmv', 'flv', 'm4v', '3gp', 'ts', 'mts', 'mxf'] 
          },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return;
      }

      // Process each selected file
      const videoPromises = result.filePaths.map(async (filePath) => {
        try {
          // Get video metadata using FFmpeg
          console.log('🔍 Getting metadata for:', filePath);
          const metadata = await window.electronAPI.getVideoInfo(filePath);
          console.log('📊 Metadata received:', metadata);
          
          if (!metadata) {
            throw new Error('Failed to read video metadata');
          }

          // Extract filename from path
          const filename = filePath.split(/[\\/]/).pop() || 'Unknown Video';
          
          // Convert file path to file:// URL for browser access
          // Handle different path formats
          let fileUrl: string;
          if (filePath.startsWith('file://')) {
            fileUrl = filePath;
          } else if (filePath.startsWith('/')) {
            // Unix-style absolute path
            fileUrl = `file://${filePath}`;
          } else if (/^[A-Za-z]:/.test(filePath)) {
            // Windows drive path (C:\path\to\file)
            fileUrl = `file:///${filePath.replace(/\\/g, '/')}`;
          } else {
            // Relative or other format - convert to absolute
            fileUrl = `file:///${filePath.replace(/\\/g, '/')}`;
          }
          
          console.log('📁 Converted path:', { original: filePath, converted: fileUrl });
          
          // Create video object  
          console.log('🎬 Creating video object with path:', fileUrl);
          const video: Video = {
            id: uuidv4(),
            name: filename,
            path: fileUrl, // Use file:// URL instead of raw path
            size: metadata.size || 0,
            duration: metadata.duration || 0,
            format: metadata.format || 'unknown',
            resolution: metadata.resolution || '0x0',
            fps: metadata.fps || 0,
            bitrate: metadata.bitrate || 0,
            status: 'ready',
            metadata: {
              width: metadata.width || 0,
              height: metadata.height || 0,
              aspectRatio: metadata.aspectRatio || '16:9',
              codec: metadata.codec || 'unknown',
              audioCodec: metadata.audioCodec,
              audioChannels: metadata.audioChannels,
              audioSampleRate: metadata.audioSampleRate,
              frameRate: metadata.fps || 0,
              duration: metadata.duration,
              hasAudio: metadata.hasAudio || false,
              hasVideo: metadata.hasVideo || true,
            },
            createdAt: Date.now(),
            modifiedAt: Date.now(),
          };

          // Generate thumbnail - TODO: Implement this when extractThumbnail is available
          // try {
          //   const thumbnailTime = Math.min(metadata.duration * 0.1, 5); // 10% or 5 seconds max
          //   const thumbnail = await window.electronAPI.extractThumbnail(filePath, thumbnailTime);
          //   if (thumbnail) {
          //     video.thumbnail = thumbnail;
          //   }
          // } catch (error) {
          //   console.warn('Failed to generate thumbnail:', error);
          // }

          console.log('✅ Final video object:', video);
          return video;
        } catch (error) {
          console.error(`Failed to process video ${filePath}:`, error);
          dispatch(addNotification({
            type: 'error',
            title: 'Import Failed',
            message: `Failed to import ${filePath.split(/[\\/]/).pop()}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            autoClose: true,
            duration: 5000,
          }));
          return null;
        }
      });

      // Wait for all videos to be processed
      const videos = (await Promise.all(videoPromises)).filter((v): v is Video => v !== null);

      if (videos.length > 0) {
        // Add videos to store
        dispatch(addVideos(videos));
        
        // Show success notification
        dispatch(addNotification({
          type: 'success',
          title: 'Videos Imported',
          message: `Successfully imported ${videos.length} video${videos.length !== 1 ? 's' : ''}`,
          autoClose: true,
          duration: 3000,
        }));
      }

    } catch (error) {
      console.error('File import error:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'Import Error',
        message: 'Failed to open file dialog. Please try again.',
        autoClose: true,
        duration: 5000,
      }));
    }
  };

  return (
    <button 
      className="file-import-button"
      onClick={handleFileImport}
      title="Import video files"
      data-testid="file-import-button"
    >
      <span className="import-icon">📁</span>
      <span className="import-text">Import Videos</span>
    </button>
  );
};

export default FileImportButton;