import React, { useState, useCallback, useEffect, useRef } from 'react';
import { VideoFileEnhanced, ProcessingProgress } from '../../types/video-enhanced.types';

export interface BatchOperation {
  id: string;
  type: 'import' | 'process' | 'export' | 'analyze' | 'thumbnail' | 'validate';
  title: string;
  description?: string;
  videoIds: string[];
  progress: ProcessingProgress;
  startTime: Date;
  estimatedEndTime?: Date;
  currentVideoIndex: number;
  totalVideos: number;
  currentVideo?: VideoFileEnhanced;
  completedVideos: string[];
  failedVideos: Array<{ videoId: string; error: string }>;
  canCancel: boolean;
  canPause: boolean;
  isPaused: boolean;
  speed?: number; // operations per second
}

export interface BatchProgressIndicatorProps {
  operations: BatchOperation[];
  onCancel?: (operationId: string) => void;
  onPause?: (operationId: string) => void;
  onResume?: (operationId: string) => void;
  onRetry?: (operationId: string, failedVideoIds: string[]) => void;
  onDismiss?: (operationId: string) => void;
  position?: 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left';
  maxVisible?: number;
  showDetails?: boolean;
}

interface OperationCardProps {
  operation: BatchOperation;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onCancel?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onRetry?: (failedVideoIds: string[]) => void;
  onDismiss?: () => void;
}

const ProgressBar: React.FC<{
  percentage: number;
  stage: ProcessingProgress['stage'];
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}> = ({ percentage, stage, size = 'medium', showText = true }) => {
  const getStageColor = (stage: ProcessingProgress['stage']) => {
    switch (stage) {
      case 'analyzing': return '#3498db';
      case 'processing': return '#9b59b6';
      case 'finalizing': return '#f39c12';
      case 'complete': return '#27ae60';
      default: return '#7461ef';
    }
  };

  const heights = {
    small: '4px',
    medium: '6px',
    large: '8px'
  };

  return (
    <div style={{
      width: '100%',
      background: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '3px',
      overflow: 'hidden',
      height: heights[size]
    }}>
      <div
        style={{
          width: `${Math.min(100, Math.max(0, percentage))}%`,
          height: '100%',
          background: getStageColor(stage),
          transition: 'width 0.3s ease, background-color 0.3s ease',
          borderRadius: '3px'
        }}
      />
      {showText && size !== 'small' && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '10px',
          fontWeight: '600',
          color: '#ffffff',
          textShadow: '0 1px 2px rgba(0,0,0,0.8)',
          pointerEvents: 'none'
        }}>
          {percentage.toFixed(0)}%
        </div>
      )}
    </div>
  );
};

const TimeEstimate: React.FC<{
  startTime: Date;
  estimatedEndTime?: Date;
  progress: ProcessingProgress;
}> = ({ startTime, estimatedEndTime, progress }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const elapsed = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);
  const remaining = estimatedEndTime 
    ? Math.floor((estimatedEndTime.getTime() - currentTime.getTime()) / 1000)
    : progress.estimatedTimeRemaining;

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '10px',
      color: '#a0a0a0',
      marginTop: '4px'
    }}>
      <span>Elapsed: {formatTime(elapsed)}</span>
      {remaining && remaining > 0 && (
        <span>Remaining: {formatTime(remaining)}</span>
      )}
    </div>
  );
};

const VideoList: React.FC<{
  videos: Array<{ videoId: string; status: 'pending' | 'processing' | 'completed' | 'failed'; error?: string }>;
  currentVideoId?: string;
  maxVisible?: number;
}> = ({ videos, currentVideoId, maxVisible = 3 }) => {
  const [showAll, setShowAll] = useState(false);
  const visibleVideos = showAll ? videos : videos.slice(0, maxVisible);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'processing': return '⚙️';
      case 'completed': return '✅';
      case 'failed': return '❌';
      default: return '⏳';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#a0a0a0';
      case 'processing': return '#3498db';
      case 'completed': return '#27ae60';
      case 'failed': return '#e74c3c';
      default: return '#a0a0a0';
    }
  };

  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{
        fontSize: '11px',
        color: '#a0a0a0',
        marginBottom: '4px',
        fontWeight: '600'
      }}>
        Videos ({videos.filter(v => v.status === 'completed').length}/{videos.length}):
      </div>
      <div style={{
        maxHeight: showAll ? '150px' : 'none',
        overflowY: 'auto',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '4px',
        padding: '4px'
      }}>
        {visibleVideos.map((video, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '2px 4px',
              borderRadius: '2px',
              background: video.videoId === currentVideoId 
                ? 'rgba(116, 97, 239, 0.2)' 
                : 'transparent',
              fontSize: '10px'
            }}
          >
            <span>{getStatusIcon(video.status)}</span>
            <span 
              style={{ 
                color: getStatusColor(video.status),
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              Video {index + 1}
            </span>
            {video.error && (
              <span 
                title={video.error}
                style={{ 
                  color: '#e74c3c',
                  cursor: 'help'
                }}
              >
                ⚠️
              </span>
            )}
          </div>
        ))}
      </div>
      {videos.length > maxVisible && (
        <button
          onClick={() => setShowAll(!showAll)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#7461ef',
            fontSize: '10px',
            cursor: 'pointer',
            marginTop: '4px'
          }}
        >
          {showAll ? 'Show Less' : `Show ${videos.length - maxVisible} More`}
        </button>
      )}
    </div>
  );
};

