import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { Video } from '../../types/video.types';
import { updateVideoTimelinePosition } from '../../store/slices/videoSlice';
import { generateMockWaveform, generateWaveformBars, getWaveformColor, waveformCache } from '../../utils/waveformGenerator';
import WaveformVisualization from './WaveformVisualization';

interface VideoTrackProps {
  video: Video;
  index?: number;
  laneIndex?: number;
  pixelsPerSecond: number;
  totalDuration?: number;
  isSelected: boolean;
  onSelect: (multiSelect: boolean) => void;
  onTrimUpdate: (startTime: number, endTime: number) => void;
  snapToGrid: boolean;
  gridInterval: number;
  trimMode?: boolean;
  activeTrimHandle?: { videoId: string; handle: 'start' | 'end' } | null;
  onTrimHandleChange?: (handle: { videoId: string; handle: 'start' | 'end' } | null) => void;
}

const VideoTrack: React.FC<VideoTrackProps> = ({
  video,
  index,
  laneIndex,
  pixelsPerSecond,
  totalDuration: _totalDuration,
  isSelected,
  onSelect,
  onTrimUpdate,
  snapToGrid,
  gridInterval,
  trimMode,
  activeTrimHandle,
  onTrimHandleChange,
}) => {
  const dispatch = useDispatch();
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDraggingTrim, setIsDraggingTrim] = useState<'start' | 'end' | null>(null);
  const [isDraggingTrack, setIsDraggingTrack] = useState(false);
  const [trimStart, setTrimStart] = useState(video.trimStart || 0);
  const [trimEnd, setTrimEnd] = useState(video.trimEnd || video.duration);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartTime, setDragStartTime] = useState(0);
  const [showTrimHandles, setShowTrimHandles] = useState(trimMode || false);
  const [isHovered, setIsHovered] = useState(false);
  const [dragPreviewTime, setDragPreviewTime] = useState<number | null>(null);
  
  // Update trim handles visibility when trim mode changes
  useEffect(() => {
    setShowTrimHandles(trimMode || false);
  }, [trimMode]);
  
  // Calculate dimensions and positions
  const videoStartTime = video.timelinePosition || 0;
  const trimmedDuration = trimEnd - trimStart;
  
  const trackWidth = video.duration * pixelsPerSecond;
  const trimStartPixels = trimStart * pixelsPerSecond;
  const trimEndPixels = trimEnd * pixelsPerSecond;
  const trimmedWidth = trimEndPixels - trimStartPixels;
  
  
  // Show trim handles when in trim mode or hovered
  const shouldShowTrimHandles = trimMode || isHovered || showTrimHandles || activeTrimHandle?.videoId === video.id;
  
  const snapToGridTime = useCallback((time: number): number => {
    if (!snapToGrid) return time;
    return Math.round(time / gridInterval) * gridInterval;
  }, [snapToGrid, gridInterval]);
  
  const handleTrackMouseDown = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    
    const isMultiSelect = event.ctrlKey || event.metaKey || event.shiftKey;
    onSelect(isMultiSelect);
    
    if (!isDraggingTrim && !trimMode) {
      setIsDraggingTrack(true);
      setDragStartX(event.clientX);
      setDragStartTime(videoStartTime);
      setDragPreviewTime(videoStartTime);
    }
  }, [onSelect, isDraggingTrim, trimMode, videoStartTime]);
  
  const handleTrimMouseDown = useCallback((event: React.MouseEvent, type: 'start' | 'end') => {
    event.stopPropagation();
    setIsDraggingTrim(type);
    setDragStartX(event.clientX);
    
    // Notify parent that we're actively trimming
    if (onTrimHandleChange) {
      onTrimHandleChange({ videoId: video.id, handle: type });
    }
  }, [video.id, onTrimHandleChange]);
  
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!trackRef.current) return;
    
    if (isDraggingTrim) {
      const rect = trackRef.current.getBoundingClientRect();
      const relativeX = event.clientX - rect.left;
      const newTime = relativeX / pixelsPerSecond;
      const snappedTime = snapToGridTime(Math.max(0, Math.min(newTime, video.duration)));
      
      if (isDraggingTrim === 'start') {
        const newTrimStart = Math.max(0, Math.min(snappedTime, trimEnd - 0.1));
        setTrimStart(newTrimStart);
      } else if (isDraggingTrim === 'end') {
        const newTrimEnd = Math.max(trimStart + 0.1, Math.min(snappedTime, video.duration));
        setTrimEnd(newTrimEnd);
      }
    } else if (isDraggingTrack) {
      const deltaX = event.clientX - dragStartX;
      const deltaTime = deltaX / pixelsPerSecond;
      const newStartTime = snapToGridTime(Math.max(0, dragStartTime + deltaTime));
      setDragPreviewTime(newStartTime);
    }
  }, [isDraggingTrim, isDraggingTrack, pixelsPerSecond, snapToGridTime, trimEnd, trimStart, video.duration, dragStartX, dragStartTime]);
  
  const handleMouseUp = useCallback(() => {
    if (isDraggingTrim) {
      onTrimUpdate(trimStart, trimEnd);
      setIsDraggingTrim(null);
      
      // Clear active trim handle
      if (onTrimHandleChange) {
        onTrimHandleChange(null);
      }
    }
    
    if (isDraggingTrack) {
      setIsDraggingTrack(false);
      
      // Update video timeline position
      if (dragPreviewTime !== null) {
        dispatch(updateVideoTimelinePosition({
          id: video.id,
          timelinePosition: Math.max(0, dragPreviewTime)
        }));
      }
      
      setDragPreviewTime(null);
    }
  }, [isDraggingTrim, isDraggingTrack, onTrimUpdate, trimStart, trimEnd, onTrimHandleChange, dragPreviewTime, dispatch, video.id]);
  
  // Global mouse event listeners
  useEffect(() => {
    if (isDraggingTrim || isDraggingTrack) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingTrim, isDraggingTrack, handleMouseMove, handleMouseUp]);
  
  const getStatusColor = () => {
    switch (video.status) {
      case 'ready': return 'var(--text-muted)';
      case 'processing': return 'var(--warning)';
      case 'completed': return 'var(--success)';
      case 'error': return 'var(--error)';
      default: return 'var(--text-muted)';
    }
  };
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div 
      ref={trackRef}
      className={`video-track ${isSelected ? 'selected' : ''} ${isDraggingTrack ? 'dragging' : ''}`}
      style={{ 
        width: trackWidth,
        top: (index || laneIndex || 0) * 50,
        height: 40,
        position: 'relative',
        marginBottom: 8,
      }}
      onMouseDown={handleTrackMouseDown}
      onMouseEnter={() => {
        setShowTrimHandles(true);
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        if (!isDraggingTrim) setShowTrimHandles(false);
        setIsHovered(false);
      }}
    >
      {/* Track background */}
      <div className="track-background" />
      
      {/* Trimmed area */}
      <div 
        className={`track-content ${video.status}`}
        style={{
          left: trimStartPixels,
          width: trimmedWidth,
          backgroundColor: isSelected ? 'var(--selection)' : 'var(--video-track)',
          border: isSelected ? '2px solid var(--text-accent)' : '1px solid var(--border)',
        }}
      >
        {/* Video thumbnail/waveform area */}
        <div className="track-visual">
          {video.thumbnail && (
            <div 
              className="track-thumbnail"
              style={{
                backgroundImage: `url(${video.thumbnail})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                width: '40px',
                height: '100%',
                borderRadius: '4px 0 0 4px',
              }}
            />
          )}
          
          {/* Enhanced Waveform visualization */}
          <div className="track-waveform">
            {useMemo(() => {
              // Try to get cached waveform data
              const cacheKey = `${video.id}-${trimmedWidth}`;
              let waveformData = waveformCache.get(cacheKey);
              
              if (!waveformData) {
                waveformData = generateMockWaveform(trimmedDuration, {
                  width: trimmedWidth,
                  height: 24,
                  barCount: Math.floor(trimmedWidth / 3),
                  amplitudeScale: 1.2
                });
                waveformCache.set(cacheKey, waveformData);
              }
              
              const waveformBars = generateWaveformBars(waveformData, {
                width: trimmedWidth,
                height: 24
              });
              
              const waveformColor = getWaveformColor(isSelected, video.status);
              
              return waveformBars.map((bar, i) => (
                <div 
                  key={i}
                  className="waveform-bar"
                  style={{
                    width: '2px',
                    height: `${bar.height}px`,
                    backgroundColor: waveformColor,
                    opacity: bar.opacity,
                    borderRadius: '1px',
                    transition: 'all 0.2s ease',
                  }}
                />
              ));
            }, [video.id, video.status, isSelected, trimmedWidth, trimmedDuration])}
          </div>
        </div>
        
        {/* Track label */}
        <div className="track-label">
          <span className="track-name" title={video.name}>
            {video.name.length > 20 ? video.name.substring(0, 20) + '...' : video.name}
          </span>
          <span className="track-duration">
            {formatTime(trimEnd - trimStart)}
          </span>
        </div>
        
        {/* Processing progress overlay */}
        {video.status === 'processing' && video.processProgress !== undefined && (
          <div 
            className="track-progress-overlay"
            style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${video.processProgress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, rgba(34, 197, 94, 0.3) 0%, rgba(34, 197, 94, 0.6) 100%)',
              borderRadius: '6px',
              zIndex: 5,
            }}
          >
            <div className="progress-shine" />
          </div>
        )}
        
        {/* Status indicator */}
        <div 
          className={`track-status-indicator ${video.status}`}
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: getStatusColor(),
            boxShadow: '0 0 4px rgba(0,0,0,0.3)',
            zIndex: 10,
          }}
        />
        
        {/* Status indicator */}
        <div 
          className="track-status"
          style={{ 
            backgroundColor: getStatusColor(),
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            position: 'absolute',
            top: '4px',
            right: '4px',
          }}
        />
      </div>
      
      {/* Enhanced trim handles */}
      {shouldShowTrimHandles && (
        <>
          <div 
            className={`trim-handle start ${isDraggingTrim === 'start' ? 'active' : ''} ${activeTrimHandle?.videoId === video.id && activeTrimHandle.handle === 'start' ? 'highlighted' : ''}`}
            style={{ 
              position: 'absolute',
              left: trimStartPixels - 6,
              top: 0,
              width: '12px',
              height: '100%',
              cursor: 'ew-resize',
              zIndex: 1001,
              opacity: trimMode ? 1 : 0.7,
            }}
            onMouseDown={(e) => handleTrimMouseDown(e, 'start')}
          >
            <div 
              className="trim-handle-visual"
              style={{
                width: '4px',
                height: '100%',
                backgroundColor: isDraggingTrim === 'start' ? '#3B82F6' : '#6B7280',
                borderRadius: '2px',
                margin: '0 auto',
                position: 'relative',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}
            >
              {/* Grip dots */}
              <div 
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '2px',
                  height: '8px',
                  backgroundColor: 'white',
                  borderRadius: '1px',
                }}
              />
            </div>
            
            {/* Tooltip */}
            {isDraggingTrim === 'start' && (
              <div 
                className="trim-tooltip"
                style={{
                  position: 'absolute',
                  top: '-30px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  zIndex: 1002,
                }}
              >
                {formatTime(trimStart)}
              </div>
            )}
          </div>
          
          <div 
            className={`trim-handle end ${isDraggingTrim === 'end' ? 'active' : ''} ${activeTrimHandle?.videoId === video.id && activeTrimHandle.handle === 'end' ? 'highlighted' : ''}`}
            style={{ 
              position: 'absolute',
              left: trimEndPixels - 6,
              top: 0,
              width: '12px',
              height: '100%',
              cursor: 'ew-resize',
              zIndex: 1001,
              opacity: trimMode ? 1 : 0.7,
            }}
            onMouseDown={(e) => handleTrimMouseDown(e, 'end')}
          >
            <div 
              className="trim-handle-visual"
              style={{
                width: '4px',
                height: '100%',
                backgroundColor: isDraggingTrim === 'end' ? '#3B82F6' : '#6B7280',
                borderRadius: '2px',
                margin: '0 auto',
                position: 'relative',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}
            >
              {/* Grip dots */}
              <div 
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '2px',
                  height: '8px',
                  backgroundColor: 'white',
                  borderRadius: '1px',
                }}
              />
            </div>
            
            {/* Tooltip */}
            {isDraggingTrim === 'end' && (
              <div 
                className="trim-tooltip"
                style={{
                  position: 'absolute',
                  top: '-30px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  zIndex: 1002,
                }}
              >
                {formatTime(trimEnd)}
              </div>
            )}
          </div>
        </>
      )}
      
      {/* Disabled areas (before trim start and after trim end) */}
      {trimStart > 0 && (
        <div 
          className="track-disabled"
          style={{
            left: 0,
            width: trimStartPixels,
            background: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
          }}
        />
      )}
      
      {trimEnd < video.duration && (
        <div 
          className="track-disabled"
          style={{
            left: trimEndPixels,
            width: trackWidth - trimEndPixels,
            background: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
          }}
        />
      )}
      
      {/* Drag preview indicator */}
      {isDraggingTrack && dragPreviewTime !== null && (
        <div 
          className="drag-preview-indicator"
          style={{
            position: 'absolute',
            left: -2,
            top: -2,
            width: 'calc(100% + 4px)',
            height: 'calc(100% + 4px)',
            border: '2px dashed #3B82F6',
            borderRadius: '8px',
            pointerEvents: 'none',
            zIndex: 999,
          }}
        />
      )}
      
      {/* Track effects indicator */}
      {video.effects && video.effects.length > 0 && (
        <div 
          className="effects-indicator"
          style={{
            position: 'absolute',
            top: '-8px',
            left: '4px',
            display: 'flex',
            gap: '2px',
            zIndex: 1001,
          }}
        >
          {video.effects.map((effect, i) => (
            <div 
              key={i}
              className={`effect-icon ${effect.type}`}
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: effect.enabled ? '#10B981' : '#6B7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '8px',
                color: 'white',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}
              title={effect.name}
            >
              {effect.type.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoTrack;