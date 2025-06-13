import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { FixedSizeGrid as VirtualGrid, FixedSizeList as VirtualList } from 'react-window';
import { VideoFileEnhanced, ViewSettings, SearchQuery } from '../../types/video-enhanced.types';
import { VideoCardEnhanced } from './VideoCardEnhanced';
import { SearchService } from '../../services/SearchService';

export interface VideoLibraryAdvancedProps {
  videos: VideoFileEnhanced[];
  selectedVideoIds: string[];
  searchQuery: SearchQuery;
  viewSettings: ViewSettings;
  loading: boolean;
  onVideoSelect: (videoId: string, multiSelect: boolean) => void;
  onVideoDoubleClick: (video: VideoFileEnhanced) => void;
  onVideoContextMenu: (event: React.MouseEvent, video: VideoFileEnhanced) => void;
  onVideoPreview: (video: VideoFileEnhanced) => void;
  onVideoRemove: (video: VideoFileEnhanced) => void;
  onVideoEdit: (video: VideoFileEnhanced) => void;
  onViewSettingsChange: (settings: Partial<ViewSettings>) => void;
  onLoadMore?: () => void;
}

interface VirtualizedGridProps {
  videos: VideoFileEnhanced[];
  selectedVideoIds: string[];
  viewSettings: ViewSettings;
  containerWidth: number;
  containerHeight: number;
  onVideoSelect: (videoId: string, multiSelect: boolean) => void;
  onVideoDoubleClick: (video: VideoFileEnhanced) => void;
  onVideoContextMenu: (event: React.MouseEvent, video: VideoFileEnhanced) => void;
  onVideoPreview: (video: VideoFileEnhanced) => void;
  onVideoRemove: (video: VideoFileEnhanced) => void;
  onVideoEdit: (video: VideoFileEnhanced) => void;
}

interface VirtualizedListProps extends VirtualizedGridProps {}

// Grid item component for virtualization
const GridItem: React.FC<{
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
  data: {
    videos: VideoFileEnhanced[];
    columnsPerRow: number;
    selectedVideoIds: string[];
    viewSettings: ViewSettings;
    onVideoSelect: (videoId: string, multiSelect: boolean) => void;
    onVideoDoubleClick: (video: VideoFileEnhanced) => void;
    onVideoContextMenu: (event: React.MouseEvent, video: VideoFileEnhanced) => void;
    onVideoPreview: (video: VideoFileEnhanced) => void;
    onVideoRemove: (video: VideoFileEnhanced) => void;
    onVideoEdit: (video: VideoFileEnhanced) => void;
  };
}> = ({ columnIndex, rowIndex, style, data }) => {
  const {
    videos,
    columnsPerRow,
    selectedVideoIds,
    viewSettings,
    onVideoSelect,
    onVideoDoubleClick,
    onVideoContextMenu,
    onVideoPreview,
    onVideoRemove,
    onVideoEdit
  } = data;

  const videoIndex = rowIndex * columnsPerRow + columnIndex;
  const video = videos[videoIndex];

  if (!video) {
    return <div style={style} />;
  }

  return (
    <div style={{ ...style, padding: '8px' }}>
      <VideoCardEnhanced
        video={video}
        isSelected={selectedVideoIds.includes(video.id)}
        viewMode="grid"
        gridSize={viewSettings.gridSize}
        showThumbnails={viewSettings.showThumbnails}
        showMetadata={viewSettings.showMetadata}
        showProgress={viewSettings.showProgress}
        onSelect={onVideoSelect}
        onDoubleClick={onVideoDoubleClick}
        onContextMenu={onVideoContextMenu}
        onPreview={onVideoPreview}
        onRemove={onVideoRemove}
        onEdit={onVideoEdit}
      />
    </div>
  );
};

