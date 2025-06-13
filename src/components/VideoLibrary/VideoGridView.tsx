import React from 'react';

export type ViewMode = 'grid' | 'list' | 'tiles';

interface VideoGridViewProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  showThumbnails: boolean;
  onToggleThumbnails: () => void;
  gridSize: number;
  onGridSizeChange: (size: number) => void;
}

const VideoGridView: React.FC<VideoGridViewProps> = ({
  viewMode,
  onViewModeChange,
  showThumbnails,
  onToggleThumbnails,
  gridSize,
  onGridSizeChange,
}) => {
  const viewModes = [
    { key: 'grid' as ViewMode, icon: '⊞', label: 'Grid View', description: 'Card grid with thumbnails' },
    { key: 'list' as ViewMode, icon: '☰', label: 'List View', description: 'Compact list with details' },
    { key: 'tiles' as ViewMode, icon: '⊡', label: 'Tiles View', description: 'Large tiles with preview' },
  ];

  return (
    <div className="video-grid-view-controls">
      {/* View Mode Selector */}
      <div className="view-mode-selector">
        <span className="control-label">View:</span>
        <div className="view-mode-buttons">
          {viewModes.map((mode) => (
            <button
              key={mode.key}
              className={`view-mode-btn ${viewMode === mode.key ? 'active' : ''}`}
              onClick={() => onViewModeChange(mode.key)}
              title={mode.description}
            >
              <span className="mode-icon">{mode.icon}</span>
              <span className="mode-label">{mode.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid Size Slider (only for grid view) */}
      {viewMode === 'grid' && (
        <div className="grid-size-control">
          <span className="control-label">Size:</span>
          <div className="size-slider-container">
            <span className="size-icon small">⊞</span>
            <input
              type="range"
              min="120"
              max="300"
              value={gridSize}
              onChange={(e) => onGridSizeChange(parseInt(e.target.value))}
              className="size-slider"
            />
            <span className="size-icon large">⊞</span>
          </div>
          <span className="size-value">{gridSize}px</span>
        </div>
      )}

      {/* Thumbnail Toggle */}
      <div className="thumbnail-toggle">
        <button
          className={`toggle-btn ${showThumbnails ? 'active' : ''}`}
          onClick={onToggleThumbnails}
          title="Toggle thumbnail generation"
        >
          <span className="toggle-icon">{showThumbnails ? '🖼️' : '📷'}</span>
          <span className="toggle-label">Thumbnails</span>
        </button>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <button className="quick-action-btn" title="Refresh thumbnails">
          <span className="action-icon">🔄</span>
          <span className="action-label">Refresh</span>
        </button>
        
        <button className="quick-action-btn" title="Generate missing thumbnails">
          <span className="action-icon">⚡</span>
          <span className="action-label">Generate</span>
        </button>
      </div>
    </div>
  );
};

export default VideoGridView;