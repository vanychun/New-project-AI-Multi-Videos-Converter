import React, { useState, useEffect } from 'react';
import { ImportProgress } from '../../services/VideoImportService';
import './BatchImportProgress.css';

interface BatchImportProgressProps {
  progresses: ImportProgress[];
  isVisible: boolean;
  onClose: () => void;
  onCancel?: () => void;
  title?: string;
}

export const BatchImportProgress: React.FC<BatchImportProgressProps> = ({
  progresses,
  isVisible,
  onClose,
  onCancel,
  title = 'Importing Videos'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Auto-close when all imports are complete and successful
  useEffect(() => {
    const allComplete = progresses.length > 0 && progresses.every(p => 
      p.status === 'completed' || p.status === 'failed'
    );
    const allSuccessful = progresses.every(p => p.status === 'completed');
    
    if (allComplete && allSuccessful) {
      const timer = setTimeout(() => {
        onClose();
      }, 2000); // Auto-close after 2 seconds if all successful
      
      return () => clearTimeout(timer);
    }
  }, [progresses, onClose]);
  
  if (!isVisible || progresses.length === 0) {
    return null;
  }
  
  const stats = progresses.reduce((acc, progress) => {
    acc[progress.status]++;
    acc.total++;
    return acc;
  }, { pending: 0, processing: 0, completed: 0, failed: 0, total: 0 });
  
  const overallProgress = stats.total > 0 
    ? ((stats.completed + stats.failed) / stats.total) * 100 
    : 0;
  
  const isProcessing = stats.processing > 0 || stats.pending > 0;
  
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
  
  const getStatusIcon = (status: ImportProgress['status']) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'processing': return '⚙️';
      case 'completed': return '✅';
      case 'failed': return '❌';
      default: return '❓';
    }
  };
  
  const getStatusColor = (status: ImportProgress['status']) => {
    switch (status) {
      case 'pending': return 'var(--text-muted)';
      case 'processing': return 'var(--warning)';
      case 'completed': return 'var(--success)';
      case 'failed': return 'var(--error)';
      default: return 'var(--text-secondary)';
    }
  };
  
  return (
    <div className={`batch-import-progress ${isVisible ? 'visible' : ''}`}>
      <div className="import-progress-container">
        {/* Header */}
        <div className="import-progress-header">
          <div className="header-left">
            <div className="import-icon">
              {isProcessing ? (
                <div className="processing-spinner" />
              ) : stats.failed > 0 ? (
                '⚠️'
              ) : (
                '✅'
              )}
            </div>
            <div className="header-info">
              <h3 className="import-title">{title}</h3>
              <div className="import-summary">
                {stats.completed} of {stats.total} completed
                {stats.failed > 0 && (
                  <span className="failed-count"> • {stats.failed} failed</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="header-actions">
            <button
              className="expand-toggle"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? 'Collapse details' : 'Expand details'}
            >
              {isExpanded ? '🔼' : '🔽'}
            </button>
            
            {isProcessing && onCancel && (
              <button
                className="cancel-button"
                onClick={onCancel}
                title="Cancel import"
              >
                ✕ Cancel
              </button>
            )}
            
            {!isProcessing && (
              <button
                className="close-button"
                onClick={onClose}
                title="Close"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        
        {/* Overall Progress Bar */}
        <div className="overall-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ 
                width: `${overallProgress}%`,
                backgroundColor: stats.failed > 0 ? 'var(--error)' : 'var(--success)'
              }}
            />
          </div>
          <div className="progress-text">
            {Math.round(overallProgress)}%
          </div>
        </div>
        
        {/* Stats Summary */}
        <div className="import-stats">
          <div className="stat-group">
            <div className="stat-icon">📁</div>
            <div className="stat-content">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total Files</div>
            </div>
          </div>
          
          {stats.processing > 0 && (
            <div className="stat-group processing">
              <div className="stat-icon">⚙️</div>
              <div className="stat-content">
                <div className="stat-value">{stats.processing}</div>
                <div className="stat-label">Processing</div>
              </div>
            </div>
          )}
          
          {stats.completed > 0 && (
            <div className="stat-group completed">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <div className="stat-value">{stats.completed}</div>
                <div className="stat-label">Completed</div>
              </div>
            </div>
          )}
          
          {stats.failed > 0 && (
            <div className="stat-group failed">
              <div className="stat-icon">❌</div>
              <div className="stat-content">
                <div className="stat-value">{stats.failed}</div>
                <div className="stat-label">Failed</div>
              </div>
            </div>
          )}
        </div>
        
        {/* Detailed File List */}
        {isExpanded && (
          <div className="file-details">
            <div className="details-header">
              <h4>File Details</h4>
              <div className="filter-options">
                <span className="filter-label">Show:</span>
                <button className="filter-btn active">All</button>
                <button className="filter-btn">Processing</button>
                <button className="filter-btn">Failed</button>
              </div>
            </div>
            
            <div className="file-list">
              {progresses.map((progress) => (
                <div 
                  key={progress.id} 
                  className={`file-item ${progress.status}`}
                >
                  <div className="file-header">
                    <div className="file-info">
                      <div 
                        className="status-icon"
                        style={{ color: getStatusColor(progress.status) }}
                      >
                        {getStatusIcon(progress.status)}
                      </div>
                      <div className="file-details-content">
                        <div className="filename" title={progress.filename}>
                          {progress.filename}
                        </div>
                        <div className="file-meta">
                          {progress.fileSize > 0 && (
                            <span className="file-size">
                              {formatFileSize(progress.fileSize)}
                            </span>
                          )}
                          <span className="file-status">
                            {progress.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="file-progress-info">
                      {progress.status === 'processing' && (
                        <div className="progress-percentage">
                          {Math.round(progress.progress)}%
                        </div>
                      )}
                      {progress.status === 'completed' && progress.video && (
                        <div className="video-info">
                          <span className="resolution">
                            {progress.video.resolution}
                          </span>
                          <span className="duration">
                            {Math.round(progress.video.duration)}s
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Individual Progress Bar */}
                  {(progress.status === 'processing' || progress.status === 'completed') && (
                    <div className="file-progress-bar">
                      <div 
                        className="file-progress-fill"
                        style={{ 
                          width: `${progress.progress}%`,
                          backgroundColor: progress.status === 'completed' 
                            ? 'var(--success)' 
                            : 'var(--warning)'
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Error Message */}
                  {progress.status === 'failed' && progress.error && (
                    <div className="error-message">
                      <div className="error-icon">⚠️</div>
                      <div className="error-text">{progress.error}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="import-actions">
          {!isProcessing && stats.failed > 0 && (
            <button className="retry-failed-button">
              🔄 Retry Failed ({stats.failed})
            </button>
          )}
          
          {stats.completed > 0 && (
            <div className="completion-summary">
              <span className="success-message">
                ✅ Successfully imported {stats.completed} video{stats.completed !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchImportProgress;