import React, { useState, useRef, useEffect } from 'react';
import { Video } from '../../types/video.types';

interface VideoPreviewModalProps {
  video: Video | null;
  isOpen: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

const VideoPreviewModal: React.FC<VideoPreviewModalProps> = ({
  video,
  isOpen,
  onClose,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  // const [isFullscreen, setIsFullscreen] = useState(false); // TODO: Implement fullscreen functionality
  const videoRef = useRef<HTMLVideoElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && video) {
      setCurrentTime(0);
      setIsPlaying(false);
    }
  }, [isOpen, video]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case ' ':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowLeft':
          if (hasPrevious && onPrevious) onPrevious();
          break;
        case 'ArrowRight':
          if (hasNext && onNext) onNext();
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(prev => Math.min(1, prev + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(prev => Math.max(0, prev - 0.1));
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, hasNext, hasPrevious, onNext, onPrevious, onClose]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const toggleFullscreen = () => {
    if (modalRef.current) {
      // TODO: Implement fullscreen functionality
      // if (!isFullscreen) {
      //   modalRef.current.requestFullscreen();
      // } else {
      //   document.exitFullscreen();
      // }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      videoRef.current.volume = volume;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = (parseFloat(e.target.value) / 100) * duration;
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  if (!isOpen || !video) return null;

  return (
    <div className="video-preview-modal-overlay" onClick={onClose}>
      <div 
        ref={modalRef}
        className={`video-preview-modal`} // TODO: Add fullscreen class when implemented
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="video-info-header">
            <h3 className="video-title">{video.name}</h3>
            <div className="video-metadata">
              <span className="metadata-item">{video.resolution}</span>
              <span className="metadata-item">{formatFileSize(video.size)}</span>
              <span className="metadata-item">{video.format.toUpperCase()}</span>
              <span className="metadata-item">{video.fps} fps</span>
            </div>
          </div>
          
          <div className="modal-actions">
            <button 
              className="modal-btn"
              onClick={toggleFullscreen}
              title="Toggle fullscreen (F)"
            >
              {'⤢'} {/* TODO: Show different icon for fullscreen state */}
            </button>
            <button 
              className="modal-btn close"
              onClick={onClose}
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Video Container */}
        <div className="video-container">
          <video
            ref={videoRef}
            src={video.path}
            className="preview-video"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            poster={video.thumbnail}
          />

          {/* Navigation Arrows */}
          {hasPrevious && (
            <button 
              className="nav-arrow prev"
              onClick={onPrevious}
              title="Previous video (←)"
            >
              ◀
            </button>
          )}
          
          {hasNext && (
            <button 
              className="nav-arrow next"
              onClick={onNext}
              title="Next video (→)"
            >
              ▶
            </button>
          )}

          {/* Play Button Overlay */}
          {!isPlaying && (
            <button 
              className="play-overlay-large"
              onClick={togglePlayPause}
            >
              <div className="play-button-large">▶</div>
            </button>
          )}
        </div>

        {/* Controls */}
        <div className="video-controls-extended">
          {/* Main Controls Row */}
          <div className="controls-main">
            <button 
              className="control-btn play-pause"
              onClick={togglePlayPause}
              title="Play/Pause (Space)"
            >
              {isPlaying ? '⏸️' : '▶️'}
            </button>

            <div className="time-display">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            <div className="progress-container">
              <input
                type="range"
                min="0"
                max="100"
                value={duration > 0 ? (currentTime / duration) * 100 : 0}
                onChange={handleSeek}
                className="progress-slider"
              />
            </div>

            <div className="volume-container">
              <span className="volume-icon">🔊</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => {
                  const newVolume = parseFloat(e.target.value);
                  setVolume(newVolume);
                  if (videoRef.current) {
                    videoRef.current.volume = newVolume;
                  }
                }}
                className="volume-slider"
              />
              <span className="volume-value">{Math.round(volume * 100)}%</span>
            </div>
          </div>

          {/* Secondary Controls */}
          <div className="controls-secondary">
            <div className="playback-speed">
              <label>Speed:</label>
              <select 
                onChange={(e) => {
                  if (videoRef.current) {
                    videoRef.current.playbackRate = parseFloat(e.target.value);
                  }
                }}
                className="speed-select"
              >
                <option value="0.5">0.5x</option>
                <option value="0.75">0.75x</option>
                <option value="1" selected>1x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2x</option>
              </select>
            </div>

            <div className="video-actions-modal">
              <button className="action-btn-modal" title="Add to timeline">
                ➕ Add to Timeline
              </button>
              <button className="action-btn-modal" title="Extract frame">
                📸 Extract Frame
              </button>
              <button className="action-btn-modal" title="Trim video">
                ✂️ Trim
              </button>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts Help */}
        <div className="keyboard-shortcuts">
          <div className="shortcuts-row">
            <span className="shortcut"><kbd>Space</kbd> Play/Pause</span>
            <span className="shortcut"><kbd>←</kbd><kbd>→</kbd> Navigate</span>
            <span className="shortcut"><kbd>↑</kbd><kbd>↓</kbd> Volume</span>
            <span className="shortcut"><kbd>F</kbd> Fullscreen</span>
            <span className="shortcut"><kbd>Esc</kbd> Close</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPreviewModal;