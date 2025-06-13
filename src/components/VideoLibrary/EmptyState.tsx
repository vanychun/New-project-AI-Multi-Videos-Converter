import React, { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { addNotification } from '../../store/slices/uiSlice';
import { addVideos } from '../../store/slices/videoSlice';
import { videoImportService, ImportProgress } from '../../services/VideoImportService';
import BatchImportProgress from './BatchImportProgress';
import './EmptyState.css';

interface EmptyStateProps {
  onImport?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  onImport, 
  className = '' 
}) => {
  const dispatch = useDispatch();
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [importProgresses, setImportProgresses] = useState<ImportProgress[]>([]);
  const [showImportProgress, setShowImportProgress] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        setIsDragOver(false);
      }
      return newCounter;
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragCounter(0);

    if (isImporting) return;

    const files = Array.from(e.dataTransfer.files);
    
    if (files.length === 0) return;

    // Start import process
    setIsImporting(true);
    setShowImportProgress(true);
    setImportProgresses([]);

    try {
      const result = await videoImportService.importFiles(files, (progresses) => {
        setImportProgresses([...progresses]);
      });

      if (result.successful.length > 0) {
        // Add successful videos to store
        dispatch(addVideos(result.successful));
        
        dispatch(addNotification({
          type: 'success',
          title: 'Import Complete',
          message: `Successfully imported ${result.successful.length} video${result.successful.length !== 1 ? 's' : ''}`,
          autoClose: true,
          duration: 3000
        }));
      }

      if (result.failed.length > 0) {
        dispatch(addNotification({
          type: 'warning',
          title: 'Partial Import',
          message: `${result.failed.length} file${result.failed.length !== 1 ? 's' : ''} failed to import`,
          autoClose: true,
          duration: 4000
        }));
      }
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        title: 'Import Failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        autoClose: true,
        duration: 5000
      }));
    } finally {
      setIsImporting(false);
    }
  }, [dispatch, isImporting]);

  const handleImportClick = useCallback(async () => {
    if (isImporting) return;

    try {
      // Try Electron API first
      if (window.electronAPI?.selectFiles) {
        const filePaths = await window.electronAPI.selectFiles();
        if (filePaths && filePaths.length > 0) {
          setIsImporting(true);
          setShowImportProgress(true);
          setImportProgresses([]);

          try {
            const result = await videoImportService.importFilePaths(filePaths, (progresses) => {
              setImportProgresses([...progresses]);
            });

            if (result.successful.length > 0) {
              dispatch(addVideos(result.successful));
              dispatch(addNotification({
                type: 'success',
                title: 'Import Complete',
                message: `Successfully imported ${result.successful.length} video${result.successful.length !== 1 ? 's' : ''}`,
                autoClose: true,
                duration: 3000
              }));
            }

            if (result.failed.length > 0) {
              dispatch(addNotification({
                type: 'warning',
                title: 'Partial Import',
                message: `${result.failed.length} file${result.failed.length !== 1 ? 's' : ''} failed to import`,
                autoClose: true,
                duration: 4000
              }));
            }
          } finally {
            setIsImporting(false);
          }
          return;
        }
      }
      
      // Fallback to browser file input
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = 'video/*,.mp4,.avi,.mov,.mkv,.webm,.wmv,.flv,.m4v,.3gp';
      input.onchange = async (e) => {
        const files = Array.from((e.target as HTMLInputElement).files || []);
        if (files.length > 0) {
          setIsImporting(true);
          setShowImportProgress(true);
          setImportProgresses([]);

          try {
            const result = await videoImportService.importFiles(files, (progresses) => {
              setImportProgresses([...progresses]);
            });

            if (result.successful.length > 0) {
              dispatch(addVideos(result.successful));
              dispatch(addNotification({
                type: 'success',
                title: 'Import Complete',
                message: `Successfully imported ${result.successful.length} video${result.successful.length !== 1 ? 's' : ''}`,
                autoClose: true,
                duration: 3000
              }));
            }

            if (result.failed.length > 0) {
              dispatch(addNotification({
                type: 'warning',
                title: 'Partial Import',
                message: `${result.failed.length} file${result.failed.length !== 1 ? 's' : ''} failed to import`,
                autoClose: true,
                duration: 4000
              }));
            }
          } catch (error) {
            dispatch(addNotification({
              type: 'error',
              title: 'Import Failed',
              message: error instanceof Error ? error.message : 'Unknown error occurred',
              autoClose: true,
              duration: 5000
            }));
          } finally {
            setIsImporting(false);
          }
        }
      };
      input.click();
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        title: 'Import Error',
        message: 'Failed to open file browser',
        autoClose: true,
        duration: 3000
      }));
    }
  }, [dispatch, isImporting]);

  const supportedFormats = [
    'MP4', 'AVI', 'MOV', 'MKV', 'WebM', 'WMV', 'FLV', 'M4V'
  ];

  return (
    <div 
      className={`empty-state ${isDragOver ? 'drag-over' : ''} ${className}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      data-testid="empty-library"
    >
      <div className="empty-state-content">
        {/* Animated Icon */}
        <div className="empty-state-icon">
          <div className="icon-container">
            <div className="video-icon">
              🎬
            </div>
            <div className="upload-indicator">
              <div className="upload-arrow">↑</div>
            </div>
          </div>
        </div>

        {/* Main Message */}
        <div className="empty-state-message">
          <h3 className="empty-title">
            {isDragOver ? 'Drop your videos here!' : 
             isImporting ? 'Importing videos...' :
             'No videos in your library'}
          </h3>
          <p className="empty-description">
            {isDragOver 
              ? 'Release to import your video files'
              : isImporting
              ? 'Please wait while we process your video files'
              : 'Drag & drop video files here, or click the button below to get started'
            }
          </p>
        </div>

        {/* Action Buttons */}
        {!isDragOver && !isImporting && (
          <div className="empty-state-actions">
            <button 
              className="import-button primary"
              onClick={handleImportClick}
              data-testid="empty-state-import-button"
              disabled={isImporting}
            >
              <span className="button-icon">📁</span>
              Import Videos
            </button>
            
            <button 
              className="browse-button secondary"
              onClick={handleImportClick}
              disabled={isImporting}
            >
              <span className="button-icon">🔍</span>
              Browse Files
            </button>
          </div>
        )}

        {/* Loading State */}
        {isImporting && (
          <div className="import-loading">
            <div className="loading-spinner" />
            <p className="loading-text">Processing files...</p>
          </div>
        )}

        {/* Supported Formats */}
        <div className="supported-formats">
          <h4 className="formats-title">Supported Formats:</h4>
          <div className="formats-list">
            {supportedFormats.map((format, index) => (
              <span key={format} className="format-tag">
                {format}
              </span>
            ))}
          </div>
        </div>

        {/* Quick Tips */}
        <div className="quick-tips">
          <h4 className="tips-title">💡 Quick Tips:</h4>
          <ul className="tips-list">
            <li>Drag multiple files at once for batch import</li>
            <li>Use AI enhancement for better video quality</li>
            <li>Organize videos with tags and filters</li>
            <li>Export in various formats and resolutions</li>
          </ul>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="keyboard-hints">
          <small className="hints-text">
            💡 <strong>Pro tip:</strong> Press <kbd>Ctrl+O</kbd> to import files, 
            <kbd>F1</kbd> for help, or <kbd>Ctrl+Shift+T</kbd> for a guided tour
          </small>
        </div>
      </div>

      {/* Drag Overlay */}
      {isDragOver && (
        <div className="drag-overlay">
          <div className="drag-overlay-content">
            <div className="drag-icon">📤</div>
            <h3>Drop to Import</h3>
            <p>Release your video files here</p>
          </div>
        </div>
      )}

      {/* Batch Import Progress */}
      <BatchImportProgress
        progresses={importProgresses}
        isVisible={showImportProgress}
        onClose={() => setShowImportProgress(false)}
        title="Importing Videos"
      />
    </div>
  );
};

export default EmptyState;