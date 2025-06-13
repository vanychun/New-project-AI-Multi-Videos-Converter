import React from 'react';

interface LibraryHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterStatus: 'all' | 'ready' | 'processing' | 'completed' | 'error';
  onFilterStatusChange: (status: 'all' | 'ready' | 'processing' | 'completed' | 'error') => void;
  sortBy: 'name' | 'duration' | 'size' | 'created';
  onSortByChange: (sortBy: 'name' | 'duration' | 'size' | 'created') => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (order: 'asc' | 'desc') => void;
  onToggle: () => void;
  totalCount: number;
}

const LibraryHeader: React.FC<LibraryHeaderProps> = ({
  searchQuery,
  onSearchChange,
  filterStatus,
  onFilterStatusChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  onToggle,
  totalCount,
}) => {
  const filterButtons = [
    { key: 'all', label: 'All', icon: '📁' },
    { key: 'ready', label: 'Ready', icon: '⚪' },
    { key: 'processing', label: 'Processing', icon: '🟡' },
    { key: 'completed', label: 'Completed', icon: '🟢' },
    { key: 'error', label: 'Error', icon: '🔴' },
  ];

  const sortOptions = [
    { key: 'name', label: 'Name', icon: '🔤' },
    { key: 'duration', label: 'Duration', icon: '⏱️' },
    { key: 'size', label: 'Size', icon: '💾' },
    { key: 'created', label: 'Date', icon: '📅' },
  ];

  const handleSortChange = (newSortBy: 'name' | 'duration' | 'size' | 'created') => {
    if (sortBy === newSortBy) {
      onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSortByChange(newSortBy);
      onSortOrderChange('asc');
    }
  };

  return (
    <div className="library-header-modern">
      {/* Title and Toggle */}
      <div className="header-title-section">
        <div className="library-title-modern">
          <span className="title-icon">📁</span>
          <span className="title-text">Video Library</span>
          <span className="video-count">({totalCount})</span>
        </div>
        <button 
          className="toggle-button-modern" 
          onClick={onToggle} 
          title="Collapse Video Library"
        >
          ◀
        </button>
      </div>

      {/* Search Bar */}
      <div className="search-section-modern">
        <div className="search-input-container">
          <div className="search-icon">🔍</div>
          <input
            type="text"
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="search-input-modern"
          />
          {searchQuery && (
            <button 
              className="clear-search-modern"
              onClick={() => onSearchChange('')}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Filter Chips */}
      <div className="filter-chips-section">
        <div className="filter-chips">
          {filterButtons.map((filter) => (
            <button
              key={filter.key}
              className={`filter-chip ${filterStatus === filter.key ? 'active' : ''}`}
              onClick={() => onFilterStatusChange(filter.key as any)}
            >
              <span className="chip-icon">{filter.icon}</span>
              <span className="chip-label">{filter.label}</span>
            </button>
          ))}
        </div>

        {/* Sort Dropdown */}
        <div className="sort-section-modern">
          <div className="sort-dropdown">
            <button className="sort-trigger">
              <span className="sort-icon">⇅</span>
              <span className="sort-label">
                Sort: {sortOptions.find(opt => opt.key === sortBy)?.label}
              </span>
              <span className="sort-order-icon">
                {sortOrder === 'asc' ? '⬆️' : '⬇️'}
              </span>
            </button>
            <div className="sort-menu">
              {sortOptions.map((option) => (
                <button
                  key={option.key}
                  className={`sort-option ${sortBy === option.key ? 'active' : ''}`}
                  onClick={() => handleSortChange(option.key as any)}
                >
                  <span className="option-icon">{option.icon}</span>
                  <span className="option-label">{option.label}</span>
                  {sortBy === option.key && (
                    <span className="option-order">
                      {sortOrder === 'asc' ? '⬆️' : '⬇️'}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LibraryHeader;