// List item component for virtualization
const ListItem: React.FC<{
  index: number;
  style: React.CSSProperties;
  data: {
    videos: VideoFileEnhanced[];
    selectedVideoIds: string[];
    viewSettings: ViewSettings;
    onVideoSelect: (videoId: string, multiSelect: boolean) => void;
    onVideoDoubleClick: (video: VideoFileEnhanced) => void;
    onVideoContextMenu: (event: React.MouseEvent, video: VideoFileEnhanced) => void;
    onVideoPreview: (video: VideoFileEnhanced) => void;
    onVideoRemove: (video: VideoFileEnhanced) => void;
    onVideoEdit: (video: VideoFileEnhanced) => void;
  };
}> = ({ index, style, data }) => {
  const {
    videos,
    selectedVideoIds,
    viewSettings,
    onVideoSelect,
    onVideoDoubleClick,
    onVideoContextMenu,
    onVideoPreview,
    onVideoRemove,
    onVideoEdit
  } = data;

  const video = videos[index];

  if (!video) {
    return <div style={style} />;
  }

  return (
    <div style={{ ...style, padding: '4px 8px' }}>
      <VideoCardEnhanced
        video={video}
        isSelected={selectedVideoIds.includes(video.id)}
        viewMode="list"
        gridSize="medium"
        showThumbnails={viewSettings.showThumbnails}
        showMetadata={viewSettings.showMetadata}
        showProgress={viewSettings.showProgress}
        onSelect={onVideoSelect}
        onDoubleClick={onVideoDoubleClick}
        onContextMenu={onVideoContextMenu}
        onPreview={onVideoPreview}
        onRemove={onVideoRemove}
        onEdit={onVideoEdit}
      />
    </div>
  );
};

// Virtualized Grid Component
const VirtualizedGrid: React.FC<VirtualizedGridProps> = ({
  videos,
  selectedVideoIds,
  viewSettings,
  containerWidth,
  containerHeight,
  onVideoSelect,
  onVideoDoubleClick,
  onVideoContextMenu,
  onVideoPreview,
  onVideoRemove,
  onVideoEdit
}) => {
  const getItemSize = () => {
    const sizes = {
      small: 200,
      medium: 240,
      large: 280
    };
    return sizes[viewSettings.gridSize];
  };

  const itemSize = getItemSize();
  const columnsPerRow = Math.floor((containerWidth - 32) / itemSize);
  const rowCount = Math.ceil(videos.length / columnsPerRow);

  const itemData = {
    videos,
    columnsPerRow,
    selectedVideoIds,
    viewSettings,
    onVideoSelect,
    onVideoDoubleClick,
    onVideoContextMenu,
    onVideoPreview,
    onVideoRemove,
    onVideoEdit
  };

  return (
    <VirtualGrid
      columnCount={columnsPerRow}
      columnWidth={itemSize}
      height={containerHeight}
      rowCount={rowCount}
      rowHeight={itemSize}
      width={containerWidth}
      itemData={itemData}
      overscanRowCount={2}
      overscanColumnCount={1}
    >
      {GridItem}
    </VirtualGrid>
  );
};

// Virtualized List Component
const VirtualizedList: React.FC<VirtualizedListProps> = ({
  videos,
  selectedVideoIds,
  viewSettings,
  containerWidth,
  containerHeight,
  onVideoSelect,
  onVideoDoubleClick,
  onVideoContextMenu,
  onVideoPreview,
  onVideoRemove,
  onVideoEdit
}) => {
  const itemData = {
    videos,
    selectedVideoIds,
    viewSettings,
    onVideoSelect,
    onVideoDoubleClick,
    onVideoContextMenu,
    onVideoPreview,
    onVideoRemove,
    onVideoEdit
  };

  return (
    <VirtualList
      height={containerHeight}
      itemCount={videos.length}
      itemSize={88}
      width={containerWidth}
      itemData={itemData}
      overscanCount={5}
    >
      {ListItem}
    </VirtualList>
  );
};

