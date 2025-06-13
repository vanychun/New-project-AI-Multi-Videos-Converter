import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { 
  startProcessing, 
  addJob, 
  updateJobStatus,
  addTaskTree,
  setHierarchicalView
} from '../../store/slices/processingSlice';
import { addNotification } from '../../store/slices/uiSlice';
import { VideoProcessingJob, ProcessingStatus } from '../../types/video.types';
import { taskManager } from '../../services/taskManager';
import { ffmpegService } from '../../services/ffmpegService';
import useTaskHierarchy from '../../hooks/useTaskHierarchy';
import { v4 as uuidv4 } from 'uuid';
import './StartProcessingButton.css';

const StartProcessingButton: React.FC = () => {
  const dispatch = useDispatch();
  const [isStarting, setIsStarting] = useState(false);
  const { createVideoProcessingTree } = useTaskHierarchy();
  
  const { queue, isProcessing } = useSelector((state: RootState) => state.processing);
  const { selectedVideos, videos } = useSelector((state: RootState) => state.videos);
  const { processing: processingSettings, ai: aiSettings } = useSelector((state: RootState) => state.settings);
  
  // Get pending items from queue
  const pendingItems = queue.filter(item => item.status === ProcessingStatus.PENDING);
  const hasItemsToProcess = pendingItems.length > 0 || selectedVideos.length > 0;

  const handleStartProcessing = async () => {
    if (!hasItemsToProcess) {
      dispatch(addNotification({
        type: 'warning',
        title: 'Nothing to Process',
        message: 'Please add videos to the processing queue first',
        autoClose: true,
        duration: 3000,
      }));
      return;
    }

    setIsStarting(true);

    try {
      // Switch to hierarchical view to show task trees
      dispatch(setHierarchicalView(true));
      
      // If there are selected videos but not in queue, add them first
      if (selectedVideos.length > 0 && pendingItems.length === 0) {
        const selectedVideoObjects = videos.filter(v => selectedVideos.includes(v.id));
        
        // Check for videos with blob URLs that can't be processed
        const videosWithBlobUrls = selectedVideoObjects.filter(v => v.path && v.path.startsWith('blob:'));
        
        if (videosWithBlobUrls.length > 0) {
          dispatch(addNotification({
            type: 'error',
            title: 'Cannot Process Videos',
            message: `${videosWithBlobUrls.length} video(s) were imported via drag-and-drop and cannot be processed. Please re-import them using the "Import Videos" button.`,
            autoClose: false,
          }));
          setIsStarting(false);
          return;
        }
        
        for (const video of selectedVideoObjects) {
          // Create processing job
          const job: VideoProcessingJob & { videoPath: string } = {
            id: `job_${uuidv4()}`,
            videoId: video.id,
            videoPath: video.path,
            status: ProcessingStatus.PENDING,
            progress: 0,
            processingSettings: processingSettings,
            aiSettings: aiSettings.enabled ? aiSettings : undefined,
          };

          // Add job to store
          dispatch(addJob(job));

          // Create hierarchical task tree
          const treeId = await createVideoProcessingTree(
            video.path,
            video.name,
            processingSettings,
            aiSettings.enabled ? aiSettings : undefined
          );

          // Update job with task tree reference
          job.task_tree = taskManager.getTaskTree(treeId);
          job.root_task_id = job.task_tree?.root_task_id;

          // Start processing with hierarchical tracking
          setTimeout(() => {
            dispatch(updateJobStatus({ 
              jobId: job.id, 
              status: ProcessingStatus.PROCESSING 
            }));

            ffmpegService.startProcessing(
              job,
              (progress, stage, message) => {
                // Progress callback with stage info
                console.log(`Processing ${video.name}: ${progress}% - ${stage} - ${message}`);
              },
              (outputPath) => {
                // Completion callback
                dispatch(updateJobStatus({ 
                  jobId: job.id, 
                  status: ProcessingStatus.COMPLETED 
                }));
                dispatch(addNotification({
                  type: 'success',
                  title: 'Processing Complete',
                  message: `${video.name} has been processed successfully`,
                  autoClose: true,
                  duration: 5000,
                }));
              },
              (error, stage) => {
                // Error callback
                dispatch(updateJobStatus({ 
                  jobId: job.id, 
                  status: ProcessingStatus.ERROR,
                  error: error
                }));
                dispatch(addNotification({
                  type: 'error',
                  title: 'Processing Failed',
                  message: `Failed to process ${video.name}: ${error}`,
                  autoClose: false,
                  duration: 0,
                }));
              }
            );
          }, 100);
        }
      } else {
        // Process items already in queue
        for (const item of pendingItems) {
          const video = videos.find(v => v.id === item.videoId);
          if (!video) continue;

          const job: VideoProcessingJob & { videoPath: string } = {
            id: item.id,
            videoId: video.id,
            videoPath: video.path,
            status: ProcessingStatus.PENDING,
            progress: 0,
            processingSettings: processingSettings,
            aiSettings: aiSettings.enabled ? aiSettings : undefined,
          };

          // Create hierarchical task tree
          const treeId = await createVideoProcessingTree(
            video.path,
            video.name,
            processingSettings,
            aiSettings.enabled ? aiSettings : undefined
          );

          // Update job with task tree reference
          job.task_tree = taskManager.getTaskTree(treeId);
          job.root_task_id = job.task_tree?.root_task_id;

          // Start processing
          setTimeout(() => {
            dispatch(updateJobStatus({ 
              jobId: job.id, 
              status: ProcessingStatus.PROCESSING 
            }));

            ffmpegService.startProcessing(
              job,
              (progress, stage, message) => {
                console.log(`Processing ${video.name}: ${progress}% - ${stage} - ${message}`);
              },
              (outputPath) => {
                dispatch(updateJobStatus({ 
                  jobId: job.id, 
                  status: ProcessingStatus.COMPLETED 
                }));
              },
              (error, stage) => {
                dispatch(updateJobStatus({ 
                  jobId: job.id, 
                  status: ProcessingStatus.ERROR,
                  error: error
                }));
              }
            );
          }, 100);
        }
      }

      // Start processing in the store
      dispatch(startProcessing());
      
      dispatch(addNotification({
        type: 'info',
        title: 'Processing Started',
        message: `Started processing ${pendingItems.length || selectedVideos.length} video(s) with hierarchical task tracking`,
        autoClose: true,
        duration: 4000,
      }));

    } catch (error) {
      console.error('Failed to start processing:', error);
      dispatch(addNotification({
        type: 'error',
        title: 'Failed to Start',
        message: 'Failed to start processing. Please check your settings and try again.',
        autoClose: true,
        duration: 5000,
      }));
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <button
      className={`start-processing-button ${isProcessing ? 'processing' : ''} ${isStarting ? 'loading' : ''}`}
      onClick={handleStartProcessing}
      disabled={!hasItemsToProcess || isProcessing || isStarting}
      title={isProcessing ? 'Processing in progress' : 'Start processing videos'}
    >
      <span className="button-icon">
        {isProcessing ? '⏸️' : isStarting ? '⏳' : '🚀'}
      </span>
      <span className="button-text">
        {isProcessing ? 'Processing...' : isStarting ? 'Starting...' : 'Start Processing'}
      </span>
      {hasItemsToProcess && !isProcessing && (
        <span className="button-badge">
          {pendingItems.length || selectedVideos.length}
        </span>
      )}
    </button>
  );
};

export default StartProcessingButton;