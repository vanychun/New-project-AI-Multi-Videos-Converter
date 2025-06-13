import React, { useState } from 'react';
import { VideoFileEnhanced, SearchQuery, ViewSettings } from '../../types/video-enhanced.types';
import { VideoLibraryAdvanced } from '../VideoLibrary/VideoLibraryAdvanced';
import { SettingsPlaceholder } from '../bridges/SettingsPlaceholder';
import './CleanLayout.css';

export interface CleanLayoutProps {
  videos: VideoFileEnhanced[];
  selectedVideoIds: string[];
  searchQuery: SearchQuery;
  viewSettings: ViewSettings;
  loading: boolean;
  error: string | null;
  onSearchChange: (query: SearchQuery) => void;
  onClearFilters: () => void;
  onViewSettingsChange: (settings: Partial<ViewSettings>) => void;
  onVideoSelect: (videoId: string, multiSelect: boolean) => void;
  onVideoDoubleClick: (video: VideoFileEnhanced) => void;
  onVideoContextMenu: (event: React.MouseEvent, video: VideoFileEnhanced) => void;
  onVideoPreview: (video: VideoFileEnhanced) => void;
  onVideoRemove: (video: VideoFileEnhanced) => void;
  onVideoEdit: (video: VideoFileEnhanced) => void;
  onClearError: () => void;
}

export const CleanLayout: React.FC<CleanLayoutProps> = ({
  videos,
  selectedVideoIds,
  searchQuery,
  viewSettings,
  loading,
  error,
  onSearchChange,
  onClearFilters,
  onViewSettingsChange,
  onVideoSelect,
  onVideoDoubleClick,
  onVideoContextMenu,
  onVideoPreview,
  onVideoRemove,
  onVideoEdit,
  onClearError
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const stats = {
    total: videos.length,
    selected: selectedVideoIds.length,
    ready: videos.filter(v => v.status === 'ready').length,
    processing: videos.filter(v => v.status === 'processing').length
  };

  return (
    <div className="clean-layout">
      {/* Error Banner */}
      {error && (
        <div className="error-banner">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{error}</span>
            <button className="error-close" onClick={onClearError}>✕</button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="content-area">
        {/* Top Bar with Search and Quick Stats */}
        <div className="top-bar">
          <div className="search-section">
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search videos by name, format, or size..."
                value={searchQuery.text}
                onChange={(e) => onSearchChange({ ...searchQuery, text: e.target.value })}
                className="search-input"
              />
              {searchQuery.text && (
                <button 
                  className="clear-search"
                  onClick={onClearFilters}
                >
                  ✕
                </button>
              )}
            </div>
            
            <button 
              className={`filter-toggle ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <span className="filter-icon">🎛️</span>
              Filters
            </button>
          </div>

          <div className="stats-bar">
            <div className="stat-item">
              <span className="stat-number">{stats.total}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat-item">
              <span className="stat-number highlight">{stats.selected}</span>
              <span className="stat-label">Selected</span>
            </div>
            <div className="stat-item">
              <span className="stat-number success">{stats.ready}</span>
              <span className="stat-label">Ready</span>
            </div>
            {stats.processing > 0 && (
              <div className="stat-item">
                <span className="stat-number processing">{stats.processing}</span>
                <span className="stat-label">Processing</span>
              </div>
            )}
          </div>

          <div className="view-controls">
            <select 
              value={viewSettings.gridSize}
              onChange={(e) => onViewSettingsChange({ gridSize: e.target.value as any })}
              className="grid-size-select"
            >
              <option value="small">Small Grid</option>
              <option value="medium">Medium Grid</option>
              <option value="large">Large Grid</option>
            </select>
            
            <button 
              className={`settings-toggle ${showSettings ? 'active' : ''}`}
              onClick={() => setShowSettings(!showSettings)}
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Quick Filter Bar (collapsible) */}
        {showFilters && (
          <div className="filter-bar">
            <div className="filter-group">
              <label>Format:</label>
              <select 
                onChange={(e) => onSearchChange({ 
                  ...searchQuery, 
                  filters: { ...searchQuery.filters, format: e.target.value || undefined }
                })}
                className="filter-select"
              >
                <option value="">All Formats</option>
                <option value="mp4">MP4</option>
                <option value="avi">AVI</option>
                <option value="mov">MOV</option>
                <option value="mkv">MKV</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Status:</label>
              <select 
                onChange={(e) => onSearchChange({ 
                  ...searchQuery, 
                  filters: { ...searchQuery.filters, status: e.target.value || undefined }
                })}
                className="filter-select"
              >
                <option value="">All Status</option>
                <option value="ready">Ready</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="error">Error</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Sort by:</label>
              <select 
                value={searchQuery.sortBy}
                onChange={(e) => onSearchChange({ ...searchQuery, sortBy: e.target.value as any })}
                className="filter-select"
              >
                <option value="createdAt">Date Added</option>
                <option value="name">Name</option>
                <option value="size">File Size</option>
                <option value="duration">Duration</option>
              </select>
            </div>

            <button 
              className="clear-filters"
              onClick={onClearFilters}
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* Main Video Library */}
        <div className="video-library-container">
          {videos.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📹</div>
              <h3>No Videos Added Yet</h3>
              <p>Click "Import Videos" in the header to get started with your video conversion project.</p>
            </div>
          ) : (
            <VideoLibraryAdvanced
              videos={videos}
              selectedVideoIds={selectedVideoIds}
              searchQuery={searchQuery}
              viewSettings={viewSettings}
              loading={loading}
              onVideoSelect={onVideoSelect}
              onVideoDoubleClick={onVideoDoubleClick}
              onVideoContextMenu={onVideoContextMenu}
              onVideoPreview={onVideoPreview}
              onVideoRemove={onVideoRemove}
              onVideoEdit={onVideoEdit}
              onViewSettingsChange={onViewSettingsChange}
            />
          )}
        </div>
      </div>

      {/* Settings Panel (slide-in from right) */}
      {showSettings && (
        <div className="settings-overlay">
          <div className="settings-panel">
            <div className="settings-header">
              <h3>Settings</h3>
              <button 
                className="close-settings"
                onClick={() => setShowSettings(false)}
              >
                ✕
              </button>
            </div>
            <SettingsPlaceholder
              theme="dark"
              onThemeChange={() => {}}
            />
          </div>
        </div>
      )}
    </div>
  );
};