// Performance Monitor Component
const PerformanceMonitor: React.FC<{
  videoCount: number;
  renderTime: number;
  memoryUsage: number;
}> = ({ videoCount, renderTime, memoryUsage }) => {
  return (
    <div style={{
      position: 'absolute',
      top: '8px',
      right: '8px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: '#ffffff',
      padding: '8px',
      borderRadius: '6px',
      fontSize: '10px',
      fontFamily: 'monospace',
      zIndex: 10
    }}>
      <div>Videos: {videoCount}</div>
      <div>Render: {renderTime.toFixed(1)}ms</div>
      <div>Memory: {(memoryUsage / 1024 / 1024).toFixed(1)}MB</div>
    </div>
  );
};

// Group Header Component
const GroupHeader: React.FC<{
  groupName: string;
  videoCount: number;
  isCollapsed: boolean;
  onToggle: () => void;
}> = ({ groupName, videoCount, isCollapsed, onToggle }) => {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 16px',
        background: 'rgba(116, 97, 239, 0.1)',
        borderBottom: '1px solid rgba(116, 97, 239, 0.3)',
        cursor: 'pointer',
        userSelect: 'none'
      }}
    >
      <span style={{
        fontSize: '12px',
        transition: 'transform 0.2s ease',
        transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)'
      }}>
        ▼
      </span>
      <span style={{
        fontSize: '14px',
        fontWeight: '600',
        color: '#ffffff'
      }}>
        {groupName}
      </span>
      <span style={{
        fontSize: '12px',
        color: '#a0a0a0',
        marginLeft: 'auto'
      }}>
        {videoCount} video{videoCount !== 1 ? 's' : ''}
      </span>
    </div>
  );
};

