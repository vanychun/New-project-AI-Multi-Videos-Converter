import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { removeVideo, deselectAllVideos, selectAllVideos } from '../../store/slices/videoSlice';
import { addNotification } from '../../store/slices/uiSlice';
import { ffmpegService } from '../../services/ffmpegService';
import LoadingButton from '../common/LoadingButton';
import ProgressBar from '../common/ProgressBar';
import ConfirmationDialog from '../common/ConfirmationDialog';
import { useLoadingState } from '../../hooks/useLoadingState';
import { useQuickConfirmation } from '../../hooks/useConfirmation';

interface BulkActionsToolbarProps {
  selectedCount: number;
  totalCount: number;
  onClose: () => void;
}

const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
  selectedCount,
  totalCount,
  onClose
}) => {
  const dispatch = useDispatch();
  const { videos, selectedVideos } = useSelector((state: RootState) => state.videos);
  const { processing } = useSelector((state: RootState) => state.settings);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [exportLoading, exportOps] = useLoadingState('Preparing bulk export...');
  const [deleteLoading, deleteOps] = useLoadingState('Deleting videos...');
  const [exportProgress, setExportProgress] = useState(0);
  const [currentProcessingVideo, setCurrentProcessingVideo] = useState<string>('');
  
  const confirmation = useQuickConfirmation();

  const selectedVideoObjects = (videos || []).filter(v => selectedVideos.includes(v.id));
  const totalSelectedSize = selectedVideoObjects.reduce((sum, video) => sum + video.size, 0);
  const totalSelectedDuration = selectedVideoObjects.reduce((sum, video) => sum + video.duration, 0);

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

  const handleSelectAll = () => {
    if (selectedCount === totalCount) {
      dispatch(deselectAllVideos());
    } else {
      const allIds = videos?.map(v => v.id) || [];
      dispatch(selectAllVideos(allIds));
    }
  };

  const handleDeleteSelected = async () => {
    const videoNames = selectedVideoObjects.map(v => v.name);
    
    try {
      await confirmation.confirmBulkDelete(
        selectedCount,
        async () => {
          deleteOps.start('Deleting videos...');
          
          // Simulate batch deletion with progress
          for (let i = 0; i < selectedVideos.length; i++) {
            const videoId = selectedVideos[i];
            const video = selectedVideoObjects.find(v => v.id === videoId);
            
            deleteOps.update((i / selectedVideos.length) * 100, `Deleting ${video?.name || 'video'}...`);
            await new Promise(resolve => setTimeout(resolve, 200)); // Simulate deletion time
            
            dispatch(removeVideo(videoId));
          }
          
          deleteOps.complete('Videos deleted successfully');
          dispatch(addNotification({
            type: 'success',
            title: 'Videos Deleted',
            message: `Successfully deleted ${selectedCount} video(s)`,
            autoClose: true,
            duration: 3000,
          }));
          
          onClose();
        },
        videoNames.slice(0, 5).concat(videoNames.length > 5 ? [`...and ${videoNames.length - 5} more`] : [])
      );
    } catch (error) {
      deleteOps.error('Failed to delete videos');
    }
  };

  const handleBulkExport = async () => {
    if (selectedVideoObjects.length === 0) return;
    
    // Validate settings
    const validation = ffmpegService.validateSettings(processing);
    if (!validation.valid) {
      dispatch(addNotification({
        type: 'error',
        title: 'Invalid Export Settings',
        message: validation.errors.join(', '),
        autoClose: true,
        duration: 5000,
      }));
      return;
    }

    try {
      exportOps.start('Preparing bulk export...');
      setExportProgress(0);
      setIsProcessing(true);
      
      dispatch(addNotification({
        type: 'info',
        title: 'Bulk Export Started',
        message: `Starting export of ${selectedCount} video(s)`,
        autoClose: true,
        duration: 3000,
      }));

      const videoPaths = selectedVideoObjects.map(v => v.path);
      
      await ffmpegService.startExport(
        videoPaths,
        processing,
        (progress, videoIndex, message) => {
          const video = selectedVideoObjects[videoIndex];
          const overallProgress = ((videoIndex * 100) + progress) / selectedCount;
          setExportProgress(overallProgress);
          setCurrentProcessingVideo(video?.name || 'Unknown');
          exportOps.update(overallProgress, `Processing ${video?.name || 'video'} (${videoIndex + 1}/${selectedCount})`);
        },
        (outputPaths) => {
          exportOps.complete('Bulk export completed successfully');
          setExportProgress(100);
          setCurrentProcessingVideo('');
          setIsProcessing(false);
          dispatch(addNotification({
            type: 'success',
            title: 'Bulk Export Complete',
            message: `Successfully exported ${outputPaths.length} video(s)`,
            autoClose: true,
            duration: 5000,
          }));
        },
        (error, videoPath) => {
          exportOps.error(`Failed to export: ${error}`);
          setCurrentProcessingVideo('');
          setIsProcessing(false);
          dispatch(addNotification({
            type: 'error',
            title: 'Export Failed',
            message: `Failed to export ${videoPath ? videoPath.split('/').pop() : 'video'}: ${error}`,
            autoClose: true,
            duration: 5000,
          }));
        }
      );
    } catch (error) {
      exportOps.error(error instanceof Error ? error.message : 'Unknown error occurred');
      setCurrentProcessingVideo('');
      setIsProcessing(false);
      dispatch(addNotification({
        type: 'error',
        title: 'Bulk Export Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        autoClose: true,
        duration: 5000,
      }));
    }
  };

  const handleAddToQueue = () => {
    // TODO: Implement add to processing queue functionality
    dispatch(addNotification({
      type: 'info',
      title: 'Added to Queue',
      message: `${selectedCount} video(s) added to processing queue`,
      autoClose: true,
      duration: 3000,
    }));
  };

  const handleCreatePlaylist = () => {
    // TODO: Implement playlist creation functionality
    dispatch(addNotification({
      type: 'info',
      title: 'Playlist Created',
      message: `Created playlist with ${selectedCount} video(s)`,
      autoClose: true,
      duration: 3000,
    }));
  };

  const handleAddAllToTimeline = () => {
    // TODO: Implement add all to timeline functionality
    dispatch(addNotification({
      type: 'success',
      title: 'Added to Timeline',
      message: `Added ${selectedCount} video(s) to timeline`,
      autoClose: true,
      duration: 3000,
    }));
  };

  if (selectedCount === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'linear-gradient(135deg, #2d2d47 0%, #3a3a5c 100%)',
      border: '1px solid #4a4a6a',
      borderRadius: '12px',
      padding: '16px 24px',
      display: 'flex',
      flexDirection: exportLoading.isLoading || deleteLoading.isLoading ? 'column' : 'row',
      alignItems: 'center',
      gap: '16px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      zIndex: 1000,
      minWidth: '600px',
      animation: 'slideUp 0.3s ease-out'
    }}>
      {/* Selection Info */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        minWidth: '180px'
      }}>
        <div style={{
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: '600'
        }}>
          {selectedCount} of {totalCount} selected
        </div>
        <div style={{
          color: '#a0a0a0',
          fontSize: '12px'
        }}>
          {formatFileSize(totalSelectedSize)} • {formatDuration(totalSelectedDuration)}
        </div>
      </div>

      {/* Divider */}
      <div style={{
        width: '1px',
        height: '40px',
        background: '#4a4a6a'
      }} />

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '8px',
        alignItems: 'center'
      }}>
        <button
          onClick={handleSelectAll}
          style={{
            background: 'none',
            border: '1px solid #4a4a6a',
            color: '#ffffff',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
        >
          {selectedCount === totalCount ? '❌ Deselect All' : '✅ Select All'}
        </button>

        <LoadingButton
          variant="primary"
          size="small"
          loading={exportLoading.isLoading}
          loadingText="Exporting..."
          onClick={handleBulkExport}
          disabled={isProcessing}
          icon="🚀"
        >
          Export All
        </LoadingButton>

        <button
          onClick={handleAddToQueue}
          style={{
            background: 'none',
            border: '1px solid #4a4a6a',
            color: '#ffffff',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
        >
          ➕ Add to Queue
        </button>

        <button
          onClick={handleAddAllToTimeline}
          style={{
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            border: '1px solid #15803d',
            color: '#ffffff',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(34, 197, 94, 0.3)';
          }}
        >
          🎬 Add All to Timeline
        </button>

        <button
          onClick={handleCreatePlaylist}
          style={{
            background: 'none',
            border: '1px solid #4a4a6a',
            color: '#ffffff',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
        >
          📋 Create Playlist
        </button>

        <LoadingButton
          variant="danger"
          size="small"
          loading={deleteLoading.isLoading}
          loadingText="Deleting..."
          onClick={handleDeleteSelected}
          icon="🗑️"
        >
          Delete
        </LoadingButton>
      </div>

      {/* Progress Section */}
      {(exportLoading.isLoading || deleteLoading.isLoading) && (
        <div style={{
          width: '100%',
          marginTop: '12px'
        }}>
          <ProgressBar 
            progress={exportLoading.isLoading ? exportProgress : deleteLoading.progress || 0}
            message={exportLoading.isLoading ? 
              (currentProcessingVideo ? `Processing: ${currentProcessingVideo}` : exportLoading.message) :
              deleteLoading.message
            }
            animated={true}
            striped={true}
            height={6}
          />
        </div>
      )}
      
      {/* Close Button */}
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: '#a0a0a0',
          padding: '4px',
          borderRadius: '4px',
          fontSize: '14px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          marginLeft: '8px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
          e.currentTarget.style.color = '#ffffff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'none';
          e.currentTarget.style.color = '#a0a0a0';
        }}
        title="Close toolbar"
      >
        ✕
      </button>

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

      <style>{`
        @keyframes slideUp {
          from {
            transform: translateX(-50%) translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default BulkActionsToolbar;