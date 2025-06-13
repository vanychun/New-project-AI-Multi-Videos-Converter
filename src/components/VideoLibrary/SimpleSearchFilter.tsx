import React, { useState } from 'react';
import { SearchQuery, VideoFileEnhanced } from '../../types/video-enhanced.types';
import './SimpleSearchFilter.css';

export interface SimpleSearchFilterProps {
  searchQuery: SearchQuery;
  videos: VideoFileEnhanced[];
  onSearchChange: (query: SearchQuery) => void;
  onClearFilters: () => void;
  className?: string;
}

export const SimpleSearchFilter: React.FC<SimpleSearchFilterProps> = ({
  searchQuery,
  videos,
  onSearchChange,
  onClearFilters,
  className = ''
}) => {
  const [showFilters, setShowFilters] = useState(false);

  const handleSearchInput = (text: string) => {
    onSearchChange({ ...searchQuery, text });
  };

  const handleFormatChange = (format: string) => {
    const filters = { ...searchQuery.filters };
    if (format) {
      filters.format = format;
    } else {
      delete filters.format;
    }
    onSearchChange({ ...searchQuery, filters });
  };

  const handleStatusChange = (status: string) => {
    const filters = { ...searchQuery.filters };
    if (status) {
      filters.status = status as any;
    } else {
      delete filters.status;
    }
    onSearchChange({ ...searchQuery, filters });
  };

  const handleSortChange = (sortBy: string) => {
    onSearchChange({ ...searchQuery, sortBy: sortBy as any });
  };

  const stats = {
    total: videos.length,
    selected: videos.filter(v => v.status === 'ready').length,
    processing: videos.filter(v => v.status === 'processing').length,
    completed: videos.filter(v => v.status === 'completed').length
  };

  const hasActiveFilters = searchQuery.text || 
    Object.keys(searchQuery.filters || {}).length > 0 ||
    searchQuery.sortBy !== 'createdAt';

  return (
    <div className={`simple-search-filter ${className}`}>
      {/* Search Input */}
      <div className="search-section">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search videos..."
            value={searchQuery.text}
            onChange={(e) => handleSearchInput(e.target.value)}
            className="search-input"
          />
          {searchQuery.text && (
            <button 
              className="clear-search-btn"
              onClick={() => handleSearchInput('')}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Quick Filters Toggle */}
      <div className="filters-header">
        <button 
          className={`filters-toggle ${showFilters ? 'active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <span className="filter-icon">⚙️</span>
          <span>Filters</span>
          <span className={`chevron ${showFilters ? 'up' : 'down'}`}>
            {showFilters ? '▲' : '▼'}
          </span>
        </button>
        
        {hasActiveFilters && (
          <button 
            className="clear-all-btn"
            onClick={onClearFilters}
            title="Clear all filters"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filter-row">
            <label className="filter-label">Format:</label>
            <select 
              value={searchQuery.filters?.format || ''}
              onChange={(e) => handleFormatChange(e.target.value)}
              className="filter-select"
            >
              <option value="">All Formats</option>
              <option value="mp4">MP4</option>
              <option value="avi">AVI</option>
              <option value="mov">MOV</option>
              <option value="mkv">MKV</option>
              <option value="webm">WebM</option>
            </select>
          </div>

          <div className="filter-row">
            <label className="filter-label">Status:</label>
            <select 
              value={searchQuery.filters?.status || ''}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="filter-select"
            >
              <option value="">All Status</option>
              <option value="ready">Ready</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="error">Error</option>
            </select>
          </div>

          <div className="filter-row">
            <label className="filter-label">Sort by:</label>
            <select 
              value={searchQuery.sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
              className="filter-select"
            >
              <option value="createdAt">Date Added</option>
              <option value="name">Name</option>
              <option value="size">File Size</option>
              <option value="duration">Duration</option>
            </select>
          </div>
        </div>
      )}

      {/* Library Stats */}
      <div className="library-stats">
        <h4 className="stats-title">Library Stats</h4>
        
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-number">{stats.total}</span>
            <span className="stat-label">Total Videos</span>
          </div>
          
          <div className="stat-item">
            <span className="stat-number ready">{stats.selected}</span>
            <span className="stat-label">Ready</span>
          </div>
          
          {stats.processing > 0 && (
            <div className="stat-item">
              <span className="stat-number processing">{stats.processing}</span>
              <span className="stat-label">Processing</span>
            </div>
          )}
          
          {stats.completed > 0 && (
            <div className="stat-item">
              <span className="stat-number completed">{stats.completed}</span>
              <span className="stat-label">Completed</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};