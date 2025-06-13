import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { selectVideo, deselectVideo, selectAllVideos, deselectAllVideos, removeVideo, addVideos } from '../../store/slices/videoSlice';
import { addNotification } from '../../store/slices/uiSlice';
import VideoCard from './VideoCard';
import LibraryStatsEnhanced from './LibraryStatsEnhanced';
import ViewModeControls, { ViewMode, SortBy, SortOrder } from './ViewModeControls';
import QuickFiltersEnhanced from './QuickFiltersEnhanced';
import BulkActionsToolbar from './BulkActionsToolbar';
import EmptyState from './EmptyState';
import { Video } from '../../types/video.types';
import { useCommonShortcuts, useGridNavigation } from '../../hooks/useKeyboardShortcuts';
import './VideoLibraryEnhanced.css';

export const VideoLibraryEnhanced: React.FC = () => {
  const dispatch = useDispatch();
  const { videos, selectedVideos } = useSelector((state: RootState) => state.videos);
  
  // Debug logging
  useEffect(() => {
    console.log('📚 VideoLibraryEnhanced Redux State Update:');
    console.log('  Videos:', videos);
    console.log('  Selected Videos:', selectedVideos);
  }, [videos, selectedVideos]);
  
  // Local state for UI controls
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('created');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [thumbnailSize, setThumbnailSize] = useState(180);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
  const [focusedVideoIndex, setFocusedVideoIndex] = useState(0);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  // Refs for keyboard navigation
  const gridRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Apply search filter
  const searchFilteredVideos = useMemo(() => {
    if (!searchQuery.trim()) return videos || [];
    
    const query = searchQuery.toLowerCase();
    return (videos || []).filter(video => 
      video.name.toLowerCase().includes(query) ||
      video.metadata.codec?.toLowerCase().includes(query) ||
      video.status.toLowerCase().includes(query)
    );
  }, [videos, searchQuery]);

  // Apply quick filters
  const quickFilteredVideos = useMemo(() => {
    if (!activeQuickFilter || activeQuickFilter === 'all') return searchFilteredVideos;
    
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    
    switch (activeQuickFilter) {
      case 'recent':
        return searchFilteredVideos.filter(v => (now - v.createdAt) < oneWeek);
      case 'largeFiles':
        return searchFilteredVideos.filter(v => v.size > 100 * 1024 * 1024);
      case 'longVideos':
        return searchFilteredVideos.filter(v => v.duration > 300);
      case 'hd':
        return searchFilteredVideos.filter(v => v.metadata.width >= 1920);
      case 'uhd':
        return searchFilteredVideos.filter(v => v.metadata.width >= 3840);
      case 'withAudio':
        return searchFilteredVideos.filter(v => v.metadata.hasAudio);
      case 'processing':
        return searchFilteredVideos.filter(v => v.status === 'processing');
      case 'completed':
        return searchFilteredVideos.filter(v => v.status === 'completed');
      case 'error':
        return searchFilteredVideos.filter(v => v.status === 'error');
      case 'hasEffects':
        return searchFilteredVideos.filter(v => v.effects && v.effects.length > 0);
      default:
        return searchFilteredVideos;
    }
  }, [searchFilteredVideos, activeQuickFilter]);

  // Apply sorting
  const filteredAndSortedVideos = useMemo(() => {
    const sorted = [...quickFilteredVideos].sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'duration':
          aValue = a.duration;
          bValue = b.duration;
          break;
        case 'size':
          aValue = a.size;
          bValue = b.size;
          break;
        case 'created':
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        case 'modified':
          aValue = a.modifiedAt || a.createdAt;
          bValue = b.modifiedAt || b.createdAt;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }, [quickFilteredVideos, sortBy, sortOrder]);

  // Event handlers
  const handleVideoSelect = useCallback((videoId: string, isSelected: boolean) => {
    console.log('📚 VideoLibraryEnhanced handleVideoSelect called:', { videoId, isSelected });
    if (isSelected) {
      dispatch(selectVideo(videoId));
      console.log('📚 Dispatched selectVideo:', videoId);
    } else {
      dispatch(deselectVideo(videoId));
      console.log('📚 Dispatched deselectVideo:', videoId);
    }
  }, [dispatch]);

  const handleSelectAll = useCallback(() => {
    if (selectedVideos.length === filteredAndSortedVideos.length) {
      dispatch(deselectAllVideos());
    } else {
      const allIds = filteredAndSortedVideos.map(v => v.id);
      dispatch(selectAllVideos(allIds));
    }
  }, [dispatch, selectedVideos.length, filteredAndSortedVideos]);

  const handleClearSelection = useCallback(() => {
    dispatch(deselectAllVideos());
  }, [dispatch]);

  // Handle import action  
  const handleImport = useCallback(async () => {
    console.log('🎬 VideoLibrary handleImport called - opening file dialog');
    
    try {
      // Use Electron's native file dialog if available
      if (window.electronAPI && window.electronAPI.selectFiles) {
        console.log('🔧 VideoLibrary: Using Electron native file dialog');
        
        const filePaths = await window.electronAPI.selectFiles();
        if (!filePaths || filePaths.length === 0) {
          console.log('🎬 VideoLibrary: No files selected');
          return;
        }
        
        console.log(`🎬 VideoLibrary: Selected ${filePaths.length} files:`, filePaths);
        
        // Create video objects from file paths
        const videos = filePaths.map((filePath, index) => {
          const fileName = filePath.split(/[/\\]/).pop() || 'Unknown';
          const fileExt = fileName.split('.').pop()?.toLowerCase() || 'unknown';
          
          // Format file path for Electron - handle Windows paths properly
          let formattedPath = filePath;
          if (process.platform === 'win32' || filePath.includes('\\')) {
            // Windows path - ensure forward slashes for file:// protocol
            formattedPath = filePath.replace(/\\/g, '/');
          }
          // Ensure file:// protocol
          const videoPath = formattedPath.startsWith('file://') ? formattedPath : `file:///${formattedPath}`;
          
          console.log('🔧 VideoLibrary Path conversion:', { original: filePath, formatted: videoPath });
          
          return {
            id: `imported-${Date.now()}-${index}`,
            name: fileName,
            path: videoPath, // Use properly formatted file protocol
            size: 0, // Will be determined later
            duration: 0, // Will be determined later
            format: fileExt,
            resolution: '1080p', // Default, will be determined later
            fps: 30, // Default
            bitrate: 2000, // Default
            status: 'ready' as const,
            createdAt: Date.now(),
            metadata: {
              hasAudio: true, // Default assumption
              codec: 'h264' // Default
            }
          };
        });
        
        // Add videos to Redux store
        console.log('🎬 VideoLibrary: Adding videos to Redux store:', videos);
        dispatch(addVideos(videos));
        
        // Show success notification
        dispatch(addNotification({
          type: 'success',
          title: 'Videos Imported',
          message: `Successfully imported ${videos.length} video${videos.length !== 1 ? 's' : ''}`,
          autoClose: true,
          duration: 3000
        }));
        
      } else {
        // Fallback to HTML file input for browser
        console.log('🌐 VideoLibrary: Using HTML file input fallback');
        
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'video/*';
        
        input.onchange = async (event) => {
          const files = (event.target as HTMLInputElement).files;
          if (!files || files.length === 0) return;
          
          console.log(`🎬 VideoLibrary: Selected ${files.length} files for import`);
          
          // Convert FileList to array
          const fileArray = Array.from(files);
          
          // Create video objects for Redux
          const videos = fileArray.map((file, index) => ({
            id: `imported-${Date.now()}-${index}`,
            name: file.name,
            path: URL.createObjectURL(file), // Use blob URL for browser
            size: file.size,
            duration: 0, // Will be determined later
            format: file.name.split('.').pop()?.toLowerCase() || 'unknown',
            resolution: '1080p', // Default, will be determined later
            fps: 30, // Default
            bitrate: 2000, // Default
            status: 'ready' as const,
            createdAt: Date.now(),
            metadata: {
              hasAudio: true, // Default assumption
              codec: 'h264' // Default
            }
          }));
          
          // Add videos to Redux store
          console.log('🎬 VideoLibrary: Adding videos to Redux store:', videos);
          dispatch(addVideos(videos));
          
          // Show success notification
          dispatch(addNotification({
            type: 'success',
            title: 'Videos Imported',
            message: `Successfully imported ${videos.length} video${videos.length !== 1 ? 's' : ''}`,
            autoClose: true,
            duration: 3000
          }));
        };
        
        input.click();
      }
    } catch (error) {
      console.error('🎬 VideoLibrary: Error importing videos:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'Import Failed',
        message: 'Failed to import videos. Please try again.',
        autoClose: true,
        duration: 5000
      }));
    }
  }, [dispatch]);

  // Render methods
  const renderVideoGrid = () => {
    if (filteredAndSortedVideos.length === 0) {
      // Show different empty states based on context
      if (searchQuery || activeQuickFilter) {
        return (
          <div className="empty-library" data-testid="no-results-state">
            <div className="empty-icon">🔍</div>
            <div className="empty-title">No videos found</div>
            <div className="empty-subtitle">
              Try adjusting your search or filters
            </div>
            <button 
              onClick={() => {
                setSearchQuery('');
                setActiveQuickFilter(null);
              }}
              className="clear-filters-btn"
            >
              Clear Filters
            </button>
          </div>
        );
      } else {
        // Main empty state with drag & drop
        return (
          <EmptyState 
            onImport={handleImport}
          />
        );
      }
    }

    return (
      <div 
        ref={gridRef}
        className={`video-grid ${viewMode}`}
        style={{
          '--thumbnail-size': `${thumbnailSize}px`,
          '--grid-columns': `repeat(auto-fill, minmax(${thumbnailSize}px, 1fr))`
        } as React.CSSProperties}
        tabIndex={-1}
      >
        {filteredAndSortedVideos.map((video, index) => (
          <VideoCard
            key={video.id}
            video={video}
            isSelected={selectedVideos.includes(video.id)}
            onSelect={handleVideoSelect}
            viewMode={viewMode}
            showThumbnails={showThumbnails}
            thumbnailSize={thumbnailSize}
            style={{
              outline: focusedVideoIndex === index ? '2px solid #7461ef' : 'none',
              outlineOffset: '2px'
            }}
          />
        ))}
      </div>
    );
  };

  const renderSearchBar = () => (
    <div className="search-bar-container">
      <div className="search-input-wrapper">
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search videos by name, codec, or status... (Ctrl+F)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          className="search-input"
        />
        <span className="search-icon">🔍</span>
      </div>
      {searchQuery && (
        <button
          onClick={() => setSearchQuery('')}
          className="clear-search-btn"
          title="Clear search (Escape)"
        >
          ✕
        </button>
      )}
    </div>
  );

  const handleCloseBulkActions = useCallback(() => {
    dispatch(deselectAllVideos());
  }, [dispatch]);
  
  // Calculate grid columns for keyboard navigation
  const getColumnsCount = useCallback(() => {
    if (viewMode === 'list') return 1;
    const containerWidth = gridRef.current?.clientWidth || 1200;
    return Math.floor(containerWidth / thumbnailSize) || 1;
  }, [viewMode, thumbnailSize]);

  // Keyboard shortcuts
  useCommonShortcuts({
    onSelectAll: () => {
      if (!isSearchFocused) {
        const allIds = filteredAndSortedVideos.map(v => v.id);
        dispatch(selectAllVideos(allIds));
        dispatch(addNotification({
          type: 'info',
          title: 'Selection',
          message: `Selected ${allIds.length} videos`,
          autoClose: true,
          duration: 2000
        }));
      }
    },
    onDeselectAll: () => {
      if (searchQuery && !isSearchFocused) {
        setSearchQuery('');
      } else if (selectedVideos.length > 0) {
        dispatch(deselectAllVideos());
      }
    },
    onDelete: () => {
      if (!isSearchFocused && selectedVideos.length > 0) {
        // This will be handled by BulkActionsToolbar
      } else if (!isSearchFocused && focusedVideoIndex < filteredAndSortedVideos.length) {
        const video = filteredAndSortedVideos[focusedVideoIndex];
        if (video) {
          dispatch(removeVideo(video.id));
          dispatch(addNotification({
            type: 'success',
            title: 'Video Removed',
            message: `${video.name} has been removed`,
            autoClose: true,
            duration: 3000
          }));
        }
      }
    },
    onSearch: () => {
      searchInputRef.current?.focus();
    },
    onRefresh: () => {
      setSearchQuery('');
      setActiveQuickFilter(null);
      dispatch(deselectAllVideos());
      dispatch(addNotification({
        type: 'info',
        title: 'Library Refreshed',
        message: 'Filters and selection cleared',
        autoClose: true,
        duration: 2000
      }));
    }
  });

  // Grid navigation
  useGridNavigation(gridRef, {
    itemCount: filteredAndSortedVideos.length,
    columnsCount: getColumnsCount(),
    currentIndex: focusedVideoIndex,
    onItemSelect: (index) => {
      if (!isSearchFocused) {
        setFocusedVideoIndex(index);
      }
    },
    onItemActivate: (index) => {
      if (!isSearchFocused && index < filteredAndSortedVideos.length) {
        const video = filteredAndSortedVideos[index];
        handleVideoSelect(video.id, !selectedVideos.includes(video.id));
      }
    }
  });

  // Update focused index when filtered videos change
  useEffect(() => {
    if (focusedVideoIndex >= filteredAndSortedVideos.length) {
      setFocusedVideoIndex(Math.max(0, filteredAndSortedVideos.length - 1));
    }
  }, [filteredAndSortedVideos.length, focusedVideoIndex]);

  return (
    <div className="video-library-enhanced" data-testid="video-library">
      {/* Header Section */}
      <div className="library-header">
        <div className="header-top">
          <h2 className="library-title">
            Video Library
            <span className="keyboard-hint" title="Keyboard shortcuts available">⌨️</span>
          </h2>
          <div className="header-actions">
            <button className="import-btn primary" data-testid="add-video-button">
              <span className="btn-icon">📁</span>
              Import Videos
            </button>
            <div className="keyboard-shortcuts-info">
              <small>
                Ctrl+A: Select All | Delete: Remove | Ctrl+F: Search | F5: Refresh | Arrows: Navigate
              </small>
            </div>
          </div>
        </div>
        
        {/* Stats */}
        <LibraryStatsEnhanced />
        
        {/* Search */}
        {renderSearchBar()}
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <QuickFiltersEnhanced
          activeFilter={activeQuickFilter}
          onFilterChange={setActiveQuickFilter}
        />
        
        <ViewModeControls
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          thumbnailSize={thumbnailSize}
          onThumbnailSizeChange={setThumbnailSize}
          showThumbnails={showThumbnails}
          onShowThumbnailsChange={setShowThumbnails}
        />
      </div>

      {/* Bulk Actions - now handled by floating toolbar */}

      {/* Video Grid */}
      <div className="library-content">
        {renderVideoGrid()}
      </div>

      {/* Select All/None for current view */}
      {filteredAndSortedVideos.length > 0 && (
        <div className="selection-controls">
          <button
            onClick={handleSelectAll}
            className="select-all-btn"
          >
            {selectedVideos.length === filteredAndSortedVideos.length ? 'Deselect All' : 'Select All'}
          </button>
          <span className="video-count">
            {filteredAndSortedVideos.length} video{filteredAndSortedVideos.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Floating Bulk Actions Toolbar */}
      <BulkActionsToolbar
        selectedCount={selectedVideos.length}
        totalCount={filteredAndSortedVideos.length}
        onClose={handleCloseBulkActions}
      />
    </div>
  );
};

export default VideoLibraryEnhanced;