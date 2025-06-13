import React from 'react';
import { videoService } from '../../services/videoService';

interface LibraryStatsProps {
  videoCount: number;
  totalDuration: number;
  totalSize: number;
  selectedCount: number;
  processingCount: number;
  completedCount: number;
  errorCount: number;
}

const LibraryStats: React.FC<LibraryStatsProps> = ({
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
    return videoService.formatDuration(seconds);
  };
  
  const formatFileSize = (bytes: number): string => {
    return videoService.formatFileSize(bytes);
  };
  
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'ready': return 'var(--text-muted)';
      case 'processing': return 'var(--warning)';
      case 'completed': return 'var(--success)';
      case 'error': return 'var(--error)';
      default: return 'var(--text-secondary)';
    }
  };
  
  return (
    <div className="library-stats">
      <div className="stats-header">
        <h4 className="stats-title">Library Overview</h4>
        {selectedCount > 0 && (
          <div className="selected-indicator">
            {selectedCount} selected
          </div>
        )}
      </div>
      
      <div className="stats-grid">
        {/* Total Statistics */}
        <div className="stat-card total">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{videoCount}</div>
            <div className="stat-label">Total Videos</div>
          </div>
        </div>
        
        <div className="stat-card duration">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <div className="stat-value">{formatDuration(totalDuration)}</div>
            <div className="stat-label">Total Duration</div>
          </div>
        </div>
        
        <div className="stat-card size">
          <div className="stat-icon">💾</div>
          <div className="stat-content">
            <div className="stat-value">{formatFileSize(totalSize)}</div>
            <div className="stat-label">Total Size</div>
          </div>
        </div>
        
        {/* Status Distribution */}
        <div className="stat-card status-overview">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <div className="stat-value">{completionRate}%</div>
            <div className="stat-label">Completion Rate</div>
          </div>
        </div>
      </div>
      
      {/* Status Breakdown */}
      <div className="status-breakdown">
        <div className="status-header">
          <span>Status Breakdown</span>
        </div>
        
        <div className="status-items">
          {readyCount > 0 && (
            <div className="status-item">
              <div 
                className="status-dot"
                style={{ backgroundColor: getStatusColor('ready') }}
              />
              <span className="status-count">{readyCount}</span>
              <span className="status-label">Ready</span>
            </div>
          )}
          
          {processingCount > 0 && (
            <div className="status-item">
              <div 
                className="status-dot processing"
                style={{ backgroundColor: getStatusColor('processing') }}
              />
              <span className="status-count">{processingCount}</span>
              <span className="status-label">Processing</span>
            </div>
          )}
          
          {completedCount > 0 && (
            <div className="status-item">
              <div 
                className="status-dot"
                style={{ backgroundColor: getStatusColor('completed') }}
              />
              <span className="status-count">{completedCount}</span>
              <span className="status-label">Completed</span>
            </div>
          )}
          
          {errorCount > 0 && (
            <div className="status-item">
              <div 
                className="status-dot"
                style={{ backgroundColor: getStatusColor('error') }}
              />
              <span className="status-count">{errorCount}</span>
              <span className="status-label">Error</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Progress Bar */}
      {videoCount > 0 && (
        <div className="progress-section">
          <div className="progress-header">
            <span>Overall Progress</span>
            <span>{completedCount}/{videoCount}</span>
          </div>
          
          <div className="progress-bar-container">
            <div className="progress-bar">
              <div 
                className="progress-fill completed"
                style={{ width: `${(completedCount / videoCount) * 100}%` }}
              />
              <div 
                className="progress-fill processing"
                style={{ 
                  width: `${(processingCount / videoCount) * 100}%`,
                  left: `${(completedCount / videoCount) * 100}%`,
                }}
              />
              <div 
                className="progress-fill error"
                style={{ 
                  width: `${(errorCount / videoCount) * 100}%`,
                  left: `${((completedCount + processingCount) / videoCount) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Quick Actions */}
      {videoCount > 0 && (
        <div className="quick-actions">
          <button 
            className="quick-action-button"
            title="Show only ready videos"
          >
            🎯 Ready ({readyCount})
          </button>
          
          {processingCount > 0 && (
            <button 
              className="quick-action-button"
              title="Show only processing videos"
            >
              🔄 Processing ({processingCount})
            </button>
          )}
          
          {completedCount > 0 && (
            <button 
              className="quick-action-button"
              title="Show only completed videos"
            >
              ✅ Completed ({completedCount})
            </button>
          )}
          
          {errorCount > 0 && (
            <button 
              className="quick-action-button error"
              title="Show only failed videos"
            >
              ❌ Errors ({errorCount})
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default LibraryStats;