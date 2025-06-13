import React, { useState, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { addNotification } from '../../store/slices/uiSlice';

export interface OutputVideo {
  id: string;
  originalVideoId: string;
  name: string;
  originalName: string;
  path: string;
  size: number;
  duration: number;
  format: string;
  resolution: string;
  thumbnail?: string;
  createdAt: number;
  completedAt: number;
  processingTime: number;
  settings: {
    quality: string;
    codec: string;
    effects?: string[];
  };
  stats?: {
    compressionRatio: number;
    avgSpeed: number;
    peakMemory: string;
  };
}

interface OutputVideoCardProps {
  video: OutputVideo;
  viewMode: 'grid' | 'list';
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onOpen: (video: OutputVideo) => void;
  onReveal: (video: OutputVideo) => void;
  onPreview: (video: OutputVideo) => void;
  onDelete: (video: OutputVideo) => void;
  onShare: (video: OutputVideo) => void;
}

const OutputVideoCard: React.FC<OutputVideoCardProps> = ({
  video,
  viewMode,
  isSelected,
  onSelect,
  onOpen,
  onReveal,
  onPreview,
  onDelete,
  onShare
}) => {
  const dispatch = useDispatch();
  const [isHovered, setIsHovered] = useState(false);
  const [fileExists, setFileExists] = useState<boolean | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Check if file exists
  useEffect(() => {
    const checkFileExists = async () => {
      if (window.electronAPI?.fileExists) {
        try {
          const exists = await window.electronAPI.fileExists(video.path);
          setFileExists(exists);
        } catch (error) {
          console.warn('Could not check file existence:', error);
          setFileExists(false);
        }
      }
    };

    checkFileExists();
  }, [video.path]);

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

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatProcessingTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const getCompressionStatus = () => {
    if (!video.stats?.compressionRatio) return null;
    
    const ratio = video.stats.compressionRatio;
    if (ratio < 0.8) {
      return { label: 'Highly Compressed', color: '#10b981', icon: '📉' };
    } else if (ratio < 1.0) {
      return { label: 'Compressed', color: '#f59e0b', icon: '📊' };
    } else {
      return { label: 'Expanded', color: '#ef4444', icon: '📈' };
    }
  };

  const compressionStatus = getCompressionStatus();

  const handleCopyPath = async () => {
    try {
      await navigator.clipboard.writeText(video.path);
      dispatch(addNotification({
        id: Date.now().toString(),
        type: 'success',
        title: 'Path Copied',
        message: 'Output file path copied to clipboard',
        duration: 2000
      }));
    } catch (error) {
      console.error('Failed to copy path:', error);
    }
  };

  const handleAction = async (action: string) => {
    if (!fileExists) {
      dispatch(addNotification({
        id: Date.now().toString(),
        type: 'error',
        title: 'File Not Found',
        message: 'The output file no longer exists on disk',
        duration: 4000
      }));
      return;
    }

    switch (action) {
      case 'open':
        onOpen(video);
        break;
      case 'reveal':
        onReveal(video);
        break;
      case 'preview':
        onPreview(video);
        break;
      case 'share':
        onShare(video);
        break;
      case 'delete':
        onDelete(video);
        break;
    }
  };

  if (viewMode === 'list') {
    return (
      <div 
        ref={cardRef}
        className={`output-video-card list-view ${isSelected ? 'selected' : ''} ${!fileExists ? 'missing' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="list-checkbox">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(video.id, e.target.checked)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        <div className="list-thumbnail">
          {video.thumbnail ? (
            <img src={video.thumbnail} alt={video.name} />
          ) : (
            <div className="thumbnail-placeholder">
              🎬
            </div>
          )}
          {!fileExists && (
            <div className="missing-overlay">❌</div>
          )}
        </div>

        <div className="list-info">
          <div className="list-name">{video.name}</div>
          <div className="list-details">
            <span className="list-format">{video.format.toUpperCase()}</span>
            <span className="list-resolution">{video.resolution}</span>
            <span className="list-size">{formatFileSize(video.size)}</span>
            <span className="list-duration">{formatDuration(video.duration)}</span>
          </div>
        </div>

        <div className="list-stats">
          <div className="processing-time">
            ⏱️ {formatProcessingTime(video.processingTime)}
          </div>
          {compressionStatus && (
            <div className="compression-status" style={{ color: compressionStatus.color }}>
              {compressionStatus.icon} {(video.stats?.compressionRatio * 100).toFixed(0)}%
            </div>
          )}
        </div>

        <div className="list-actions">
          {fileExists ? (
            <>
              <button
                className="action-btn primary"
                onClick={() => handleAction('open')}
                title="Open file"
              >
                📂
              </button>
              <button
                className="action-btn"
                onClick={() => handleAction('reveal')}
                title="Show in explorer"
              >
                👁️
              </button>
              <button
                className="action-btn"
                onClick={() => handleAction('preview')}
                title="Preview"
              >
                🎬
              </button>
            </>
          ) : (
            <span className="missing-indicator">File Missing</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={cardRef}
      className={`output-video-card grid-view ${isSelected ? 'selected' : ''} ${!fileExists ? 'missing' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="card-header">
        <div className="checkbox-container">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(video.id, e.target.checked)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        {!fileExists && (
          <div className="status-indicator missing">
            <span>❌</span>
            <span>Missing</span>
          </div>
        )}
      </div>

      <div className="thumbnail-container">
        {video.thumbnail ? (
          <img src={video.thumbnail} alt={video.name} className="thumbnail" />
        ) : (
          <div className="thumbnail-placeholder">
            🎬
          </div>
        )}
        
        <div className="duration-badge">
          {formatDuration(video.duration)}
        </div>

        {isHovered && fileExists && (
          <div className="hover-actions">
            <button
              className="hover-btn"
              onClick={() => handleAction('open')}
              title="Open file"
            >
              📂
            </button>
            <button
              className="hover-btn"
              onClick={() => handleAction('preview')}
              title="Preview"
            >
              🎬
            </button>
            <button
              className="hover-btn"
              onClick={() => handleAction('reveal')}
              title="Show in explorer"
            >
              👁️
            </button>
          </div>
        )}
      </div>

      <div className="card-content">
        <div className="video-name" title={video.name}>
          {video.name}
        </div>
        
        <div className="video-details">
          <div className="detail-row">
            <span className="detail-label">Format:</span>
            <span className="detail-value">{video.format.toUpperCase()}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Size:</span>
            <span className="detail-value">{formatFileSize(video.size)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Resolution:</span>
            <span className="detail-value">{video.resolution}</span>
          </div>
        </div>

        {video.stats && (
          <div className="performance-stats">
            <div className="stat-item">
              <span className="stat-icon">⚡</span>
              <span className="stat-text">{video.stats.avgSpeed}x speed</span>
            </div>
            {compressionStatus && (
              <div className="stat-item">
                <span className="stat-icon">{compressionStatus.icon}</span>
                <span className="stat-text" style={{ color: compressionStatus.color }}>
                  {(video.stats.compressionRatio * 100).toFixed(0)}% size
                </span>
              </div>
            )}
          </div>
        )}

        {video.settings.effects && video.settings.effects.length > 0 && (
          <div className="effects-tags">
            {video.settings.effects.slice(0, 2).map((effect, index) => (
              <span key={index} className="effect-tag">
                {effect}
              </span>
            ))}
            {video.settings.effects.length > 2 && (
              <span className="effect-tag more">
                +{video.settings.effects.length - 2}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="card-footer">
        <div className="footer-left">
          <span className="processing-time">
            ⏱️ {formatProcessingTime(video.processingTime)}
          </span>
        </div>
        
        <div className="footer-actions">
          <button
            className="action-btn copy"
            onClick={handleCopyPath}
            title="Copy path"
          >
            📋
          </button>
          <button
            className="action-btn share"
            onClick={() => handleAction('share')}
            title="Share"
            disabled={!fileExists}
          >
            📤
          </button>
          <button
            className="action-btn delete"
            onClick={() => handleAction('delete')}
            title="Delete"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
};

export default OutputVideoCard;