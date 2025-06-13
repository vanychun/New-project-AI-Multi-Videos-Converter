import React, { useState } from 'react';
import { VideoFileEnhanced, SearchQuery, ViewSettings } from '../../types/video-enhanced.types';
import { VideoLibraryAdvanced } from '../VideoLibrary/VideoLibraryAdvanced';
import { SimpleSearchFilter } from '../VideoLibrary/SimpleSearchFilter';
import { TimelinePlaceholder } from '../bridges/TimelinePlaceholder';
import SettingsPanel from '../Settings/SettingsPanel';
import './MainLayout.css';

export interface MainLayoutProps {
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

export const MainLayout: React.FC<MainLayoutProps> = ({
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsPanelCollapsed, setSettingsPanelCollapsed] = useState(false);
  const [activePanel, setActivePanel] = useState<'library' | 'timeline'>('library');

  // Statistics for the layout
  const stats = {
    totalVideos: videos.length,
    selectedVideos: selectedVideoIds.length,
    totalSize: videos.reduce((sum, v) => sum + (v.metadata?.size || 0), 0),
    totalDuration: videos.reduce((sum, v) => sum + (v.metadata?.duration || 0), 0),
    readyVideos: videos.filter(v => v.status === 'ready').length,
    processingVideos: videos.filter(v => v.status === 'processing').length,
    completedVideos: videos.filter(v => v.status === 'completed').length
  };

  return (
    <div className="main-layout">
      {/* Error Banner */}
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{error}</span>
          <button className="error-close" onClick={onClearError}>✕</button>
        </div>
      )}

      <div className="layout-container">
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="sidebar-header">
            <h3>Filters & Search</h3>
            <button 
              className="collapse-button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? '▶' : '◀'}
            </button>
          </div>

          {!sidebarCollapsed && (
            <div className="sidebar-content">
              <SimpleSearchFilter
                searchQuery={searchQuery}
                videos={videos}
                onSearchChange={onSearchChange}
                onClearFilters={onClearFilters}
              />
            </div>
          )}
        </aside>

        {/* Main Content Area */}
        <main className="main-content">
          {/* Content Tabs */}
          <div className="content-tabs">
            <button
              className={`tab-button ${activePanel === 'library' ? 'active' : ''}`}
              onClick={() => setActivePanel('library')}
            >
              <span className="tab-icon">📁</span>
              Video Library
              {stats.totalVideos > 0 && (
                <span className="tab-badge">{stats.totalVideos}</span>
              )}
            </button>
            <button
              className={`tab-button ${activePanel === 'timeline' ? 'active' : ''}`}
              onClick={() => setActivePanel('timeline')}
            >
              <span className="tab-icon">🎬</span>
              Timeline
            </button>

            {/* View Controls */}
            <div className="view-controls">
              <select
                value={viewSettings.layout}
                onChange={(e) => onViewSettingsChange({ layout: e.target.value as 'grid' | 'list' })}
                className="view-select"
              >
                <option value="grid">Grid View</option>
                <option value="list">List View</option>
              </select>

              {viewSettings.layout === 'grid' && (
                <select
                  value={viewSettings.gridSize}
                  onChange={(e) => onViewSettingsChange({ gridSize: e.target.value as 'small' | 'medium' | 'large' })}
                  className="view-select"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              )}

              <label className="view-toggle">
                <input
                  type="checkbox"
                  checked={viewSettings.showThumbnails}
                  onChange={(e) => onViewSettingsChange({ showThumbnails: e.target.checked })}
                />
                Thumbnails
              </label>

              <label className="view-toggle">
                <input
                  type="checkbox"
                  checked={viewSettings.showMetadata}
                  onChange={(e) => onViewSettingsChange({ showMetadata: e.target.checked })}
                />
                Metadata
              </label>

              <label className="view-toggle">
                <input
                  type="checkbox"
                  checked={viewSettings.showProgress}
                  onChange={(e) => onViewSettingsChange({ showProgress: e.target.checked })}
                />
                Progress
              </label>
            </div>
          </div>

          {/* Content Panel */}
          <div className="content-panel">
            {activePanel === 'library' ? (
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
            ) : (
              <TimelinePlaceholder
                videos={videos.filter(v => selectedVideoIds.includes(v.id))}
              />
            )}
          </div>
        </main>

        {/* Settings Panel */}
        <SettingsPanel 
          collapsed={settingsPanelCollapsed}
          onToggle={() => setSettingsPanelCollapsed(!settingsPanelCollapsed)}
        />
      </div>
    </div>
  );
};

// Utility functions
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDuration = (seconds: number): string => {
  if (seconds === 0) return '0s';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
};