const OperationCard: React.FC<OperationCardProps> = ({
  operation,
  isExpanded,
  onToggleExpand,
  onCancel,
  onPause,
  onResume,
  onRetry,
  onDismiss
}) => {
  const isCompleted = operation.progress.stage === 'complete';
  const hasErrors = operation.failedVideos.length > 0;

  const getOperationIcon = (type: BatchOperation['type']) => {
    switch (type) {
      case 'import': return '📥';
      case 'process': return '⚙️';
      case 'export': return '📤';
      case 'analyze': return '🔍';
      case 'thumbnail': return '🖼️';
      case 'validate': return '✅';
      default: return '📋';
    }
  };

  const videoList = operation.videoIds.map(videoId => ({
    videoId,
    status: operation.completedVideos.includes(videoId) ? 'completed' as const :
            operation.failedVideos.find(f => f.videoId === videoId) ? 'failed' as const :
            operation.currentVideo?.id === videoId ? 'processing' as const : 'pending' as const,
    error: operation.failedVideos.find(f => f.videoId === videoId)?.error
  }));

  return (
    <div style={{
      background: 'linear-gradient(135deg, #2d2d47 0%, #3a3a5c 100%)',
      border: '1px solid #4a4a6a',
      borderRadius: '8px',
      padding: '12px',
      marginBottom: '8px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flex: 1
        }}>
          <span style={{ fontSize: '16px' }}>
            {getOperationIcon(operation.type)}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '13px',
              fontWeight: '600',
              color: '#ffffff',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {operation.title}
            </div>
            {operation.description && (
              <div style={{
                fontSize: '11px',
                color: '#a0a0a0',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {operation.description}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Status Badge */}
          {isCompleted && (
            <span style={{
              background: hasErrors ? '#e74c3c' : '#27ae60',
              color: 'white',
              padding: '2px 6px',
              borderRadius: '10px',
              fontSize: '9px',
              fontWeight: '600'
            }}>
              {hasErrors ? 'Completed with errors' : 'Completed'}
            </span>
          )}

          {operation.isPaused && (
            <span style={{
              background: '#f39c12',
              color: 'white',
              padding: '2px 6px',
              borderRadius: '10px',
              fontSize: '9px',
              fontWeight: '600'
            }}>
              Paused
            </span>
          )}

          {/* Expand/Collapse */}
          <button
            onClick={onToggleExpand}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#a0a0a0',
              cursor: 'pointer',
              padding: '2px'
            }}
          >
            <span style={{
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
              display: 'inline-block'
            }}>
              ▼
            </span>
          </button>

          {/* Dismiss */}
          {(isCompleted || operation.canCancel) && onDismiss && (
            <button
              onClick={onDismiss}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#e74c3c',
                cursor: 'pointer',
                padding: '2px',
                fontSize: '12px'
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ position: 'relative', marginBottom: '8px' }}>
        <ProgressBar
          percentage={operation.progress.percentage}
          stage={operation.progress.stage}
          size="medium"
          showText={false}
        />
      </div>

      {/* Progress Text */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: isExpanded ? '8px' : '0'
      }}>
        <span style={{ fontSize: '11px', color: '#ffffff' }}>
          {operation.currentVideoIndex + 1} of {operation.totalVideos} videos
        </span>
        <span style={{ fontSize: '11px', color: '#a0a0a0' }}>
          {operation.progress.percentage.toFixed(0)}%
        </span>
      </div>

      {/* Current Operation */}
      {operation.progress.currentOperation && !isCompleted && (
        <div style={{
          fontSize: '10px',
          color: '#a0a0a0',
          marginBottom: isExpanded ? '8px' : '0',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {operation.progress.currentOperation}
        </div>
      )}

      {/* Expanded Content */}
      {isExpanded && (
        <div>
          {/* Time Estimates */}
          <TimeEstimate
            startTime={operation.startTime}
            estimatedEndTime={operation.estimatedEndTime}
            progress={operation.progress}
          />

          {/* Speed */}
          {operation.speed && (
            <div style={{
              fontSize: '10px',
              color: '#a0a0a0',
              marginTop: '4px'
            }}>
              Speed: {operation.speed.toFixed(1)} videos/sec
            </div>
          )}

          {/* Video List */}
          <VideoList
            videos={videoList}
            currentVideoId={operation.currentVideo?.id}
            maxVisible={5}
          />

          {/* Actions */}
          <div style={{
            display: 'flex',
            gap: '6px',
            marginTop: '12px',
            flexWrap: 'wrap'
          }}>
            {!isCompleted && operation.canPause && (
              <button
                onClick={operation.isPaused ? onResume : onPause}
                style={{
                  background: '#f39c12',
                  color: 'white',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  cursor: 'pointer'
                }}
              >
                {operation.isPaused ? '▶️ Resume' : '⏸️ Pause'}
              </button>
            )}

            {!isCompleted && operation.canCancel && onCancel && (
              <button
                onClick={onCancel}
                style={{
                  background: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  cursor: 'pointer'
                }}
              >
                🛑 Cancel
              </button>
            )}

            {isCompleted && hasErrors && onRetry && (
              <button
                onClick={() => onRetry(operation.failedVideos.map(f => f.videoId))}
                style={{
                  background: '#3498db',
                  color: 'white',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  cursor: 'pointer'
                }}
              >
                🔄 Retry Failed
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const BatchProgressIndicator: React.FC<BatchProgressIndicatorProps> = ({
  operations,
  onCancel,
  onPause,
  onResume,
  onRetry,
  onDismiss,
  position = 'bottom-right',
  maxVisible = 3,
  showDetails = true
}) => {
  const [expandedOperations, setExpandedOperations] = useState<Set<string>>(new Set());
  const [isMinimized, setIsMinimized] = useState(false);

  const toggleExpanded = useCallback((operationId: string) => {
    setExpandedOperations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(operationId)) {
        newSet.delete(operationId);
      } else {
        newSet.add(operationId);
      }
      return newSet;
    });
  }, []);

  const getPositionStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'fixed',
      zIndex: 1000,
      maxWidth: '350px',
      maxHeight: '80vh',
      overflowY: 'auto'
    };

    switch (position) {
      case 'top-right':
        return { ...base, top: '20px', right: '20px' };
      case 'bottom-right':
        return { ...base, bottom: '20px', right: '20px' };
      case 'bottom-left':
        return { ...base, bottom: '20px', left: '20px' };
      case 'top-left':
        return { ...base, top: '20px', left: '20px' };
      default:
        return { ...base, bottom: '20px', right: '20px' };
    }
  };

  if (operations.length === 0) {
    return null;
  }

  const visibleOperations = operations.slice(0, maxVisible);
  const hiddenCount = operations.length - maxVisible;

  return (
    <div style={getPositionStyles()}>
      {/* Minimized View */}
      {isMinimized ? (
        <div style={{
          background: 'linear-gradient(135deg, #2d2d47 0%, #3a3a5c 100%)',
          border: '1px solid #4a4a6a',
          borderRadius: '8px',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
        }}
        onClick={() => setIsMinimized(false)}
        >
          <span style={{ fontSize: '14px' }}>⚙️</span>
          <span style={{ fontSize: '12px', color: '#ffffff' }}>
            {operations.length} operation{operations.length !== 1 ? 's' : ''} running
          </span>
          <span style={{ fontSize: '10px', color: '#7461ef' }}>
            Click to expand
          </span>
        </div>
      ) : (
        <div>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #2d2d47 0%, #3a3a5c 100%)',
            border: '1px solid #4a4a6a',
            borderRadius: '8px 8px 0 0',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{
              fontSize: '12px',
              fontWeight: '600',
              color: '#ffffff'
            }}>
              Batch Operations ({operations.length})
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => setIsMinimized(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#a0a0a0',
                  cursor: 'pointer',
                  padding: '2px',
                  fontSize: '10px'
                }}
              >
                ➖
              </button>
            </div>
          </div>

          {/* Operations List */}
          <div style={{
            background: 'rgba(45, 45, 71, 0.95)',
            border: '1px solid #4a4a6a',
            borderTop: 'none',
            borderRadius: '0 0 8px 8px',
            padding: '8px',
            backdropFilter: 'blur(10px)'
          }}>
            {visibleOperations.map(operation => (
              <OperationCard
                key={operation.id}
                operation={operation}
                isExpanded={expandedOperations.has(operation.id) && showDetails}
                onToggleExpand={() => toggleExpanded(operation.id)}
                onCancel={onCancel ? () => onCancel(operation.id) : undefined}
                onPause={onPause ? () => onPause(operation.id) : undefined}
                onResume={onResume ? () => onResume(operation.id) : undefined}
                onRetry={onRetry ? (failedVideoIds) => onRetry(operation.id, failedVideoIds) : undefined}
                onDismiss={onDismiss ? () => onDismiss(operation.id) : undefined}
              />
            ))}

            {/* Hidden Operations Indicator */}
            {hiddenCount > 0 && (
              <div style={{
                textAlign: 'center',
                padding: '8px',
                fontSize: '11px',
                color: '#a0a0a0',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                marginTop: '4px'
              }}>
                And {hiddenCount} more operation{hiddenCount !== 1 ? 's' : ''}...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};