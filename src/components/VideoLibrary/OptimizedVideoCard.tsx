import React, { useState, useCallback, useMemo, memo } from 'react';
import { Video, VideoStatus } from '../../types/video.types';

interface OptimizedVideoCardProps {
  video: Video;
  isSelected: boolean;
  onSelect: (videoId: string, isSelected: boolean) => void;
  onRemove?: (videoId: string) => void;
  onEdit?: (videoId: string) => void;
  onPreview?: (video: Video) => void;
  viewMode?: 'grid' | 'list' | 'tiles';
  thumbnailSize?: number;
  showThumbnails?: boolean;
}

// Memoized thumbnail component with lazy loading
const LazyThumbnail: React.FC<{
  video: Video;
  thumbnailSize: number;
  showThumbnails: boolean;
}> = memo(({ video, thumbnailSize, showThumbnails }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoaded(true);
  }, []);

  if (!showThumbnails) {
    return (
      <div 
        className="thumbnail-placeholder"
        style={{ 
          width: thumbnailSize, 
          height: Math.round(thumbnailSize * 0.56),
          backgroundColor: '#2a2a3a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px'
        }}
      >
        <span style={{ fontSize: Math.round(thumbnailSize * 0.15), opacity: 0.5 }}>🎬</span>
      </div>
    );
  }

  return (
    <div className="video-thumbnail">
      {!imageLoaded && (
        <div 
          className="thumbnail-skeleton"
          style={{ 
            width: thumbnailSize, 
            height: Math.round(thumbnailSize * 0.56),
            backgroundColor: '#2a2a3a',
            borderRadius: '8px',
            animation: 'pulse 1.5s ease-in-out infinite'
          }}
        />
      )}
      
      {video.thumbnail && !imageError ? (
        <img
          src={video.thumbnail}
          alt={video.name}
          className="thumbnail-image"
          style={{ 
            width: thumbnailSize, 
            height: Math.round(thumbnailSize * 0.56),
            objectFit: 'cover',
            borderRadius: '8px',
            display: imageLoaded ? 'block' : 'none'
          }}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="lazy"
        />
      ) : (
        imageLoaded && (
          <div 
            className="thumbnail-placeholder"
            style={{ 
              width: thumbnailSize, 
              height: Math.round(thumbnailSize * 0.56),
              backgroundColor: '#2a2a3a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px'
            }}
          >
            <span style={{ fontSize: Math.round(thumbnailSize * 0.15), opacity: 0.5 }}>🎬</span>
          </div>
        )
      )}
    </div>
  );
});

LazyThumbnail.displayName = 'LazyThumbnail';

// Memoized metadata component
const VideoMetadata: React.FC<{ video: Video }> = memo(({ video }) => {
  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const formatFileSize = useCallback((bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }, []);

  const qualityBadge = useMemo(() => {
    const width = video.metadata.width;
    if (width >= 3840) return '8K';
    if (width >= 2560) return '4K';
    if (width >= 1920) return 'HD';
    if (width >= 1280) return 'HD';
    return 'SD';
  }, [video.metadata.width]);

  return (
    <>
      <div className="duration-overlay">{formatDuration(video.duration)}</div>
      <div className="quality-badge">{qualityBadge}</div>
      <div className="metadata-primary">
        <span className="resolution">{video.resolution}</span>
        <span className="file-size">{formatFileSize(video.size)}</span>
      </div>
      <div className="metadata-secondary">
        <span className="format">{video.format.toUpperCase()}</span>
        <span className="fps">{video.fps} fps</span>
        {video.metadata.hasAudio && <span className="audio-indicator">🔊</span>}
      </div>
    </>
  );
});

VideoMetadata.displayName = 'VideoMetadata';

