import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Video, VideoStatus } from '../../types/video.types';
import { removeVideo, selectVideo, deselectVideo } from '../../store/slices/videoSlice';
import { addNotification } from '../../store/slices/uiSlice';
import ContextMenu, { ContextMenuItem } from '../common/ContextMenu';
import { useContextMenu } from '../../hooks/useContextMenu';
import LoadingSpinner from '../common/LoadingSpinner';
import ConfirmationDialog from '../common/ConfirmationDialog';
import { useLoadingState } from '../../hooks/useLoadingState';
import { useQuickConfirmation } from '../../hooks/useConfirmation';

interface VideoCardProps {
  video: Video;
  isSelected: boolean;
  onSelect: (videoId: string, isSelected: boolean) => void;
  onRemove?: (videoId: string) => void;
  onEdit?: (videoId: string) => void;
  onPreview?: (video: Video) => void;
  viewMode?: 'grid' | 'list' | 'tiles';
  thumbnailSize?: number;
  showThumbnails?: boolean;
  onProcessingComplete?: (videoId: string) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  isSelected,
  onSelect,
  onRemove,
  onEdit,
  onPreview,
  viewMode = 'grid',
  thumbnailSize = 200,
  onProcessingComplete
}) => {
  const dispatch = useDispatch();
  const [isHovered, setIsHovered] = useState(false);
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();
  const [previewLoading, previewOps] = useLoadingState('Loading preview...');
  const [exportLoading, exportOps] = useLoadingState('Starting export...');
  const confirmation = useQuickConfirmation();
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  const getStatusIcon = (status: VideoStatus) => {
    switch (status) {
      case 'ready': return '⚪';
      case 'processing': return '🟡';
      case 'completed': return '🟢';
      case 'error': return '🔴';
      default: return '⚪';
    }
  };

  const getStatusColor = (status: VideoStatus) => {
    switch (status) {
      case 'ready': return 'var(--text-muted)';
      case 'processing': return 'var(--warning)';
      case 'completed': return 'var(--success)';
      case 'error': return 'var(--error)';
      default: return 'var(--text-muted)';
    }
  };

  const getQualityBadge = () => {
    const width = video.metadata.width;
    if (width >= 3840) return '8K';
    if (width >= 2560) return '4K';
    if (width >= 1920) return 'HD';
    if (width >= 1280) return 'HD';
    return 'SD';
  };

  const handlePreview = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPreview && !previewLoading.isLoading) {
      try {
        previewOps.start('Loading preview...');
        // Simulate async preview loading
        await new Promise(resolve => setTimeout(resolve, 800));
        onPreview(video);
        previewOps.complete('Preview loaded');
      } catch (error) {
        previewOps.error('Failed to load preview');
      }
    }
  };

  const handleRemoveVideo = async () => {
    try {
      await confirmation.confirmDelete(
        video.name,
        async () => {
          dispatch(removeVideo(video.id));
          dispatch(addNotification({
            type: 'success',
            title: 'Video Removed',
            message: `${video.name} has been removed from the library`,
            autoClose: true,
            duration: 3000,
          }));
        }
      );
    } catch (error) {
      // User cancelled
    }
  };

  const handleToggleSelection = () => {
    if (isSelected) {
      dispatch(deselectVideo(video.id));
    } else {
      dispatch(selectVideo(video.id));
    }
  };

  const getContextMenuItems = (): ContextMenuItem[] => [
    {
      id: 'preview',
      label: 'Preview Video',
      icon: '👁️',
      action: () => onPreview?.(video)
    },
    {
      id: 'select',
      label: isSelected ? 'Deselect' : 'Select',
      icon: isSelected ? '❌' : '✅',
      action: handleToggleSelection
    },
    {
      id: 'separator1',
      label: '',
      separator: true,
      action: () => {}
    },
    {
      id: 'edit',
      label: 'Edit Video',
      icon: '✏️',
      action: () => onEdit?.(video.id)
    },
    {
      id: 'export',
      label: 'Export Video',
      icon: '📤',
      action: async () => {
        try {
          exportOps.start('Preparing export...');
          // Simulate export preparation
          await new Promise(resolve => setTimeout(resolve, 1000));
          exportOps.complete('Export queued');
          dispatch(addNotification({
            type: 'success',
            title: 'Export Started',
            message: `${video.name} has been queued for export`,
            autoClose: true,
            duration: 3000,
          }));
        } catch (error) {
          exportOps.error('Failed to start export');
        }
      }
    },
    {
      id: 'separator2',
      label: '',
      separator: true,
      action: () => {}
    },
    {
      id: 'details',
      label: 'Video Details',
      icon: 'ℹ️',
      action: () => {
        dispatch(addNotification({
          type: 'info',
          title: 'Video Details',
          message: `${video.name} - ${video.resolution} - ${formatFileSize(video.size)}`,
          autoClose: true,
          duration: 4000,
        }));
      }
    },
    {
      id: 'remove',
      label: 'Remove from Library',
      icon: '🗑️',
      action: handleRemoveVideo,
      destructive: true
    }
  ];

  const handleContextMenu = (e: React.MouseEvent) => {
    showContextMenu(e, getContextMenuItems());
  };

  if (viewMode === 'list') {
    return (
      <div 
        className={`video-card-list ${isSelected ? 'selected' : ''}`}
        onClick={() => onSelect(video.id, !isSelected)}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="selection-checkbox">
          <div className={`checkbox ${isSelected ? 'checked' : ''}`}>
            {isSelected && <span className="checkmark">✓</span>}
          </div>
        </div>
        
        <div className="video-thumbnail-small">
          {video.thumbnail ? (
            <img src={video.thumbnail} alt={video.name} />
          ) : (
            <div className="thumbnail-placeholder-small">📹</div>
          )}
        </div>
        
        <div className="video-details-list">
          <div className="video-name">{video.name}</div>
          <div className="video-metadata-list">
            <span className="duration">{formatDuration(video.duration)}</span>
            <span className="resolution">{video.resolution}</span>
            <span className="size">{formatFileSize(video.size)}</span>
            <span className="format">{video.format.toUpperCase()}</span>
          </div>
        </div>
        
        <div className="status-indicator-list">
          <span style={{ color: getStatusColor(video.status) }}>
            {getStatusIcon(video.status)}
          </span>
        </div>
        
        {isHovered && (
          <div className="video-actions-list">
            <button onClick={handlePreview} title="Preview">👁️</button>
            <button onClick={(e) => { e.stopPropagation(); onEdit(video.id); }} title="Edit">✏️</button>
            <button onClick={(e) => { e.stopPropagation(); onRemove(video.id); }} title="Remove">🗑️</button>
          </div>
        )}

        {/* Context Menu */}
        <ContextMenu
          items={contextMenu.items}
          position={contextMenu.position}
          onClose={hideContextMenu}
          visible={contextMenu.visible}
        />
      </div>
    );
  }

  return (
    <div 
      className={`video-card-modern ${isSelected ? 'selected' : ''} ${viewMode}`}
      onClick={() => onSelect(video.id, !isSelected)}
      onContextMenu={handleContextMenu}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ width: thumbnailSize }}
    >
      {/* Selection Checkbox */}
      <div className="selection-checkbox">
        <div className={`checkbox ${isSelected ? 'checked' : ''}`}>
          {isSelected && <span className="checkmark">✓</span>}
        </div>
      </div>

      {/* Status Indicator */}
      <div className={`status-indicator ${video.status}`}>
        <div className="status-dot"></div>
      </div>
      
      {/* Thumbnail */}
      <div className="video-thumbnail">
        {video.thumbnail ? (
          <img 
            src={video.thumbnail} 
            alt={video.name}
            className="thumbnail-image"
          />
        ) : (
          <div className="thumbnail-placeholder">
            <span className="placeholder-icon">📹</span>
          </div>
        )}
        
        {/* Duration overlay */}
        <div className="duration-overlay">
          {formatDuration(video.duration)}
        </div>
        
        {/* Quality badge */}
        <div className="quality-badge">
          {getQualityBadge()}
        </div>
        
        {/* Status overlay */}
        <div className="status-overlay" style={{ color: getStatusColor(video.status) }}>
          {getStatusIcon(video.status)}
        </div>
        
        {/* Progress bar if processing */}
        {video.processProgress !== undefined && video.status === 'processing' && (
          <div className="processing-progress">
            <div 
              className="progress-fill"
              style={{ width: `${video.processProgress}%` }}
            />
          </div>
        )}

        {/* Play overlay on hover */}
        {isHovered && (
          <div className="play-overlay" onClick={handlePreview}>
            {previewLoading.isLoading ? (
              <LoadingSpinner size="small" color="#ffffff" />
            ) : (
              <div className="play-button">▶️</div>
            )}
          </div>
        )}
        
        {/* Effects indicator */}
        {video.effects && video.effects.length > 0 && (
          <div className="effects-indicator">
            <span className="effects-count">{video.effects.length}</span>
            <span className="effects-icon">✨</span>
          </div>
        )}
        
        {/* Export indicator */}
        <div className={`export-indicator ${video.path && !video.path.startsWith('blob:') ? 'can-export' : 'cannot-export'}`}
             title={video.path && !video.path.startsWith('blob:') ? 'Can be exported' : 'Re-import needed for export'}>
          {video.path && !video.path.startsWith('blob:') ? '✓' : '⚠'}
        </div>
      </div>
      
      {/* Video Info */}
      <div className="video-info">
        <h4 className="video-title">
          {video.name}
        </h4>
        
        {/* Primary Metadata */}
        <div className="metadata-primary">
          <span className="resolution">{video.resolution}</span>
          <span className="file-size">{formatFileSize(video.size)}</span>
        </div>
        
        {/* Secondary Metadata */}
        <div className="metadata-secondary">
          <span className="format">{video.format.toUpperCase()}</span>
          <span className="fps">{video.fps} fps</span>
          {video.metadata.hasAudio && <span className="audio-indicator">🔊</span>}
        </div>
        
        {/* Processing status */}
        {video.status === 'processing' && video.processProgress !== undefined && (
          <div className="processing-status">
            <div className="processing-text">Processing... {video.processProgress}%</div>
          </div>
        )}
        
        {/* Loading states overlay */}
        {(previewLoading.isLoading || exportLoading.isLoading) && (
          <div className="loading-overlay">
            <LoadingSpinner 
              size="small" 
              color="#7461ef" 
              message={previewLoading.isLoading ? previewLoading.message : exportLoading.message}
            />
          </div>
        )}
      </div>
      
      {/* Action buttons - show on hover */}
      {isHovered && (
        <div className="video-actions">
          <button 
            className="action-btn preview"
            onClick={handlePreview}
            title="Preview video"
          >
            👁️
          </button>
          <button 
            className="action-btn edit"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(video.id);
            }}
            title="Edit video"
          >
            ✏️
          </button>
          <button 
            className="action-btn remove"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(video.id);
            }}
            title="Remove video"
          >
            🗑️
          </button>
        </div>
      )}

      {/* Context Menu */}
      <ContextMenu
        items={contextMenu.items}
        position={contextMenu.position}
        onClose={hideContextMenu}
        visible={contextMenu.visible}
      />
      
      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmation.isOpen}
        title={confirmation.config?.title || ''}
        message={confirmation.config?.message || ''}
        confirmText={confirmation.config?.confirmText}
        cancelText={confirmation.config?.cancelText}
        confirmVariant={confirmation.config?.confirmVariant}
        onConfirm={confirmation.onConfirm || (() => {})}
        onCancel={confirmation.cancel}
        loading={confirmation.loading}
        icon={confirmation.config?.icon}
        details={confirmation.config?.details}
        showCheckbox={confirmation.config?.showCheckbox}
        checkboxLabel={confirmation.config?.checkboxLabel}
        checkboxChecked={confirmation.checkboxChecked}
        onCheckboxChange={confirmation.setCheckboxChecked}
      />
    </div>
  );
};

export default VideoCard;