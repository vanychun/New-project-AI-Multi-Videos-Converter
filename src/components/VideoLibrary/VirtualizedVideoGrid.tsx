import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import { Video } from '../../types/video.types';
import VideoCard from './VideoCard';
import { ViewMode } from './ViewModeControls';

interface VirtualizedVideoGridProps {
  videos: Video[];
  selectedVideos: string[];
  onVideoSelect: (videoId: string, isSelected: boolean) => void;
  viewMode: ViewMode;
  thumbnailSize: number;
  showThumbnails: boolean;
  containerWidth: number;
  containerHeight: number;
}

interface GridItemProps {
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
  data: {
    videos: Video[];
    selectedVideos: string[];
    onVideoSelect: (videoId: string, isSelected: boolean) => void;
    viewMode: ViewMode;
    thumbnailSize: number;
    showThumbnails: boolean;
    columnsPerRow: number;
  };
}

const GridItem: React.FC<GridItemProps> = React.memo(({ columnIndex, rowIndex, style, data }) => {
  const {
    videos,
    selectedVideos,
    onVideoSelect,
    viewMode,
    thumbnailSize,
    showThumbnails,
    columnsPerRow
  } = data;

  const videoIndex = rowIndex * columnsPerRow + columnIndex;
  const video = videos[videoIndex];

  if (!video) {
    return <div style={style} />;
  }

  return (
    <div style={style}>
      <VideoCard
        video={video}
        isSelected={selectedVideos.includes(video.id)}
        onSelect={onVideoSelect}
        viewMode={viewMode}
        thumbnailSize={thumbnailSize}
        showThumbnails={showThumbnails}
      />
    </div>
  );
});

GridItem.displayName = 'GridItem';

export const VirtualizedVideoGrid: React.FC<VirtualizedVideoGridProps> = ({
  videos,
  selectedVideos,
  onVideoSelect,
  viewMode,
  thumbnailSize,
  showThumbnails,
  containerWidth,
  containerHeight
}) => {
  const gridRef = useRef<Grid>(null);

  // Calculate grid dimensions
  const { columnsPerRow, rowCount, itemWidth, itemHeight } = useMemo(() => {
    if (viewMode === 'list') {
      return {
        columnsPerRow: 1,
        rowCount: videos.length,
        itemWidth: containerWidth,
        itemHeight: 80 // Fixed height for list items
      };
    }

    // Grid mode calculations
    const minItemWidth = thumbnailSize + 32; // thumbnail + padding
    const maxColumns = Math.floor(containerWidth / minItemWidth) || 1;
    const columns = Math.max(1, maxColumns);
    const rows = Math.ceil(videos.length / columns);
    const actualItemWidth = Math.floor(containerWidth / columns);
    const actualItemHeight = thumbnailSize + 120; // thumbnail + metadata space

    return {
      columnsPerRow: columns,
      rowCount: rows,
      itemWidth: actualItemWidth,
      itemHeight: actualItemHeight
    };
  }, [containerWidth, thumbnailSize, videos.length, viewMode]);

  // Memoized grid data to prevent unnecessary re-renders
  const gridData = useMemo(() => ({
    videos,
    selectedVideos,
    onVideoSelect,
    viewMode,
    thumbnailSize,
    showThumbnails,
    columnsPerRow
  }), [videos, selectedVideos, onVideoSelect, viewMode, thumbnailSize, showThumbnails, columnsPerRow]);

  // Reset scroll position when filters change
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.scrollTo({ scrollTop: 0, scrollLeft: 0 });
    }
  }, [videos.length]);

  if (videos.length === 0) {
    return (
      <div className="empty-library" style={{ height: containerHeight }}>
        <div className="empty-icon">📹</div>
        <div className="empty-title">No videos found</div>
        <div className="empty-subtitle">
          Try adjusting your search or filters
        </div>
      </div>
    );
  }

  return (
    <Grid
      ref={gridRef}
      columnCount={columnsPerRow}
      columnWidth={itemWidth}
      height={containerHeight}
      rowCount={rowCount}
      rowHeight={itemHeight}
      width={containerWidth}
      itemData={gridData}
      overscanRowCount={2}
      overscanColumnCount={1}
    >
      {GridItem}
    </Grid>
  );
};

export default VirtualizedVideoGrid;