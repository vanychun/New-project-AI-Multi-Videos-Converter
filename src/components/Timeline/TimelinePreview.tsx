import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { 
  setCurrentTime, 
  togglePlayback,
  setTotalDuration,
  setZoomLevel,
  zoomToFit
} from '../../store/slices/timelineSlice';
import TimelineContainer from './TimelineContainer';

interface TimelinePreviewProps {
  className?: string;
  showVideoPreview?: boolean;
  height?: number;
}

const TimelinePreview: React.FC<TimelinePreviewProps> = ({ 
  className = '', 
  showVideoPreview = true,
  height = 500 
}) => {
  const dispatch = useDispatch();
  const { videos, selectedVideos } = useSelector((state: RootState) => state.videos);
  const { 
    currentTime, 
    isPlaying, 
    totalDuration,
    selectedTracks,
    zoomLevel 
  } = useSelector((state: RootState) => state.timeline);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Get the current video based on timeline position and selected tracks
  const getCurrentVideo = useCallback(() => {
    // If tracks are selected, prioritize the first selected track
    if (selectedTracks.length > 0) {
      return videos.find(v => selectedTracks.includes(v.id));
    }
    
    // Otherwise, find the video that should be playing at current time
    const activeVideo = videos.find(video => {
      const videoStart = video.timelinePosition || 0;
      const videoEnd = videoStart + (video.trimEnd !== undefined ? video.trimEnd : video.duration);
      return currentTime >= videoStart && currentTime < videoEnd;
    });
    
    // Fallback to first video or selected video
    return activeVideo || videos.find(v => selectedVideos.includes(v.id)) || videos[0];
  }, [videos, selectedTracks, selectedVideos, currentTime]);
  
  const currentVideo = getCurrentVideo();
  
  // Sync video playback with timeline state
  useEffect(() => {
    if (!videoRef.current || !currentVideo) return;
    
    if (isPlaying) {
      videoRef.current.play().catch(err => {
        console.error('Video play error:', err);
        setVideoError('Failed to play video');
      });
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying, currentVideo]);
  
  // Sync video current time with timeline
  useEffect(() => {
    if (!videoRef.current || !currentVideo) return;
    
    const videoStart = currentVideo.timelinePosition || 0;
    const relativeTime = currentTime - videoStart;
    const trimStart = currentVideo.trimStart || 0;
    const actualVideoTime = trimStart + relativeTime;
    
    // Only update if there's a significant difference to avoid jitter
    if (Math.abs(videoRef.current.currentTime - actualVideoTime) > 0.1) {
      videoRef.current.currentTime = Math.max(0, actualVideoTime);
    }
  }, [currentTime, currentVideo]);
  
  const handleVideoTimeUpdate = useCallback(() => {
    if (!videoRef.current || !currentVideo) return;
    
    const videoStart = currentVideo.timelinePosition || 0;
    const trimStart = currentVideo.trimStart || 0;
    const timelineTime = videoStart + (videoRef.current.currentTime - trimStart);
    
    // Update timeline current time
    dispatch(setCurrentTime(timelineTime));
  }, [dispatch, currentVideo]);
  
  const handleVideoLoadedMetadata = useCallback(() => {
    if (!videoRef.current) return;
    
    setVideoLoaded(true);
    setVideoError(null);
    
    // Calculate total timeline duration if not set
    if (videos.length > 0) {
      const maxDuration = Math.max(...videos.map(video => {
        const start = video.timelinePosition || 0;
        const end = video.trimEnd !== undefined ? video.trimEnd : video.duration;
        return start + end;
      }));
      
      if (maxDuration > totalDuration) {
        dispatch(setTotalDuration(maxDuration));
      }
    }
  }, [dispatch, videos, totalDuration]);
  
  const handleVideoError = useCallback((event: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = event.currentTarget;
    const error = video.error;
    let errorMessage = 'Failed to load video';
    
    if (error) {
      switch (error.code) {
        case error.MEDIA_ERR_ABORTED:
          errorMessage = 'Video loading aborted';
          break;
        case error.MEDIA_ERR_NETWORK:
          errorMessage = 'Network error loading video';
          break;
        case error.MEDIA_ERR_DECODE:
          errorMessage = 'Video decode error';
          break;
        case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = 'Video format not supported';
          break;
        default:
          errorMessage = `Video error: ${error.message || 'Unknown error'}`;
      }
    }
    
    console.error('🎬 Video load error:', {
      errorMessage,
      videoSrc: video.src,
      error: error,
      currentVideo: getCurrentVideo()
    });
    
    setVideoError(errorMessage);
    setVideoLoaded(false);
  }, [getCurrentVideo]);
  
  const handleTogglePlayback = useCallback(() => {
    dispatch(togglePlayback());
  }, [dispatch]);

  const handleZoomIn = useCallback(() => {
    dispatch(setZoomLevel(Math.min(10, zoomLevel * 1.5)));
  }, [dispatch, zoomLevel]);

  const handleZoomOut = useCallback(() => {
    dispatch(setZoomLevel(Math.max(0.1, zoomLevel / 1.5)));
  }, [dispatch, zoomLevel]);

  const handleZoomToFit = useCallback(() => {
    dispatch(zoomToFit());
  }, [dispatch]);

  const handleFullscreen = useCallback(() => {
    if (!videoRef.current) return;
    
    if (!document.fullscreenElement) {
      videoRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !currentVideo) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * totalDuration;
    
    dispatch(setCurrentTime(newTime));
  }, [dispatch, totalDuration, currentVideo]);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }
    const timeout = setTimeout(() => {
      setShowControls(false);
    }, 3000);
    setControlsTimeout(timeout);
  }, [controlsTimeout]);
  
  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600);
    const mins = Math.floor((time % 3600) / 60);
    const secs = Math.floor(time % 60);
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Debug video source changes
  useEffect(() => {
    const currentVideo = getCurrentVideo();
    if (currentVideo) {
      console.log('🎬 Video source changed:', {
        videoId: currentVideo.id,
        videoName: currentVideo.name,
        videoPath: currentVideo.path,
        pathType: currentVideo.path.startsWith('file://') ? 'file://' : 
                 currentVideo.path.startsWith('blob:') ? 'blob:' : 'other'
      });
    }
  }, [getCurrentVideo]);

  // Mouse move handler for showing controls
  useEffect(() => {
    const handleMouseMove = () => {
      showControlsTemporarily();
    };

    const videoElement = videoRef.current;
    if (videoElement) {
      videoElement.addEventListener('mousemove', handleMouseMove);
      return () => {
        videoElement.removeEventListener('mousemove', handleMouseMove);
      };
    }
  }, [showControlsTemporarily]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);
  
  return (
    <div className={`timeline-preview ${className}`} style={{ height, display: 'flex', flexDirection: 'column' }}>
      {showVideoPreview && (
        <div className="timeline-video-preview professional" style={{
          height: '60%',
          background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2a 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          overflow: 'hidden'
        }}>
          {!currentVideo ? (
            <div className="video-preview-empty" style={{
              textAlign: 'center',
              color: 'var(--text-muted)'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📺</div>
              <div style={{ fontSize: '14px' }}>No video selected</div>
              <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>
                Select a video track or add videos to the timeline
              </div>
            </div>
          ) : (
            <div className="video-preview-container professional" style={{
              width: '95%',
              height: '95%',
              background: '#000',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
            }}>
              {/* Video Player */}
              {videoError ? (
                <div className="video-error" style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ef4444',
                  fontSize: '16px',
                  gap: '12px'
                }}>
                  <div style={{ fontSize: '48px', opacity: 0.6 }}>⚠️</div>
                  <div>{videoError}</div>
                  <button 
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      color: 'white',
                      cursor: 'pointer'
                    }}
                    onClick={() => setVideoError(null)}
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  src={currentVideo.path}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    background: '#000'
                  }}
                  onTimeUpdate={handleVideoTimeUpdate}
                  onLoadedMetadata={handleVideoLoadedMetadata}
                  onError={handleVideoError}
                  onMouseMove={showControlsTemporarily}
                  muted
                />
              )}

              {/* Loading Overlay */}
              {!videoLoaded && !videoError && (
                <div className="video-loading" style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0, 0, 0, 0.8)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '14px',
                  gap: '12px'
                }}>
                  <div className="loading-spinner" style={{
                    width: '32px',
                    height: '32px',
                    border: '3px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '3px solid #7461ef',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <div>Loading video...</div>
                </div>
              )}

              {/* Play/Pause Overlay */}
              {videoLoaded && (
                <div 
                  className="video-play-overlay"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    opacity: isPlaying ? 0 : 0.8,
                    transition: 'opacity 0.3s ease',
                    pointerEvents: isPlaying ? 'none' : 'auto',
                    cursor: 'pointer'
                  }}
                  onClick={handleTogglePlayback}
                >
                  <div style={{
                    width: '80px',
                    height: '80px',
                    background: 'rgba(0, 0, 0, 0.7)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                    color: 'white',
                    border: '2px solid rgba(255, 255, 255, 0.8)'
                  }}>
                    ▶️
                  </div>
                </div>
              )}
              
              {/* Enhanced Video Controls */}
              <div 
                className="video-controls-overlay enhanced"
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  opacity: showControls ? 1 : 0,
                  transition: 'opacity 0.3s ease',
                  pointerEvents: showControls ? 'auto' : 'none'
                }}
                onMouseEnter={() => setShowControls(true)}
              >
                {/* Progress Bar */}
                <div 
                  className="video-progress-bar"
                  style={{
                    width: '100%',
                    height: '6px',
                    background: 'rgba(255, 255, 255, 0.3)',
                    borderRadius: '3px',
                    position: 'relative',
                    cursor: 'pointer'
                  }}
                  onClick={handleSeek}
                >
                  <div 
                    className="progress-fill"
                    style={{
                      width: `${totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #7461ef 0%, #34d399 100%)',
                      borderRadius: '3px',
                      transition: 'width 0.1s ease'
                    }}
                  />
                  <div 
                    className="progress-handle"
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: `${totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0}%`,
                      transform: 'translate(-50%, -50%)',
                      width: '12px',
                      height: '12px',
                      background: '#7461ef',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)'
                    }}
                  />
                </div>

                {/* Control Buttons Row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  {/* Left Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      onClick={handleTogglePlayback}
                      className="video-play-button enhanced"
                      style={{
                        background: '#7461ef',
                        border: 'none',
                        borderRadius: '50%',
                        width: '44px',
                        height: '44px',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 4px 12px rgba(116, 97, 239, 0.4)'
                      }}
                    >
                      {isPlaying ? '⏸️' : '▶️'}
                    </button>
                    
                    <div className="video-time-display enhanced" style={{
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '500',
                      minWidth: '100px',
                      fontFamily: 'monospace'
                    }}>
                      {formatTime(currentTime)} / {formatTime(totalDuration)}
                    </div>
                  </div>

                  {/* Center - Video Info */}
                  <div className="video-title-center" style={{
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: '600',
                    textAlign: 'center',
                    flex: 1,
                    margin: '0 24px'
                  }}>
                    {currentVideo.name}
                    <div style={{ 
                      fontSize: '12px', 
                      opacity: 0.7, 
                      fontWeight: '400',
                      marginTop: '2px'
                    }}>
                      {currentVideo.metadata.width}×{currentVideo.metadata.height}
                    </div>
                  </div>

                  {/* Right Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={handleZoomOut}
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        borderRadius: '6px',
                        width: '36px',
                        height: '36px',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px'
                      }}
                      title="Zoom Out"
                    >
                      🔍-
                    </button>
                    
                    <button
                      onClick={handleZoomToFit}
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}
                      title="Fit All"
                    >
                      Fit All
                    </button>
                    
                    <button
                      onClick={handleZoomIn}
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        borderRadius: '6px',
                        width: '36px',
                        height: '36px',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px'
                      }}
                      title="Zoom In"
                    >
                      🔍+
                    </button>
                    
                    <button
                      onClick={handleFullscreen}
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        borderRadius: '6px',
                        width: '36px',
                        height: '36px',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px'
                      }}
                      title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                    >
                      {isFullscreen ? '🪟' : '⛶'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Integrated Timeline */}
      <div className="timeline-area" style={{
        height: showVideoPreview ? '40%' : '100%',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <TimelineContainer 
          className="integrated-timeline"
          height={showVideoPreview ? height * 0.4 : height}
        />
      </div>
    </div>
  );
};

export default TimelinePreview;