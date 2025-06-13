import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { 
  clearTaskMessages, 
  updateTaskFilters,
  setSelectedTaskTree 
} from '../../store/slices/processingSlice';
import { TaskMessage, ProcessingStage } from '../../types/task.types';
import './TaskMessages.css';

interface TaskMessagesProps {
  className?: string;
  maxHeight?: string;
  showSearch?: boolean;
  showFilters?: boolean;
  autoScroll?: boolean;
}

const TaskMessages: React.FC<TaskMessagesProps> = ({
  className = '',
  maxHeight = '400px',
  showSearch = true,
  showFilters = true,
  autoScroll = true
}) => {
  const dispatch = useDispatch();
  const { 
    taskMessages, 
    taskTrees, 
    taskNodes, 
    taskFilters,
    selectedTaskTreeId 
  } = useSelector((state: RootState) => state.processing);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMessageTypes, setSelectedMessageTypes] = useState<Set<string>>(
    new Set(['info', 'warning', 'error', 'success'])
  );
  const [selectedTreeFilter, setSelectedTreeFilter] = useState<string>('all');
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [taskMessages.length, autoScroll]);

  // Filtered and sorted messages
  const filteredMessages = useMemo(() => {
    let filtered = taskMessages;

    // Filter by search term
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(message => 
        message.title.toLowerCase().includes(lowerSearchTerm) ||
        message.message.toLowerCase().includes(lowerSearchTerm) ||
        message.task_id.toLowerCase().includes(lowerSearchTerm)
      );
    }

    // Filter by message type
    filtered = filtered.filter(message => 
      selectedMessageTypes.has(message.type)
    );

    // Filter by task tree
    if (selectedTreeFilter !== 'all') {
      const tree = taskTrees[selectedTreeFilter];
      if (tree) {
        const treeTaskIds = Array.from(tree.nodes.keys());
        filtered = filtered.filter(message => 
          treeTaskIds.includes(message.task_id) || 
          (message.parent_task_id && treeTaskIds.includes(message.parent_task_id))
        );
      }
    }

    // Filter by stage if set
    if (taskFilters.stageFilter !== 'all') {
      filtered = filtered.filter(message => 
        message.stage === taskFilters.stageFilter
      );
    }

    // Sort by timestamp (newest first)
    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }, [taskMessages, searchTerm, selectedMessageTypes, selectedTreeFilter, taskTrees, taskFilters.stageFilter]);

  // Get message type icon
  const getMessageTypeIcon = (type: string): string => {
    switch (type) {
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'success': return '✅';
      case 'progress': return '⏳';
      case 'info': 
      default: return 'ℹ️';
    }
  };

  // Get message type color
  const getMessageTypeColor = (type: string): string => {
    switch (type) {
      case 'error': return 'var(--error)';
      case 'warning': return 'var(--warning)';
      case 'success': return 'var(--success)';
      case 'progress': return 'var(--primary)';
      case 'info':
      default: return 'var(--info)';
    }
  };

  // Get stage icon
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

  // Format timestamp
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - timestamp;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffSeconds < 60) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Get task name from task ID
  const getTaskName = (taskId: string): string => {
    const task = taskNodes[taskId];
    return task?.name || taskId.slice(-8);
  };

  // Handle message type filter toggle
  const toggleMessageType = (type: string) => {
    const newSelected = new Set(selectedMessageTypes);
    if (newSelected.has(type)) {
      newSelected.delete(type);
    } else {
      newSelected.add(type);
    }
    setSelectedMessageTypes(newSelected);
  };

  // Handle message click
  const handleMessageClick = (message: TaskMessage) => {
    setSelectedMessage(selectedMessage === message.id ? null : message.id);
    
    // If message has a parent task ID, find and select the tree
    if (message.parent_task_id) {
      for (const [treeId, tree] of Object.entries(taskTrees)) {
        if (tree.nodes.has(message.parent_task_id)) {
          dispatch(setSelectedTaskTree(treeId));
          break;
        }
      }
    }
  };

  // Export messages to clipboard
  const exportMessages = () => {
    const messagesText = filteredMessages.map(message => {
      const timestamp = new Date(message.timestamp).toISOString();
      const taskName = getTaskName(message.task_id);
      const stage = message.stage ? ` [${message.stage}]` : '';
      return `[${timestamp}] ${message.type.toUpperCase()}${stage} ${taskName}: ${message.title} - ${message.message}`;
    }).join('\n');

    navigator.clipboard.writeText(messagesText).then(() => {
      // Could dispatch a notification here
      console.log('Messages exported to clipboard');
    });
  };

  // Message stats
  const messageStats = useMemo(() => {
    const stats = {
      total: filteredMessages.length,
      error: 0,
      warning: 0,
      success: 0,
      info: 0,
      progress: 0
    };

    filteredMessages.forEach(message => {
      stats[message.type as keyof typeof stats]++;
    });

    return stats;
  }, [filteredMessages]);

  return (
    <div className={`task-messages ${className}`}>
      {/* Header */}
      <div className="messages-header">
        <div className="header-left">
          <button 
            className="expand-toggle"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '🔽' : '▶️'}
          </button>
          <div className="header-title">
            <span className="title-icon">📝</span>
            <span className="title-text">Task Messages</span>
            <span className="message-count">({messageStats.total})</span>
          </div>
        </div>

        <div className="header-actions">
          <button 
            className="header-action export"
            onClick={exportMessages}
            title="Export messages to clipboard"
          >
            📋 Export
          </button>
          <button 
            className="header-action clear"
            onClick={() => dispatch(clearTaskMessages())}
            title="Clear all messages"
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Stats Bar */}
          <div className="messages-stats">
            <div className="stat-item">
              <span className="stat-icon">📊</span>
              <span className="stat-label">Total:</span>
              <span className="stat-value">{messageStats.total}</span>
            </div>
            <div className="stat-item error">
              <span className="stat-icon">❌</span>
              <span className="stat-value">{messageStats.error}</span>
            </div>
            <div className="stat-item warning">
              <span className="stat-icon">⚠️</span>
              <span className="stat-value">{messageStats.warning}</span>
            </div>
            <div className="stat-item success">
              <span className="stat-icon">✅</span>
              <span className="stat-value">{messageStats.success}</span>
            </div>
            <div className="stat-item info">
              <span className="stat-icon">ℹ️</span>
              <span className="stat-value">{messageStats.info}</span>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="messages-filters">
              {/* Search */}
              {showSearch && (
                <div className="filter-group">
                  <input
                    type="text"
                    placeholder="Search messages..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
              )}

              {/* Message Type Filters */}
              <div className="filter-group">
                <span className="filter-label">Types:</span>
                <div className="type-filters">
                  {['info', 'warning', 'error', 'success', 'progress'].map(type => (
                    <button
                      key={type}
                      className={`type-filter ${selectedMessageTypes.has(type) ? 'active' : ''} ${type}`}
                      onClick={() => toggleMessageType(type)}
                    >
                      {getMessageTypeIcon(type)} {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tree Filter */}
              <div className="filter-group">
                <span className="filter-label">Tree:</span>
                <select
                  value={selectedTreeFilter}
                  onChange={(e) => setSelectedTreeFilter(e.target.value)}
                  className="tree-select"
                >
                  <option value="all">All Trees</option>
                  {Object.entries(taskTrees).map(([treeId, tree]) => (
                    <option key={treeId} value={treeId}>
                      {tree.name} ({treeId.slice(-8)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Stage Filter */}
              <div className="filter-group">
                <span className="filter-label">Stage:</span>
                <select
                  value={taskFilters.stageFilter}
                  onChange={(e) => dispatch(updateTaskFilters({ 
                    stageFilter: e.target.value as ProcessingStage | 'all' 
                  }))}
                  className="stage-select"
                >
                  <option value="all">All Stages</option>
                  {Object.values(ProcessingStage).map(stage => (
                    <option key={stage} value={stage}>
                      {getStageIcon(stage)} {stage}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Messages List */}
          <div 
            className="messages-list"
            style={{ maxHeight }}
            ref={messagesContainerRef}
          >
            {filteredMessages.length === 0 ? (
              <div className="no-messages">
                <div className="no-messages-icon">📭</div>
                <div className="no-messages-text">No messages match the current filters</div>
              </div>
            ) : (
              filteredMessages.map((message) => (
                <div 
                  key={message.id}
                  className={`message-item ${message.type} ${selectedMessage === message.id ? 'selected' : ''}`}
                  onClick={() => handleMessageClick(message)}
                >
                  <div className="message-header">
                    <div className="message-meta">
                      <span 
                        className="message-type-icon"
                        style={{ color: getMessageTypeColor(message.type) }}
                      >
                        {getMessageTypeIcon(message.type)}
                      </span>
                      
                      {message.stage && (
                        <span className="message-stage-icon">
                          {getStageIcon(message.stage)}
                        </span>
                      )}
                      
                      <span className="message-task">
                        {getTaskName(message.task_id)}
                      </span>
                      
                      {message.parent_task_id && (
                        <span className="message-parent">
                          → {getTaskName(message.parent_task_id)}
                        </span>
                      )}
                    </div>

                    <div className="message-time">
                      {formatTimestamp(message.timestamp)}
                    </div>
                  </div>

                  <div className="message-content">
                    <div className="message-title">{message.title}</div>
                    <div className="message-text">{message.message}</div>
                  </div>

                  {/* Expanded Details */}
                  {selectedMessage === message.id && (
                    <div className="message-details">
                      <div className="details-grid">
                        <div className="detail-item">
                          <span className="detail-label">Message ID:</span>
                          <span className="detail-value">{message.id}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Task ID:</span>
                          <span className="detail-value">{message.task_id}</span>
                        </div>
                        {message.parent_task_id && (
                          <div className="detail-item">
                            <span className="detail-label">Parent Task:</span>
                            <span className="detail-value">{message.parent_task_id}</span>
                          </div>
                        )}
                        <div className="detail-item">
                          <span className="detail-label">Timestamp:</span>
                          <span className="detail-value">
                            {new Date(message.timestamp).toLocaleString()}
                          </span>
                        </div>
                        {message.stage && (
                          <div className="detail-item">
                            <span className="detail-label">Stage:</span>
                            <span className="detail-value">{message.stage}</span>
                          </div>
                        )}
                        {message.progress !== undefined && (
                          <div className="detail-item">
                            <span className="detail-label">Progress:</span>
                            <span className="detail-value">{message.progress}%</span>
                          </div>
                        )}
                      </div>

                      {message.data && (
                        <div className="message-data">
                          <div className="data-label">Additional Data:</div>
                          <pre className="data-content">
                            {JSON.stringify(message.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </>
      )}
    </div>
  );
};

export default TaskMessages;