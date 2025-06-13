import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { 
  togglePlayback, 
  setCurrentTime, 
  setZoomLevel, 
  zoomToFit, 
  jumpToStart, 
  jumpToEnd,
  stepFrame,
  setSnapToGrid,
  setGridInterval,
  setPlaybackRate,
  setLoopMode,
  setTrimMode 
} from '../../store/slices/timelineSlice';

interface TimelineControlsProps {
  isPlaying?: boolean;
  currentTime?: number;
  totalDuration?: number;
  playbackSpeed?: number;
  onPlayToggle?: () => void;
  onSeek?: (time: number) => void;
  onSpeedChange?: (speed: number) => void;
  trimMode?: boolean;
  onTrimModeToggle?: () => void;
}

const TimelineControls: React.FC<TimelineControlsProps> = ({
  isPlaying: propIsPlaying,
  currentTime: propCurrentTime,
  totalDuration: propTotalDuration,
  playbackSpeed: _propPlaybackSpeed,
  onPlayToggle,
  onSeek,
  onSpeedChange: _onSpeedChange,
  trimMode: _propTrimMode,
  onTrimModeToggle: _onTrimModeToggle
}) => {
  const dispatch = useDispatch();
  const storeState = useSelector((state: RootState) => state.timeline);
  
  // Use props if provided, otherwise fall back to store state
  const isPlaying = propIsPlaying !== undefined ? propIsPlaying : storeState.isPlaying;
  const currentTime = propCurrentTime !== undefined ? propCurrentTime : storeState.currentTime;
  const totalDuration = propTotalDuration !== undefined ? propTotalDuration : storeState.totalDuration;
  const { zoomLevel, snapToGrid, gridInterval, playbackRate, loopMode, trimMode } = storeState;
  
  const { videos } = useSelector((state: RootState) => state.videos);
  
  const handlePlayPause = () => {
    if (onPlayToggle) {
      onPlayToggle();
    } else {
      dispatch(togglePlayback());
    }
  };
  
  const handleStop = () => {
    const seekTime = 0;
    if (onSeek) {
      onSeek(seekTime);
    } else {
      dispatch(setCurrentTime(seekTime));
    }
  };
  
  
  const handlePreviousFrame = () => {
    dispatch(stepFrame('backward'));
  };
  
  const handleNextFrame = () => {
    dispatch(stepFrame('forward'));
  };
  
  const handleZoomIn = () => {
    dispatch(setZoomLevel(Math.min(10, zoomLevel * 1.2)));
  };
  
  const handleZoomOut = () => {
    dispatch(setZoomLevel(Math.max(0.1, zoomLevel / 1.2)));
  };
  
  const handleZoomToFit = () => {
    dispatch(zoomToFit());
  };
  
  const handleJumpToStart = () => {
    dispatch(jumpToStart());
  };
  
  const handleJumpToEnd = () => {
    dispatch(jumpToEnd());
  };

  const handleSpeedChange = (speed: number) => {
    dispatch(setPlaybackRate(speed));
  };

  const handleLoopToggle = () => {
    dispatch(setLoopMode(!loopMode));
  };

  const handleTrimModeToggle = () => {
    dispatch(setTrimMode(!trimMode));
  };
  
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30); // Assume 30fps for frame display
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${frames.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}.${frames.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="timeline-controls">
      {/* Playback Controls */}
      <div className="control-group playback-controls">
        <button
          className="control-button"
          onClick={handleJumpToStart}
          title="Jump to Start (Home)"
        >
          ⏮️
        </button>
        
        <button
          className="control-button"
          onClick={handlePreviousFrame}
          title="Previous Frame (←)"
        >
          ⏪
        </button>
        
        <button
          className={`control-button play-button ${isPlaying ? 'playing' : ''}`}
          onClick={handlePlayPause}
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        >
          {isPlaying ? '⏸️' : '▶️'}
        </button>
        
        <button
          className="control-button"
          onClick={handleNextFrame}
          title="Next Frame (→)"
        >
          ⏩
        </button>
        
        <button
          className="control-button"
          onClick={handleJumpToEnd}
          title="Jump to End (End)"
        >
          ⏭️
        </button>
        
        <button
          className="control-button"
          onClick={handleStop}
          title="Stop"
        >
          ⏹️
        </button>
      </div>
      
      {/* Time Display */}
      <div className="control-group time-display">
        <div className="time-current">
          {formatTime(currentTime)}
        </div>
        <div className="time-separator">/</div>
        <div className="time-total">
          {formatTime(totalDuration)}
        </div>
      </div>

      {/* Playback Speed Controls */}
      <div className="control-group speed-controls">
        <label className="speed-label">Speed:</label>
        <select
          className="speed-select"
          value={playbackRate}
          onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
        >
          <option value={0.25}>0.25x</option>
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={1.25}>1.25x</option>
          <option value={1.5}>1.5x</option>
          <option value={2}>2x</option>
          <option value={4}>4x</option>
        </select>
      </div>
      
      {/* Zoom Controls */}
      <div className="control-group zoom-controls">
        <button
          className="control-button"
          onClick={handleZoomOut}
          title="Zoom Out (Ctrl+-)"
          disabled={zoomLevel <= 0.1}
        >
          🔍-
        </button>
        
        <div className="zoom-display">
          {Math.round(zoomLevel * 100)}%
        </div>
        
        <button
          className="control-button"
          onClick={handleZoomIn}
          title="Zoom In (Ctrl++)"
          disabled={zoomLevel >= 10}
        >
          🔍+
        </button>
        
        <button
          className="control-button"
          onClick={handleZoomToFit}
          title="Fit to Window (Ctrl+0)"
        >
          📏
        </button>
      </div>
      
      {/* Snap Controls */}
      <div className="control-group snap-controls">
        <label className="snap-toggle">
          <input
            type="checkbox"
            checked={snapToGrid}
            onChange={(e) => dispatch(setSnapToGrid(e.target.checked))}
          />
          <span>Snap</span>
        </label>
        
        <select
          className="grid-interval-select"
          value={gridInterval}
          onChange={(e) => dispatch(setGridInterval(parseFloat(e.target.value)))}
          disabled={!snapToGrid}
        >
          <option value={0.1}>0.1s</option>
          <option value={0.5}>0.5s</option>
          <option value={1}>1s</option>
          <option value={5}>5s</option>
          <option value={10}>10s</option>
          <option value={30}>30s</option>
          <option value={60}>1m</option>
        </select>
      </div>
      
      {/* Video Count */}
      <div className="control-group video-count">
        <span className="video-count-label">
          {videos.length} video{videos.length !== 1 ? 's' : ''}
        </span>
      </div>
      
      {/* Additional Controls */}
      <div className="control-group additional-controls">
        <button
          className={`control-button ${trimMode ? 'active trim-active' : ''}`}
          onClick={handleTrimModeToggle}
          title="Trim Mode (T)"
          style={{
            backgroundColor: trimMode ? '#ef4444' : '#10b981',
            color: 'white',
            border: trimMode ? '2px solid #dc2626' : '2px solid #059669',
            fontWeight: 'bold',
            fontSize: '18px',
            padding: '8px 12px',
            minWidth: '40px'
          }}
        >
          ✂️ {trimMode ? 'ON' : 'OFF'}
        </button>
        
        <button
          className={`control-button ${loopMode ? 'active' : ''}`}
          onClick={handleLoopToggle}
          title="Loop"
        >
          🔄
        </button>
        
        <button
          className="control-button"
          title="Markers"
        >
          📍
        </button>
        
        <button
          className="control-button"
          title="Settings"
        >
          ⚙️
        </button>
      </div>
    </div>
  );
};

export default TimelineControls;