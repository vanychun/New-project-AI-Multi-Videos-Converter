import React from 'react';
import { Video } from '../../types/video.types';

interface VideoListViewProps {
  videos: Video[];
  selectedVideos: string[];
  onSelect: (videoId: string, isSelected: boolean) => void;
  onRemove: (videoId: string) => void;
  onEdit: (videoId: string) => void;
  onPreview: (video: Video) => void;
  onSelectAll: () => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (column: string) => void;
}

const VideoListView: React.FC<VideoListViewProps> = ({
  videos,
  selectedVideos,
  onSelect,
  onRemove,
  onEdit,
  onPreview,
  onSelectAll,
  sortBy,
  sortOrder,
  onSort,
}) => {
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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

  const formatDate = (timestamp: number): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(timestamp));
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return '↕️';
    return sortOrder === 'asc' ? '⬆️' : '⬇️';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready': return { icon: '⚪', color: '#6b7280' };
      case 'processing': return { icon: '🟡', color: '#ffd23f' };
      case 'completed': return { icon: '🟢', color: '#4ade80' };
      case 'error': return { icon: '🔴', color: '#ff6b6b' };
      default: return { icon: '⚪', color: '#6b7280' };
    }
  };

  const columns = [
    { key: 'name', label: 'Name', width: '30%' },
    { key: 'duration', label: 'Duration', width: '10%' },
    { key: 'resolution', label: 'Resolution', width: '12%' },
    { key: 'size', label: 'Size', width: '10%' },
    { key: 'format', label: 'Format', width: '8%' },
    { key: 'fps', label: 'FPS', width: '8%' },
    { key: 'created', label: 'Added', width: '15%' },
    { key: 'actions', label: 'Actions', width: '7%' },
  ];

  return (
    <div className="video-list-view">
      {/* Table Header */}
      <div className="list-header">
        <div className="header-row">
          {/* Select All Checkbox */}
          <div className="select-all-cell">
            <button
              className={`select-all-checkbox ${selectedVideos.length === videos.length && videos.length > 0 ? 'checked' : ''}`}
              onClick={onSelectAll}
              title={selectedVideos.length === videos.length ? 'Deselect all' : 'Select all'}
            >
              {selectedVideos.length === videos.length && videos.length > 0 ? '☑️' : 
               selectedVideos.length > 0 ? '➖' : '☐'}
            </button>
          </div>

          {/* Status Column */}
          <div className="status-cell">
            <span className="column-header">Status</span>
          </div>

          {/* Sortable Columns */}
          {columns.map((column) => (
            <div 
              key={column.key}
              className={`column-header-cell ${column.key === 'actions' ? 'actions-header' : 'sortable'}`}
              style={{ width: column.width }}
              onClick={() => column.key !== 'actions' && onSort(column.key)}
            >
              <span className="column-label">{column.label}</span>
              {column.key !== 'actions' && (
                <span className="sort-icon">{getSortIcon(column.key)}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Table Body */}
      <div className="list-body">
        {videos.map((video, index) => {
          const isSelected = selectedVideos.includes(video.id);
          const status = getStatusIcon(video.status);
          
          return (
            <div 
              key={video.id}
              className={`list-row ${isSelected ? 'selected' : ''} ${index % 2 === 0 ? 'even' : 'odd'}`}
            >
              {/* Selection Checkbox */}
              <div className="select-cell">
                <button
                  className={`row-checkbox ${isSelected ? 'checked' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(video.id, !isSelected);
                  }}
                >
                  {isSelected ? '☑️' : '☐'}
                </button>
              </div>

              {/* Status */}
              <div className="status-cell">
                <span 
                  className="status-indicator"
                  style={{ color: status.color }}
                  title={video.status}
                >
                  {status.icon}
                </span>
                {video.processProgress !== undefined && video.status === 'processing' && (
                  <div className="progress-mini">
                    <div 
                      className="progress-fill-mini"
                      style={{ width: `${video.processProgress}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Name with Thumbnail */}
              <div 
                className="name-cell"
                style={{ width: columns[0].width }}
                onClick={() => onPreview(video)}
              >
                <div className="name-content">
                  {video.thumbnail ? (
                    <img 
                      src={video.thumbnail} 
                      alt={video.name}
                      className="list-thumbnail"
                    />
                  ) : (
                    <div className="list-thumbnail-placeholder">
                      📹
                    </div>
                  )}
                  <div className="name-text">
                    <div className="video-name" title={video.name}>
                      {video.name}
                    </div>
                    <div className="video-path" title={video.path}>
                      {video.path.split('/').pop()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Duration */}
              <div className="duration-cell" style={{ width: columns[1].width }}>
                <span className="duration-value">{formatDuration(video.duration)}</span>
              </div>

              {/* Resolution */}
              <div className="resolution-cell" style={{ width: columns[2].width }}>
                <span className="resolution-value">{video.resolution}</span>
                <span className="aspect-ratio">
                  {video.metadata?.aspectRatio || '16:9'}
                </span>
              </div>

              {/* Size */}
              <div className="size-cell" style={{ width: columns[3].width }}>
                <span className="size-value">{formatFileSize(video.size)}</span>
              </div>

              {/* Format */}
              <div className="format-cell" style={{ width: columns[4].width }}>
                <span className="format-badge">{video.format.toUpperCase()}</span>
              </div>

              {/* FPS */}
              <div className="fps-cell" style={{ width: columns[5].width }}>
                <span className="fps-value">{video.fps}</span>
              </div>

              {/* Created Date */}
              <div className="created-cell" style={{ width: columns[6].width }}>
                <span className="created-value">{formatDate(video.createdAt)}</span>
              </div>

              {/* Actions */}
              <div className="actions-cell" style={{ width: columns[7].width }}>
                <div className="action-buttons">
                  <button
                    className="action-btn-list preview"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreview(video);
                    }}
                    title="Preview video"
                  >
                    👁️
                  </button>
                  <button
                    className="action-btn-list edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(video.id);
                    }}
                    title="Edit video"
                  >
                    ✏️
                  </button>
                  <button
                    className="action-btn-list remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(video.id);
                    }}
                    title="Remove video"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {videos.length === 0 && (
        <div className="list-empty">
          <div className="empty-icon">📋</div>
          <div className="empty-message">No videos to display</div>
        </div>
      )}
    </div>
  );
};

export default VideoListView;