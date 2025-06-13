import React from 'react';
// import { videoService } from '../../services/videoService'; // TODO: Implement video service integration

interface LibraryStatsCompactProps {
  videoCount: number;
  totalDuration: number;
  totalSize: number;
  selectedCount: number;
  processingCount: number;
  completedCount: number;
  errorCount: number;
}

const LibraryStatsCompact: React.FC<LibraryStatsCompactProps> = ({
  videoCount,
  totalDuration,
  totalSize,
  selectedCount,
  processingCount,
  completedCount,
  errorCount,
}) => {
  const readyCount = videoCount - processingCount - completedCount - errorCount;
  const completionRate = videoCount > 0 ? Math.round((completedCount / videoCount) * 100) : 0;
  
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    } else if (mins > 0) {
      return `${mins}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
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

  if (videoCount === 0) {
    return null;
  }

  return (
    <div className="library-stats-compact">
      {/* Main Stats Row */}
      <div className="stats-row">
        <div className="stat-card-compact primary">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{videoCount}</div>
            <div className="stat-label">Videos</div>
          </div>
        </div>

        <div className="stat-card-compact">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <div className="stat-value">{formatDuration(totalDuration)}</div>
            <div className="stat-label">Duration</div>
          </div>
        </div>

        <div className="stat-card-compact">
          <div className="stat-icon">💾</div>
          <div className="stat-content">
            <div className="stat-value">{formatFileSize(totalSize)}</div>
            <div className="stat-label">Size</div>
          </div>
        </div>

        {selectedCount > 0 && (
          <div className="stat-card-compact selected">
            <div className="stat-icon">☑️</div>
            <div className="stat-content">
              <div className="stat-value">{selectedCount}</div>
              <div className="stat-label">Selected</div>
            </div>
          </div>
        )}

        <div className="stat-card-compact completion">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <div className="stat-value">{completionRate}%</div>
            <div className="stat-label">Complete</div>
          </div>
        </div>
      </div>

      {/* Status Indicators */}
      {(processingCount > 0 || errorCount > 0 || completedCount > 0) && (
        <div className="status-indicators">
          {readyCount > 0 && (
            <div className="status-indicator ready">
              <div className="status-dot"></div>
              <span>{readyCount} Ready</span>
            </div>
          )}
          
          {processingCount > 0 && (
            <div className="status-indicator processing">
              <div className="status-dot pulsing"></div>
              <span>{processingCount} Processing</span>
            </div>
          )}
          
          {completedCount > 0 && (
            <div className="status-indicator completed">
              <div className="status-dot"></div>
              <span>{completedCount} Done</span>
            </div>
          )}
          
          {errorCount > 0 && (
            <div className="status-indicator error">
              <div className="status-dot"></div>
              <span>{errorCount} Error</span>
            </div>
          )}
        </div>
      )}

      {/* Progress Bar */}
      {videoCount > 0 && (completedCount > 0 || processingCount > 0 || errorCount > 0) && (
        <div className="progress-bar-compact">
          <div 
            className="progress-segment completed"
            style={{ width: `${(completedCount / videoCount) * 100}%` }}
          />
          <div 
            className="progress-segment processing"
            style={{ 
              width: `${(processingCount / videoCount) * 100}%`,
            }}
          />
          <div 
            className="progress-segment error"
            style={{ 
              width: `${(errorCount / videoCount) * 100}%`,
            }}
          />
        </div>
      )}
    </div>
  );
};

export default LibraryStatsCompact;