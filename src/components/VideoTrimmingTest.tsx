import React, { useState, useRef } from 'react';
import { ffmpegService } from '../services/ffmpegService';

interface TrimJob {
  id: string;
  videoPath: string;
  videoName: string;
  startTime: number;
  endTime: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  message: string;
  outputPath?: string;
  error?: string;
}

interface SelectedVideo {
  path: string;
  name: string;
  duration: number;
}

export const VideoTrimmingTest: React.FC = () => {
  const [selectedVideo, setSelectedVideo] = useState<SelectedVideo | null>(null);
  const [trimJobs, setTrimJobs] = useState<TrimJob[]>([]);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(10);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check if running in Electron
  const isElectronAvailable = !!(window.electronAPI?.selectFiles);
  const isElectronEnv = typeof window !== 'undefined' && window.process?.type === 'renderer';

  const handleSelectVideo = async () => {
    try {
      setIsSelecting(true);
      
      if (window.electronAPI?.selectFiles) {
        const filePaths = await window.electronAPI.selectFiles();
        if (filePaths && filePaths.length > 0) {
          const videoPath = filePaths[0];
          const videoName = videoPath.split(/[\\/]/).pop() || 'Unknown';
          
          // Get video metadata to determine duration
          try {
            const metadata = await window.electronAPI.getVideoMetadata(videoPath);
            const duration = metadata.duration || 60; // fallback to 60 seconds
            
            setSelectedVideo({
              path: videoPath,
              name: videoName,
              duration
            });
            
            // Set reasonable default end time
            setEndTime(Math.min(10, duration));
          } catch (error) {
            console.error('Failed to get video metadata:', error);
            setSelectedVideo({
              path: videoPath,
              name: videoName,
              duration: 60 // fallback duration
            });
          }
        }
      } else {
        // Show more helpful error message
        const isElectron = typeof window !== 'undefined' && window.process?.type === 'renderer';
        const message = isElectron 
          ? 'Electron APIs not properly initialized. Please restart the application.'
          : 'File selection not available. Please run in Electron environment.\n\nTo access full functionality:\n1. Close this browser tab\n2. Use the Electron app window that should have opened automatically\n3. If no Electron window opened, restart with: npm run dev';
        
        alert(message);
      }
    } catch (error) {
      console.error('Video selection failed:', error);
      alert(`Failed to select video: ${error.message}`);
    } finally {
      setIsSelecting(false);
    }
  };

  const handleTrimVideo = async () => {
    if (!selectedVideo) {
      alert('Please select a video first');
      return;
    }

    if (startTime >= endTime) {
      alert('Start time must be less than end time');
      return;
    }

    if (endTime > selectedVideo.duration) {
      alert(`End time cannot exceed video duration (${selectedVideo.duration}s)`);
      return;
    }

    const jobId = `trim_${Date.now()}`;
    const newJob: TrimJob = {
      id: jobId,
      videoPath: selectedVideo.path,
      videoName: selectedVideo.name,
      startTime,
      endTime,
      status: 'pending',
      progress: 0,
      message: 'Preparing to trim...'
    };

    setTrimJobs(prev => [...prev, newJob]);
    setIsProcessing(true);

    try {
      const outputPath = await ffmpegService.trimVideo(
        selectedVideo.path,
        startTime,
        endTime,
        undefined,
        (progress, message) => {
          setTrimJobs(prev => prev.map(job => 
            job.id === jobId 
              ? { ...job, status: 'processing', progress, message: message || 'Processing...' }
              : job
          ));
        }
      );

      setTrimJobs(prev => prev.map(job => 
        job.id === jobId 
          ? { 
              ...job, 
              status: 'completed', 
              progress: 100, 
              message: 'Trim completed successfully',
              outputPath 
            }
          : job
      ));

    } catch (error) {
      setTrimJobs(prev => prev.map(job => 
        job.id === jobId 
          ? { 
              ...job, 
              status: 'error', 
              message: 'Trim failed',
              error: error.message 
            }
          : job
      ));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTestMultipleTrims = async () => {
    if (!selectedVideo) {
      alert('Please select a video first');
      return;
    }

    const segments = [
      { start: 0, end: 5, name: 'intro' },
      { start: 10, end: 20, name: 'middle' },
      { start: Math.max(0, selectedVideo.duration - 10), end: selectedVideo.duration, name: 'outro' }
    ].filter(segment => segment.start < segment.end && segment.end <= selectedVideo.duration);

    if (segments.length === 0) {
      alert('Video is too short for multiple segments');
      return;
    }

    setIsProcessing(true);

    try {
      const outputPaths = await ffmpegService.splitVideo(
        selectedVideo.path,
        segments,
        undefined,
        (progress, message) => {
          // Update a single job for the split operation
          const jobId = 'split_' + Date.now();
          setTrimJobs(prev => {
            const existingJob = prev.find(job => job.id.startsWith('split_'));
            if (existingJob) {
              return prev.map(job => 
                job.id === existingJob.id
                  ? { ...job, progress, message: message || 'Splitting...' }
                  : job
              );
            } else {
              return [...prev, {
                id: jobId,
                videoPath: selectedVideo.path,
                videoName: selectedVideo.name + ' (Split)',
                startTime: 0,
                endTime: selectedVideo.duration,
                status: 'processing',
                progress,
                message: message || 'Splitting...'
              }];
            }
          });
        }
      );

      // Add individual completed jobs for each segment
      segments.forEach((segment, index) => {
        const jobId = `segment_${Date.now()}_${index}`;
        setTrimJobs(prev => [...prev, {
          id: jobId,
          videoPath: selectedVideo.path,
          videoName: `${selectedVideo.name} - ${segment.name}`,
          startTime: segment.start,
          endTime: segment.end,
          status: 'completed',
          progress: 100,
          message: 'Segment created successfully',
          outputPath: outputPaths[index]
        }]);
      });

    } catch (error) {
      console.error('Split failed:', error);
      alert(`Split failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearJobs = () => {
    setTrimJobs([]);
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (status: TrimJob['status']) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'processing': return '⚙️';
      case 'completed': return '✅';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  const getStatusColor = (status: TrimJob['status']) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'processing': return '#3b82f6';
      case 'completed': return '#10b981';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div style={{
      padding: '24px',
      maxWidth: '1000px',
      margin: '0 auto',
      backgroundColor: 'var(--surface-primary)',
      borderRadius: '12px',
      border: '1px solid var(--border)'
    }}>
      <h2 style={{ 
        color: 'var(--text-primary)', 
        marginBottom: '16px',
        textAlign: 'center'
      }}>
        ✂️ Video Trimming Test Suite
      </h2>

      {/* Environment Status */}
      <div style={{
        padding: '12px',
        marginBottom: '24px',
        borderRadius: '8px',
        textAlign: 'center',
        backgroundColor: isElectronAvailable ? 'var(--success-bg)' : 'var(--warning-bg)',
        border: `1px solid ${isElectronAvailable ? 'var(--success)' : 'var(--warning)'}`,
        color: 'var(--text-primary)'
      }}>
        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
          {isElectronAvailable ? '✅ Electron Environment Active' : '⚠️ Browser Mode - Limited Functionality'}
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          {isElectronAvailable 
            ? 'All video processing features are available'
            : 'Please use the Electron app window for full functionality'
          }
        </div>
      </div>

      {/* Video Selection */}
      <div style={{
        padding: '20px',
        backgroundColor: 'var(--surface-secondary)',
        borderRadius: '8px',
        marginBottom: '24px'
      }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>
          1. Select Video
        </h3>
        
        {selectedVideo ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '12px',
            backgroundColor: 'var(--surface-tertiary)',
            borderRadius: '6px'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                {selectedVideo.name}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                Duration: {formatTime(selectedVideo.duration)} | Path: {selectedVideo.path}
              </div>
            </div>
            <button
              onClick={handleSelectVideo}
              disabled={isSelecting}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--text-accent)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: isSelecting ? 'not-allowed' : 'pointer',
                opacity: isSelecting ? 0.6 : 1
              }}
            >
              Change Video
            </button>
          </div>
        ) : (
          <button
            onClick={handleSelectVideo}
            disabled={isSelecting}
            style={{
              padding: '12px 24px',
              backgroundColor: 'var(--text-accent)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: isSelecting ? 'not-allowed' : 'pointer',
              opacity: isSelecting ? 0.6 : 1
            }}
          >
            {isSelecting ? '⏳ Selecting...' : '📂 Select Video File'}
          </button>
        )}
      </div>

      {/* Trim Settings */}
      {selectedVideo && (
        <div style={{
          padding: '20px',
          backgroundColor: 'var(--surface-secondary)',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>
            2. Configure Trim
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '16px'
          }}>
            <div>
              <label style={{ 
                display: 'block', 
                color: 'var(--text-primary)', 
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                Start Time (seconds)
              </label>
              <input
                type="number"
                min="0"
                max={selectedVideo.duration}
                step="0.1"
                value={startTime}
                onChange={(e) => setStartTime(parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface-tertiary)',
                  color: 'var(--text-primary)'
                }}
              />
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {formatTime(startTime)}
              </div>
            </div>
            
            <div>
              <label style={{ 
                display: 'block', 
                color: 'var(--text-primary)', 
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                End Time (seconds)
              </label>
              <input
                type="number"
                min={startTime + 0.1}
                max={selectedVideo.duration}
                step="0.1"
                value={endTime}
                onChange={(e) => setEndTime(parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface-tertiary)',
                  color: 'var(--text-primary)'
                }}
              />
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {formatTime(endTime)} (Duration: {formatTime(endTime - startTime)})
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleTrimVideo}
              disabled={isProcessing || startTime >= endTime}
              style={{
                padding: '12px 24px',
                backgroundColor: 'var(--text-accent)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: isProcessing || startTime >= endTime ? 'not-allowed' : 'pointer',
                opacity: isProcessing || startTime >= endTime ? 0.6 : 1
              }}
            >
              {isProcessing ? '⏳ Processing...' : '✂️ Trim Video'}
            </button>
            
            <button
              onClick={handleTestMultipleTrims}
              disabled={isProcessing || selectedVideo.duration < 10}
              style={{
                padding: '12px 24px',
                backgroundColor: 'var(--info)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: isProcessing || selectedVideo.duration < 10 ? 'not-allowed' : 'pointer',
                opacity: isProcessing || selectedVideo.duration < 10 ? 0.6 : 1
              }}
            >
              🔪 Test Split (3 segments)
            </button>
          </div>
        </div>
      )}

      {/* Trim Jobs */}
      {trimJobs.length > 0 && (
        <div style={{
          padding: '20px',
          backgroundColor: 'var(--surface-secondary)',
          borderRadius: '8px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h3 style={{ color: 'var(--text-primary)', margin: 0 }}>
              3. Trim Jobs ({trimJobs.length})
            </h3>
            <button
              onClick={clearJobs}
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--surface-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              🗑️ Clear Jobs
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {trimJobs.map((job) => (
              <div key={job.id} style={{
                padding: '16px',
                backgroundColor: 'var(--surface-tertiary)',
                borderRadius: '6px',
                border: `1px solid ${getStatusColor(job.status)}20`
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '8px'
                }}>
                  <div style={{ fontSize: '20px' }}>
                    {getStatusIcon(job.status)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                      {job.videoName}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                      {formatTime(job.startTime)} → {formatTime(job.endTime)} 
                      ({formatTime(job.endTime - job.startTime)})
                    </div>
                  </div>
                  {job.status === 'processing' && (
                    <div style={{ color: 'var(--text-accent)', fontSize: '14px', fontWeight: '600' }}>
                      {job.progress.toFixed(1)}%
                    </div>
                  )}
                </div>
                
                <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                  {job.message}
                </div>
                
                {job.status === 'processing' && (
                  <div style={{
                    width: '100%',
                    height: '4px',
                    backgroundColor: 'var(--surface-primary)',
                    borderRadius: '2px',
                    marginTop: '8px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${job.progress}%`,
                      height: '100%',
                      backgroundColor: 'var(--text-accent)',
                      borderRadius: '2px',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                )}
                
                {job.error && (
                  <div style={{
                    color: '#ef4444',
                    fontSize: '12px',
                    marginTop: '8px',
                    padding: '8px',
                    backgroundColor: '#ef444420',
                    borderRadius: '4px'
                  }}>
                    Error: {job.error}
                  </div>
                )}
                
                {job.outputPath && (
                  <div style={{
                    color: 'var(--text-secondary)',
                    fontSize: '12px',
                    marginTop: '8px',
                    padding: '8px',
                    backgroundColor: 'var(--success-bg)',
                    borderRadius: '4px'
                  }}>
                    Output: {job.outputPath}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        backgroundColor: 'var(--info-bg)',
        borderRadius: '8px',
        border: '1px solid var(--info)',
        color: 'var(--text-primary)',
        fontSize: '14px'
      }}>
        <strong>How to test:</strong>
        <ol style={{ margin: '8px 0', paddingLeft: '20px' }}>
          <li>Select a video file using the "Select Video File" button</li>
          <li>Set start and end times for trimming</li>
          <li>Click "Trim Video" to create a single trimmed segment</li>
          <li>Click "Test Split" to create multiple segments automatically</li>
          <li>Monitor progress and check output paths</li>
        </ol>
        <strong>Features tested:</strong>
        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
          <li>✂️ Single video trimming with custom time ranges</li>
          <li>🔪 Multiple segment splitting</li>
          <li>📊 Real-time progress tracking</li>
          <li>⚡ Stream copying for fast processing</li>
          <li>📁 Automatic output path generation</li>
        </ul>
      </div>
    </div>
  );
};