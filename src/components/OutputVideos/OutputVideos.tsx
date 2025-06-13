import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { addNotification } from '../../store/slices/uiSlice';
import { 
  addOutputVideo, 
  removeOutputVideo, 
  clearOutputVideos,
  setSelectedOutputVideos 
} from '../../store/slices/outputSlice';
import { setOutputPath } from '../../store/slices/settingsSlice';
import OutputVideoCard, { OutputVideo } from './OutputVideoCard';
import DeleteConfirmationDialog from '../common/DeleteConfirmationDialog';
import useDeleteConfirmation from '../../hooks/useDeleteConfirmation';
import './OutputVideos.css';
import './OutputVideoCard.css';

type SortOption = 'name' | 'date' | 'size' | 'duration' | 'processing-time';
type ViewMode = 'grid' | 'list';

const OutputVideos: React.FC = () => {
  const dispatch = useDispatch();
  
  // Safe selectors with fallbacks
  const outputState = useSelector((state: RootState) => state.output || {});
  const { outputVideos = [], selectedOutputVideos = [] } = outputState;
  const processingState = useSelector((state: RootState) => state.processing || {});
  const { processingQueue = [] } = processingState;
  
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { confirmation, showDeleteConfirmation } = useDeleteConfirmation();

  // Sync completed processing items to output videos
  useEffect(() => {
    try {
      if (!Array.isArray(processingQueue) || !Array.isArray(outputVideos)) {
        return;
      }
      
      const completedItems = processingQueue.filter(item => 
        item && 
        item.status === 'completed' && 
        item.outputPath && 
        !outputVideos.find(output => output && output.path === item.outputPath)
      );

    completedItems.forEach(item => {
      const outputVideo: OutputVideo = {
        id: `output_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        originalVideoId: item.videoId || '',
        name: item.outputPath?.split('/').pop() || item.videoName || 'Unknown',
        originalName: item.videoName || 'Unknown',
        path: item.outputPath || '',
        size: item.outputSize || 0,
        duration: item.duration || 0,
        format: item.outputPath?.split('.').pop() || 'mp4',
        resolution: item.resolution || '1080p',
        thumbnail: item.thumbnail,
        createdAt: item.startedAt || Date.now(),
        completedAt: item.completedAt || Date.now(),
        processingTime: (item.completedAt || Date.now()) - (item.startedAt || Date.now()),
        settings: {
          quality: item.quality || 'high',
          codec: item.codec || 'h264',
          effects: item.effects?.map(e => e.name) || []
        },
        stats: {
          compressionRatio: item.outputSize && item.inputSize 
            ? item.outputSize / item.inputSize 
            : 1,
          avgSpeed: item.avgProcessingSpeed || 1.0,
          peakMemory: item.peakMemory || '0MB'
        }
      };

      dispatch(addOutputVideo(outputVideo));
    });
    } catch (error) {
      console.error('Error syncing processing queue to output videos:', error);
    }
  }, [processingQueue, outputVideos, dispatch]);

  // Filter and sort videos
  const filteredAndSortedVideos = useMemo(() => {
    try {
      if (!Array.isArray(outputVideos)) {
        return [];
      }
      
      let filtered = outputVideos;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(video =>
        video.name.toLowerCase().includes(query) ||
        video.originalName.toLowerCase().includes(query) ||
        video.format.toLowerCase().includes(query) ||
        video.settings.effects?.some(effect => effect.toLowerCase().includes(query))
      );
    }

    // Sort videos
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          return b.completedAt - a.completedAt; // Newest first
        case 'size':
          return b.size - a.size; // Largest first
        case 'duration':
          return b.duration - a.duration; // Longest first
        case 'processing-time':
          return b.processingTime - a.processingTime; // Slowest first
        default:
          return 0;
      }
    });

    return sorted;
    } catch (error) {
      console.error('Error filtering and sorting videos:', error);
      return [];
    }
  }, [outputVideos, searchQuery, sortBy]);

  const totalSize = Array.isArray(outputVideos) ? outputVideos.reduce((sum, video) => sum + (video?.size || 0), 0) : 0;
  const totalProcessingTime = Array.isArray(outputVideos) ? outputVideos.reduce((sum, video) => sum + (video?.processingTime || 0), 0) : 0;

  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatProcessingTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const handleSelectVideo = (videoId: string, selected: boolean) => {
    const currentSelected = new Set(selectedOutputVideos);
    
    if (selected) {
      currentSelected.add(videoId);
    } else {
      currentSelected.delete(videoId);
    }
    
    dispatch(setSelectedOutputVideos(Array.from(currentSelected)));
  };

  const handleSelectAll = () => {
    if (selectedOutputVideos.length === filteredAndSortedVideos.length) {
      dispatch(setSelectedOutputVideos([]));
    } else {
      dispatch(setSelectedOutputVideos(filteredAndSortedVideos.map(v => v.id)));
    }
  };

  const handleOpen = async (video: OutputVideo) => {
    try {
      if (window.electronAPI?.openFile) {
        await window.electronAPI.openFile(video.path);
      }
    } catch (error) {
      console.error('Failed to open file:', error);
      dispatch(addNotification({
        id: Date.now().toString(),
        type: 'error',
        title: 'Failed to Open',
        message: 'Could not open the output file',
        duration: 4000
      }));
    }
  };

  const handleReveal = async (video: OutputVideo) => {
    try {
      if (window.electronAPI?.revealFile) {
        await window.electronAPI.revealFile(video.path);
      }
    } catch (error) {
      console.error('Failed to reveal file:', error);
      dispatch(addNotification({
        id: Date.now().toString(),
        type: 'error',
        title: 'Failed to Reveal',
        message: 'Could not show file in explorer',
        duration: 4000
      }));
    }
  };

  const handlePreview = (video: OutputVideo) => {
    // TODO: Implement preview modal with before/after comparison
    console.log('Preview video:', video);
    dispatch(addNotification({
      id: Date.now().toString(),
      type: 'info',
      title: 'Preview Coming Soon',
      message: 'Video preview feature is in development',
      duration: 3000
    }));
  };

  const handleShare = (video: OutputVideo) => {
    // TODO: Implement sharing options (social media, cloud storage, etc.)
    console.log('Share video:', video);
    dispatch(addNotification({
      id: Date.now().toString(),
      type: 'info',
      title: 'Sharing Options',
      message: 'Sharing features are in development',
      duration: 3000
    }));
  };

  const handleDelete = (video: OutputVideo) => {
    showDeleteConfirmation(
      video.name,
      () => {
        dispatch(removeOutputVideo(video.id));
        dispatch(addNotification({
          id: Date.now().toString(),
          type: 'success',
          title: 'Output Removed',
          message: `Removed ${video.name} from output library`,
          duration: 3000
        }));
      }
    );
  };

  const handleBatchDelete = () => {
    const selectedVideos = outputVideos.filter(v => selectedOutputVideos.includes(v.id));
    
    showDeleteConfirmation(
      `${selectedVideos.length} output videos`,
      () => {
        selectedVideos.forEach(video => {
          dispatch(removeOutputVideo(video.id));
        });
        dispatch(setSelectedOutputVideos([]));
        dispatch(addNotification({
          id: Date.now().toString(),
          type: 'success',
          title: 'Outputs Removed',
          message: `Removed ${selectedVideos.length} videos from output library`,
          duration: 3000
        }));
      }
    );
  };

  const handleSelectOutputFolder = async () => {
    try {
      console.log('Selecting output folder...');
      
      if (!window.electronAPI) {
        throw new Error('Electron API not available');
      }
      
      if (!window.electronAPI.selectOutputDirectory) {
        throw new Error('selectOutputDirectory method not available');
      }
      
      const selectedDir = await window.electronAPI.selectOutputDirectory();
      console.log('Selected output directory:', selectedDir);
      
      if (!selectedDir) {
        // User cancelled the dialog
        return;
      }
      
      // Update the settings with the new output directory
      dispatch(setOutputPath(selectedDir));
      
      dispatch(addNotification({
        id: Date.now().toString(),
        type: 'success',
        title: 'Output Folder Selected',
        message: `Output directory set to: ${selectedDir}`,
        duration: 4000
      }));
    } catch (error) {
      console.error('Failed to select output folder:', error);
      dispatch(addNotification({
        id: Date.now().toString(),
        type: 'error',
        title: 'Failed to Select Folder',
        message: error instanceof Error ? error.message : 'Could not select output directory',
        duration: 4000
      }));
    }
  };

  const handleClearHistory = () => {
    showDeleteConfirmation(
      'all output video history',
      () => {
        dispatch(clearOutputVideos());
        dispatch(addNotification({
          id: Date.now().toString(),
          type: 'success',
          title: 'History Cleared',
          message: 'All output video history has been cleared',
          duration: 3000
        }));
      }
    );
  };

  if (isLoading) {
    return (
      <div className="output-videos">
        <div className="loading-container">
          <span className="loading-spinner">⟳</span>
          Loading output videos...
        </div>
      </div>
    );
  }

  return (
    <div className="output-videos">
      <div className="output-header">
        <div className="output-title">
          <span className="output-icon">📤</span>
          Output Videos
        </div>
        
        <div className="output-stats">
          <div className="stat-item">
            <span>📹</span>
            <span className="stat-value">{outputVideos.length}</span>
            <span>videos</span>
          </div>
          <div className="stat-item">
            <span>💾</span>
            <span className="stat-value">{formatFileSize(totalSize)}</span>
            <span>total size</span>
          </div>
          <div className="stat-item">
            <span>⏱️</span>
            <span className="stat-value">{formatProcessingTime(totalProcessingTime)}</span>
            <span>processing time</span>
          </div>
        </div>
      </div>

      <div className="output-controls">
        <div className="view-mode-toggle">
          <button
            className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            ⊞
          </button>
          <button
            className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            ☰
          </button>
        </div>

        <select
          className="sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
        >
          <option value="date">Sort by Date</option>
          <option value="name">Sort by Name</option>
          <option value="size">Sort by Size</option>
          <option value="duration">Sort by Duration</option>
          <option value="processing-time">Sort by Processing Time</option>
        </select>

        <input
          type="text"
          className="search-input"
          placeholder="Search output videos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <div className="batch-actions">
          {outputVideos.length > 0 && (
            <button
              className="batch-btn"
              onClick={handleSelectAll}
            >
              {selectedOutputVideos.length === filteredAndSortedVideos.length ? '✓' : '☐'} 
              Select All
            </button>
          )}

          {selectedOutputVideos.length > 0 && (
            <button
              className="batch-btn danger"
              onClick={handleBatchDelete}
            >
              🗑️ Delete ({selectedOutputVideos.length})
            </button>
          )}

          <button
            className="batch-btn"
            onClick={handleSelectOutputFolder}
          >
            📂 Select Output Folder
          </button>

          {outputVideos.length > 0 && (
            <button
              className="batch-btn danger"
              onClick={handleClearHistory}
            >
              🧹 Clear History
            </button>
          )}
        </div>
      </div>

      <div className="output-content">
        {filteredAndSortedVideos.length === 0 ? (
          <div className="output-empty">
            <div className="empty-icon">📤</div>
            <div className="empty-title">
              {outputVideos.length === 0 ? 'No Output Videos Yet' : 'No Videos Found'}
            </div>
            <div className="empty-message">
              {outputVideos.length === 0 
                ? "Once you start exporting videos, they'll appear here for easy access and management."
                : "Try adjusting your search or filter criteria to find the videos you're looking for."
              }
            </div>
            {outputVideos.length === 0 && (
              <button className="start-export-btn">
                🚀 Start Your First Export
              </button>
            )}
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'output-grid' : 'output-list'}>
            {filteredAndSortedVideos.map((video) => (
              <OutputVideoCard
                key={video.id}
                video={video}
                viewMode={viewMode}
                isSelected={selectedOutputVideos.includes(video.id)}
                onSelect={handleSelectVideo}
                onOpen={handleOpen}
                onReveal={handleReveal}
                onPreview={handlePreview}
                onDelete={handleDelete}
                onShare={handleShare}
              />
            ))}
          </div>
        )}
      </div>

      <DeleteConfirmationDialog {...confirmation} />
    </div>
  );
};

export default OutputVideos;