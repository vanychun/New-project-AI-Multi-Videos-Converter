import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { 
  pauseProcessing,
  resumeProcessing,
  addToQueue,
  removeFromQueue,
  updateQueueItem,
  clearQueue,
  setHierarchicalView,
  updateTaskFilters,
  setSelectedTaskTree
} from '../../store/slices/processingSlice';
import { addNotification } from '../../store/slices/uiSlice';
import { ProcessingStatus, ProcessingStage } from '../../types/video.types';
import { TaskStatus } from '../../types/task.types';
import TaskTree from '../TaskTree/TaskTree';
import TaskMessages from '../TaskMessages/TaskMessages';
import StartProcessingButton from './StartProcessingButton';
import DeleteConfirmationDialog from '../common/DeleteConfirmationDialog';
import useDeleteConfirmation from '../../hooks/useDeleteConfirmation';
import './ProcessingQueue.css';

interface QueueItemProps {
  item: any;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  onViewLog: (id: string) => void;
  index: number;
}

const QueueItem: React.FC<QueueItemProps> = ({ item, onRemove, onRetry, onViewLog, index }) => {
  const [outputFileExists, setOutputFileExists] = useState<boolean>(false);
  
  // Check if output file exists when item is completed
  useEffect(() => {
    const checkFileExists = async () => {
      if (item.status === ProcessingStatus.COMPLETED && item.outputPath && window.electronAPI?.fileExists) {
        try {
          const exists = await window.electronAPI.fileExists(item.outputPath);
          setOutputFileExists(exists);
        } catch (error) {
          console.warn('Could not check file existence:', error);
          setOutputFileExists(false);
        }
      }
    };
    
    checkFileExists();
  }, [item.status, item.outputPath]);
  const getStatusIcon = (status: ProcessingStatus) => {
    switch (status) {
      case ProcessingStatus.PENDING: return '⏳';
      case ProcessingStatus.PROCESSING: return '⚙️';
      case ProcessingStatus.COMPLETED: return '✅';
      case ProcessingStatus.FAILED: return '❌';
      case ProcessingStatus.PAUSED: return '⏸️';
      case ProcessingStatus.CANCELLED: return '🚫';
      default: return '❓';
    }
  };

  const getStatusColor = (status: ProcessingStatus) => {
    switch (status) {
      case ProcessingStatus.PENDING: return 'var(--text-muted)';
      case ProcessingStatus.PROCESSING: return 'var(--warning)';
      case ProcessingStatus.COMPLETED: return 'var(--success)';
      case ProcessingStatus.FAILED: return 'var(--error)';
      case ProcessingStatus.PAUSED: return 'var(--warning)';
      case ProcessingStatus.CANCELLED: return 'var(--text-muted)';
      default: return 'var(--text-secondary)';
    }
  };

  const formatTime = (seconds: number): string => {
    if (!seconds || seconds < 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  return (
    <div className={`queue-item ${item.status}`}>
      <div className="item-header">
        <div className="item-info">
          <div className="item-index">#{index + 1}</div>
          <div className="item-title">
            <div className="video-name">{item.videoName}</div>
            <div className="video-details">
              {item.inputSize && <span>{formatFileSize(item.inputSize)}</span>}
              {item.duration && <span>{formatTime(item.duration)}</span>}
              {item.resolution && <span>{item.resolution}</span>}
            </div>
          </div>
        </div>
        
        <div className="item-status">
          <div className="status-indicator" style={{ color: getStatusColor(item.status) }}>
            {getStatusIcon(item.status)}
          </div>
          <div className="status-text">{item.status.toUpperCase()}</div>
        </div>
      </div>
      
      {/* Progress Bar */}
      {(item.status === ProcessingStatus.PROCESSING || item.status === ProcessingStatus.COMPLETED) && (
        <div className="progress-section">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ 
                width: `${item.progress || 0}%`,
                backgroundColor: item.status === ProcessingStatus.COMPLETED ? 'var(--success)' : 'var(--warning)'
              }}
            />
          </div>
          <div className="progress-text">
            <span>{Math.round(item.progress || 0)}%</span>
            {item.estimatedTimeRemaining && (
              <span className="time-remaining">
                ETA: {formatTime(item.estimatedTimeRemaining)}
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* Processing Details */}
      {item.status === ProcessingStatus.PROCESSING && (
        <div className="processing-details">
          <div className="current-step">
            <span className="step-label">Current:</span>
            <span className="step-text">{item.currentStep || 'Initializing...'}</span>
          </div>
          
          {item.processingSpeed && (
            <div className="processing-speed">
              <span className="speed-label">Speed:</span>
              <span className="speed-value">{item.processingSpeed}x</span>
            </div>
          )}
          
          {item.framesProcessed && item.totalFrames && (
            <div className="frame-progress">
              <span className="frame-label">Frames:</span>
              <span className="frame-count">
                {item.framesProcessed.toLocaleString()} / {item.totalFrames.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      )}
      
      {/* Error Details */}
      {item.status === ProcessingStatus.FAILED && item.error && (
        <div className="error-details">
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{item.error}</span>
          </div>
        </div>
      )}
      
      {/* Completion Details - Enhanced */}
      {item.status === ProcessingStatus.COMPLETED && (
        <div className="completion-details enhanced">
          <div className="completion-success-header">
            <span className="success-icon">🎉</span>
            <span className="success-text">Processing Complete!</span>
            <span className="completion-time">
              {new Date(item.completedAt || Date.now()).toLocaleTimeString()}
            </span>
          </div>
          
          <div className="completion-metrics">
            <div className="metrics-grid">
              <div className="metric-item output-size">
                <div className="metric-icon">📊</div>
                <div className="metric-content">
                  <div className="metric-label">Output Size</div>
                  <div className="metric-value">
                    {formatFileSize(item.outputSize || 0)}
                    {item.inputSize && (
                      <span className={`size-change ${item.outputSize > item.inputSize ? 'increase' : 'decrease'}`}>
                        ({item.outputSize > item.inputSize ? '+' : ''}
                        {((item.outputSize - item.inputSize) / item.inputSize * 100).toFixed(1)}%)
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="metric-item processing-time">
                <div className="metric-icon">⏱️</div>
                <div className="metric-content">
                  <div className="metric-label">Processing Time</div>
                  <div className="metric-value">{formatTime(item.processingTime || 0)}</div>
                </div>
              </div>
              
              <div className="metric-item quality-score">
                <div className="metric-icon">⭐</div>
                <div className="metric-content">
                  <div className="metric-label">Quality Score</div>
                  <div className="metric-value">
                    {item.qualityScore || 95}%
                    <span className="quality-badge excellent">Excellent</span>
                  </div>
                </div>
              </div>
              
              <div className="metric-item enhancement-factor">
                <div className="metric-icon">🚀</div>
                <div className="metric-content">
                  <div className="metric-label">Enhancement</div>
                  <div className="metric-value">
                    {item.enhancementFactor || '4x'} Upscale
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="completion-details-section">
            <div className="output-info enhanced">
              <div className="output-header">
                <span className="output-icon">📁</span>
                <span className="output-label">Output File</span>
              </div>
              <div className="output-path-container">
                <span className="output-path" title={item.outputPath}>
                  {item.outputPath?.split('/').pop() || 'output.mp4'}
                </span>
                <button 
                  className="copy-path-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(item.outputPath || '');
                  }}
                  title="Copy full path"
                >
                  📋
                </button>
              </div>
              <div className="output-location">
                📂 {item.outputPath?.split('/').slice(0, -1).join('/') || '/output'}
              </div>
            </div>
          </div>
          
          {/* Performance Metrics */}
          <div className="performance-metrics">
            <div className="performance-header">
              <span className="performance-icon">⚡</span>
              <span className="performance-label">Performance Metrics</span>
            </div>
            <div className="performance-grid">
              <div className="perf-item">
                <span className="perf-label">Average Speed:</span>
                <span className="perf-value">{item.avgProcessingSpeed || '1.2x'}</span>
              </div>
              <div className="perf-item">
                <span className="perf-label">Peak Memory:</span>
                <span className="perf-value">{item.peakMemory || '2.1GB'}</span>
              </div>
              <div className="perf-item">
                <span className="perf-label">GPU Utilization:</span>
                <span className="perf-value">{item.gpuUtilization || '89%'}</span>
              </div>
              <div className="perf-item">
                <span className="perf-label">Efficiency:</span>
                <span className="perf-value">{item.efficiency || '94%'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Applied Effects */}
      {item.effects && item.effects.length > 0 && (
        <div className="applied-effects">
          <div className="effects-label">Effects:</div>
          <div className="effects-list">
            {item.effects.map((effect: any, idx: number) => (
              <span key={idx} className="effect-tag">
                {effect.name}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Actions */}
      <div className="item-actions">
        {item.status === ProcessingStatus.FAILED && (
          <button
            className="action-button retry"
            onClick={() => onRetry(item.id)}
            title="Retry processing"
          >
            🔄 Retry
          </button>
        )}
        
        {item.status === ProcessingStatus.COMPLETED && (
          <>
            {outputFileExists ? (
              <>
                <button
                  className="action-button open primary"
                  onClick={() => {
                    window.electronAPI?.openFile(item.outputPath);
                  }}
                  title="Open output file in default player"
                >
                  📂 Open
                </button>
                
                <button
                  className="action-button reveal"
                  onClick={() => {
                    window.electronAPI?.revealFile(item.outputPath);
                  }}
                  title="Show in file explorer"
                >
                  👁️ Show
                </button>
                
                <button
                  className="action-button preview"
                  onClick={() => {
                    console.log('Opening preview comparison for:', item.videoName);
                  }}
                  title="Preview before/after comparison"
                >
                  🎬 Preview
                </button>
                
                <button
                  className="action-button share"
                  onClick={() => {
                    navigator.clipboard.writeText(item.outputPath || '');
                  }}
                  title="Copy output path"
                >
                  🔗 Share
                </button>
              </>
            ) : (
              <div className="file-missing-warning">
                <span className="warning-icon">⚠️</span>
                <span className="warning-text">Output file not found</span>
                <button
                  className="action-button refresh"
                  onClick={async () => {
                    if (item.outputPath && window.electronAPI?.fileExists) {
                      const exists = await window.electronAPI.fileExists(item.outputPath);
                      setOutputFileExists(exists);
                    }
                  }}
                  title="Check if file exists now"
                >
                  🔄 Refresh
                </button>
              </div>
            )}
          </>
        )}
        
        <button
          className="action-button log"
          onClick={() => onViewLog(item.id)}
          title="View processing log"
        >
          📄 Log
        </button>
        
        <button
          className="action-button remove"
          onClick={() => onRemove(item.id)}
          title="Remove from queue"
        >
          🗑️ Remove
        </button>
      </div>
    </div>
  );
};

const ProcessingQueue: React.FC = () => {
  const dispatch = useDispatch();
  const { 
    queue, 
    isProcessing, 
    totalProgress, 
    currentItem,
    taskTrees,
    taskNodes,
    taskMessages,
    activeTaskTrees,
    hierarchicalView,
    taskFilters,
    selectedTaskTreeId,
    currentStages,
    stageProgress
  } = useSelector((state: RootState) => state.processing);
  const { selectedVideos, videos } = useSelector((state: RootState) => state.videos);
  const { processing: settings } = useSelector((state: RootState) => state.settings);
  
  const [showCompleted, setShowCompleted] = useState(true);
  const [showFailed, setShowFailed] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [logModalItem, setLogModalItem] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'queue' | 'tasks' | 'messages'>('queue');
  const [showTaskMessages, setShowTaskMessages] = useState(true);
  
  const queueRef = useRef<HTMLDivElement>(null);
  
  // Delete confirmation dialog
  const {
    isOpen: isDeleteDialogOpen,
    config: deleteConfig,
    showDeleteConfirmation,
    handleConfirm: handleDeleteConfirm,
    handleCancel: handleDeleteCancel,
  } = useDeleteConfirmation();
  const processingIntervalRef = useRef<number | null>(null);
  
  const filteredQueue = queue.filter(item => {
    if (!showCompleted && item.status === ProcessingStatus.COMPLETED) return false;
    if (!showFailed && item.status === ProcessingStatus.FAILED) return false;
    return true;
  });
  
  const queueStats = {
    total: queue.length,
    pending: queue.filter(item => item.status === ProcessingStatus.PENDING).length,
    processing: queue.filter(item => item.status === ProcessingStatus.PROCESSING).length,
    completed: queue.filter(item => item.status === ProcessingStatus.COMPLETED).length,
    failed: queue.filter(item => item.status === ProcessingStatus.FAILED).length,
    paused: queue.filter(item => item.status === ProcessingStatus.PAUSED).length
  };

  // Task Tree Statistics
  const taskTreeStats = {
    total: Object.keys(taskTrees).length,
    active: activeTaskTrees.length,
    completed: Object.values(taskTrees).filter(tree => tree.status === TaskStatus.COMPLETED).length,
    failed: Object.values(taskTrees).filter(tree => tree.status === TaskStatus.FAILED).length,
    totalTasks: Object.keys(taskNodes).length,
    activeTasks: Object.values(taskNodes).filter(node => node.status === TaskStatus.RUNNING).length
  };

  // Get stage icons and names
  const getStageIcon = (stage: ProcessingStage): string => {
    switch (stage) {
      case ProcessingStage.ANALYSIS: return '🔍';
      case ProcessingStage.PREPROCESSING: return '⚙️';
      case ProcessingStage.AI_ENHANCEMENT: return '🤖';
      case ProcessingStage.FRAME_PROCESSING: return '🎬';
      case ProcessingStage.AUDIO_PROCESSING: return '🔊';
      case ProcessingStage.ENCODING: return '📺';
      case ProcessingStage.POST_PROCESSING: return '✨';
      case ProcessingStage.VALIDATION: return '✔️';
      case ProcessingStage.CLEANUP: return '🧹';
      default: return '📄';
    }
  };

  const getStageName = (stage: ProcessingStage): string => {
    return stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Toggle view mode
  const handleViewModeToggle = () => {
    dispatch(setHierarchicalView(!hierarchicalView));
  };
  
  useEffect(() => {
    if (autoScroll && queueRef.current && isProcessing) {
      const currentProcessingItem = queueRef.current.querySelector('.queue-item.processing');
      if (currentProcessingItem) {
        currentProcessingItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentItem, autoScroll, isProcessing]);
  
  useEffect(() => {
    // Simulate processing updates
    if (isProcessing && processingIntervalRef.current === null) {
      processingIntervalRef.current = window.setInterval(() => {
        const processingItems = queue.filter(item => item.status === ProcessingStatus.PROCESSING);
        processingItems.forEach(item => {
          // Simulate progress update
          const newProgress = Math.min((item.progress || 0) + Math.random() * 5, 100);
          const estimatedTimeRemaining = newProgress < 100 
            ? Math.max(0, (100 - newProgress) * 2) 
            : 0;
          
          dispatch(updateQueueItem({
            id: item.id,
            updates: {
              progress: newProgress,
              estimatedTimeRemaining,
              currentStep: getRandomProcessingStep(),
              processingSpeed: (0.8 + Math.random() * 0.4).toFixed(1),
              framesProcessed: Math.floor((newProgress / 100) * (item.totalFrames || 1000))
            }
          }));
          
          // Complete processing when progress reaches 100%
          if (newProgress >= 100) {
            setTimeout(() => {
              const processingTime = 120 + Math.random() * 180;
              const outputSize = (item.inputSize || 0) * (0.7 + Math.random() * 0.6);
              
              dispatch(updateQueueItem({
                id: item.id,
                updates: {
                  status: ProcessingStatus.COMPLETED,
                  progress: 100,
                  processingTime,
                  outputSize,
                  outputPath: `${settings.outputPath}/${item.videoName}_enhanced.${settings.outputFormat}`,
                  completedAt: Date.now(),
                  qualityScore: 90 + Math.random() * 10,
                  enhancementFactor: '4x',
                  avgProcessingSpeed: (0.8 + Math.random() * 0.8).toFixed(1) + 'x',
                  peakMemory: (1.5 + Math.random() * 2).toFixed(1) + 'GB',
                  gpuUtilization: Math.round(75 + Math.random() * 20) + '%',
                  efficiency: Math.round(85 + Math.random() * 15) + '%',
                  framesProcessed: item.totalFrames || 1000,
                  currentStep: 'Processing completed successfully'
                }
              }));
              
              dispatch(addNotification({
                type: 'success',
                title: '🎉 Processing Complete!',
                message: `${item.videoName} has been enhanced successfully with 4x upscaling`,
                autoClose: true,
                duration: 8000,
              }));
            }, 1000);
          }
        });
      }, 1000);
    } else if (!isProcessing && processingIntervalRef.current) {
      window.clearInterval(processingIntervalRef.current);
      processingIntervalRef.current = null;
    }
    
    return () => {
      if (processingIntervalRef.current) {
        window.clearInterval(processingIntervalRef.current);
      }
    };
  }, [isProcessing, queue, dispatch, settings]);
  
  const getRandomProcessingStep = (): string => {
    const steps = [
      'Analyzing video...',
      'Extracting frames...',
      'Applying AI enhancement...',
      'Upscaling frames...',
      'Reducing noise...',
      'Enhancing faces...',
      'Interpolating frames...',
      'Encoding video...',
      'Finalizing output...'
    ];
    return steps[Math.floor(Math.random() * steps.length)];
  };
  
  const handleAddToQueue = () => {
    if (selectedVideos.length === 0) {
      dispatch(addNotification({
        type: 'warning',
        title: 'No Videos Selected',
        message: 'Please select videos to add to the processing queue',
        autoClose: true,
        duration: 3000,
      }));
      return;
    }
    
    selectedVideos.forEach(videoId => {
      const video = videos.find(v => v.id === videoId);
      if (video) {
        const queueItem = {
          id: `queue_${Date.now()}_${videoId}`,
          videoId: video.id,
          videoName: video.name,
          inputPath: video.path,
          inputSize: video.size,
          duration: video.duration,
          resolution: video.resolution,
          status: ProcessingStatus.PENDING,
          progress: 0,
          settings: { ...settings },
          effects: video.effects || [],
          addedAt: Date.now(),
          totalFrames: Math.floor(video.duration * 30) // Estimate frames at 30fps
        };
        
        dispatch(addToQueue(queueItem));
      }
    });
    
    dispatch(addNotification({
      type: 'success',
      title: 'Added to Queue',
      message: `${selectedVideos.length} video(s) added to processing queue`,
      autoClose: true,
      duration: 3000,
    }));
  };
  
  
  const handlePauseProcessing = () => {
    dispatch(pauseProcessing());
    
    // Pause all processing items
    queue.forEach(item => {
      if (item.status === ProcessingStatus.PROCESSING) {
        dispatch(updateQueueItem({
          id: item.id,
          updates: { status: ProcessingStatus.PAUSED }
        }));
      }
    });
    
    dispatch(addNotification({
      type: 'info',
      title: 'Processing Paused',
      message: 'Video processing has been paused',
      autoClose: true,
      duration: 3000,
    }));
  };
  
  const handleClearQueue = () => {
    if (isProcessing) {
      dispatch(addNotification({
        type: 'warning',
        title: 'Cannot Clear Queue',
        message: 'Cannot clear queue while processing is active',
        autoClose: true,
        duration: 3000,
      }));
      return;
    }
    
    if (queue.length === 0) return;
    
    showDeleteConfirmation(
      {
        title: 'Clear Queue',
        message: 'Are you sure you want to clear the entire processing queue?',
        itemCount: queue.length,
        destructive: true,
        confirmText: 'Clear Queue',
        cancelText: 'Keep',
      },
      () => {
        dispatch(clearQueue());
        dispatch(addNotification({
          type: 'info',
          title: 'Queue Cleared',
          message: 'Processing queue has been cleared',
          autoClose: true,
          duration: 3000,
        }));
      }
    );
  };
  
  const handleRemoveItem = (itemId: string) => {
    const item = queue.find(q => q.id === itemId);
    if (!item) return;
    
    if (item.status === ProcessingStatus.PROCESSING) {
      dispatch(addNotification({
        type: 'warning',
        title: 'Cannot Remove Item',
        message: 'Cannot remove item that is currently being processed',
        autoClose: true,
        duration: 3000,
      }));
      return;
    }
    
    showDeleteConfirmation(
      {
        title: 'Remove from Queue',
        message: 'Are you sure you want to remove this item from the processing queue?',
        itemName: item.videoName,
        destructive: false,
        confirmText: 'Remove',
        cancelText: 'Keep',
      },
      () => {
        dispatch(removeFromQueue(itemId));
        dispatch(addNotification({
          type: 'info',
          title: 'Item Removed',
          message: `"${item.videoName}" has been removed from the queue`,
          autoClose: true,
          duration: 3000,
        }));
      }
    );
  };
  
  const handleRetryItem = (itemId: string) => {
    dispatch(updateQueueItem({
      id: itemId,
      updates: {
        status: ProcessingStatus.PENDING,
        progress: 0,
        error: undefined,
        currentStep: undefined
      }
    }));
    
    dispatch(addNotification({
      type: 'info',
      title: 'Item Reset',
      message: 'Item has been reset and added back to queue',
      autoClose: true,
      duration: 3000,
    }));
  };
  
  const handleViewLog = (itemId: string) => {
    const item = queue.find(q => q.id === itemId);
    setLogModalItem(item);
  };
  
  const formatTime = (seconds: number): string => {
    if (!seconds || seconds < 0) return '--:--';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getTotalEstimatedTime = (): number => {
    return queue
      .filter(item => item.status === ProcessingStatus.PENDING || item.status === ProcessingStatus.PROCESSING)
      .reduce((total, item) => total + (item.estimatedTimeRemaining || item.duration || 120), 0);
  };
  
  return (
    <div className="processing-queue">
      {/* Queue Header */}
      <div className="queue-header">
        <div className="header-title">
          <span className="title-icon">⚙️</span>
          <span className="title-text">Processing Queue</span>
          <span className="queue-count">({queueStats.total})</span>
        </div>

        {/* View Mode Toggle */}
        <div className="view-mode-toggle">
          <button
            className={`view-mode-btn ${!hierarchicalView ? 'active' : ''}`}
            onClick={handleViewModeToggle}
            title="Simple Queue View"
          >
            📋 Queue
          </button>
          <button
            className={`view-mode-btn ${hierarchicalView ? 'active' : ''}`}
            onClick={handleViewModeToggle}
            title="Hierarchical Task View"
          >
            🌳 Tasks
          </button>
        </div>
        
        <div className="header-actions">
          <button
            className="queue-action-button add"
            onClick={handleAddToQueue}
            disabled={selectedVideos.length === 0}
            title="Add selected videos to queue"
          >
            ➕ Add to Queue
          </button>
          
          <StartProcessingButton />
          
          {isProcessing && (
            <button
              className="queue-action-button pause"
              onClick={handlePauseProcessing}
              title="Pause processing"
            >
              ⏸️ Pause
            </button>
          )}
          
          <button
            className="queue-action-button clear"
            onClick={handleClearQueue}
            disabled={isProcessing || queueStats.total === 0}
            title="Clear entire queue"
          >
            🗑️ Clear
          </button>
        </div>
      </div>
      
      {/* Queue Statistics */}
      <div className="queue-stats">
        <div className="stats-grid">
          {hierarchicalView ? (
            <>
              {/* Task Tree Stats */}
              <div className="stat-item trees">
                <div className="stat-icon">🌳</div>
                <div className="stat-content">
                  <div className="stat-value">{taskTreeStats.total}</div>
                  <div className="stat-label">Task Trees</div>
                </div>
              </div>
              
              <div className="stat-item active-trees">
                <div className="stat-icon">🔄</div>
                <div className="stat-content">
                  <div className="stat-value">{taskTreeStats.active}</div>
                  <div className="stat-label">Active</div>
                </div>
              </div>
              
              <div className="stat-item tasks">
                <div className="stat-icon">📋</div>
                <div className="stat-content">
                  <div className="stat-value">{taskTreeStats.totalTasks}</div>
                  <div className="stat-label">Total Tasks</div>
                </div>
              </div>
              
              <div className="stat-item running-tasks">
                <div className="stat-icon">⚡</div>
                <div className="stat-content">
                  <div className="stat-value">{taskTreeStats.activeTasks}</div>
                  <div className="stat-label">Running</div>
                </div>
              </div>
              
              <div className="stat-item messages">
                <div className="stat-icon">💬</div>
                <div className="stat-content">
                  <div className="stat-value">{taskMessages.length}</div>
                  <div className="stat-label">Messages</div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Traditional Queue Stats */}
              <div className="stat-item pending">
                <div className="stat-icon">⏳</div>
                <div className="stat-content">
                  <div className="stat-value">{queueStats.pending}</div>
                  <div className="stat-label">Pending</div>
                </div>
              </div>
              
              <div className="stat-item processing">
                <div className="stat-icon">⚙️</div>
                <div className="stat-content">
                  <div className="stat-value">{queueStats.processing}</div>
                  <div className="stat-label">Processing</div>
                </div>
              </div>
              
              <div className="stat-item completed">
                <div className="stat-icon">✅</div>
                <div className="stat-content">
                  <div className="stat-value">{queueStats.completed}</div>
                  <div className="stat-label">Completed</div>
                </div>
              </div>
              
              <div className="stat-item failed">
                <div className="stat-icon">❌</div>
                <div className="stat-content">
                  <div className="stat-value">{queueStats.failed}</div>
                  <div className="stat-label">Failed</div>
                </div>
              </div>
            </>
          )}
        </div>
        
        {isProcessing && (
          <div className="overall-progress">
            <div className="progress-header">
              <span>Overall Progress</span>
              <span className="eta">ETA: {formatTime(getTotalEstimatedTime())}</span>
            </div>
            <div className="progress-bar overall">
              <div 
                className="progress-fill"
                style={{ width: `${totalProgress}%` }}
              />
            </div>
            <div className="progress-text">
              {Math.round(totalProgress)}% Complete
            </div>
          </div>
        )}
      </div>
      
      {/* Queue Controls */}
      <div className="queue-controls">
        <div className="filter-controls">
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
            />
            <span>Show Completed</span>
          </label>
          
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={showFailed}
              onChange={(e) => setShowFailed(e.target.checked)}
            />
            <span>Show Failed</span>
          </label>
          
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            <span>Auto Scroll</span>
          </label>
        </div>
        
        <div className="queue-info">
          <span className="showing-count">
            Showing {filteredQueue.length} of {queueStats.total} items
          </span>
        </div>
      </div>
      
      {/* Main Content Area */}
      {hierarchicalView ? (
        <div className="hierarchical-view">
          {/* Tab Navigation */}
          <div className="tab-navigation">
            <button
              className={`tab-button ${activeTab === 'tasks' ? 'active' : ''}`}
              onClick={() => setActiveTab('tasks')}
            >
              🌳 Task Trees ({Object.keys(taskTrees).length})
            </button>
            <button
              className={`tab-button ${activeTab === 'messages' ? 'active' : ''}`}
              onClick={() => setActiveTab('messages')}
            >
              💬 Messages ({taskMessages.length})
            </button>
            <button
              className={`tab-button ${activeTab === 'queue' ? 'active' : ''}`}
              onClick={() => setActiveTab('queue')}
            >
              📋 Queue ({queueStats.total})
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'tasks' && (
              <div className="task-trees-view">
                {Object.keys(taskTrees).length === 0 ? (
                  <div className="empty-tasks">
                    <div className="empty-icon">🌳</div>
                    <div className="empty-title">No Active Task Trees</div>
                    <div className="empty-subtitle">
                      Start processing videos to see hierarchical task breakdown
                    </div>
                  </div>
                ) : (
                  <div className="task-trees-list">
                    {Object.keys(taskTrees).map(treeId => (
                      <TaskTree key={treeId} treeId={treeId} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'messages' && (
              <div className="messages-view">
                <TaskMessages 
                  maxHeight="500px"
                  showSearch={true}
                  showFilters={true}
                  autoScroll={true}
                />
              </div>
            )}

            {activeTab === 'queue' && (
              <div className="queue-view">
                {/* Traditional Queue View */}
                <div className="queue-list" ref={queueRef}>
                  {filteredQueue.length === 0 ? (
                    <div className="empty-queue">
                      <div className="empty-icon">📝</div>
                      <div className="empty-title">No Items in Queue</div>
                      <div className="empty-subtitle">
                        {queueStats.total === 0 
                          ? 'Add videos to the processing queue to get started'
                          : 'All items are hidden by current filters'
                        }
                      </div>
                      {selectedVideos.length > 0 && (
                        <button 
                          className="add-videos-button"
                          onClick={handleAddToQueue}
                        >
                          ➕ Add {selectedVideos.length} Selected Video{selectedVideos.length !== 1 ? 's' : ''}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="queue-items">
                      {filteredQueue.map((item, index) => (
                        <QueueItem
                          key={item.id}
                          item={item}
                          index={index}
                          onRemove={handleRemoveItem}
                          onRetry={handleRetryItem}
                          onViewLog={handleViewLog}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Current Stage Display */}
          {isProcessing && Object.keys(currentStages).length > 0 && (
            <div className="current-stages">
              <div className="stages-header">
                <span className="stages-title">🎯 Current Processing Stages</span>
              </div>
              <div className="stages-list">
                {Object.entries(currentStages).map(([jobId, stage]) => {
                  const job = queue.find(q => q.id === jobId);
                  const progress = stageProgress[jobId]?.[stage] || 0;
                  
                  return (
                    <div key={jobId} className="stage-item">
                      <div className="stage-header">
                        <span className="stage-icon">{getStageIcon(stage)}</span>
                        <span className="stage-name">{getStageName(stage)}</span>
                        <span className="stage-video">{job?.videoName || 'Unknown Video'}</span>
                      </div>
                      <div className="stage-progress">
                        <div className="progress-bar">
                          <div 
                            className="progress-fill"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="progress-text">{Math.round(progress)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Traditional Queue View */
        <div className="queue-list" ref={queueRef}>
          {filteredQueue.length === 0 ? (
            <div className="empty-queue">
              <div className="empty-icon">📝</div>
              <div className="empty-title">No Items in Queue</div>
              <div className="empty-subtitle">
                {queueStats.total === 0 
                  ? 'Add videos to the processing queue to get started'
                  : 'All items are hidden by current filters'
                }
              </div>
              {selectedVideos.length > 0 && (
                <button 
                  className="add-videos-button"
                  onClick={handleAddToQueue}
                >
                  ➕ Add {selectedVideos.length} Selected Video{selectedVideos.length !== 1 ? 's' : ''}
                </button>
              )}
            </div>
          ) : (
            <div className="queue-items">
              {filteredQueue.map((item, index) => (
                <QueueItem
                  key={item.id}
                  item={item}
                  index={index}
                  onRemove={handleRemoveItem}
                  onRetry={handleRetryItem}
                  onViewLog={handleViewLog}
                />
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Log Modal */}
      {logModalItem && (
        <div className="log-modal-overlay" onClick={() => setLogModalItem(null)}>
          <div className="log-modal" onClick={(e) => e.stopPropagation()}>
            <div className="log-modal-header">
              <h3>Processing Log - {logModalItem.videoName}</h3>
              <button 
                className="close-modal"
                onClick={() => setLogModalItem(null)}
              >
                ✕
              </button>
            </div>
            <div className="log-modal-content">
              <div className="log-text">
                {/* Simulated log content */}
                <div>[{new Date().toISOString()}] Starting video processing...</div>
                <div>[{new Date().toISOString()}] Input file: {logModalItem.inputPath}</div>
                <div>[{new Date().toISOString()}] Output format: {logModalItem.settings?.outputFormat}</div>
                <div>[{new Date().toISOString()}] Resolution: {logModalItem.resolution}</div>
                {logModalItem.effects && logModalItem.effects.length > 0 && (
                  <div>[{new Date().toISOString()}] Applied effects: {logModalItem.effects.map((e: any) => e.name).join(', ')}</div>
                )}
                <div>[{new Date().toISOString()}] FFmpeg command: ffmpeg -i input.mp4 -vcodec h264 -acodec aac output.mp4</div>
                {logModalItem.status === ProcessingStatus.COMPLETED && (
                  <div>[{new Date().toISOString()}] Processing completed successfully</div>
                )}
                {logModalItem.status === ProcessingStatus.FAILED && logModalItem.error && (
                  <div className="log-error">[{new Date().toISOString()}] ERROR: {logModalItem.error}</div>
                )}
              </div>
            </div>
            <div className="log-modal-actions">
              <button 
                className="copy-log-button"
                onClick={() => {
                  navigator.clipboard.writeText('Log content would be copied here');
                  dispatch(addNotification({
                    type: 'success',
                    title: 'Log Copied',
                    message: 'Processing log copied to clipboard',
                    autoClose: true,
                    duration: 2000,
                  }));
                }}
              >
                📋 Copy Log
              </button>
              <button 
                className="save-log-button"
                onClick={() => {
                  // Save log to file
                  dispatch(addNotification({
                    type: 'success',
                    title: 'Log Saved',
                    message: 'Processing log saved to file',
                    autoClose: true,
                    duration: 2000,
                  }));
                }}
              >
                💾 Save Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        title={deleteConfig?.title || ''}
        message={deleteConfig?.message || ''}
        itemName={deleteConfig?.itemName}
        itemCount={deleteConfig?.itemCount}
        destructive={deleteConfig?.destructive}
        confirmText={deleteConfig?.confirmText}
        cancelText={deleteConfig?.cancelText}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
};

export default ProcessingQueue;