import React from 'react';

interface LibraryControlsProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: 'name' | 'duration' | 'size' | 'created';
  onSortByChange: (sortBy: 'name' | 'duration' | 'size' | 'created') => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (order: 'asc' | 'desc') => void;
  filterStatus: 'all' | 'ready' | 'processing' | 'completed' | 'error';
  onFilterStatusChange: (status: 'all' | 'ready' | 'processing' | 'completed' | 'error') => void;
  onSelectAll: () => void;
  onClearLibrary: () => void;
  selectedCount: number;
  totalCount: number;
}

const LibraryControls: React.FC<LibraryControlsProps> = ({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  filterStatus,
  onFilterStatusChange,
  onSelectAll,
  onClearLibrary,
  selectedCount,
  totalCount,
}) => {
  const getSortIcon = (field: string) => {
    if (sortBy !== field) return '↕️';
    return sortOrder === 'asc' ? '⬆️' : '⬇️';
  };
  
  const handleSortClick = (field: 'name' | 'duration' | 'size' | 'created') => {
    if (sortBy === field) {
      onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSortByChange(field);
      onSortOrderChange('asc');
    }
  };
  
  return (
    <div className="library-controls">
      {/* Search */}
      <div className="control-section search-section">
        <div className="search-input-wrapper">
          <input
            type="text"
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="search-input"
          />
          <div className="search-icon">🔍</div>
          {searchQuery && (
            <button 
              className="clear-search"
              onClick={() => onSearchChange('')}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      
      {/* Filters and Sort */}
      <div className="control-section filter-sort-section">
        {/* Status Filter */}
        <div className="filter-group">
          <label className="filter-label">Status:</label>
          <select
            value={filterStatus}
            onChange={(e) => onFilterStatusChange(e.target.value as any)}
            className="filter-select"
          >
            <option value="all">All</option>
            <option value="ready">Ready</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="error">Error</option>
          </select>
        </div>
        
        {/* Sort Controls */}
        <div className="sort-group">
          <label className="sort-label">Sort by:</label>
          <div className="sort-buttons">
            <button
              className={`sort-button ${sortBy === 'name' ? 'active' : ''}`}
              onClick={() => handleSortClick('name')}
              title="Sort by name"
            >
              Name {getSortIcon('name')}
            </button>
            <button
              className={`sort-button ${sortBy === 'duration' ? 'active' : ''}`}
              onClick={() => handleSortClick('duration')}
              title="Sort by duration"
            >
              Duration {getSortIcon('duration')}
            </button>
            <button
              className={`sort-button ${sortBy === 'size' ? 'active' : ''}`}
              onClick={() => handleSortClick('size')}
              title="Sort by file size"
            >
              Size {getSortIcon('size')}
            </button>
            <button
              className={`sort-button ${sortBy === 'created' ? 'active' : ''}`}
              onClick={() => handleSortClick('created')}
              title="Sort by date added"
            >
              Date {getSortIcon('created')}
            </button>
          </div>
        </div>
      </div>
      
      {/* Selection and Actions */}
      <div className="control-section actions-section">
        <div className="selection-controls">
          <button
            className="selection-button"
            onClick={onSelectAll}
            title={selectedCount === totalCount ? 'Deselect all' : 'Select all'}
          >
            {selectedCount === totalCount ? '☐' : '☑️'} 
            {selectedCount > 0 ? `${selectedCount}/${totalCount}` : 'Select All'}
          </button>
        </div>
        
        <div className="action-buttons">
          <button
            className="action-button secondary"
            onClick={() => {
              // Export library functionality
              console.log('Export library');
            }}
            title="Export library list"
          >
            📄 Export
          </button>
          
          <button
            className="action-button secondary"
            onClick={() => {
              // Import library functionality
              console.log('Import library');
            }}
            title="Import library list"
          >
            📂 Import
          </button>
          
          <button
            className="action-button danger"
            onClick={onClearLibrary}
            title="Clear entire library"
            disabled={totalCount === 0}
          >
            🗑️ Clear All
          </button>
        </div>
      </div>
      
      {/* Selected Actions */}
      {selectedCount > 0 && (
        <div className="selected-actions">
          <div className="selected-info">
            {selectedCount} video{selectedCount !== 1 ? 's' : ''} selected
          </div>
          
          <div className="batch-actions">
            <button className="batch-action-button">
              ▶️ Add to Queue
            </button>
            <button className="batch-action-button">
              ✂️ Batch Trim
            </button>
            <button className="batch-action-button">
              🎨 Apply Effects
            </button>
            <button className="batch-action-button danger">
              🗑️ Remove Selected
            </button>
          </div>
        </div>
      )}
      
      {/* Results Summary */}
      <div className="results-summary">
        <span className="results-text">
          {totalCount === 0 
            ? 'No videos in library' 
            : searchQuery || filterStatus !== 'all'
            ? `Showing ${totalCount} result${totalCount !== 1 ? 's' : ''}`
            : `${totalCount} video${totalCount !== 1 ? 's' : ''} in library`
          }
        </span>
        
        {(searchQuery || filterStatus !== 'all') && (
          <button 
            className="clear-filters"
            onClick={() => {
              onSearchChange('');
              onFilterStatusChange('all');
            }}
          >
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
};

export default LibraryControls;