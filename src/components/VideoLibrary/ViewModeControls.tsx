import React from 'react';

export type ViewMode = 'grid' | 'list' | 'tiles';
export type SortBy = 'name' | 'duration' | 'size' | 'created' | 'modified';
export type SortOrder = 'asc' | 'desc';

interface ViewModeControlsProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortBy: SortBy;
  onSortByChange: (sortBy: SortBy) => void;
  sortOrder: SortOrder;
  onSortOrderChange: (order: SortOrder) => void;
  thumbnailSize: number;
  onThumbnailSizeChange: (size: number) => void;
  showThumbnails: boolean;
  onShowThumbnailsChange: (show: boolean) => void;
}

export const ViewModeControls: React.FC<ViewModeControlsProps> = ({
  viewMode,
  onViewModeChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  thumbnailSize,
  onThumbnailSizeChange,
  showThumbnails,
  onShowThumbnailsChange
}) => {
  const viewModes = [
    { id: 'grid' as ViewMode, icon: '⊞', label: 'Grid View', tooltip: 'Grid View' },
    { id: 'list' as ViewMode, icon: '☰', label: 'List View', tooltip: 'List View' },
    { id: 'tiles' as ViewMode, icon: '▦', label: 'Tiles View', tooltip: 'Tiles View' }
  ];

  const sortOptions = [
    { id: 'name' as SortBy, label: 'Name' },
    { id: 'duration' as SortBy, label: 'Duration' },
    { id: 'size' as SortBy, label: 'File Size' },
    { id: 'created' as SortBy, label: 'Date Added' },
    { id: 'modified' as SortBy, label: 'Last Modified' }
  ];

  return (
    <div className="view-mode-controls">
      {/* View Mode Toggles */}
      <div className="control-group view-modes">
        <label className="control-label">View:</label>
        <div className="view-mode-buttons">
          {viewModes.map(mode => (
            <button
              key={mode.id}
              className={`view-mode-btn ${viewMode === mode.id ? 'active' : ''}`}
              onClick={() => onViewModeChange(mode.id)}
              title={mode.tooltip}
            >
              <span className="view-mode-icon">{mode.icon}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sort Controls */}
      <div className="control-group sort-controls">
        <label className="control-label">Sort:</label>
        <select
          className="sort-select"
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value as SortBy)}
          aria-label="Sort videos by"
        >
          {sortOptions.map(option => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        
        <button
          className={`sort-order-btn ${sortOrder === 'desc' ? 'desc' : 'asc'}`}
          onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
          title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
        >
          {sortOrder === 'asc' ? '↑' : '↓'}
        </button>
      </div>

      {/* Thumbnail Size Control - Only for grid view */}
      {viewMode === 'grid' && (
        <div className="control-group size-control">
          <label className="control-label">Size:</label>
          <div className="size-slider-container">
            <span className="size-label-min">S</span>
            <input
              type="range"
              min="120"
              max="300"
              step="20"
              value={thumbnailSize}
              onChange={(e) => onThumbnailSizeChange(parseInt(e.target.value))}
              className="size-slider"
            />
            <span className="size-label-max">L</span>
            <span className="size-value">{thumbnailSize}px</span>
          </div>
        </div>
      )}

      {/* Thumbnail Toggle */}
      <div className="control-group thumbnail-toggle">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={showThumbnails}
            onChange={(e) => onShowThumbnailsChange(e.target.checked)}
            className="toggle-input"
          />
          <span className="toggle-slider"></span>
          <span className="toggle-text">Thumbnails</span>
        </label>
      </div>

      {/* Additional Controls */}
      <div className="control-group additional-controls">
        <button
          className="control-btn refresh"
          onClick={() => window.location.reload()}
          title="Refresh Library"
        >
          🔄
        </button>
        
        <button
          className="control-btn settings"
          title="View Settings"
        >
          ⚙️
        </button>
      </div>
    </div>
  );
};

export default ViewModeControls;