// Main Component
export const VideoLibraryAdvanced: React.FC<VideoLibraryAdvancedProps> = ({
  videos,
  selectedVideoIds,
  searchQuery,
  viewSettings,
  loading,
  onVideoSelect,
  onVideoDoubleClick,
  onVideoContextMenu,
  onVideoPreview,
  onVideoRemove,
  onVideoEdit,
  onViewSettingsChange,
  onLoadMore
}) => {
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [performanceMetrics, setPerformanceMetrics] = useState({
    renderTime: 0,
    memoryUsage: 0
  });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const searchService = SearchService.getInstance();

  // Handle container resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setContainerSize({ width, height });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    handleResize(); // Initial size

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Performance monitoring
  useEffect(() => {
    const startTime = performance.now();
    
    // Measure render time
    const renderTime = performance.now() - startTime;
    
    // Estimate memory usage (rough calculation)
    const memoryUsage = videos.length * 1024; // ~1KB per video estimate
    
    setPerformanceMetrics({ renderTime, memoryUsage });
  }, [videos]);

  // Process and group videos
  const processedVideos = useMemo(() => {
    const startTime = performance.now();
    
    // Apply search if there's a query
    let filteredVideos = videos;
    if (searchQuery.text || Object.keys(searchQuery.filters).length > 0) {
      // Use search service for filtering
      searchService.buildIndex(videos);
      // For now, we'll do a simple client-side filter
      // In a full implementation, this would use the SearchService
      filteredVideos = videos.filter(video => {
        if (searchQuery.text) {
          return video.name.toLowerCase().includes(searchQuery.text.toLowerCase()) ||
                 (video.tags || []).some(tag => tag.toLowerCase().includes(searchQuery.text.toLowerCase()));
        }
        return true;
      });
    }

    // Apply grouping if enabled
    if (viewSettings.groupBy && viewSettings.groupBy !== 'none') {
      const groups = new Map<string, VideoFileEnhanced[]>();
      
      filteredVideos.forEach(video => {
        let groupKey = 'Other';
        
        switch (viewSettings.groupBy) {
          case 'status':
            groupKey = video.status.charAt(0).toUpperCase() + video.status.slice(1);
            break;
          case 'format':
            groupKey = video.metadata?.format?.toUpperCase() || 'Unknown';
            break;
          case 'date':
            groupKey = video.createdAt.toDateString();
            break;
          case 'size':
            const sizeCategory = video.metadata?.size 
              ? video.metadata.size > 100 * 1024 * 1024 ? 'Large (>100MB)' : 'Small (<100MB)'
              : 'Unknown';
            groupKey = sizeCategory;
            break;
        }
        
        if (!groups.has(groupKey)) {
          groups.set(groupKey, []);
        }
        groups.get(groupKey)!.push(video);
      });
      
      const processTime = performance.now() - startTime;
      console.log(`Video processing completed in ${processTime.toFixed(2)}ms`);
      
      return { groups, ungrouped: [] };
    }

    const processTime = performance.now() - startTime;
    console.log(`Video processing completed in ${processTime.toFixed(2)}ms`);
    
    return { groups: new Map(), ungrouped: filteredVideos };
  }, [videos, searchQuery, viewSettings.groupBy, searchService]);

  // Handle group collapse/expand
  const handleGroupToggle = useCallback((groupName: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  }, []);

  // Render grouped content
  const renderGroupedContent = () => {
    if (processedVideos.groups.size === 0) {
      return renderVirtualizedContent(processedVideos.ungrouped);
    }

    return (
      <div style={{ height: '100%', overflowY: 'auto' }}>
        {Array.from(processedVideos.groups.entries()).map(([groupName, groupVideos]) => {
          const isCollapsed = collapsedGroups.has(groupName);
          
          return (
            <div key={groupName}>
              <GroupHeader
                groupName={groupName}
                videoCount={groupVideos.length}
                isCollapsed={isCollapsed}
                onToggle={() => handleGroupToggle(groupName)}
              />
              {!isCollapsed && (
                <div style={{ 
                  height: Math.min(600, Math.ceil(groupVideos.length / 4) * 200),
                  minHeight: 200
                }}>
                  {renderVirtualizedContent(groupVideos)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Render virtualized content
  const renderVirtualizedContent = (videosToRender: VideoFileEnhanced[]) => {
    if (videosToRender.length === 0) {
      return (
        <div style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#a0a0a0',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
          <h3 style={{ margin: '0 0 8px 0' }}>No videos found</h3>
          <p style={{ margin: 0, fontSize: '14px' }}>
            {searchQuery.text ? 'Try adjusting your search criteria' : 'Add some videos to get started'}
          </p>
        </div>
      );
    }

    const commonProps = {
      videos: videosToRender,
      selectedVideoIds,
      viewSettings,
      containerWidth: containerSize.width,
      containerHeight: containerSize.height,
      onVideoSelect,
      onVideoDoubleClick,
      onVideoContextMenu,
      onVideoPreview,
      onVideoRemove,
      onVideoEdit
    };

    if (viewSettings.layout === 'grid') {
      return <VirtualizedGrid {...commonProps} />;
    } else {
      return <VirtualizedList {...commonProps} />;
    }
  };

  // Loading overlay
  if (loading) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid rgba(116, 97, 239, 0.3)',
            borderTop: '4px solid #7461ef',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <span style={{ color: '#a0a0a0', fontSize: '14px' }}>
            Loading videos...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        width: '100%',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Performance Monitor (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <PerformanceMonitor
          videoCount={videos.length}
          renderTime={performanceMetrics.renderTime}
          memoryUsage={performanceMetrics.memoryUsage}
        />
      )}

      {/* Main Content */}
      {viewSettings.groupBy && viewSettings.groupBy !== 'none' 
        ? renderGroupedContent()
        : renderVirtualizedContent(processedVideos.ungrouped)
      }

      {/* Load More Trigger (for infinite scroll) */}
      {onLoadMore && videos.length >= viewSettings.itemsPerPage && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '8px 16px',
          background: 'rgba(116, 97, 239, 0.9)',
          color: 'white',
          borderRadius: '20px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: '600'
        }}
        onClick={onLoadMore}
        >
          Load More Videos
        </div>
      )}

      {/* CSS for animations */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};