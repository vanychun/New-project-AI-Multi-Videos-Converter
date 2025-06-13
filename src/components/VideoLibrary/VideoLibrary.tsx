import React, { useState, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useDropzone } from 'react-dropzone';
import { RootState } from '../../store/store';
import { Video } from '../../types/video.types';
import { addVideos, removeVideo, selectVideo, deselectVideo, selectAllVideos, deselectAllVideos } from '../../store/slices/videoSlice';
import { addNotification } from '../../store/slices/uiSlice';
import { videoService } from '../../services/videoService';
import VideoCard from './VideoCard';
import DropZone from './DropZone';
import LibraryHeader from './LibraryHeader';
import LibraryStatsCompact from './LibraryStatsCompact';
import LibraryActionBar from './LibraryActionBar';
import VideoGridView, { ViewMode } from './VideoGridView';
import QuickFilters from './QuickFilters';
import VideoPreviewModal from './VideoPreviewModal';
import VideoListView from './VideoListView';
import DeleteConfirmationDialog from '../common/DeleteConfirmationDialog';
import useDeleteConfirmation from '../../hooks/useDeleteConfirmation';
import './VideoLibrary.css';

interface VideoLibraryProps {
  collapsed: boolean;
  onToggle: () => void;
}

const VideoLibrary: React.FC<VideoLibraryProps> = ({ collapsed, onToggle }) => {
  const dispatch = useDispatch();
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'duration' | 'size' | 'created'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterStatus, setFilterStatus] = useState<'all' | 'ready' | 'processing' | 'completed' | 'error'>('all');
  
  // New state for enhanced features
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [gridSize, setGridSize] = useState(200);
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
  const [previewVideo, setPreviewVideo] = useState<Video | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  const { videos, selectedVideos, totalDuration, totalSize } = useSelector((state: RootState) => state.videos);
  
  // Delete confirmation dialog
  const {
    isOpen: isDeleteDialogOpen,
    config: deleteConfig,
    showDeleteConfirmation,
    handleConfirm: handleDeleteConfirm,
    handleCancel: handleDeleteCancel,
  } = useDeleteConfirmation();
  
  // Filter and sort videos with enhanced filtering
  const filteredAndSortedVideos = useMemo(() => {
    let filtered = videos;
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(video => 
        video.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.format.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.resolution.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(video => video.status === filterStatus);
    }

    // Apply quick filters
    if (activeQuickFilter) {
      switch (activeQuickFilter) {
        case 'recent': {
          const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
          filtered = filtered.filter(video => video.createdAt > dayAgo);
          break;
        }
        case 'large':
          filtered = filtered.filter(video => video.size > 100 * 1024 * 1024); // > 100MB
          break;
        case 'hd':
          filtered = filtered.filter(video => {
            const [width] = video.resolution.split('x').map(Number);
            return width >= 1280;
          });
          break;
        case 'long':
          filtered = filtered.filter(video => video.duration > 600); // > 10 minutes
          break;
      }
    }
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'duration':
          comparison = a.duration - b.duration;
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'created':
          comparison = a.createdAt - b.createdAt;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }, [videos, searchQuery, filterStatus, sortBy, sortOrder, activeQuickFilter]);

  // Quick filter data
  const quickFilters = useMemo(() => [
    {
      id: 'recent',
      label: 'Recent',
      icon: '🆕',
      count: videos.filter(v => v.createdAt > (Date.now() - 24 * 60 * 60 * 1000)).length,
      color: '#06d6a0',
      description: 'Videos added in the last 24 hours'
    },
    {
      id: 'large',
      label: 'Large Files',
      icon: '💾',
      count: videos.filter(v => v.size > 100 * 1024 * 1024).length,
      color: '#ffd23f',
      description: 'Files larger than 100MB'
    },
    {
      id: 'hd',
      label: 'HD/4K',
      icon: '🎬',
      count: videos.filter(v => {
        const [width] = v.resolution.split('x').map(Number);
        return width >= 1280;
      }).length,
      color: '#7461ef',
      description: 'High definition videos (1280p+)'
    },
    {
      id: 'long',
      label: 'Long Videos',
      icon: '⏰',
      count: videos.filter(v => v.duration > 600).length,
      color: '#a855f7',
      description: 'Videos longer than 10 minutes'
    }
  ], [videos]);

  // Preview navigation helpers
  const previewIndex = previewVideo ? filteredAndSortedVideos.findIndex(v => v.id === previewVideo.id) : -1;
  const hasNextPreview = previewIndex >= 0 && previewIndex < filteredAndSortedVideos.length - 1;
  const hasPreviousPreview = previewIndex > 0;
  
  const handleFilesAdded = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      dispatch(addNotification({
        type: 'info',
        title: 'Processing Videos',
        message: `Processing ${files.length} video file(s)...`,
        autoClose: false,
        duration: 0,
      }));
      
      const newVideos = await videoService.createVideosFromFiles(files);
      
      if (newVideos.length > 0) {
        dispatch(addVideos(newVideos));
        dispatch(addNotification({
          type: 'success',
          title: 'Videos Added',
          message: `Successfully added ${newVideos.length} video(s) to the library`,
          autoClose: true,
          duration: 5000,
        }));
      }
      
      if (newVideos.length < files.length) {
        const failedCount = files.length - newVideos.length;
        dispatch(addNotification({
          type: 'warning',
          title: 'Some Videos Failed',
          message: `${failedCount} video(s) could not be processed. Check file formats and try again.`,
          autoClose: true,
          duration: 8000,
        }));
      }
    } catch (error) {
      console.error('Failed to process videos:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'Processing Failed',
        message: 'Failed to process video files. Please try again.',
        autoClose: true,
        duration: 5000,
      }));
    } finally {
      setIsProcessing(false);
    }
  }, [dispatch]);
  
  const handlePathsAdded = useCallback(async (filePaths: string[]) => {
    if (filePaths.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      dispatch(addNotification({
        type: 'info',
        title: 'Processing Videos',
        message: `Processing ${filePaths.length} video file(s)...`,
        autoClose: false,
        duration: 0,
      }));
      
      const newVideos = await videoService.createVideosFromPaths(filePaths);
      
      if (newVideos.length > 0) {
        dispatch(addVideos(newVideos));
        dispatch(addNotification({
          type: 'success',
          title: 'Videos Added',
          message: `Successfully added ${newVideos.length} video(s) to the library`,
          autoClose: true,
          duration: 5000,
        }));
      }
      
      if (newVideos.length < filePaths.length) {
        const failedCount = filePaths.length - newVideos.length;
        dispatch(addNotification({
          type: 'warning',
          title: 'Some Videos Failed',
          message: `${failedCount} video(s) could not be processed. Check file formats and try again.`,
          autoClose: true,
          duration: 8000,
        }));
      }
    } catch (error) {
      console.error('Failed to process video paths:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'Processing Failed',
        message: 'Failed to process video files. Please try again.',
        autoClose: true,
        duration: 5000,
      }));
    } finally {
      setIsProcessing(false);
    }
  }, [dispatch]);
  
  const handleVideoSelect = useCallback((videoId: string, isSelected: boolean) => {
    if (isSelected) {
      dispatch(selectVideo(videoId));
    } else {
      dispatch(deselectVideo(videoId));
    }
  }, [dispatch]);
  
  const handleVideoRemove = useCallback((videoId: string) => {
    const video = videos.find(v => v.id === videoId);
    if (!video) return;
    
    showDeleteConfirmation(
      {
        title: 'Remove Video',
        message: 'Are you sure you want to remove this video from the library?',
        itemName: video.name,
        destructive: true,
        confirmText: 'Remove',
        cancelText: 'Keep',
      },
      () => {
        dispatch(removeVideo(videoId));
        dispatch(addNotification({
          type: 'info',
          title: 'Video Removed',
          message: `"${video.name}" has been removed from the library`,
          autoClose: true,
          duration: 3000,
        }));
      }
    );
  }, [dispatch, videos, showDeleteConfirmation]);
  
  const handleVideoEdit = useCallback((videoId: string) => {
    // Open video edit modal/panel
    console.log('Edit video:', videoId);
  }, []);
  
  const handleSelectAll = useCallback(() => {
    if (selectedVideos.length === filteredAndSortedVideos.length) {
      dispatch(deselectAllVideos());
    } else {
      dispatch(selectAllVideos(filteredAndSortedVideos.map(v => v.id)));
    }
  }, [dispatch, selectedVideos.length, filteredAndSortedVideos]);
  
  const handleClearLibrary = useCallback(() => {
    if (videos.length === 0) return;
    
    showDeleteConfirmation(
      {
        title: 'Clear Library',
        message: 'Are you sure you want to remove all videos from the library?',
        itemCount: videos.length,
        destructive: true,
        confirmText: 'Clear All',
        cancelText: 'Keep',
      },
      () => {
        // Clear all videos logic would go here
        // For now, just show notification - actual implementation would clear the videos
        dispatch(addNotification({
          type: 'info',
          title: 'Library Cleared',
          message: 'All videos have been removed from the library',
          autoClose: true,
          duration: 3000,
        }));
      }
    );
  }, [dispatch, videos.length, showDeleteConfirmation]);

  const handleExport = useCallback(() => {
    console.log('Export library');
  }, []);

  const handleImport = useCallback(async () => {
    try {
      // Use Electron's dialog API to open file picker
      const result = await window.electronAPI.openFileDialog({
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

      await handlePathsAdded(result.filePaths);
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
  }, [handlePathsAdded, dispatch]);

  const handleAddToQueue = useCallback(() => {
    if (selectedVideos.length === 0) {
      dispatch(addNotification({
        type: 'warning',
        title: 'No Videos Selected',
        message: 'Please select videos to add to the processing queue',
        autoClose: true,
        duration: 3000,
      }));
      return;
    }

    // Check for videos with blob URLs that can't be processed
    const selectedVideoObjects = videos.filter(v => selectedVideos.includes(v.id));
    const videosWithBlobUrls = selectedVideoObjects.filter(v => v.path && v.path.startsWith('blob:'));
    
    if (videosWithBlobUrls.length > 0) {
      dispatch(addNotification({
        type: 'error',
        title: 'Cannot Add to Queue',
        message: `${videosWithBlobUrls.length} selected video(s) were imported via drag-and-drop and cannot be processed. Please re-import them using the "Import Videos" button.`,
        autoClose: false,
      }));
      return;
    }

    dispatch(addNotification({
      type: 'success',
      title: 'Added to Queue',
      message: `${selectedVideos.length} video(s) added to processing queue`,
      autoClose: true,
      duration: 3000,
    }));

    // Navigate to processing queue view
    // This should trigger showing the processing queue panel
    // You may need to dispatch an action to switch views or emit an event
  }, [selectedVideos.length, dispatch, videos, selectedVideos]);

  const handleBatchTrim = useCallback(() => {
    console.log('Batch trim');
  }, []);

  const handleApplyEffects = useCallback(() => {
    console.log('Apply effects');
  }, []);

  const handleRemoveSelected = useCallback(() => {
    if (selectedVideos.length === 0) return;
    
    showDeleteConfirmation(
      {
        title: 'Remove Selected Videos',
        message: 'Are you sure you want to remove the selected videos from the library?',
        itemCount: selectedVideos.length,
        destructive: true,
        confirmText: 'Remove Selected',
        cancelText: 'Keep',
      },
      () => {
        selectedVideos.forEach(id => dispatch(removeVideo(id)));
        dispatch(addNotification({
          type: 'info',
          title: 'Videos Removed',
          message: `${selectedVideos.length} videos removed from library`,
          autoClose: true,
          duration: 3000,
        }));
      }
    );
  }, [selectedVideos, dispatch, showDeleteConfirmation]);

  // New handlers for enhanced features
  const handleVideoPreview = useCallback((video: Video) => {
    setPreviewVideo(video);
    setIsPreviewOpen(true);
  }, []);

  const handlePreviewClose = useCallback(() => {
    setIsPreviewOpen(false);
    setPreviewVideo(null);
  }, []);

  const handlePreviewNext = useCallback(() => {
    if (previewVideo) {
      const currentIndex = filteredAndSortedVideos.findIndex(v => v.id === previewVideo.id);
      const nextIndex = currentIndex + 1;
      if (nextIndex < filteredAndSortedVideos.length) {
        setPreviewVideo(filteredAndSortedVideos[nextIndex]);
      }
    }
  }, [previewVideo, filteredAndSortedVideos]);

  const handlePreviewPrevious = useCallback(() => {
    if (previewVideo) {
      const currentIndex = filteredAndSortedVideos.findIndex(v => v.id === previewVideo.id);
      const prevIndex = currentIndex - 1;
      if (prevIndex >= 0) {
        setPreviewVideo(filteredAndSortedVideos[prevIndex]);
      }
    }
  }, [previewVideo, filteredAndSortedVideos]);

  const handleCreateCustomFilter = useCallback(() => {
    console.log('Create custom filter');
  }, []);

  const handleSort = useCallback((column: string) => {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column as any);
      setSortOrder('asc');
    }
  }, [sortBy]);
  
  // Drag and drop configuration
  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop: handleFilesAdded,
    accept: {
      'video/*': ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.wmv', '.flv', '.m4v', '.3gp']
    },
    multiple: true,
    disabled: isProcessing,
  });
  
  if (collapsed) {
    return (
      <div className="video-library-modern collapsed">
        <div className="collapsed-header">
          <button className="expand-button" onClick={onToggle} title="Expand Video Library">
            <span className="expand-icon">📁</span>
            <span className="video-count-badge">{videos.length}</span>
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="video-library-modern" {...getRootProps()}>
      <input {...getInputProps()} />
      
      {/* Modern Header */}
      <LibraryHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterStatus={filterStatus}
        onFilterStatusChange={setFilterStatus}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
        onToggle={onToggle}
        totalCount={filteredAndSortedVideos.length}
      />

      {/* Content Area */}
      <div className="library-content-modern">
        {videos.length === 0 ? (
          <DropZone
            isDragActive={isDragActive}
            isDragAccept={isDragAccept}
            isDragReject={isDragReject}
            isProcessing={isProcessing}
            onFilesAdded={handleFilesAdded}
            onPathsAdded={handlePathsAdded}
          />
        ) : (
          <>
            {/* Compact Stats */}
            <LibraryStatsCompact
              videoCount={videos.length}
              totalDuration={totalDuration}
              totalSize={totalSize}
              selectedCount={selectedVideos.length}
              processingCount={videos.filter(v => v.status === 'processing').length}
              completedCount={videos.filter(v => v.status === 'completed').length}
              errorCount={videos.filter(v => v.status === 'error').length}
            />

            {/* Action Bar */}
            <LibraryActionBar
              selectedCount={selectedVideos.length}
              totalCount={filteredAndSortedVideos.length}
              onSelectAll={handleSelectAll}
              onClearLibrary={handleClearLibrary}
              onExport={handleExport}
              onImport={handleImport}
              onAddToQueue={handleAddToQueue}
              onBatchTrim={handleBatchTrim}
              onApplyEffects={handleApplyEffects}
              onRemoveSelected={handleRemoveSelected}
            />

            {/* Quick Filters */}
            <QuickFilters
              filters={quickFilters}
              activeFilter={activeQuickFilter}
              onFilterChange={setActiveQuickFilter}
              onCreateCustomFilter={handleCreateCustomFilter}
            />

            {/* View Controls */}
            <VideoGridView
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              showThumbnails={showThumbnails}
              onToggleThumbnails={() => setShowThumbnails(prev => !prev)}
              gridSize={gridSize}
              onGridSizeChange={setGridSize}
            />
            
            {/* Video Display */}
            {viewMode === 'list' ? (
              <VideoListView
                videos={filteredAndSortedVideos}
                selectedVideos={selectedVideos}
                onSelect={handleVideoSelect}
                onRemove={handleVideoRemove}
                onEdit={handleVideoEdit}
                onPreview={handleVideoPreview}
                onSelectAll={handleSelectAll}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
              />
            ) : (
              <div 
                className={`video-grid-modern ${viewMode}`}
                style={{
                  '--grid-size': `${gridSize}px`,
                  gridTemplateColumns: viewMode === 'tiles' 
                    ? 'repeat(auto-fill, minmax(300px, 1fr))'
                    : `repeat(auto-fill, minmax(${gridSize}px, 1fr))`
                } as React.CSSProperties}
              >
                {filteredAndSortedVideos.length === 0 ? (
                  <div className="empty-results-modern">
                    <div className="empty-icon">🔍</div>
                    <div className="empty-title">No videos found</div>
                    <div className="empty-text">
                      {activeQuickFilter ? 'No videos match the selected filter' : 'No videos match your current filters'}
                    </div>
                    <button 
                      className="clear-filters-btn"
                      onClick={() => {
                        setSearchQuery('');
                        setFilterStatus('all');
                        setActiveQuickFilter(null);
                      }}
                    >
                      Clear All Filters
                    </button>
                  </div>
                ) : (
                  filteredAndSortedVideos.map((video) => (
                    <div key={video.id} className={`video-card-wrapper ${viewMode}`}>
                      <VideoCard
                        video={video}
                        isSelected={selectedVideos.includes(video.id)}
                        onSelect={handleVideoSelect}
                        onRemove={handleVideoRemove}
                        onEdit={handleVideoEdit}
                      />
                      {/* Preview button overlay for grid view */}
                      <button 
                        className="preview-btn-overlay"
                        onClick={() => handleVideoPreview(video)}
                        title="Preview video"
                      >
                        👁️
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
        
        {/* Drag Overlay */}
        {isDragActive && (
          <div className={`drag-overlay-modern ${isDragAccept ? 'accept' : isDragReject ? 'reject' : ''}`}>
            <div className="drag-content-modern">
              <div className="drag-icon-modern">
                {isDragAccept ? '✅' : isDragReject ? '❌' : '📁'}
              </div>
              <div className="drag-title">
                {isDragAccept 
                  ? 'Drop to add videos'
                  : isDragReject 
                  ? 'Unsupported files'
                  : 'Drop files here'
                }
              </div>
              <div className="drag-subtitle">
                {isDragAccept 
                  ? 'Release to add videos to your library'
                  : isDragReject 
                  ? 'Some files are not supported video formats'
                  : 'Supported: MP4, AVI, MOV, MKV, WebM'
                }
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Processing Overlay */}
      {isProcessing && (
        <div className="processing-overlay-modern">
          <div className="processing-content-modern">
            <div className="processing-spinner-modern" />
            <div className="processing-title">Processing videos...</div>
            <div className="processing-subtitle">This may take a few moments</div>
          </div>
        </div>
      )}

      {/* Video Preview Modal */}
      <VideoPreviewModal
        video={previewVideo}
        isOpen={isPreviewOpen}
        onClose={handlePreviewClose}
        onNext={hasNextPreview ? handlePreviewNext : undefined}
        onPrevious={hasPreviousPreview ? handlePreviewPrevious : undefined}
        hasNext={hasNextPreview}
        hasPrevious={hasPreviousPreview}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        title={deleteConfig?.title || ''}
        message={deleteConfig?.message || ''}
        itemName={deleteConfig?.itemName}
        itemCount={deleteConfig?.itemCount}
        destructive={deleteConfig?.destructive}
        confirmText={deleteConfig?.confirmText}
        cancelText={deleteConfig?.cancelText}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
};

export default VideoLibrary;