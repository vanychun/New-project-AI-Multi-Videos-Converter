import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { selectVideo, deselectVideo, selectAllVideos, deselectAllVideos } from '../../store/slices/videoSlice';
import OptimizedVideoCard from './OptimizedVideoCard';
import VirtualizedVideoGrid from './VirtualizedVideoGrid';
import LibraryStatsEnhanced from './LibraryStatsEnhanced';
import ViewModeControls, { ViewMode, SortBy, SortOrder } from './ViewModeControls';
import QuickFiltersEnhanced from './QuickFiltersEnhanced';
import { Video } from '../../types/video.types';
import { usePerformanceMonitor, memoryManager } from '../../utils/performanceMonitor';
import { debounce } from 'lodash';
import './VideoLibraryEnhanced.css';

const VIRTUALIZATION_THRESHOLD = 50; // Use virtualization for >50 videos
const DEBOUNCE_DELAY = 300; // ms

export const VideoLibraryOptimized: React.FC = () => {
  const { recordRender } = usePerformanceMonitor('VideoLibraryOptimized');
  const dispatch = useDispatch();
  const { videos, selectedVideos } = useSelector((state: RootState) => state.videos);
  
  // Container ref for virtualization
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  
  // Local state for UI controls
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('created');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [thumbnailSize, setThumbnailSize] = useState(180);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);

  // Track renders for performance monitoring
  useEffect(() => {
    recordRender();
  });

  // Debounced search function
  const debouncedSetSearchQuery = useCallback(
    debounce((query: string) => {
      setSearchQuery(query);
      memoryManager.clear('videoFilters'); // Clear filter cache when search changes
    }, DEBOUNCE_DELAY),
    []
  );

  // Handle container resize for virtualization
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerDimensions({
          width: rect.width,
          height: Math.min(rect.height, 800) // Max height for virtualization
        });
      }
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Memoized search filter with caching
  const searchFilteredVideos = useMemo(() => {
    const cacheKey = `search_${searchQuery}_${videos.length}`;
    const cached = memoryManager.get('videoFilters', cacheKey);
    if (cached) return cached;

    if (!searchQuery.trim()) {
      memoryManager.set('videoFilters', cacheKey, videos);
      return videos;
    }
    
    const query = searchQuery.toLowerCase();
    const result = videos.filter(video => 
      video.name.toLowerCase().includes(query) ||
      video.metadata.codec?.toLowerCase().includes(query) ||
      video.status.toLowerCase().includes(query)
    );
    
    memoryManager.set('videoFilters', cacheKey, result);
    return result;
  }, [videos, searchQuery]);

  // Memoized quick filter with caching
  const quickFilteredVideos = useMemo(() => {
    const cacheKey = `quickFilter_${activeQuickFilter}_${searchFilteredVideos.length}`;
    const cached = memoryManager.get('videoFilters', cacheKey);
    if (cached) return cached;

    if (!activeQuickFilter || activeQuickFilter === 'all') {
      memoryManager.set('videoFilters', cacheKey, searchFilteredVideos);
      return searchFilteredVideos;
    }
    
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    
    let result: Video[];
    
    switch (activeQuickFilter) {
      case 'recent':
        result = searchFilteredVideos.filter(v => (now - v.createdAt) < oneWeek);
        break;
      case 'largeFiles':
        result = searchFilteredVideos.filter(v => v.size > 100 * 1024 * 1024);
        break;
      case 'longVideos':
        result = searchFilteredVideos.filter(v => v.duration > 300);
        break;
      case 'hd':
        result = searchFilteredVideos.filter(v => v.metadata.width >= 1920);
        break;
      case 'uhd':
        result = searchFilteredVideos.filter(v => v.metadata.width >= 3840);
        break;
      case 'withAudio':
        result = searchFilteredVideos.filter(v => v.metadata.hasAudio);
        break;
      case 'processing':
        result = searchFilteredVideos.filter(v => v.status === 'processing');
        break;
      case 'completed':
        result = searchFilteredVideos.filter(v => v.status === 'completed');
        break;
      case 'error':
        result = searchFilteredVideos.filter(v => v.status === 'error');
        break;
      case 'hasEffects':
        result = searchFilteredVideos.filter(v => v.effects && v.effects.length > 0);
        break;
      default:
        result = searchFilteredVideos;
    }
    
    memoryManager.set('videoFilters', cacheKey, result);
    return result;
  }, [searchFilteredVideos, activeQuickFilter]);

  // Memoized sorting with caching
  const filteredAndSortedVideos = useMemo(() => {
    const cacheKey = `sorted_${sortBy}_${sortOrder}_${quickFilteredVideos.length}`;
    const cached = memoryManager.get('videoFilters', cacheKey);
    if (cached) return cached;

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
    
    memoryManager.set('videoFilters', cacheKey, sorted);
    return sorted;
  }, [quickFilteredVideos, sortBy, sortOrder]);

  // Memoized event handlers
  const handleVideoSelect = useCallback((videoId: string, isSelected: boolean) => {
    if (isSelected) {
      dispatch(selectVideo(videoId));
    } else {
      dispatch(deselectVideo(videoId));
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

  // Determine whether to use virtualization
  const shouldVirtualize = filteredAndSortedVideos.length > VIRTUALIZATION_THRESHOLD;

  // Render video grid with optional virtualization
  const renderVideoGrid = () => {
    if (filteredAndSortedVideos.length === 0) {
      return (
        <div className="empty-library">
          <div className="empty-icon">📹</div>
          <div className="empty-title">No videos found</div>
          <div className="empty-subtitle">
            {searchQuery || activeQuickFilter 
              ? 'Try adjusting your search or filters'
              : 'Drop video files here or click Import to get started'
            }
          </div>
        </div>
      );
    }

    if (shouldVirtualize && containerDimensions.width > 0) {
      return (
        <VirtualizedVideoGrid
          videos={filteredAndSortedVideos}
          selectedVideos={selectedVideos}
          onVideoSelect={handleVideoSelect}
          viewMode={viewMode}
          thumbnailSize={thumbnailSize}
          showThumbnails={showThumbnails}
          containerWidth={containerDimensions.width}
          containerHeight={containerDimensions.height}
        />
      );
    }

    // Standard grid for smaller datasets
    return (
      <div 
        className={`video-grid ${viewMode}`}
        style={{
          '--thumbnail-size': `${thumbnailSize}px`,
          '--grid-columns': `repeat(auto-fill, minmax(${thumbnailSize}px, 1fr))`
        } as React.CSSProperties}
      >
        {filteredAndSortedVideos.map(video => (
          <OptimizedVideoCard
            key={video.id}
            video={video}
            isSelected={selectedVideos.includes(video.id)}
            onSelect={handleVideoSelect}
            viewMode={viewMode}
            showThumbnails={showThumbnails}
            thumbnailSize={thumbnailSize}
          />
        ))}
      </div>
    );
  };

  const renderSearchBar = () => (
    <div className="search-bar-container">
      <div className="search-input-wrapper">
        <input
          type="text"
          placeholder="Search videos by name, codec, or status..."
          onChange={(e) => debouncedSetSearchQuery(e.target.value)}
          className="search-input"
        />
        <span className="search-icon">🔍</span>
      </div>
      {searchQuery && (
        <button
          onClick={() => {
            setSearchQuery('');
            debouncedSetSearchQuery('');
          }}
          className="clear-search-btn"
          title="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );

  const renderBulkActions = () => {
    if (selectedVideos.length === 0) return null;

    return (
      <div className="bulk-actions">
        <div className="selection-info">
          <span className="selection-count">
            {selectedVideos.length} selected
          </span>
          <button
            onClick={handleClearSelection}
            className="clear-selection-btn"
          >
            Clear
          </button>
        </div>
        
        <div className="bulk-action-buttons">
          <button className="bulk-action-btn export">
            <span className="action-icon">📤</span>
            Export
          </button>
          <button className="bulk-action-btn enhance">
            <span className="action-icon">✨</span>
            Enhance
          </button>
          <button className="bulk-action-btn delete">
            <span className="action-icon">🗑️</span>
            Remove
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="video-library-enhanced">
      {/* Header Section */}
      <div className="library-header">
        <div className="header-top">
          <h2 className="library-title">
            Video Library
            {shouldVirtualize && (
              <span className="performance-badge" title="Virtualized for performance">⚡</span>
            )}
          </h2>
          <div className="header-actions">
            <button className="import-btn primary">
              <span className="btn-icon">📁</span>
              Import Videos
            </button>
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

      {/* Bulk Actions */}
      {renderBulkActions()}

      {/* Video Grid */}
      <div 
        ref={containerRef}
        className="library-content"
        style={{ 
          height: shouldVirtualize ? `${containerDimensions.height}px` : 'auto',
          overflow: shouldVirtualize ? 'hidden' : 'visible'
        }}
      >
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
            {shouldVirtualize && <span className="virtualized-indicator"> (Virtualized)</span>}
          </span>
        </div>
      )}
    </div>
  );
};

export default VideoLibraryOptimized;