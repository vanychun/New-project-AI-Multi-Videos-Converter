import React, { useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { 
  toggleTaskExpansion, 
  setSelectedTaskTree,
  updateTaskFilters,
  pauseTaskTree,
  resumeTaskTree,
  cancelTaskTree
} from '../../store/slices/processingSlice';
import { 
  TaskTree as TaskTreeType, 
  TaskNode, 
  TaskStatus, 
  TaskType, 
  ProcessingStage 
} from '../../types/task.types';
import './TaskTree.css';

interface TaskTreeProps {
  treeId: string;
  className?: string;
}

const TaskTree: React.FC<TaskTreeProps> = ({ treeId, className = '' }) => {
  const dispatch = useDispatch();
  const { 
    taskTrees, 
    taskNodes, 
    expandedTasks, 
    selectedTaskTreeId, 
    taskFilters 
  } = useSelector((state: RootState) => state.processing);

  const tree = taskTrees[treeId];
  const [showMessages, setShowMessages] = useState(false);

  const filteredNodes = useMemo(() => {
    if (!tree) return [];

    const nodes = Object.values(tree.nodes);
    return nodes.filter(node => {
      if (!taskFilters.showCompleted && node.status === TaskStatus.COMPLETED) return false;
      if (!taskFilters.showFailed && node.status === TaskStatus.FAILED) return false;
      if (taskFilters.stageFilter !== 'all' && node.stage !== taskFilters.stageFilter) return false;
      return true;
    });
  }, [tree, taskFilters]);

  const getStatusIcon = (status: TaskStatus): string => {
    switch (status) {
      case TaskStatus.PENDING: return '⏳';
      case TaskStatus.RUNNING: return '⚙️';
      case TaskStatus.COMPLETED: return '✅';
      case TaskStatus.FAILED: return '❌';
      case TaskStatus.PAUSED: return '⏸️';
      case TaskStatus.CANCELLED: return '🚫';
      default: return '❓';
    }
  };

  const getStatusColor = (status: TaskStatus): string => {
    switch (status) {
      case TaskStatus.PENDING: return '#6b7280';
      case TaskStatus.RUNNING: return '#f59e0b';
      case TaskStatus.COMPLETED: return '#10b981';
      case TaskStatus.FAILED: return '#ef4444';
      case TaskStatus.PAUSED: return '#8b5cf6';
      case TaskStatus.CANCELLED: return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getTypeIcon = (type: TaskType): string => {
    switch (type) {
      case TaskType.PARENT: return '🗂️';
      case TaskType.SUB_TASK: return '📋';
      case TaskType.MICRO_TASK: return '⚡';
      default: return '📄';
    }
  };

  const getStageIcon = (stage?: ProcessingStage): string => {
    if (!stage) return '📄';
    
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

  const formatDuration = (ms?: number): string => {
    if (!ms) return '--:--';
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatProgress = (progress: number): string => {
    return `${Math.round(progress)}%`;
  };

  const handleTaskClick = (nodeId: string) => {
    dispatch(toggleTaskExpansion(nodeId));
  };

  const handleTreeSelect = () => {
    dispatch(setSelectedTaskTree(selectedTaskTreeId === treeId ? null : treeId));
  };

  const handlePauseTree = () => {
    dispatch(pauseTaskTree(treeId));
  };

  const handleResumeTree = () => {
    dispatch(resumeTaskTree(treeId));
  };

  const handleCancelTree = () => {
    dispatch(cancelTaskTree(treeId));
  };

  const renderTaskNode = (node: TaskNode, level: number = 0): React.ReactNode => {
    const isExpanded = expandedTasks.includes(node.id);
    const hasSubTasks = node.sub_tasks.length > 0;
    const isSelected = selectedTaskTreeId === treeId;

    return (
      <div key={node.id} className={`task-node level-${level}`}>
        {/* Task Header */}
        <div 
          className={`task-header ${isSelected ? 'selected' : ''}`}
          onClick={() => handleTaskClick(node.id)}
        >
          <div className="task-info">
            <div className="task-icons">
              {hasSubTasks && (
                <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
                  {isExpanded ? '🔽' : '▶️'}
                </span>
              )}
              <span className="type-icon" title={`Type: ${node.type}`}>
                {getTypeIcon(node.type)}
              </span>
              <span className="stage-icon" title={`Stage: ${node.stage || 'N/A'}`}>
                {getStageIcon(node.stage)}
              </span>
            </div>
            
            <div className="task-details">
              <div className="task-name">{node.name}</div>
              {node.description && (
                <div className="task-description">{node.description}</div>
              )}
            </div>
          </div>

          <div className="task-status-section">
            <div className="task-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ 
                    width: `${node.progress}%`,
                    backgroundColor: getStatusColor(node.status)
                  }}
                />
              </div>
              <span className="progress-text">{formatProgress(node.progress)}</span>
            </div>
            
            <div className="task-status">
              <span 
                className="status-icon"
                style={{ color: getStatusColor(node.status) }}
                title={`Status: ${node.status}`}
              >
                {getStatusIcon(node.status)}
              </span>
              <span className="status-text">{node.status}</span>
            </div>
          </div>

          <div className="task-metrics">
            {node.estimated_duration && (
              <div className="metric">
                <span className="metric-label">Est:</span>
                <span className="metric-value">{formatDuration(node.estimated_duration * 1000)}</span>
              </div>
            )}
            
            {node.metrics.duration && (
              <div className="metric">
                <span className="metric-label">Actual:</span>
                <span className="metric-value">{formatDuration(node.metrics.duration)}</span>
              </div>
            )}
            
            {node.remaining_time && (
              <div className="metric">
                <span className="metric-label">Remaining:</span>
                <span className="metric-value">{formatDuration(node.remaining_time * 1000)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Task Messages */}
        {isExpanded && node.messages.length > 0 && (
          <div className="task-messages">
            <div className="messages-header">
              <span className="messages-title">📝 Messages ({node.messages.length})</span>
              <button 
                className="toggle-messages"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMessages(!showMessages);
                }}
              >
                {showMessages ? '▼' : '▶'}
              </button>
            </div>
            
            {showMessages && (
              <div className="messages-list">
                {node.messages.slice(-5).map(message => (
                  <div key={message.id} className={`message ${message.type}`}>
                    <div className="message-header">
                      <span className="message-type-icon">
                        {message.type === 'error' ? '❌' : 
                         message.type === 'warning' ? '⚠️' :
                         message.type === 'success' ? '✅' : 'ℹ️'}
                      </span>
                      <span className="message-title">{message.title}</span>
                      <span className="message-time">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="message-content">{message.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error Details */}
        {isExpanded && node.error && (
          <div className="task-error">
            <div className="error-header">
              <span className="error-icon">⚠️</span>
              <span className="error-title">Error Details</span>
            </div>
            <div className="error-content">{node.error}</div>
            {node.retry_count > 0 && (
              <div className="retry-info">
                Retry attempts: {node.retry_count} / {node.max_retries}
              </div>
            )}
          </div>
        )}

        {/* Sub-tasks */}
        {isExpanded && hasSubTasks && (
          <div className="sub-tasks">
            {node.sub_tasks.map(subTaskId => {
              const subTask = tree?.nodes[subTaskId];
              return subTask ? renderTaskNode(subTask, level + 1) : null;
            })}
          </div>
        )}
      </div>
    );
  };

  if (!tree) {
    return (
      <div className={`task-tree error ${className}`}>
        <div className="error-message">Task tree not found</div>
      </div>
    );
  }

  const rootTask = tree.nodes[tree.root_task_id];

  return (
    <div className={`task-tree ${className}`}>
      {/* Tree Header */}
      <div className="tree-header">
        <div className="tree-info">
          <div className="tree-title" onClick={handleTreeSelect}>
            <span className="tree-icon">🌳</span>
            <span className="tree-name">{tree.name}</span>
            <span className="tree-id">({tree.id.slice(-8)})</span>
          </div>
          
          {tree.description && (
            <div className="tree-description">{tree.description}</div>
          )}
        </div>

        <div className="tree-stats">
          <div className="stat">
            <span className="stat-label">Progress:</span>
            <span className="stat-value">{formatProgress(tree.progress)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Nodes:</span>
            <span className="stat-value">{tree.total_nodes}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Active:</span>
            <span className="stat-value">{tree.active_nodes.length}</span>
          </div>
        </div>

        <div className="tree-actions">
          {tree.status === TaskStatus.RUNNING && (
            <button className="tree-action pause" onClick={handlePauseTree}>
              ⏸️ Pause
            </button>
          )}
          
          {tree.status === TaskStatus.PAUSED && (
            <button className="tree-action resume" onClick={handleResumeTree}>
              ▶️ Resume
            </button>
          )}
          
          {(tree.status === TaskStatus.RUNNING || tree.status === TaskStatus.PAUSED) && (
            <button className="tree-action cancel" onClick={handleCancelTree}>
              🚫 Cancel
            </button>
          )}
        </div>
      </div>

      {/* Tree Progress Bar */}
      <div className="tree-progress">
        <div className="progress-bar large">
          <div 
            className="progress-fill"
            style={{ 
              width: `${tree.progress}%`,
              backgroundColor: getStatusColor(tree.status)
            }}
          />
        </div>
        <div className="progress-details">
          <span>{formatProgress(tree.progress)} Complete</span>
          {tree.estimated_duration && (
            <span>ETA: {formatDuration(tree.estimated_duration * 1000)}</span>
          )}
        </div>
      </div>

      {/* Critical Path */}
      {tree.critical_path.length > 0 && (
        <div className="critical-path">
          <div className="critical-path-header">
            <span className="critical-path-icon">🔥</span>
            <span className="critical-path-title">Critical Path</span>
          </div>
          <div className="critical-path-nodes">
            {tree.critical_path.map((nodeId, index) => {
              const node = tree.nodes[nodeId];
              return node ? (
                <span key={nodeId} className="critical-node">
                  {node.name}
                  {index < tree.critical_path.length - 1 && ' → '}
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Task Nodes */}
      <div className="tree-nodes">
        {rootTask && renderTaskNode(rootTask)}
      </div>

      {/* Enhanced Completion Details for Completed Trees */}
      {tree.status === TaskStatus.COMPLETED && (
        <div className="completion-breakdown">
          <div className="completion-header">
            <span className="completion-icon">🎉</span>
            <span className="completion-title">Task Tree Completed Successfully!</span>
            <span className="completion-time">
              {tree.completed_at && new Date(tree.completed_at).toLocaleTimeString()}
            </span>
          </div>
          
          <div className="completion-summary">
            <div className="summary-grid">
              <div className="summary-item">
                <div className="summary-icon">📊</div>
                <div className="summary-content">
                  <div className="summary-label">Total Tasks</div>
                  <div className="summary-value">{tree.total_nodes}</div>
                </div>
              </div>
              
              <div className="summary-item">
                <div className="summary-icon">⏱️</div>
                <div className="summary-content">
                  <div className="summary-label">Total Time</div>
                  <div className="summary-value">
                    {tree.started_at && tree.completed_at ? 
                      formatDuration(new Date(tree.completed_at).getTime() - new Date(tree.started_at).getTime()) : 
                      '--:--'
                    }
                  </div>
                </div>
              </div>
              
              <div className="summary-item">
                <div className="summary-icon">✅</div>
                <div className="summary-content">
                  <div className="summary-label">Success Rate</div>
                  <div className="summary-value">
                    {Math.round((filteredNodes.filter(n => n.status === TaskStatus.COMPLETED).length / tree.total_nodes) * 100)}%
                  </div>
                </div>
              </div>
              
              <div className="summary-item">
                <div className="summary-icon">🚀</div>
                <div className="summary-content">
                  <div className="summary-label">Efficiency</div>
                  <div className="summary-value">
                    {tree.estimated_duration && tree.started_at && tree.completed_at ? 
                      Math.round((tree.estimated_duration * 1000) / 
                        (new Date(tree.completed_at).getTime() - new Date(tree.started_at).getTime()) * 100) + '%' : 
                      'N/A'
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Stage Breakdown */}
          <div className="stage-breakdown">
            <div className="breakdown-header">
              <span className="breakdown-icon">📋</span>
              <span className="breakdown-title">Processing Stages Completed</span>
            </div>
            <div className="breakdown-stages">
              {Object.values(ProcessingStage).map(stage => {
                const stageNodes = filteredNodes.filter(n => n.stage === stage && n.status === TaskStatus.COMPLETED);
                if (stageNodes.length === 0) return null;
                
                return (
                  <div key={stage} className="stage-completed">
                    <span className="stage-icon">{getStageIcon(stage)}</span>
                    <span className="stage-name">{stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                    <span className="stage-count">({stageNodes.length} tasks)</span>
                    <div className="stage-progress-bar">
                      <div className="stage-progress-fill" style={{ width: '100%', backgroundColor: '#10b981' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Performance Metrics */}
          <div className="performance-breakdown">
            <div className="performance-header">
              <span className="performance-icon">⚡</span>
              <span className="performance-title">Performance Summary</span>
            </div>
            <div className="performance-metrics">
              <div className="perf-metric">
                <span className="perf-label">Average Task Duration:</span>
                <span className="perf-value">
                  {formatDuration(
                    filteredNodes.reduce((sum, n) => sum + (n.metrics.duration || 0), 0) / 
                    Math.max(1, filteredNodes.filter(n => n.metrics.duration).length)
                  )}
                </span>
              </div>
              <div className="perf-metric">
                <span className="perf-label">Longest Task:</span>
                <span className="perf-value">
                  {formatDuration(
                    Math.max(...filteredNodes.map(n => n.metrics.duration || 0))
                  )}
                </span>
              </div>
              <div className="perf-metric">
                <span className="perf-label">Retry Attempts:</span>
                <span className="perf-value">
                  {filteredNodes.reduce((sum, n) => sum + n.retry_count, 0)}
                </span>
              </div>
              <div className="perf-metric">
                <span className="perf-label">Critical Path Efficiency:</span>
                <span className="perf-value">
                  {tree.critical_path.length > 0 ? 
                    Math.round((tree.critical_path.filter(id => tree.nodes[id]?.status === TaskStatus.COMPLETED).length / tree.critical_path.length) * 100) + '%' : 
                    'N/A'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Tree Footer */}
      <div className="tree-footer">
        <div className="footer-stats">
          <span className="footer-stat">
            <span className="stat-icon">⏳</span>
            Pending: {filteredNodes.filter(n => n.status === TaskStatus.PENDING).length}
          </span>
          <span className="footer-stat">
            <span className="stat-icon">⚙️</span>
            Running: {filteredNodes.filter(n => n.status === TaskStatus.RUNNING).length}
          </span>
          <span className="footer-stat">
            <span className="stat-icon">✅</span>
            Completed: {filteredNodes.filter(n => n.status === TaskStatus.COMPLETED).length}
          </span>
          <span className="footer-stat">
            <span className="stat-icon">❌</span>
            Failed: {filteredNodes.filter(n => n.status === TaskStatus.FAILED).length}
          </span>
        </div>
        
        <div className="footer-time">
          {tree.created_at && (
            <span>Created: {new Date(tree.created_at).toLocaleString()}</span>
          )}
          {tree.started_at && (
            <span>Started: {new Date(tree.started_at).toLocaleString()}</span>
          )}
          {tree.completed_at && (
            <span>Completed: {new Date(tree.completed_at).toLocaleString()}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskTree;