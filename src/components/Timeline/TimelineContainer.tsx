import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { 
  setZoomLevel, 
  setTotalDuration,
  selectTrack, 
  clearTrackSelection, 
  togglePlayback,
  setTrimMode,
  setActiveTrimHandle,
  seekToTime
} from '../../store/slices/timelineSlice';
import { updateVideoTrimPoints } from '../../store/slices/videoSlice';
import { ffmpegService } from '../../services/ffmpegService';
import { addNotification } from '../../store/slices/uiSlice';
import { autoSelectAllVideos } from '../../store/slices/videoSlice';
import VideoTrack from './VideoTrack';
import TimelineRuler from './TimelineRuler';
import TimelineControls from './TimelineControls';
import { useMediaShortcuts } from '../../hooks/useKeyboardShortcuts';
import './Timeline.css';

interface TimelineContainerProps {
  className?: string;
  height?: number;
}

const TimelineContainer: React.FC<TimelineContainerProps> = ({ className, height = 400 }) => {
  const dispatch = useDispatch();
  const containerRef = useRef<HTMLDivElement>(null);
  const tracksContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [, setDragStartX] = useState(0);
  const [isWheelZooming, setIsWheelZooming] = useState(false);
  const [hoveredTime, setHoveredTime] = useState<number | null>(null);
  const [, setIsResizing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  const {
    currentTime,
    zoomLevel,
    totalDuration: timelineDuration,
    isPlaying,
    selectedTracks,
    viewportStart,
    viewportEnd,
    snapToGrid,
    gridInterval,
    trimMode,
    activeTrimHandle,
    playbackSpeed
  } = useSelector((state: RootState) => state.timeline);
  
  const { videos, selectedVideos } = useSelector((state: RootState) => state.videos);
  
  // Filter to show only selected videos on timeline
  const timelineVideos = videos.filter(video => selectedVideos.includes(video.id));
  
  // Calculate total duration from timeline videos (selected videos only)
  const calculatedDuration = useMemo(() => {
    if (timelineVideos.length === 0) return 60; // Default 1 minute for empty timeline
    
    // Find the end time of the last video (considering trim points)
    const endTimes = timelineVideos.map(video => {
      const effectiveEnd = video.trimEnd !== undefined ? video.trimEnd : video.duration;
      const startOffset = video.timelinePosition || 0;
      return startOffset + effectiveEnd;
    });
    
    return Math.max(...endTimes, 60);
  }, [timelineVideos]);
  
  // Use timeline duration or calculated duration
  const totalDuration = timelineDuration || calculatedDuration;
  
  // Advanced zoom calculation with viewport support
  const pixelsPerSecond = useMemo(() => {
    const basePixelsPerSecond = zoomLevel * 50; // Increased base for better precision
    const viewportDuration = viewportEnd - viewportStart;
    const containerWidth = containerRef.current?.clientWidth || 800;
    
    // Ensure minimum zoom for viewport
    const minPixelsPerSecond = containerWidth / viewportDuration;
    return Math.max(basePixelsPerSecond, minPixelsPerSecond);
  }, [zoomLevel, viewportStart, viewportEnd]);
  
  const timelineWidth = totalDuration * pixelsPerSecond;
  
  // Track organization - group timeline videos by track lanes
  const trackLanes = useMemo(() => {
    const lanes: Array<Array<typeof timelineVideos[0]>> = [];
    
    timelineVideos.forEach(video => {
      const videoStart = video.timelinePosition || 0;
      const videoEnd = videoStart + (video.trimEnd !== undefined ? video.trimEnd : video.duration);
      
      // Find a lane where this video fits
      let laneIndex = 0;
      while (laneIndex < lanes.length) {
        const lane = lanes[laneIndex];
        const hasOverlap = lane.some(existingVideo => {
          const existingStart = existingVideo.timelinePosition || 0;
          const existingEnd = existingStart + (existingVideo.trimEnd !== undefined ? existingVideo.trimEnd : existingVideo.duration);
          return !(videoEnd <= existingStart || videoStart >= existingEnd);
        });
        
        if (!hasOverlap) {
          break;
        }
        laneIndex++;
      }
      
      // Create new lane if needed
      if (laneIndex >= lanes.length) {
        lanes.push([]);
      }
      
      lanes[laneIndex].push(video);
    });
    
    return lanes;
  }, [timelineVideos]);
  
  // Update total duration when videos change
  useEffect(() => {
    dispatch(setTotalDuration(calculatedDuration));
  }, [dispatch, calculatedDuration]);
  
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (!containerRef.current || event.button !== 0) return;
    
    // Don't handle clicks on track elements
    if ((event.target as HTMLElement).closest('.video-track-item, .trim-handle')) {
      return;
    }
    
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const scrollLeft = containerRef.current.scrollLeft;
    const adjustedX = clickX + scrollLeft;
    const newTime = (adjustedX / timelineWidth) * totalDuration;
    
    setIsDragging(true);
    setDragStartX(adjustedX);
    
    // Snap to grid if enabled
    const targetTime = snapToGrid 
      ? Math.round(newTime / gridInterval) * gridInterval 
      : newTime;
    
    if (trimMode && activeTrimHandle) {
      // In trim mode, update the active trim handle
      // This will be handled by the VideoTrack component
    } else {
      // Seek to clicked time
      dispatch(seekToTime(targetTime));
    }
    
    // Clear track selection unless Ctrl/Cmd is held
    if (!event.ctrlKey && !event.metaKey) {
      dispatch(clearTrackSelection());
    }
  }, [dispatch, totalDuration, timelineWidth, snapToGrid, gridInterval, trimMode, activeTrimHandle]);
  
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const currentX = event.clientX - rect.left + (containerRef.current?.scrollLeft || 0);
    const hoveredTimeValue = (currentX / timelineWidth) * totalDuration;
    
    // Update hovered time for preview
    setHoveredTime(Math.max(0, Math.min(hoveredTimeValue, totalDuration)));
    
    if (!isDragging) return;
    
    const newTime = hoveredTimeValue;
    const targetTime = snapToGrid 
      ? Math.round(newTime / gridInterval) * gridInterval 
      : newTime;
    
    if (trimMode && activeTrimHandle) {
      // Trim mode - this will be handled by VideoTrack
    } else {
      // Seeking mode
      dispatch(seekToTime(targetTime));
    }
  }, [isDragging, dispatch, totalDuration, timelineWidth, snapToGrid, gridInterval, trimMode, activeTrimHandle]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    
    // Clear active trim handle when done
    if (trimMode && activeTrimHandle && !isDragging) {
      dispatch(setActiveTrimHandle(null));
    }
  }, [dispatch, trimMode, activeTrimHandle, isDragging]);
  
  const handleMouseLeave = useCallback(() => {
    setHoveredTime(null);
    if (!isDragging) {
      handleMouseUp();
    }
  }, [isDragging, handleMouseUp]);
  
  const handleWheel = useCallback((event: React.WheelEvent) => {
    event.preventDefault();
    
    if (event.ctrlKey || event.metaKey) {
      // Zoom with Ctrl/Cmd + scroll
      setIsWheelZooming(true);
      const zoomDelta = event.deltaY > 0 ? -0.3 : 0.3;
      const newZoom = Math.max(0.1, Math.min(10, zoomLevel + zoomDelta));
      
      // Zoom around mouse position
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect && containerRef.current) {
        const mouseX = event.clientX - rect.left;
        const scrollLeft = containerRef.current.scrollLeft;
        const mouseTimePosition = ((mouseX + scrollLeft) / timelineWidth) * totalDuration;
        
        dispatch(setZoomLevel(newZoom));
        
        // Adjust scroll to keep mouse position centered
        setTimeout(() => {
          if (containerRef.current) {
            const newTimelineWidth = totalDuration * (newZoom * 50);
            const newMousePixels = (mouseTimePosition / totalDuration) * newTimelineWidth;
            containerRef.current.scrollLeft = newMousePixels - mouseX;
          }
        }, 0);
      } else {
        dispatch(setZoomLevel(newZoom));
      }
      
      setTimeout(() => setIsWheelZooming(false), 100);
    } else if (event.shiftKey) {
      // Vertical scroll with Shift
      if (tracksContainerRef.current) {
        tracksContainerRef.current.scrollTop += event.deltaY;
      }
    } else {
      // Horizontal scroll
      if (containerRef.current) {
        containerRef.current.scrollLeft += event.deltaY;
      }
    }
  }, [dispatch, zoomLevel, totalDuration, timelineWidth]);
  
  const handleTrackSelect = useCallback((videoId: string, multiSelect: boolean) => {
    if (multiSelect) {
      dispatch(selectTrack(videoId));
    } else {
      dispatch(clearTrackSelection());
      dispatch(selectTrack(videoId));
    }
  }, [dispatch]);
  
  const handleTrimUpdate = useCallback((videoId: string, trimStart: number, trimEnd: number) => {
    dispatch(updateVideoTrimPoints({ id: videoId, trimStart, trimEnd }));
  }, [dispatch]);

  // Check if any timeline videos have trim points
  const hasTrimmedVideos = timelineVideos.some(video => 
    (video.trimStart !== undefined && video.trimStart > 0) || 
    (video.trimEnd !== undefined && video.trimEnd < video.duration)
  );

  const handleApplyTrim = useCallback(async () => {
    const trimmedVideos = timelineVideos.filter(video => 
      (video.trimStart !== undefined && video.trimStart > 0) || 
      (video.trimEnd !== undefined && video.trimEnd < video.duration)
    );

    for (const video of trimmedVideos) {
      try {
        const trimStart = video.trimStart || 0;
        const trimEnd = video.trimEnd || video.duration;
        
        dispatch(addNotification({
          id: `trim-${video.id}-${Date.now()}`,
          type: 'info',
          message: `Trimming ${video.name}...`,
          duration: 0 // Keep until complete
        }));

        await ffmpegService.trimVideo(
          video.path,
          trimStart,
          trimEnd,
          undefined,
          (progress, message) => {
            console.log(`Trim progress for ${video.name}: ${progress}% - ${message}`);
          }
        );

        dispatch(addNotification({
          id: `trim-complete-${video.id}-${Date.now()}`,
          type: 'success',
          message: `Successfully trimmed ${video.name}`,
          duration: 3000
        }));
      } catch (error) {
        dispatch(addNotification({
          id: `trim-error-${video.id}-${Date.now()}`,
          type: 'error',
          message: `Failed to trim ${video.name}: ${error.message}`,
          duration: 5000
        }));
      }
    }
  }, [timelineVideos, dispatch]);
  
  const timeToPixels = useCallback((time: number): number => {
    return (time / totalDuration) * timelineWidth;
  }, [totalDuration, timelineWidth]);
  
  
  // Playback functionality
  const togglePlay = useCallback(() => {
    dispatch(togglePlayback());
  }, [dispatch]);
  
  // Scroll to specific time
  const scrollToTime = useCallback((time: number, center: boolean = false) => {
    if (!containerRef.current) return;
    
    const timePixels = timeToPixels(time);
    const containerWidth = containerRef.current.clientWidth;
    
    let scrollLeft;
    if (center) {
      scrollLeft = timePixels - containerWidth / 2;
    } else {
      scrollLeft = timePixels;
    }
    
    containerRef.current.scrollLeft = Math.max(0, scrollLeft);
  }, [timeToPixels]);
  
  // Media keyboard shortcuts for timeline
  useMediaShortcuts({
    onPlayPause: () => {
      if (isFocused) {
        togglePlay();
      }
    },
    onStop: () => {
      if (isFocused) {
        dispatch(seekToTime(0));
        scrollToTime(0, true);
      }
    },
    onSeekForward: () => {
      if (isFocused) {
        const nextTime = currentTime + 10;
        dispatch(seekToTime(Math.min(totalDuration, nextTime)));
      }
    },
    onSeekBackward: () => {
      if (isFocused) {
        const prevTime = currentTime - 10;
        dispatch(seekToTime(Math.max(0, prevTime)));
      }
    },
    onNext: () => {
      if (isFocused) {
        const nextTime = currentTime + 1;
        dispatch(seekToTime(Math.min(totalDuration, nextTime)));
      }
    },
    onPrevious: () => {
      if (isFocused) {
        const prevTime = currentTime - 1;
        dispatch(seekToTime(Math.max(0, prevTime)));
      }
    }
  });
  
  // Timeline-specific keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle if timeline is focused
      if (!isFocused) return;
      
      // Don't interfere with input fields
      const target = event.target as HTMLElement;
      const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      if (isInputFocused) return;
      
      switch (event.key) {
        case 'Home':
          event.preventDefault();
          dispatch(seekToTime(0));
          scrollToTime(0, true);
          break;
        case 'End':
          event.preventDefault();
          dispatch(seekToTime(totalDuration));
          scrollToTime(totalDuration, true);
          break;
        case 'ArrowUp': {
          event.preventDefault();
          const nextTime = currentTime + 60; // Jump 1 minute
          dispatch(seekToTime(Math.min(totalDuration, nextTime)));
          break;
        }
        case 'ArrowDown': {
          event.preventDefault();
          const prevTime = currentTime - 60; // Jump 1 minute back
          dispatch(seekToTime(Math.max(0, prevTime)));
          break;
        }
        case '=':
        case '+':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            dispatch(setZoomLevel(Math.min(10, zoomLevel * 1.3)));
          }
          break;
        case '-':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            dispatch(setZoomLevel(Math.max(0.1, zoomLevel / 1.3)));
          }
          break;
        case '0':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            dispatch(setZoomLevel(1));
            scrollToTime(currentTime, true);
          }
          break;
        case 't':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            dispatch(setTrimMode(!trimMode));
          }
          break;
        case 'Escape':
          dispatch(clearTrackSelection());
          dispatch(setTrimMode(false));
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, currentTime, totalDuration, zoomLevel, trimMode, togglePlay, scrollToTime, isFocused]);
  
  // Auto-scroll to keep current time in view
  useEffect(() => {
    if (containerRef.current && !isDragging) {
      const currentTimePixels = timeToPixels(currentTime);
      const containerWidth = containerRef.current.clientWidth;
      const scrollLeft = containerRef.current.scrollLeft;
      const scrollRight = scrollLeft + containerWidth;
      
      if (currentTimePixels < scrollLeft || currentTimePixels > scrollRight) {
        containerRef.current.scrollLeft = currentTimePixels - containerWidth / 2;
      }
    }
  }, [currentTime, timeToPixels, isDragging]);
  
  return (
    <div 
      className={`timeline-container ${className || ''} ${isFocused ? 'focused' : ''}`} 
      style={{ height }}
      tabIndex={0}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    >
      <TimelineControls 
        isPlaying={isPlaying}
        currentTime={currentTime}
        totalDuration={totalDuration}
        playbackSpeed={playbackSpeed}
        onPlayToggle={togglePlay}
        onSeek={(time) => dispatch(seekToTime(time))}
        onSpeedChange={() => {}}
        trimMode={trimMode}
        onTrimModeToggle={() => dispatch(setTrimMode(!trimMode))}
      />
      
      <div className="timeline-header">
        <div className="timeline-header-left">
          <span className="timeline-zoom">Zoom: {Math.round(zoomLevel * 100)}%</span>
          <span className="timeline-duration">
            Tracks: {trackLanes.length} | Videos: {timelineVideos.length}
          </span>
          {trimMode && (
            <>
              <span className="timeline-mode trim-mode">
                ✂️ Trim Mode
              </span>
              {hasTrimmedVideos && (
                <button
                  className="apply-trim-button"
                  onClick={handleApplyTrim}
                  style={{
                    marginLeft: '10px',
                    padding: '6px 12px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  Apply Trim to {timelineVideos.filter(v => 
                    (v.trimStart !== undefined && v.trimStart > 0) || 
                    (v.trimEnd !== undefined && v.trimEnd < v.duration)
                  ).length} Video(s)
                </button>
              )}
            </>
          )}
          {isFocused && (
            <span className="keyboard-hint" title="Timeline keyboard shortcuts active">
              ⌨️ Space: Play/Pause | Arrows: Seek | Ctrl +/-: Zoom | Ctrl+T: Trim
            </span>
          )}
        </div>
        <div className="timeline-header-right">
          <span className="timeline-time">
            {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')} / {Math.floor(totalDuration / 60)}:{Math.floor(totalDuration % 60).toString().padStart(2, '0')}
          </span>
          {hoveredTime !== null && (
            <span className="timeline-hover-time">
              Hover: {Math.floor(hoveredTime / 60)}:{Math.floor(hoveredTime % 60).toString().padStart(2, '0')}
            </span>
          )}
        </div>
      </div>
      
      <div 
        ref={containerRef}
        className={`timeline-viewport ${isDragging ? 'dragging' : ''} ${isWheelZooming ? 'zooming' : ''} ${trimMode ? 'trim-mode' : ''} ${isPlaying ? 'playing' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      >
        <div className="timeline-content" style={{ width: timelineWidth }}>
          <TimelineRuler
            duration={totalDuration}
            pixelsPerSecond={pixelsPerSecond}
            currentTime={currentTime}
            hoveredTime={hoveredTime}
            gridInterval={gridInterval}
            zoomLevel={zoomLevel}
            onTimeClick={(time) => dispatch(seekToTime(time))}
          />
          
          <div 
            ref={tracksContainerRef}
            className="timeline-tracks"
            style={{ maxHeight: height - 120, overflowY: 'auto' }}
          >
            {trackLanes.length > 0 ? (
              trackLanes.map((lane, laneIndex) => (
                <div key={laneIndex} className="timeline-track-lane">
                  {lane.map((video) => (
                    <VideoTrack
                      key={video.id}
                      video={video}
                      laneIndex={laneIndex}
                      pixelsPerSecond={pixelsPerSecond}
                      totalDuration={totalDuration}
                      isSelected={selectedTracks.includes(video.id)}
                      onSelect={(multiSelect) => handleTrackSelect(video.id, multiSelect)}
                      onTrimUpdate={(start, end) => handleTrimUpdate(video.id, start, end)}
                      snapToGrid={snapToGrid}
                      gridInterval={gridInterval}
                      trimMode={trimMode}
                      activeTrimHandle={activeTrimHandle}
                      onTrimHandleChange={(handle) => dispatch(setActiveTrimHandle(handle))}
                    />
                  ))}
                </div>
              ))
            ) : (
              <div className="timeline-empty" style={{
                border: '5px solid #10b981',
                backgroundColor: '#065f46',
                padding: '20px',
                borderRadius: '10px',
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.5)'
              }}>
                <div className="timeline-empty-content">
                  <div className="timeline-empty-icon" style={{ fontSize: '72px' }}>🎬</div>
                  <div className="timeline-empty-text" style={{ fontSize: '24px', color: 'white' }}>
                    {videos.length > 0 ? 'No videos selected for timeline' : 'Add videos to see them on the timeline'}
                  </div>
                  <div className="timeline-empty-hint" style={{ fontSize: '18px', color: '#d1fae5' }}>
                    {videos.length > 0 ? 'Select videos from the library to add them to timeline' : 'Drag & drop videos or use the video library'}
                  </div>
                  
                  {/* MASSIVE DEBUG PANEL */}
                  <div style={{ 
                    marginTop: '20px', 
                    padding: '20px', 
                    backgroundColor: '#fbbf24', 
                    borderRadius: '8px',
                    fontSize: '20px',
                    color: '#000',
                    fontWeight: 'bold',
                    border: '3px solid #f59e0b'
                  }}>
                    🚨 DEBUG INFO 🚨<br/>
                    Total Videos in Library: {videos.length}<br/>
                    Selected Videos IDs: [{selectedVideos.join(', ')}]<br/>
                    Timeline Videos Count: {timelineVideos.length}<br/>
                    Timeline State: {JSON.stringify({ isPlaying, currentTime, totalDuration }, null, 2)}
                  </div>
                  
                  {/* GIANT GREEN BUTTON - ALWAYS VISIBLE */}
                  <button
                    onClick={() => {
                      console.log('=== GREEN BUTTON CLICKED ===');
                      console.log('Total videos:', videos.length);
                      console.log('Selected videos:', selectedVideos);
                      console.log('Dispatching autoSelectAllVideos...');
                      dispatch(autoSelectAllVideos());
                      console.log('Action dispatched!');
                    }}
                    style={{
                      marginTop: '30px',
                      padding: '30px 60px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: '5px solid #059669',
                      borderRadius: '15px',
                      cursor: 'pointer',
                      fontSize: '36px',
                      fontWeight: '900',
                      boxShadow: '0 8px 20px rgba(16, 185, 129, 0.6)',
                      transition: 'all 0.2s ease',
                      animation: 'pulse 2s infinite',
                      display: 'block',
                      margin: '30px auto'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#059669';
                      e.currentTarget.style.transform = 'scale(1.1)';
                      e.currentTarget.style.boxShadow = '0 12px 30px rgba(16, 185, 129, 0.8)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = '#10b981';
                      e.currentTarget.style.transform = 'scale(1.0)';
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(16, 185, 129, 0.6)';
                    }}
                  >
                    🎬 ADD ALL VIDEOS TO TIMELINE 🎬
                  </button>
                  
                  {/* EXTRA DEBUG BUTTON */}
                  <button
                    onClick={() => {
                      console.log('=== FULL DEBUG DUMP ===');
                      console.log('Redux State:', { videos, selectedVideos, timelineVideos });
                      console.log('Timeline State:', { isPlaying, currentTime, totalDuration, trimMode });
                      console.log('Component State:', { isDragging, hoveredTime, isFocused });
                      alert(`Videos: ${videos.length}, Selected: ${selectedVideos.length}, Timeline: ${timelineVideos.length}`);
                    }}
                    style={{
                      marginTop: '10px',
                      padding: '15px 30px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: '3px solid #2563eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '20px',
                      fontWeight: '700',
                      display: 'block',
                      margin: '10px auto'
                    }}
                  >
                    🔍 LOG EVERYTHING TO CONSOLE
                  </button>
                  
                  {videos.length === 0 && (
                    <div style={{ 
                      marginTop: '20px', 
                      padding: '20px', 
                      backgroundColor: '#dc2626', 
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '24px',
                      fontWeight: 'bold',
                      border: '3px solid #b91c1c'
                    }}>
                      ⚠️ NO VIDEOS IN LIBRARY! IMPORT VIDEOS FIRST! ⚠️
                    </div>
                  )}
                </div>
                
                <style>{`
                  @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.8; }
                    100% { opacity: 1; }
                  }
                `}</style>
              </div>
            )}
            
            {/* Add track button */}
            <div className="timeline-add-track">
              <button 
                className="add-track-button"
                onClick={() => {
                  // This would trigger adding a new video or track
                  console.log('Add track clicked');
                }}
                title="Add new track"
              >
                + Add Track
              </button>
            </div>
          </div>
          
          {/* Current time cursor */}
          <div 
            className={`timeline-cursor ${isPlaying ? 'playing' : ''}`}
            style={{ 
              left: timeToPixels(currentTime),
              height: '100%',
              zIndex: 1000
            }}
          >
            <div className="timeline-cursor-head" />
            <div className="timeline-cursor-line" />
          </div>
          
          {/* Hover time indicator */}
          {hoveredTime !== null && hoveredTime !== currentTime && (
            <div 
              className="timeline-hover-cursor"
              style={{ 
                left: timeToPixels(hoveredTime),
                height: '100%',
                zIndex: 999
              }}
            >
              <div className="timeline-hover-line" />
              <div className="timeline-hover-time-label">
                {Math.floor(hoveredTime / 60)}:{Math.floor(hoveredTime % 60).toString().padStart(2, '0')}
              </div>
            </div>
          )}
          
          {/* Snap indicators */}
          {snapToGrid && (
            <div className="timeline-grid-overlay">
              {Array.from({ length: Math.ceil(totalDuration / gridInterval) }, (_, i) => (
                <div
                  key={i}
                  className="timeline-grid-line"
                  style={{
                    left: timeToPixels(i * gridInterval),
                    height: '100%'
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Timeline status bar */}
      <div className="timeline-status-bar">
        <div className="timeline-status-left">
          <span className="timeline-pixel-ratio">
            {pixelsPerSecond.toFixed(1)} px/s
          </span>
          <span className="timeline-viewport-info">
            View: {Math.floor(viewportStart)}s - {Math.floor(viewportEnd)}s
          </span>
        </div>
        <div className="timeline-status-right">
          {selectedTracks.length > 0 && (
            <span className="timeline-selection">
              {selectedTracks.length} track{selectedTracks.length > 1 ? 's' : ''} selected
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimelineContainer;