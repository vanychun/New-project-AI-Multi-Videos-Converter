import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';

interface LibraryStatsEnhancedProps {
  className?: string;
}

export const LibraryStatsEnhanced: React.FC<LibraryStatsEnhancedProps> = ({ className = '' }) => {
  const { videos, selectedVideos, totalDuration, totalSize } = useSelector((state: RootState) => state.videos);
  
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins < 60) return `${mins}m ${secs}s`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  };

  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getVideoStats = () => {
    const stats = {
      ready: 0,
      processing: 0,
      completed: 0,
      error: 0,
      hd: 0,
      uhd: 0,
      withAudio: 0,
      totalFrames: 0
    };

    videos.forEach(video => {
      stats[video.status]++;
      
      if (video.metadata.width >= 1920) stats.hd++;
      if (video.metadata.width >= 3840) stats.uhd++;
      if (video.metadata.hasAudio) stats.withAudio++;
      if (video.totalFrames) stats.totalFrames += video.totalFrames;
    });

    return stats;
  };

  const stats = getVideoStats();
  const selectedCount = selectedVideos.length;
  const selectedDuration = videos
    .filter(v => selectedVideos.includes(v.id))
    .reduce((sum, v) => sum + v.duration, 0);
  const selectedSize = videos
    .filter(v => selectedVideos.includes(v.id))
    .reduce((sum, v) => sum + v.size, 0);

  return (
    <div className={`library-stats-enhanced ${className}`}>
      {/* Main Statistics */}
      <div className="stats-section main-stats">
        <div className="stat-group primary">
          <div className="stat-item videos">
            <div className="stat-value">{videos.length}</div>
            <div className="stat-label">video{videos.length !== 1 ? 's' : ''}</div>
          </div>
          
          <div className="stat-item duration">
            <div className="stat-value">{formatDuration(totalDuration)}</div>
            <div className="stat-label">Dur.</div>
          </div>
          
          <div className="stat-item size">
            <div className="stat-value">{formatFileSize(totalSize)}</div>
            <div className="stat-label">Size</div>
          </div>
          
          <div className="stat-item quality">
            <div className="stat-value">
              {stats.uhd > 0 ? '8K' : stats.hd > 0 ? 'HD' : 'SD'}
            </div>
            <div className="stat-label">Max</div>
          </div>
        </div>
      </div>

      {/* Selected Items Stats */}
      {selectedCount > 0 && (
        <div className="stats-section selected-stats">
          <div className="selected-header">
            <span className="selected-icon">✓</span>
            <span className="selected-text">{selectedCount} Selected</span>
          </div>
          <div className="selected-details">
            <span className="selected-duration">{formatDuration(selectedDuration)}</span>
            <span className="selected-size">{formatFileSize(selectedSize)}</span>
          </div>
        </div>
      )}

      {/* Status Breakdown */}
      <div className="stats-section status-stats">
        <div className="status-grid">
          {stats.ready > 0 && (
            <div className="status-item ready">
              <div className="status-dot"></div>
              <span className="status-count">{stats.ready}</span>
              <span className="status-label">Ready</span>
            </div>
          )}
          
          {stats.processing > 0 && (
            <div className="status-item processing">
              <div className="status-dot pulsing"></div>
              <span className="status-count">{stats.processing}</span>
              <span className="status-label">Processing</span>
            </div>
          )}
          
          {stats.completed > 0 && (
            <div className="status-item completed">
              <div className="status-dot"></div>
              <span className="status-count">{stats.completed}</span>
              <span className="status-label">Done</span>
            </div>
          )}
          
          {stats.error > 0 && (
            <div className="status-item error">
              <div className="status-dot"></div>
              <span className="status-count">{stats.error}</span>
              <span className="status-label">Error</span>
            </div>
          )}
        </div>
      </div>

      {/* Quality & Features */}
      <div className="stats-section features-stats">
        <div className="feature-badges">
          {stats.hd > 0 && (
            <div className="feature-badge hd">
              <span className="badge-count">{stats.hd}</span>
              <span className="badge-label">HD</span>
            </div>
          )}
          
          {stats.uhd > 0 && (
            <div className="feature-badge uhd">
              <span className="badge-count">{stats.uhd}</span>
              <span className="badge-label">4K+</span>
            </div>
          )}
          
          {stats.withAudio > 0 && (
            <div className="feature-badge audio">
              <span className="badge-count">{stats.withAudio}</span>
              <span className="badge-label">🔊</span>
            </div>
          )}
        </div>
      </div>

      {/* Processing Progress */}
      {stats.processing > 0 && (
        <div className="stats-section progress-stats">
          <div className="progress-header">
            <span className="progress-icon">⚡</span>
            <span className="progress-text">Processing Active</span>
          </div>
          <div className="progress-details">
            <div className="progress-bar">
              <div className="progress-fill" style={{ 
                width: `${(stats.completed / (stats.completed + stats.processing + stats.ready)) * 100}%` 
              }}></div>
            </div>
            <span className="progress-percent">
              {Math.round((stats.completed / videos.length) * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryStatsEnhanced;