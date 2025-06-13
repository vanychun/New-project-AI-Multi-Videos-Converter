import React from 'react';
import './TimelinePlaceholder.css';

export interface TimelinePlaceholderProps {
  selectedCount: number;
  onPreview: () => void;
}

export const TimelinePlaceholder: React.FC<TimelinePlaceholderProps> = ({
  selectedCount,
  onPreview
}) => {
  return (
    <div className="timeline-placeholder">
      <div className="timeline-header">
        <div className="timeline-info">
          <h3>Timeline Preview</h3>
          <span className="video-count">
            {selectedCount > 0 ? `${selectedCount} videos selected` : 'No videos selected'}
          </span>
        </div>
        <div className="timeline-actions">
          <button 
            className="preview-button"
            onClick={onPreview}
            disabled={selectedCount === 0}
          >
            <span className="button-icon">▶️</span>
            Preview
          </button>
        </div>
      </div>

      <div className="timeline-content">
        {selectedCount > 0 ? (
          <div className="timeline-tracks">
            <div className="track-header">
              <span className="track-label">Video Track</span>
              <span className="track-duration">00:00:00</span>
            </div>
            <div className="track-visualization">
              {Array.from({ length: selectedCount }, (_, index) => (
                <div key={index} className="video-segment">
                  <div className="segment-preview"></div>
                  <span className="segment-label">Video {index + 1}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-timeline">
            <div className="empty-icon">🎬</div>
            <h4>No Videos Selected</h4>
            <p>Select videos from the library to see them in the timeline</p>
          </div>
        )}
      </div>
    </div>
  );
};