export const OptimizedVideoCard: React.FC<OptimizedVideoCardProps> = memo(({
  video,
  isSelected,
  onSelect,
  onRemove,
  onEdit,
  onPreview,
  viewMode = 'grid',
  thumbnailSize = 200,
  showThumbnails = true
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleSelect = useCallback(() => {
    onSelect(video.id, !isSelected);
  }, [onSelect, video.id, isSelected]);

  const handlePreview = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPreview) {
      onPreview(video);
    }
  }, [onPreview, video]);

  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(video.id);
    }
  }, [onEdit, video.id]);

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove(video.id);
    }
  }, [onRemove, video.id]);

  const statusColor = useMemo(() => {
    switch (video.status) {
      case 'processing': return 'var(--warning)';
      case 'completed': return 'var(--success)';
      case 'error': return 'var(--error)';
      default: return 'var(--text-muted)';
    }
  }, [video.status]);

  // List view for better performance with many items
  if (viewMode === 'list') {
    return (
      <div 
        className={`video-card-list ${isSelected ? 'selected' : ''}`}
        onClick={handleSelect}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="selection-checkbox">
          <div className={`checkbox ${isSelected ? 'checked' : ''}`} />
        </div>
        
        <LazyThumbnail 
          video={video} 
          thumbnailSize={60} 
          showThumbnails={showThumbnails} 
        />
        
        <div className="video-info-list">
          <div className="video-title">{video.name}</div>
          <div className="video-details">
            {video.resolution} • {Math.round(video.size / 1024 / 1024)}MB • {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
          </div>
        </div>
        
        <div className="status-indicator" style={{ color: statusColor }}>
          <div className="status-dot" />
        </div>
        
        {isHovered && (
          <div className="action-buttons">
            {onPreview && (
              <button onClick={handlePreview} title="Preview video">👁️</button>
            )}
            {onEdit && (
              <button onClick={handleEdit} title="Edit video">✏️</button>
            )}
            {onRemove && (
              <button onClick={handleRemove} title="Remove video">🗑️</button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Grid view
  return (
    <div 
      className={`video-card-modern ${isSelected ? 'selected' : ''} ${viewMode}`}
      onClick={handleSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ width: thumbnailSize }}
    >
      {/* Selection Checkbox */}
      <div className="selection-checkbox">
        <div className={`checkbox ${isSelected ? 'checked' : ''}`} />
      </div>
      
      {/* Status Indicator */}
      <div className={`status-indicator ${video.status}`}>
        <div className="status-dot" />
      </div>
      
      {/* Thumbnail with lazy loading */}
      <LazyThumbnail 
        video={video} 
        thumbnailSize={thumbnailSize} 
        showThumbnails={showThumbnails} 
      />
      
      {/* Processing Progress */}
      {video.status === 'processing' && video.processProgress !== undefined && (
        <div className="progress-overlay">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${video.processProgress}%` }}
            />
          </div>
          <span className="progress-text">{Math.round(video.processProgress)}%</span>
        </div>
      )}
      
      {/* Play overlay on hover */}
      {isHovered && onPreview && (
        <div className="play-overlay" onClick={handlePreview}>
          <div className="play-button">▶️</div>
        </div>
      )}
      
      {/* Effects indicator */}
      {video.effects && video.effects.length > 0 && (
        <div className="effects-indicator">
          <span className="effects-count">{video.effects.length}</span>
          <span className="effects-icon">✨</span>
        </div>
      )}
      
      {/* Video Info */}
      <div className="video-info">
        <h4 className="video-title">{video.name}</h4>
        <VideoMetadata video={video} />
      </div>
      
      {/* Action buttons on hover */}
      {isHovered && (
        <div className="action-buttons">
          {onPreview && (
            <button onClick={handlePreview} title="Preview video">👁️</button>
          )}
          {onEdit && (
            <button onClick={handleEdit} title="Edit video">✏️</button>
          )}
          {onRemove && (
            <button onClick={handleRemove} title="Remove video">🗑️</button>
          )}
        </div>
      )}
    </div>
  );
});

OptimizedVideoCard.displayName = 'OptimizedVideoCard';

export default OptimizedVideoCard;